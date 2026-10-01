/**
 * Verificación independiente del snapshot publicado.
 * No usa el script generador: recalcula todo desde el CID y desde la base.
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ quiet: true });

const CID = process.argv[2];
const SEED_FILE = '.fes-snapshot-seed';

function sha256(...parts: Buffer[]): Buffer {
  return crypto.createHash('sha256').update(Buffer.concat(parts)).digest();
}
function hashWallet(wallet: string, seed: string): string {
  return sha256(Buffer.from(seed, 'utf8'), Buffer.from(wallet.toLowerCase(), 'utf8')).toString('hex');
}
function toLeaves(hashes: string[]): Buffer[] {
  return hashes.map((h) => sha256(Buffer.from([0x00]), Buffer.from(h, 'hex')));
}
function pad(level: Buffer[]): Buffer[] {
  return level.length % 2 === 1 ? [...level, level[level.length - 1]] : [...level];
}
function root(hashes: string[]): string {
  let level = pad(toLeaves(hashes));
  while (level.length > 1) {
    const cur = pad(level);
    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) next.push(sha256(Buffer.from([0x01]), cur[i], cur[i + 1]));
    level = next;
  }
  return level[0].toString('hex');
}

(async () => {
  const seed = fs.readFileSync(SEED_FILE, 'utf8').trim();
  const problems: string[] = [];

  // ── 1. Fetch por un gateway público (no el de Pinata) ──
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${CID}`,
    `https://ipfs.io/ipfs/${CID}`,
    `https://cloudflare-ipfs.com/ipfs/${CID}`,
    `https://dweb.link/ipfs/${CID}`,
  ];
  let raw = '';
  let usedGateway = '';
  for (const url of gateways) {
    try {
      const ctl = AbortSignal.timeout(30000);
      const r = await fetch(url, { signal: ctl });
      if (!r.ok) { console.log(`  ${url.split('/ipfs/')[0].replace('https://', '')} -> HTTP ${r.status}`); continue; }
      raw = await r.text();
      usedGateway = url;
      console.log(`  ${url.split('/ipfs/')[0].replace('https://', '')} -> HTTP ${r.status}, ${raw.length} bytes`);
      break;
    } catch (e: any) {
      console.log(`  ${url.split('/ipfs/')[0].replace('https://', '')} -> ${e.message.slice(0, 50)}`);
    }
  }
  if (!raw) { console.log('\n❌ Ningún gateway resolvió el CID'); process.exit(1); }
  console.log(`\nGateway que resolvió: ${usedGateway.split('/ipfs/')[0]}\n`);

  const snap = JSON.parse(raw);

  // ── 2. Consistencia interna ──
  if (snap.participants.length !== snap.total_participants)
    problems.push(`participants ${snap.participants.length} != total ${snap.total_participants}`);

  const dist: Record<string, number> = {};
  for (const p of snap.participants) dist[p.cohort] = (dist[p.cohort] ?? 0) + 1;
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  if (sum !== snap.total_participants) problems.push(`suma cohortes ${sum} != ${snap.total_participants}`);

  for (const [c, n] of Object.entries(snap.cohort_distribution))
    if ((dist[c] ?? 0) !== n) problems.push(`cohort_distribution.${c}=${n} vs real ${dist[c] ?? 0}`);

  console.log('--- 2. Consistencia interna ---');
  console.log(`  total_participants : ${snap.total_participants}`);
  console.log(`  cohort_distribution: ${JSON.stringify(snap.cohort_distribution)}`);
  console.log(`  suma de cohortes   : ${sum}`);

  // ── 3. Merkle recalculado desde el contenido descargado ──
  const recomputed = root(snap.participants.map((p: any) => p.wallet_hash));
  if (recomputed !== snap.merkle_root) problems.push(`merkle_root publicado ${snap.merkle_root} != recalculado ${recomputed}`);
  console.log('\n--- 3. Merkle ---');
  console.log(`  publicado  : ${snap.merkle_root}`);
  console.log(`  recalculado: ${recomputed}`);
  console.log(`  ${recomputed === snap.merkle_root ? 'match' : 'MISMATCH'}`);

  // ── 4. Hashes recalculables desde la base con la semilla ──
  const { getSupabaseAdmin } = await import('../src/lib/services/coordination/supabase-admin');
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from('fes_participants')
    .select('wallet, cohort, balance_at_detection, message_sent_at')
    .order('balance_at_detection', { ascending: false });
  if (error) throw new Error(error.message);

  const sorted = [...rows].sort((a, b) => {
    const d = Number(b.balance_at_detection) - Number(a.balance_at_detection);
    return d !== 0 ? d : a.wallet.localeCompare(b.wallet);
  });

  let mismatches = 0;
  sorted.forEach((row, i) => {
    const p = snap.participants[i];
    if (!p) { problems.push(`sin participante en índice ${i}`); return; }
    if (p.wallet_hash !== hashWallet(row.wallet, seed)) mismatches++;
    if (p.cohort !== row.cohort) problems.push(`cohort mismatch índice ${i}: ${p.cohort} vs ${row.cohort}`);
  });
  if (mismatches > 0) problems.push(`${mismatches} wallet_hash no recalculan con la semilla`);
  console.log('\n--- 4. Hashes vs base ---');
  console.log(`  filas en base      : ${sorted.length}`);
  console.log(`  hashes recalculados: ${sorted.length - mismatches}/${sorted.length}`);

  // ── 5. Fuga de addresses en claro ──
  const leaked = sorted.filter((r) => raw.includes(r.wallet.toLowerCase()));
  if (leaked.length > 0) problems.push(`${leaked.length} address(es) en claro en el JSON público`);
  console.log('\n--- 5. Privacidad ---');
  console.log(`  addresses en claro filtradas: ${leaked.length}`);

  // ── 6. Semilla publicada coincide con la local ──
  if (snap.seed !== seed) problems.push(`semilla publicada (${snap.seed}) != local (${seed})`);
  console.log('\n--- 6. Semilla ---');
  console.log(`  publicada: ${snap.seed}`);
  console.log(`  coincide con la local: ${snap.seed === seed}`);

  console.log('\n' + '='.repeat(52));
  if (problems.length === 0) {
    console.log('VEREDICTO: OK — el snapshot publicado es consistente');
    console.log('='.repeat(52));
  } else {
    console.log(`VEREDICTO: ${problems.length} PROBLEMA(S)`);
    for (const p of problems) console.log(`  - ${p}`);
    console.log('='.repeat(52));
  }
  process.exit(problems.length === 0 ? 0 : 1);
})();

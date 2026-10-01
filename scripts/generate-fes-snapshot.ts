/**
 * FES Pilot — Generador del snapshot congelado
 *
 * Opción A: el snapshot describe la asignación de cohorts YA PERSISTIDA en
 * `fes_participants`. No re-asigna nada. La semilla se usa exclusivamente
 * para hashear las wallets, de modo que el snapshot sea verificable por un
 * tercero con solo la semilla publicada.
 *
 * Principios de integridad:
 *   - Los thresholds de elegibilidad NO se tocan. Se documentan tal cual.
 *   - Las addresses en claro nunca salen a IPFS. Solo hashes.
 *   - El balance exacto NO se publica (ver BALANCE_BANDS): se publica una
 *     bandaordinal + estadística por cohorte. El fino queda en un archivo local.
 *   - Se differentiate list_frozen_at (cuándo se congeló la lista) de
 *     generated_at (cuándo se generó este JSON).
 *
 * Uso:
 *   npx tsx scripts/generate-fes-snapshot.ts            # usa o crea la semilla
 *   npx tsx scripts/generate-fes-snapshot.ts --verify   # re-verifica el CID
 *   npx tsx scripts/generate-fes-snapshot.ts --dry-run  # no sube a IPFS
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ quiet: true });

const ROOT = path.resolve(__dirname, '..');
const SEED_FILE = path.join(ROOT, '.fes-snapshot-seed');
const LOCAL_DIR = path.join(ROOT, 'local-snapshots');
const PUBLIC_JSON = path.join(LOCAL_DIR, 'fes-snapshot-public.json');
const CUSTODY_JSON = path.join(LOCAL_DIR, 'fes-snapshot-custody.json');

const args = process.argv.slice(2);
const VERIFY_ONLY = args.includes('--verify');
const DRY_RUN = args.includes('--dry-run');

// ── Merkle (domain-separated, duplicación del último si es impar) ──────────
const LEAF_TAG = Buffer.from([0x00]);
const NODE_TAG = Buffer.from([0x01]);

function sha256(...parts: Buffer[]): Buffer {
  return crypto.createHash('sha256').update(Buffer.concat(parts)).digest();
}

function hashWallet(wallet: string, seed: string): string {
  return sha256(Buffer.from(seed, 'utf8'), Buffer.from(wallet.toLowerCase(), 'utf8')).toString('hex');
}

function toLeaves(walletHashes: string[]): Buffer[] {
  return walletHashes.map((h) => sha256(LEAF_TAG, Buffer.from(h, 'hex')));
}

/**
 * Normaliza a longitud par duplicando el último elemento.
 * Se aplica en CADA nivel: con 18 hojas el primer nivel queda en 9 (impar),
 * y sin volver a padear `level[i+1]` sería undefined.
 */
function pad(level: Buffer[]): Buffer[] {
  if (level.length === 0) throw new Error('Merkle: nivel vacío');
  return level.length % 2 === 1 ? [...level, level[level.length - 1]] : [...level];
}

function merkleRoot(walletHashes: string[]): string {
  let level = pad(toLeaves(walletHashes));
  while (level.length > 1) {
    const cur = pad(level);
    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) next.push(sha256(NODE_TAG, cur[i], cur[i + 1]));
    level = next;
  }
  return level[0].toString('hex');
}

export interface ProofStep { position: 'left' | 'right'; hash: string }

/** Genera la prueba de pertenencia de la hoja `index`. */
function buildProof(walletHashes: string[], index: number): ProofStep[] {
  let level = pad(toLeaves(walletHashes));
  const steps: ProofStep[] = [];
  let idx = index;

  while (level.length > 1) {
    const cur = pad(level);
    // Si idx es el último y se duplicó, el hermano es él mismo.
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : Math.min(idx + 1, cur.length - 1);
    steps.push({ position: isRight ? 'left' : 'right', hash: cur[siblingIdx].toString('hex') });

    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) next.push(sha256(NODE_TAG, cur[i], cur[i + 1]));
    level = next;
    idx = Math.floor(idx / 2);
  }
  return steps;
}

/**
 * Verificación de pertenencia por un tercero: dada la hoja y la prueba,
 * recalcula la raíz. No necesita conocer el resto de las hojas.
 */
function verifyProof(walletHash: string, steps: ProofStep[], root: string): boolean {
  let computed = sha256(LEAF_TAG, Buffer.from(walletHash, 'hex'));
  for (const s of steps) {
    const sib = Buffer.from(s.hash, 'hex');
    computed = s.position === 'left'
      ? sha256(NODE_TAG, sib, computed)
      : sha256(NODE_TAG, computed, sib);
  }
  return computed.toString('hex') === root;
}

// ── Bandas de balance (no publica el valor exacto) ────────────────────────
const BALANCE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: '<1K RIF', min: 0, max: 1_000 },
  { label: '1K-10K RIF', min: 1_000, max: 10_000 },
  { label: '10K-100K RIF', min: 10_000, max: 100_000 },
  { label: '100K-1M RIF', min: 100_000, max: 1_000_000 },
  { label: '>1M RIF', min: 1_000_000, max: Infinity },
];

function band(balance: number): string {
  return (BALANCE_BANDS.find((b) => balance >= b.min && balance < b.max) ?? BALANCE_BANDS[0]).label;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Semilla ────────────────────────────────────────────────────────────────
function loadOrCreateSeed(): string {
  if (process.env.FES_SNAPSHOT_SEED) return process.env.FES_SNAPSHOT_SEED.trim();

  if (fs.existsSync(SEED_FILE)) {
    const v = fs.readFileSync(SEED_FILE, 'utf8').trim();
    if (/^[0-9a-f]{64}$/.test(v)) return v;
    throw new Error(`Semilla inválida en ${SEED_FILE}: se esperan 64 hex chars.`);
  }

  const seed = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SEED_FILE, seed, { encoding: 'utf8', mode: 0o600 });
  console.log(`Semilla generada y guardada en ${SEED_FILE}`);
  return seed;
}

// ── Verificación completa de un snapshot ──────────────────────────────────
async function verifySnapshot(snapshot: any, seed: string, rawRows: any[]): Promise<string[]> {
  const problems: string[] = [];

  const total = snapshot.total_participants;
  if (snapshot.participants.length !== total) {
    problems.push(`participants (${snapshot.participants.length}) != total_participants (${total})`);
  }
  if (snapshot.participants.length !== rawRows.length) {
    problems.push(`participants (${snapshot.participants.length}) != filas en base (${rawRows.length})`);
  }

  const dist: Record<string, number> = {};
  for (const p of snapshot.participants) dist[p.cohort] = (dist[p.cohort] ?? 0) + 1;
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  if (sum !== total) problems.push(`suma de cohortes (${sum}) != ${total}`);

  for (const [cohort, expected] of Object.entries(snapshot.cohort_distribution)) {
    if ((dist[cohort] ?? 0) !== expected) {
      problems.push(`cohort_distribution.${cohort} dice ${expected} pero hay ${dist[cohort] ?? 0}`);
    }
  }

  // Ninguna address en claro debe aparecer en el JSON público
  const serialized = JSON.stringify(snapshot);
  for (const r of rawRows) {
    if (serialized.includes(r.wallet.toLowerCase())) {
      problems.push(`address en claro filtrada: ${r.wallet.slice(0, 10)}…`);
    }
  }

  // Alineación posicional: participants[] se construyó desde sorted[] en orden,
  // así que el índice i del snapshot corresponde a la fila i de la base.
  const seen = new Set<string>();
  snapshot.participants.forEach((p: any, i: number) => {
    const row = rawRows[i];
    if (!row) return;
    const tag = `${p.wallet_hash?.slice(0, 8)}…`;

    const expectedHash = hashWallet(row.wallet, seed);
    if (p.wallet_hash !== expectedHash) {
      problems.push(`hash no recalcula con la semilla para ${tag}: ${p.wallet_hash} != ${expectedHash}`);
    }
    if (p.cohort !== row.cohort) {
      problems.push(`cohort ${p.cohort} != base ${row.cohort} para ${tag}`);
    }
    if (p.band !== band(Number(row.balance_at_detection))) {
      problems.push(`banda incorrecta para ${tag}`);
    }
    if (p.exposure !== (row.message_sent_at ? 'exposed' : 'unexposed')) {
      problems.push(`exposure incorrecta para ${tag}`);
    }
    if (seen.has(p.wallet_hash)) problems.push(`wallet_hash duplicado: ${tag}`);
    seen.add(p.wallet_hash);
  });

  // Merkle recalculado
  const leaves = snapshot.participants.map((p: any) => p.wallet_hash);
  const recomputed = merkleRoot(leaves);
  if (recomputed !== snapshot.merkle_root) {
    problems.push(`merkle_root del snapshot (${snapshot.merkle_root}) != recalculado (${recomputed})`);
  }

  // Prueba de pertenencia real sobre las primeras 3 hojas: recalcula la raíz
  // desde la hoja + el camino de hermanos, sin acceso al resto del árbol.
  snapshot.participants.slice(0, 3).forEach((p: any, i: number) => {
    const proof = buildProof(leaves, i);
    if (!verifyProof(p.wallet_hash, proof, recomputed)) {
      problems.push(`verifyProof falló para ${p.wallet_hash?.slice(0, 8)}…`);
    }
  });

  return problems;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const { getSupabaseAdmin } = await import('../src/lib/services/coordination/supabase-admin');
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from('fes_participants')
    .select('wallet, cohort, balance_at_detection, days_inactive_at_detection, message_sent_at, created_at')
    .order('balance_at_detection', { ascending: false });

  if (error) throw new Error(`No se pudo leer fes_participants: ${error.message}`);
  if (!rows || rows.length === 0) throw new Error('fes_participants está vacía. Corré el seed primero.');

  console.log(`Participantes en base: ${rows.length}`);

  // Orden determinista: balance desc, luego wallet asc como desempate
  const sorted = [...rows].sort((a, b) => {
    const d = Number(b.balance_at_detection) - Number(a.balance_at_detection);
    return d !== 0 ? d : a.wallet.localeCompare(b.wallet);
  });

  const seed = loadOrCreateSeed();
  if (!/^[0-9a-f]{64}$/.test(seed)) throw new Error('La semilla debe ser 64 chars hex.');

  if (VERIFY_ONLY) {
    const stored = JSON.parse(fs.readFileSync(PUBLIC_JSON, 'utf8'));
    const problems = await verifySnapshot(stored, seed, sorted);
    console.log(problems.length === 0
      ? `\n✅ Snapshot local verificado (${stored.participants.length} participantes)`
      : `\n❌ ${problems.length} problema(s):\n${problems.map((p) => `   - ${p}`).join('\n')}`);
    process.exit(problems.length === 0 ? 0 : 1);
  }

  const created = sorted.map((r) => r.created_at as string);
  const listFrozenAt = created.reduce((min, c) => (c < min ? c : min), created[0]);

  // Orden determinista: balance desc, luego wallet asc como desempate.
  // Ninguna address en claro entra acá, en dry-run ni en la subida real.
  const participants = sorted.map((r) => ({
    wallet_hash: hashWallet(r.wallet, seed),
    band: band(Number(r.balance_at_detection)),
    cohort: r.cohort,
    exposure: r.message_sent_at ? 'exposed' : 'unexposed',
  }));

  const leaves = participants.map((p) => p.wallet_hash);
  const root = merkleRoot(leaves);

  const dist = participants.reduce<Record<string, number>>((acc, p) => {
    acc[p.cohort] = (acc[p.cohort] ?? 0) + 1;
    return acc;
  }, {});

  // Estadísticas por cohorte: es lo que permite auditar que A y B son
  // comparables, sin publicar el balance de cada wallet.
  const cohortStats = Object.keys(dist).sort().map((cohort) => {
    const vals = sorted.filter((r) => r.cohort === cohort).map((r) => Number(r.balance_at_detection)).sort((a, b) => a - b);
    const totalRif = vals.reduce((a, b) => a + b, 0);
    const mid = Math.floor(vals.length / 2);
    return {
      cohort,
      n: vals.length,
      total_rif: round2(totalRif),
      mean_rif: round2(totalRif / vals.length),
      median_rif: vals.length % 2 ? round2(vals[mid]) : round2((vals[mid - 1] + vals[mid]) / 2),
      min_rif: round2(vals[0]),
      max_rif: round2(vals[vals.length - 1]),
    };
  });

  const snapshot = {
    project: 'Andromeda Core FES Pilot',
    ecosystem: 'Rootstock Collective',
    generated_at: new Date().toISOString(),
    list_frozen_at: listFrozenAt,
    seed,
    merkle_root: root,
    total_participants: participants.length,
    cohort_distribution: dist,
    eligibility_criteria: {
      min_balance_rif: Number(process.env.RIF_MIN_BALANCE || 500),
      min_days_inactive: Number(process.env.RIF_MIN_DAYS_INACTIVE || 30),
      last_activity_cutoff: '2026-06-01T00:00:00.000Z',
      data_source: 'Rootstock Rewards Subgraph (backerStakingHistories)',
      note:
        'Thresholds fijados antes de correr la detección. No se modifican ' +
        'después de observar resultados.',
    },
    evaluation_rules: {
      exposure_floor: 8,
      primary_metric: 'conversion_per_wallet',
      observation_window_days: 28,
    },
    cohort_balance_stats: cohortStats,
    participants,
  };

  // Verificación previa a publicar
  const problems = await verifySnapshot(snapshot, seed, sorted);
  if (problems.length > 0) {
    console.log(`\n❌ Verificación local falló, NO se sube nada:\n${problems.map((p) => `   - ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`\n✅ Verificación local OK (${participants.length} participantes, root ${root.slice(0, 16)}…)`);

  // Archivo de custodia local: mapping wallet → hash, con balance fino.
  // Nunca se sube a IPFS.
  fs.writeFileSync(CUSTODY_JSON, JSON.stringify({
    generated_at: snapshot.generated_at,
    seed,
    merkle_root: root,
    note: 'NO PUBLICAR. Contiene las addresses en claro y el balance exacto.',
    mapping: sorted.map((r, i) => ({
      wallet: r.wallet,
      wallet_hash: participants[i].wallet_hash,
      balance_rif: Number(r.balance_at_detection),
      days_inactive: r.days_inactive_at_detection,
      cohort: r.cohort,
      message_sent_at: r.message_sent_at,
      created_at: r.created_at,
    })),
  }, null, 2), 'utf8');

  if (DRY_RUN) {
    console.log('\n[dry-run] Snapshot no subido. Previsualización:\n');
    console.log(JSON.stringify(snapshot, null, 2));
    process.exit(0);
  }

  // Upload a IPFS: un solo JSON
  const { uploadScorecardToIPFS, getFromIPFS } = await import('../src/lib/services/coordination/ipfs-adapter');
  const uploaded = await uploadScorecardToIPFS(snapshot);
  console.log(`\nCID: ${uploaded.cid}`);
  console.log(`URL: ${uploaded.url}`);
  console.log(`Bytes: ${uploaded.size}`);

  // Verificación post-upload: lo que se publico debe coincidir byte a byte
  const fetched = await getFromIPFS(uploaded.cid);
  const canonical = JSON.stringify(snapshot);
  if (JSON.stringify(fetched) !== canonical) {
    console.log('❌ El contenido en IPFS no coincide con el local.');
    process.exit(1);
  }
  console.log('✅ Contenido en IPFS coincide con el local (byte a byte)');

  const remoteProblems = await verifySnapshot(fetched, seed, sorted);
  if (remoteProblems.length > 0) {
    console.log(`❌ Verificación remota falló:\n${remoteProblems.map((p) => `   - ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ Verificación remota OK');

  fs.writeFileSync(PUBLIC_JSON, JSON.stringify({ ...snapshot, cid: uploaded.cid, url: uploaded.url }, null, 2), 'utf8');

  console.log(`\nGuardado:\n  público (local) : ${PUBLIC_JSON}\n  custodia (local): ${CUSTODY_JSON}`);
}

main().catch((e) => {
  console.error('FALLO:', e?.message ?? e);
  if (process.env.DEBUG_SNAPSHOT) console.error(e?.stack);
  process.exit(1);
});

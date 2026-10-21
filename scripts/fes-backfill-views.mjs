/**
 * fes-backfill-views.mjs
 *
 * Migra las vistas históricas de `fes_events` (evento preview_view, wallet
 * CRUDA) a la nueva tabla `fes_views` (walletHash determinista v3), que es la
 * fuente del embudo Viewed → Staked desde el spec oct-2026.
 *
 * Correr DESPUÉS de aplicar supabase/migrations/002_fes_stake_events.sql:
 *
 *   node scripts/fes-backfill-views.mjs
 *
 * Requiere (no imprime valores):
 *   - NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) del proyecto activo
 *   - SUPABASE_SERVICE_ROLE_KEY  (server-side ONLY; nunca en el cliente)
 *   - FES_WALLET_HASH_SALT       (>=16 chars — la MISMA que usa el deploy:
 *                                 si difiere, los hashes no unen y la
 *                                 atribución se pierde)
 *
 * Idempotente: las vistas ya migradas (mismo wallet_hash + created_at) se
 * omiten. El referrer de la historia es null: no se registró en esa época.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga básica de .env (solo si la variable no está exportada). No imprime valores.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    for (const line of envFile.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* sin .env: el check de abajo falla explícitamente */ }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FES_SALT = process.env.FES_WALLET_HASH_SALT || '';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('ERROR: falta NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) y/o SUPABASE_SERVICE_ROLE_KEY.');
  console.error('  Exportalas antes de correr (la service role NUNCA se hardcodea ni se imprime).');
  process.exit(1);
}

// Fail-closed: sin la sal exacta del deploy los hashes calculados acá no
// unirían con los que graba /api/fes/check-wallet en producción.
if (FES_SALT.length < 16) {
  console.error('ERROR: FES_WALLET_HASH_SALT no está definida (o tiene menos de 16 caracteres).');
  console.error('  Usá la MISMA sal configurada en el despliegue; con otra sal la');
  console.error('  atribución del piloto no puede unir vistas con stakes.');
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
};

/** Mismo esquema v3 que walletHashService.hashWalletDeterministic(). */
function fesWalletHash(wallet) {
  const raw = crypto.createHmac('sha256', FES_SALT).update(wallet.toLowerCase()).digest('hex');
  return `did:andromeda:hash:v3:${raw.substring(0, 32)}`;
}

async function rest(pathAndQuery, options = {}) {
  const res = await fetch(`${REST}${pathAndQuery}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Supabase REST ${options.method || 'GET'} ${pathAndQuery} → HTTP ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

const COHORTS = new Set(['A', 'B', 'VIP']);

async function main() {
  // 1. Vista histórica (wallet cruda) desde fes_events.
  const events = await rest(
    '/fes_events?event_type=eq.preview_view&select=wallet,payload,created_at&order=created_at.asc'
  );
  console.log(`Vistas históricas en fes_events: ${events.length}`);

  // 2. Ya migradas (idempotencia por wallet_hash + created_at).
  const existing = await rest('/fes_views?select=wallet_hash,created_at');
  const done = new Set(existing.map(v => `${v.wallet_hash}|${v.created_at}`));
  console.log(`Vistas ya presentes en fes_views: ${existing.length}`);

  // 3. Calcular las filas faltantes.
  const rows = [];
  let skippedNoCohort = 0;
  for (const e of events) {
    const wallet = (e.wallet || '').toLowerCase();
    const cohort = e.payload?.cohort;
    if (!wallet || !COHORTS.has(cohort)) {
      skippedNoCohort++;
      continue;
    }
    const createdAt = e.created_at;
    const walletHash = fesWalletHash(wallet);
    if (done.has(`${walletHash}|${createdAt}`)) continue;
    rows.push({
      wallet_hash: walletHash,
      cohort,
      message_variant: e.payload?.message_variant ?? null,
      channel: e.payload?.channel || 'unknown',
      // El referrer no se registró en esa época: queda null, no 'direct'.
      referrer: null,
      balance_rif: typeof e.payload?.balance === 'number' ? e.payload.balance : null,
      days_inactive: typeof e.payload?.daysInactive === 'number' ? e.payload.daysInactive : null,
      created_at: createdAt,
    });
  }

  if (skippedNoCohort > 0) {
    console.warn(`AVISO: ${skippedNoCohort} evento(s) sin cohorte válida en el payload — omitidos.`);
  }

  if (rows.length === 0) {
    console.log('Nada que migrar: fes_views ya está al día.');
    return;
  }

  // 4. Insertar (service role bypasea RLS;.created_at explícito preserva la
  //    marca de tiempo original de la vista).
  await rest('/fes_views', {
    method: 'POST',
    body: JSON.stringify(rows),
    headers: { Prefer: 'return=minimal' },
  });

  console.log(`OK: ${rows.length} vista(s) migrada(s) a fes_views (hash v3 determinista).`);
  console.log('Verificación sugerida: el bloque PILOT PROGRESS del dashboard debe');
  console.log('mostrar el mismo "Viewed" que antes del corte de medición.');
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});

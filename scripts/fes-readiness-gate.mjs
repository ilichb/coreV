#!/usr/bin/env node
/**
 * FES Readiness Gate — chequeo reproducible de lanzamiento.
 *
 * Uso:
 *   node scripts/fes-readiness-gate.mjs           # verifica lo verificable en local
 *   node scripts/fes-readiness-gate.mjs --build   # además corre `yarn build` (~2 min)
 *
 * Cada ítem imprime PASS / FAIL / EXTERNAL. EXTERNAL = no se puede verificar
 * desde este repo (requiere acceso a Vercel, Supabase o una decisión humana):
 * no se cuentan como PASS. El veredicto final es READY solo si no hay FAIL ni
 * EXTERNAL pendiente.
 *
 * Propósito: que el "NOT READY" del informe sea reproducible por cualquier
 * persona con el repo, no una afirmación mía.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_BUILD = process.argv.includes('--build');

const results = [];

function check(id, status, detail) {
  results.push({ id, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🟡';
  console.log(`${icon} [${status}] ${id}${detail ? ` — ${detail}` : ''}`);
}

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.next', '.git', 'packages', 'dist'].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ── 1. Suite de pruebas ────────────────────────────────────────────────────
try {
  sh('npx jest --silent');
  check('tests', 'PASS', 'suite completa en verde');
} catch (e) {
  check('tests', 'FAIL', String(e.message).split('\n')[0]);
}

// ── 2. Build de producción ─────────────────────────────────────────────────
if (RUN_BUILD) {
  try {
    sh('npx next build');
    check('build', 'PASS', 'next build sin errores');
  } catch (e) {
    check('build', 'FAIL', String(e.message).split('\n')[0]);
  }
} else {
  check('build', 'EXTERNAL', 'no ejecutado (pasar --build para verificarlo acá)');
}

// ── 3. Etiquetas de cohorte unificadas ─────────────────────────────────────
// Ignora comentarios (son menciones documentales al label viejo) y tests
// (que afirman que 'WHALE' NO aparece).
const files = walk(join(ROOT, 'src'));
const codeFiles = files
  .filter(f => !/[\\/]__tests__[\\/]/.test(f))
  .filter(f => /\.tsx?$/.test(f));
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const whaleHits = codeFiles.filter(f => stripComments(readFileSync(f, 'utf8')).includes("'WHALE'"));
check(
  'cohort-labels',
  whaleHits.length === 0 ? 'PASS' : 'FAIL',
  whaleHits.length === 0
    ? "solo existen las etiquetas 'A' | 'B' | 'VIP'"
    : `etiqueta WHALE residual en: ${whaleHits.map(f => f.replace(ROOT, '')).join(', ')}`
);

// ── 4. Secretos en archivos trackeados ────────────────────────────────────
const secretPatterns = [
  { re: /thegraph\.com\/api\/[a-f0-9]{20,}/i, label: 'The Graph API key embebida' },
  { re: /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\./, label: 'JWT / service key embebida' },
  // Excluye construcciones con template literals (`mongodb+srv://${user}:…`)
  // que arman la URI desde variables de entorno: eso no es una credencial.
  { re: /mongodb\+srv:\/\/[^:\s$]+:[^@\s$]+@/i, label: 'URI de MongoDB con credenciales' },
];
const tracked = sh('git ls-files').trim().split('\n').filter(Boolean);
const secretHits = [];
for (const rel of tracked) {
  if (!/\.(ts|tsx|js|mjs|json|md|sql|yml|yaml)$/.test(rel)) continue;
  const full = join(ROOT, rel);
  if (!existsSync(full)) continue;
  const content = readFileSync(full, 'utf8');
  for (const p of secretPatterns) {
    if (p.re.test(content)) secretHits.push(`${rel}: ${p.label}`);
  }
}
check(
  'no-tracked-secrets',
  secretHits.length === 0 ? 'PASS' : 'FAIL',
  secretHits.length === 0 ? 'sin credenciales en el árbol trackeado' : secretHits.join(' | ')
);

// ── 5. Direcciones personales en documentos trackeados ────────────────────
const custodyPath = join(ROOT, 'local-snapshots', 'fes-snapshot-custody.json');
if (existsSync(custodyPath)) {
  const wallets = JSON.parse(readFileSync(custodyPath, 'utf8')).mapping.map(m => m.wallet.toLowerCase());
  const docs = tracked.filter(f => /\.(md|mdx|txt)$/.test(f));
  const leaks = [];
  for (const rel of docs) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    const content = readFileSync(full, 'utf8').toLowerCase();
    for (const w of wallets) if (content.includes(w)) leaks.push(`${rel}: ${w.slice(0, 10)}…`);
  }
  check(
    'no-wallet-leaks-in-docs',
    leaks.length === 0 ? 'PASS' : 'FAIL',
    leaks.length === 0 ? 'ninguna wallet del piloto en documentos trackeados' : leaks.join(', ')
  );
} else {
  check('no-wallet-leaks-in-docs', 'EXTERNAL', 'falta local-snapshots/fes-snapshot-custody.json');
}

// ── 6. Migración 002 preparada ─────────────────────────────────────────────
const m002 = join(ROOT, 'supabase', 'migrations', '002_fes_stake_events.sql');
check(
  'migration-002-file',
  existsSync(m002) ? 'PASS' : 'FAIL',
  existsSync(m002) ? 'archivo presente (aplicarla en Supabase es paso EXTERNAL)' : 'no existe'
);

// ── 7. Ítems EXTERNAL (requieren acceso o decisión humana) ────────────────
check('migration-002-applied', 'EXTERNAL', 'requiere SQL Editor de Supabase (sin connection string en este entorno)');
check('vercel-env-vars', 'EXTERNAL', 'FES_WALLET_HASH_SALT, CRON_SECRET, STAKING_CONTRACT_ADDRESS, RIF_TOKEN_ADDRESS deben existir en Vercel');
check('vercel-cron-scheduled', 'EXTERNAL', 'verificar en Vercel que /api/cron/fes-track corre a diario con CRON_SECRET');
check('thegraph-key-rotation', 'EXTERNAL', 'la clave The Graph expuesta sigue activa: rotarla y reemplazar en Vercel + .env local');
check('participant-count-18', 'EXTERNAL', 'confirmar con Rootstock la cifra autoritativa (PDF: 16, foro: 19, DB: 18)');
check('vip-gate-decision', 'EXTERNAL', 'confirmar si la cohorte VIP queda fuera del gate de 50.000 RIF');
check('forum-correction', 'EXTERNAL', 'corregir/actualizar el hilo del foro antes de publicar el enlace');

// ── Veredicto ──────────────────────────────────────────────────────────────
const fails = results.filter(r => r.status === 'FAIL');
const pending = results.filter(r => r.status === 'EXTERNAL');

console.log('\n──────────────────────────────────────────────');
console.log(`PASS ${results.filter(r => r.status === 'PASS').length} · FAIL ${fails.length} · EXTERNAL ${pending.length}`);

if (fails.length > 0) {
  console.log('VEREDICTO: NOT READY (hay FAIL)');
  process.exit(1);
} else if (pending.length > 0) {
  console.log('VEREDICTO: BLOCKED (todo lo local pasa; quedan items EXTERNAL)');
  process.exit(2);
} else {
  console.log('VEREDICTO: READY');
  process.exit(0);
}

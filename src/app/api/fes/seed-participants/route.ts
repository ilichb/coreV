/**
 * POST /api/fes/seed-participants
 *
 * Detecta holders inactivos, asigna cohortes y PERSISTE el resultado en
 * `fes_participants`. Esto es lo que antes no existía: `upsertParticipant`
 * y `batchUpsertParticipants` estaban definidas pero ningún flujo las llamaba,
 * así que la tabla nunca recibió filas.
 *
 * Idempotente: el upsert usa `onConflict: 'wallet'` (PK), así que re-ejecutarlo
 * actualiza en lugar de duplicar.
 *
 * Auth: requiere `X-Internal-Key` (FES_INTERNAL_KEY). Ver src/middleware.ts.
 *
 * Body opcional: { "commit": true }
 *   - commit: false (default) → solo dry-run, devuelve el plan sin escribir
 *   - commit: true           → escribe
 *
 * Deliberadamente NO se dispara desde GET /api/fes/metrics: ese endpoint se
 * llama en cada visita al dashboard y no debe escribir en la base.
 */

import { NextRequest, NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';
import { cohortAssignmentService } from '@/lib/services/rootstock/cohort-assignment.service';
import { fesStorage, type Cohort } from '@/lib/services/rootstock/fes-storage.service';
import { logger } from '@/lib/utils/logger';

// El detection hace ~13s (subgraph paginado + RPC batching). Subimos el timeout.
export const maxDuration = 60;

const VARIANT: Record<string, 'control' | 'treatment' | 'vip'> = {
  A: 'control',
  B: 'treatment',
  WHALE: 'vip',
};

/** Mapea el cohort del servicio ('WHALE') al que exige el CHECK de la tabla ('VIP'). */
function toTableCohort(cohort: string): Cohort {
  return cohort === 'WHALE' ? 'VIP' : (cohort as Cohort);
}

export async function POST(request: NextRequest) {
  let commit = false;
  try {
    const raw = await request.text();
    if (raw.trim()) {
      const body = JSON.parse(raw);
      commit = body.commit === true;
    }
  } catch {
    // body vacío o inválido → dry-run
  }

  try {
    logger.info('[FES seed] Iniciando detección de holders inactivos...');
    const inactive = await inactiveHolderService.findInactiveHolders();

    if (inactive.count === 0) {
      return NextResponse.json({
        seeded: 0,
        reason: 'No inactive holders detected',
        detection: inactive.metadata ?? null,
      });
    }

    const cohortResult = cohortAssignmentService.assign(inactive.holders);
    const all = [
      ...cohortResult.cohorts.A,
      ...cohortResult.cohorts.B,
      ...cohortResult.whales,
    ];

    const rows = all.map((h) => ({
      wallet: h.wallet.toLowerCase(),
      cohort: toTableCohort(h.cohort),
      message_variant: VARIANT[h.cohort] ?? 'control',
      balance_at_detection: h.balance,
      days_inactive_at_detection: h.daysInactive,
      last_block_at_detection: Number(h.lastStakeActivity.getTime() / 1000),
      last_block_checkpoint: null,
      message_sent_at: null,
      message_language: null,
      reactivated: false,
      reactivated_at: null,
      last_block_current: null,
      last_checked_at: null,
    }));

    // Cobertura de wallets sin duplicados
    const uniqueWallets = new Set(rows.map((r) => r.wallet));
    const duplicates = rows.length - uniqueWallets.size;

    const distribution = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.cohort] = (acc[r.cohort] ?? 0) + 1;
      return acc;
    }, {});

    if (!commit) {
      return NextResponse.json({
        dryRun: true,
        total: rows.length,
        distribution,
        duplicates,
        sample: rows.slice(0, 3).map((r) => ({
          wallet: `${r.wallet.slice(0, 10)}…`,
          cohort: r.cohort,
          balance: r.balance_at_detection,
        })),
        hint: 'Re-enviar con { "commit": true } para escribir en Supabase.',
      });
    }

    await fesStorage.batchUpsertParticipants(rows);

    // Verificación post-escritura: no confiar en el "success" de la API.
    const persisted = await fesStorage.listParticipants();
    const persistedWallets = new Set(persisted.map((p) => p.wallet));

    const missing = [...uniqueWallets].filter((w) => !persistedWallets.has(w));

    logger.info(`[FES seed] ${rows.length} filas procesadas, ${persisted.length} en tabla`);

    return NextResponse.json({
      dryRun: false,
      seeded: rows.length,
      distribution,
      duplicates,
      persistedTotal: persisted.length,
      missingAfterWrite: missing.length,
      missingSample: missing.slice(0, 5),
      ok: missing.length === 0 && duplicates === 0,
    });
  } catch (error: any) {
    logger.error('[FES seed] failed', error);
    return NextResponse.json(
      { error: 'Failed to seed participants', detail: error.message },
      { status: 500 }
    );
  }
}

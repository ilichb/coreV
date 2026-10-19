import { NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';
import { cohortAssignmentService } from '@/lib/services/rootstock/cohort-assignment.service';
import { buildMessage } from '@/lib/services/rootstock/message-templates';
import { fesStorage } from '@/lib/services/rootstock/fes-storage.service';
import { fesAttributionMonitor } from '@/lib/services/rootstock/fes-attribution-monitor.service';
import { yieldProjectionService } from '@/lib/services/rootstock/yield-projection.service';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';
import { logger } from '@/lib/utils/logger';

function toDateStr(v: Date | string): string {
  if (typeof v === 'string') return v.split('T')[0];
  return v.toISOString().split('T')[0];
}

// ── Ventana de observación del piloto ──────────────────────────────────────
// El enlace público a /preview se publicó el 14/10/2026 a las 08:45 UTC y ahí
// empieza a correr la ventana de 28 días. La hora es la que se anunció en el
// foro: si la cambiás, el "Day N" del dashboard deja de coincidir con lo
// publicado.
const PILOT_WINDOW_START = new Date('2026-10-14T08:45:00Z');
const PILOT_WINDOW_DAYS = 28;

function buildPilotWindow() {
  const now = new Date();
  const end = new Date(PILOT_WINDOW_START.getTime() + PILOT_WINDOW_DAYS * 86400000);
  const elapsedDays = Math.floor((now.getTime() - PILOT_WINDOW_START.getTime()) / 86400000);

  const status =
    elapsedDays < 0 ? 'upcoming' : elapsedDays >= PILOT_WINDOW_DAYS ? 'closed' : 'active';

  return {
    start: PILOT_WINDOW_START.toISOString(),
    end: end.toISOString(),
    totalDays: PILOT_WINDOW_DAYS,
    currentDay: status === 'upcoming' ? 0 : Math.min(elapsedDays + 1, PILOT_WINDOW_DAYS),
    daysRemaining: Math.max(0, PILOT_WINDOW_DAYS - Math.max(0, elapsedDays)),
    status,
  };
}

export async function GET() {
  try {
    const inactive = await inactiveHolderService.findInactiveHolders();
    if (inactive.count === 0) {
      return NextResponse.json({
        count: 0,
        cohorts: null,
        whales: null,
        messages: null,
        reactivation: null,
        metadata: {
          source: 'Rewards Subgraph',
          generatedAt: new Date().toISOString(),
          note: 'No inactive holders detected',
        },
      });
    }

    const cohortResult = cohortAssignmentService.assign(inactive.holders);

    // Enriquecer con proyección de rendimiento para cada holder
    const holdersWithYield = await Promise.all(
      inactive.holders.map(async (h) => {
        const yieldProj = await yieldProjectionService.calculate(h.balance, h.daysInactive);
        return { ...h, yieldProjection: yieldProj };
      })
    );

    const msgCtx = (h: { wallet: string; balance: number; daysInactive: number; lastStakeActivity: Date | string; yieldProjection?: any }) => ({
      wallet: h.wallet,
      balance: h.balance,
      daysInactive: h.daysInactive,
      lastStakeActivity: toDateStr(h.lastStakeActivity),
      projectedYield: h.yieldProjection?.projectedYieldRIF,
      recommendedBuilders: h.yieldProjection?.recommendedBuilders,
    });

    const messages = {
      control: cohortResult.cohorts.A.map(h => buildMessage(msgCtx(h), 'control')),
      treatment: cohortResult.cohorts.B.map(h => buildMessage(msgCtx(h), 'treatment')),
      vip: cohortResult.whales.map(h => buildMessage(msgCtx(h), 'vip')),
    };

    // Holder details con wallet hasheada en lugar de address cruda
    const holderDetails = holdersWithYield.map(h => {
      const all = [...cohortResult.cohorts.A, ...cohortResult.cohorts.B, ...cohortResult.whales];
      const assignment = all.find(a => a.wallet === h.wallet);
      return {
        walletHash: walletHashService.hashWallet(h.wallet).walletHash,
        balance: h.balance,
        daysInactive: h.daysInactive,
        lastStakeActivity: typeof h.lastStakeActivity === 'string' ? h.lastStakeActivity : h.lastStakeActivity.toISOString(),
        cohort: assignment?.cohort || null,
        message_variant: assignment?.cohort === 'A' ? 'control'
          : assignment?.cohort === 'B' ? 'treatment'
            : assignment?.cohort === 'WHALE' ? 'vip'
              : null,
        yieldProjection: h.yieldProjection,
      };
    });

    const reactivation = await fesStorage.getReactivationMetrics();

    // Cohorte congelada (lista persistida en fes_participants vs. detección en vivo).
    //
    // IMPORTANTE: esto es la fuente de verdad del piloto. La detección en vivo de
    // arriba re-asigna cohortes desde cero sobre lo que hoy califica, y va a
    // divergir cada vez más (wallets que se des-stakean o reactivan salen del
    // detector pero siguen en la cohorte congelada). El snapshot publicado en
    // IPFS corresponde a ESTA lista, no a la de arriba.
    const frozen = await fesStorage.listParticipants();

    const frozenDistribution = frozen.reduce<Record<string, number>>((acc, p) => {
      acc[p.cohort] = (acc[p.cohort] ?? 0) + 1;
      return acc;
    }, {});

    // ── Modelo de medición ────────────────────────────────────────────────
    // El piloto NO envía mensajes. El canal es un enlace público a /preview.
    //   Viewed     = abrió /preview (evento preview_view en fes_events)
    //   Staked     = stake VERIFICADO en chain, posterior a la vista y dentro
    //                de la ventana (fes_attributions). La condición
    //                stakeDate > viewDate es la que prueba que el stake vino
    //                DESPUÉS del reporte — sin eso no hay atribución.
    //   Not Viewed = en la cohorte congelada sin evento de vista
    const win = buildPilotWindow();
    const windowEndMs = new Date(win.end).getTime();

    const viewEvents = await fesStorage.getEvents(undefined, 'preview_view', 1000);
    const viewByWallet = new Map<string, string>();
    // 'unknown' = eventos anteriores a que existiera el tracking de canal.
    // Sin este bucket, esas vistas caerían en 'direct' y el desglose mentiría.
    const viewsByChannel: Record<string, number> = {
      rootstock_official: 0, forum: 0, andromeda: 0, direct: 0, unknown: 0,
    };
    for (const e of viewEvents) {
      const w = (e.wallet || '').toLowerCase();
      const raw = (e.payload as any)?.channel;
      const ch = raw ? String(raw) : 'unknown';
      viewsByChannel[ch] = (viewsByChannel[ch] ?? 0) + 1;
      // Nos quedamos con la PRIMERA vista: es la que inicia el recorrido.
      if (w && !viewByWallet.has(w)) {
        viewByWallet.set(w, e.created_at ?? new Date().toISOString());
      }
    }

    const viewed = frozen.filter(p => viewByWallet.has(p.wallet.toLowerCase()));
    const notViewed = frozen.filter(p => !viewByWallet.has(p.wallet.toLowerCase()));

    // fes_attributions guarda walletHash, así que se compara contra el hash de
    // cada wallet del cohorte. Si la colección está vacía el monitor nunca
    // corrió, y Staked queda en 0 aunque haya reactivaciones — por eso el
    // contralibre de más abajo, para que una divergencia sea visible y no
    // silenciosa.
    const viewedHashes = new Map<string, string>();
    for (const p of viewed) {
      viewedHashes.set(walletHashService.hashWallet(p.wallet).walletHash, p.wallet.toLowerCase());
    }

    let attributions: Awaited<ReturnType<typeof fesAttributionMonitor.getAttributions>> = [];
    try {
      attributions = await fesAttributionMonitor.getAttributions(500);
    } catch (err) {
      logger.error('FES metrics: getAttributions failed', err);
    }

    const stakedAtByWallet = new Map<string, string>();
    for (const a of attributions) {
      const wallet = viewedHashes.get(a.walletHash);
      if (!wallet) continue; // no vio el reporte → no hay atribución posible
      const stakeMs = new Date(a.stakedAt).getTime();
      const viewMs = new Date(viewByWallet.get(wallet)!).getTime();
      if (stakeMs > viewMs && stakeMs <= windowEndMs && !stakedAtByWallet.has(wallet)) {
        stakedAtByWallet.set(wallet, a.stakedAt as unknown as string);
      }
    }

    const staked = frozen.filter(p => stakedAtByWallet.has(p.wallet.toLowerCase()));

    // Contralibre: flag `reactivated` del tracker (se dispara con cualquier
    // avance de bloque, incluidos unstakes o transferencias). Si es mayor que
    // Staked, hay actividad atribuible que la atribución no pudo confirmar.
    const reactivatedCount = frozen.filter(p => p.reactivated).length;
    const reactivatedNotAttributed = frozen.filter(
      p => p.reactivated && !stakedAtByWallet.has(p.wallet.toLowerCase())
    ).length;

    // Días desde la primera vista hasta el stake atribuido. Si no hay
    // atribución, se usa el `reactivated_at` del tracker como aproximación,
    // marcándolo con `daysSource` para no presentarlo como atribución.
    const daysViewToStake = (p: { wallet: string; reactivated_at: string | null }) => {
      const wallet = p.wallet.toLowerCase();
      const viewedAt = viewByWallet.get(wallet);
      const stakeAt = stakedAtByWallet.get(wallet) ?? p.reactivated_at;
      if (!stakeAt || !viewedAt) return null;
      const d = (new Date(stakeAt).getTime() - new Date(viewedAt).getTime()) / 86400000;
      return d >= 0 ? Math.round(d * 10) / 10 : null;
    };

    // ── Balance por cohorte: total Y mediana ──────────────────────────────
    // Se publican los dos porque no dan el mismo número y eso se presta a
    // confusión: dos wallets grandes tiran el total mucho más arriba que la
    // mediana. Mediana ~3x, total ~9.5x. Ambos son correctos.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const balanceByCohort = (['A', 'B', 'VIP'] as const).map(cohort => {
      const vals = frozen
        .filter(p => p.cohort === cohort)
        .map(p => Number(p.balance_at_detection))
        .sort((a, b) => a - b);
      const n = vals.length;
      if (n === 0) return { cohort, n: 0, total: 0, median: 0, mean: 0 };
      const sum = vals.reduce((a, b) => a + b, 0);
      const mid = Math.floor(n / 2);
      return {
        cohort,
        n,
        total: round2(sum),
        median: n % 2 ? round2(vals[mid]) : round2((vals[mid - 1] + vals[mid]) / 2),
        mean: round2(sum / n),
      };
    });

    const frozenCohort = {
      total: frozen.length,
      // Embudo del piloto
      viewed: viewed.length,
      staked: staked.length,
      notViewed: notViewed.length,
      // Staked / Viewed, protegido contra división por cero: si nadie entró a
      // /preview la conversión no es 0%, es indefinida, y se reporta como null.
      conversionRate: viewed.length > 0 ? staked.length / viewed.length : null,
      // Contralibre: actividad del tracker no confirmada por atribución
      reactivatedCount,
      reactivatedNotAttributed,
      // Conservados por compatibilidad con lo que ya consumes
      reactivated: staked.length,
      stillInactive: frozen.length - staked.length,
      contacted: 0,
      cohortDistribution: frozenDistribution,
      viewsByChannel,
      balanceByCohort,
      participants: frozen.map(p => {
        const viewedAt = viewByWallet.get(p.wallet.toLowerCase()) ?? null;
        return {
          wallet: p.wallet,
          cohort: p.cohort,
          messageVariant: p.message_variant,
          balance: p.balance_at_detection,
          daysInactiveAtDetection: p.days_inactive_at_detection,
          viewed: viewedAt !== null,
          viewedAt,
          // Atribuido: mismo criterio que el agregado de arriba, para que la
          // tabla A/B sume exactamente lo que dice el bloque PILOT PROGRESS.
          staked: stakedAtByWallet.has(p.wallet.toLowerCase()),
          stakedAt: stakedAtByWallet.get(p.wallet.toLowerCase()) ?? null,
          reactivated: p.reactivated,
          reactivatedAt: p.reactivated_at,
          daysViewToStake: daysViewToStake(p),
          lastBlockCheckpoint: p.last_block_checkpoint,
          lastBlockCurrent: p.last_block_current,
        };
      }),
    };

    return NextResponse.json({
      count: inactive.count,
      holders: holderDetails,
      cohorts: {
        A: cohortResult.summary.cohortA,
        B: cohortResult.summary.cohortB,
        total: cohortResult.summary.total,
        mainPool: cohortResult.summary.mainPool,
        whales: cohortResult.summary.whales,
      },
      whales: cohortResult.whales.map(w => ({
        ...w,
        walletHash: walletHashService.hashWallet(w.wallet).walletHash,
      })),
      messages: {
        control: { total: messages.control.length, sample: messages.control.slice(0, 2) },
        treatment: { total: messages.treatment.length, sample: messages.treatment.slice(0, 2) },
        vip: { total: messages.vip.length, sample: messages.vip.slice(0, 1) },
      },
      reactivation,
      frozenCohort,
      // Log de verificación del Cambio #3: la fuente de la conversión debe
      // dar 18 (Frozen Cohort), nunca 12 (Live Detection). Se puede borrar
      // una vez confirmado en producción.
      sourceAudit: {
        conversionSource: 'fes_participants',
        conversionSourceCount: frozen.length,
        liveDetectionCount: inactive.count,
        note:
          `conversionSourceCount debe ser ${frozen.length} (cohorte congelada). ` +
          `Si coincide con liveDetectionCount (${inactive.count}) la sección está leyendo la fuente equivocada.`,
      },
      pilotWindow: win,
      metadata: {
        ...inactive.metadata,
        cohortStrategy: cohortResult.metadata.strategy,
        generatedAt: new Date().toISOString(),
        note:
          'FES metrics — Internal use only. Wallets are hashed for privacy. ' +
          'El piloto NO envía mensajes: el canal es un enlace público a /preview. ' +
          'La medición es Viewed (abrió /preview) → Staked (volvió a stakear).',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch FES metrics', detail: error.message },
      { status: 500 }
    );
  }
}

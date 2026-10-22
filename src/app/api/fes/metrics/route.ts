import { NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';
import { cohortAssignmentService } from '@/lib/services/rootstock/cohort-assignment.service';
import { buildMessage } from '@/lib/services/rootstock/message-templates';
import { fesStorage } from '@/lib/services/rootstock/fes-storage.service';
import { fesAttributionMonitor } from '@/lib/services/rootstock/fes-attribution-monitor.service';
import { computeFesAlerts } from '@/lib/services/rootstock/fes-alerts';
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

  const status: 'upcoming' | 'active' | 'closed' =
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
        vip: null,
        messages: null,
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
      vip: cohortResult.vip.map(h => buildMessage(msgCtx(h), 'vip')),
    };

    // Holder details con wallet hasheada en lugar de address cruda
    const holderDetails = holdersWithYield.map(h => {
      const all = cohortAssignmentService.flatten(cohortResult);
      const assignment = all.find(a => a.wallet === h.wallet);
      return {
        walletHash: walletHashService.hashWalletDeterministic(h.wallet).walletHash,
        balance: h.balance,
        daysInactive: h.daysInactive,
        lastStakeActivity: typeof h.lastStakeActivity === 'string' ? h.lastStakeActivity : h.lastStakeActivity.toISOString(),
        cohort: assignment?.cohort || null,
        message_variant: assignment?.cohort === 'A' ? 'control'
          : assignment?.cohort === 'B' ? 'treatment'
            : assignment?.cohort === 'VIP' ? 'vip'
              : null,
        yieldProjection: h.yieldProjection,
      };
    });

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
    //   Viewed     = abrió /preview (fila en fes_views, walletHash v3)
    //   Staked     = stake VERIFICADO en chain, posterior a la vista y dentro
    //                de la ventana (fes_attributions). La condición
    //                stakedAt > viewedAt es la que prueba que el stake vino
    //                DESPUÉS del reporte — sin eso no hay atribución.
    //   Not Viewed = en la cohorte congelada sin vista registrada.
    const win = buildPilotWindow();
    const windowStartMs = new Date(win.start).getTime();
    const windowEndMs = new Date(win.end).getTime();

    // ── Identidad del piloto (Bloque 1): fila inmutable fes_pilot_meta ────
    // Fallback a las constantes si la migración 002 no se aplicó todavía; el
    // campo `source` hace visible cuál de las dos fuentes se usó.
    const pilotMetaRow = await fesStorage.getPilotMeta();
    const exposureFloor = pilotMetaRow?.exposure_floor ?? 8;
    const pilotMeta = {
      snapshotCid: pilotMetaRow?.snapshot_cid ?? null,
      merkleRoot: pilotMetaRow?.merkle_root ?? null,
      windowStart: pilotMetaRow?.window_start ?? win.start,
      windowEnd: pilotMetaRow?.window_end ?? win.end,
      cohortCount: pilotMetaRow?.cohort_count ?? frozen.length,
      cohortBreakdown: pilotMetaRow?.cohort_breakdown ?? frozenDistribution,
      exposureFloor,
      source: pilotMetaRow ? ('fes_pilot_meta' as const) : ('fallback-constants' as const),
    };

    // ── Vistas: fuente fes_views (walletHash determinista v3) ──────────────
    // El join con la cohorte es por hash: la wallet cruda de fes_participants
    // se hashea con la misma sal con la que check-wallet registró la vista.
    // Hash de cada wallet del cohorte (se calcula antes de agregar: el
    // desglose por canal solo cuenta vistas de las wallets listadas).
    const hashByWallet = new Map<string, string>(); // wallet cruda → wallet_hash
    for (const p of frozen) {
      hashByWallet.set(p.wallet.toLowerCase(), walletHashService.hashWalletDeterministic(p.wallet).walletHash);
    }
    const frozenHashes = new Set(hashByWallet.values());

    const viewRows = await fesStorage.getViews(5000);
    // 'unknown' = eventos anteriores a que existiera el tracking de canal.
    // Sin este bucket, esas vistas caerían en 'direct' y el desglose mentiría.
    const viewsByChannel: Record<string, number> = {
      rootstock_official: 0, forum: 0, andromeda: 0, direct: 0, unknown: 0,
    };
    const viewByHash = new Map<string, string>(); // wallet_hash → PRIMERA vista
    for (const v of viewRows) {
      // La medición es SOLO sobre las 18: una fila de wallet no-listada (por
      // ejemplo, heredera del bug C1 que asignaba cohortes en vivo) no entra
      // al funnel ni al desglose por canal.
      if (!v.wallet_hash || !frozenHashes.has(v.wallet_hash)) continue;
      const ch = v.channel || 'unknown';
      viewsByChannel[ch] = (viewsByChannel[ch] ?? 0) + 1;
      if (!v.created_at) continue;
      const cur = viewByHash.get(v.wallet_hash);
      // Date.parse en vez de confiar en el orden de la tabla.
      if (!cur || Date.parse(v.created_at) < Date.parse(cur)) {
        viewByHash.set(v.wallet_hash, v.created_at);
      }
    }

    const viewInfoByWallet = new Map<string, string>(); // wallet → viewedAt
    for (const p of frozen) {
      const viewedAt = viewByHash.get(hashByWallet.get(p.wallet.toLowerCase())!);
      if (viewedAt) viewInfoByWallet.set(p.wallet.toLowerCase(), viewedAt);
    }

    const viewed = frozen.filter(p => viewInfoByWallet.has(p.wallet.toLowerCase()));
    const notViewed = frozen.filter(p => !viewInfoByWallet.has(p.wallet.toLowerCase()));

    // fes_attributions guarda wallet_hash; se compara contra el hash de cada
    // wallet del cohorte. Si la colección está vacía el monitor nunca corrió,
    // y Staked queda en 0 aunque haya actividad on-chain — por eso el
    // Bloque 4 del dashboard muestra el estado del monitor, para que esa
    // divergencia sea visible y no silenciosa.
    let attributions: Awaited<ReturnType<typeof fesAttributionMonitor.getAttributions>> = [];
    try {
      attributions = await fesAttributionMonitor.getAttributions(500);
    } catch (err) {
      logger.error('FES metrics: getAttributions failed', err);
    }
    const attrByHash = new Map(attributions.map(a => [a.walletHash, a]));

    const stakedAtByWallet = new Map<string, string>();
    for (const [wallet, viewedAt] of viewInfoByWallet) {
      const a = attrByHash.get(hashByWallet.get(wallet)!);
      if (!a) continue; // vio el reporte pero no hay stake atribuible
      const stakeMs = Date.parse(a.stakedAt);
      const viewMs = Date.parse(viewedAt);
      // Defensa en profundidad: la regla ya vive en el monitor y en la
      // constraint CHECK de fes_attributions; acá se re-verifica contra la
      // vista vigente antes de contar la conversión.
      if (stakeMs > viewMs && stakeMs >= windowStartMs && stakeMs <= windowEndMs) {
        if (!stakedAtByWallet.has(wallet)) stakedAtByWallet.set(wallet, a.stakedAt);
      }
    }

    const staked = frozen.filter(p => stakedAtByWallet.has(p.wallet.toLowerCase()));

    // ── Estado del monitor (Bloque 4) + contralibre de hash (alerta 3) ────
    let monitor: Awaited<ReturnType<typeof fesAttributionMonitor.getMonitorStatus>> | null = null;
    try {
      monitor = await fesAttributionMonitor.getMonitorStatus();
    } catch (err) {
      logger.error('FES metrics: getMonitorStatus failed', err);
    }

    // Determinismo del hash: si un wallet_hash persistido no coincide con el
    // hash recalculado hoy, la sal FES_WALLET_HASH_SALT cambió o falta, y la
    // atribución futura se perdería en cada reinicio (alerta #3 del spec).
    let hashMismatches: number | null = null;
    try {
      const stakeEvents = await fesStorage.listStakeEvents(500);
      const attrTx = new Map(attributions.map(a => [`${a.txHash}:${a.logIndex}`, a.walletHash]));
      hashMismatches = 0;
      for (const e of stakeEvents) {
        if (!e.attributed) continue;
        const stored = attrTx.get(`${e.tx_hash}:${e.log_index}`);
        if (!stored) continue; // evento marcado pero sin fila en fes_attributions
        if (walletHashService.hashWalletDeterministic(e.wallet).walletHash !== stored) {
          hashMismatches++;
        }
      }
    } catch (err) {
      logger.error('FES metrics: hash determinism check failed', err);
      hashMismatches = null;
    }

    const alerts = computeFesAlerts({
      viewed: viewed.length,
      exposureFloor,
      daysRemaining: win.daysRemaining,
      windowStatus: win.status,
      monitor,
      hashMismatches,
    });

    // Días desde la primera vista hasta el stake atribuido. Solo se calcula
    // sobre atribuciones reales (fes_attributions): sin stake atribuido no hay
    // número, y el modelo de reactivación ya no participa de la métrica.
    const daysViewToStake = (p: { wallet: string }) => {
      const wallet = p.wallet.toLowerCase();
      const viewedAt = viewInfoByWallet.get(wallet);
      const stakeAt = stakedAtByWallet.get(wallet);
      if (!stakeAt || !viewedAt) return null;
      const d = (Date.parse(stakeAt) - Date.parse(viewedAt)) / 86400000;
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
      cohortDistribution: frozenDistribution,
      viewsByChannel,
      balanceByCohort,
      participants: frozen.map(p => {
        const w = p.wallet.toLowerCase();
        const viewedAt = viewInfoByWallet.get(w) ?? null;
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
          staked: stakedAtByWallet.has(w),
          stakedAt: stakedAtByWallet.get(w) ?? null,
          daysViewToStake: daysViewToStake(p),
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
        vip: cohortResult.summary.vip,
      },
      vip: cohortResult.vip.map(w => ({
        ...w,
        walletHash: walletHashService.hashWalletDeterministic(w.wallet).walletHash,
      })),
      messages: {
        control: { total: messages.control.length, sample: messages.control.slice(0, 2) },
        treatment: { total: messages.treatment.length, sample: messages.treatment.slice(0, 2) },
        vip: { total: messages.vip.length, sample: messages.vip.slice(0, 1) },
      },
      // ── Datos del piloto (spec oct-2026) ───────────────────────────────
      pilotMeta,
      frozenCohort,
      monitor,
      alerts,
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
          'La medición es Viewed (abrió /preview) → Staked (volvió a stakear). ' +
          'El modelo Contacted/Messages/Reactivated fue abandonado (oct-2026).',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch FES metrics', detail: error.message },
      { status: 500 }
    );
  }
}

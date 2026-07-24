import { NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';
import { cohortAssignmentService } from '@/lib/services/rootstock/cohort-assignment.service';
import { buildMessage } from '@/lib/services/rootstock/message-templates';
import { fesStorage } from '@/lib/services/rootstock/fes-storage.service';
import { yieldProjectionService } from '@/lib/services/rootstock/yield-projection.service';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';

function toDateStr(v: Date | string): string {
  if (typeof v === 'string') return v.split('T')[0];
  return v.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const inactive = await inactiveHolderService.findInactiveHolders();
    if (inactive.count === 0) {
      return NextResponse.json({
        count: 0,
        holders: [],
        cohorts: {
          A: { count: 0, avgBalance: 0, avgDaysInactive: 0, totalBalance: 0 },
          B: { count: 0, avgBalance: 0, avgDaysInactive: 0, totalBalance: 0 },
        },
        whales: [],
        messages: {
          control: { total: 0, sample: [] },
          treatment: { total: 0, sample: [] },
          vip: { total: 0, sample: [] },
        },
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

    return NextResponse.json({
      count: inactive.count,
      holders: holderDetails,
      cohorts: cohortResult.summary,
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
      metadata: {
        ...inactive.metadata,
        cohortStrategy: cohortResult.metadata.strategy,
        generatedAt: new Date().toISOString(),
        note: 'FES metrics — Internal use only. Wallets are hashed for privacy. Cohort A (control) receives informational message. Cohort B (treatment) receives personalized message with yield projection and builder recommendations.',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch FES metrics', detail: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { inactiveHolderService } from '@/lib/services/rootstock/inactive-holder.service';
import { cohortAssignmentService } from '@/lib/services/rootstock/cohort-assignment.service';
import { buildMessage } from '@/lib/services/rootstock/message-templates';
import { fesStorage } from '@/lib/services/rootstock/fes-storage.service';

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

    const msgCtx = (h: { wallet: string; balance: number; daysInactive: number; lastStakeActivity: Date | string }) => ({
      wallet: h.wallet,
      balance: h.balance,
      daysInactive: h.daysInactive,
      lastStakeActivity: toDateStr(h.lastStakeActivity),
    });

    const messages = {
      control: cohortResult.cohorts.A.map(h => buildMessage(msgCtx(h), 'control')),
      treatment: cohortResult.cohorts.B.map(h => buildMessage(msgCtx(h), 'treatment')),
      vip: cohortResult.whales.map(h => buildMessage(msgCtx(h), 'vip')),
    };

    const holderDetails = inactive.holders.map(h => {
      const all = [...cohortResult.cohorts.A, ...cohortResult.cohorts.B, ...cohortResult.whales];
      const assignment = all.find(a => a.wallet === h.wallet);
      return {
        wallet: h.wallet,
        balance: h.balance,
        daysInactive: h.daysInactive,
        lastStakeActivity: typeof h.lastStakeActivity === 'string' ? h.lastStakeActivity : h.lastStakeActivity.toISOString(),
        cohort: assignment?.cohort || null,
        message_variant: assignment?.cohort === 'A' ? 'control'
          : assignment?.cohort === 'B' ? 'treatment'
          : assignment?.cohort === 'WHALE' ? 'vip'
          : null,
      };
    });

    const reactivation = await fesStorage.getReactivationMetrics();

    return NextResponse.json({
      count: inactive.count,
      holders: holderDetails,
      cohorts: cohortResult.summary,
      whales: cohortResult.whales,
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
        note: 'MVP v1 — FES metrics based on Rewards Subgraph stakers only. Phase 2 will add Governance, Snapshot, RIF Transfer data. Whales (>1M RIF) excluded from A/B experiment.',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch FES metrics', detail: error.message },
      { status: 500 }
    );
  }
}

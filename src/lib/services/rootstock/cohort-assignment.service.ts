import { inactiveHolderService, type InactiveHolder } from './inactive-holder.service';

const WHALE_BALANCE_THRESHOLD = 1_000_000;

export type Cohort = 'A' | 'B' | 'WHALE';

export interface CohortAssignment {
  wallet: string;
  cohort: Cohort;
  balance: number;
  daysInactive: number;
  lastStakeActivity: Date;
}

export interface CohortSummary {
  count: number;
  avgBalance: number;
  avgDaysInactive: number;
  totalBalance: number;
}

export interface CohortResult {
  cohorts: {
    A: CohortAssignment[];
    B: CohortAssignment[];
  };
  whales: CohortAssignment[];
  summary: {
    total: number;
    mainPool: number;
    cohortA: CohortSummary;
    cohortB: CohortSummary;
    whales: CohortSummary;
  };
  metadata: {
    strategy: string;
    generatedAt: string;
  };
}

function summarize(group: CohortAssignment[]): CohortSummary {
  if (group.length === 0) {
    return { count: 0, avgBalance: 0, avgDaysInactive: 0, totalBalance: 0 };
  }
  const totalBal = group.reduce((s, a) => s + a.balance, 0);
  const totalDays = group.reduce((s, a) => s + a.daysInactive, 0);
  return {
    count: group.length,
    avgBalance: totalBal / group.length,
    avgDaysInactive: totalDays / group.length,
    totalBalance: totalBal,
  };
}

class CohortAssignmentService {
  assign(holders: InactiveHolder[]): CohortResult {
    const whales: CohortAssignment[] = [];
    const mainPool: InactiveHolder[] = [];

    for (const h of holders) {
      if (h.balance >= WHALE_BALANCE_THRESHOLD) {
        whales.push({ ...h, cohort: 'WHALE' });
      } else {
        mainPool.push(h);
      }
    }

    const sorted = [...mainPool].sort((a, b) => b.daysInactive - a.daysInactive);

    const assignments: CohortAssignment[] = sorted.map((h, i) => {
      const pairIdx = Math.floor(i / 2);
      const pos = i % 2;
      const cohort: Cohort = pairIdx % 2 === 0
        ? (pos === 0 ? 'A' : 'B')
        : (pos === 0 ? 'B' : 'A');
      return {
        wallet: h.wallet,
        cohort,
        balance: h.balance,
        daysInactive: h.daysInactive,
        lastStakeActivity: h.lastStakeActivity,
      };
    });

    const A = assignments.filter(a => a.cohort === 'A');
    const B = assignments.filter(a => a.cohort === 'B');

    return {
      cohorts: { A, B },
      whales,
      summary: {
        total: holders.length,
        mainPool: mainPool.length,
        cohortA: summarize(A),
        cohortB: summarize(B),
        whales: summarize(whales),
      },
      metadata: {
        strategy: 'Whales (>1M RIF) excluded to separate cohort. Main pool stratified by days inactive (descending), pair-based alternating (swap per pair).',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async getCohort(address: string): Promise<{ cohort: Cohort; assignment: CohortAssignment } | null> {
    const activity = await inactiveHolderService.getHolderActivity(address);
    if (!activity) return null;

    const holders = await inactiveHolderService.findInactiveHolders();
    if (holders.count === 0) return null;

    const result = this.assign(holders.holders);
    const all = [...result.cohorts.A, ...result.cohorts.B, ...result.whales];
    const found = all.find(a => a.wallet === address.toLowerCase());
    if (!found) return null;

    return { cohort: found.cohort, assignment: found };
  }
}

export const cohortAssignmentService = new CohortAssignmentService();

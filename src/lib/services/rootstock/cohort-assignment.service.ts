import type { InactiveHolder } from './inactive-holder.service';

/**
 * Umbral de la cohorte VIP: wallets con balance >= 1M RIF quedan fuera de la
 * pool principal y en su propia cohorte (A/B son el experimento principal).
 */
const VIP_BALANCE_THRESHOLD = 1_000_000;

/**
 * Cohorte del piloto FES.
 *
 * OJO: debe coincidir con el CHECK de `fes_participants.cohort`
 * ('A', 'B', 'VIP') y con el snapshot congelado publicado en IPFS. La etiqueta
 * 'WHALE' que se usaba en versiones anteriores rompía ese contrato (el INSERT
 * era rechazado por la constraint y el seed devolvía un éxito silencioso).
 */
export type Cohort = 'A' | 'B' | 'VIP';

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
  vip: CohortAssignment[];
  summary: {
    total: number;
    mainPool: number;
    cohortA: CohortSummary;
    cohortB: CohortSummary;
    vip: CohortSummary;
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
    const vip: CohortAssignment[] = [];
    const mainPool: InactiveHolder[] = [];

    for (const h of holders) {
      if (h.balance >= VIP_BALANCE_THRESHOLD) {
        vip.push({ ...h, cohort: 'VIP' });
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
      vip,
      summary: {
        total: holders.length,
        mainPool: mainPool.length,
        cohortA: summarize(A),
        cohortB: summarize(B),
        vip: summarize(vip),
      },
      metadata: {
        strategy: 'VIP (>1M RIF) excluded to separate cohort. Main pool stratified by days inactive (descending), pair-based alternating (swap per pair).',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Devuelve todas las asignaciones en una sola lista.
   *
   * NOTA: `assign()` es la asignación EN VIVO y solo sirve para el seed
   * (generación de la lista congelada) y para el dashboard interno. La cohorte
   * de cara al piloto se resuelve SIEMPRE desde `fes_participants`
   * (ver `fesStorage.getParticipant`); acá no existe ninguna asignación
   * individual alternativa para evitar que dos fuentes cuenten cosas distintas.
   */
  flatten(result: CohortResult): CohortAssignment[] {
    return [...result.cohorts.A, ...result.cohorts.B, ...result.vip];
  }
}

export const cohortAssignmentService = new CohortAssignmentService();

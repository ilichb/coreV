import { cohortAssignmentService, type Cohort } from '../cohort-assignment.service';
import type { InactiveHolder } from '../inactive-holder.service';

function holder(wallet: string, balance: number, daysInactive = 10): InactiveHolder {
  return {
    wallet,
    balance,
    daysInactive,
    lastStakeActivity: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('cohortAssignmentService (C2: etiquetas unificadas A/B/VIP)', () => {
  it('clasifica balance >= 1M como VIP, no como WHALE', () => {
    const result = cohortAssignmentService.assign([
      holder('0xaaa', 1_500_000),
      holder('0xbbb', 50_000),
    ]);

    expect(result.vip).toHaveLength(1);
    expect(result.vip[0].cohort).toBe('VIP');
    expect(result.cohorts.A).toHaveLength(1);
  });

  it('el umbral VIP es inclusivo en 1.000.000 RIF', () => {
    const result = cohortAssignmentService.assign([holder('0xaaa', 1_000_000)]);
    expect(result.vip.map(v => v.cohort)).toEqual(['VIP']);
  });

  it('NUNCA produce la etiqueta WHALE (rompería el CHECK de fes_participants)', () => {
    const result = cohortAssignmentService.assign([
      holder('0xwhale1', 5_000_000),
      holder('0xwhale2', 1_000_000),
      holder('0xsmall1', 100),
      holder('0xsmall2', 200),
    ]);

    const cohorts: Cohort[] = cohortAssignmentService
      .flatten(result)
      .map(a => a.cohort);

    expect(cohorts).not.toContain('WHALE');
    expect(new Set(cohorts)).toEqual(new Set(['A', 'B', 'VIP']));
  });

  it('la pool principal alterna A/B por pares de forma determinista', () => {
    const holders = [
      holder('0x1', 1_000, 30), // más inactivo → primero
      holder('0x2', 1_000, 20),
      holder('0x3', 1_000, 10),
      holder('0x4', 1_000, 5),
    ];

    const a = cohortAssignmentService.assign(holders);
    const b = cohortAssignmentService.assign(holders);

    // flatten agrupa por cohorte (A, luego B, luego VIP): se compara la
    // asignación wallet → cohorte, que es lo que debe ser estable.
    const map = (r: typeof a) =>
      Object.fromEntries(cohortAssignmentService.flatten(r).map(x => [x.wallet, x.cohort]));

    expect(map(a)).toEqual(map(b));
    // Par 0: (0x1,0x2) → A,B · Par 1: (0x3,0x4) → B,A
    expect(map(a)).toEqual({ '0x1': 'A', '0x2': 'B', '0x3': 'B', '0x4': 'A' });
  });

  it('flatten devuelve exactamente A + B + VIP, sin duplicados', () => {
    const result = cohortAssignmentService.assign([
      holder('0xvip', 2_000_000),
      holder('0xa', 100),
      holder('0xb', 200),
    ]);

    const all = cohortAssignmentService.flatten(result);
    expect(all).toHaveLength(3);
    expect(new Set(all.map(a => a.wallet)).size).toBe(3);
    expect(result.summary.total).toBe(3);
  });

  it('summary.vip refleja el total RIF de la cohorte VIP', () => {
    const result = cohortAssignmentService.assign([
      holder('0xvip1', 1_000_000),
      holder('0xvip2', 3_000_000),
    ]);

    expect(result.summary.vip.count).toBe(2);
    expect(result.summary.vip.totalBalance).toBe(4_000_000);
  });
});

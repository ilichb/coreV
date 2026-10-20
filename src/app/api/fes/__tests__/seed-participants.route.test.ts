/**
 * Tests del guard de congelamiento de /api/fes/seed-participants.
 *
 * La lista de cohortes es el treatment del experimento: si alguien vuelve a
 * correr el seed, las cohortes se re-asignan desde cero y el piloto pierde
 * su grupo de control. El guard debe impedirlo salvo con restore explícito.
 */
import { NextRequest } from 'next/server';

const countParticipants = jest.fn();
const batchUpsertParticipants = jest.fn();
const listParticipants = jest.fn();
const findInactiveHolders = jest.fn();

jest.mock('@/lib/services/rootstock/fes-storage.service', () => ({
  fesStorage: {
    countParticipants: (...a: unknown[]) => countParticipants(...a),
    batchUpsertParticipants: (...a: unknown[]) => batchUpsertParticipants(...a),
    listParticipants: (...a: unknown[]) => listParticipants(...a),
  },
}));

jest.mock('@/lib/services/rootstock/inactive-holder.service', () => ({
  inactiveHolderService: {
    findInactiveHolders: (...a: unknown[]) => findInactiveHolders(...a),
  },
}));

import { POST } from '../seed-participants/route';

function req(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/fes/seed-participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const DETECTION = {
  count: 2,
  holders: [
    { wallet: '0xaaa', balance: 100, daysInactive: 30, lastStakeActivity: new Date('2026-01-01') },
    { wallet: '0xbbb', balance: 50_000, daysInactive: 10, lastStakeActivity: new Date('2026-01-02') },
  ],
  metadata: { source: 'test', cutoffDate: '2026-01-01', minBalanceRIF: 10, minDaysInactive: 7, platform: 'rsk' },
};

beforeEach(() => {
  jest.clearAllMocks();
  findInactiveHolders.mockResolvedValue(DETECTION);
});

describe('POST /api/fes/seed-participants — guard de congelamiento', () => {
  it('rechaza re-seed (commit) sobre una lista ya congelada con 409', async () => {
    countParticipants.mockResolvedValue(18);

    const res = await POST(req({ commit: true }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('Frozen list');
    expect(data.existingParticipants).toBe(18);
    expect(batchUpsertParticipants).not.toHaveBeenCalled();
    // ni siquiera gasta la detección (subgraph + RPC) en un rechazo
    expect(findInactiveHolders).not.toHaveBeenCalled();
  });

  it('permite el re-seed con restore explícito', async () => {
    countParticipants.mockResolvedValue(18);
    batchUpsertParticipants.mockResolvedValue(undefined);
    listParticipants.mockResolvedValue(DETECTION.holders.map(h => ({ wallet: h.wallet })));

    const res = await POST(req({ commit: true, restore: true }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.restored).toBe(true);
    expect(batchUpsertParticipants).toHaveBeenCalledTimes(1);
  });

  it('el primer seed (tabla vacía) no necesita restore', async () => {
    countParticipants.mockResolvedValue(0);
    batchUpsertParticipants.mockResolvedValue(undefined);
    listParticipants.mockResolvedValue(DETECTION.holders.map(h => ({ wallet: h.wallet })));

    const res = await POST(req({ commit: true }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.restored).toBe(false);
    expect(data.seeded).toBe(2);
    // solo etiquetas válidas para el CHECK de la tabla
    const cohorts = batchUpsertParticipants.mock.calls[0][0].map((r: any) => r.cohort);
    expect(cohorts.every((c: string) => ['A', 'B', 'VIP'].includes(c))).toBe(true);
  });

  it('dry-run sobre lista congelada informa el guard sin escribir', async () => {
    countParticipants.mockResolvedValue(18);

    const res = await POST(req({}));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(true);
    expect(data.frozenListSize).toBe(18);
    expect(data.hint).toMatch(/restore/);
    expect(batchUpsertParticipants).not.toHaveBeenCalled();
  });
});

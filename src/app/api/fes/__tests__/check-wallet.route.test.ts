/**
 * Tests del endpoint público /api/fes/check-wallet (C1).
 *
 * Blindan dos invariantes:
 *  1. La cohorte sale SIEMPRE de la lista congelada `fes_participants`
 *     (nunca de una asignación en vivo): una wallet fuera de la lista recibe
 *     "not in pilot" y no se le asigna cohorte.
 *  2. Cada consulta rate-limitea por IP.
 */
import { NextRequest } from 'next/server';

process.env.FES_WALLET_HASH_SALT = 'test-salt-0123456789abcdef';

const getParticipant = jest.fn();
const recordView = jest.fn();
const logView = jest.fn().mockResolvedValue(undefined);
const calculate = jest.fn().mockResolvedValue({
  projectedYieldRIF: 123.45,
  aprUsed: 4.5,
  recommendedBuilders: [],
});

jest.mock('@/lib/services/rootstock/fes-storage.service', () => ({
  fesStorage: {
    getParticipant: (...args: unknown[]) => getParticipant(...args),
    recordView: (...args: unknown[]) => recordView(...args),
  },
}));

jest.mock('@/lib/services/rootstock/yield-projection.service', () => ({
  yieldProjectionService: {
    calculate: (...args: unknown[]) => calculate(...args),
  },
}));

jest.mock('@/lib/services/rootstock/fes-view-logger.service', () => ({
  fesViewLogger: {
    logView: (...args: unknown[]) => logView(...args),
  },
}));

import { POST } from '../check-wallet/route';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';

const PARTICIPANT = {
  wallet: '0x1111111111111111111111111111111111111111',
  cohort: 'VIP' as const,
  message_variant: 'vip' as const,
  balance_at_detection: 2_500_000,
  days_inactive_at_detection: 42,
  // unix seconds de la última actividad de staking
  last_block_at_detection: 1_759_000_000,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

function req(body: Record<string, unknown>, ip = '203.0.113.1'): NextRequest {
  return new NextRequest('http://localhost/api/fes/check-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  recordView.mockResolvedValue(undefined);
});

describe('POST /api/fes/check-wallet — cohorte congelada (C1)', () => {
  it('wallet NO presente en fes_participants → "not in pilot", sin cohorte', async () => {
    getParticipant.mockResolvedValue(null);

    const res = await POST(req({ wallet: '0x2222222222222222222222222222222222222222' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.found).toBe(false);
    expect(data.inPilot).toBe(false);
    expect(data.cohort).toBeUndefined();
    expect(data.message).toMatch(/not part of the FES pilot/i);
    // una consulta que no es del piloto NO genera vista
    expect(recordView).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });

  it('wallet presente → cohorte y variante salen de la fila congelada', async () => {
    getParticipant.mockResolvedValue(PARTICIPANT);

    const res = await POST(req({ wallet: PARTICIPANT.wallet, src: 'forum', referrer: 'https://forum.rootstock.io/t/x' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.found).toBe(true);
    expect(data.inPilot).toBe(true);
    expect(data.cohort).toBe('VIP');
    expect(data.balance).toBe(2_500_000);
    expect(data.daysInactive).toBe(42);
    expect(data.message.variant).toBe('vip');
    expect(data.viewLogged).toBe(true);

    // la proyección usa los datos congelados, no una lectura en vivo
    expect(calculate).toHaveBeenCalledWith(2_500_000, 42);

    // la vista se registra en fes_views con walletHash DETERMINISTA (v3):
    // el join con fes_attributions es por hash, nunca por address cruda
    expect(recordView).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet_hash: walletHashService.hashWalletDeterministic(PARTICIPANT.wallet).walletHash,
        cohort: 'VIP',
        channel: 'forum',
        referrer: 'https://forum.rootstock.io/t/x',
      })
    );
    // la address cruda no viaja en la fila de la vista
    expect(JSON.stringify(recordView.mock.calls[0][0])).not.toContain(PARTICIPANT.wallet);
  });

  it('la wallet de la respuesta va hasheada y el hash es determinista entre consultas', async () => {
    getParticipant.mockResolvedValue(PARTICIPANT);

    const first = await (await POST(req({ wallet: PARTICIPANT.wallet }))).json();
    const second = await (await POST(req({ wallet: PARTICIPANT.wallet }))).json();

    expect(first.wallet).toBe(walletHashService.hashWalletDeterministic(PARTICIPANT.wallet).walletHash);
    expect(first.wallet).toBe(second.wallet);
    // nunca devuelve la address cruda
    expect(first.wallet).not.toContain(PARTICIPANT.wallet);
  });

  it('rechaza addresses mal formadas con 400', async () => {
    const res = await POST(req({ wallet: 'no-es-una-wallet' }));
    expect(res.status).toBe(400);
  });

  it('devuelve 429 cuando una sola IP supera la cuota', async () => {
    getParticipant.mockResolvedValue(PARTICIPANT);
    const ip = '198.51.100.7';

    let last: Response | undefined;
    for (let i = 0; i < 40; i++) {
      last = await POST(req({ wallet: PARTICIPANT.wallet }, ip));
      if (last.status === 429) break;
    }

    expect(last!.status).toBe(429);
    expect(last!.headers.get('Retry-After')).toBeTruthy();
  });
});

/**
 * Tests del FES attribution monitor.
 *
 * Cubren la clasificación on-chain verificada (stake = Transfer al proxy en
 * una tx depositAndDelegate; unstake = Transfer desde el proxy en una tx
 * withdrawTo), la ventana de atribución y el comportamiento ante fallos
 * (antes devolvía [] silencioso y avanzaba el cursor igual).
 */

const PROXY = '0x5db91e24bd32059584bbdb831a901f1199f3d459';
const RIF = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const PILOT_WALLET = '0x1111111111111111111111111111111111111111';
const OUTSIDER = '0x9999999999999999999999999999999999999999';

// ── Dobles ─────────────────────────────────────────────────────────────────
const listParticipants = jest.fn();
const getParticipant = jest.fn();
const getEvents = jest.fn();
const insertStakeEvents = jest.fn();
const recordEvent = jest.fn();
const markStakeEventAttributed = jest.fn();
const updateParticipantField = jest.fn();
const getMonitorState = jest.fn();
const setMonitorState = jest.fn();
const rpcCall = jest.fn();
const fetchMock = jest.fn();

jest.mock('@/lib/services/rootstock/fes-storage.service', () => ({
  fesStorage: {
    listParticipants: (...a: unknown[]) => listParticipants(...a),
    getParticipant: (...a: unknown[]) => getParticipant(...a),
    getEvents: (...a: unknown[]) => getEvents(...a),
    insertStakeEvents: (...a: unknown[]) => insertStakeEvents(...a),
    recordEvent: (...a: unknown[]) => recordEvent(...a),
    markStakeEventAttributed: (...a: unknown[]) => markStakeEventAttributed(...a),
    updateParticipantField: (...a: unknown[]) => updateParticipantField(...a),
    getMonitorState: (...a: unknown[]) => getMonitorState(...a),
    setMonitorState: (...a: unknown[]) => setMonitorState(...a),
  },
}));

jest.mock('@/lib/infrastructure/clients/rpc-balancer', () => ({
  rpcBalancer: { call: (...a: unknown[]) => rpcCall(...a) },
}));

const NOW_BLOCK = 9_400_000;

/** Carga el módulo con el entorno ya seteado (las constantes se leen al importar). */
function loadMonitor() {
  let mod: typeof import('../fes-attribution-monitor.service');
  jest.isolateModules(() => {
    mod = require('../fes-attribution-monitor.service');
  });
  return mod!.fesAttributionMonitor;
}

type TopicAddr = string;
const addrTopic = (a: string) => '0x' + a.replace(/^0x/, '').toLowerCase().padStart(64, '0');

function transferLog(opts: {
  from: string;
  to: string;
  txHash: string;
  logIndex: number;
  amount: string;
  blockNumber: number;
}) {
  return {
    address: RIF,
    topics: [TRANSFER_TOPIC, addrTopic(opts.from), addrTopic(opts.to)],
    data: '0x' + BigInt(opts.amount).toString(16).padStart(64, '0'),
    blockNumber: '0x' + opts.blockNumber.toString(16),
    transactionHash: opts.txHash,
    logIndex: '0x' + opts.logIndex.toString(16),
  };
}

/** Responde a fetch (Blockscout), rpcCall y storage según el escenario. */
function setupChain(opts: {
  logs: unknown[];
  inputs: Record<string, string>;
  blockTimestamps?: Record<number, string>;
}) {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ status: '1', message: 'OK', result: opts.logs }),
  });

  rpcCall.mockImplementation(async ({ method, params }: any) => {
    if (method === 'eth_blockNumber') return '0x' + NOW_BLOCK.toString(16);
    if (method === 'eth_getTransactionByHash') {
      return { input: opts.inputs[String(params[0]).toLowerCase()] ?? '0x' };
    }
    if (method === 'eth_getBlockByNumber') {
      const block = parseInt(String(params[0]), 16);
      const ts = opts.blockTimestamps?.[block] ?? '2026-10-20T12:00:00Z';
      return { timestamp: '0x' + Math.floor(Date.parse(ts) / 1000).toString(16) };
    }
    throw new Error(`método inesperado: ${method}`);
  });
}

const FROZEN = {
  wallet: PILOT_WALLET,
  cohort: 'B' as const,
  message_variant: 'treatment' as const,
  reactivated: false,
  reactivated_at: null,
  last_block_checkpoint: null,
  last_block_current: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STAKING_CONTRACT_ADDRESS = PROXY;
  process.env.RIF_TOKEN_ADDRESS = RIF;

  listParticipants.mockResolvedValue([FROZEN]);
  getParticipant.mockResolvedValue(FROZEN);
  getEvents.mockResolvedValue([]);
  insertStakeEvents.mockResolvedValue(1);
  recordEvent.mockResolvedValue(undefined);
  markStakeEventAttributed.mockResolvedValue(undefined);
  updateParticipantField.mockResolvedValue(undefined);
  getMonitorState.mockResolvedValue(null); // primer escaneo
  setMonitorState.mockResolvedValue(undefined);
});

describe('fes-attribution-monitor — clasificación on-chain', () => {
  it('marca stake: Transfer al proxy en una tx depositAndDelegate', async () => {
    setupChain({
      logs: [transferLog({
        from: PILOT_WALLET, to: PROXY, txHash: '0xaaa', logIndex: 1,
        amount: (5_000n * 10n ** 18n).toString(), blockNumber: NOW_BLOCK - 5,
      })],
      inputs: { '0xaaa': '0xfbde32f8d21f559f' }, // depositAndDelegate(...)
    });

    const result = await loadMonitor().runCheck();

    expect(result.stakeEvents).toBe(1);
    expect(result.unstakeEvents).toBe(0);
    expect(insertStakeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        wallet: PILOT_WALLET,
        event_type: 'stake',
        tx_hash: '0xaaa',
        log_index: 1,
        amount_rif: 5_000,
      }),
    ]);
  });

  it('marca unstake: Transfer desde el proxy en una tx withdrawTo', async () => {
    setupChain({
      logs: [transferLog({
        from: PROXY, to: PILOT_WALLET, txHash: '0xbbb', logIndex: 0,
        amount: (100n * 10n ** 18n).toString(), blockNumber: NOW_BLOCK - 3,
      })],
      inputs: { '0xbbb': '0x205c2878e2b9718d' }, // withdrawTo(...)
    });

    const result = await loadMonitor().runCheck();

    expect(result.unstakeEvents).toBe(1);
    expect(result.stakeEvents).toBe(0);
    expect(insertStakeEvents).toHaveBeenCalledWith([
      expect.objectContaining({ event_type: 'unstake', wallet: PILOT_WALLET }),
    ]);
  });

  it('IGNORA un transfer simple al proxy sin depositAndDelegate (regresión: el monitor viejo contaba cualquier Transfer)', async () => {
    setupChain({
      logs: [transferLog({
        from: PILOT_WALLET, to: PROXY, txHash: '0xccc', logIndex: 0,
        amount: (10n * 10n ** 18n).toString(), blockNumber: NOW_BLOCK - 1,
      })],
      inputs: { '0xccc': '0xa9059cbb' }, // transfer(address,uint256) normal
    });

    const result = await loadMonitor().runCheck();

    expect(result.stakeEvents).toBe(0);
    expect(insertStakeEvents).toHaveBeenCalledWith([]);
  });

  it('ignora wallets fuera de la cohorte congelada', async () => {
    setupChain({
      logs: [transferLog({
        from: OUTSIDER, to: PROXY, txHash: '0xddd', logIndex: 0,
        amount: (10n * 10n ** 18n).toString(), blockNumber: NOW_BLOCK - 1,
      })],
      inputs: { '0xddd': '0xfbde32f8d21f559f' },
    });

    const result = await loadMonitor().runCheck();

    expect(result.stakeEvents).toBe(0);
    expect(insertStakeEvents).toHaveBeenCalledWith([]);
  });
});

describe('fes-attribution-monitor — atribución', () => {
  const stakeLog = (blockNumber: number, blockIso: string) => ({
    logs: [transferLog({
      from: PILOT_WALLET, to: PROXY, txHash: '0xeee', logIndex: 2,
      amount: (2_000n * 10n ** 18n).toString(), blockNumber,
    })],
    inputs: { '0xeee': '0xfbde32f8d21f559f' },
    blockTimestamps: { [blockNumber]: blockIso },
  });

  it('atribuye cuando hubo vista PREVIA y el stake queda en la ventana', async () => {
    setupChain(stakeLog(NOW_BLOCK - 10, '2026-10-20T12:00:00Z'));
    getEvents.mockImplementation(async (wallet: string, type: string) => {
      if (type === 'preview_view') return [{ wallet, event_type: type, created_at: '2026-10-19T10:00:00Z' }];
      return [];
    });

    const result = await loadMonitor().runCheck();

    expect(result.newAttributions).toBe(1);
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: PILOT_WALLET,
        event_type: 'attributed_stake',
        payload: expect.objectContaining({ txHash: '0xeee', daysToStake: 1.1 }),
      })
    );
    expect(markStakeEventAttributed).toHaveBeenCalledWith('0xeee', 2, 1.1);
    expect(updateParticipantField).toHaveBeenCalledWith(
      PILOT_WALLET,
      expect.objectContaining({ reactivated: true })
    );
  });

  it('NO atribuye si la wallet nunca vio /preview', async () => {
    setupChain(stakeLog(NOW_BLOCK - 10, '2026-10-20T12:00:00Z'));
    getEvents.mockResolvedValue([]);

    const result = await loadMonitor().runCheck();

    expect(result.newAttributions).toBe(0);
    expect(recordEvent).not.toHaveBeenCalled();
    expect(markStakeEventAttributed).not.toHaveBeenCalled();
    // el evento on-chain igual se registra (es actividad real del piloto)
    expect(result.newEvents).toBe(1);
  });

  it('NO atribuye si el stake es PREVIO a la vista', async () => {
    setupChain(stakeLog(NOW_BLOCK - 10, '2026-10-18T12:00:00Z'));
    getEvents.mockImplementation(async (wallet: string, type: string) => {
      if (type === 'preview_view') return [{ wallet, event_type: type, created_at: '2026-10-19T10:00:00Z' }];
      return [];
    });

    const result = await loadMonitor().runCheck();

    expect(result.newAttributions).toBe(0);
  });

  it('la atribución usa el PRIMER evento de vista (no el más reciente)', async () => {
    setupChain(stakeLog(NOW_BLOCK - 10, '2026-10-20T12:00:00Z'));
    getEvents.mockImplementation(async (wallet: string, type: string) => {
      if (type === 'preview_view') {
        return [
          { wallet, event_type: type, created_at: '2026-10-19T10:00:00Z' },
          { wallet, event_type: type, created_at: '2026-10-20T11:59:00Z' }, // desordenado
        ];
      }
      return [];
    });

    await loadMonitor().runCheck();

    const payload = recordEvent.mock.calls[0][0].payload;
    expect(payload.viewedAt).toBe('2026-10-19T10:00:00Z');
  });
});

describe('fes-attribution-monitor — robustez', () => {
  it('falla ruidosamente si falta STAKING_CONTRACT_ADDRESS (antes: dirección inventada + [])', async () => {
    process.env.STAKING_CONTRACT_ADDRESS = '';
    setupChain({ logs: [], inputs: {} });

    await expect(loadMonitor().runCheck()).rejects.toThrow(/STAKING_CONTRACT_ADDRESS/);
  });

  it('NO avanza el cursor si Blockscout falla', async () => {
    // sin backoff para que el test no espere los reintentos reales
    process.env.FES_LOG_RETRY_BASE_DELAY_MS = '0';
    setupChain({ logs: [], inputs: {} });
    fetchMock.mockResolvedValue({ ok: false, status: 502 });

    await expect(loadMonitor().runCheck()).rejects.toThrow(/HTTP 502/);
    expect(setMonitorState).not.toHaveBeenCalled();
    expect(insertStakeEvents).not.toHaveBeenCalled();
    // reintenta antes de rendirse (no es un fallo de un solo intento)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('NO avanza el cursor si falla la lectura de timestamp de bloque', async () => {
    setupChain({
      logs: [transferLog({
        from: PILOT_WALLET, to: PROXY, txHash: '0xfff', logIndex: 0,
        amount: (1n * 10n ** 18n).toString(), blockNumber: NOW_BLOCK - 2,
      })],
      inputs: { '0xfff': '0xfbde32f8d21f559f' },
      blockTimestamps: {},
    });
    // Fuerza el fallo devolviendo timestamp inválido
    rpcCall.mockImplementation(async ({ method, params }: any) => {
      if (method === 'eth_blockNumber') return '0x' + NOW_BLOCK.toString(16);
      if (method === 'eth_getTransactionByHash') return { input: '0xfbde32f8d21f559f' };
      if (method === 'eth_getBlockByNumber') return { timestamp: undefined };
      throw new Error(`método inesperado: ${method}`);
    });

    await expect(loadMonitor().runCheck()).rejects.toThrow(/timestamp/);
    expect(setMonitorState).not.toHaveBeenCalled();
  });

  it('retoma desde el checkpoint guardado (no rescanea desde cero)', async () => {
    getMonitorState.mockResolvedValue(String(NOW_BLOCK - 100));
    setupChain({ logs: [], inputs: {} });

    const result = await loadMonitor().runCheck();

    expect(result.fromBlock).toBe(NOW_BLOCK - 99);
    expect(setMonitorState).toHaveBeenCalledWith('attribution_last_scanned_block', String(NOW_BLOCK));
  });

  it('sin cohorte congelada no escanea ni guarda checkpoint', async () => {
    listParticipants.mockResolvedValue([]);
    setupChain({ logs: [], inputs: {} });

    const result = await loadMonitor().runCheck();

    expect(result.transfersScanned).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * FES Attribution Monitor — detección on-chain de stakes del piloto.
 *
 * ── Qué se verificó en la blockchain (y por qué este archivo se reescribió) ──
 *
 * 1. El contrato de staking NO emite un evento `Staked`. La ABI publicada de
 *    StRIFTokenV02 (implementación 0xC92B149fCDcf176D7e7A41eb51f56668B7BABe03,
 *    proxy EIP-1967 0x5Db91E24BD32059584bbdB831a901F1199f3D459) tiene 10
 *    eventos y ninguno se llama Staked. El monitor anterior buscaba un topic0
 *    inventado (`STAKED_EVENT_SIG`) contra una dirección por defecto que ni
 *    siquiera es la del contrato: `eth_getLogs` devolvía [] o error, el catch
 *    lo convertía en [] silencioso, y "Staked" quedaba en 0 para siempre.
 *
 * 2. Un stake real es: Transfer de RIF (0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5)
 *    HACIA el proxy de staking, en una transacción cuyo input empieza con
 *    `depositAndDelegate(address,uint256)` = 0xfbde32f8.
 *    Un unstake es: Transfer de RIF DESDE el proxy, en una transacción cuyo
 *    input empieza con `withdrawTo(address,uint256)` = 0x205c2878.
 *    Verificado tx por tx (receipt + input) contra dos fixtures reales:
 *      stake cohorte B 0x88e85d2dd8ff040c13de41c3f320f1efc180c709ce725d28064937fc386510ba
 *      stake cohorte A 0x2945dfbc8a15aabc3845e39cd1f14194673fcecd5a75a48a213df0652339a8c8
 *
 * 3. Los RPC públicos de Rootstock (sovryn.app y rskj) rechazan `eth_getLogs`
 *    con "exceed maximum block range". Los logs se leen por la API pública de
 *    Blockscout; el número/timestamp de bloque sí se puede pedir por RPC.
 *
 * ── Reglas del experimento que implementa ──────────────────────────────────
 *   * Solo interesan las 18 wallets de la cohorte CONGELADA (fes_participants).
 *   * Atribución = stake de una wallet del piloto que además tiene un
 *     evento `preview_view` PREVIO en fes_events (la vista inicia el
 *     recorrido) y dentro de la ventana del piloto.
 *   * El cursor de escaneo vive en Supabase (fes_monitor_state), no en Redis:
 *     con TTL de 24h el escaneo se reiniciaba y perdía eventos.
 *   * Un fallo de lectura NO avanza el cursor y NO se traga: se propaga para
 *     que el cron reporte el error. El modo anterior devolvía [] y reportaba
 *     éxito con cero eventos, que es indistinguible de "no pasó nada".
 */

import { rpcBalancer } from '@/lib/infrastructure/clients/rpc-balancer';
import { fesStorage, type FESStakeEvent } from '@/lib/services/rootstock/fes-storage.service';
import { walletHashService } from '@/lib/services/security/wallet-hash.service';
import { logger } from '@/lib/utils/logger';

// ── Constantes verificadas on-chain ────────────────────────────────────────

/** Token RIF en Rootstock (verificado contra el subgraph y Blockscout). */
const RIF_TOKEN = (process.env.RIF_TOKEN_ADDRESS || '0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5').toLowerCase();

/**
 * Proxy de staking (StRIFTokenV02, EIP-1967). Sin este dato el monitor no
 * puede clasificar stakes: mejor fallar explícitamente que inventar una
 * dirección (era exactamente el defecto del monitor anterior).
 */
const STAKING_PROXY = (process.env.STAKING_CONTRACT_ADDRESS || '').toLowerCase();

/** Transfer(address indexed,address indexed,uint256) */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
/** depositAndDelegate(address,uint256) */
const DEPOSIT_AND_DELEGATE_SELECTOR = '0xfbde32f8';
/** withdrawTo(address,uint256) */
const WITHDRAW_TO_SELECTOR = '0x205c2878';

const BLOCKSCOUT_API = (process.env.BLOCKSCOUT_API_URL || 'https://rootstock.blockscout.com').replace(/\/$/, '');

/** Rango por petición a Blockscout (los endpoints públicos limitan el rango). */
const LOG_SCAN_CHUNK = 2_000;
/** Límite de logs por respuesta; si se llena, el rango se subdivide. */
const LOG_HARD_LIMIT = 1_000;
/** Reintentos por petición de logs. */
const LOG_FETCH_RETRIES = 3;
/** Backoff base entre reintentos (ms). Ajustable para tests. */
const LOG_RETRY_BASE_DELAY_MS = Number(process.env.FES_LOG_RETRY_BASE_DELAY_MS ?? 1_000);

const CHECKPOINT_KEY = 'attribution_last_scanned_block';

// ── Ancla del rango inicial ────────────────────────────────────────────────
// Sin checkpoint previo hay que decidir desde dónde escanear. El ancla es un
// bloque real verificado; se extrapola al inicio de la ventana del piloto con
// la cadencia media de Rootstock (~30 s/bloque). El desfase de unas horas no
// afecta a la corrección: la atribución se valida además por timestamp
// (stake posterior a la vista y dentro de la ventana), el rango es solo un
// atajo de escaneo.
const BLOCK_ANCHOR_NUMBER = 9_299_400;
const BLOCK_ANCHOR_TIME_MS = Date.parse('2026-10-05T00:00:00Z');
const AVG_BLOCK_MS = 30_000;

/** Inicio de la ventana del piloto (mismo valor que /api/fes/metrics). */
const PILOT_WINDOW_START_MS = Date.parse('2026-10-14T08:45:00Z');
const PILOT_WINDOW_DAYS = 28;

function pilotWindowEndMs(): number {
  return PILOT_WINDOW_START_MS + PILOT_WINDOW_DAYS * 86_400_000;
}

function defaultStartBlock(): number {
  const blocks = Math.floor((PILOT_WINDOW_START_MS - BLOCK_ANCHOR_TIME_MS) / AVG_BLOCK_MS);
  return Math.max(0, BLOCK_ANCHOR_NUMBER + blocks);
}

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ChainStakeEvent {
  wallet: string;
  type: 'stake' | 'unstake';
  txHash: string;
  logIndex: number;
  amountWei: string;
  blockNumber: number;
  blockTimestamp: string; // ISO
}

export interface Attribution {
  walletHash: string;
  cohort: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  amount: string; // wei
  amountRif: number;
  viewedAt: string;
  stakedAt: string;
  daysToStake: number;
}

export interface MonitorCheckResult {
  fromBlock: number;
  toBlock: number;
  transfersScanned: number;
  stakeEvents: number;
  unstakeEvents: number;
  newEvents: number;
  newAttributions: number;
  participantsUpdated: number;
  checkpointSaved: number;
  checkedAt: string;
}

export interface AttributionSummary {
  totalAttributions: number;
  byCohort: Record<string, number>;
  totalVolumeRIF: number;
  volumeByCohort: Record<string, number>;
  avgDaysToStake: number | null;
  lastCheckedBlock: number;
  checkedAt: string;
}

// ── Cliente Blockscout ─────────────────────────────────────────────────────

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

async function blockscoutLogs(params: Record<string, string>, signal?: AbortSignal): Promise<RawLog[]> {
  const qs = new URLSearchParams({ module: 'logs', action: 'getLogs', ...params });
  const res = await fetch(`${BLOCKSCOUT_API}/api?${qs.toString()}`, {
    headers: { accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Blockscout getLogs → HTTP ${res.status}`);
  }
  const json = await res.json();
  // Blockscout responde { status, message, result } en el endpoint legacy.
  if (json?.result === 'Too many results' || json?.status === '0') {
    throw new Error(`Blockscout getLogs → ${json?.message || 'error'}: ${String(json?.result).slice(0, 120)}`);
  }
  if (!Array.isArray(json?.result)) {
    throw new Error('Blockscout getLogs → respuesta inesperada (sin array result)');
  }
  return json.result as RawLog[];
}

async function blockscoutLogsWithRetry(params: Record<string, string>): Promise<RawLog[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= LOG_FETCH_RETRIES; attempt++) {
    try {
      return await blockscoutLogs(params);
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, attempt * LOG_RETRY_BASE_DELAY_MS));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Escanea Transfers de RIF en un rango, sub-dividiendo si el límite del
 * endpoint se alcanza. Un fallo acá se PROPAGA (nunca se convierte en []).
 */
async function scanTransfers(fromBlock: number, toBlock: number): Promise<RawLog[]> {
  if (toBlock < fromBlock) return [];

  const logs = await blockscoutLogsWithRetry({
    fromBlock: String(fromBlock),
    toBlock: String(toBlock),
    address: RIF_TOKEN,
    topic0: TRANSFER_TOPIC,
  });

  if (logs.length >= LOG_HARD_LIMIT && toBlock > fromBlock) {
    const mid = Math.floor((fromBlock + toBlock) / 2);
    logger.warn(`[FES Attribution] rango ${fromBlock}-${toBlock} lleno (${logs.length} logs); subdividiendo`);
    const left = await scanTransfers(fromBlock, mid);
    const right = await scanTransfers(mid + 1, toBlock);
    return [...left, ...right];
  }

  return logs;
}

function toTopicAddress(topic: string): string {
  return `0x${topic.slice(26)}`.toLowerCase();
}

// ── Servicio ───────────────────────────────────────────────────────────────

class FESAttributionMonitorService {
  /**
   * Ejecuta un ciclo de escaneo y atribución.
   * Lanza error si algo falla: el caller (cron) debe poder distinguir
   * "cero actividad" de "no pude leer la cadena".
   */
  async runCheck(): Promise<MonitorCheckResult> {
    if (!STAKING_PROXY) {
      throw new Error(
        'STAKING_CONTRACT_ADDRESS no está configurada. Sin el proxy de staking no hay ' +
        'forma de clasificar stakes/unstakes (el monitor anterior fallaba en silencio ' +
        'con una dirección inventada). Configurarla y re-ejecutar.'
      );
    }

    const participants = await fesStorage.listParticipants();
    if (participants.length === 0) {
      logger.info('[FES Attribution] sin cohorte congelada (fes_participants vacía); nada que escanear');
      return this.emptyResult(0);
    }
    const pilotWallets = new Set(participants.map(p => p.wallet.toLowerCase()));

    const toBlock = await this.currentBlock();
    const stored = await fesStorage.getMonitorState(CHECKPOINT_KEY);
    const fromBlock = stored ? Number(stored) + 1 : defaultStartBlock();

    if (fromBlock > toBlock) {
      return this.emptyResult(toBlock);
    }

    const rawLogs = await scanTransfers(fromBlock, toBlock);

    // Clasificar: solo los Transfers que involucran al proxy Y cuya
    // transacción llama al método correspondiente.
    const txInputs = await this.txInputs(rawLogs);
    const events: ChainStakeEvent[] = [];

    for (const log of rawLogs) {
      if (String(log.address).toLowerCase() !== RIF_TOKEN) continue;
      if (log.topics?.[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;

      const from = toTopicAddress(log.topics[1]);
      const to = toTopicAddress(log.topics[2]);
      const input = txInputs.get(log.transactionHash.toLowerCase());
      if (!input) continue;

      const blockNumber = parseInt(log.blockNumber, 16);
      const logIndex = parseInt(log.logIndex, 16);

      let wallet: string | null = null;
      let type: 'stake' | 'unstake' | null = null;

      if (to === STAKING_PROXY && input.startsWith(DEPOSIT_AND_DELEGATE_SELECTOR)) {
        wallet = from;
        type = 'stake';
      } else if (from === STAKING_PROXY && input.startsWith(WITHDRAW_TO_SELECTOR)) {
        wallet = to;
        type = 'unstake';
      }

      if (!wallet || !type) continue;
      if (!pilotWallets.has(wallet)) continue; // solo la cohorte congelada

      events.push({
        wallet,
        type,
        txHash: log.transactionHash.toLowerCase(),
        logIndex,
        amountWei: BigInt(log.data).toString(),
        blockNumber,
        blockTimestamp: new Date(0).toISOString(), // se completa abajo
      });
    }

    // Timestamps de bloque solo para los eventos que interesan (pocos).
    const timestamps = await this.blockTimestamps([...new Set(events.map(e => e.blockNumber))]);
    for (const e of events) {
      const ts = timestamps.get(e.blockNumber);
      if (!ts) {
        throw new Error(`No se pudo leer el timestamp del bloque ${e.blockNumber}`);
      }
      e.blockTimestamp = ts;
    }

    // Persistir (dedupe por UNIQUE(tx_hash, log_index)).
    const newEvents = await fesStorage.insertStakeEvents(
      events.map(e => ({
        wallet: e.wallet,
        event_type: e.type,
        tx_hash: e.txHash,
        log_index: e.logIndex,
        amount_wei: e.amountWei,
        amount_rif: Number(e.amountWei) / 1e18,
        block_number: e.blockNumber,
        block_timestamp: e.blockTimestamp,
        attributed: false,
        days_view_to_stake: null,
      }))
    );

    // Atribución: stake de una wallet del piloto con vista previa en /preview.
    const windowEndMs = pilotWindowEndMs();
    const newAttributions = await this.attribute(events, windowEndMs);

    // Actualizar flags de participantes (contralibre del dashboard).
    const participantsUpdated = await this.updateParticipants(events);

    // El cursor SOLO avanza si todo lo anterior salió bien.
    await fesStorage.setMonitorState(CHECKPOINT_KEY, String(toBlock));

    const result: MonitorCheckResult = {
      fromBlock,
      toBlock,
      transfersScanned: rawLogs.length,
      stakeEvents: events.filter(e => e.type === 'stake').length,
      unstakeEvents: events.filter(e => e.type === 'unstake').length,
      newEvents,
      newAttributions,
      participantsUpdated,
      checkpointSaved: toBlock,
      checkedAt: new Date().toISOString(),
    };

    logger.info(
      `[FES Attribution] check ${fromBlock}-${toBlock}: ${result.stakeEvents} stakes, ` +
      `${result.unstakeEvents} unstakes, ${newEvents} nuevos, ${newAttributions} atribuidos`
    );

    return result;
  }

  /**
   * Atribuye stakes con vista previa. Devuelve la cantidad de atribuciones
   * nuevas (por debajo, escribe el evento `attributed_stake` y marca el
   * evento de cadena como atribuido).
   */
  private async attribute(events: ChainStakeEvent[], windowEndMs: number): Promise<number> {
    const stakes = events.filter(e => e.type === 'stake');
    if (stakes.length === 0) return 0;

    let attributed = 0;
    for (const stake of stakes) {
      // Primera vista de /preview de esa wallet (fes_events, wallet cruda).
      const views = await fesStorage.getEvents(stake.wallet, 'preview_view', 50);
      const firstView = views
        .map(v => v.created_at ?? '')
        .filter(Boolean)
        .sort()[0];

      if (!firstView) continue; // nunca abrió /preview → sin atribución posible

      const viewMs = Date.parse(firstView);
      const stakeMs = Date.parse(stake.blockTimestamp);
      const stakeRif = Number(stake.amountWei) / 1e18;

      // La vista debe ser PREVIA al stake; si no, el stake no vino del piloto.
      if (!(stakeMs > viewMs)) continue;
      if (stakeMs > windowEndMs) continue; // fuera de la ventana

      const daysToStake = Math.round(((stakeMs - viewMs) / 86_400_000) * 10) / 10;

      await fesStorage.recordEvent({
        wallet: stake.wallet,
        event_type: 'attributed_stake',
        payload: {
          txHash: stake.txHash,
          logIndex: stake.logIndex,
          blockNumber: stake.blockNumber,
          amountRif: stakeRif,
          viewedAt: firstView,
          stakedAt: stake.blockTimestamp,
          daysToStake,
          attributionRule: 'stake posterior a preview_view y dentro de la ventana del piloto',
        },
      });

      await fesStorage.markStakeEventAttributed(stake.txHash, stake.logIndex, daysToStake);

      attributed++;
      logger.info(
        `[FES Attribution] ✅ atribución: ${stake.wallet.slice(0, 10)}… ` +
        `(${stakeRif} RIF, ${daysToStake} días desde la vista)`
      );
    }

    return attributed;
  }

  /**
   * `reactivated` = hubo actividad on-chain de la wallet del piloto después
   * del arranque de la ventana (stake o unstake). Es el contralibre del
   * dashboard: debe ser >= Staked (atribuido); si es mayor, hay actividad
   * que la atribución no pudo confirmar y hay que mirarla a mano.
   */
  private async updateParticipants(events: ChainStakeEvent[]): Promise<number> {
    if (events.length === 0) return 0;

    const byWallet = new Map<string, ChainStakeEvent[]>();
    for (const e of events) {
      const list = byWallet.get(e.wallet) ?? [];
      list.push(e);
      byWallet.set(e.wallet, list);
    }

    const windowStartMs = PILOT_WINDOW_START_MS;
    let updated = 0;

    for (const [wallet, list] of byWallet) {
      const latest = list.reduce((a, b) => (a.blockNumber >= b.blockNumber ? a : b));
      const latestMs = Date.parse(latest.blockTimestamp);
      if (latestMs < windowStartMs) continue; // actividad previa al piloto no cuenta

      const participant = await fesStorage.getParticipant(wallet);
      if (!participant) continue;

      const fields: Record<string, unknown> = {
        last_block_current: latest.blockNumber,
        last_checked_at: new Date().toISOString(),
      };
      if (!participant.reactivated) {
        fields.reactivated = true;
        fields.reactivated_at = latest.blockTimestamp;
      }

      await fesStorage.updateParticipantField(wallet, fields);
      updated++;
    }

    return updated;
  }

  /** Inputs de transacción (dedupe por txHash) para clasificar stake/unstake. */
  private async txInputs(logs: RawLog[]): Promise<Map<string, string>> {
    const txHashes = [...new Set(logs.map(l => String(l.transactionHash).toLowerCase()))];
    const inputs = new Map<string, string>();

    const BATCH = 10;
    for (let i = 0; i < txHashes.length; i += BATCH) {
      const batch = txHashes.slice(i, i + BATCH);
      const settled = await Promise.allSettled(
        batch.map(async (hash) => {
          const tx = await rpcBalancer.call<{ input: string }>({
            method: 'eth_getTransactionByHash',
            params: [hash],
            timeout: 15_000,
          });
          return { hash, input: String(tx?.input || '').toLowerCase() };
        })
      );
      for (const s of settled) {
        if (s.status === 'fulfilled') inputs.set(s.value.hash, s.value.input);
      }
    }

    return inputs;
  }

  private async blockTimestamps(blocks: number[]): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    const BATCH = 10;
    for (let i = 0; i < blocks.length; i += BATCH) {
      const batch = blocks.slice(i, i + BATCH);
      const settled = await Promise.allSettled(
        batch.map(async (block) => {
          const data = await rpcBalancer.call<{ timestamp: string }>({
            method: 'eth_getBlockByNumber',
            params: [`0x${block.toString(16)}`, false],
            timeout: 15_000,
          });
          const ts = data?.timestamp ? parseInt(data.timestamp, 16) * 1000 : NaN;
          if (Number.isNaN(ts)) throw new Error(`bloque ${block} sin timestamp`);
          return { block, iso: new Date(ts).toISOString() };
        })
      );
      for (const s of settled) {
        if (s.status === 'fulfilled') result.set(s.value.block, s.value.iso);
      }
    }
    return result;
  }

  private async currentBlock(): Promise<number> {
    const hex = await rpcBalancer.call<string>({ method: 'eth_blockNumber', params: [] });
    return parseInt(hex, 16);
  }

  private emptyResult(toBlock: number): MonitorCheckResult {
    return {
      fromBlock: toBlock,
      toBlock,
      transfersScanned: 0,
      stakeEvents: 0,
      unstakeEvents: 0,
      newEvents: 0,
      newAttributions: 0,
      participantsUpdated: 0,
      checkpointSaved: toBlock,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Atribuciones detectadas. Fuente: eventos `attributed_stake` en Supabase
   * (antes: colección de MongoDB con hashes no reproducibles entre reinicios).
   */
  async getAttributions(limit = 100): Promise<Attribution[]> {
    const events = await fesStorage.getEvents(undefined, 'attributed_stake', limit);
    const participants = await fesStorage.listParticipants();
    const cohortByWallet = new Map(participants.map(p => [p.wallet.toLowerCase(), p.cohort]));

    return events.map((e) => {
      const payload = (e.payload || {}) as Record<string, unknown>;
      const viewedAt = String(payload.viewedAt ?? '');
      const stakedAt = String(payload.stakedAt ?? '');
      const daysToStake = Number(payload.daysToStake ?? 0);
      const amountRif = Number(payload.amountRif ?? 0);

      return {
        walletHash: walletHashService.hashWalletDeterministic(e.wallet).walletHash,
        cohort: cohortByWallet.get(e.wallet.toLowerCase()) ?? 'unknown',
        txHash: String(payload.txHash ?? ''),
        logIndex: Number(payload.logIndex ?? 0),
        blockNumber: Number(payload.blockNumber ?? 0),
        amount: String(BigInt(Math.round(amountRif * 1e18))),
        amountRif,
        viewedAt,
        stakedAt,
        daysToStake,
      };
    });
  }

  async getSummary(): Promise<AttributionSummary> {
    const events = await fesStorage.listStakeEvents(1000);
    const attributed = events.filter(e => e.attributed);

    const byCohort: Record<string, number> = {};
    const volumeByCohort: Record<string, number> = {};

    const participants = await fesStorage.listParticipants();
    const cohortByWallet = new Map(participants.map(p => [p.wallet.toLowerCase(), p.cohort]));

    let totalVolumeRIF = 0;
    let daysSum = 0;
    for (const e of attributed) {
      const cohort = cohortByWallet.get(e.wallet.toLowerCase()) ?? 'unknown';
      byCohort[cohort] = (byCohort[cohort] ?? 0) + 1;
      volumeByCohort[cohort] = (volumeByCohort[cohort] ?? 0) + e.amount_rif;
      totalVolumeRIF += e.amount_rif;
      daysSum += Number(e.days_view_to_stake ?? 0);
    }

    const stored = await fesStorage.getMonitorState(CHECKPOINT_KEY);

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      totalAttributions: attributed.length,
      byCohort,
      totalVolumeRIF: round2(totalVolumeRIF),
      volumeByCohort: Object.fromEntries(
        Object.entries(volumeByCohort).map(([k, v]) => [k, round2(v)])
      ),
      avgDaysToStake: attributed.length > 0 ? round2(daysSum / attributed.length) : null,
      lastCheckedBlock: stored ? Number(stored) : 0,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const fesAttributionMonitor = new FESAttributionMonitorService();

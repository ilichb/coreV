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
 *   * Atribución = stake de una wallet del piloto que además tiene una vista
 *     de /preview PREVIA en `fes_views` (walletHash determinista v3 — el join
 *     es por hash: misma wallet + misma FES_WALLET_HASH_SALT ⇒ mismo hash) y
 *     dentro de la ventana del piloto. El join queda persistido en
 *     `fes_attributions` (spec oct-2026).
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

/**
 * Lee un número de env AL MOMENTO DEL LLAMADO (no al importar el módulo):
 * en dev, el valor compilado y el env del proceso pueden divergir, y una
 * constante leída al importar queda congelada. No numérico → default.
 */
function envNum(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

/**
 * Rango por petición a Blockscout. Con rangos anchos el endpoint responde
 * HTTP 500 ({"message":"Something went wrong"}): verificado oct-2026,
 * 5.000 OK, 23.000+ falla. 10.000 es la apuesta que reduce el escaneo frío
 * a ~6 requests (la cuota anónima ronda ~6-9/hora); si un chunk de 10.000
 * 500ea, la subdivisión lo parte en 5.000 (probados OK) — el fallo de
 * ancho cuesta 1 request, no un escaneo completo.
 */
const LOG_SCAN_CHUNK_DEFAULT = 10_000;
/** Límite de logs por respuesta; si se llena, el rango se subdivide. */
const LOG_HARD_LIMIT = 1_000;
/**
 * Ancho mínimo antes de dejar de subdividir un rango que falla con HTTP 5xx.
 * Por debajo de esto el error ya no es de ancho: se propaga anotado con el
 * rango exacto (diagnóstico).
 */
const LOG_MIN_SUBDIVIDE_RANGE = 500;
/** Reintentos por petición de logs. */
const LOG_FETCH_RETRIES = 3;

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

/**
 * Estado del monitor para el dashboard (Bloque 4). `lastRun` es el
 * `updated_at` del cursor: si no avanza en >2h, el cron está roto — es el
 * termómetro de que el sistema sigue funcionando.
 */
export interface MonitorStatus {
  lastCheckedBlock: number;
  lastRun: string | null;
  stakesDetected: number;
  stakesAttributed: number;
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

/** Error HTTP de Blockscout que conserva el status (para distinguir 429 de 5xx). */
class BlockscoutHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSec: number | null
  ) {
    super(message);
    this.name = 'BlockscoutHttpError';
  }
}

async function blockscoutLogs(params: Record<string, string>, signal?: AbortSignal): Promise<RawLog[]> {
  const qs = new URLSearchParams({ module: 'logs', action: 'getLogs', ...params });
  // Clave opcional (dev.blockscout.com): habilita la API centralizada
  // api.blockscout.com (100k créditos/día, 5 RPS en free), que sí honra la
  // clave. En la instancia self-hosted (rootstock.blockscout.com) el
  // parámetro se ignora y rige el rate limit anónimo por IP, que en IPs
  // compartidas (Vercel) suele venir agotado. Sin clave: acceso anónimo.
  const apiKey = process.env.BLOCKSCOUT_API_KEY;
  if (apiKey) qs.set('apikey', apiKey);
  // La API centralizada es multichain y exige chain_id (Rootstock = 30).
  // Solo setear junto a BLOCKSCOUT_API_URL=https://api.blockscout.com/v2;
  // la instancia single-chain ignora el parámetro extra.
  const chainId = process.env.BLOCKSCOUT_CHAIN_ID;
  if (chainId) qs.set('chain_id', chainId);
  const res = await fetch(`${BLOCKSCOUT_API}/api?${qs.toString()}`, {
    headers: { accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    // El cuerpo explica el porqué (p. ej. {"message":"Something went wrong"}
    // con rangos anchos): descartarlo deja "HTTP 500" a secas, imposible de
    // diagnosticar sin reproducir a mano. Guardado por si el mock/cuerpo
    // no tiene .text().
    let body = '';
    try {
      if (typeof res.text === 'function') body = (await res.text()).slice(0, 200);
    } catch { /* cuerpo ilegible: el status sigue siendo el dato útil */ }
    const retryAfterRaw = typeof res.headers?.get === 'function' ? res.headers.get('retry-after') : null;
    const retryAfter = Number(retryAfterRaw);
    throw new BlockscoutHttpError(
      `Blockscout getLogs → HTTP ${res.status}${body ? `: ${body}` : ''}`,
      res.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
    );
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
  const baseDelayMs = envNum('FES_LOG_RETRY_BASE_DELAY_MS', 1_000);
  const cooldown429Ms = envNum('FES_LOG_429_COOLDOWN_MS', 15_000);
  let lastError: unknown;
  for (let attempt = 1; attempt <= LOG_FETCH_RETRIES; attempt++) {
    try {
      return await blockscoutLogs(params);
    } catch (err) {
      lastError = err;
      // 5xx: no reintentar al MISMO ancho — el caller (scanRange) biparte el
      // rango, que es el reintento que sí ataca la causa. Reintentar igual
      // quema cuota de la ventana horaria por requests que van a fallar igual.
      if (err instanceof BlockscoutHttpError && err.status >= 500) throw err;
      if (attempt < LOG_FETCH_RETRIES) {
        // 429 = ventana de rate limit por IP: el backoff corto de 1-2s no
        // alcanza (verificado oct-2026), se espera el cooldown creciente o
        // el Retry-After del servidor si trae uno.
        const is429 = err instanceof BlockscoutHttpError && err.status === 429;
        const delay = is429
          ? Math.max((err instanceof BlockscoutHttpError ? err.retryAfterSec ?? 0 : 0) * 1_000, cooldown429Ms * attempt)
          : attempt * baseDelayMs;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Escanea Transfers de RIF en un rango, en pedazos de a lo sumo
 * LOG_SCAN_CHUNK bloques. Blockscout responde HTTP 500
 * ({"message":"Something went wrong"}) con rangos anchos — verificado en
 * oct-2026: 5.000 bloques OK, 23.000+ falla — y esa respuesta NUNCA llega
 * a la subdivisión por cantidad de logs (que recién actúa sobre un 200 con
 * ≥LOG_HARD_LIMIT resultados). Por eso el chunking es proactivo: sin él, el
 * primer escaneo del cron (cursor → bloque actual, decenas de miles de
 * bloques) fallaba siempre, el cursor no avanzaba y el monitor quedaba
 * clavado en "stalled" para siempre.
 * Un fallo se PROPAGA (nunca se convierte en []).
 */
async function scanTransfers(fromBlock: number, toBlock: number): Promise<RawLog[]> {
  if (toBlock < fromBlock) return [];

  const all: RawLog[] = [];
  const chunkWidth = envNum('FES_LOG_SCAN_CHUNK', LOG_SCAN_CHUNK_DEFAULT);
  const chunkDelayMs = envNum('FES_LOG_CHUNK_DELAY_MS', 1_000);
  let first = true;
  for (let start = fromBlock; start <= toBlock; start += chunkWidth) {
    // Pausa entre requests: sin ella los chunks salen en ráfaga y Blockscout
    // responde 429 por IP.
    if (!first && chunkDelayMs > 0) {
      await new Promise(r => setTimeout(r, chunkDelayMs));
    }
    first = false;
    const end = Math.min(start + chunkWidth - 1, toBlock);
    all.push(...(await scanRange(start, end)));
  }
  return all;
}

/**
 * Un rango acotado: pide los logs con reintentos y, si el rango llegó lleno
 * de resultados, subdivide (protección por densidad, complementaria al
 * chunking por ancho de rango).
 *
 * Si Blockscout responde 5xx (error intermitente del servidor, verificado
 * oct-2026: un chunk de 5.000 pasó y otro idéntico devolvió "Something went
 * wrong.") se biparte el rango y se reintenta más abajo — un rango chico
 * cabe en su presupuesto de escaneo, y bipartir ES el reintento (el retry
 * por request no reintent ante 5xx para no quemar cuota). Solo se subdivide
 * ante 5xx: ante 429 (rate limit) subdivide MULTIPLICARÍA las requests y
 * empeoraría el bloqueo; ese caso espera el cooldown y se propaga. Bajo
 * LOG_MIN_SUBDIVIDE_RANGE el fallo ya no es de ancho → se anota con el rango
 * exacto y se propaga (nunca se convierte en []).
 */
async function scanRange(fromBlock: number, toBlock: number): Promise<RawLog[]> {
  let logs: RawLog[];
  try {
    logs = await blockscoutLogsWithRetry({
      fromBlock: String(fromBlock),
      toBlock: String(toBlock),
      address: RIF_TOKEN,
      topic0: TRANSFER_TOPIC,
    });
  } catch (err) {
    const isHttp = err instanceof BlockscoutHttpError;
    if (isHttp && err.status >= 500 && toBlock - fromBlock + 1 > LOG_MIN_SUBDIVIDE_RANGE) {
      const mid = Math.floor((fromBlock + toBlock) / 2);
      logger.warn(
        `[FES Attribution] rango ${fromBlock}-${toBlock} falló (HTTP ${err.status}); subdividiendo`
      );
      return [...(await scanRange(fromBlock, mid)), ...(await scanRange(mid + 1, toBlock))];
    }
    if (isHttp) {
      throw new Error(`Blockscout rango ${fromBlock}-${toBlock}: ${err.message}`);
    }
    throw err;
  }

  if (logs.length >= LOG_HARD_LIMIT && toBlock > fromBlock) {
    const mid = Math.floor((fromBlock + toBlock) / 2);
    logger.warn(`[FES Attribution] rango ${fromBlock}-${toBlock} lleno (${logs.length} logs); subdividiendo`);
    const left = await scanRange(fromBlock, mid);
    const right = await scanRange(mid + 1, toBlock);
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
   * nuevas (por debajo, persiste el join en `fes_attributions`, escribe el
   * evento legacy `attributed_stake` y marca el evento de cadena como
   * atribuido).
   *
   * El join es por walletHash determinista (v3): la vista se guarda hasheada
   * en `fes_views` y el stake trae la wallet cruda de chain, que se hashea
   * con la misma sal al momento de unir. Si la sal no es estable entre
   * procesos, ninguna vista coincide y la atribución se pierde en silencio —
   * por eso /api/fes/metrics expone la alerta de determinismo.
   */
  private async attribute(events: ChainStakeEvent[], windowEndMs: number): Promise<number> {
    const stakes = events.filter(e => e.type === 'stake');
    if (stakes.length === 0) return 0;

    // Primera vista de cada wallet (la que inicia el recorrido). Se compara
    // por timestamp, no por posición: no se confía en el orden de la tabla.
    const firstViewByHash = new Map<string, { at: string; channel: string | null }>();
    for (const v of await fesStorage.getViews(5000)) {
      if (!v.created_at) continue;
      const cur = firstViewByHash.get(v.wallet_hash);
      // Date.parse en vez de comparar strings: Postgres puede devolver
      // "…+00:00" o "…Z" y el orden lexicográfico no es confiable entre formatos.
      if (!cur || Date.parse(v.created_at) < Date.parse(cur.at)) {
        firstViewByHash.set(v.wallet_hash, { at: v.created_at, channel: v.channel ?? null });
      }
    }

    const participants = await fesStorage.listParticipants();
    const cohortByWallet = new Map(participants.map(p => [p.wallet.toLowerCase(), p.cohort]));

    let attributed = 0;
    for (const stake of stakes) {
      const walletHash = walletHashService.hashWalletDeterministic(stake.wallet).walletHash;
      const view = firstViewByHash.get(walletHash);
      if (!view) continue; // nunca abrió /preview → sin atribución posible

      const viewMs = Date.parse(view.at);
      const stakeMs = Date.parse(stake.blockTimestamp);

      // La vista debe ser PREVIA al stake; si no, el stake no vino del piloto.
      if (!(stakeMs > viewMs)) continue;
      // Dentro de la ventana del piloto (actividad posterior al cierre no
      // cuenta, ni la previa al arranque).
      if (stakeMs > windowEndMs) continue;
      if (stakeMs < PILOT_WINDOW_START_MS) continue;

      const cohort = cohortByWallet.get(stake.wallet.toLowerCase());
      if (!cohort) continue; // no debería pasar: la cadena ya acotó a la cohorte

      const stakeRif = Number(stake.amountWei) / 1e18;
      const daysToStake = Math.round(((stakeMs - viewMs) / 86_400_000) * 10) / 10;

      // Persistir el join (idempotente por wallet_hash: la conversión se
      // cuenta una vez por wallet).
      const inserted = await fesStorage.insertAttribution({
        wallet_hash: walletHash,
        cohort,
        channel: view.channel,
        viewed_at: view.at,
        staked_at: stake.blockTimestamp,
        tx_hash: stake.txHash,
        log_index: stake.logIndex,
        block_number: stake.blockNumber,
        amount_rif: stakeRif,
        days_view_to_stake: daysToStake,
      });

      // Continuidad interna: evento legacy + flag en fes_stake_events.
      await fesStorage.recordEvent({
        wallet: stake.wallet,
        event_type: 'attributed_stake',
        payload: {
          txHash: stake.txHash,
          logIndex: stake.logIndex,
          blockNumber: stake.blockNumber,
          amountRif: stakeRif,
          viewedAt: view.at,
          stakedAt: stake.blockTimestamp,
          daysToStake,
          attributionRule: 'stake posterior a la vista en fes_views y dentro de la ventana del piloto',
        },
      });

      await fesStorage.markStakeEventAttributed(stake.txHash, stake.logIndex, daysToStake);

      if (inserted) attributed++;
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
   * Atribuciones detectadas. Fuente: `fes_attributions` (join persistido por
   * el monitor; spec oct-2026). Antes se recalculaba desde eventos
   * `attributed_stake` de `fes_events`.
   */
  async getAttributions(limit = 500): Promise<Attribution[]> {
    const rows = await fesStorage.listAttributions(limit);
    return rows.map((a) => ({
      walletHash: a.wallet_hash,
      cohort: a.cohort,
      txHash: a.tx_hash,
      logIndex: a.log_index,
      blockNumber: Number(a.block_number),
      amount: String(BigInt(Math.round(Number(a.amount_rif) * 1e18))),
      amountRif: Number(a.amount_rif),
      viewedAt: a.viewed_at,
      stakedAt: a.staked_at,
      daysToStake: Number(a.days_view_to_stake),
    }));
  }

  /**
   * Estado para el Bloque 4 del dashboard: cursor, última corrida y
   * contadores. `lastRun` viene del `updated_at` del cursor en Supabase.
   */
  async getMonitorStatus(): Promise<MonitorStatus> {
    const [entry, events, attributions] = await Promise.all([
      fesStorage.getMonitorStateEntry(CHECKPOINT_KEY),
      fesStorage.listStakeEvents(1000),
      fesStorage.listAttributions(500),
    ]);
    return {
      lastCheckedBlock: entry ? Number(entry.value) : 0,
      lastRun: entry?.updated_at ?? null,
      stakesDetected: events.filter(e => e.event_type === 'stake').length,
      stakesAttributed: attributions.length,
    };
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

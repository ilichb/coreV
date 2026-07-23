/**
 * InactiveHolderService
 *
 * DATA SOURCE: Rewards Subgraph (Rootstock Collective)
 *   - Subgraph ID: 7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA
 *   - Hosted on The Graph Network → https://gateway.thegraph.com/
 *   - Entity: backerStakingHistories
 *   - Fields: id (wallet), backerTotalAllocation, accumulatedTime, lastBlockNumber
 *
 * INACTIVITY DEFINITION (MVP v1):
 *   A holder is considered "inactive" when ALL conditions are met:
 *   1. RIF token balance > 500 RIF (via eth_call to RIF Token contract)
 *   2. No on-chain staking activity for > 30 days (via lastBlockNumber → timestamp)
 *   3. Last staking activity block predates June 1, 2026 (block→date conversion)
 *
 * KNOWN LIMITATIONS (MVP v1):
 *   L1 — Only detects stakers: Wallets that have NEVER staked are invisible
 *        because backerStakingHistories only tracks staking contract interactions.
 *        Pure RIF holders (no staking history) are excluded.
 *   L2 — lastBlockNumber precision: The subgraph updates this field on staking
 *        events (stake, unstake, claim). Non-staking on-chain activity (transfers,
 *        governance votes) does NOT update it. A holder active in governance but
 *        not staking would appear inactive.
 *   L3 — Subgraph latency: If the subgraph is behind the chain tip, lastBlockNumber
 *        may be stale, causing false positives (holders appearing inactive when
 *        they recently staked).
 *   L4 — RSK RPC rate limits: Scanning 1000+ backers requires N+1 RPC calls
 *        (1 eth_call per wallet + unique block→timestamp conversions).
 *        Mitigated via Redis caching + in-memory block cache + RPC batching.
 *
 * FUTURE EXTENSIONS (Phase 2):
 *   - Governance Subgraph (voteCasts, proposals) → detect off-chain governance activity
 *   - Snapshot API → detect off-chain voting activity
 *   - Collective API → detect platform registration/activity
 *   - RIF Token Transfer events via eth_getLogs → detect holder-level transfers
 */

import { rpcBalancer } from '@/lib/infrastructure/clients/rpc-balancer';
import { redisService } from '@/lib/services/coordination/redis';
import { logger } from '@/lib/utils/logger';

const REWARDS_SUBGRAPH_ID = '7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA';
const RIF_TOKEN_ADDRESS = process.env.RIF_TOKEN_ADDRESS || '0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5';
const MIN_BALANCE = BigInt(process.env.RIF_MIN_BALANCE || '500') * BigInt(10) ** BigInt(18);
const MIN_DAYS_INACTIVE = parseInt(process.env.RIF_MIN_DAYS_INACTIVE || '30');
const CUTOFF_DATE = new Date('2026-06-01T00:00:00Z');
const CACHE_TTL = 1800; // subido de 600 a 1800 (30 min) como colchón ante retrasos de GitHub Actions
const SUBGRAPH_PAGE_SIZE = 1000;
const RPC_BATCH_SIZE = 20;

export interface InactiveHolder {
  wallet: string;
  balance: number;
  lastStakeActivity: Date;
  daysInactive: number;
}

export interface InactiveHoldersResult {
  count: number;
  holders: InactiveHolder[];
  metadata: {
    source: string;
    cutoffDate: string;
    minBalanceRIF: number;
    minDaysInactive: number;
    generatedAt: string;
    note: string;
  };
}

const REWARDS_SUBGRAPH_URL = process.env.THEGRAPH_API_KEY
  ? `https://gateway.thegraph.com/api/${process.env.THEGRAPH_API_KEY}/subgraphs/id/${REWARDS_SUBGRAPH_ID}`
  : '';

const blockTimestampCache = new Map<number, Date>();

class InactiveHolderService {
  async findInactiveHolders(): Promise<InactiveHoldersResult> {
    const cacheKey = 'rootstock:inactive:holders:v1';
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return this.emptyResult('Cache not yet populated — waiting for background refresh');
  }

  async refreshInactiveHoldersCache(): Promise<InactiveHoldersResult> {
    const cacheKey = 'rootstock:inactive:holders:v1';

    if (!REWARDS_SUBGRAPH_URL) {
      return this.emptyResult('THEGRAPH_API_KEY not configured');
    }

    const backers = await this.fetchAllBackers();
    if (backers.length === 0) {
      return this.emptyResult('No backers found in Rewards Subgraph');
    }

    const currentBlockHex = await rpcBalancer.call<string>({ method: 'eth_blockNumber', params: [] });
    const currentBlockNum = parseInt(currentBlockHex, 16);

    const candidates = backers
      .map(b => ({
        wallet: b.id.toLowerCase(),
        lastBlock: parseInt(b.lastBlockNumber || '0', 10),
      }))
      .filter(c => c.lastBlock > 0)
      .filter(c => (currentBlockNum - c.lastBlock) >= 100);

    const uniqueBlocks = [...new Set(candidates.map(c => c.lastBlock))];
    const blockDates = await this.batchBlockToDate(uniqueBlocks);

    const dateFiltered = candidates.filter(c => {
      const date = blockDates.get(c.lastBlock);
      if (!date) return false;
      const daysInactive = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysInactive > MIN_DAYS_INACTIVE && date < CUTOFF_DATE;
    });

    const dateFilteredWithDays = dateFiltered.map(c => ({
      ...c,
      daysInactive: Math.floor((Date.now() - blockDates.get(c.lastBlock)!.getTime()) / (1000 * 60 * 60 * 24)),
      lastStakeActivity: blockDates.get(c.lastBlock)!,
    }));

    const balances = await this.batchGetRIFBalances(dateFilteredWithDays.map(c => c.wallet));

    const holders: InactiveHolder[] = [];
    for (const c of dateFilteredWithDays) {
      const balance = balances.get(c.wallet) || BigInt(0);
      if (balance < MIN_BALANCE) continue;

      holders.push({
        wallet: c.wallet,
        balance: Number(balance) / 1e18,
        lastStakeActivity: c.lastStakeActivity,
        daysInactive: c.daysInactive,
      });
    }

    const result: InactiveHoldersResult = {
      count: holders.length,
      holders,
      metadata: {
        source: 'Rewards Subgraph (backerStakingHistories)',
        cutoffDate: CUTOFF_DATE.toISOString(),
        minBalanceRIF: Number(MIN_BALANCE) / 1e18,
        minDaysInactive: MIN_DAYS_INACTIVE,
        generatedAt: new Date().toISOString(),
        note: 'MVP v1 — Only detects stakers. Non-staking RIF holders are not included.',
      },
    };

    await redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getHolderActivity(wallet: string): Promise<InactiveHolder | null> {
    const lower = wallet.toLowerCase();
    const backer = await this.fetchBacker(lower);
    if (!backer || !backer.lastBlockNumber || parseInt(backer.lastBlockNumber, 10) === 0) {
      return null;
    }

    const lastBlock = parseInt(backer.lastBlockNumber, 10);
    const lastActivityDate = await this.blockToDate(lastBlock);
    if (!lastActivityDate) return null;

    const daysInactive = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const balance = await this.getRIFBalance(lower);

    return {
      wallet: lower,
      balance: Number(balance) / 1e18,
      lastStakeActivity: lastActivityDate,
      daysInactive,
    };
  }

  // ── Subgraph (paginado) ────────────────────────────────────────────────

  private async fetchAllBackers(): Promise<any[]> {
    const allBackers: any[] = [];
    let skip = 0;

    while (true) {
      const query = `{
        backerStakingHistories(
          first: ${SUBGRAPH_PAGE_SIZE},
          skip: ${skip},
          orderBy: lastBlockNumber,
          orderDirection: asc,
          where: { lastBlockNumber_gt: "0", accumulatedTime_gt: "0" }
        ) {
          id
          backerTotalAllocation
          accumulatedTime
          lastBlockNumber
        }
      }`;

      const page = await this.querySubgraph(query);
      if (page.length === 0) break;

      allBackers.push(...page);
      skip += SUBGRAPH_PAGE_SIZE;

      if (page.length < SUBGRAPH_PAGE_SIZE) break;
    }

    return allBackers;
  }

  private async fetchBacker(wallet: string): Promise<any | null> {
    const query = `{
      backerStakingHistories(where: { id: "${wallet}" }) {
        id
        backerTotalAllocation
        accumulatedTime
        lastBlockNumber
      }
    }`;

    try {
      const response = await fetch(REWARDS_SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10000),
      });
      const json = await response.json();
      const histories = json?.data?.backerStakingHistories;
      return histories && histories.length > 0 ? histories[0] : null;
    } catch {
      return null;
    }
  }

  private async querySubgraph(query: string): Promise<any[]> {
    try {
      const response = await fetch(REWARDS_SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        logger.warn(`Rewards Subgraph returned ${response.status}`);
        return [];
      }

      const json = await response.json();
      return json?.data?.backerStakingHistories || [];
    } catch (error: any) {
      logger.error('Subgraph query failed:', error);
      return [];
    }
  }

  // ── Block → Date (con batch) ──────────────────────────────────────────

  private async batchBlockToDate(blocks: number[]): Promise<Map<number, Date>> {
    const result = new Map<number, Date>();

    // 1. In-memory hits
    const toFetch: number[] = [];
    for (const block of blocks) {
      if (blockTimestampCache.has(block)) {
        result.set(block, blockTimestampCache.get(block)!);
      } else {
        toFetch.push(block);
      }
    }

    if (toFetch.length === 0) return result;

    // 2. Redis hits (parallel)
    const redisResults = await Promise.allSettled(
      toFetch.map(async block => {
        const cached = await redisService.get(`rootstock:block:${block}`);
        if (cached) {
          const date = new Date(cached);
          blockTimestampCache.set(block, date);
          return { block, date };
        }
        return { block, date: null };
      })
    );

    const rpcFetch: number[] = [];
    for (const r of redisResults) {
      if (r.status === 'fulfilled' && r.value.date) {
        result.set(r.value.block, r.value.date);
      } else if (r.status === 'fulfilled') {
        rpcFetch.push(r.value.block);
      }
    }

    if (rpcFetch.length === 0) return result;

    // 3. RPC fetches in parallel batches
    for (let i = 0; i < rpcFetch.length; i += RPC_BATCH_SIZE) {
      const batch = rpcFetch.slice(i, i + RPC_BATCH_SIZE);
      const responses = await Promise.allSettled(
        batch.map(block => this.fetchBlockDate(block))
      );

      for (let j = 0; j < responses.length; j++) {
        const res = responses[j];
        if (res.status === 'fulfilled' && res.value) {
          const block = batch[j];
          blockTimestampCache.set(block, res.value);
          result.set(block, res.value);
        }
      }
    }

    return result;
  }

  private async fetchBlockDate(blockNumber: number): Promise<Date | null> {
    try {
      const hex = `0x${blockNumber.toString(16)}`;
      const block = await rpcBalancer.call<any>({
        method: 'eth_getBlockByNumber',
        params: [hex, false],
        timeout: 10000,
      });

      if (block && block.timestamp) {
        const timestamp = parseInt(block.timestamp, 16) * 1000;
        const date = new Date(timestamp);
        await redisService.set(`rootstock:block:${blockNumber}`, date.toISOString(), 3600);
        return date;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async blockToDate(blockNumber: number): Promise<Date | null> {
    if (blockTimestampCache.has(blockNumber)) {
      return blockTimestampCache.get(blockNumber)!;
    }

    const cacheKey = `rootstock:block:${blockNumber}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      const date = new Date(cached);
      blockTimestampCache.set(blockNumber, date);
      return date;
    }

    return this.fetchBlockDate(blockNumber);
  }

  // ── RIF Balance (con batch) ────────────────────────────────────────────

  private async batchGetRIFBalances(wallets: string[]): Promise<Map<string, bigint>> {
    const result = new Map<string, bigint>();

    const toFetch: string[] = [];
    for (const wallet of wallets) {
      const cached = await redisService.get(`rootstock:rif:balance:${wallet}`);
      if (cached) {
        result.set(wallet, BigInt(cached));
      } else {
        toFetch.push(wallet);
      }
    }

    for (let i = 0; i < toFetch.length; i += RPC_BATCH_SIZE) {
      const batch = toFetch.slice(i, i + RPC_BATCH_SIZE);
      const responses = await Promise.allSettled(
        batch.map(wallet => this.getRIFBalance(wallet))
      );

      for (let j = 0; j < responses.length; j++) {
        const res = responses[j];
        if (res.status === 'fulfilled') {
          result.set(batch[j], res.value);
        } else {
          result.set(batch[j], BigInt(0));
        }
      }
    }

    return result;
  }

  private async getRIFBalance(wallet: string): Promise<bigint> {
    try {
      const data = `0x70a08231${wallet.substring(2).padStart(64, '0')}`;
      const hex = await rpcBalancer.call<string>({
        method: 'eth_call',
        params: [{ to: RIF_TOKEN_ADDRESS, data }, 'latest'],
        timeout: 10000,
      });

      const balance = BigInt(hex || '0');
      await redisService.set(`rootstock:rif:balance:${wallet}`, balance.toString(), 300);
      return balance;
    } catch {
      return BigInt(0);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private emptyResult(note: string): InactiveHoldersResult {
    return {
      count: 0,
      holders: [],
      metadata: {
        source: 'Rewards Subgraph (backerStakingHistories)',
        cutoffDate: CUTOFF_DATE.toISOString(),
        minBalanceRIF: Number(MIN_BALANCE) / 1e18,
        minDaysInactive: MIN_DAYS_INACTIVE,
        generatedAt: new Date().toISOString(),
        note,
      },
    };
  }
}

export const inactiveHolderService = new InactiveHolderService();

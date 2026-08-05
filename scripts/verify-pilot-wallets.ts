/**
 * verify-pilot-wallets.ts
 *
 * Verifica wallets del CSV contra los criterios del piloto Rootstock:
 *   1. Balance > 500 RIF (del CSV)
 *   2. Historial de staking en Rewards Subgraph (backerStakingHistories)
 *   3. Sin actividad de staking en últimos 30 días
 *   4. Última actividad de staking previa al 1 de junio de 2026
 *
 * Uso:
 *   npx ts-node --esm scripts/verify-pilot-wallets.ts
 *
 * Input:  wallets/csv (HolderAddress,Balance)
 * Output: wallets/pilot-candidates.json + resumen en consola
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

// ── Configuración ────────────────────────────────────────────────────────

const ROOT_DIR = process.cwd();

const CSV_PATH = path.join(ROOT_DIR, 'wallets', 'csv');
const OUTPUT_PATH = path.join(ROOT_DIR, 'wallets', 'pilot-candidates.json');
const REWARDS_SUBGRAPH_ID = '7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA';
const MIN_BALANCE_RIF = 500;
const MIN_DAYS_INACTIVE = 30;
const CUTOFF_DATE = new Date('2026-06-01T00:00:00Z');
const SUBGRAPH_PAGE_SIZE = 500;
const RPC_BATCH_SIZE = 10;
const SUBGRAPH_BATCH_SIZE = 20;

const THEGRAPH_API_KEY = process.env.THEGRAPH_API_KEY || '';
const REWARDS_SUBGRAPH_URL = THEGRAPH_API_KEY
  ? `https://gateway.thegraph.com/api/${THEGRAPH_API_KEY}/subgraphs/id/${REWARDS_SUBGRAPH_ID}`
  : '';

const RSK_RPC_URLS = [
  'https://public-node.rsk.co',
  'https://mainnet.sovryn.app/rpc',
];

// ── Tipos ────────────────────────────────────────────────────────────────

interface CSVWallet {
  address: string;
  balance: number;
}

interface SubgraphBacker {
  id: string;
  backerTotalAllocation: string;
  accumulatedTime: string;
  lastBlockNumber: string;
}

interface VerificationResult {
  wallet: string;
  csvBalance: number;
  qualifies: boolean;
  reason: string;
  lastStakeActivity: string | null;
  daysInactive: number | null;
  lastBlockNumber: number | null;
}

interface PilotReport {
  generatedAt: string;
  totalWalletsInCSV: number;
  totalQualified: number;
  totalDisqualified: number;
  criteria: {
    minBalanceRIF: number;
    minDaysInactive: number;
    cutoffDate: string;
  };
  qualified: VerificationResult[];
  disqualified: VerificationResult[];
  stats: {
    balanceTooLow: number;
    noStakingHistory: number;
    stakingTooRecent: number;
    stakingAfterCutoff: number;
  };
}

// ── RPC helpers ──────────────────────────────────────────────────────────

let rpcCallCounter = 0;

async function rpcCall<T = any>(method: string, params: any[], timeout = 15000): Promise<T> {
  const url = RSK_RPC_URLS[rpcCallCounter % RSK_RPC_URLS.length];
  rpcCallCounter++;

  const postData = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  });

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData).toString(),
        },
        timeout,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error.message));
            else resolve(json.result);
          } catch {
            reject(new Error(`RPC parse error: ${data.substring(0, 100)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('RPC timeout'));
    });
    req.write(postData);
    req.end();
  });
}

async function getCurrentBlock(): Promise<number> {
  const hex: string = await rpcCall('eth_blockNumber', []);
  return parseInt(hex, 16);
}

async function fetchBlockDate(blockNumber: number): Promise<Date | null> {
  try {
    const hex = `0x${blockNumber.toString(16)}`;
    const block = await rpcCall<any>('eth_getBlockByNumber', [hex, false]);
    if (block?.timestamp) {
      return new Date(parseInt(block.timestamp, 16) * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

async function batchBlockToDate(blocks: number[]): Promise<Map<number, Date>> {
  const result = new Map<number, Date>();
  const unique = Array.from(new Set(blocks));

  for (let i = 0; i < unique.length; i += RPC_BATCH_SIZE) {
    const batch = unique.slice(i, i + RPC_BATCH_SIZE);
    const responses = await Promise.allSettled(batch.map((b) => fetchBlockDate(b)));
    for (let j = 0; j < responses.length; j++) {
      const r = responses[j];
      if (r.status === 'fulfilled' && r.value) {
        result.set(batch[j], r.value);
      }
    }
  }

  return result;
}

// ── Subgraph helpers ─────────────────────────────────────────────────────

async function querySubgraphRaw(query: string): Promise<any[]> {
  if (!REWARDS_SUBGRAPH_URL) return [];

  try {
    const postData = JSON.stringify({ query });
    const parsed = new URL(REWARDS_SUBGRAPH_URL);

    return await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData).toString(),
          },
          timeout: 30000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json?.data?.backerStakingHistories || []);
            } catch {
              resolve([]);
            }
          });
        }
      );
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
      req.write(postData);
      req.end();
    });
  } catch {
    return [];
  }
}

/**
 * Fetch all backers from the Rewards Subgraph (paginated).
 */
async function fetchAllBackers(): Promise<SubgraphBacker[]> {
  const all: SubgraphBacker[] = [];
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

    const page = await querySubgraphRaw(query);
    if (page.length === 0) break;

    all.push(...page);
    skip += SUBGRAPH_PAGE_SIZE;

    console.log(`  Subgraph: fetched ${all.length} backers so far...`);

    if (page.length < SUBGRAPH_PAGE_SIZE) break;
  }

  return all;
}

/**
 * Batch query specific wallets from the subgraph.
 */
async function fetchBackersBatch(wallets: string[]): Promise<Map<string, SubgraphBacker>> {
  const result = new Map<string, SubgraphBacker>();

  for (let i = 0; i < wallets.length; i += SUBGRAPH_BATCH_SIZE) {
    const batch = wallets.slice(i, i + SUBGRAPH_BATCH_SIZE);
    const whereClause = batch.map((w) => `"${w.toLowerCase()}"`).join(',');

    const query = `{
      backerStakingHistories(
        where: { id_in: [${whereClause}], lastBlockNumber_gt: "0" }
      ) {
        id
        backerTotalAllocation
        accumulatedTime
        lastBlockNumber
      }
    }`;

    const page = await querySubgraphRaw(query);
    for (const backer of page) {
      result.set(backer.id.toLowerCase(), backer);
    }

    if ((i + SUBGRAPH_BATCH_SIZE) % 200 === 0) {
      console.log(`  Subgraph batch: ${i + SUBGRAPH_BATCH_SIZE}/${wallets.length} queried...`);
    }
  }

  return result;
}

// ── CSV Parser ───────────────────────────────────────────────────────────

function parseCSV(filePath: string): CSVWallet[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const wallets: CSVWallet[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [address, balanceStr] = line.split(',');
    if (!address || !balanceStr) continue;

    const balance = parseFloat(balanceStr);
    if (isNaN(balance)) continue;

    wallets.push({
      address: address.trim().toLowerCase(),
      balance,
    });
  }

  return wallets;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70));
  console.log('  Rootstock Pilot — Wallet Verification Script');
  console.log('='.repeat(70));
  console.log();

  // 1. Validate environment
  if (!THEGRAPH_API_KEY) {
    console.error('❌ THEGRAPH_API_KEY not set. Please set it in .env or environment.');
    console.error('   Example: export THEGRAPH_API_KEY=your_key_here');
    process.exit(1);
  }

  // 2. Read CSV
  console.log(`📂 Reading CSV from: ${CSV_PATH}`);
  const csvWallets = parseCSV(CSV_PATH);
  console.log(`   Found ${csvWallets.length} wallets in CSV`);
  console.log();

  // 3. Filter by balance > 500 RIF
  const balanceFiltered = csvWallets.filter((w) => w.balance > MIN_BALANCE_RIF);
  console.log(`💰 After balance filter (>${MIN_BALANCE_RIF} RIF): ${balanceFiltered.length} wallets`);
  console.log();

  // 4. Get current block for reference
  console.log('⛓️  Fetching current block number...');
  const currentBlock = await getCurrentBlock();
  console.log(`   Current block: ${currentBlock}`);
  console.log();

  // 5. Fetch all backers from subgraph
  console.log('📊 Fetching all backers from Rewards Subgraph...');
  const allBackers = await fetchAllBackers();
  console.log(`   Found ${allBackers.length} total backers in subgraph`);

  // Build lookup map
  const backerMap = new Map<string, SubgraphBacker>();
  for (const b of allBackers) {
    backerMap.set(b.id.toLowerCase(), b);
  }
  console.log();

  // 6. Cross-reference CSV wallets with subgraph
  console.log('🔍 Cross-referencing CSV wallets with subgraph data...');
  const csvAddresses = balanceFiltered.map((w) => w.address);
  const foundInSubgraph: CSVWallet[] = [];
  const notFoundInSubgraph: CSVWallet[] = [];

  for (const wallet of balanceFiltered) {
    if (backerMap.has(wallet.address)) {
      foundInSubgraph.push(wallet);
    } else {
      notFoundInSubgraph.push(wallet);
    }
  }

  console.log(`   ✅ Found in subgraph (have staking history): ${foundInSubgraph.length}`);
  console.log(`   ❌ NOT in subgraph (no staking history): ${notFoundInSubgraph.length}`);
  console.log();

  // 7. For wallets in subgraph, convert block numbers to dates
  console.log('📅 Converting block numbers to dates...');
  const uniqueBlocksSet = new Set<number>();
  for (const wallet of foundInSubgraph) {
    const backer = backerMap.get(wallet.address)!;
    const blockNum = parseInt(backer.lastBlockNumber, 10);
    if (blockNum > 0) uniqueBlocksSet.add(blockNum);
  }
  const uniqueBlocksArr = Array.from(uniqueBlocksSet);
  console.log(`   ${uniqueBlocksArr.length} unique block numbers to convert`);

  const blockDates = await batchBlockToDate(uniqueBlocksArr);
  console.log(`   Successfully converted ${blockDates.size} blocks`);
  console.log();

  // 8. Apply all criteria
  console.log('✅ Applying verification criteria...');
  const qualified: VerificationResult[] = [];
  const disqualified: VerificationResult[] = [];
  const stats = {
    balanceTooLow: 0,
    noStakingHistory: 0,
    stakingTooRecent: 0,
    stakingAfterCutoff: 0,
  };

  for (const wallet of balanceFiltered) {
    const backer = backerMap.get(wallet.address);

    // No staking history at all
    if (!backer) {
      stats.noStakingHistory++;
      disqualified.push({
        wallet: wallet.address,
        csvBalance: wallet.balance,
        qualifies: false,
        reason: 'NO_STAKING_HISTORY',
        lastStakeActivity: null,
        daysInactive: null,
        lastBlockNumber: null,
      });
      continue;
    }

    const lastBlock = parseInt(backer.lastBlockNumber, 10);
    if (lastBlock === 0) {
      stats.noStakingHistory++;
      disqualified.push({
        wallet: wallet.address,
        csvBalance: wallet.balance,
        qualifies: false,
        reason: 'NO_STAKING_HISTORY',
        lastStakeActivity: null,
        daysInactive: null,
        lastBlockNumber: 0,
      });
      continue;
    }

    const lastDate = blockDates.get(lastBlock);
    if (!lastDate) {
      disqualified.push({
        wallet: wallet.address,
        csvBalance: wallet.balance,
        qualifies: false,
        reason: 'BLOCK_DATE_UNAVAILABLE',
        lastStakeActivity: null,
        daysInactive: null,
        lastBlockNumber: lastBlock,
      });
      continue;
    }

    const daysInactive = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check: staking too recent (>30 days inactive required)
    if (daysInactive <= MIN_DAYS_INACTIVE) {
      stats.stakingTooRecent++;
      disqualified.push({
        wallet: wallet.address,
        csvBalance: wallet.balance,
        qualifies: false,
        reason: `STAKING_TOO_RECENT (${daysInactive} days, need >${MIN_DAYS_INACTIVE})`,
        lastStakeActivity: lastDate.toISOString(),
        daysInactive,
        lastBlockNumber: lastBlock,
      });
      continue;
    }

    // Check: last activity must be BEFORE June 1, 2026
    if (lastDate >= CUTOFF_DATE) {
      stats.stakingAfterCutoff++;
      disqualified.push({
        wallet: wallet.address,
        csvBalance: wallet.balance,
        qualifies: false,
        reason: `STAKING_AFTER_CUTOFF (last activity: ${lastDate.toISOString().split('T')[0]})`,
        lastStakeActivity: lastDate.toISOString(),
        daysInactive,
        lastBlockNumber: lastBlock,
      });
      continue;
    }

    // ✅ All criteria met
    qualified.push({
      wallet: wallet.address,
      csvBalance: wallet.balance,
      qualifies: true,
      reason: 'QUALIFIED',
      lastStakeActivity: lastDate.toISOString(),
      daysInactive,
      lastBlockNumber: lastBlock,
    });
  }

  console.log();

  // 9. Generate report
  const report: PilotReport = {
    generatedAt: new Date().toISOString(),
    totalWalletsInCSV: csvWallets.length,
    totalQualified: qualified.length,
    totalDisqualified: disqualified.length,
    criteria: {
      minBalanceRIF: MIN_BALANCE_RIF,
      minDaysInactive: MIN_DAYS_INACTIVE,
      cutoffDate: CUTOFF_DATE.toISOString(),
    },
    qualified: qualified.sort((a, b) => b.csvBalance - a.csvBalance),
    disqualified,
    stats,
  };

  // 10. Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  // 11. Print summary
  console.log('='.repeat(70));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log();
  console.log(`  Total wallets in CSV:          ${report.totalWalletsInCSV}`);
  console.log(`  Balance > ${MIN_BALANCE_RIF} RIF:         ${balanceFiltered.length}`);
  console.log(`  Found in subgraph:             ${foundInSubgraph.length}`);
  console.log(`  NOT in subgraph:               ${notFoundInSubgraph.length}`);
  console.log();
  console.log(`  ✅ QUALIFIED (pilot candidates): ${report.totalQualified}`);
  console.log(`  ❌ DISQUALIFIED:                 ${report.totalDisqualified}`);
  console.log();
  console.log('  Disqualification breakdown:');
  console.log(`    - No staking history:         ${stats.noStakingHistory}`);
  console.log(`    - Staking too recent (<30d):  ${stats.stakingTooRecent}`);
  console.log(`    - Staking after cutoff:       ${stats.stakingAfterCutoff}`);
  console.log();

  if (qualified.length > 0) {
    console.log('  Top 10 qualified wallets by balance:');
    const top10 = qualified.sort((a, b) => b.csvBalance - a.csvBalance).slice(0, 10);
    for (const w of top10) {
      console.log(
        `    ${w.wallet}  |  ${w.csvBalance.toLocaleString()} RIF  |  inactive ${w.daysInactive}d`
      );
    }
    console.log();
  }

  console.log(`📄 Full report saved to: ${OUTPUT_PATH}`);
  console.log();
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});

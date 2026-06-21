/**
 * validate-inactive-holders.mjs
 *
 * Standalone script to validate the InactiveHolderService against real data.
 * Uses only built-in Node.js 18+ APIs (global fetch, AbortSignal).
 *
 * Runs the same pipeline as the service:
 *   1. Fetch all backers from Rewards Subgraph (paginado)
 *   2. Get current RSK block number
 *   3. Stage A+B: filter by lastBlockNumber
 *   4. Stage C: batch block->date, filter by inactivity
 *   5. Stage D: batch RIF balanceOf, filter by balance
 *   6. Report results with timing.
 */

const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/6ba71d4cadf96bbe2d090ad56d1ab692/subgraphs/id/7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA';
const RPC_URL = 'https://public-node.rsk.co';

const RIF_TOKEN = '0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5';
const MIN_BALANCE = BigInt(500) * BigInt(10) ** BigInt(18);
const MIN_DAYS = 30;
const CUTOFF = new Date('2026-06-01T00:00:00Z');

async function rpcCall(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

async function subgraphQuery(query) {
  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Subgraph ${res.status}: ${text.substring(0, 200)}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(`Subgraph error: ${JSON.stringify(json.errors)}`);
  return json.data;
}

async function fetchAllBackers() {
  const all = [];
  const PAGE = 1000;
  let skip = 0;

  for (let page = 0; page < 10; page++) { // max 10 pages = 10k backers
    const query = `{
      backerStakingHistories(
        first: ${PAGE},
        skip: ${skip},
        orderBy: lastBlockNumber,
        orderDirection: asc,
        where: { lastBlockNumber_gt: "0", accumulatedTime_gt: "0" }
      ) { id lastBlockNumber backerTotalAllocation accumulatedTime }
    }`;

    const data = await subgraphQuery(query);
    const pageBackers = data?.backerStakingHistories || [];
    if (pageBackers.length === 0) break;
    all.push(...pageBackers);
    skip += PAGE;
    if (pageBackers.length < PAGE) break;
  }
  return all;
}

async function blockToDate(blockNum) {
  const hex = '0x' + blockNum.toString(16);
  const block = await rpcCall('eth_getBlockByNumber', [hex, false]);
  if (!block || !block.timestamp) return null;
  return new Date(parseInt(block.timestamp, 16) * 1000);
}

async function getRIFBalance(wallet) {
  const data = '0x70a08231' + wallet.substring(2).padStart(64, '0');
  const hex = await rpcCall('eth_call', [{ to: RIF_TOKEN, data }, 'latest']);
  return BigInt(hex || '0');
}

async function main() {
  const t0 = Date.now();
  console.log('=== Inactive Holder Detector — Validation ===\n');

  // ── 1. Subgraph ──
  const t1 = Date.now();
  const backers = await fetchAllBackers();
  const tSubgraph = Date.now() - t1;
  console.log(`[1] Subgraph: ${backers.length} backers with accumulatedTime > 0 (${tSubgraph}ms)`);

  if (backers.length === 0) {
    console.log('ERROR: No backers found. Check subgraph URL and API key.');
    process.exit(1);
  }

  // ── 2. Current block ──
  const currentHex = await rpcCall('eth_blockNumber', []);
  const currentBlock = parseInt(currentHex, 16);
  console.log(`[2] Current RSK block: ${currentBlock}`);

  // ── 3. Stage A+B — Filter by block ──
  const candidates = backers
    .map(b => ({ wallet: b.id.toLowerCase(), lastBlock: parseInt(b.lastBlockNumber || '0', 10) }))
    .filter(c => c.lastBlock > 0)
    .filter(c => (currentBlock - c.lastBlock) >= 100);

  console.log(`[3] Stage A+B: ${backers.length} → ${candidates.length} (blocksSinceLastActivity >= 100)`);

  // ── 4. Stage C — Block → Date (batch, sequential for progress tracking) ──
  const uniqueBlocks = [...new Set(candidates.map(c => c.lastBlock))];
  const t2 = Date.now();
  const blockDateMap = new Map();
  let blockCacheHits = 0;

  for (const block of uniqueBlocks) {
    if (!blockDateMap.has(block)) {
      const date = await blockToDate(block);
      if (date) blockDateMap.set(block, date);
    }
  }

  const tBlockToDate = Date.now() - t2;
  console.log(`[4] Stage C: ${uniqueBlocks.length} unique blocks → ${blockDateMap.size} resolved (${tBlockToDate}ms)`);

  const dateFiltered = candidates.filter(c => {
    const date = blockDateMap.get(c.lastBlock);
    if (!date) return false;
    const daysInactive = Math.floor((Date.now() - date.getTime()) / 86400000);
    return daysInactive > MIN_DAYS && date < CUTOFF;
  });

  console.log(`     Candidates after date filter: ${candidates.length} → ${dateFiltered.length}`);
  console.log(`     (min days: ${MIN_DAYS}, cutoff: ${CUTOFF.toISOString()})`);

  // ── 5. Stage D — RIF Balance (batch) ──
  const t3 = Date.now();
  const holders = [];
  let balanceCalls = 0;

  for (const c of dateFiltered) {
    const balance = await getRIFBalance(c.wallet);
    balanceCalls++;
    if (balance >= MIN_BALANCE) {
      const date = blockDateMap.get(c.lastBlock);
      const daysInactive = Math.floor((Date.now() - date.getTime()) / 86400000);
      holders.push({
        wallet: c.wallet,
        balance: Number(balance) / 1e18,
        lastStakeActivity: date.toISOString(),
        daysInactive,
      });
      console.log(`     ✓ Found: ${c.wallet.substring(0, 10)}... | ${(Number(balance)/1e18).toFixed(2)} RIF | ${daysInactive}d inactive`);
    }
  }

  const tBalance = Date.now() - t3;
  console.log(`[5] Stage D: ${dateFiltered.length} wallets → ${balanceCalls} balanceOf calls (${tBalance}ms)`);

  // ── 6. Results ──
  const tTotal = Date.now() - t0;

  console.log(`\n=== RESULTS ===`);
  console.log(`Total holders inactive: ${holders.length}`);
  console.log(`Total time: ${tTotal}ms`);
  console.log(`  Subgraph: ${tSubgraph}ms`);
  console.log(`  Block→Date RPC: ${tBlockToDate}ms`);
  console.log(`  Balance RPC: ${tBalance}ms`);

  if (holders.length > 0) {
    console.log(`\nSample (up to 20):`);
    holders.slice(0, 20).forEach((h, i) => {
      console.log(`  ${i+1}. ${h.wallet} | ${h.balance.toFixed(2)} RIF | last: ${h.lastStakeActivity} | ${h.daysInactive}d inactive`);
    });
  }

  // ── 7. Verify 3 random holders ──
  if (holders.length >= 3) {
    console.log(`\n=== Manual Verification (${Math.min(3, holders.length)} wallets) ===`);
    for (let i = 0; i < Math.min(3, holders.length); i++) {
      const h = holders[i];
      console.log(`\nWallet ${i+1}: ${h.wallet}`);
      console.log(`  Reported: ${h.balance.toFixed(2)} RIF, last activity ${h.lastStakeActivity}, ${h.daysInactive}d inactive`);

      // Verify against backerStakingHistories
      const query = `{ backerStakingHistories(where: { id: "${h.wallet}" }) { id lastBlockNumber accumulatedTime backerTotalAllocation } }`;
      const data = await subgraphQuery(query);
      const backer = data?.backerStakingHistories?.[0];
      if (backer) {
        const blockNum = parseInt(backer.lastBlockNumber, 10);
        const date = await blockToDate(blockNum);
        console.log(`  Subgraph: lastBlock=${backer.lastBlockNumber}, date=${date?.toISOString()}, accumulatedTime=${backer.accumulatedTime}`);
      }

      // Verify RIF balance
      const bal = await getRIFBalance(h.wallet);
      console.log(`  RPC balanceOf: ${(Number(bal)/1e18).toFixed(4)} RIF (reported: ${h.balance.toFixed(4)} RIF)`);

      const match = bal >= MIN_BALANCE;
      console.log(`  ✓ Balance > 500 RIF: ${match ? 'YES' : 'NO — POTENTIAL FALSE POSITIVE'}`);
    }
  } else {
    console.log(`\nNot enough holders for manual verification (need ≥ 3, found ${holders.length})`);
    // Show why: detail the filtering
    console.log(`\nDetailed pipeline:`);
    console.log(`  Total subgraph backers: ${backers.length}`);
    console.log(`  After Stage A+B: ${candidates.length}`);
    console.log(`  After Stage C (date): ${dateFiltered.length}`);
    console.log(`  After Stage D (balance): ${holders.length}`);

    if (dateFiltered.length > 0) {
      console.log(`\n  Wallets that passed date filter but failed balance:`);
      for (const c of dateFiltered) {
        const bal = await getRIFBalance(c.wallet);
        console.log(`    ${c.wallet.substring(0, 10)}... balance=${(Number(bal)/1e18).toFixed(2)} RIF (need > 500)`);
      }
    }
  }

  // ── 8. Quality metrics ──
  console.log(`\n=== QUALITY METRICS ===`);
  console.log(`Total backers in subgraph (with history): ${backers.length}`);
  console.log(`Inactive holders found: ${holders.length}`);
  console.log(`Detection rate: ${holders.length > 0 ? (holders.length / backers.length * 100).toFixed(1) : '0'}% of total backers`);
  console.log(`\nBlock range of detected holders:`);
  if (holders.length > 0) {
    const blocks = holders.map(h => {
      const b = backers.find(x => x.id.toLowerCase() === h.wallet);
      return b ? parseInt(b.lastBlockNumber, 10) : 0;
    });
    console.log(`  Min: ${Math.min(...blocks)}, Max: ${Math.max(...blocks)}`);
  }

  console.log(`\nDone.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

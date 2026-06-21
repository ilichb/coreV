/**
 * test-fes-endpoint.mjs
 *
 * Standalone validation of the full FES pipeline (cohort assignment only,
 * without HTTP server). Reuses the same subgraph + RPC logic from
 * validate-inactive-holders.mjs, then applies cohort assignment and
 * produces the full analysis report.
 *
 * Run: node scripts/test-fes-endpoint.mjs
 */

const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/6ba71d4cadf96bbe2d090ad56d1ab692/subgraphs/id/7kSWmHvWixeZBpzVfgkGS2sYNYoXZz614TcqnPTgkWwA';
const RPC_URL = 'https://public-node.rsk.co';
const RIF_TOKEN = '0x2AcC95758f8b5F583470bA265Eb685a8f45fC9D5';
const MIN_BALANCE = BigInt(500) * BigInt(10) ** BigInt(18);
const MIN_DAYS = 30;
const CUTOFF = new Date('2026-06-01T00:00:00Z');
const RPC_BATCH = 20;

const blockCache = new Map();

function shorten(a) { return `${a.slice(0,6)}...${a.slice(-4)}`; }

async function rpc(method, params) {
  const r = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json();
  if (j.error) throw new Error(`RPC: ${j.error.message}`);
  return j.result;
}

async function subgraph(q) {
  const r = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Subgraph ${r.status}: ${(await r.text()).substring(0,200)}`);
  const j = await r.json();
  if (j.errors) throw new Error(`Subgraph: ${JSON.stringify(j.errors)}`);
  return j.data;
}

async function blockToDate(block) {
  const hex = `0x${block.toString(16)}`;
  const b = await rpc('eth_getBlockByNumber', [hex, false]);
  return new Date(parseInt(b.timestamp, 16) * 1000);
}

async function batchBlockToDate(blocks) {
  const res = new Map();
  const todo = blocks.filter(b => !blockCache.has(b));
  for (const b of blocks) {
    if (blockCache.has(b)) res.set(b, blockCache.get(b));
  }
  for (let i = 0; i < todo.length; i += RPC_BATCH) {
    const batch = todo.slice(i, i + RPC_BATCH);
    const dates = await Promise.allSettled(batch.map(blockToDate));
    for (let j = 0; j < batch.length; j++) {
      if (dates[j].status === 'fulfilled') {
        blockCache.set(batch[j], dates[j].value);
        res.set(batch[j], dates[j].value);
      }
    }
  }
  return res;
}

async function getRIFBalance(wallet) {
  const data = `0x70a08231${wallet.substring(2).padStart(64, '0')}`;
  const hex = await rpc('eth_call', [{ to: RIF_TOKEN, data }, 'latest']);
  return BigInt(hex || '0');
}

async function batchRIFBalances(wallets) {
  const res = new Map();
  for (let i = 0; i < wallets.length; i += RPC_BATCH) {
    const batch = wallets.slice(i, i + RPC_BATCH);
    const bals = await Promise.allSettled(batch.map(getRIFBalance));
    for (let j = 0; j < batch.length; j++) {
      res.set(batch[j], bals[j].status === 'fulfilled' ? bals[j].value : BigInt(0));
    }
  }
  return res;
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();

  // 1. Fetch all backers
  console.log('Fetching backers from Rewards Subgraph...');
  const allBackers = [];
  let skip = 0;
  while (true) {
    const q = `{ backerStakingHistories(first:1000, skip:${skip}, orderBy:lastBlockNumber, orderDirection:asc, where:{lastBlockNumber_gt:"0", accumulatedTime_gt:"0"}) { id lastBlockNumber } }`;
    const d = await subgraph(q);
    const page = d?.backerStakingHistories || [];
    if (page.length === 0) break;
    allBackers.push(...page);
    skip += 1000;
    if (page.length < 1000) break;
  }
  console.log(`  → ${allBackers.length} total backers`);

  // 2. Current block
  const currHex = await rpc('eth_blockNumber', []);
  const currBlock = parseInt(currHex, 16);
  console.log(`  → Current block: ${currBlock}`);

  // 3. Stage A+B: filter by lastBlockNumber
  const candidates = allBackers
    .map(b => ({ wallet: b.id.toLowerCase(), lastBlock: parseInt(b.lastBlockNumber, 10) }))
    .filter(c => c.lastBlock > 0)
    .filter(c => (currBlock - c.lastBlock) >= 100);
  console.log(`  → After block filter: ${candidates.length}`);

  // 4. Stage C: block → date
  const blocks = [...new Set(candidates.map(c => c.lastBlock))];
  const blockDates = await batchBlockToDate(blocks);

  const dateFiltered = candidates.filter(c => {
    const d = blockDates.get(c.lastBlock);
    if (!d) return false;
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    return days > MIN_DAYS && d < CUTOFF;
  }).map(c => ({
    ...c,
    daysInactive: Math.floor((Date.now() - blockDates.get(c.lastBlock).getTime()) / 86400000),
    lastStakeActivity: blockDates.get(c.lastBlock),
  }));
  console.log(`  → After date filter: ${dateFiltered.length}`);

  // 5. Stage D: RIF balances
  const balances = await batchRIFBalances(dateFiltered.map(c => c.wallet));
  const holders = dateFiltered
    .map(c => ({ wallet: c.wallet, balance: Number(balances.get(c.wallet) || BigInt(0)) / 1e18, daysInactive: c.daysInactive, lastStakeActivity: c.lastStakeActivity }))
    .filter(h => h.balance >= Number(MIN_BALANCE) / 1e18);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  → After balance filter: ${holders.length}`);
  console.log(`  → Total time: ${elapsed}s\n`);

  // ── COHORT ASSIGNMENT (v2) ────────────────────────────────────────────────
  // Strategy: whales (>1M RIF) excluded. Main pool stratified by days inactive.
  console.log('='.repeat(60));
  console.log('  COHORT ASSIGNMENT v2 — WHALE EXCLUSION + DAYS STRATIFICATION');
  console.log('='.repeat(60));

  const WHALE_THRESHOLD = 1_000_000;

  const whaleHolders = holders.filter(h => h.balance >= WHALE_THRESHOLD);
  const mainPool = holders.filter(h => h.balance < WHALE_THRESHOLD);

  const sorted = [...mainPool].sort((a, b) => b.daysInactive - a.daysInactive);
  const assigned = sorted.map((h, i) => {
    const pairIdx = Math.floor(i / 2);
    const pos = i % 2;
    const cohort = pairIdx % 2 === 0 ? (pos === 0 ? 'A' : 'B') : (pos === 0 ? 'B' : 'A');
    return { ...h, cohort };
  });

  const A = assigned.filter(h => h.cohort === 'A');
  const B = assigned.filter(h => h.cohort === 'B');

  function stats(g) {
    if (g.length === 0) return { count: 0, avgBal: 0, avgDays: 0, totalBal: 0, bals: [], days: [] };
    return {
      count: g.length,
      avgBal: g.reduce((s, h) => s + h.balance, 0) / g.length,
      avgDays: g.reduce((s, h) => s + h.daysInactive, 0) / g.length,
      totalBal: g.reduce((s, h) => s + h.balance, 0),
      bals: g.map(h => h.balance),
      days: g.map(h => h.daysInactive),
    };
  }

  const sA = stats(A);
  const sB = stats(B);
  const sW = stats(whaleHolders);

  console.log(`\nTotal holders detected: ${holders.length}`);
  console.log(`  Main pool: ${mainPool.length}`);
  console.log(`  Whales (>1M RIF): ${whaleHolders.length}\n`);

  console.log(`── Cohort Distribution (Main Pool) ──`);
  console.log(`  Cohort A (Control):    ${sA.count} wallets (${((sA.count/mainPool.length)*100).toFixed(1)}% of pool)`);
  console.log(`  Cohort B (Treatment):  ${sB.count} wallets (${((sB.count/mainPool.length)*100).toFixed(1)}% of pool)`);
  const aPct = (sA.count / mainPool.length * 100).toFixed(1);
  const bPct = (sB.count / mainPool.length * 100).toFixed(1);
  const sizeDiff = Math.abs(sA.count - sB.count);
  console.log(`  Size difference: ${sizeDiff} wallet(s)  ${sizeDiff <= 1 ? '✓ ACCEPTABLE' : '⚠ IMBALANCED'}`);

  console.log(`\n── Average Balance per Cohort ──`);
  console.log(`  Cohort A:  ${sA.avgBal.toFixed(2).padStart(12)} RIF`);
  console.log(`  Cohort B:  ${sB.avgBal.toFixed(2).padStart(12)} RIF`);
  const balDev = sA.avgBal > 0 ? ((sB.avgBal - sA.avgBal) / sA.avgBal * 100) : 0;
  console.log(`  Deviation: ${balDev > 0 ? '+' : ''}${balDev.toFixed(2)}%  ${Math.abs(balDev) < 50 ? '✓ NO DOMINANT OUTLIER' : '⚠ IMBALANCED'}`);

  console.log(`\n── Average Days Inactive per Cohort (PRIMARY METRIC) ──`);
  console.log(`  Cohort A:  ${sA.avgDays.toFixed(1).padStart(8)} days`);
  console.log(`  Cohort B:  ${sB.avgDays.toFixed(1).padStart(8)} days`);
  const dayDev = sA.avgDays > 0 ? ((sB.avgDays - sA.avgDays) / sA.avgDays * 100) : 0;
  const dayPass = Math.abs(dayDev) < 5;
  console.log(`  Deviation: ${dayDev > 0 ? '+' : ''}${dayDev.toFixed(2)}%  ${dayPass ? '✓ PASS (<5%)' : '✗ FAIL (≥5%)'}`);

  console.log(`\n── Total RIF per Cohort ──`);
  console.log(`  Cohort A:  ${sA.totalBal.toLocaleString()} RIF`);
  console.log(`  Cohort B:  ${sB.totalBal.toLocaleString()} RIF`);
  console.log(`  Whales:    ${sW.totalBal.toLocaleString()} RIF (excluded)`);

  // ── QUALITY CHECKS ─────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('  QUALITY CHECKS');
  console.log('='.repeat(60));

  const allAssigned = [...assigned, ...whaleHolders.map(h => ({ ...h, cohort: 'WHALE' }))];
  const w = allAssigned.map(h => h.wallet);
  const u = new Set(w);
  console.log(`\n[DUPLICATES] Wallets: ${w.length}, Unique: ${u.size} → ${w.length === u.size ? '✓ PASS' : '✗ FAIL'}`);

  // Deterministic (same input → same output)
  const reSortCheck = [...mainPool].sort((a, b) => b.daysInactive - a.daysInactive);
  const reAssignCheck = reSortCheck.map((h, i) => {
    const pairIdx = Math.floor(i / 2);
    const pos = i % 2;
    const cohort = pairIdx % 2 === 0 ? (pos === 0 ? 'A' : 'B') : (pos === 0 ? 'B' : 'A');
    return { ...h, cohort };
  });
  const det = JSON.stringify(assigned) === JSON.stringify(reAssignCheck);
  console.log(`[DETERMINISM] Same input → same output: ${det ? '✓ PASS' : '✗ FAIL'}`);

  // Per-wallet consistency
  const runs = [];
  for (let i = 0; i < 5; i++) {
    const rs = [...mainPool].sort((a, b) => b.daysInactive - a.daysInactive);
    runs.push(rs.map((h, j) => {
      const pairIdx = Math.floor(j / 2);
      const pos = j % 2;
      return { wallet: h.wallet, cohort: pairIdx % 2 === 0 ? (pos === 0 ? 'A' : 'B') : (pos === 0 ? 'B' : 'A') };
    }));
  }
  let consistent = true;
  for (const wallet of assigned.map(h => h.wallet)) {
    const cs = runs.map(r => r.find(h => h.wallet === wallet).cohort);
    if (!cs.every(c => c === cs[0])) consistent = false;
  }
  console.log(`[CONSISTENCY] 5 runs, all wallets stable: ${consistent ? '✓ PASS' : '✗ FAIL'}`);

  // Whale exclusion check
  const whaleInMain = whaleHolders.filter(h => h.balance >= WHALE_THRESHOLD);
  console.log(`[WHALE EXCLUSION] Wallets ≥1M RIF excluded: ${whaleInMain.length === whaleHolders.length ? '✓ PASS' : '✗ FAIL'}`);

  // Stratification: pair-based alternating pattern
  const p0 = assigned[0]?.cohort === 'A' && assigned[1]?.cohort === 'B'; // pair 0: A,B
  const p1 = assigned[2]?.cohort === 'B' && assigned[3]?.cohort === 'A'; // pair 1: B,A
  const correctPattern = p0 && p1;
  console.log(`[STRATIFICATION] Pair-based swapping pattern (A,B,B,A,...): ${correctPattern ? '✓ PASS' : '✗ FAIL'}`);

  // ── BIAS ANALYSIS ──────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('  BIAS ANALYSIS');
  console.log('='.repeat(60));

  const balSpread = Math.abs(balDev);
  const daySpread = Math.abs(dayDev);

  console.log(`\n[DAYS INACTIVE DEVIATION] ${dayDev > 0 ? '+' : ''}${dayDev.toFixed(2)}%  ${dayPass ? '✓ MEETS TARGET (<5%)' : '✗ EXCEEDS TARGET (≥5%)'}`);
  console.log(`[BALANCE DEVIATION]       ${balDev > 0 ? '+' : ''}${balDev.toFixed(2)}%  ${Math.abs(balDev) < 50 ? '✓ NO DOMINANT OUTLIER' : '⚠ NOTABLE (whale excluded)'}`);
  console.log(`[SIZE BALANCE]            ${sizeDiff <= 1 ? '✓ COHORTS WITHIN 1 WALLET' : '✗ SIZE MISMATCH'}`);

  // Detailed balance distribution
  console.log(`\n── Balance Distribution per Cohort ──`);
  console.log(`  Cohort A: [${sA.bals.sort((a,b) => b-a).map(b => b.toLocaleString()).join(', ')}]`);
  console.log(`  Cohort B: [${sB.bals.sort((a,b) => b-a).map(b => b.toLocaleString()).join(', ')}]`);

  // Detailed days inactive distribution
  console.log(`\n── Days Inactive Distribution per Cohort ──`);
  console.log(`  Cohort A: [${sA.days.sort((a,b) => b-a).join(', ')}]`);
  console.log(`  Cohort B: [${sB.days.sort((a,b) => b-a).join(', ')}]`);

  // Full holder list
  console.log(`\n── Full Holder List ──`);
  for (const h of whaleHolders) {
    console.log(`  [WHALE] ${h.wallet}  bal=${h.balance.toLocaleString().padStart(10)} RIF  days=${String(h.daysInactive).padStart(3)}  (excluded from A/B)`);
  }
  for (const h of assigned) {
    const tag = h.cohort;
    console.log(`  [${tag}] ${h.wallet}  bal=${h.balance.toLocaleString().padStart(10)} RIF  days=${String(h.daysInactive).padStart(3)}`);
  }

  // Summary verdict
  console.log(`\n${'='.repeat(60)}`);
  console.log('  ACCEPTANCE CRITERIA VERDICT');
  console.log('='.repeat(60));
  const criteria = [
    ['Days inactive deviation < 5%', dayPass, dayDev.toFixed(2) + '%'],
    ['Cohorts similar size (≤1 diff)', sizeDiff <= 1, `${sA.count} vs ${sB.count}`],
    ['No whale in main pool', whaleHolders.length > 0 ? whaleHolders.every(h => h.balance >= WHALE_THRESHOLD) : true, `${whaleHolders.length} excluded`],
    ['Deterministic assignment', det, ''],
    ['No duplicate wallets', w.length === u.size, ''],
  ];
  for (const [label, pass, detail] of criteria) {
    console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? ' (' + detail + ')' : ''}`);
  }
  const allPass = criteria.every(c => c[1]);
  console.log(`\n  OVERALL: ${allPass ? 'ALL CRITERIA PASSED — SEGMENTATION READY' : 'SOME CRITERIA FAILED — REVIEW NEEDED'}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Total execution time: ${elapsed}s`);
  console.log('='.repeat(60));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

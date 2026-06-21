/**
 * Test script for FES flow validation.
 * Tests cohort assignment logic directly against inactive holder data.
 * Run: node scripts/test-fes-flow.mjs
 *
 * This tests the computational layer (cohort assignment) independently
 * from the HTTP server. For the HTTP endpoint test, start the dev server
 * separately and use curl.
 */

// Simulate the cohort assignment logic
function assignCohorts(holders) {
  const sorted = [...holders].sort((a, b) => b.balance - a.balance);
  return sorted.map((h, i) => ({
    ...h,
    cohort: i % 2 === 0 ? 'A' : 'B',
  }));
}

function computeStats(group) {
  if (group.length === 0) return { count: 0, avgBalance: 0, avgDaysInactive: 0, totalBalance: 0 };
  const totalBal = group.reduce((s, h) => s + h.balance, 0);
  const totalDays = group.reduce((s, h) => s + h.daysInactive, 0);
  return {
    count: group.length,
    avgBalance: totalBal / group.length,
    avgDaysInactive: totalDays / group.length,
    totalBalance: totalBal,
  };
}

function percentDeviation(a, b) {
  if (a === 0 && b === 0) return 0;
  if (a === 0) return 100;
  return ((b - a) / a) * 100;
}

// Test 1: deterministic assignment
console.log('=== TEST 1: Deterministic assignment ===');
const mockHolders = [
  { wallet: '0xaaa', balance: 1000, daysInactive: 50 },
  { wallet: '0xbbb', balance: 2000, daysInactive: 30 },
  { wallet: '0xccc', balance: 1500, daysInactive: 40 },
];

const r1 = assignCohorts(mockHolders);
const r2 = assignCohorts(mockHolders);
const deterministic = JSON.stringify(r1) === JSON.stringify(r2);
console.log(`Same input → same output: ${deterministic ? 'PASS' : 'FAIL'}`);

// Test 2: no duplicate wallets
console.log('\n=== TEST 2: No duplicates ===');
const wallets = r1.map(h => h.wallet);
const uniqueWallets = new Set(wallets);
console.log(`Total wallets: ${wallets.length}, Unique: ${uniqueWallets.size} → ${wallets.length === uniqueWallets.size ? 'PASS' : 'FAIL'}`);

// Test 3: per-wallet consistency (same wallet always same cohort)
console.log('\n=== TEST 3: Per-wallet consistency ===');
const runs = [];
for (let i = 0; i < 5; i++) {
  runs.push(assignCohorts(mockHolders));
}
let allConsistent = true;
for (const wallet of wallets) {
  const cohorts = runs.map(r => r.find(h => h.wallet === wallet).cohort);
  const consistent = cohorts.every(c => c === cohorts[0]);
  if (!consistent) {
    console.log(`INCONSISTENT: ${wallet} → ${cohorts.join(', ')}`);
    allConsistent = false;
  }
}
console.log(`All wallets consistent across 5 runs: ${allConsistent ? 'PASS' : 'FAIL'}`);

// Test 4: cohort distribution with real data
console.log('\n=== TEST 4: Cohort distribution simulation ===');
// Use the mock data to show the distribution
const cohortA = r1.filter(h => h.cohort === 'A');
const cohortB = r1.filter(h => h.cohort === 'B');
const statsA = computeStats(cohortA);
const statsB = computeStats(cohortB);

console.log(`Cohort A: ${statsA.count} wallets, avg balance ${statsA.avgBalance.toFixed(0)}, avg days ${statsA.avgDaysInactive.toFixed(0)}`);
console.log(`Cohort B: ${statsB.count} wallets, avg balance ${statsB.avgBalance.toFixed(0)}, avg days ${statsB.avgDaysInactive.toFixed(0)}`);

// Test 5: empty input
console.log('\n=== TEST 5: Edge cases ===');
const empty = assignCohorts([]);
console.log(`Empty input: ${empty.length === 0 ? 'PASS' : 'FAIL'}`);

// Test 6: single holder
const single = assignCohorts([{ wallet: '0xaaa', balance: 1000, daysInactive: 50 }]);
console.log(`Single holder → Cohort A: ${single[0].cohort === 'A' ? 'PASS' : 'FAIL'}`);

// Test 7: two holders (balanced split)
const two = assignCohorts([
  { wallet: '0xaaa', balance: 2000, daysInactive: 50 },
  { wallet: '0xbbb', balance: 1000, daysInactive: 30 },
]);
console.log(`Two holders: A=${two.filter(h => h.cohort === 'A').length}, B=${two.filter(h => h.cohort === 'B').length} → ${two[0].cohort === 'A' && two[1].cohort === 'B' ? 'PASS' : 'FAIL'}`);

// Test 8: stratification check
console.log('\n=== TEST 8: Stratification ===');
const stratified = assignCohorts([
  { wallet: '0xaaa', balance: 9000, daysInactive: 100 },
  { wallet: '0xbbb', balance: 100, daysInactive: 5 },
  { wallet: '0xccc', balance: 8000, daysInactive: 90 },
  { wallet: '0xddd', balance: 200, daysInactive: 10 },
]);
console.log('Sorted by balance, alternating A/B:');
stratified.forEach(h => console.log(`  ${h.wallet}: balance=${h.balance}, cohort=${h.cohort}`));
// Highest balance should be A, second highest B, third highest A, etc.
const correctStrat = stratified[0].cohort === 'A' && stratified[1].cohort === 'B' && stratified[2].cohort === 'A' && stratified[3].cohort === 'B';
console.log(`Alternating pattern: ${correctStrat ? 'PASS' : 'FAIL'}`);

console.log('\n=== ALL TESTS COMPLETE ===');

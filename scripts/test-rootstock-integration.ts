import { rootstockConnector } from '../src/lib/connectors/rootstock-connector.ts';

async function testIntegration() {
    console.log('🚀 Testing Rootstock Integration...');

    try {
        // 1. Test Governance Subgraph
        console.log('\n--- 1. Testing Governance Subgraph ---');
        const proposals = await rootstockConnector.fetchSubgraphProposals(5);
        console.log(`✅ Found ${proposals.length} items in Governance Subgraph.`);
        if (proposals.length > 0) {
            console.log('Sample item:', JSON.stringify(proposals[0], null, 2));
        }

        // 2. Test Rewards Subgraph & Scorecard
        console.log('\n--- 2. Testing Rewards Subgraph & Scorecard ---');
        // Test with a known active address if possible, otherwise use a placeholder
        const testAddress = '0xbdfb5ee5a2abf4fc7bb1bd1221067aef7f9de491'; // Example from docs
        const scorecard = await rootstockConnector.getBuilderScorecard(testAddress);
        console.log(`✅ Scorecard generated for ${testAddress}:`);
        console.log('Reputation:', scorecard.reputation);
        console.log('Stats:', JSON.stringify(scorecard.stats, null, 2));

        // 3. Test Snapshot Decisions
        console.log('\n--- 3. Testing Snapshot Decisions ---');
        const decisions = await rootstockConnector.fetchRecentDecisions(5);
        console.log(`✅ Found ${decisions.length} decisions on Snapshot.`);

        console.log('\n✨ Integration test completed successfully!');
    } catch (error) {
        console.error('\n❌ Integration test failed:', error);
    }
}

testIntegration();

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { RootstockConnector } from '../src/lib/services/coordination/connectors/rootstock-connector';

async function testRootstockReal(): Promise<void> {
    console.log('🧪 Testing Rootstock Connector with real data...');

    const connector = new RootstockConnector();

    try {
        console.log('1. Fetching governance decisions...');
        const decisions = await connector.fetchGovernanceDecisions();

        console.log(`✅ Found ${decisions.length} real proposals`);

        if (decisions.length > 0) {
            console.log('2. Normalizing first decision...');
            const normalized = await connector.normalizeDecision(decisions[0]);

            console.log(`   Proposal ID: ${normalized.proposal_id}`);
            console.log(`   Title: ${normalized.title.substring(0, 50)}...`);
            console.log(`   Status: ${normalized.status}`);
            console.log(`   Builder: ${normalized.builder_did || 'NONE'}`);
            console.log(`   Source: ${decisions[0].source}`);

            console.log('3. Verifying on-chain state...');
            const verification = await connector.verifyOnChainState(normalized);
            console.log(`   Verified: ${verification.onchain_verified}`);

            console.log('✅ Rootstock real data test PASSED');
        } else {
            console.warn('⚠️ No proposals found, but API connection successful');
        }

    } catch (error: any) {
        console.error('❌ Rootstock real data test failed:', error.message);
        process.exit(1);
    }
}

// Only run if THEGRAPH_API_KEY is set
if (process.env.THEGRAPH_API_KEY) {
    testRootstockReal();
} else {
    console.log('⚠️ Skipping real data test (THEGRAPH_API_KEY not set)');
}

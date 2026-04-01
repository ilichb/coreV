import { EVMConnector } from './evm-connector';
import { RawGovernanceDecision } from '@/lib/infrastructure/base-connector';
import { SnapshotClient } from '@/lib/infrastructure/clients/snapshot-client';
import { TheGraphClient, GOVERNANCE_QUERIES } from '@/lib/infrastructure/clients/thegraph-client';
import { logger } from '../../../utils/logger';

// Real Snapshot space ID for the Arbitrum Foundation DAO
const ARBITRUM_SNAPSHOT_SPACE = 'arbitrumfoundation.eth';
// Dedicated Tally/TheGraph subgraph for Arbitrum governance
const ARBITRUM_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/tally/arbitrum-governance';

export class ArbitrumConnector extends EVMConnector {
    private snapshotClient: SnapshotClient;
    private graphClient: TheGraphClient;

    constructor() {
        super(
            'arbitrum',
            'arbitrum-dao',
            {
                rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
                contractAddresses: {
                    governor: '0x78F9e60608bF48a14032d3f253503C31A77A6e7D',
                    token: '0x912CE59144191C1204E64559FE8253a0e49E6548'
                },
                graphqlEndpoint: ARBITRUM_GRAPH_URL,
                pollingInterval: 60000
            }
        );
        this.snapshotClient = new SnapshotClient();
        this.graphClient = new TheGraphClient(
            process.env.ARBITRUM_GRAPHQL_URL || ARBITRUM_GRAPH_URL,
            process.env.THEGRAPH_API_KEY
        );
    }

    async fetchGovernanceDecisions(): Promise<RawGovernanceDecision[]> {
        logger.info(`🔍 [ARBITRUM] Fetching via Snapshot (${ARBITRUM_SNAPSHOT_SPACE}) and TheGraph...`);

        // 1. Snapshot first — most active for Arbitrum Foundation
        try {
            const proposals = await this.snapshotClient.getProposals(ARBITRUM_SNAPSHOT_SPACE, 20);
            if (proposals.length > 0) {
                logger.info(`✅ [ARBITRUM] Found ${proposals.length} proposals on Snapshot.`);
                return proposals.map(p => ({ ...p, source: 'snapshot' }));
            }
        } catch (err: any) {
            logger.warn(`⚠️ [ARBITRUM] Snapshot fetch failed: ${err.message}`);
        }

        // 2. TheGraph fallback (Desactivado por Auditoría de Seguridad)
        // 🚨 RAZÓN DE LA DESACTIVACIÓN: 
        // - El endpoint alojado de Tally ('api.thegraph.com/subgraphs/name/tally/arbitrum-governance') dejó de funcionar.
        // - Los subgraphs que indexan Arbitrum en la red descentralizada de TheGraph traen 'spaces', no 'proposals'.
        // - Extraer esos 'spaces' corrompería la estructura 'RawGovernanceDecision' que espera el Dashboard y crashea el puente de sincronización.
        // - SOLUCIÓN: Dependeremos exclusivamente de 'SnapshotClient' que ataca el endpoint oficial de Snapshot y consume propuestas 100% reales.
        /*
        try {
            const data = await this.graphClient.query<{ proposals: any[] }>({
                query: GOVERNANCE_QUERIES.arbitrum,
                variables: { first: 20, skip: 0 }
            });
            if (data?.proposals?.length > 0) {
                logger.info(`✅ [ARBITRUM] Found ${data.proposals.length} proposals on TheGraph.`);
                return data.proposals.map(p => ({ ...p, source: 'thegraph' }));
            }
        } catch (err: any) {
            logger.warn(`⚠️ [ARBITRUM] TheGraph fetch failed: ${err.message}`);
        }
        */

        logger.info(`ℹ️ [ARBITRUM] No proposals found.`);
        return [];
    }

    getChainId(): string {
        return '42161'; // Arbitrum One
    }
}

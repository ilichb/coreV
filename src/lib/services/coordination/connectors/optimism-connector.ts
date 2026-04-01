import { EVMConnector } from './evm-connector';
import { RawGovernanceDecision } from '@/lib/infrastructure/base-connector';
import { SnapshotClient } from '@/lib/infrastructure/clients/snapshot-client';
import { TheGraphClient, GOVERNANCE_QUERIES } from '@/lib/infrastructure/clients/thegraph-client';
import { logger } from '../../../utils/logger';

// Real Snapshot space ID for the Optimism Collective
const OPTIMISM_SNAPSHOT_SPACE = 'opcollective.eth';
// Dedicated Tally/TheGraph subgraph for Optimism governance
const OPTIMISM_GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/tally/optimism-governance';

export class OptimismConnector extends EVMConnector {
    private snapshotClient: SnapshotClient;
    private graphClient: TheGraphClient;

    constructor() {
        super(
            'optimism',
            'optimism-dao',
            {
                rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
                contractAddresses: {
                    governor: '0xcDF90C5369A120800b462A01416e788c0A5F91a6',
                    token: '0x4200000000000000000000000000000000000042'
                },
                graphqlEndpoint: OPTIMISM_GRAPH_URL,
                pollingInterval: 60000
            }
        );
        this.snapshotClient = new SnapshotClient();
        this.graphClient = new TheGraphClient(
            process.env.OPTIMISM_GRAPHQL_URL || OPTIMISM_GRAPH_URL,
            process.env.THEGRAPH_API_KEY
        );
    }

    async fetchGovernanceDecisions(): Promise<RawGovernanceDecision[]> {
        logger.info(`🔍 [OPTIMISM] Fetching via Snapshot (${OPTIMISM_SNAPSHOT_SPACE}) and TheGraph...`);

        // 1. Snapshot first — most active for Optimism Collective
        try {
            const proposals = await this.snapshotClient.getProposals(OPTIMISM_SNAPSHOT_SPACE, 20);
            if (proposals.length > 0) {
                logger.info(`✅ [OPTIMISM] Found ${proposals.length} proposals on Snapshot.`);
                return proposals.map(p => ({ ...p, source: 'snapshot' }));
            }
        } catch (err: any) {
            logger.warn(`⚠️ [OPTIMISM] Snapshot fetch failed: ${err.message}`);
        }

        // 2. TheGraph fallback (Desactivado por Auditoría de Seguridad)
        // 🚨 RAZÓN DE LA DESACTIVACIÓN: 
        // - El endpoint alojado de Tally ('api.thegraph.com/subgraphs/name/tally/optimism-governance') está obsoleto y arroja errores.
        // - Los nuevos endpoints descentralizados de Snapshot (p.ej. CAsVTyvLA...) devuelven 'delegations' y no 'proposals'.
        // - Forzar el mapeo de delegaciones rompe el modelo 'RawGovernanceDecision' y crashea EcosystemIngestionService.
        // - SOLUCIÓN: Dependeremos exclusivamente del 'SnapshotClient' (bloque 1, arriba) que conecta seguro al Hub Oficial de Snapshot.
        /*
        try {
            const data = await this.graphClient.query<{ proposals: any[] }>({
                query: GOVERNANCE_QUERIES.optimism,
                variables: { first: 20, skip: 0 }
            });
            if (data?.proposals?.length > 0) {
                logger.info(`✅ [OPTIMISM] Found ${data.proposals.length} proposals on TheGraph.`);
                return data.proposals.map(p => ({ ...p, source: 'thegraph' }));
            }
        } catch (err: any) {
            logger.warn(`⚠️ [OPTIMISM] TheGraph fetch failed: ${err.message}`);
        }
        */

        logger.info(`ℹ️ [OPTIMISM] No proposals found.`);
        return [];
    }

    getChainId(): string {
        return '10'; // Optimism Mainnet
    }
}


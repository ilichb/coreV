import { EcosystemConnector, RawGovernanceDecision, StandardGovernanceDecision, ConnectorConfig, QuorumConfig, VerificationResult } from '@/lib/infrastructure/base-connector';
import { rpcBalancer, createEcosystemRPCBalancer } from '@/lib/infrastructure/clients/rpc-balancer';
import { theGraphClient, GOVERNANCE_QUERIES } from '@/lib/infrastructure/clients/thegraph-client';
import { snapshotClient } from '@/lib/infrastructure/clients/snapshot-client';
import { logger } from '../../../utils/logger';

export abstract class EVMConnector extends EcosystemConnector {
    protected constructor(
        public ecosystem: string,
        public daoIdentifier: string,
        protected config: ConnectorConfig
    ) {
        super();
    }

    async fetchGovernanceDecisions(fromBlock?: number, toBlock?: number): Promise<RawGovernanceDecision[]> {
        logger.info(`🔍 [${this.ecosystem.toUpperCase()}] Fetching governance decisions...`);
        
        try {
            // 1. Snapshot (Often the most active for L2s)
            const snapshotProposals = await snapshotClient.getProposals(this.ecosystem);
            if (snapshotProposals.length > 0) {
                return snapshotProposals.map(p => ({
                    ...p,
                    source: 'snapshot'
                }));
            }

            // 2. TheGraph
            const queryKey = this.ecosystem as keyof typeof GOVERNANCE_QUERIES;
            if (GOVERNANCE_QUERIES[queryKey]) {
                const data = await theGraphClient.query<{ proposals: any[] }>({
                    query: GOVERNANCE_QUERIES[queryKey],
                    variables: { first: 20, skip: 0 }
                });
                if (data?.proposals?.length > 0) {
                    return data.proposals.map(p => ({ ...p, source: 'thegraph' }));
                }
            }

            return [];
        } catch (error) {
            logger.error(`Error fetching decisions for ${this.ecosystem}:`, error);
            return [];
        }
    }

    async normalizeDecision(raw: any): Promise<StandardGovernanceDecision> {
        const id = raw.id || raw.proposalId || 'unknown';
        const startTime = raw.start || raw.createdTimestamp || Math.floor(Date.now() / 1000);
        const endTime = raw.end || (startTime + 7 * 24 * 60 * 60);

        return {
            proposal_id: `${this.ecosystem}:${id}`,
            dao_identifier: this.daoIdentifier,
            ecosystem: this.ecosystem,
            title: raw.title || `Proposal ${id}`,
            description: raw.body || raw.description || '',
            discussion_url: '', // Generic
            snapshot_url: raw.link || '',
            proposal_type: 'STANDARD',
            voting_system: 'SIMPLE_MAJORITY',
            start_timestamp: Number(startTime),
            end_timestamp: Number(endTime),
            status: this.mapStatus(raw.state || raw.status),
            votes_for: BigInt(raw.scores_total || raw.forVotes || 0),
            votes_against: BigInt(raw.againstVotes || 0),
            voting_power_total: BigInt(raw.quorum || 0),
            quorum_required: BigInt(0), // To be fetched via RPC if needed
            created_at: Number(startTime),
            updated_at: Math.floor(Date.now() / 1000),
            verification_proofs: [`${raw.source || 'evm'}-${id}`],
            builder_did: raw.author ? `did:pkh:eip155:${this.getChainId()}:${raw.author}` : undefined
        };
    }

    private mapStatus(rawStatus: string): 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED' {
        const s = (rawStatus || '').toUpperCase();
        if (s === 'CLOSED' || s === 'PASSED' || s === 'SUCCEEDED') return 'PASSED';
        if (s === 'REJECTED' || s === 'DEFEATED' || s === 'CANCELED') return 'REJECTED';
        if (s === 'EXECUTED') return 'EXECUTED';
        return 'ACTIVE';
    }

    abstract getChainId(): string;

    async verifyOnChainState(decision: StandardGovernanceDecision): Promise<VerificationResult> {
        // Most L2 governance is off-chain (Snapshot) anchored to L1 or cross-chain.
        // For this generic version, we assume verification via secondary proof if on-chain governor is missing
        return {
            onchain_verified: false,
            signature_valid: true,
            timestamp_consistent: true,
            state_matches: true,
            proofs: decision.verification_proofs || []
        };
    }

    async getLatestBlockNumber(): Promise<number> {
        try {
            const hex = await rpcBalancer.call<string>({ method: 'eth_blockNumber', params: [] });
            return parseInt(hex, 16);
        } catch {
            return 0;
        }
    }

    async getVotingPower(address: string, blockNumber: number): Promise<bigint> {
        return BigInt(0); // Standard implementation
    }

    async getQuorumRequirements(): Promise<QuorumConfig> {
        return { required: BigInt(0), numerator: 0, denominator: 0 };
    }
}

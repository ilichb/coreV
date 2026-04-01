import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';
import { TallyConnector } from '../coordination/connectors/tally-connector';

export interface Proposal {
    id: string;
    title: string;
    body: string;
    choices: string[];
    start: number;
    end: number;
    state: 'ACTIVE' | 'CLOSED' | 'PENDING';
    author: string;
    space: {
        id: string;
        name: string;
    };
    platform: 'snapshot' | 'tally';
    andromedaContext?: {
        reputationImpact: number;
        relevanceScore: number;
    };
}

export interface VoteReceipt {
    id: string;
    ipfs?: string;
    relayerHash?: string;
}

// Interfaz para adaptadores (Strategy Pattern)
interface GovernanceAdapter {
    getProposals(spaceIds: string[]): Promise<Proposal[]>;
    submitVote(proposalId: string, voter: string, choice: number, signature: string): Promise<VoteReceipt>;
    getVotingPower(proposalId: string, voter: string): Promise<number>;
}

// Mock Snapshot Adapter (Implementación real requeriría GraphQL client)
class SnapshotAdapter implements GovernanceAdapter {
    async getProposals(spaceIds: string[]): Promise<Proposal[]> {
        // MOCK: Simular fetch de Snapshot GraphQL
        return [
            {
                id: '0x123456789abcdef',
                title: 'AIP-42: Integrar Andromeda Core en Treasury',
                body: 'Propuesta para asignar presupuesto...',
                choices: ['For', 'Against', 'Abstain'],
                start: Date.now() - 100000,
                end: Date.now() + 100000,
                state: 'ACTIVE',
                author: '0xKd...',
                space: { id: 'andromeda.eth', name: 'Andromeda DAO' },
                platform: 'snapshot'
            }
        ];
    }

    async submitVote(proposalId: string, voter: string, choice: number, signature: string): Promise<VoteReceipt> {
        // MOCK: Simular envío a Snapshot Hub
        logger.info(`[Snapshot] Submitting vote for ${proposalId} by ${voter} (Choice: ${choice})`);
        return {
            id: 'vote-' + Date.now(),
            ipfs: 'QmHashOfVote...'
        };
    }

    async getVotingPower(proposalId: string, voter: string): Promise<number> {
        return 100; // Mock power
    }
}

// Tally Adapter wrapping the Real TallyConnector
class TallyAdapter implements GovernanceAdapter {
    private connectorArb: TallyConnector;
    private connectorOP: TallyConnector;

    constructor() {
        this.connectorArb = new TallyConnector('arbitrum');
        this.connectorOP = new TallyConnector('optimism');
    }

    async getProposals(spaceIds: string[]): Promise<Proposal[]> {
        logger.info(`[TallyAdapter] Fetching real proposals via TallyConnector`);
        try {
            // Fetching from multiple chains supported by Andromeda
            const [arbDecisions, opDecisions] = await Promise.all([
                this.connectorArb.fetchGovernanceDecisions(),
                this.connectorOP.fetchGovernanceDecisions()
            ]);

            const allDecisions = [...arbDecisions, ...opDecisions];
            
            const proposals = await Promise.all(allDecisions.map(async (d) => {
                const normalized = await (d.source === 'tally' ? 
                    (d.ecosystem === 'arbitrum' ? this.connectorArb : this.connectorOP).normalizeDecision(d) : 
                    null);
                
                if (!normalized) return null;

                const stateMap: Record<string, 'ACTIVE' | 'CLOSED' | 'PENDING'> = {
                    'ACTIVE': 'ACTIVE',
                    'PASSED': 'CLOSED',
                    'REJECTED': 'CLOSED',
                    'EXECUTED': 'CLOSED'
                };

                return {
                    id: normalized.proposal_id,
                    title: normalized.title,
                    body: normalized.description,
                    choices: ['FOR', 'AGAINST', 'ABSTAIN'],
                    start: normalized.start_timestamp,
                    end: normalized.end_timestamp,
                    state: stateMap[normalized.status] || 'PENDING',
                    author: normalized.builder_did || 'unknown',
                    space: { id: normalized.dao_identifier, name: normalized.dao_identifier },
                    platform: 'tally'
                } as Proposal;
            }));

            return proposals.filter((p): p is Proposal => p !== null);
        } catch (error) {
            logger.error('[TallyAdapter] Error fetching proposals:', error);
            return [];
        }
    }

    async submitVote(proposalId: string, voter: string, choice: number, signature: string): Promise<VoteReceipt> {
        logger.info(`[TallyAdapter] Vote submission not yet implemented for direct Tally (Requires Tally API Write)`);
        return { id: `tally-vote-placeholder-${Date.now()}` };
    }

    async getVotingPower(proposalId: string, voter: string): Promise<number> {
        return 1.0;
    }
}

export class GovernanceIntegrationService {
    private static instance: GovernanceIntegrationService;
    private _supabase: any = null;
    private adapters: Map<string, GovernanceAdapter> = new Map();

    private get supabase() {
        if (!this._supabase) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
            this._supabase = createClient(url, key);
        }
        return this._supabase;
    }

    private constructor() {
        // Registrar adaptadores
        this.adapters.set('snapshot', new SnapshotAdapter());
        this.adapters.set('tally', new TallyAdapter()); 
    }

    public static getInstance(): GovernanceIntegrationService {
        if (!GovernanceIntegrationService.instance) {
            GovernanceIntegrationService.instance = new GovernanceIntegrationService();
        }
        return GovernanceIntegrationService.instance;
    }

    async getActiveProposals(userDid: string) {
        // 1. Obtener DAOs suscritas del usuario (Mocked config for now)
        const daoSpaces = ['andromeda.eth'];

        // 2. Fetch de todos los adaptadores
        const allProposals: Proposal[] = [];
        for (const adapter of this.adapters.values()) {
            const proposals = await adapter.getProposals(daoSpaces);
            allProposals.push(...proposals);
        }

        return allProposals;
    }

    async recordVoteMilestone(userDid: string, proposalId: string, choiceId: number) {
        // Registrar en Andromeda DB para reputación
        const { error } = await this.supabase
            .from('governance_activity')
            .insert({
                user_did: userDid,
                proposal_id: proposalId,
                choice_index: choiceId,
                platform: 'snapshot',
                voted_at: new Date().toISOString()
            });

        if (error) {
            logger.error('❌ Failed to record governance activity:', error.message);
            throw error;
        }

        return true;
    }
}

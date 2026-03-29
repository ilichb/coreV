import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

// Inicializar Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export class GovernanceIntegrationService {
    private static instance: GovernanceIntegrationService;
    private adapters: Map<string, GovernanceAdapter> = new Map();

    private constructor() {
        // Registrar adaptadores
        this.adapters.set('snapshot', new SnapshotAdapter());
        // this.adapters.set('tally', new TallyAdapter()); 
    }

    public static getInstance(): GovernanceIntegrationService {
        if (!GovernanceIntegrationService.instance) {
            GovernanceIntegrationService.instance = new GovernanceIntegrationService();
        }
        return GovernanceIntegrationService.instance;
    }

    async getActiveProposals(userDid: string) {
        // 1. Obtener DAOs suscritas del usuario (Mocked config for now)
        const userDaos = ['andromeda.eth'];

        // 2. Consultar propuestas en paralelo
        const promises = Array.from(this.adapters.values()).map(adapter =>
            adapter.getProposals(userDaos)
        );

        const results = await Promise.allSettled(promises);

        // 3. Aplanar, filtrar y enriquecer
        let activeProposals = results
            .filter(p => p.status === 'fulfilled')
            .flatMap(p => (p as PromiseFulfilledResult<Proposal[]>).value)
            .filter(p => p.state === 'ACTIVE');

        // 4. Enriquecer con datos de Andromeda (Impacto estimado)
        activeProposals = await this.enrichWithAndromedaData(activeProposals, userDid);

        // 5. Ordenar por relevancia (Relevance Score calculado)
        return activeProposals.sort((a, b) => {
            return (b.andromedaContext?.relevanceScore || 0) - (a.andromedaContext?.relevanceScore || 0);
        });
    }

    private async enrichWithAndromedaData(proposals: Proposal[], userDid: string): Promise<Proposal[]> {
        return proposals.map(p => {
            // Lógica simulada de relevancia:
            // - Más impacto si la DAO es "core" para el usuario
            // - Más urgencia si cierra pronto
            const timeLeft = p.end - Date.now();
            const urgencyScore = timeLeft < 86400000 ? 50 : 10; // Bonus si cierra en <24h

            return {
                ...p,
                andromedaContext: {
                    reputationImpact: 50, // Base points
                    relevanceScore: 100 + urgencyScore // Mock calc
                }
            };
        });
    }

    async voteThroughAndromeda(proposalId: string, userDid: string, choice: number, signature: string, platform: string = 'snapshot') {
        const adapter = this.adapters.get(platform);
        if (!adapter) throw new Error(`Platform ${platform} not supported`);

        // 1. Verificar elegibilidad
        const power = await adapter.getVotingPower(proposalId, userDid);
        if (power <= 0) throw new Error('Not eligible to vote (Zero voting power)');

        // 2. Enviar a Tally/Snapshot (Simulado)
        const result = await adapter.submitVote(proposalId, userDid, choice, signature);

        // 3. Registrar como hito en Andromeda (Milestone)
        await this.recordVoteMilestone(userDid, proposalId, choice, result, platform);

        return { ...result, reputationEarned: 50 };
    }

    private calculateProposalRelevance(a: Proposal, b: Proposal, userDid: string): number {
        // Logica simple: primero las que cierran pronto
        return a.end - b.end;
    }

    private async recordVoteMilestone(userDid: string, proposalId: string, choice: number, receipt: VoteReceipt, platform: string) {
        // Insertar en tabla milestones (que se sincroniza luego a Vara)
        await supabase.from('milestones').insert({
            user_did: userDid,
            event_name: 'GOVERNANCE_VOTE',
            metadata: {
                platform,
                proposalId,
                choice,
                receiptId: receipt.id,
                votedThrough: 'Andromeda Core', // Marca de agua estratégica
                timestamp: new Date().toISOString()
            },
            reputation_score: 50, // Puntos fijos para demo
            description: `Voted on proposal ${proposalId.slice(0, 6)}...`
        });

        logger.info(`✅ Milestone recorded for ${userDid}: GOVERNANCE_VOTE`);
    }
}

export const governanceService = GovernanceIntegrationService.getInstance();

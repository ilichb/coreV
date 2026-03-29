import { mongoDBClient } from '../../infrastructure/mongodb';
import { StandardGovernanceDecision } from '../../infrastructure/base-connector';
import { IndustryValidator } from '../../industries/validator';
import { walletHashService } from '../security/wallet-hash.service';
import { logger } from '../../utils/logger';

/**
 * Servicio de ingestión ATLAS para MongoDB
 * Conecta los datos procesados de ecosistemas con el sistema ATLAS
 */
export class AtlasIngestionService {
    private industryValidator: IndustryValidator;
    private industryCache: Map<string, { industryId: string; subIndustryId: string }>;
    private performanceMetrics: {
        totalIngested: number;
        successfulIngestions: number;
        failedIngestions: number;
        averageProcessingTime: number;
        lastIngestionTime?: Date;
    };

    constructor() {
        this.industryValidator = new IndustryValidator();
        this.industryCache = new Map();
        this.performanceMetrics = {
            totalIngested: 0,
            successfulIngestions: 0,
            failedIngestions: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Ingesta una decisión de gobernanza en ATLAS (MongoDB)
     */
    async ingestToAtlas(decision: StandardGovernanceDecision): Promise<{
        success: boolean;
        atlasId?: string;
        error?: string;
    }> {
        try {
            // 1. Transformar a formato ATLAS Milestone
            const milestone = this.transformToAtlasMilestone(decision);

            // 2. Guardar en MongoDB
            const result = await mongoDBClient.upsertMilestone(milestone, { suppressErrors: true });

            if (result.success) {
                logger.info(`✅ Ingestado en ATLAS: ${milestone.atlasId} (${result.existing ? 'actualizado' : 'nuevo'})`);
                return {
                    success: true,
                    atlasId: milestone.atlasId
                };
            } else {
                logger.warn(`⚠️ Error en ingestión ATLAS: ${result.error}`);
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            logger.error(`❌ Error crítico en ingestión ATLAS:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Transforma una decisión de gobernanza a formato ATLAS Milestone
     */
    private transformToAtlasMilestone(decision: StandardGovernanceDecision): any {
        const atlasId = this.generateAtlasId(decision);
        const industryMapping = this.mapToIndustry(decision);
        const trustScore = this.calculateTrustScore(decision);

        // Convertir bigint a number para MongoDB
        const votesFor = Number(decision.votes_for || 0);
        const votesAgainst = Number(decision.votes_against || 0);
        const totalVotes = votesFor + votesAgainst;

        // Estandarización estricta de DID
        let builderDid = decision.builder_did || decision.dao_identifier;
        if (!builderDid.startsWith('did:andromeda:')) {
            const ecosystem = decision.ecosystem ? decision.ecosystem.toLowerCase() : 'unknown';
            builderDid = `did:andromeda:${ecosystem}:${builderDid.toLowerCase()}`;
        }

        return {
            atlasId,
            status: 'VERIFIED',
            action: {
                type: 'GOVERNANCE_PARTICIPATION',
                description: decision.description || `Participación en ${decision.dao_identifier}`,
                tags: this.mapToTags(decision),
                metadata: {
                    builderDid,
                    ecosystem: decision.ecosystem,
                    dao: decision.dao_identifier,
                    proposalId: decision.proposal_id,
                    industryId: industryMapping.industryId,
                    subIndustryId: industryMapping.subIndustryId,
                    isWeb3: this.isWeb3Ecosystem(decision.ecosystem),
                    transversalLayer: this.detectTransversalLayer(decision)
                }
            },
            sourceScorecard: {
                ...decision,
                // Convertir bigint a number para MongoDB
                votes_for: votesFor,
                votes_against: votesAgainst,
                voting_power_total: Number(decision.voting_power_total || 0),
                quorum_required: Number(decision.quorum_required || 0)
            },
            sourceScorecardHash: this.generateScorecardHash(decision),
            metadata: {
                trustScore,
                createdAt: new Date(decision.created_at * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
                impactMetrics: {
                    votesFor,
                    votesAgainst,
                    totalVotes,
                    participationRate: this.calculateParticipationRate(votesFor, votesAgainst)
                }
            },
            evidence: [
                {
                    type: 'GOVERNANCE_PROPOSAL',
                    uri: this.generateProposalUri(decision),
                    hash: decision.ipfs_cid || 'no-cid'
                }
            ],
            attestations: [
                {
                    signerDid: `did:andromeda:system:atlas-ingestion`,
                    level: 1, // Nivel básico de verificación
                    timestamp: new Date().toISOString(),
                    signature: 'system-generated'
                }
            ]
        };
    }

    /**
     * Genera un ID único para ATLAS
     */
    private generateAtlasId(decision: StandardGovernanceDecision): string {
        const hash = walletHashService.hashWallet(`${decision.ecosystem}:${decision.dao_identifier}:${decision.proposal_id}`).walletHash;
        return `ATLAS-${decision.ecosystem.toUpperCase()}-${hash.substring(0, 16)}`;
    }

    /**
     * Mapea la decisión a categorías de industria
     */
    private mapToIndustry(decision: StandardGovernanceDecision): {
        industryId: string;
        subIndustryId: string;
    } {
        try {
            // Buscar por keywords en la descripción
            const description = (decision.description || '').toLowerCase();
            const daoName = decision.dao_identifier.toLowerCase();

            // Buscar en todas las industrias
            const allIndustries = IndustryValidator.getAllIndustries();

            for (const industry of allIndustries) {
                const subIndustries = IndustryValidator.getSubIndustries(industry.id);

                for (const subIndustry of subIndustries) {
                    // Verificar si algún keyword coincide
                    const hasKeywordMatch = subIndustry.keywords.some(keyword =>
                        description.includes(keyword.toLowerCase()) ||
                        daoName.includes(keyword.toLowerCase())
                    );

                    if (hasKeywordMatch) {
                        return {
                            industryId: industry.id,
                            subIndustryId: subIndustry.id
                        };
                    }
                }
            }
        } catch (error) {
            logger.warn('Error en mapeo de industria:', error);
        }

        // Fallback basado en ecosistema y DAO
        const ecosystem = decision.ecosystem.toLowerCase();
        const dao = decision.dao_identifier.toLowerCase();

        if (ecosystem.includes('rootstock') || dao.includes('defi') || dao.includes('dex')) {
            return {
                industryId: 'finance',
                subIndustryId: 'finance.web3.defi'
            };
        } else if (dao.includes('governance') || dao.includes('dao')) {
            return {
                industryId: 'governance',
                subIndustryId: 'governance.web3.dao'
            };
        } else if (dao.includes('infrastructure') || dao.includes('protocol')) {
            return {
                industryId: 'infrastructure',
                subIndustryId: 'infrastructure.web3.protocol'
            };
        }

        return {
            industryId: 'unknown',
            subIndustryId: 'unknown'
        };
    }

    /**
     * Mapea a tags para búsqueda
     */
    private mapToTags(decision: StandardGovernanceDecision): string[] {
        const tags: string[] = [
            decision.ecosystem,
            'governance',
            'participation'
        ];

        if (decision.dao_identifier) {
            tags.push(decision.dao_identifier.toLowerCase());
        }

        // Añadir tags basados en contenido
        const description = (decision.description || '').toLowerCase();
        if (description.includes('defi') || description.includes('finance')) {
            tags.push('defi', 'finance');
        }
        if (description.includes('infrastructure')) {
            tags.push('infrastructure');
        }
        if (description.includes('security')) {
            tags.push('security');
        }
        if (description.includes('scaling')) {
            tags.push('scaling');
        }

        // Eliminar duplicados usando filter
        const uniqueTags: string[] = [];
        tags.forEach(tag => {
            if (!uniqueTags.includes(tag)) {
                uniqueTags.push(tag);
            }
        });
        return uniqueTags;
    }

    /**
     * Calcula score de confianza basado en métricas
     */
    private calculateTrustScore(decision: StandardGovernanceDecision): number {
        let score = 50; // Puntuación base

        // Convertir bigint a number
        const votesFor = Number(decision.votes_for || 0);
        const votesAgainst = Number(decision.votes_against || 0);
        const totalVotes = votesFor + votesAgainst;
        const votingPowerTotal = Number(decision.voting_power_total || 0);
        const quorumRequired = Number(decision.quorum_required || 0);

        // Puntos por participación (Escalado logarítmico para evitar inflación)
        if (totalVotes > 0) {
            score += Math.min(25, Math.floor(Math.log10(totalVotes + 1) * 8));
        }

        // Puntos por ecosistema conocido con pesos específicos
        const weights: Record<string, number> = {
            'rootstock': 15,
            'ethereum': 15,
            'arbitrum': 10,
            'optimism': 10
        };
        
        score += weights[decision.ecosystem.toLowerCase()] || 0;

        // Bonificación por Rootstock (si tiene allocation proyectado)
        if (decision.ecosystem.toLowerCase() === 'rootstock' && votingPowerTotal > 50000) {
            score += 10;
        }

        // Bonificación dinámica por cumplir/superar Quorum
        if (quorumRequired > 0 && votingPowerTotal >= quorumRequired) {
            score += 15;
            // Extra bonus por superar el quorum de forma muy significativa (x2)
            if (votingPowerTotal >= quorumRequired * 2) {
                score += 5;
            }
        }

        // Puntos por DAO reconocida
        const knownDaos = ['aave', 'compound', 'uniswap', 'makerdao', 'rootstock', 'optimism', 'arbitrum'];
        if (knownDaos.some(dao => decision.dao_identifier.toLowerCase().includes(dao))) {
            score += 10;
        }

        // Puntos por tener descripción de alta calidad
        if (decision.description && decision.description.length > 200) {
            score += 10;
        } else if (decision.description && decision.description.length > 50) {
            score += 5;
        }

        // Penalizaciones (ej: sin actividad o votos cero)
        if (totalVotes === 0 && votingPowerTotal === 0) {
            score -= 20;
        }

        // Limitar entre 1 y 99 (evitar 100 absoluto y 0 para ranking visual)
        return Math.max(15, Math.min(99, score));
    }

    /**
     * Detecta si es ecosistema Web3
     */
    private isWeb3Ecosystem(ecosystem: string): boolean {
        const web3Ecosystems = [
            'rootstock', 'ethereum', 'polygon', 'arbitrum', 'optimism',
            'avalanche', 'solana', 'polkadot', 'cosmos'
        ];
        return web3Ecosystems.includes(ecosystem.toLowerCase());
    }

    /**
     * Detecta capas transversales
     */
    private detectTransversalLayer(decision: StandardGovernanceDecision): string | null {
        const description = (decision.description || '').toLowerCase();

        if (description.includes('identity') || description.includes('soulbound')) {
            return 'identity';
        }
        if (description.includes('privacy') || description.includes('zero-knowledge') || description.includes('zk')) {
            return 'privacy';
        }
        if (description.includes('interoperability') || description.includes('cross-chain')) {
            return 'interoperability';
        }

        return null;
    }

    /**
     * Genera hash del scorecard
     */
    private generateScorecardHash(decision: StandardGovernanceDecision): string {
        const content = `${decision.ecosystem}:${decision.dao_identifier}:${decision.proposal_id}:${decision.created_at}`;
        return walletHashService.hashWallet(content).walletHash;
    }

    /**
     * Calcula tasa de participación
     */
    private calculateParticipationRate(votesFor: number, votesAgainst: number): number {
        const totalVotes = votesFor + votesAgainst;
        // Simulación - en un sistema real esto vendría de datos de quorum
        return totalVotes > 0 ? Math.min(100, (totalVotes / 1000) * 100) : 0;
    }

    /**
     * Genera URI de propuesta
     */
    private generateProposalUri(decision: StandardGovernanceDecision): string {
        if (decision.ecosystem === 'rootstock') {
            return `https://snapshot.org/#/${decision.dao_identifier}/proposal/${decision.proposal_id}`;
        }
        // Para otros ecosistemas, usar enlaces genéricos
        return `https://${decision.ecosystem}.org/dao/${decision.dao_identifier}/proposal/${decision.proposal_id}`;
    }

    /**
     * Ingesta múltiples decisiones en lote con métricas de rendimiento
     */
    async ingestBatch(decisions: StandardGovernanceDecision[]): Promise<{
        total: number;
        success: number;
        failed: number;
        errors: string[];
        processingTime: number;
        averageTimePerDecision: number;
    }> {
        const startTime = Date.now();
        const results = {
            total: decisions.length,
            success: 0,
            failed: 0,
            errors: [] as string[],
            processingTime: 0,
            averageTimePerDecision: 0
        };

        logger.info(`📦 Ingestando lote de ${decisions.length} decisiones en ATLAS...`);

        for (let i = 0; i < decisions.length; i++) {
            const decision = decisions[i];
            const decisionStartTime = Date.now();

            if (i % 10 === 0) {
                logger.info(`  - Procesando ${i + 1}/${decisions.length}...`);
            }

            try {
                const ingestionResult = await this.ingestToAtlas(decision);

                if (ingestionResult.success) {
                    results.success++;
                } else {
                    results.failed++;
                    if (ingestionResult.error) {
                        results.errors.push(`Decision ${decision.proposal_id}: ${ingestionResult.error}`);
                    }
                }

                // Actualizar métricas de tiempo
                const decisionTime = Date.now() - decisionStartTime;
                this.updatePerformanceMetrics(decisionTime, ingestionResult.success);
            } catch (error: any) {
                results.failed++;
                results.errors.push(`Decision ${decision.proposal_id}: ${error.message}`);

                // Actualizar métricas con fallo
                const decisionTime = Date.now() - decisionStartTime;
                this.updatePerformanceMetrics(decisionTime, false);
            }
        }

        results.processingTime = Date.now() - startTime;
        results.averageTimePerDecision = results.total > 0 ? results.processingTime / results.total : 0;

        logger.info(`✅ Lote completado: ${results.success} exitosas, ${results.failed} fallidas`);
        logger.info(`⏱️  Tiempo total: ${results.processingTime}ms (${results.averageTimePerDecision.toFixed(2)}ms por decisión)`);

        return results;
    }

    /**
     * Busca milestones en ATLAS por criterios
     */
    async searchMilestones(filters: {
        ecosystem?: string;
        dao?: string;
        industryId?: string;
        subIndustryId?: string;
        tags?: string[];
        dateRange?: { start: Date; end: Date };
        limit?: number;
        skip?: number;
    }): Promise<{
        milestones: any[];
        total: number;
        page: number;
        limit: number;
    }> {
        try {
            await mongoDBClient.connect();
            const collection = mongoDBClient.getMilestonesCollection();

            // Construir query
            const query: any = {};

            if (filters.ecosystem) {
                query['sourceScorecard.ecosystem'] = filters.ecosystem;
            }

            if (filters.dao) {
                query['sourceScorecard.dao_identifier'] = filters.dao;
            }

            if (filters.industryId) {
                query['action.metadata.industryId'] = filters.industryId;
            }

            if (filters.subIndustryId) {
                query['action.metadata.subIndustryId'] = filters.subIndustryId;
            }

            if (filters.tags && filters.tags.length > 0) {
                query['action.tags'] = { $in: filters.tags };
            }

            if (filters.dateRange) {
                query['metadata.createdAt'] = {
                    $gte: filters.dateRange.start.toISOString(),
                    $lte: filters.dateRange.end.toISOString()
                };
            }

            // Contar total
            const total = await collection.countDocuments(query);

            // Obtener resultados paginados
            const milestones = await collection
                .find(query)
                .sort({ 'metadata.createdAt': -1 })
                .skip(filters.skip || 0)
                .limit(filters.limit || 50)
                .toArray();

            return {
                milestones,
                total,
                page: Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1,
                limit: filters.limit || 50
            };
        } catch (error: any) {
            logger.error('Error en búsqueda de milestones:', error);
            return {
                milestones: [],
                total: 0,
                page: 1,
                limit: filters.limit || 50
            };
        }
    }

    /**
     * Obtiene estadísticas detalladas de ATLAS
     */
    async getDetailedStats(): Promise<{
        totalMilestones: number;
        byEcosystem: Record<string, number>;
        byIndustry: Record<string, number>;
        byStatus: Record<string, number>;
        trustScoreDistribution: {
            excellent: number; // 90-100
            good: number;     // 70-89
            average: number;  // 50-69
            poor: number;     // 30-49
            critical: number; // 0-29
        };
        recentActivity: {
            last24h: number;
            last7d: number;
            last30d: number;
        };
    }> {
        try {
            await mongoDBClient.connect();
            const collection = mongoDBClient.getMilestonesCollection();

            // Obtener estadísticas básicas
            const total = await collection.countDocuments({});

            // Agregaciones para diferentes dimensiones
            const ecosystemAgg = await collection.aggregate([
                { $group: { _id: '$sourceScorecard.ecosystem', count: { $sum: 1 } } }
            ]).toArray();

            const industryAgg = await collection.aggregate([
                { $group: { _id: '$action.metadata.industryId', count: { $sum: 1 } } }
            ]).toArray();

            const statusAgg = await collection.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).toArray();

            // Distribución de trust score
            const trustScoreAgg = await collection.aggregate([
                {
                    $bucket: {
                        groupBy: '$metadata.trustScore',
                        boundaries: [0, 30, 50, 70, 90, 101],
                        default: 'other',
                        output: {
                            count: { $sum: 1 }
                        }
                    }
                }
            ]).toArray();

            // Actividad reciente
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const recent24h = await collection.countDocuments({
                'metadata.createdAt': { $gte: last24h.toISOString() }
            });

            const recent7d = await collection.countDocuments({
                'metadata.createdAt': { $gte: last7d.toISOString() }
            });

            const recent30d = await collection.countDocuments({
                'metadata.createdAt': { $gte: last30d.toISOString() }
            });

            // Procesar resultados
            const byEcosystem: Record<string, number> = {};
            ecosystemAgg.forEach((item: any) => {
                byEcosystem[item._id || 'unknown'] = item.count;
            });

            const byIndustry: Record<string, number> = {};
            industryAgg.forEach((item: any) => {
                byIndustry[item._id || 'unknown'] = item.count;
            });

            const byStatus: Record<string, number> = {};
            statusAgg.forEach((item: any) => {
                byStatus[item._id || 'unknown'] = item.count;
            });

            // Procesar distribución de trust score
            const trustScoreDistribution = {
                critical: 0,
                poor: 0,
                average: 0,
                good: 0,
                excellent: 0
            };

            trustScoreAgg.forEach((item: any) => {
                if (item._id >= 0 && item._id < 30) trustScoreDistribution.critical = item.count;
                else if (item._id >= 30 && item._id < 50) trustScoreDistribution.poor = item.count;
                else if (item._id >= 50 && item._id < 70) trustScoreDistribution.average = item.count;
                else if (item._id >= 70 && item._id < 90) trustScoreDistribution.good = item.count;
                else if (item._id >= 90 && item._id <= 100) trustScoreDistribution.excellent = item.count;
            });

            return {
                totalMilestones: total,
                byEcosystem,
                byIndustry,
                byStatus,
                trustScoreDistribution,
                recentActivity: {
                    last24h: recent24h,
                    last7d: recent7d,
                    last30d: recent30d
                }
            };
        } catch (error: any) {
            logger.error('Error obteniendo estadísticas detalladas:', error);
            return {
                totalMilestones: 0,
                byEcosystem: {},
                byIndustry: {},
                byStatus: {},
                trustScoreDistribution: {
                    excellent: 0,
                    good: 0,
                    average: 0,
                    poor: 0,
                    critical: 0
                },
                recentActivity: {
                    last24h: 0,
                    last7d: 0,
                    last30d: 0
                }
            };
        }
    }

    /**
     * Valida una decisión antes de ingestión
     */
    validateDecision(decision: StandardGovernanceDecision): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validaciones requeridas
        if (!decision.ecosystem) {
            errors.push('Ecosistema es requerido');
        }

        if (!decision.dao_identifier) {
            errors.push('Identificador de DAO es requerido');
        }

        if (!decision.proposal_id) {
            errors.push('ID de propuesta es requerido');
        }

        // Validaciones de formato
        if (decision.description && decision.description.length > 1000) {
            warnings.push('Descripción muy larga (máximo 1000 caracteres)');
        }

        // Validaciones de datos numéricos
        const votesFor = Number(decision.votes_for || 0);
        const votesAgainst = Number(decision.votes_against || 0);

        if (votesFor < 0) {
            errors.push('Votos a favor no pueden ser negativos');
        }

        if (votesAgainst < 0) {
            errors.push('Votos en contra no pueden ser negativos');
        }

        // Validaciones de fechas
        if (decision.start_timestamp && decision.end_timestamp) {
            if (decision.start_timestamp > decision.end_timestamp) {
                errors.push('Fecha de inicio no puede ser posterior a fecha de fin');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Actualiza métricas de rendimiento
     */
    private updatePerformanceMetrics(processingTime: number, success: boolean): void {
        this.performanceMetrics.totalIngested++;

        if (success) {
            this.performanceMetrics.successfulIngestions++;
        } else {
            this.performanceMetrics.failedIngestions++;
        }

        // Actualizar tiempo promedio de procesamiento
        const currentAvg = this.performanceMetrics.averageProcessingTime;
        const newAvg = (currentAvg * (this.performanceMetrics.totalIngested - 1) + processingTime) / this.performanceMetrics.totalIngested;
        this.performanceMetrics.averageProcessingTime = newAvg;

        this.performanceMetrics.lastIngestionTime = new Date();
    }

    /**
     * Obtiene métricas de rendimiento
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalIngested > 0
                ? (this.performanceMetrics.successfulIngestions / this.performanceMetrics.totalIngested) * 100
                : 0
        };
    }

    /**
     * Verifica la salud del servicio
     */
    async healthCheck(): Promise<{
        service: 'healthy' | 'degraded' | 'unhealthy';
        mongoDB: 'connected' | 'disconnected';
        lastIngestion?: Date;
        stats?: {
            totalMilestones: number;
            byEcosystem: Record<string, number>;
        };
    }> {
        try {
            // Verificar conexión MongoDB
            const mongoHealth = await mongoDBClient.healthCheck();

            // Obtener estadísticas básicas
            let stats;
            if (mongoHealth.connected) {
                await mongoDBClient.connect();
                const collection = mongoDBClient.getMilestonesCollection();

                const total = await collection.countDocuments({});
                const aggregation = await collection.aggregate([
                    { $group: { _id: '$sourceScorecard.ecosystem', count: { $sum: 1 } } }
                ]).toArray();

                const byEcosystem: Record<string, number> = {};
                aggregation.forEach((item: any) => {
                    byEcosystem[item._id || 'unknown'] = item.count;
                });

                stats = {
                    totalMilestones: total,
                    byEcosystem
                };
            }

            return {
                service: mongoHealth.connected ? 'healthy' : 'degraded',
                mongoDB: mongoHealth.connected ? 'connected' : 'disconnected',
                lastIngestion: new Date(),
                stats
            };
        } catch (error) {
            logger.error('Error en health check de AtlasIngestionService:', error);
            return {
                service: 'unhealthy',
                mongoDB: 'disconnected'
            };
        }
    }
}

// Exportar instancia Singleton
export const atlasIngestionService = new AtlasIngestionService();
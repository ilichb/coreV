import { mongoDBClient } from '../../infrastructure/mongodb';
import { atlasIngestionService } from './atlas-ingestion.service';
import { walletHashService } from '../security/wallet-hash.service';
import { reputationEngineService } from '../reputation/reputation-engine.service';
import { avipViemAdapter, ScorecardSubmission } from '../../blockchain/avip-viem-adapter';
import { logger } from '../../utils/logger';

/**
 * Servicio para sincronizar perfiles de Builders como Milestones de ATLAS
 * Esto permite que los builders aparezcan en la búsqueda global de ATLAS
 */
export class BuilderIngestionService {
    
    /**
     * Sincroniza una lista de builders de Rootstock con ATLAS
     */
    async syncRootstockBuilders(builders: any[]): Promise<{
        total: number;
        synced: number;
        errors: string[];
    }> {
        logger.info(`👷 Sincronizando ${builders.length} builders de Rootstock con ATLAS...`);
        let synced = 0;
        const errors: string[] = [];

        for (const builder of builders) {
            try {
                const milestone = await this.transformBuilderToMilestone(builder);
                const result = await mongoDBClient.upsertMilestone(milestone, { suppressErrors: true });
                
                // Enqueue scorecard to AVIP (non-blocking)
                this.submitToAVIP(milestone).catch(err => logger.error('AVIP background submission failed', { err }));
                
                if (result.success) {
                    synced++;
                } else {
                    errors.push(`Error syncing ${builder.wallet}: ${result.error}`);
                }
            } catch (error: any) {
                errors.push(`Error processing ${builder.wallet}: ${error.message}`);
            }
        }

        logger.info(`✅ Sincronización de builders completada: ${synced}/${builders.length}`);
        return { total: builders.length, synced, errors };
    }

    /**
     * Transforma un perfil de builder a formato ATLAS Milestone
     */
    private async transformBuilderToMilestone(builder: any): Promise<any> {
        const address = builder.wallet.toLowerCase();
        const builderDid = `did:andromeda:rootstock:${address}`;
        
        // Generar un ID determinista para el hito de registro
        const atlasId = `ATLAS-RSK-BUILDER-${address.substring(2, 10)}`;

        // AVIP v2.0 Calculation
        const avipScore = await reputationEngineService.calculateScore({
            technical: parseFloat(builder.backerTotalAllocation || '0') * 0.1,
            governance: builder.reputation || 0,
            community: builder.totalProjects || 1
        });

        return {
            atlasId,
            status: 'VERIFIED',
            action: {
                type: 'BUILDER_REGISTRATION',
                description: `Perfil de Builder verificado en Rootstock Collective: ${builder.name || address}`,
                tags: ['rootstock', 'builder', 'verified', 'collective'],
                metadata: {
                    builderDid,
                    ecosystem: 'rootstock',
                    name: builder.name,
                    industryId: 'infrastructure',
                    subIndustryId: 'infrastructure.web3.protocol',
                    isWeb3: true,
                    avipScore // Persistent score injection
                }
            },
            sourceScorecard: {
                ecosystem: 'rootstock',
                metadata: {
                    ecosystem: 'rootstock',
                    is_builder_profile: true,
                    original_id: builder.id
                },
                description: builder.description || '',
                // Datos adicionales para persistencia
                wallet: address,
                allocation: builder.backerTotalAllocation
            },
            metadata: {
                trustScore: avipScore.total,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                impactMetrics: {
                    reputation: builder.reputation || 0,
                    projects: builder.totalProjects || 1,
                    allocation: builder.backerTotalAllocation
                },
                avipScore: avipScore // Detailed scoring for BuilderRanking.tsx
            },
            evidence: [
                {
                    type: 'ROOTSTOCK_COLLECTIVE_PROFILE',
                    uri: `https://collective.rootstock.io/builder/${address}`,
                    hash: walletHashService.hashWallet(address).walletHash
                }
            ],
            attestations: [
                {
                    signerDid: 'did:andromeda:system:builder-sync',
                    level: 2, // Nivel 2: Verificación de sistema contra API oficial
                    timestamp: new Date().toISOString(),
                    signature: 'system-verified-rootstock-api'
                }
            ]
        };
    }
    /**
     * Helper to submit a milestone to AVIP
     */
    private async submitToAVIP(milestone: any): Promise<void> {
        if (!milestone.metadata?.avipScore) {
            logger.warn('No AVIP score found in milestone, skipping submission');
            return;
        }

        const submission: ScorecardSubmission = {
            builderAddress: milestone.builder?.walletAddress || milestone.metadata?.walletAddress,
            totalScore: milestone.metadata.avipScore.total,
            metadata: milestone.metadata.avipScore,
            timestamp: new Date().toISOString()
        };

        if (!submission.builderAddress) {
            logger.warn('No builder address found for AVIP submission');
            return;
        }

        await avipViemAdapter.submitScorecard(submission);
    }
}

export const builderIngestionService = new BuilderIngestionService();

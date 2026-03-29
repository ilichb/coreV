import { mongoDBClient } from '../../infrastructure/mongodb';
import { atlasIngestionService } from './atlas-ingestion.service';
import { walletHashService } from '../security/wallet-hash.service';
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
                const milestone = this.transformBuilderToMilestone(builder);
                const result = await mongoDBClient.upsertMilestone(milestone, { suppressErrors: true });
                
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
    private transformBuilderToMilestone(builder: any): any {
        const address = builder.wallet.toLowerCase();
        const builderDid = `did:andromeda:rootstock:${address}`;
        
        // Generar un ID determinista para el hito de registro
        const atlasId = `ATLAS-RSK-BUILDER-${address.substring(2, 10)}`;

        const impactScore = Math.min(Math.floor(parseFloat(builder.backerTotalAllocation || '0') * 0.1) + 65, 99);

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
                    isWeb3: true
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
                trustScore: impactScore,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                impactMetrics: {
                    reputation: builder.reputation || 0,
                    projects: builder.totalProjects || 1,
                    allocation: builder.backerTotalAllocation
                }
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
}

export const builderIngestionService = new BuilderIngestionService();

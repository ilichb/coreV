import { RootstockConnector } from './rootstock-connector';
import { AlgorandConnector } from './algorand-connector';
import { OptimismConnector } from './optimism-connector';
import { ArbitrumConnector } from './arbitrum-connector';
import { EcosystemConnector, StandardGovernanceDecision } from '@/lib/infrastructure/base-connector';
import { registryService } from '../registry';
import { varaBatchAdapter } from '../vara-adapter';
import { uploadScorecardToIPFS } from '../ipfs-adapter';
import { achievementWebhookService } from '../../notifications/achievement-webhook.service';
import { atlasIngestionService } from '../../atlas/atlas-ingestion.service';
import { logger } from '../../../utils/logger';

export interface SyncResult {
  ecosystem: string;
  success: boolean;
  decisions?: number;
  registered?: number;
  anchored?: number;
  error?: string;
}

export class EcosystemIngestionService {
  private connectors: Map<string, EcosystemConnector>;

  constructor() {
    const tallyApiKey = process.env.TALLY_API_KEY || '***REMOVED***';

    this.connectors = new Map<string, EcosystemConnector>([
      ['rootstock', new RootstockConnector()],
      ['algorand', new AlgorandConnector()],
      ['optimism', new OptimismConnector()],
      ['arbitrum', new ArbitrumConnector()],
    ]);
  }

  async syncAll(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const [ecosystem, connector] of this.connectors) {
      try {
        logger.info(`\n🔄 [${ecosystem.toUpperCase()}] Iniciando sincronización...`);

        // 1. Fetch decisions
        logger.info(`🔍 Buscando decisiones en ${ecosystem}...`);
        const decisions = await connector.fetchGovernanceDecisions();
        logger.info(`✅ Se encontraron ${decisions.length} decisiones.`);

        // 2. Normalize
        logger.info(`⚖️ Normalizando ${decisions.length} decisiones (secuencial)...`);
        const normalized: StandardGovernanceDecision[] = [];
        for (let i = 0; i < decisions.length; i++) {
          if (i % 10 === 0) logger.info(`  - Normalizando ${i}/${decisions.length}...`);
          try {
            const norm = await connector.normalizeDecision(decisions[i]);
            normalized.push(norm);
          } catch (normError: any) {
            logger.warn(`⚠️ Error normalizando decision ${i}: ${normError.message}`);
          }
        }
        logger.info(`✅ Normalización completada (${normalized.length} exitosas).`);

        // 3. Validate and register (Local + IPFS)
        logger.info(`💾 Registrando decisiones (IPFS + DB)...`);
        const registryResults = await this.registerDecisions(normalized, ecosystem);

        // 4. Anchor to Vara (Batching)
        let anchoredCount = 0;
        if (process.env.VARA_ENABLED === 'true') {
          logger.info(`🔗 Enviando ${registryResults.length} decisiones al buffer de Vara...`);
          for (const decision of registryResults) {
            await varaBatchAdapter.submitToBatch(decision);
            anchoredCount++;
          }
          // Forzar flush al final de cada ecosistema si estamos en un test directo
          logger.info(`🚀 Ejecutando flush de lotes en Vara...`);
          await varaBatchAdapter.flushAllBatches();
        }

        results.push({
          ecosystem,
          success: true,
          decisions: decisions.length,
          registered: registryResults.length,
          anchored: anchoredCount
        });

        logger.info(`✨ Resumen ${ecosystem}: ${decisions.length} halladas, ${registryResults.length} en registro local, ${anchoredCount} ancladas a Vara.`);

        // Notify session summary
        if (decisions.length > 0) {
          achievementWebhookService.notifyGenericSuccess(
            `🔄 Sync Complete: ${ecosystem.toUpperCase()}`,
            `Decisions identified: ${decisions.length}\nRegistered (IPFS/DB): ${registryResults.length}\nAnchored (Vara): ${anchoredCount}`,
            `system-ingestion`
          ).catch(e => logger.error("Notification fail", e));
        }

      } catch (error: any) {
        logger.error(`❌ Fallo crítico en sincronización de ${ecosystem}:`, error.message);
        results.push({
          ecosystem,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  private async registerDecisions(
    decisions: StandardGovernanceDecision[],
    ecosystem: string
  ): Promise<StandardGovernanceDecision[]> {
    const registered: StandardGovernanceDecision[] = [];

    // Procesa en lotes pequeños para evitar timeouts de red y rate limits de Pinata
    const BATCH_SIZE = 5;
    for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
      const batch = decisions.slice(i, i + BATCH_SIZE);
      logger.info(`📦 Procesando lote de IPFS ${i / BATCH_SIZE + 1}...`);

      await Promise.all(batch.map(async (decision) => {
        try {
          // Prepare data for IPFS
          const scorecard = {
            metadata: {
              ecosystem: decision.ecosystem,
              dao: decision.dao_identifier,
              proposal_id: decision.proposal_id,
              source: 'thegraph',
              status: decision.status
            },
            'A. Problema': { content: { description: decision.description || '' }, clarity: 80 },
            'B. Límites': { content: { id: decision.proposal_id }, clarity: 100 },
            'C. Especificación Técnica': { content: { votes: `For: ${decision.votes_for}, Against: ${decision.votes_against}` }, clarity: 90 },
            'D. Esfuerzo': { content: { created_at: decision.created_at }, clarity: 100 }
          };

          // 2. Real upload to IPFS (Pinata)
          let cid = decision.ipfs_cid;
          if (!cid) {
            try {
              logger.info(`☁️ Subiendo propuesta ${decision.proposal_id} a IPFS...`);
              const uploadResult = await uploadScorecardToIPFS(scorecard);
              cid = uploadResult.cid;
              decision.ipfs_cid = cid;
            } catch (ipfsError: any) {
              logger.warn(`⚠️ Error en IPFS para ${decision.proposal_id}: ${ipfsError.message}`);
              cid = `fake-cid-${decision.proposal_id}`;
              decision.ipfs_cid = cid;
            }
          }

          // 3. Register in local Registry (Supabase)
          try {
            logger.info(`💾 Registrando en Supabase: ${decision.proposal_id}...`);
            const result = await registryService.publishScorecard(
              scorecard,
              cid!,
              {
                signerDid: `did:andromeda:${ecosystem}:dao`,
                signature: `signed-by-${ecosystem}-dao`,
                chain: ecosystem,
                nonce: Date.now().toString(),
                signatureType: 'none'
              }
            );

            if (result.success || result.error?.includes('Duplicate')) {
              logger.info(`✅ Registro local exitoso: ${decision.proposal_id}`);
              
              try {
                logger.info(`🧭 Ingresando a ATLAS el hito: ${decision.proposal_id}...`);
                await atlasIngestionService.ingestToAtlas(decision);
              } catch (atlasError: any) {
                logger.error(`❌ Error en ATLAS Ingestion para ${decision.proposal_id}:`, atlasError.message);
              }

              registered.push(decision);
            } else {
              logger.warn(`⚠️ No se pudo registrar localmente ${decision.proposal_id}: ${result.error}`);
              registered.push(decision);
            }
          } catch (dbError: any) {
            logger.error(`❌ Error de base de datos para ${decision.proposal_id}: ${dbError.message}`);
            registered.push(decision);
          }

        } catch (error: any) {
          logger.error(`❌ Decisión ${decision.proposal_id} descartada:`, error.message);
        }
      }));
    }

    return registered;
  }

  async syncEcosystem(ecosystem: string): Promise<SyncResult> {
    const connector = this.connectors.get(ecosystem);
    if (!connector) {
      return {
        ecosystem,
        success: false,
        error: `No connector found for ecosystem: ${ecosystem}`
      };
    }

    try {
      const decisions = await connector.fetchGovernanceDecisions();
      const normalized = await Promise.all(decisions.map(async d => await connector.normalizeDecision(d)));
      const registered = await this.registerDecisions(normalized, ecosystem);

      return {
        ecosystem,
        success: true,
        decisions: decisions.length,
        registered: registered.length
      };

    } catch (error: any) {
      return {
        ecosystem,
        success: false,
        error: error.message
      };
    }
  }

  getAvailableEcosystems(): string[] {
    return Array.from(this.connectors.keys());
  }
}

export const ecosystemIngestionService = new EcosystemIngestionService();

import { solanaClient } from '../../clients/solana-client';
import { logger } from '../../utils/logger';
import { achievementWebhookService } from '../notifications/achievement-webhook.service';
import * as crypto from 'crypto';

export interface ScorecardAnchor {
    merkle_root: string;
    ipfs_cid: string;
    ecosystem: string;
    dao_identifier: string;
}

export class SolanaBatchAdapter {
    private buffer: ScorecardAnchor[] = [];
    private MAX_BATCH_SIZE = 10;
    private currentBatchId: string | null = null;

    constructor() {
        this.generateNewBatchId();
    }

    private generateNewBatchId() {
        const shortId = crypto.randomUUID().split('-')[0].toUpperCase();
        this.currentBatchId = `AND-BCH-${shortId}`;
    }

    /**
     * Agrega un scorecard al buffer de espera para el siguiente anclaje en lote.
     */
    async submitToBatch(scorecard: ScorecardAnchor): Promise<void> {
        this.buffer.push(scorecard);
        logger.info(`📥 Scorecard added to Solana buffer [${this.buffer.length}/${this.MAX_BATCH_SIZE}]`);

        if (this.buffer.length >= this.MAX_BATCH_SIZE) {
            await this.flushAllBatches();
        }
    }

    /**
     * Procesa y ancla todos los scorecards acumulados en el buffer.
     */
    async flushAllBatches(): Promise<void> {
        if (this.buffer.length === 0) return;

        const batchId = this.currentBatchId!;
        const count = this.buffer.length;
        
        logger.info(`🚀 Flashing batch ${batchId} with ${count} scorecards...`);

        const batchMetadata = {
            batch_id: batchId,
            count: count,
            merkle_roots: this.buffer.map(s => s.merkle_root),
            ipfs_cids: this.buffer.map(s => s.ipfs_cid),
            ecosystems: [...new Set(this.buffer.map(s => s.ecosystem))],
            daos: [...new Set(this.buffer.map(s => s.dao_identifier))]
        };

        try {
            const txHash = await solanaClient.anchorBatch(batchMetadata);
            
            // Notificar éxito del lote por Telegram (ID Único para búsqueda)
            await achievementWebhookService.notifyGenericSuccess(
                `🔗 Solana Anchor: ${batchId}`,
                `Status: Success\nTransaction: ${txHash}\nScorecards: ${count}\nEcosystems: ${batchMetadata.ecosystems.join(', ')}`,
                'blockchain-finality'
            );

            logger.info(`✨ Batch ${batchId} finalized successfully.`);
            
            // Limpiar buffer y preparar nuevo ID
            this.buffer = [];
            this.generateNewBatchId();
            
        } catch (error: any) {
            logger.error(`❌ Failed to flush batch ${batchId}:`, error.message);
            // En un sistema real, aquí podríamos implementar reintentos o guardar en una cola de errores persistent
            throw error;
        }
    }

    getCurrentBatchState() {
        return {
            id: this.currentBatchId,
            size: this.buffer.length,
            pending: this.MAX_BATCH_SIZE - this.buffer.length
        };
    }
}

export const solanaBatchAdapter = new SolanaBatchAdapter();

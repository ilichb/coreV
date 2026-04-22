/**
 * Solana Ingestion Service — Andromeda Core
 * 
 * Convierte transacciones del programa AndromedaRegistry (Solana) en 
 * SignedScorecards y los inyecta en el pipeline AVIP → ATLAS existente.
 * 
 * ⚠️  Solo agrega datos nuevos. No modifica flujos existentes de
 *     Rootstock, Arbitrum ni Optimism.
 */

import { YellowstoneConnector } from '../../clients/yellowstone-connector';
import { atlasOrchestrator }    from './atlas-orchestrator';
import { avipViemAdapter }      from './avip-viem-adapter';
import { logger }               from '../../utils/logger';
import { createHash }           from 'crypto';
import type { SignedScorecard } from '../../../types/coordination/scorecard';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Convierte datos de una tx de AndromedaRegistry en un SignedScorecard
 * compatible con el pipeline ATLAS existente.
 * 
 * Nivel de verificación asignado: LEVEL_2_PROTOCOL_CONSENSUS
 * (la tx está confirmada on-chain en Solana Devnet)
 */
function buildScorecardFromSolanaTx(data: {
  signature: string;
  submitter: string;
  slot: bigint;
  timestamp: number;
}): SignedScorecard {
  const did     = `did:andromeda:sol:${data.submitter}`;
  const now     = new Date(data.timestamp).toISOString();
  const nonce   = createHash('sha256')
    .update(`${data.signature}:${data.slot}`)
    .digest('hex')
    .slice(0, 32);

  // Construir scorecard con estructura compatible con AtlasOntologyAdapter
  const scorecard: SignedScorecard = {
    'A. Problema': {
      clarity:      0.85,
      coherence:    0.85,
      completeness: 0.85,
      content: {
        source:      'solana_on_chain',
        program:     'AndromedaRegistry',
        slot:        data.slot.toString(),
        description: `Milestone registrado on-chain en Solana (slot ${data.slot})`,
      },
      metadata: { version: '2.0', timestamp: now },
    },
    'B. Límites': {
      clarity:      0.8,
      coherence:    0.8,
      completeness: 0.8,
      content: {
        network:     'solana-devnet',
        program_id:  'FBYJTCxPU6PsGLwasEV8YemKsKaMgSkEfPKrudpLbhYx',
        tx_signature: data.signature,
      },
      metadata: { version: '2.0', timestamp: now },
    },
    'C. Especificación Técnica': {
      clarity:      0.9,
      coherence:    0.9,
      completeness: 0.9,
      content: {
        consensus_mechanism: 'Proof of History + Proof of Stake',
        verification_level:  2, // LEVEL_2_PROTOCOL_CONSENSUS
        immutability:        'on-chain',
        submitter_pubkey:    data.submitter,
      },
      metadata: { version: '2.0', timestamp: now },
    },
    'D. Esfuerzo': {
      clarity:      0.8,
      coherence:    0.8,
      completeness: 0.8,
      content: {
        chain:       'solana',
        ecosystem:   'solana-devnet',
        slot:        data.slot.toString(),
      },
      metadata: { version: '2.0', timestamp: now },
    },
    metadata: {
      version:   '2.0',
      created:   now,
      updated:   now,
      authorDid: did,
      signature: data.signature,
    },
    // Campos de SignedScorecard
    signature: data.signature,
    signer:    data.submitter,
    timestamp: now,
    nonce,
  };

  return scorecard;
}

// ─────────────────────────────────────────────
// Servicio principal
// ─────────────────────────────────────────────

class SolanaIngestionService {
  private connector: YellowstoneConnector | null = null;
  private processed = 0;
  private errors    = 0;

  /**
   * Inicia el conector y comienza a escuchar transacciones.
   * Llamar desde un API route de inicialización o al arrancar el servidor.
   */
  async start(): Promise<void> {
    if (this.connector?.running) {
      logger.info('ℹ️  SolanaIngestionService: Already running');
      return;
    }

    logger.info('🚀 SolanaIngestionService: Starting...');

    this.connector = new YellowstoneConnector(async (data) => {
      await this.processMilestoneTx(data);
    });

    await this.connector.start();
    logger.info('✅ SolanaIngestionService: Listening for AndromedaRegistry milestones');
  }

  async stop(): Promise<void> {
    await this.connector?.stop();
    this.connector = null;
    logger.info('🛑 SolanaIngestionService: Stopped');
  }

  /**
   * Procesa una transacción detectada:
   * 1. Construye un SignedScorecard desde los datos on-chain
   * 2. Lo envía a AVIP para procesamiento matemático de reputación
   * 3. Lo indexa en ATLAS
   */
  private async processMilestoneTx(data: {
    signature: string;
    submitter: string;
    slot: bigint;
    timestamp: number;
  }): Promise<void> {
    try {
      logger.info(`⚙️  SolanaIngestionService: Processing tx ${data.signature.slice(0, 20)}...`);

      // 1. Construir SignedScorecard compatible con el pipeline existente
      const scorecard = buildScorecardFromSolanaTx(data);

      // 2. Enviar a AVIP (motor matemático de reputación)
      //    Mismo método que usa publish/route.ts para scorecards EVM
      const avipResult = await avipViemAdapter.submitScorecard(scorecard);

      if (!avipResult.queued) {
        logger.warn(`⚠️  SolanaIngestionService: AVIP submission failed: ${avipResult.error}`);
        // No abortamos — el scorecard igual va a ATLAS con reputación base
      } else {
        logger.info(`✅ SolanaIngestionService: AVIP batch queued successfully`);
      }

      // 3. Indexar en ATLAS — mismo pipeline que Rootstock/Arbitrum/Optimism
      //    ipfsCid vacío porque viene de Solana on-chain (no de IPFS)
      //    clarityDelta calculado como promedio de los 4 pilares
      const clarityDelta = (
        scorecard['A. Problema'].clarity +
        scorecard['B. Límites'].clarity +
        scorecard['C. Especificación Técnica'].clarity +
        scorecard['D. Esfuerzo'].clarity
      ) / 4;

      const atlasResult = await atlasOrchestrator.executeFullWorkflow(
        scorecard,
        '',          // ipfsCid — on-chain, no IPFS
        clarityDelta,
        { skipIpfsUpload: true }
      );

      if (atlasResult.success) {
        this.processed++;
        logger.info(`🗺️  SolanaIngestionService: ATLAS indexed → ${atlasResult.transformation?.milestone.atlasId} (total: ${this.processed})`);
      } else {
        this.errors++;
        logger.error(`❌ SolanaIngestionService: ATLAS failed: ${atlasResult.errors.join(', ')}`);
      }

    } catch (err: any) {
      this.errors++;
      logger.error(`❌ SolanaIngestionService: processMilestoneTx failed: ${err.message}`);
    }
  }

  getStats() {
    return {
      running:   this.connector?.running ?? false,
      processed: this.processed,
      errors:    this.errors,
    };
  }
}

// Singleton — igual que atlasOrchestrator y avipViemAdapter
export const solanaIngestionService = new SolanaIngestionService();

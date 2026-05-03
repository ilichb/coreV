/**
 * Solana Ingestion Service — Andromeda Core
 * 
 * Convierte transacciones del programa AndromedaRegistry (Solana) en 
 * SignedScorecards y los inyecta en el pipeline AVIP → ATLAS existente.
 * 
 * ⚠️  Solo agrega datos nuevos. No modifica flujos existentes de
 *     Rootstock, Arbitrum ni Optimism.
 * 
 * 🔧 PATCH v3.1: start() idempotente — verifica conexión activa antes de reiniciar.
 */

import { YellowstoneConnector } from '../../clients/yellowstone-connector';
import { atlasOrchestrator }    from './atlas-orchestrator';
import { avipViemAdapter }      from './avip-viem-adapter';
import { reputationEngineService } from '../reputation/reputation-engine.service';
import { mongoDBClient }        from '../../infrastructure/mongodb';
import { logger }               from '../../utils/logger';
import { createHash }           from 'crypto';
import type { SignedScorecard } from '../../../types/coordination/scorecard';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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
        verification_level:  2,
        immutability:        'on-chain',
        submitter_pubkey:    data.submitter,
        ecosystem:           'solana',
      },
      metadata: { version: '2.0', timestamp: now },
    },
    'D. Esfuerzo': {
      clarity:      0.8,
      coherence:    0.8,
      completeness: 0.8,
      content: {
        chain:       'solana',
        ecosystem:   'solana',
        slot:        data.slot.toString(),
        tags:        ['solana', 'on-chain', 'milestone', 'governance', 'andromeda-solana'],
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
  private startPromise: Promise<void> | null = null;

  /**
   🔧 PATCH: start() idempotente — si ya está corriendo o iniciándose, no duplica.
   */
  async start(): Promise<void> {
    // Si ya está corriendo, salir inmediatamente
    if (this.connector?.running) {
      logger.info('ℹ️  SolanaIngestionService: Already running (connector active)');
      return;
    }

    // Si hay un start en progreso, esperar a que termine
    if (this.startPromise) {
      logger.info('ℹ️  SolanaIngestionService: Start already in progress, awaiting...');
      await this.startPromise;
      return;
    }

    // Iniciar (con protección de concurrencia)
    this.startPromise = this.doStart();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  private async doStart(): Promise<void> {
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
    this.startPromise = null;
    logger.info('🛑 SolanaIngestionService: Stopped');
  }

  private async processMilestoneTx(data: {
    signature: string;
    submitter: string;
    slot: bigint;
    timestamp: number;
  }): Promise<void> {
    try {
      logger.info(`⚙️  SolanaIngestionService: Processing tx ${data.signature.slice(0, 20)}...`);

      const scorecard = buildScorecardFromSolanaTx(data);

      const avipScorecard = {
        id: data.signature.slice(0, 32),
        daoId: `did:andromeda:sol:${data.submitter}`,
        proposalId: data.slot.toString(),
        userId: data.submitter,
        vote: 'MILESTONE_SUBMIT',
        weight: 0.85,
        timestamp: data.timestamp,
        metadata: {
          chain: 'solana-devnet',
          program: 'AndromedaRegistry',
          signature: data.signature,
          atlasId: scorecard.metadata.authorDid,
        }
      };
      const avipResult = await avipViemAdapter.submitScorecard(avipScorecard);

      if (!avipResult.queued) {
        logger.warn(`⚠️  SolanaIngestionService: AVIP submission failed: ${avipResult.error}`);
      } else {
        logger.info(`✅ SolanaIngestionService: AVIP batch queued successfully`);
      }

      const clarityDelta = (
        scorecard['A. Problema'].clarity +
        scorecard['B. Límites'].clarity +
        scorecard['C. Especificación Técnica'].clarity +
        scorecard['D. Esfuerzo'].clarity
      ) / 4;

      const atlasResult = await atlasOrchestrator.executeFullWorkflow(
        scorecard,
        '',
        clarityDelta,
        { skipIpfsUpload: true }
      );

      if (atlasResult.success) {
        this.processed++;
        const atlasId = atlasResult.transformation?.milestone.atlasId;
        logger.info(`🗺️  SolanaIngestionService: ATLAS indexed → ${atlasId} (total: ${this.processed})`);

        // ── AVIP Loop Closure ──────────────────────────────────────────────
        // Flush AVIP batch and write trustScore back to the MongoDB document.
        // Without this, scores stay at 0 in the registry and scorecards.
        try {
          const flushResult = await avipViemAdapter.flush();
          if (flushResult.success && atlasId) {
            // trustScore derivado del weight del batch confirmado on-chain
            const trustScore = Math.min(100, Math.round(avipScorecard.weight * 100));
            const db = await mongoDBClient.getDb();
            await db.collection('atlas_milestones').updateOne(
              { 'metadata.atlasId': atlasId },
              {
                $set: {
                  'metadata.trustScore': trustScore,
                  'metadata.avipBatchId': flushResult.batchId || null,
                  'metadata.avipTxHash': flushResult.txHash || null,
                  'metadata.avipVerifiedAt': new Date().toISOString(),
                }
              }
            );
            logger.info(`🛡️  SolanaIngestionService: trustScore ${trustScore} written back → ${atlasId}`);
          }
        } catch (avipErr: any) {
          // Non-fatal: AVIP writeback failure should not block ingestion
          logger.warn(`⚠️  SolanaIngestionService: AVIP writeback skipped: ${avipErr.message}`);
        }
        // ──────────────────────────────────────────────────────────────────
      } else {
        this.errors++;
        logger.error(`❌ SolanaIngestionService: ATLAS failed: ${atlasResult.errors.join(', ')}`);
      }

    } catch (err: any) {
      this.errors++;
      logger.error(`❌ SolanaIngestionService: processMilestoneTx failed: ${err.message}`);
    }
  }

  async ingestGovernanceProposals(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      const res = await fetch('http://localhost:3000/api/solana/governance?limit=20');
      const data = await res.json();

      if (!data.success || !data.proposals) {
        logger.warn('⚠️  SolanaIngestionService: No governance proposals returned');
        return { processed, errors };
      }

      logger.info(`🏛️  SolanaIngestionService: Processing ${data.proposals.length} governance proposals`);

      for (const proposal of data.proposals) {
        try {
          const now = new Date().toISOString();
          const did = `did:andromeda:sol:${proposal.realm}`;

          const scorecard: SignedScorecard = {
            'A. Problema': {
              clarity: 0.85, coherence: 0.85, completeness: 0.85,
              content: {
                source: 'solana_governance',
                dao: proposal.dao_identifier,
                title: proposal.title,
                description: proposal.description,
                tags: proposal.tags,
              },
              metadata: { version: '2.0', timestamp: now },
            },
            'B. Límites': {
              clarity: 0.8, coherence: 0.8, completeness: 0.8,
              content: {
                network: 'solana',
                program: proposal.program,
                realm: proposal.realm,
                proposal_id: proposal.proposal_id,
                status: proposal.status,
              },
              metadata: { version: '2.0', timestamp: now },
            },
            'C. Especificación Técnica': {
              clarity: 0.9, coherence: 0.9, completeness: 0.9,
              content: {
                governance_type: 'spl-governance',
                verification_level: 2,
                explorer_url: proposal.explorer_url,
                ecosystem: 'solana',
              },
              metadata: { version: '2.0', timestamp: now },
            },
            'D. Esfuerzo': {
              clarity: 0.8, coherence: 0.8, completeness: 0.8,
              content: {
                chain: 'solana',
                ecosystem: 'solana',
                dao: proposal.dao_identifier,
                tags: ['solana', 'governance', 'realms', proposal.dao_identifier],
              },
              metadata: { version: '2.0', timestamp: now },
            },
            metadata: {
              version: '2.0',
              created: now,
              updated: now,
              authorDid: did,
            },
            signature: `sol:${proposal.proposal_id}:${proposal.realm}:governance`,
            signer: proposal.realm,
            timestamp: now,
            nonce: (proposal.proposal_id + proposal.realm).slice(0, 32),
          };

          const avipScorecard = {
            id: proposal.proposal_id.slice(0, 32),
            daoId: `did:andromeda:sol:${proposal.realm}`,
            proposalId: proposal.proposal_id,
            userId: proposal.proposal_id,
            vote: proposal.status,
            weight: 0.85,
            timestamp: Date.now(),
            metadata: {
              chain: 'solana',
              dao: proposal.dao_identifier,
              title: proposal.title,
              tags: proposal.tags,
            }
          };

          const avipResult = await avipViemAdapter.submitScorecard(avipScorecard);
          if (!avipResult.queued) {
            logger.warn(`⚠️  AVIP skip: ${proposal.title.slice(0, 30)}`);
          }

          const clarityDelta = 0.8375;
          const atlasResult = await atlasOrchestrator.executeFullWorkflow(
            scorecard, '', clarityDelta, { skipIpfsUpload: true }
          );

          if (atlasResult.success) {
            processed++;
            logger.info(`🏛️  Governance indexed: ${proposal.title.slice(0, 40)} → ${atlasResult.transformation?.milestone.atlasId?.slice(0, 16)}`);
          } else {
            errors++;
          }
        } catch (err: any) {
          errors++;
          logger.error(`❌ Governance proposal failed: ${err.message}`);
        }
      }
    } catch (err: any) {
      logger.error(`❌ ingestGovernanceProposals failed: ${err.message}`);
      errors++;
    }

    return { processed, errors };
  }

  getStats() {
    return {
      running:   this.connector?.running ?? false,
      processed: this.processed,
      errors:    this.errors,
    };
  }
}

// Singleton global compartido entre instrumentation.ts y API routes
const GLOBAL_KEY = '__solanaIngestionService__';
const globalObj = global as any;

const existing = globalObj[GLOBAL_KEY];
if (existing === undefined) {
  globalObj[GLOBAL_KEY] = new SolanaIngestionService();
}

export const solanaIngestionService: SolanaIngestionService = globalObj[GLOBAL_KEY];

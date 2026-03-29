import { varaClient, ProjectMetadata, BatchSubmission } from "../../clients/vara-client";
import { StandardGovernanceDecision } from "@/lib/infrastructure/base-connector";
import { achievementWebhookService } from "../notifications/achievement-webhook.service";
import { logger } from '../../utils/logger';

export interface VaraSubmitResult {
  success: boolean;
  txHash?: string;
  blockHash?: string;
  error?: string;
  event?: RegistryEvent;
}

export interface ChainAddress {
  chain: string;    // "eth", "sol", "pol", "avax", "vara"
  address: string;  // 0x... o pubkey base58
}

export interface BuilderIdentity {
  did: string;
  reputation_score: number;
  total_projects: number;
  first_seen: number;
  cross_chain_addresses: ChainAddress[];
  last_activity: number;
}

export interface Signature {
  signer_did: string;
  signature_type: string;
  signature: string;
}

export interface DecisionMetadata {
  outcome: string;
  votes_for: number;
  votes_against: number;
  clarity_score: number;
  funding_amount?: string;
  milestones?: number;
}

export interface ProjectRecord {
  canonical_hash: string;
  ipfs_cid: string;
  ecosystem: string;
  dao_identifier: string;
  builder_did: string;
  builder_actor: string;
  submission_timestamp: number;
  signatures: Signature[];
  tags: string[];
  decision_metadata?: DecisionMetadata;
}

export interface RegistryEvent {
  type: 'ProjectSubmitted' | 'BuilderRegistered' | 'DaoRegistered' | 'DaoVerified' | 'BatchSubmitted';
  data: any;
}

export interface IoBuilderHistory {
  builder_did: string;
  identity: BuilderIdentity;
  projects: ProjectRecord[];
  total_count: number;
}

export interface IoEcosystemView {
  ecosystem: string;
  stats: any;
  recent_projects: ProjectRecord[];
  top_builders: BuilderIdentity[];
}

export interface IoDaoView {
  dao: any;
  projects: ProjectRecord[];
  builder_count: number;
}

export interface IoSearchResults {
  by_tags: ProjectRecord[];
  by_ecosystem: ProjectRecord[];
  by_builder: ProjectRecord[];
  total_count: number;
}

export class VaraRegistryAdapter {
  protected contractAddress: string | null = null;
  protected endpoint: string;
  protected enabled: boolean;
  protected initialized: boolean = false;
  protected simulationMode: boolean = false;

  constructor() {
    this.endpoint = process.env.VARA_NETWORK_ENDPOINT || process.env.VARA_NODE_URL || 'wss://testnet.vara.network';
    this.contractAddress = process.env.VARA_CONTRACT_ADDRESS || null;
    this.enabled = process.env.VARA_ENABLED === 'true';
    this.simulationMode = process.env.VARA_SIMULATION_MODE === 'true';
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (!this.enabled || !this.contractAddress) return false;

    try {
      if (!this.simulationMode) await varaClient.connect();
      this.initialized = true;
      return true;
    } catch (error: any) {
      logger.error('❌ Vara initialization failed:', error.message);
      return false;
    }
  }

  async submitProject(metadata: ProjectMetadata): Promise<VaraSubmitResult> {
    if (!this.initialized) await this.initialize();
    try {
      if (this.simulationMode) {
        return { success: true, txHash: 'sim_' + Date.now(), event: { type: 'ProjectSubmitted', data: metadata } };
      } else {
        const result = await varaClient.submitProject(metadata);
        return { success: true, txHash: result.projectId, event: { type: 'ProjectSubmitted', data: result } };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async submitScorecard(canonicalHash: string, ipfsCid: string, builderDid: string): Promise<VaraSubmitResult> {
    const metadata: ProjectMetadata = {
      merkle_root: canonicalHash,
      ipfs_cid: ipfsCid,
      ecosystem: 'andromeda-core',
      dao_identifier: 'core-validation',
      builder_did: builderDid,
      tags: ['scorecard', 'validated']
    };
    return this.submitProject(metadata);
  }

  isVaraEnabled(): boolean { return this.enabled && this.contractAddress !== null; }
  getStatus(): any { return { enabled: this.enabled, initialized: this.initialized, contractAddress: this.contractAddress, endpoint: this.endpoint }; }
}

/**
 * VaraBatchAdapter
 * Optimized adapter that buffers submissions and sends them in batches to reduce gas costs.
 */
export class VaraBatchAdapter extends VaraRegistryAdapter {
  private batchBuffer: Map<string, StandardGovernanceDecision[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private batchCounter: number = 0;

  private readonly BATCH_SIZE = 1;
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_BATCH_SIZE = 100;

  async submitToBatch(decision: StandardGovernanceDecision): Promise<void> {
    if (!this.isVaraEnabled()) return;
    const builderKey = decision.builder_did || 'unknown';

    if (!this.batchBuffer.has(builderKey)) {
      this.batchBuffer.set(builderKey, []);
    }

    const buffer = this.batchBuffer.get(builderKey)!;
    buffer.push(decision);

    logger.info(`📦 Added decision to Vara batch buffer for ${builderKey}. Size: ${buffer.length}`);

    if (buffer.length >= this.BATCH_SIZE) {
      await this.flushBuilderBatch(builderKey);
    } else {
      this.scheduleBatchFlush(builderKey);
    }
  }

  private async flushBuilderBatch(builderKey: string): Promise<void> {
    const decisions = this.batchBuffer.get(builderKey) || [];
    if (decisions.length === 0) return;

    const timer = this.batchTimers.get(builderKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(builderKey);
    }

    const chunks = this.chunkArray(decisions, this.MAX_BATCH_SIZE);
    for (const chunk of chunks) {
      await this.submitBatchChunk(builderKey, chunk);
    }

    this.batchBuffer.delete(builderKey);
  }

  private async submitBatchChunk(builderKey: string, decisions: StandardGovernanceDecision[]): Promise<void> {
    logger.info(`🚀 Procesando 50 envíos individuales para ${builderKey}...`);

    let successCount = 0;
    for (const decision of decisions) {
      const metadata: ProjectMetadata = {
        merkle_root: decision.proposal_id,
        ipfs_cid: decision.ipfs_cid || `fake_cid_${decision.proposal_id}`,
        ecosystem: decision.ecosystem,
        dao_identifier: decision.dao_identifier,
        builder_did: decision.builder_did || 'andromeda-dao',
        tags: decision.tags || ['governance', decision.ecosystem]
      };

      try {
        if (this.simulationMode) {
          logger.info(`✅ [Sim] Proyecto ${decision.proposal_id} anclado.`);
          successCount++;
        } else {
          await varaClient.submitProject(metadata);
          successCount++;
          logger.info(`✅ [Vara] Proyecto ${decision.proposal_id} anclado con éxito (${successCount}/${decisions.length})`);
          // Pequeña pausa para asegurar sincronía de nonce si fuera necesario
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        logger.error(`❌ Error anclando ${decision.proposal_id}:`, error.message);
      }
    }

    logger.info(`🏁 Batch procesado: ${successCount} exitosos de ${decisions.length}.`);

    // Trigger System Notification
    if (successCount > 0) {
      achievementWebhookService.notifyGenericSuccess(
        "📦 Vara Batch Anchored",
        `Successfully anchored ${successCount} governance decisions to Vara Network testnet.`,
        builderKey
      ).catch(err => logger.error("Notification trigger failed:", err));
    }
  }

  private scheduleBatchFlush(builderKey: string): void {
    if (this.batchTimers.has(builderKey)) return;

    const timer = setTimeout(() => {
      this.flushBuilderBatch(builderKey);
    }, this.BATCH_TIMEOUT);

    this.batchTimers.set(builderKey, timer);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async flushAllBatches(): Promise<void> {
    const builderKeys = Array.from(this.batchBuffer.keys());
    for (const builderKey of builderKeys) {
      await this.flushBuilderBatch(builderKey);
    }
  }

  getBatchStats(): { [builderKey: string]: number } {
    const stats: { [builderKey: string]: number } = {};
    for (const [builderKey, decisions] of this.batchBuffer.entries()) {
      stats[builderKey] = decisions.length;
    }
    return stats;
  }
}

export const varaAdapter = new VaraRegistryAdapter();
export const varaBatchAdapter = new VaraBatchAdapter();

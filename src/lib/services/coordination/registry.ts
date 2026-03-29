import { supabase } from "./supabase";
import { autoValidate } from "../../auto-validator/engine";
import { cryptoGuard } from "./crypto-guard";
import { generateSnapshotHash } from "./utils/canonical";

// TIPOS FUENTE DE VERDAD
interface BaseRegistryEntry {
  scorecard_id: string;
  canonical_hash: string;
  published_at: string;
  state: 'PUBLISHED' | 'ARCHIVED';
}

interface BaseRegistrySnapshot {
  version: 'v1';
  entries: BaseRegistryEntry[];
  snapshot_hash: string;
}

export interface ExtendedRegistryEntry extends BaseRegistryEntry {
  id?: string;
  signature_metadata?: {
    signer_did: string;
    signature: string;
    chain: string;
    nonce: string;
    signature_type: 'EIP-712' | 'Ed25519' | 'none';
  };
}

interface DatabaseRegistryEntry {
  id?: string;
  scorecard_id: string;
  canonical_hash: string;
  published_at: string;
  state: 'PUBLISHED' | 'ARCHIVED';
  metadata?: {
    signer_did?: string;
    signature?: string;
    chain?: string;
    nonce?: string;
    signature_type?: 'EIP-712' | 'Ed25519' | 'none';
  };
}

class RegistryService {
  async getSnapshot(): Promise<BaseRegistrySnapshot> {
    const { data: dbEntries, error } = await supabase
      .from('v_registry_snapshot')
      .select('*')
      .order('published_at', { ascending: true });
    
    if (error) throw error;
    
    const entries: BaseRegistryEntry[] = (dbEntries || []).map((dbEntry: DatabaseRegistryEntry) => ({
      scorecard_id: dbEntry.scorecard_id,
      canonical_hash: dbEntry.canonical_hash,
      published_at: dbEntry.published_at,
      state: dbEntry.state
    }));
    
    const snapshot_hash = this.calculateSnapshotHash(entries);
    
    return { 
      version: 'v1',
      entries, 
      snapshot_hash 
    };
  }

  async publishScorecard(
    scorecard: any, 
    ipfsCid: string,
    signatureData?: {
      signerDid: string;
      signature: string;
      chain: string;
      nonce: string;
      signatureType: 'EIP-712' | 'Ed25519' | 'none';
    }
  ): Promise<{
    success: boolean;
    validationResult?: any;
    registryEntry?: ExtendedRegistryEntry;
    error?: string;
    warnings?: string[];
  }> {
    try {
      // NOTA: autoValidate solo acepta scorecard, no snapshot
      const validationResult = autoValidate(scorecard);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          validationResult,
          error: 'SCORECARD_VALIDATION_FAILED',
          warnings: validationResult.warnings
        };
      }
      
      const canonical_hash = cryptoGuard.generateCanonicalHash(scorecard);
      
      const registryEntry: ExtendedRegistryEntry = {
        scorecard_id: ipfsCid,
        canonical_hash,
        published_at: new Date().toISOString(),
        state: 'PUBLISHED',
        signature_metadata: signatureData ? {
          signer_did: signatureData.signerDid,
          signature: signatureData.signature,
          chain: signatureData.chain,
          nonce: signatureData.nonce,
          signature_type: signatureData.signatureType
        } : undefined
      };
      
      const { error: insertError } = await supabase
        .from('registry_entries')
        .insert({
          scorecard_id: registryEntry.scorecard_id,
          canonical_hash: registryEntry.canonical_hash,
          published_at: registryEntry.published_at,
          state: registryEntry.state,
          metadata: registryEntry.signature_metadata || {}
        });
      
      if (insertError) {
        if (insertError.code === '23505') {
          return {
            success: false,
            error: 'ANDR-IFC-R-002: Duplicate canonical_hash',
            validationResult
          };
        }
        throw insertError;
      }
      
      return {
        success: true,
        validationResult,
        registryEntry,
        warnings: validationResult.warnings
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'UNKNOWN_REGISTRY_ERROR'
      };
    }
  }

  private calculateSnapshotHash(entries: BaseRegistryEntry[]): string {
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    );
    
    return generateSnapshotHash(sortedEntries);
  }
}

export const registryService = new RegistryService();

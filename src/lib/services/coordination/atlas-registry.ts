import { supabase } from "./supabase";
import { cryptoGuard } from "./crypto-guard";
import { 
  CanonicalMilestoneProof, 
  MilestoneStatus 
} from "../../../types/coordination/atlas";
import { uploadScorecardToIPFS } from "./ipfs-adapter";
import { ethers } from 'ethers';
import { mongoDBClient } from "../../infrastructure/mongodb";
import { logger } from '../../utils/logger';

/**
 * Estructura de registro en base de datos
 */
interface AtlasRegistryEntry {
  id?: string;
  atlas_id: string; // Clave primaria (hash canónico)
  milestone_data: CanonicalMilestoneProof;
  canonical_artifact_cid?: string; // CID del artefacto JSON en IPFS
  status: MilestoneStatus;
  created_at: string;
  updated_at: string;
  source_scorecard_cid?: string;
  source_scorecard_hash?: string;
}

/**
 * Resultado de persistencia
 */
interface PersistenceResult {
  success: boolean;
  existing: boolean; // true si ya existía el registro
  registryEntry?: AtlasRegistryEntry;
  canonicalArtifactCid?: string;
  error?: string;
}

/**
 * CAPA M2: AtlasRegistry
 * Punto único de escritura para hitos verificados.
 * Implementa idempotencia: atlasId como llave primaria.
 */
export class AtlasRegistry {
  
  /**
   * Persiste un CanonicalMilestoneProof en el registro inmutable.
   * Idempotente: si ya existe, retorna el registro existente sin sobrescribir.
   */
  public async persist(
    milestone: CanonicalMilestoneProof,
    options?: { 
      skipIpfsUpload?: boolean;
      forceUpdate?: boolean; // Solo para migraciones, normalmente false
      skipMongoDB?: boolean; // Para desarrollo/testing
    }
  ): Promise<PersistenceResult> {
    const now = new Date().toISOString();
    
    try {
      // 1. Verificar si ya existe
      const existingEntry = await this.getByAtlasId(milestone.atlasId);
      
      if (existingEntry && !options?.forceUpdate) {
        return {
          success: true,
          existing: true,
          registryEntry: existingEntry
        };
      }
      
      // 2. Generar artefacto canónico (JSON listo para IPFS)
      const canonicalArtifact = this.generateCanonicalArtifact(milestone);
      
      // 3. Subir a IPFS (o simular)
      let canonicalArtifactCid: string | undefined;
      
      if (!options?.skipIpfsUpload) {
        canonicalArtifactCid = await this.uploadToIPFS(canonicalArtifact);
      } else {
        // CID determinista para desarrollo
        canonicalArtifactCid = this.generateDeterministicCID(canonicalArtifact);
      }
      
      // 4. Preparar entrada de registro
      const registryEntry: AtlasRegistryEntry = {
        atlas_id: milestone.atlasId,
        milestone_data: milestone,
        canonical_artifact_cid: canonicalArtifactCid,
        status: milestone.status,
        created_at: now,
        updated_at: now,
        source_scorecard_cid: milestone.sourceScorecard?.cid,
        source_scorecard_hash: milestone.sourceScorecard?.canonicalHash
      };
      
      // 5. Insertar en Supabase (persistencia primaria)
      const { error } = await supabase
        .from('atlas_milestones')
        .insert(registryEntry);
      
      if (error) {
        // Podría ser violación de unicidad (aunque ya verificamos)
        if (error.code === '23505') { // unique_violation
          const existing = await this.getByAtlasId(milestone.atlasId);
          if (existing) {
            return {
              success: true,
              existing: true,
              registryEntry: existing
            };
          }
        }
        throw error;
      }
      
      // 6. Persistir en MongoDB Atlas como capa adicional (tolerante a fallos)
      if (!options?.skipMongoDB) {
        await this.persistToMongoDB(milestone, { suppressErrors: true });
      }
      
      return {
        success: true,
        existing: false,
        registryEntry,
        canonicalArtifactCid
      };
      
    } catch (error: any) {
      logger.error('Error persistiendo milestone en AtlasRegistry:', error);
      return {
        success: false,
        existing: false,
        error: error.message || 'Unknown persistence error'
      };
    }
  }
  
  /**
   * Obtiene un milestone por su atlasId
   */
  public async getByAtlasId(atlasId: string): Promise<AtlasRegistryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('atlas_milestones')
        .select('*')
        .eq('atlas_id', atlasId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo milestone:', error);
      return null;
    }
  }
  
  /**
   * Actualiza el estado de un milestone (solo status permitido)
   */
  public async updateStatus(
    atlasId: string, 
    newStatus: MilestoneStatus
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('atlas_milestones')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('atlas_id', atlasId);
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Genera el artefacto JSON canónico listo para IPFS
   */
  public generateCanonicalArtifact(milestone: CanonicalMilestoneProof): string {
    // Crear una copia limpia sin metadatos internos
    const artifact = {
      // Metadatos de versión
      version: "atlas-milestone-v1",
      atlasId: milestone.atlasId,
      
      // Datos esenciales (sin referencias cíclicas)
      action: milestone.action,
      evidence: milestone.evidence,
      attestations: milestone.attestations,
      
      // Metadatos de timestamp
      createdAt: milestone.metadata.createdAt,
      updatedAt: milestone.metadata.updatedAt,
      
      // Referencia al source (si existe)
      sourceScorecard: milestone.sourceScorecard ? {
        cid: milestone.sourceScorecard.cid,
        canonicalHash: milestone.sourceScorecard.canonicalHash
      } : undefined
    };
    
    return JSON.stringify(artifact, null, 2);
  }
  
  /**
   * Sube artefacto a IPFS (simulado por ahora)
   */
  private async uploadToIPFS(artifactJson: string): Promise<string> {
    try {
      // Intentar usar uploadScorecardToIPFS con el JSON parseado
      const artifactData = JSON.parse(artifactJson);
      const result = await uploadScorecardToIPFS(artifactData);
      return result.cid;
    } catch (error) {
      logger.warn('Fallback a CID determinista:', error);
      return this.generateDeterministicCID(artifactJson);
    }
  }
  
  /**
   * Genera un CID determinista basado en hash del contenido
   */
  private generateDeterministicCID(content: string): string {
    // Generar hash keccak256 del contenido usando ethers directamente
    const hash = ethers.keccak256(ethers.toUtf8Bytes(content));
    // Formato simulado: Qm... (CID v0) - tomar primeros 44 caracteres del hash (sin '0x')
    const hashWithoutPrefix = hash.startsWith('0x') ? hash.substring(2) : hash;
    return `Qm${hashWithoutPrefix.substring(0, 44)}`;
  }

  /**
   * Persiste un milestone en MongoDB Atlas como capa adicional
   * Tolerante a fallos: si MongoDB falla, el sistema continúa (Supabase es la fuente de verdad)
   */
  private async persistToMongoDB(
    milestone: CanonicalMilestoneProof,
    options?: { suppressErrors?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validar identidad: asegurar que el atlasId exista y sea válido
      if (!milestone.atlasId || milestone.atlasId.length < 10) {
        throw new Error('Invalid atlasId for MongoDB persistence');
      }

      // Preparar documento según esquema Paper
      const mongoDocument = {
        ...milestone,
        // Metadatos adicionales para MongoDB
        _persistenceLayers: ['supabase', 'mongodb'],
        _persistedAt: new Date().toISOString(),
        // Normalización de fechas
        createdAt: milestone.metadata.createdAt,
        updatedAt: milestone.metadata.updatedAt
      };

      // Upsert en MongoDB (idempotente basado en atlasId)
      const result = await mongoDBClient.upsertMilestone(mongoDocument, {
        suppressErrors: options?.suppressErrors
      });

      if (!result.success) {
        logger.warn(`MongoDB persistence failed for ${milestone.atlasId}: ${result.error}`);
        
        // Si suppressErrors está activado, solo logueamos el error
        if (options?.suppressErrors) {
          return {
            success: false,
            error: result.error
          };
        }
        
        throw new Error(`MongoDB persistence failed: ${result.error}`);
      }

      logger.info(`✅ Milestone ${milestone.atlasId} persisted to MongoDB (${result.existing ? 'existing' : 'new'})`);
      
      return {
        success: true
      };
      
    } catch (error: any) {
      const errorMessage = `MongoDB persistence error for ${milestone.atlasId}: ${error.message}`;
      
      // Log en atlas_audit.log (ya manejado por mongoDBClient.logError)
      logger.error(errorMessage);
      
      // Si suppressErrors está activado, retornamos error sin lanzar excepción
      if (options?.suppressErrors) {
        return {
          success: false,
          error: error.message
        };
      }
      
      throw error;
    }
  }
}

export const atlasRegistry = new AtlasRegistry();

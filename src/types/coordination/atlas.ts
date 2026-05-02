import { SignedScorecard } from './scorecard';

/**
 * Tipología normalizada de acciones para ATLAS
 */
export type AtlasActionType = 
  | 'CODE_CONTRIBUTION'
  | 'PROTOCOL_DESIGN'
  | 'RESEARCH_PAPER'
  | 'COMMUNITY_GOVERNANCE'
  | 'TECHNICAL_SPECIFICATION'
  | 'SECURITY_AUDIT'
  | 'UI_UX_DESIGN';

/**
 * Niveles de Veracidad según ATLAS PAPER Capítulo 2
 */
export enum VerificationLevel {
  LEVEL_0_SELF_ATTESATION = 0,    // Auto-afirmación firmada
  LEVEL_1_PEER_REVIEW = 1,        // Verificación por pares
  LEVEL_2_PROTOCOL_CONSENSUS = 2, // Verificación por protocolo on-chain
  LEVEL_3_MATH_PROOF = 3          // Verificación matemática (ZKP/Algorítmica)
}

/**
 * Estructura de evidencia para el hito
 */
export interface MilestoneEvidence {
  type: 'IPFS' | 'ON_CHAIN' | 'CONTENT_HASH' | 'URL';
  uri: string;
  hash: string;
  metadata?: Record<string, any>;
}

/**
 * Atestación estratificada
 */
export interface AtlasAttestation {
  signerDid: string;
  signature: string;
  level: VerificationLevel;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Estados de verificación de ATLAS
 */
export type MilestoneStatus = 
  | 'PENDING' 
  | 'VERIFIED' 
  | 'CHALLENGED' 
  | 'IMMUTABLE';

/**
 * CAPA M0: CanonicalMilestoneProof
 * Ontología del logro profesional en ATLAS
 */
export interface CanonicalMilestoneProof {
  // Estado actual del hito (Capa M1)
  status: MilestoneStatus;
  // Identificador único universal (generalmente el hash canónico del logro)
  atlasId: string;
  
  // Acción: Qué se hizo (Ontología)
  action: {
    type: AtlasActionType;
    description: string;
    tags: string[];
    metadata: Record<string, any>;
  };
  
  // Evidencia: Pruebas del logro (Cadenas de custodia)
  evidence: MilestoneEvidence[];
  
  // Atestación: Quién lo valida (Criptografía)
  attestations: AtlasAttestation[];
  
  // Referencia al Scorecard original de Andromeda (Retrocompatibilidad)
  sourceScorecard?: {
    cid: string;
    authorDid: string;
    clarityDelta: number;
    canonicalHash: string;
    ecosystem?: string;
  };

  // Metadatos de ATLAS
  metadata: {
    version: string; // "3.0" según Atlas Paper
    createdAt: string;
    updatedAt: string;
    trustScore?: number; // Calculado por Capa M1 (Verification Engine)
  };
}

/**
 * Mapeo para transformación
 */
export interface MilestoneTransformationResult {
  milestone: CanonicalMilestoneProof;
  originalScorecardHash: string;
  transformationTimestamp: string;
}

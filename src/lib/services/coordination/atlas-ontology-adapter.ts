import {
  CanonicalMilestoneProof,
  AtlasActionType,
  VerificationLevel,
  MilestoneTransformationResult
} from "../../../types/coordination/atlas";
import { SignedScorecard } from "../../../types/coordination/scorecard";
import { cryptoGuard } from "./crypto-guard";

/**
 * CAPA M0: AtlasOntologyAdapter
 * Implementa la transformación de la ontología Andromeda (Scorecards) 
 * a la ontología ATLAS (Milestones).
 * 
 * Garantía de Inmutabilidad:
 * 1. Deriva atlasId del canonical_hash original del Scorecard.
 * 2. Mantiene una cadena de custodia referenciando el CID de IPFS.
 * 3. Incorpora firmas criptográficas originales como Atestación de Nivel 0.
 * 
 * 🔧 PATCH v3.1: Persiste ecosystem en sourceScorecard y action.metadata
 *    para que el motor de búsqueda ATLAS pueda filtrar por ecosistema.
 */
export class AtlasOntologyAdapter {

  /**
   * Transforma un Scorecard firmado en un Milestone Proof Core.
   */
  public transformScorecardToMilestone(
    scorecard: SignedScorecard,
    ipfsCid: string,
    clarityDelta: number
  ): MilestoneTransformationResult {

    // El canonicalHash es el ancla de inmutabilidad
    const canonicalHash = cryptoGuard.generateCanonicalHash(scorecard);
    const now = new Date().toISOString();

    // 🔧 Extraer y normalizar ecosistema (siempre minúsculas para queries MongoDB)
    const ecosystem = (
      scorecard["B. Límites"]?.content?.network ||
      scorecard["D. Esfuerzo"]?.content?.ecosystem ||
      scorecard["C. Especificación Técnica"]?.content?.ecosystem ||
      'unknown'
    ).toLowerCase();

    // Ontología de ATLAS: Mapeo de Scorecard a Milestone
    const milestone: CanonicalMilestoneProof = {
      status: 'PENDING',
      atlasId: canonicalHash,

      action: {
        type: this.mapScorecardToType(scorecard),
        description: scorecard["A. Problema"]?.content?.description || "Logro verificado vía Andromeda Core",
        tags: this.extractTags(scorecard),
        metadata: {
          originalClarityDelta: clarityDelta,
          ecosystem: ecosystem,  // 🔧 PATCH: ecosystem persistido en action.metadata
          sections: Object.keys(scorecard).filter(k => k.length === 1 || k.includes('.'))
        }
      },

      evidence: [
        {
          type: 'IPFS',
          uri: `ipfs://${ipfsCid}`,
          hash: ipfsCid,
          metadata: {
            role: 'PRIMARY_SOURCE',
            mimetype: 'application/json'
          }
        }
      ],

      attestations: [
        {
          signerDid: scorecard.metadata.authorDid,
          signature: scorecard.metadata.signature || scorecard.signature,
          level: VerificationLevel.LEVEL_0_SELF_ATTESATION,
          timestamp: scorecard.metadata.created || scorecard.timestamp,
          metadata: {
            method: scorecard.metadata.signature ? 'EIP-712' : 'Ed25519',
            nonce: (scorecard as any).nonce
          }
        }
      ],

      sourceScorecard: {
        cid: ipfsCid,
        authorDid: scorecard.metadata.authorDid,
        clarityDelta: clarityDelta,
        canonicalHash: canonicalHash,
        ecosystem: ecosystem  // 🔧 PATCH: ecosystem persistido en sourceScorecard
      },

      metadata: {
        version: "3.1",
        createdAt: now,
        updatedAt: now
      }
    };

    return {
      milestone,
      originalScorecardHash: canonicalHash,
      transformationTimestamp: now
    };
  }

  /**
   * Determina el tipo de acción ATLAS basado en el contenido del scorecard
   */
  private mapScorecardToType(scorecard: SignedScorecard): AtlasActionType {
    const techSpec = scorecard["C. Especificación Técnica"]?.content;
    const problem = scorecard["A. Problema"]?.content;

    if (techSpec?.github_repo || techSpec?.repository) {
      return 'CODE_CONTRIBUTION';
    }

    if (problem?.category === 'GOVERNANCE' || problem?.tags?.includes('DAO')) {
      return 'COMMUNITY_GOVERNANCE';
    }

    if (techSpec?.architecture_diagram || techSpec?.system_design) {
      return 'PROTOCOL_DESIGN';
    }

    return 'TECHNICAL_SPECIFICATION';
  }

  /**
   * Extrae tags relevantes para la ontología ATLAS
   */
  private extractTags(scorecard: SignedScorecard): string[] {
    const tags = new Set<string>();

    Object.values(scorecard).forEach((section: any) => {
      if (section?.content?.tags && Array.isArray(section.content.tags)) {
        section.content.tags.forEach((t: string) => tags.add(t));
      }
    });

    tags.add('andromeda-core-v1-5');
    tags.add('verified-progress');

    return Array.from(tags);
  }
}

export const atlasOntologyAdapter = new AtlasOntologyAdapter();

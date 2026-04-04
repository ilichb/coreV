import { atlasAuditor } from "./atlas-auditor";
import { atlasRegistry } from "./atlas-registry";
import { atlasOntologyAdapter } from "./atlas-ontology-adapter";
import { 
  CanonicalMilestoneProof,
  MilestoneStatus,
  MilestoneTransformationResult
} from "../../../types/coordination/atlas";
import { SignedScorecard } from "../../../types/coordination/scorecard";
import { logger } from '../../utils/logger';

/**
 * Resultado del workflow completo Atlas
 */
export interface AtlasWorkflowResult {
  success: boolean;
  transformation?: MilestoneTransformationResult;
  auditResult?: any; // Tipo específico de AuditResult
  persistenceResult?: any; // Tipo específico de PersistenceResult
  finalStatus?: MilestoneStatus;
  errors: string[];
  warnings: string[];
}

/**
 * AtlasOrchestrator
 * Orquesta el workflow completo: Adaptación → Auditoría → Registro → Inmutabilidad
 */
export class AtlasOrchestrator {
  
  /**
   * Ejecuta el workflow completo para un Scorecard
   */
  public async executeFullWorkflow(
    scorecard: SignedScorecard,
    ipfsCid: string,
    clarityDelta: number,
    options?: {
      skipIpfsUpload?: boolean;
      forceReaudit?: boolean;
    }
  ): Promise<AtlasWorkflowResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 1. Transformación (Capa M0)
      const transformation = atlasOntologyAdapter.transformScorecardToMilestone(
        scorecard,
        ipfsCid,
        clarityDelta
      );
      
      logger.info(`🔄 Transformación completada: ${transformation.milestone.atlasId}`);
      
      // 2. Auditoría (Capa M1)
      const auditResult = await atlasAuditor.auditMilestone(transformation.milestone);
      
      if (!auditResult.isValid) {
        errors.push('Auditoría fallida: ' + auditResult.alerts.map(a => a.message).join(', '));
        return {
          success: false,
          transformation,
          auditResult,
          errors,
          warnings
        };
      }
      
      logger.info(`✅ Auditoría exitosa. Nuevo estado: ${auditResult.newStatus}`);
      
      // 3. Actualizar estado del milestone basado en auditoría
      const milestoneToPersist: CanonicalMilestoneProof = {
        ...transformation.milestone,
        status: auditResult.newStatus
      };
      
      // 4. Persistencia en Registry (Capa M2)
      const persistenceResult = await atlasRegistry.persist(milestoneToPersist, {
        skipIpfsUpload: options?.skipIpfsUpload
      });
      
      if (!persistenceResult.success) {
        errors.push(`Persistencia fallida: ${persistenceResult.error}`);
        return {
          success: false,
          transformation,
          auditResult,
          persistenceResult,
          errors,
          warnings
        };
      }
      
      logger.info(`📝 Registro completado: ${persistenceResult.existing ? 'existente' : 'nuevo'}`);
      
      // 5. Si la persistencia fue exitosa y el milestone está VERIFIED, actualizar a IMMUTABLE
      let finalStatus = auditResult.newStatus;
      
      if (persistenceResult.success && auditResult.newStatus === 'VERIFIED') {
        // Actualizar estado a IMMUTABLE en el registro
        const updateResult = await atlasRegistry.updateStatus(
          milestoneToPersist.atlasId,
          'IMMUTABLE'
        );
        
        if (updateResult.success) {
          finalStatus = 'IMMUTABLE';
          logger.info(`🔒 Hito marcado como IMMUTABLE: ${milestoneToPersist.atlasId}`);
        } else {
          warnings.push(`No se pudo marcar como IMMUTABLE: ${updateResult.error}`);
        }
      }
      
      return {
        success: true,
        transformation,
        auditResult,
        persistenceResult,
        finalStatus,
        errors,
        warnings
      };
      
    } catch (error: any) {
      logger.error('Error en workflow Atlas:', error);
      errors.push(`Error inesperado: ${error.message}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }
  
  /**
   * Workflow solo para milestones ya transformados
   */
  public async executeVerificationWorkflow(
    milestone: CanonicalMilestoneProof,
    options?: {
      skipIpfsUpload?: boolean;
    }
  ): Promise<AtlasWorkflowResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 1. Auditoría (Capa M1)
      const auditResult = await atlasAuditor.auditMilestone(milestone);
      
      if (!auditResult.isValid) {
        errors.push('Auditoría fallida: ' + auditResult.alerts.map(a => a.message).join(', '));
        return {
          success: false,
          auditResult,
          errors,
          warnings
        };
      }
      
      logger.info(`✅ Auditoría exitosa. Nuevo estado: ${auditResult.newStatus}`);
      
      // 2. Actualizar estado del milestone basado en auditoría
      const milestoneToPersist: CanonicalMilestoneProof = {
        ...milestone,
        status: auditResult.newStatus
      };
      
      // 3. Persistencia en Registry (Capa M2)
      const persistenceResult = await atlasRegistry.persist(milestoneToPersist, {
        skipIpfsUpload: options?.skipIpfsUpload
      });
      
      if (!persistenceResult.success) {
        errors.push(`Persistencia fallida: ${persistenceResult.error}`);
        return {
          success: false,
          auditResult,
          persistenceResult,
          errors,
          warnings
        };
      }
      
      logger.info(`📝 Registro completado: ${persistenceResult.existing ? 'existente' : 'nuevo'}`);
      
      // 4. Si la persistencia fue exitosa y el milestone está VERIFIED, actualizar a IMMUTABLE
      let finalStatus = auditResult.newStatus;
      
      if (persistenceResult.success && auditResult.newStatus === 'VERIFIED') {
        const updateResult = await atlasRegistry.updateStatus(
          milestoneToPersist.atlasId,
          'IMMUTABLE'
        );
        
        if (updateResult.success) {
          finalStatus = 'IMMUTABLE';
          logger.info(`🔒 Hito marcado como IMMUTABLE: ${milestoneToPersist.atlasId}`);
        } else {
          warnings.push(`No se pudo marcar como IMMUTABLE: ${updateResult.error}`);
        }
      }
      
      return {
        success: true,
        auditResult,
        persistenceResult,
        finalStatus,
        errors,
        warnings
      };
      
    } catch (error: any) {
      logger.error('Error en workflow de verificación:', error);
      errors.push(`Error inesperado: ${error.message}`);
      return {
        success: false,
        errors,
        warnings
      };
    }
  }
}

export const atlasOrchestrator = new AtlasOrchestrator();
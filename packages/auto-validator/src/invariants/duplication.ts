import { InvariantResult } from '../types';
import { RegistrySnapshot } from '../types/registry';
import { calculateTextSimilarity, extractScorecardText } from '../utils/normalize';

export function checkDuplication(
  scorecard: any, 
  registrySnapshot?: RegistrySnapshot
): InvariantResult {
  if (!registrySnapshot || registrySnapshot.entries.length === 0) {
    // No registry or empty registry, skip duplication check
    return { passed: true };
  }
  
  const WARNING_THRESHOLD = 0.15;  // 15% -> WARNING (según Arquitecto)
  const ERROR_THRESHOLD = 0.30;    // 30% -> ERROR (según Arquitecto)
  
  // Extraer texto del scorecard actual
  const currentText = extractScorecardText(scorecard);
  
  if (!currentText || currentText.trim().length < 10) {
    // Texto insuficiente para comparación
    return { passed: true };
  }
  
  // Para cada entrada en el registry, calcular similitud
  for (const entry of registrySnapshot.entries) {
    // En producción, obtendríamos el texto real del scorecard almacenado
    // Por ahora, simulamos con un placeholder
    const registryText = entry.scorecard_id + ' ' + entry.canonical_hash + ' ' + (entry.scorecard_id || '');
    
    // Calcular similitud semántica
    const similarity = calculateTextSimilarity(currentText, registryText);
    
    if (similarity > ERROR_THRESHOLD) {
      return {
        passed: false,
        failure_code: 'ANDR-IFC-D-001',
        details: { 
          similarity: Math.round(similarity * 100) / 100,
          error_threshold: ERROR_THRESHOLD,
          duplicate_of: entry.scorecard_id,
          severity: 'ERROR'
        }
      };
    } else if (similarity > WARNING_THRESHOLD) {
      return {
        passed: true,
        warning: `Posible duplicación semántica (${Math.round(similarity * 100)}% similitud)`,
        details: {
          similarity: Math.round(similarity * 100) / 100,
          warning_threshold: WARNING_THRESHOLD,
          note: 'Revisión manual recomendada'
        }
      };
    }
  }
  
  return { passed: true };
}

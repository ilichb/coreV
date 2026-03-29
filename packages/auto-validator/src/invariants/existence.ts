import { InvariantResult } from '../types';

export function checkExistence(scorecard: any): InvariantResult {
  const requiredSections = [
    "A. Problema", "B. Límites", 
    "C. Especificación Técnica", "D. Esfuerzo"
  ];
  
  const missingSections = requiredSections.filter(
    section => !scorecard[section]
  );
  
  if (missingSections.length > 0) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-E-001',
      details: { missing_sections: missingSections }
    };
  }
  
  // Check metadata
  if (!scorecard.metadata?.version || !scorecard.metadata?.created || 
      !scorecard.metadata?.updated || !scorecard.metadata?.authorDid) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-E-002',
      details: { missing_metadata_fields: true }
    };
  }
  
  return { passed: true };
}

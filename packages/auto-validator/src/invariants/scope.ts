import { InvariantResult } from '../types';

export function checkScope(scorecard: any): InvariantResult {
  // Check each section has required properties
  const sections = ["A. Problema", "B. Límites", "C. Especificación Técnica", "D. Esfuerzo"];
  
  for (const section of sections) {
    const sectionData = scorecard[section];
    if (sectionData) {
      if (typeof sectionData.clarity !== 'number' || 
          typeof sectionData.coherence !== 'number' ||
          typeof sectionData.completeness !== 'number') {
        return {
          passed: false,
          failure_code: 'ANDR-IFC-S-001',
          details: { invalid_section: section }
        };
      }
    }
  }
  
  return { passed: true };
}

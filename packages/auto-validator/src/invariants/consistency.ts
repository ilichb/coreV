import { InvariantResult } from '../types';

export function checkConsistency(scorecard: any): InvariantResult {
  // Check internal consistency of scores
  
  const sections = ["A. Problema", "B. Límites", "C. Especificación Técnica", "D. Esfuerzo"];
  const scores: number[] = [];
  
  // Collect all clarity scores
  for (const section of sections) {
    const clarity = scorecard[section]?.clarity;
    if (clarity !== undefined) {
      scores.push(clarity);
    }
  }
  
  // If we have scores, check for extreme inconsistencies
  if (scores.length >= 2) {
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // If there's a huge gap between highest and lowest scores
    if (maxScore - minScore >= 8) {
      return {
        passed: false,
        failure_code: 'ANDR-IFC-C-001',
        details: { 
          max_score: maxScore,
          min_score: minScore,
          gap: maxScore - minScore,
          threshold: 8 
        }
      };
    }
  }
  
  // Check metadata consistency
  if (scorecard.metadata) {
    const { version, created, updated, authorDid } = scorecard.metadata;
    
    if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
      return {
        passed: false,
        failure_code: 'ANDR-IFC-C-002',
        details: { 
          invalid_version_format: version,
          expected_format: 'semver (x.x.x)' 
        }
      };
    }
    
    if (created && updated) {
      const createdDate = new Date(created);
      const updatedDate = new Date(updated);
      
      if (updatedDate.getTime() - createdDate.getTime() < 0) {
        return {
          passed: false,
          failure_code: 'ANDR-IFC-C-003',
          details: { 
            created: created,
            updated: updated,
            updated_before_created: true 
          }
        };
      }
    }
  }
  
  return { passed: true };
}

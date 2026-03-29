import { InvariantResult } from '../types';

export function checkFeasibility(scorecard: any): InvariantResult {
  // Check clarity scores are within valid range (0-10)
  const sections = ["A. Problema", "B. Límites", "C. Especificación Técnica", "D. Esfuerzo"];
  
  for (const section of sections) {
    const clarity = scorecard[section]?.clarity;
    
    if (clarity !== undefined) {
      if (clarity < 0 || clarity > 10) {
        return {
          passed: false,
          failure_code: 'ANDR-IFC-F-001',
          details: { 
            section,
            clarity_score: clarity,
            valid_range: { min: 0, max: 10 }
          }
        };
      }
    }
  }
  
  // Check if scores show reasonable distribution
  const problemClarity = scorecard["A. Problema"]?.clarity || 0;
  const specClarity = scorecard["C. Especificación Técnica"]?.clarity || 0;
  
  // If problem is well-defined but spec is poor, that's a feasibility issue
  if (problemClarity >= 8 && specClarity <= 3) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-F-002',
      details: { 
        problem_clarity: problemClarity,
        spec_clarity: specClarity,
        gap_too_large: true 
      }
    };
  }
  
  return { passed: true };
}

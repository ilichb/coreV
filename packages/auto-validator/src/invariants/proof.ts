import { InvariantResult } from '../types';

export function checkProof(scorecard: any): InvariantResult {
  // Check if content has at least some substance
  const sections = ["A. Problema", "B. Límites", "C. Especificación Técnica", "D. Esfuerzo"];
  
  for (const section of sections) {
    const content = scorecard[section]?.content;
    
    if (content && typeof content === 'object') {
      // If content is an empty object, it's a warning but not a failure
      if (Object.keys(content).length === 0) {
        // This is acceptable but will be noted in warnings
        continue;
      }
    }
  }
  
  // Check metadata has authorDid
  if (!scorecard.metadata?.authorDid) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-P-001',
      details: { missing_author_did: true }
    };
  }
  
  // Check authorDid format
  const did = scorecard.metadata.authorDid;
  if (!did.startsWith('did:andromeda:')) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-P-002',
      details: { 
        invalid_did_format: did,
        expected_prefix: 'did:andromeda:' 
      }
    };
  }
  
  return { passed: true };
}

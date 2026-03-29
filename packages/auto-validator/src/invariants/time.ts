import { InvariantResult } from '../types';
import { RegistrySnapshot } from '../types/registry';

export function checkTime(scorecard: any, registrySnapshot?: RegistrySnapshot): InvariantResult {
  // Check if created date is valid and not in the future
  const created = scorecard.metadata?.created;
  
  if (!created) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-T-001',
      details: { missing_created_date: true }
    };
  }
  
  const createdDate = new Date(created);
  const now = new Date();
  
  // Created date cannot be in the future
  if (createdDate > now) {
    return {
      passed: false,
      failure_code: 'ANDR-IFC-T-002',
      details: { 
        created_date: created,
        current_date: now.toISOString(),
        is_future: true 
      }
    };
  }
  
  // Check if updated date is valid and not before created
  const updated = scorecard.metadata?.updated;
  if (updated) {
    const updatedDate = new Date(updated);
    
    if (updatedDate < createdDate) {
      return {
        passed: false,
        failure_code: 'ANDR-IFC-T-003',
        details: { 
          created_date: created,
          updated_date: updated,
          updated_before_created: true 
        }
      };
    }
  }
  
  return { passed: true };
}

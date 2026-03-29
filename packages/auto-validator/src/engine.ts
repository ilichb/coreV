import { checkExistence } from './invariants/existence';
import { checkScope } from './invariants/scope';
import { checkTime } from './invariants/time';
import { checkFeasibility } from './invariants/feasibility';
import { checkConsistency } from './invariants/consistency';
import { checkDuplication } from './invariants/duplication';
import { ValidationResult } from './types';
import { RegistrySnapshot } from './types/registry';

export function autoValidate(scorecard: any, registrySnapshot?: RegistrySnapshot): ValidationResult {
  console.log('[AUTO-VALIDATOR] Starting validation for scorecard');
  
  const invariantResults = [
    { name: 'Existence', result: checkExistence(scorecard) },
    { name: 'Scope', result: checkScope(scorecard) },
    { name: 'Time', result: checkTime(scorecard, registrySnapshot) },
    { name: 'Feasibility', result: checkFeasibility(scorecard) },
    { name: 'Consistency', result: checkConsistency(scorecard) },
    { name: 'Duplication', result: checkDuplication(scorecard, registrySnapshot) },
  ];

  console.log('[AUTO-VALIDATOR] Invariant results:', 
    invariantResults.map(r => `${r.name}: ${r.result.passed ? 'PASS' : 'FAIL'}`)
  );

  const failedInvariants = invariantResults.filter(r => !r.result.passed);
  const warnings = invariantResults.filter(r => r.result.warning).map(r => r.result.warning!);

  if (failedInvariants.length > 0) {
    console.log('[AUTO-VALIDATOR] Validation failed:', 
      failedInvariants.map(f => f.result.failure_code)
    );
    
    return {
      status: 'REJECTED',
      failure_codes: failedInvariants.map(f => f.result.failure_code!),
      invariant_set_version: '1.0.0',
      registry_hash: registrySnapshot?.snapshot_hash || 'no-registry',
      warnings,
      details: {
        failed_invariants: failedInvariants.map(f => ({
          name: f.name,
          code: f.result.failure_code,
          details: f.result.details
        }))
      }
    };
  }

  console.log('[AUTO-VALIDATOR] Validation passed');
  
  return {
    status: 'VALID',
    invariant_set_version: '1.0.0',
    registry_hash: registrySnapshot?.snapshot_hash || 'no-registry',
    warnings,
    details: {
      passed_invariants: invariantResults.map(r => r.name)
    }
  };
}

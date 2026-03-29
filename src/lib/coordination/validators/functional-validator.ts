import { validateScorecardStructure, calculateClarityDelta } from './canonical-validator';

export function validateForSubmission(scorecard: any) {
  return validateScorecardStructure(scorecard);
}

export { calculateClarityDelta };

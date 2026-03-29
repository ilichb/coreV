import { Scorecard } from '@/types/coordination/scorecard';

const REQUIRED_SECTIONS = [
  'A. Problema',
  'B. Límites',
  'C. Especificación Técnica',
  'D. Esfuerzo'
] as const;

export function calculateClarityDelta(scorecard: Scorecard): number {
  const clarityScores = REQUIRED_SECTIONS.map(
    section => scorecard[section]?.clarity || 0
  );
  const totalClarity = clarityScores.reduce((sum, score) => sum + score, 0);
  const maxPossibleScore = 100 * REQUIRED_SECTIONS.length;
  return maxPossibleScore > 0 ? Math.round((totalClarity / maxPossibleScore) * 100) : 0;
}

export function validateScorecardStructure(scorecard: Scorecard) {
  const errors: string[] = [];
  const warnings: string[] = [];
  REQUIRED_SECTIONS.forEach(section => {
    if (!scorecard[section]) {
      errors.push("Sección requerida faltante: " + section);
      return;
    }
    const sectionData = scorecard[section];
    if (sectionData.clarity === undefined) {
      errors.push(section + ": campo clarity requerido");
    } else if (sectionData.clarity < 0 || sectionData.clarity > 100) {
      errors.push(section + ": clarity debe estar entre 0-100");
    }
    if (!sectionData.content || Object.keys(sectionData.content).length === 0) {
      warnings.push(section + ": contenido vacío");
    }
  });
  if (!scorecard.metadata) {
    errors.push("Metadata del scorecard requerida");
  } else if (!scorecard.metadata.authorDid) {
    errors.push("Metadata: authorDid requerido");
  }
  const clarityDelta = calculateClarityDelta(scorecard);
  return { isValid: errors.length === 0, clarityDelta, errors, warnings };
}

export function validateForSubmission(scorecard: any) {
  return validateScorecardStructure(scorecard);
}

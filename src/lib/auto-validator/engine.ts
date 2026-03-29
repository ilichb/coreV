import { Scorecard } from '@/types/coordination/scorecard';
import { calculateClarityDelta } from '@/lib/coordination/validators/canonical-validator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const VALIDATION_CONFIG = {
  MIN_SECTION_LENGTH: 100,
  MIN_UNIQUE_RATIO: 0.3,
  MIN_WORDS_FOR_UNIQUENESS: 50,
  MAX_CLARITY_VARIATION: 30
} as const;

export function autoValidate(scorecard: Scorecard): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Solo las secciones que tienen estructura ScorecardSection
  const sectionKeys = [
    'A. Problema', 'B. Límites', 
    'C. Especificación Técnica', 'D. Esfuerzo'
  ] as const;
  type SectionKey = typeof sectionKeys[number];
  const sections: SectionKey[] = [...sectionKeys];

  const clarityDelta = calculateClarityDelta(scorecard);
  const clarityScores = sections.map(s => {
    const section = scorecard[s];
    // Asegurar que section tiene clarity (es ScorecardSection)
    return (section && 'clarity' in section) ? section.clarity || 0 : 0;
  });
  
  const maxClarity = Math.max(...clarityScores);
  const minClarity = Math.min(...clarityScores);
  const clarityVariation = maxClarity - minClarity;
  
  if (clarityVariation > VALIDATION_CONFIG.MAX_CLARITY_VARIATION) {
    warnings.push("Alta variación en clarity: " + clarityVariation + " puntos. Delta: " + clarityDelta + "%");
  }

  sections.forEach(section => {
    const content = scorecard[section]?.content;
    if (content && typeof content === 'object') {
      const text = Object.values(content).filter(val => typeof val === 'string').join(' ');
      const charCount = text.trim().length;
      if (charCount < VALIDATION_CONFIG.MIN_SECTION_LENGTH) {
        warnings.push(section + ": contenido muy corto (" + charCount + " chars)");
      }
    } else {
      warnings.push(section + ": contenido no definido");
    }
  });

  const allContent = sections.map(s => scorecard[s]?.content ? JSON.stringify(scorecard[s].content) : '').join(' ');
  
  if (allContent.trim().length > 0) {
    const words = allContent.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= VALIDATION_CONFIG.MIN_WORDS_FOR_UNIQUENESS) {
      const uniqueWords = new Set(words);
      const uniquenessRatio = uniqueWords.size / words.length;
      if (uniquenessRatio < VALIDATION_CONFIG.MIN_UNIQUE_RATIO) {
        errors.push("Contenido repetitivo. Unicidad: " + (uniquenessRatio * 100).toFixed(1) + "%");
      }
    }
  }

  sections.forEach(section => {
    const clarity = scorecard[section]?.clarity;
    if (clarity !== undefined && (clarity < 0 || clarity > 100)) {
      errors.push(section + ": clarity fuera de rango: " + clarity);
    }
  });

  sections.forEach(section => {
    const sectionData = scorecard[section];
    if (sectionData) {
      const { clarity, coherence, completeness } = sectionData;
      if (clarity !== undefined && coherence !== undefined && completeness !== undefined) {
        const avgScore = (clarity + coherence + completeness) / 3;
        const variation = Math.max(
          Math.abs(clarity - avgScore),
          Math.abs(coherence - avgScore),
          Math.abs(completeness - avgScore)
        );
        if (variation > 30) {
          warnings.push(section + ": métricas inconsistentes");
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

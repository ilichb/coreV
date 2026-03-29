// Types compatible with src/types/coordination/scorecard.ts
export interface ScorecardSection {
  clarity: number;
  coherence: number;
  completeness: number;
  content: Record<string, any>;
  metadata?: {
    version: string;
    author?: string;
    timestamp: string;
  };
}

export interface Scorecard {
  "A. Problema": ScorecardSection;
  "B. Límites": ScorecardSection;
  "C. Especificación Técnica": ScorecardSection;
  "D. Esfuerzo": ScorecardSection;
  
  metadata: {
    version: string;
    created: string;
    updated: string;
    authorDid: string;
    signature?: string;
  };
}

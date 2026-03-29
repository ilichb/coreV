export interface ValidationResult {
  status: 'VALID' | 'REJECTED';
  failure_codes?: string[]; // Array de códigos ANDR-IFC-*
  invariant_set_version: string;
  registry_hash: string;
  clarity_delta?: number;
  warnings?: string[];
  details?: Record<string, any>;
}

export interface InvariantResult {
  passed: boolean;
  failure_code?: string;
  warning?: string; // Nuevo campo para advertencias (como duplicación 15-30%)
  details?: Record<string, any>;
}

export type InvariantFunction = (
  scorecard: any,
  registrySnapshot?: any
) => InvariantResult;

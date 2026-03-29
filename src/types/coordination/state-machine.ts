/**
 * Andromeda State Machine v0.2
 * 
 * Define las transiciones de estado atómicas para Scorecards.
 * El sistema es una máquina de estados finita donde cada transición
 * requiere validación específica.
 */

export type ScorecardStatus = 
  | 'DRAFT'
  | 'VALIDATED'
  | 'CHALLENGED'
  | 'SIGNED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface StateTransition {
  from: ScorecardStatus;
  to: ScorecardStatus;
  guard: string;
  description: string;
}

/**
 * Máquina de estados oficial de Andromeda Core v0.2
 * 
 * Reglas:
 * 1. Solo las transiciones definidas son permitidas
 * 2. Cada transición requiere pasar su guard específico
 * 3. Los estados son inmutables una vez alcanzados
 */
export const ANDROMEDA_STATE_MACHINE: StateTransition[] = [
  {
    from: 'DRAFT',
    to: 'VALIDATED',
    guard: 'AJV_SCHEMA_VALIDATION',
    description: 'Validación de esquema técnico contra los 4 campos obligatorios'
  },
  {
    from: 'VALIDATED',
    to: 'CHALLENGED',
    guard: 'REDIS_CHALLENGE_GENERATION',
    description: 'Generación de challenge único y almacenamiento en Redis (5 min TTL)'
  },
  {
    from: 'CHALLENGED',
    to: 'SIGNED',
    guard: 'CRYPTOGRAPHIC_SIGNATURE_VERIFICATION',
    description: 'Verificación de firma EIP-712 (Ethereum) o Ed25519 (Solana)'
  },
  {
    from: 'SIGNED',
    to: 'PUBLISHED',
    guard: 'IPFS_UPLOAD_AND_CID_GENERATION',
    description: 'Upload a IPFS y obtención de CID inmutable'
  },
  {
    from: 'PUBLISHED',
    to: 'ARCHIVED',
    guard: 'PROPONENT_SIGNATURE_VERIFICATION',
    description: 'Firma del proponente original para archivar (solo lectura)'
  }
];

/**
 * Estados finales (no permiten más transiciones)
 */
export const FINAL_STATES: ScorecardStatus[] = ['ARCHIVED'];

/**
 * Valida si un estado es final
 */
export function isFinalState(status: ScorecardStatus): boolean {
  return FINAL_STATES.includes(status);
}

/**
 * Obtiene las transiciones posibles desde un estado dado
 */
export function getPossibleTransitions(from: ScorecardStatus): ScorecardStatus[] {
  return ANDROMEDA_STATE_MACHINE
    .filter(t => t.from === from)
    .map(t => t.to);
}

/**
 * Interfaz para el resultado de validación de transición
 */
export interface TransitionValidationResult {
  allowed: boolean;
  error?: string;
  transition?: StateTransition;
}

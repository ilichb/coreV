/**
 * @file ecosystem-normalizer.interface.ts
 * @location src/lib/services/reputation/ecosystem-normalizer.interface.ts
 *
 * Contrato universal que TODOS los adaptadores de ecosistema deben implementar.
 * Resuelve el problema de "rigidez de integración": cada ecosistema traduce
 * su data cruda a este payload estándar, y AVIP nunca se entera del cambio.
 *
 * CÓMO AGREGAR UN ECOSISTEMA NUEVO (ej: Polygon):
 *   1. Crear src/lib/services/reputation/normalizers/polygon.normalizer.ts
 *   2. Implementar IEcosystemNormalizer<PolygonRawData>
 *   3. AVIP no cambia. El conector no cambia. Solo existe el normalizer nuevo.
 *
 * INVARIANTE: Los campos de AVIPInput siempre son 0..100.
 * El motor reputation-engine.service.ts ya espera estos rangos — no modificarlo.
 */

/**
 * Payload estándar que el motor AVIP acepta.
 * Mapea directamente a los parámetros de ReputationEngineService.calculateScore().
 *
 * Campos (todos 0..100):
 *  - technical:        commits, deploys, contratos verificados, milestones
 *  - governance:       propuestas creadas, votos emitidos, participación en quorum
 *  - community:        staking, delegaciones, attestations de pares
 *  - verifiedCount:    evidencias on-chain verificadas (proofs, IPFS, firmas)
 *  - totalMilestones:  hitos completados en cualquier ecosistema
 */
export interface AVIPNormalizedInput {
  technical:       number;   // 0..100
  governance:      number;   // 0..100
  community:       number;   // 0..100
  verifiedCount:   number;   // entero ≥ 0  (el motor lo usa en entropía)
  totalMilestones: number;   // entero ≥ 0
}

/**
 * Contrato que todo adaptador de ecosistema debe cumplir.
 * TRawData = tipo de data cruda que produce el conector del ecosistema.
 */
export interface IEcosystemNormalizer<TRawData> {
  /** Nombre del ecosistema — solo para logging/debug */
  readonly ecosystem: string;

  /**
   * Transforma la data cruda del ecosistema en el payload estándar de AVIP.
   * No debe lanzar excepciones — en caso de error retorna los valores por defecto.
   */
  normalize(raw: TRawData): AVIPNormalizedInput;
}

/**
 * Input por defecto cuando no hay datos o hay error.
 * AVIP calculará score 0 con confianza baja — honesto y seguro.
 */
export function defaultAVIPInput(): AVIPNormalizedInput {
  return {
    technical:       0,
    governance:      0,
    community:       0,
    verifiedCount:   0,
    totalMilestones: 0,
  };
}

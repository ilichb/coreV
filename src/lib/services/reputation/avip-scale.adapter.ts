/**
 * @file avip-scale.adapter.ts
 * @location src/lib/services/reputation/avip-scale.adapter.ts
 *
 * Capa de adaptación entre escala AVIP (0..100) y escala Rootstock UI (0..999).
 * Único punto de conversión — cualquier cambio de factor impacta aquí solo.
 *
 * Ecosistemas que usan AVIP directamente (0..100):
 *   - Atlas ingestion        → trustScore en MongoDB
 *   - Solana ingestion       → trustScore en MongoDB
 *
 * Ecosistemas que necesitan escala UI (0..999):
 *   - Rootstock connector    → reputation field (display + MongoDB)
 *   - RootstockBuilderScorecard.tsx → visual
 */

/** Factor canónico: 100 × 9.99 = 999 */
export const AVIP_TO_ROOTSTOCK_FACTOR = 9.99;
export const AVIP_MAX       = 100;
export const ROOTSTOCK_MAX  = 999;

/**
 * Convierte score AVIP (0..100) → escala Rootstock UI (0..999).
 * Clampea valores fuera de rango; nunca lanza excepción.
 */
export function avipToRootstockScore(avipTotal: number): number {
  const clamped = Math.max(0, Math.min(AVIP_MAX, avipTotal));
  return Math.round(clamped * AVIP_TO_ROOTSTOCK_FACTOR);
}

/**
 * Conversión inversa: Rootstock (0..999) → AVIP (0..100).
 * Útil para leer datos legacy de MongoDB y alimentar el motor.
 */
export function rootstockToAvipScore(rootstockScore: number): number {
  const clamped = Math.max(0, Math.min(ROOTSTOCK_MAX, rootstockScore));
  return parseFloat((clamped / AVIP_TO_ROOTSTOCK_FACTOR).toFixed(2));
}

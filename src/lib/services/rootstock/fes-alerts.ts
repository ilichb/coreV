/**
 * FES — alertas del dashboard (Bloque 5 del spec, oct-2026).
 *
 * Función pura: recibe los datos ya leídos (vistas, ventana, estado del
 * monitor, verificación de hash) y devuelve las alertas a mostrar. Sin I/O
 * para que sea unit-testeable y para que la ruta /api/fes/metrics no tenga
 * lógica de decisión embebida.
 *
 * Tres alertas definidas por el spec:
 *   1. viewed < exposureFloor (8) y <10 días de ventana → resultado inconcluso.
 *   2. lastCheckedBlock sin avanzar >2h → el cron del monitor está roto.
 *   3. walletHash no determinista → la atribución se pierde al reiniciar.
 */

export interface FesAlert {
  code: 'exposure_floor_not_met' | 'monitor_stalled' | 'hash_not_deterministic';
  severity: 'warn' | 'error';
  message: string;
}

export interface FesAlertsInput {
  /** Wallets del cohorte congelado que vieron /preview. */
  viewed: number;
  /** Piso de exposición definido para el piloto (fes_pilot_meta). */
  exposureFloor: number;
  /** Días que quedan de la ventana. */
  daysRemaining: number;
  windowStatus: 'upcoming' | 'active' | 'closed';
  /**
   * Estado del monitor. null = no se pudo leer (tabla inexistente o error) —
   * también es una alerta: sin estado no se puede descartar un cron muerto.
   */
  monitor: { lastCheckedBlock: number; lastRun: string | null } | null;
  /**
   * Wallets cuyo wallet_hash persistido no coincide con el hash recalculado
   * con la sal actual. null = no se pudo verificar.
   */
  hashMismatches: number | null;
  /** Inyectable para tests. */
  nowMs?: number;
  /** Umbral de estancamiento del monitor (ms). Inyectable para tests. */
  stallThresholdMs?: number;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function computeFesAlerts(input: FesAlertsInput): FesAlert[] {
  const alerts: FesAlert[] = [];
  const nowMs = input.nowMs ?? Date.now();
  const stallThresholdMs = input.stallThresholdMs ?? TWO_HOURS_MS;

  // 1. Piso de exposición — sin vistas suficientes la conversión no mide nada.
  if (
    input.windowStatus === 'active' &&
    input.daysRemaining < 10 &&
    input.viewed < input.exposureFloor
  ) {
    alerts.push({
      code: 'exposure_floor_not_met',
      severity: 'warn',
      message:
        `Exposure floor not met: ${input.viewed} viewed of a floor of ` +
        `${input.exposureFloor} with ${input.daysRemaining} day(s) remaining. ` +
        `Result will be inconclusive.`,
    });
  }

  // 2. Monitor estancado — lastCheckedBlock es el termómetro del sistema.
  if (input.monitor === null) {
    alerts.push({
      code: 'monitor_stalled',
      severity: 'error',
      message:
        'Attribution monitor status unavailable (fes_monitor_state not readable). ' +
        'Has migration 002 been applied? Without it no stake can ever be attributed.',
    });
  } else if (input.monitor.lastRun === null) {
    alerts.push({
      code: 'monitor_stalled',
      severity: 'error',
      message: 'Monitor has never run: last checked block is empty. Stakes are not being detected.',
    });
  } else if (nowMs - Date.parse(input.monitor.lastRun) > stallThresholdMs) {
    alerts.push({
      code: 'monitor_stalled',
      severity: 'warn',
      message:
        'Monitor stalled: last checked block has not advanced in >2h. ' +
        'The attribution cron is broken or not running.',
    });
  }

  // 3. Determinismo del hash — la alerta que protege el join vista↔stake.
  if (input.hashMismatches === null) {
    alerts.push({
      code: 'hash_not_deterministic',
      severity: 'warn',
      message:
        'Wallet hash determinism could not be verified (no attributed stakes to cross-check yet).',
    });
  } else if (input.hashMismatches > 0) {
    alerts.push({
      code: 'hash_not_deterministic',
      severity: 'error',
      message:
        `walletHash mismatch on ${input.hashMismatches} attributed stake(s): stored hashes do ` +
        'not match the current hash scheme (FES_WALLET_HASH_SALT rotated or missing). ' +
        'Attribution will be lost on restart.',
    });
  }

  return alerts;
}

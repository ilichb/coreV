/**
 * Tests de computeFesAlerts (Bloque 5 del dashboard FES).
 *
 * Cubren las tres alertas del spec (oct-2026):
 *   1. Piso de exposición no alcanzado con <10 días → resultado inconcluso.
 *   2. Monitor estancado (>2h sin avanzar) o nunca corrió / ilegible.
 *   3. walletHash no determinista → la atribución se pierde al reiniciar.
 */
import { computeFesAlerts, type FesAlertsInput } from '../fes-alerts';

const NOW = Date.parse('2026-11-08T12:00:00Z');

function input(overrides: Partial<FesAlertsInput> = {}): FesAlertsInput {
  return {
    viewed: 12,
    exposureFloor: 8,
    daysRemaining: 3,
    windowStatus: 'active',
    monitor: { lastCheckedBlock: 9_500_000, lastRun: new Date(NOW - 30 * 60 * 1000).toISOString() },
    hashMismatches: 0,
    nowMs: NOW,
    ...overrides,
  };
}

describe('computeFesAlerts', () => {
  it('sin alertas cuando todo está sano', () => {
    expect(computeFesAlerts(input())).toEqual([]);
  });

  describe('piso de exposición', () => {
    it('alerta cuando viewed < floor y quedan <10 días', () => {
      const alerts = computeFesAlerts(input({ viewed: 5, daysRemaining: 3 }));
      expect(alerts).toEqual([
        expect.objectContaining({ code: 'exposure_floor_not_met', severity: 'warn' }),
      ]);
      expect(alerts[0].message).toMatch(/Result will be inconclusive/i);
    });

    it('NO alerta si viewed alcanza el piso', () => {
      expect(computeFesAlerts(input({ viewed: 8, daysRemaining: 3 }))).toEqual([]);
    });

    it('NO alerta si quedan 10 o más días (aún hay tiempo para exponer)', () => {
      expect(computeFesAlerts(input({ viewed: 0, daysRemaining: 10 }))).toEqual([]);
    });

    it('NO alerta si la ventana ya cerró (el cierre reporta el gap, no una alerta)', () => {
      expect(
        computeFesAlerts(input({ viewed: 0, daysRemaining: 0, windowStatus: 'closed' }))
      ).toEqual([]);
    });
  });

  describe('monitor estancado', () => {
    it('error si el estado del monitor no se pudo leer (tabla inexistente)', () => {
      const alerts = computeFesAlerts(input({ monitor: null }));
      expect(alerts).toEqual([
        expect.objectContaining({ code: 'monitor_stalled', severity: 'error' }),
      ]);
      expect(alerts[0].message).toMatch(/migration 002/i);
    });

    it('error si el monitor nunca corrió', () => {
      const alerts = computeFesAlerts(input({ monitor: { lastCheckedBlock: 0, lastRun: null } }));
      expect(alerts).toEqual([
        expect.objectContaining({ code: 'monitor_stalled', severity: 'error' }),
      ]);
      expect(alerts[0].message).toMatch(/never run/i);
    });

    it('warn si lastRun lleva más de 2h quieto', () => {
      const alerts = computeFesAlerts(
        input({ monitor: { lastCheckedBlock: 9_500_000, lastRun: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() } })
      );
      expect(alerts).toEqual([
        expect.objectContaining({ code: 'monitor_stalled', severity: 'warn' }),
      ]);
    });

    it('NO alerta si el cursor se actualizó hace menos de 2h', () => {
      expect(
        computeFesAlerts(
          input({ monitor: { lastCheckedBlock: 9_500_000, lastRun: new Date(NOW - 60 * 60 * 1000).toISOString() } })
        )
      ).toEqual([]);
    });
  });

  describe('determinismo del hash', () => {
    it('error si hay hashes persistidos que no calzan con el esquema actual', () => {
      const alerts = computeFesAlerts(input({ hashMismatches: 2 }));
      expect(alerts).toEqual([
        expect.objectContaining({ code: 'hash_not_deterministic', severity: 'error' }),
      ]);
      expect(alerts[0].message).toMatch(/lost on restart/i);
    });

    it('warn informativa si todavía no hay atribuciones para cruzar', () => {
      const alerts = computeFesAlerts(input({ hashMismatches: null }));
      expect(alerts).toEqual([
        expect.objectContaining({ code: 'hash_not_deterministic', severity: 'warn' }),
      ]);
    });
  });

  it('acumula alertas independientes en una sola corrida', () => {
    const alerts = computeFesAlerts(
      input({ viewed: 2, monitor: null, hashMismatches: 1 })
    );
    expect(alerts.map(a => a.code).sort()).toEqual([
      'exposure_floor_not_met',
      'hash_not_deterministic',
      'monitor_stalled',
    ]);
  });
});

/**
 * FES Storage Service
 *
 * Persists FES pilot data to Supabase.
 *
 * Required tables (created manually):
 *
 *   CREATE TABLE fes_participants (
 *     wallet VARCHAR(42) PRIMARY KEY,
 *     cohort VARCHAR(5) NOT NULL CHECK (cohort IN ('A', 'B', 'VIP')),
 *     message_variant VARCHAR(10) NOT NULL CHECK (message_variant IN ('control', 'treatment', 'vip')),
 *     balance_at_detection NUMERIC NOT NULL,
 *     days_inactive_at_detection INTEGER NOT NULL,
 *     last_block_at_detection NUMERIC NOT NULL,
 *     last_block_checkpoint NUMERIC,
 *     message_sent_at TIMESTAMPTZ,
 *     message_language VARCHAR(2) CHECK (message_language IN ('en', 'es')),
 *     reactivated BOOLEAN DEFAULT FALSE,
 *     reactivated_at TIMESTAMPTZ,
 *     last_block_current NUMERIC,
 *     last_checked_at TIMESTAMPTZ,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 *   CREATE TABLE fes_events (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     wallet VARCHAR(42) NOT NULL,
 *     event_type VARCHAR(30) NOT NULL,
 *     payload JSONB,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 *   CREATE INDEX idx_fes_events_wallet ON fes_events(wallet);
 *   CREATE INDEX idx_fes_events_type ON fes_events(event_type);
 *   CREATE INDEX idx_fes_participants_cohort ON fes_participants(cohort);
 */

import { getSupabaseAdmin, adminWrite } from '@/lib/services/coordination/supabase-admin';
import { logger } from '@/lib/utils/logger';

export type Cohort = 'A' | 'B' | 'VIP';
export type MessageVariant = 'control' | 'treatment' | 'vip';

export interface FESParticipant {
  wallet: string;
  cohort: Cohort;
  message_variant: MessageVariant;
  balance_at_detection: number;
  days_inactive_at_detection: number;
  last_block_at_detection: number;
  last_block_checkpoint: number | null;
  message_sent_at: string | null;
  message_language: 'en' | 'es' | null;
  reactivated: boolean;
  reactivated_at: string | null;
  last_block_current: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FESEvent {
  id?: string;
  wallet: string;
  event_type: string;
  payload?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Evento de staking detectado on-chain (Transfer de RIF involucrando al
 * proxy de staking). Identidad única: (tx_hash, log_index).
 */
export interface FESStakeEvent {
  id?: string;
  wallet: string;
  event_type: 'stake' | 'unstake';
  tx_hash: string;
  log_index: number;
  amount_wei: string;
  amount_rif: number;
  block_number: number;
  block_timestamp: string;
  attributed: boolean;
  days_view_to_stake: number | null;
  detected_at?: string;
}

class FESStorageService {
  // ── Participants ──────────────────────────────────────────────────────────

  /**
   * Inserta o actualiza un participante.
   * Relanza el error: el comportamiento anterior (loggear y devolver void)
   * impedía que los callers distinguiran éxito de fallo.
   */
  async upsertParticipant(p: Omit<FESParticipant, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    await adminWrite('upsertParticipant', (c) =>
      c.from('fes_participants').upsert(
        { ...p, wallet: p.wallet.toLowerCase(), updated_at: now },
        { onConflict: 'wallet' }
      )
    );
  }

  /** Idempotente por `wallet` (PK). Re-ejecutarlo no duplica filas. */
  async batchUpsertParticipants(participants: Omit<FESParticipant, 'created_at' | 'updated_at'>[]): Promise<void> {
    if (participants.length === 0) return;
    const now = new Date().toISOString();
    const rows = participants.map(p => ({ ...p, wallet: p.wallet.toLowerCase(), updated_at: now }));
    await adminWrite(`batchUpsertParticipants (${rows.length} filas)`, (c) =>
      c.from('fes_participants').upsert(rows, { onConflict: 'wallet' })
    );
    logger.info(`FES storage: ${rows.length} participants upserted`);
  }

  async getParticipant(wallet: string): Promise<FESParticipant | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_participants')
      .select('*')
      .eq('wallet', wallet.toLowerCase())
      .maybeSingle();

    if (error) {
      logger.error('FES storage: getParticipant failed', error);
      return null;
    }
    return data as FESParticipant | null;
  }

  /**
   * Número exacto de filas en la lista congelada.
   * Usado por el guard de congelamiento de `seed-participants`.
   */
  async countParticipants(): Promise<number> {
    const { count, error } = await getSupabaseAdmin()
      .from('fes_participants')
      .select('wallet', { count: 'exact', head: true });
    if (error) {
      logger.error('FES storage: countParticipants failed', error);
      throw new Error(`FES storage: countParticipants failed → ${error.code}: ${error.message}`);
    }
    return count ?? 0;
  }

  async listParticipants(cohort?: Cohort, reactivated?: boolean): Promise<FESParticipant[]> {
    let query = getSupabaseAdmin().from('fes_participants').select('*');
    if (cohort) query = query.eq('cohort', cohort);
    if (reactivated !== undefined) query = query.eq('reactivated', reactivated);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      logger.error('FES storage: listParticipants failed', error);
      return [];
    }
    return (data || []) as FESParticipant[];
  }

  async updateParticipantField(wallet: string, fields: Partial<FESParticipant>): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('fes_participants')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('wallet', wallet.toLowerCase());
    if (error) {
      throw new Error(`FES storage: updateParticipantField failed → ${error.code}: ${error.message}`);
    }
  }

  /**
   * UPDATE sobre una fila existente. Relanza el error.
   *
   * OJO: un UPDATE sobre un `wallet` inexistente NO da error en PostgREST
   * (devuelve 0 filas afectadas). Para detecting eso está `countUpdated`.
   */
  async countUpdated(wallet: string, fields: Partial<FESParticipant>): Promise<number> {
    const now = new Date().toISOString();
    const data = await adminWrite<unknown[]>('countUpdated', (c) =>
      c
        .from('fes_participants')
        .update({ ...fields, updated_at: now })
        .eq('wallet', wallet.toLowerCase())
        .select('wallet')
    );
    return Array.isArray(data) ? data.length : 0;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async recordEvent(event: Omit<FESEvent, 'id' | 'created_at'>): Promise<void> {
    const { error } = await getSupabaseAdmin().from('fes_events').insert({
      wallet: event.wallet.toLowerCase(),
      event_type: event.event_type,
      payload: event.payload || null,
    });
    if (error) {
      throw new Error(`FES storage: recordEvent failed → ${error.code}: ${error.message}`);
    }
  }

  async getEvents(wallet?: string, eventType?: string, limit = 100): Promise<FESEvent[]> {
    let query = getSupabaseAdmin().from('fes_events').select('*');
    if (wallet) query = query.eq('wallet', wallet.toLowerCase());
    if (eventType) query = query.eq('event_type', eventType);
    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) {
      logger.error('FES storage: getEvents failed', error);
      return [];
    }
    return (data || []) as FESEvent[];
  }

  // ── Stake events (on-chain, escaneados por el attribution monitor) ────────

  /**
   * Inserta eventos de stake/unstake detectados on-chain.
   * Deduplicación por la constraint UNIQUE (tx_hash, log_index): re-ejecutar
   * el escaneo del mismo rango no duplica filas.
   *
   * Devuelve la cantidad de filas realmente insertadas.
   */
  async insertStakeEvents(events: Omit<FESStakeEvent, 'id' | 'detected_at'>[]): Promise<number> {
    if (events.length === 0) return 0;
    const data = await adminWrite<Array<{ id: string }>>(
      `insertStakeEvents (${events.length} filas)`,
      (c) =>
        c
          .from('fes_stake_events')
          .upsert(events, { onConflict: 'tx_hash,log_index', ignoreDuplicates: true })
          .select('id')
    );
    return Array.isArray(data) ? data.length : 0;
  }

  async listStakeEvents(limit = 500): Promise<FESStakeEvent[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_stake_events')
      .select('*')
      .order('block_number', { ascending: false })
      .limit(limit);
    if (error) {
      logger.error('FES storage: listStakeEvents failed', error);
      return [];
    }
    return (data || []) as FESStakeEvent[];
  }

  /** Marca un evento de stake como atribuido al experimento. */
  async markStakeEventAttributed(txHash: string, logIndex: number, daysViewToStake: number): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('fes_stake_events')
      .update({ attributed: true, days_view_to_stake: daysViewToStake })
      .eq('tx_hash', txHash.toLowerCase())
      .eq('log_index', logIndex);
    if (error) {
      throw new Error(`FES storage: markStakeEventAttributed failed → ${error.code}: ${error.message}`);
    }
  }

  // ── Monitor state (cursor de escaneo) ────────────────────────────────────

  async getMonitorState(key: string): Promise<string | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_monitor_state')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      logger.error('FES storage: getMonitorState failed', error);
      return null;
    }
    return data ? (data.value as string) : null;
  }

  async setMonitorState(key: string, value: string): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('fes_monitor_state')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      throw new Error(`FES storage: setMonitorState failed → ${error.code}: ${error.message}`);
    }
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  async getReactivationMetrics() {
    const participants = await this.listParticipants();
    if (participants.length === 0) return null;

    const contacted = participants.filter(p => p.message_sent_at !== null);
    const totalContacted = contacted.length;
    const totalReactivated = contacted.filter(p => p.reactivated).length;

    const byCohort = (['A', 'B', 'VIP'] as Cohort[]).map(cohort => {
      const inCohort = contacted.filter(p => p.cohort === cohort);
      const reactivated = inCohort.filter(p => p.reactivated);
      const avgDays = reactivated.length > 0
        ? reactivated.reduce((s, p) => {
            const sent = new Date(p.message_sent_at!).getTime();
            const react = new Date(p.reactivated_at!).getTime();
            return s + (react - sent) / 86400000;
          }, 0) / reactivated.length
        : null;

      return {
        cohort,
        contacted: inCohort.length,
        reactivated: reactivated.length,
        rate: inCohort.length > 0 ? reactivated.length / inCohort.length : 0,
        avgDaysToReactivate: avgDays,
      };
    });

    const allAvgDays = totalReactivated > 0
      ? contacted.filter(p => p.reactivated).reduce((s, p) => {
          const sent = new Date(p.message_sent_at!).getTime();
          const react = new Date(p.reactivated_at!).getTime();
          return s + (react - sent) / 86400000;
        }, 0) / totalReactivated
      : null;

    return {
      totalContacted,
      totalReactivated,
      conversionRate: totalContacted > 0 ? totalReactivated / totalContacted : 0,
      avgDaysToReactivate: allAvgDays,
      byCohort,
    };
  }
}

export const fesStorage = new FESStorageService();

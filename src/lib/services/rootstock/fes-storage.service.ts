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
 *
 * Nuevas tablas del modelo de medición (fes_views, fes_attributions,
 * fes_pilot_meta, fes_stake_events, fes_monitor_state) viven en
 * `supabase/migrations/002_fes_stake_events.sql`.
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

/**
 * Vista de /preview (fuente del embudo Viewed). Spec del piloto: se guarda
 * con walletHash DETERMINISTA (v3 HMAC-SHA256), nunca la address cruda.
 * El join con fes_attributions se hace por ese hash.
 */
export interface FESView {
  id?: string;
  wallet_hash: string;
  cohort: Cohort;
  message_variant: MessageVariant | null;
  channel: string;
  referrer: string | null;
  balance_rif: number | null;
  days_inactive: number | null;
  created_at?: string;
}

/**
 * Atribución persistida: join vista ↔ stake con la regla del experimento
 * (staked_at > viewed_at y dentro de la ventana). UNIQUE(wallet_hash): la
 * conversión se cuenta por wallet.
 */
export interface FESAttribution {
  id?: string;
  wallet_hash: string;
  cohort: Cohort;
  channel: string | null;
  viewed_at: string;
  staked_at: string;
  tx_hash: string;
  log_index: number;
  block_number: number;
  amount_rif: number;
  days_view_to_stake: number;
  created_at?: string;
}

/**
 * Identidad del piloto (fila inmutable en fes_pilot_meta): snapshot CID,
 * merkle root, seed, ventana, tamaño de cohorte y piso de exposición.
 */
export interface FESPilotMeta {
  key: string;
  snapshot_cid: string;
  merkle_root: string;
  seed: string;
  window_start: string;
  window_end: string;
  cohort_count: number;
  cohort_breakdown: Record<string, number>;
  exposure_floor: number;
  created_at?: string;
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

  /**
   * Cursor de escaneo CON su timestamp de última escritura. Lo usa la alerta
   * "monitor estancado": si `updated_at` no avanza en >2h, el cron está roto.
   */
  async getMonitorStateEntry(key: string): Promise<{ value: string; updated_at: string } | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_monitor_state')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      logger.error('FES storage: getMonitorStateEntry failed', error);
      return null;
    }
    return (data as { value: string; updated_at: string } | null) ?? null;
  }

  // ── Views (fuente del embudo Viewed; walletHash determinista) ─────────────

  async recordView(view: Omit<FESView, 'id' | 'created_at'>): Promise<void> {
    const { error } = await getSupabaseAdmin().from('fes_views').insert({
      wallet_hash: view.wallet_hash,
      cohort: view.cohort,
      message_variant: view.message_variant ?? null,
      channel: view.channel,
      referrer: view.referrer ?? null,
      balance_rif: view.balance_rif ?? null,
      days_inactive: view.days_inactive ?? null,
    });
    if (error) {
      throw new Error(`FES storage: recordView failed → ${error.code}: ${error.message}`);
    }
  }

  /** De la más antigua a la más reciente: la atribución necesita la PRIMERA vista. */
  async getViews(limit = 2000): Promise<FESView[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_views')
      .select('*')
      // Vistas de prueba internas (checks de QA del equipo): excluidas del
      // funnel y de la atribución — contarlas como exposición real mentiría
      // la tasa de vista del piloto (hallazgo del piloto oct-2026).
      .neq('is_internal_test', true)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) {
      // Fail-loud: sin vistas el embudo entero leería 0 y mentiría.
      throw new Error(`FES storage: getViews failed → ${error.code}: ${error.message}`);
    }
    return (data || []) as FESView[];
  }

  // ── Attributions (join persistido vista ↔ stake) ──────────────────────────

  /** Idempotente por wallet_hash ( UNIQUE): re-ejecutar no duplica conversiones. */
  async insertAttribution(a: Omit<FESAttribution, 'id' | 'created_at'>): Promise<boolean> {
    const data = await adminWrite<Array<{ id: string }>>('insertAttribution', (c) =>
      c
        .from('fes_attributions')
        .upsert(
          {
            wallet_hash: a.wallet_hash,
            cohort: a.cohort,
            channel: a.channel ?? null,
            viewed_at: a.viewed_at,
            staked_at: a.staked_at,
            tx_hash: a.tx_hash.toLowerCase(),
            log_index: a.log_index,
            block_number: a.block_number,
            amount_rif: a.amount_rif,
            days_view_to_stake: a.days_view_to_stake,
          },
          { onConflict: 'wallet_hash', ignoreDuplicates: true }
        )
        .select('id')
    );
    // con ignoreDuplicates, solo las filas realmente insertadas vuelven en data
    return Array.isArray(data) && data.length > 0;
  }

  async listAttributions(limit = 500): Promise<FESAttribution[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_attributions')
      .select('*')
      .order('staked_at', { ascending: true })
      .limit(limit);
    if (error) {
      // Fail-loud: una lectura fallida no puede parecer "cero conversiones".
      throw new Error(`FES storage: listAttributions failed → ${error.code}: ${error.message}`);
    }
    return (data || []) as FESAttribution[];
  }

  // ── Pilot meta (identidad inmutable del piloto) ───────────────────────────

  /** Fila única de identidad. null si la migración 002 no se aplicó todavía. */
  async getPilotMeta(key = 'fes_pilot_2026'): Promise<FESPilotMeta | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('fes_pilot_meta')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      logger.error('FES storage: getPilotMeta failed', error);
      return null;
    }
    return (data as FESPilotMeta | null) ?? null;
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

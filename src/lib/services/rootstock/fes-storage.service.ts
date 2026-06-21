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

import { supabase } from '@/lib/services/coordination/supabase';
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

class FESStorageService {
  // ── Participants ──────────────────────────────────────────────────────────

  async upsertParticipant(p: Omit<FESParticipant, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase.from('fes_participants').upsert(
      { ...p, updated_at: now },
      { onConflict: 'wallet' }
    );
    if (error) {
      logger.error('FES storage: upsertParticipant failed', error);
    }
  }

  async batchUpsertParticipants(participants: Omit<FESParticipant, 'created_at' | 'updated_at'>[]): Promise<void> {
    const now = new Date().toISOString();
    const rows = participants.map(p => ({ ...p, updated_at: now }));
    const { error } = await supabase.from('fes_participants').upsert(rows, { onConflict: 'wallet' });
    if (error) {
      logger.error('FES storage: batchUpsertParticipants failed', error);
    }
  }

  async getParticipant(wallet: string): Promise<FESParticipant | null> {
    const { data, error } = await supabase
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

  async listParticipants(cohort?: Cohort, reactivated?: boolean): Promise<FESParticipant[]> {
    let query = supabase.from('fes_participants').select('*');
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
    const { error } = await supabase
      .from('fes_participants')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('wallet', wallet.toLowerCase());

    if (error) {
      logger.error('FES storage: updateParticipantField failed', error);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async recordEvent(event: Omit<FESEvent, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('fes_events').insert({
      wallet: event.wallet.toLowerCase(),
      event_type: event.event_type,
      payload: event.payload || null,
    });
    if (error) {
      logger.error('FES storage: recordEvent failed', error);
    }
  }

  async getEvents(wallet?: string, eventType?: string, limit = 100): Promise<FESEvent[]> {
    let query = supabase.from('fes_events').select('*');
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

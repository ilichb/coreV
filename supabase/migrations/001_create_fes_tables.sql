-- FES Pilot: Create tracking tables
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS fes_participants (
    wallet VARCHAR(42) PRIMARY KEY,
    cohort VARCHAR(5) NOT NULL CHECK (cohort IN ('A', 'B', 'VIP')),
    message_variant VARCHAR(10) NOT NULL CHECK (message_variant IN ('control', 'treatment', 'vip')),
    balance_at_detection NUMERIC NOT NULL,
    days_inactive_at_detection INTEGER NOT NULL,
    last_block_at_detection NUMERIC NOT NULL,
    last_block_checkpoint NUMERIC,
    message_sent_at TIMESTAMPTZ,
    message_language VARCHAR(2) CHECK (message_language IN ('en', 'es')),
    reactivated BOOLEAN DEFAULT FALSE,
    reactivated_at TIMESTAMPTZ,
    last_block_current NUMERIC,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fes_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet VARCHAR(42) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fes_events_wallet ON fes_events(wallet);
CREATE INDEX IF NOT EXISTS idx_fes_events_type ON fes_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fes_participants_cohort ON fes_participants(cohort);
CREATE INDEX IF NOT EXISTS idx_fes_participants_reactivated ON fes_participants(reactivated);
CREATE INDEX IF NOT EXISTS idx_fes_events_created_at ON fes_events(created_at DESC);

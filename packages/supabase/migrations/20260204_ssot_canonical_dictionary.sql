-- ALTA DE DICCIONARIO DE DATOS CANÓNICO v1.2
-- Fecha: 04 de Febrero de 2026

-- 1. Tabla de Lotes (BATCHES)
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number BIGSERIAL UNIQUE,
  milestone_ids UUID[] NOT NULL,
  milestone_count INTEGER NOT NULL,
  compressed_data TEXT,
  data_hash TEXT NOT NULL,
  target_chain TEXT NOT NULL DEFAULT 'VARA',
  status TEXT NOT NULL DEFAULT 'PENDING',
  transaction_hash TEXT,
  block_number INTEGER,
  gas_used DECIMAL(18,0),
  gas_cost_usd DECIMAL(10,2),
  size_bytes INTEGER NOT NULL,
  efficiency_score DECIMAL(5,2),
  priority INTEGER DEFAULT 100,
  max_gas_per_batch DECIMAL(18,0) DEFAULT 10000000,
  max_milestones_per_batch INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON batches (status);
CREATE INDEX IF NOT EXISTS idx_batches_priority ON batches (priority DESC);
CREATE INDEX IF NOT EXISTS idx_batches_created ON batches (created_at DESC);

-- 2. Tabla de Hitos (MILESTONES)
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_hash TEXT UNIQUE NOT NULL,
  user_did TEXT NOT NULL,
  batch_id UUID REFERENCES batches(id),
  scorecard_id UUID REFERENCES scorecards(id),
  action_type TEXT NOT NULL,
  action_metadata JSONB NOT NULL,
  base_points INTEGER NOT NULL,
  multiplier DECIMAL(4,2) DEFAULT 1.0,
  calculated_score INTEGER GENERATED ALWAYS AS (base_points * multiplier) STORED,
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  verification_proof TEXT,
  verified_at TIMESTAMPTZ,
  onchain_state TEXT DEFAULT 'UNSYNCED',
  transaction_hash TEXT,
  block_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_milestones_user_did ON milestones (user_did);
CREATE INDEX IF NOT EXISTS idx_milestones_verification ON milestones (verification_status);
CREATE INDEX IF NOT EXISTS idx_milestones_onchain ON milestones (onchain_state);
CREATE INDEX IF NOT EXISTS idx_milestones_canonical_hash ON milestones (canonical_hash);

-- 3. Tabla de Puntuaciones (REPUTATION_SCORES)
CREATE TABLE IF NOT EXISTS reputation_scores (
  user_did TEXT PRIMARY KEY,
  canonical_hash TEXT UNIQUE NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  governance_score INTEGER NOT NULL DEFAULT 0,
  technical_score INTEGER NOT NULL DEFAULT 0,
  contribution_score INTEGER NOT NULL DEFAULT 0,
  milestone_count INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  consistency_factor DECIMAL(3,2) DEFAULT 1.0,
  percentile_rank DECIMAL(5,2),
  tier TEXT NOT NULL DEFAULT 'BRONZE',
  calculation_period_start DATE NOT NULL DEFAULT CURRENT_DATE - INTERVAL '90 days',
  calculation_period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_cid TEXT,
  snapshot_signature TEXT,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_calculation_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_total ON reputation_scores (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_tier ON reputation_scores (tier);
CREATE INDEX IF NOT EXISTS idx_scores_percentile ON reputation_scores (percentile_rank DESC);

-- 4. Historial de Scores
CREATE TABLE IF NOT EXISTS reputation_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_did TEXT NOT NULL REFERENCES reputation_scores(user_did),
  total_score INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);

-- 5. Mapeo Hitos <-> Lotes
CREATE TABLE IF NOT EXISTS milestone_batch_mapping (
  milestone_id UUID NOT NULL REFERENCES milestones(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  position_in_batch INTEGER NOT NULL,
  PRIMARY KEY (milestone_id, batch_id)
);

-- CONSTRAINTS ADICIONALES
ALTER TABLE milestones ADD CONSTRAINT valid_verification_status 
  CHECK (verification_status IN ('PENDING', 'VERIFIED', 'DISPUTED', 'INVALID'));

ALTER TABLE milestones ADD CONSTRAINT valid_onchain_state
  CHECK (onchain_state IN ('UNSYNCED', 'BATCHED', 'SUBMITTED', 'CONFIRMED', 'FAILED'));

ALTER TABLE batches ADD CONSTRAINT valid_batch_status
  CHECK (status IN ('PENDING', 'BUILDING', 'READY', 'SUBMITTED', 'CONFIRMED', 'FAILED'));

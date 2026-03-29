CREATE TABLE IF NOT EXISTS scorecard_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  proof JSONB,
  transition_guard TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar tabla principal
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'DRAFT';

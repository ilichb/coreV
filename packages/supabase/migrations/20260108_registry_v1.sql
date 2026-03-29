-- Migration: andromeda_registry_v1
-- Description: Create immutable registry tables for Andromeda Core
-- Date: 2026-01-08

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main registry table
CREATE TABLE IF NOT EXISTS registry_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scorecard_id TEXT NOT NULL,
  canonical_hash TEXT NOT NULL UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PUBLISHED', 'ARCHIVED')) DEFAULT 'PUBLISHED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registry_canonical_hash ON registry_entries(canonical_hash);
CREATE INDEX IF NOT EXISTS idx_registry_published_at ON registry_entries(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_registry_state ON registry_entries(state);
CREATE INDEX IF NOT EXISTS idx_registry_scorecard_id ON registry_entries(scorecard_id);

-- View for snapshot (v_registry_snapshot)
CREATE OR REPLACE VIEW v_registry_snapshot AS
SELECT 
  scorecard_id,
  canonical_hash,
  published_at,
  state,
  created_at
FROM registry_entries
WHERE state = 'PUBLISHED'
ORDER BY published_at ASC;

-- Snapshot table
CREATE TABLE IF NOT EXISTS registry_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_hash TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT 'v1',
  entries_hash_array JSONB NOT NULL,
  entries_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  previous_snapshot_hash TEXT REFERENCES registry_snapshots(snapshot_hash)
);

-- Initial empty snapshot
INSERT INTO registry_snapshots (
  snapshot_hash,
  version,
  entries_hash_array,
  entries_count
) VALUES (
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'v1',
  '[]'::jsonb,
  0
) ON CONFLICT (snapshot_hash) DO NOTHING;

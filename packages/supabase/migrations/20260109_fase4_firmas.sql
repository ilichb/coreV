-- Migration: Andromeda Fase 4 - Firmas Criptográficas
-- Date: 2026-01-09
-- Description: Añade campos para firmas EIP-712 y Ed25519

-- 1. Añadir campos de firma a scorecards
ALTER TABLE scorecards 
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signer_did TEXT,
ADD COLUMN IF NOT EXISTS chain VARCHAR(10),
ADD COLUMN IF NOT EXISTS nonce TEXT,
ADD COLUMN IF NOT EXISTS signature_type VARCHAR(20) CHECK (signature_type IN ('EIP-712', 'Ed25519', 'none')),
ADD COLUMN IF NOT EXISTS canonical_hash TEXT UNIQUE;

-- 2. Índices para búsquedas por firma
CREATE INDEX IF NOT EXISTS idx_scorecards_signer_did ON scorecards(signer_did);
CREATE INDEX IF NOT EXISTS idx_scorecards_canonical_hash ON scorecards(canonical_hash);
CREATE INDEX IF NOT EXISTS idx_scorecards_chain ON scorecards(chain);
CREATE INDEX IF NOT EXISTS idx_scorecards_nonce ON scorecards(nonce);

-- 3. Añadir campo de firma al registry
ALTER TABLE registry_entries
ADD COLUMN IF NOT EXISTS signature_metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Tabla de nonces usados (prevenir replay attacks)
CREATE TABLE IF NOT EXISTS used_nonces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nonce TEXT NOT NULL UNIQUE,
  did TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_used_nonces_nonce ON used_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_used_nonces_did ON used_nonces(did);
CREATE INDEX IF NOT EXISTS idx_used_nonces_expires ON used_nonces(expires_at);

-- 5. Función para limpiar nonces expirados
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM used_nonces WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Actualizar vista del snapshot
CREATE OR REPLACE VIEW v_registry_snapshot AS
SELECT 
  scorecard_id,
  canonical_hash,
  published_at,
  state,
  created_at,
  signature_metadata
FROM registry_entries
WHERE state = 'PUBLISHED'
ORDER BY published_at ASC;

COMMENT ON TABLE used_nonces IS 'Almacena nonces usados para prevenir replay attacks en firmas';
COMMENT ON TABLE scorecards IS 'Ahora incluye campos para firmas criptográficas (Fase 4)';

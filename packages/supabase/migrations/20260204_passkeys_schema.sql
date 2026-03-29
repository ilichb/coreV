-- TABLA DE CREDENCIALES WEBAUTHN (PASSKEYS)
-- Fecha: 04 de Febrero de 2026

CREATE TABLE IF NOT EXISTS user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_did TEXT NOT NULL, -- Referencia flexible a DID (puede no estar en reputation_scores aún)
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  transports JSONB, -- ['internal', 'usb', 'nfc', 'ble']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Foreign Key opcional si se quiere enforcing estricto, 
  -- pero permitimos registro de passkey antes de tener score.
  CONSTRAINT fk_user_did FOREIGN KEY (user_did) REFERENCES reputation_scores(user_did) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_passkeys_did ON user_passkeys (user_did);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential ON user_passkeys (credential_id);

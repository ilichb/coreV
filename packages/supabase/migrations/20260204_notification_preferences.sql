-- TABLA DE PREFERENCIAS DE NOTIFICACIÓN
-- Fecha: 04 de Febrero de 2026

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_did TEXT PRIMARY KEY,
  telegram_chat_id TEXT,
  email TEXT,
  discord_webhook TEXT,
  preferences JSONB NOT NULL DEFAULT '{"batchConfirmed": true, "milestoneAchieved": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_notify_prefs_did ON notification_preferences (user_did);

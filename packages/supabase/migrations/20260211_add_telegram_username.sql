-- ADICIÓN DE TELEGRAM_USERNAME A PREFERENCIAS DE NOTIFICACIÓN
-- Fecha: 11 de Febrero de 2026

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Comentario para documentación
COMMENT ON COLUMN notification_preferences.telegram_username IS 'Nombre de usuario de Telegram del operador (@usuario)';

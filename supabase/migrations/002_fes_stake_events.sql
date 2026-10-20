-- FES Pilot: stake events + monitor state (migración 002)
-- Run this in Supabase Dashboard > SQL Editor
--
-- Por qué:
--   * El monitor de atribución antes guardaba sus eventos solo en MongoDB y su
--     checkpoint en Redis (inaccesible desde el runtime serverless, y con
--     TTL de 24h que reiniciaba el escaneo). Necesita un home persistente y
--     auditable: Supabase.
--   * La deduplicación era "buscar el txHash en Mongo antes de insertar", que
--     falla en carreras entre ejecuciones solapadas del cron. Aquí la
--     unicidad la garantiza la base: UNIQUE (tx_hash, log_index).
--
-- NOTA: un log de stake tiene identidad (tx_hash, log_index); una transacción
-- puede contener más de un Transfer al proxy, por eso el índice no es solo
-- tx_hash.

CREATE TABLE IF NOT EXISTS fes_stake_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet VARCHAR(42) NOT NULL,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('stake', 'unstake')),
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    amount_wei NUMERIC NOT NULL,
    amount_rif NUMERIC NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL,
    -- Atribución al experimento: solo tiene sentido para event_type='stake'
    -- que además tuvo una vista de /preview PREVIA. NULL = actividad on-chain
    -- sin atribución (unstake, o stake sin vista previa).
    attributed BOOLEAN NOT NULL DEFAULT FALSE,
    days_view_to_stake NUMERIC,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_fes_stake_events_log UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_fes_stake_events_wallet ON fes_stake_events(wallet);
CREATE INDEX IF NOT EXISTS idx_fes_stake_events_type ON fes_stake_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fes_stake_events_block ON fes_stake_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_fes_stake_events_attributed ON fes_stake_events(attributed) WHERE attributed;

-- Cursor de escaneo del monitor (antes en Redis con TTL).
CREATE TABLE IF NOT EXISTS fes_monitor_state (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: la tabla es sensible (wallets crudas del piloto). Se habilita RLS y
-- NO se crea ninguna policy de lectura/escritura para `anon`/`authenticated`,
-- así que el rol público no puede leer ni escribir. Todo el acceso pasa por
-- el service role (server-side), que bypasea RLS.
ALTER TABLE fes_stake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fes_monitor_state ENABLE ROW LEVEL SECURITY;

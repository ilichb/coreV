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

-- ── fes_views: fuente del embudo Viewed ─────────────────────────────────────
-- Spec del piloto (oct 2026): la vista se guarda con walletHash DETERMINISTA
-- (v3 HMAC-SHA256 con FES_WALLET_HASH_SALT), cohort, channel y referrer.
-- Antes la fuente era `fes_events` con la wallet cruda; el join con
-- fes_attributions se hace por hash, y un hash no determinista (sal que
-- cambia entre procesos) rompería la atribución en cada reinicio — es la
-- alerta #3 del dashboard.
CREATE TABLE IF NOT EXISTS fes_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_hash VARCHAR(128) NOT NULL,
    cohort VARCHAR(8) NOT NULL CHECK (cohort IN ('A', 'B', 'VIP')),
    message_variant VARCHAR(16),
    channel VARCHAR(32) NOT NULL DEFAULT 'unknown',
    referrer TEXT,
    balance_rif NUMERIC,
    days_inactive INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fes_views_wallet_hash ON fes_views(wallet_hash);
CREATE INDEX IF NOT EXISTS idx_fes_views_created_at ON fes_views(created_at);
CREATE INDEX IF NOT EXISTS idx_fes_views_channel ON fes_views(channel);

-- ── fes_attributions: join persistido vista ↔ stake ─────────────────────────
-- Regla del experimento: solo si staked_at > viewed_at y el stake cae dentro
-- de la ventana del piloto. UNIQUE(wallet_hash): la conversión se cuenta POR
-- WALLET — el primer stake que califica convierte; un segundo stake de la
-- misma wallet es volumen, no una conversión nueva.
CREATE TABLE IF NOT EXISTS fes_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_hash VARCHAR(128) NOT NULL,
    cohort VARCHAR(8) NOT NULL CHECK (cohort IN ('A', 'B', 'VIP')),
    channel VARCHAR(32),
    viewed_at TIMESTAMPTZ NOT NULL,
    staked_at TIMESTAMPTZ NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    amount_rif NUMERIC NOT NULL,
    days_view_to_stake NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fes_attributions_wallet UNIQUE (wallet_hash),
    CONSTRAINT uq_fes_attributions_tx UNIQUE (tx_hash, log_index),
    CONSTRAINT chk_fes_attributions_order CHECK (staked_at > viewed_at)
);

CREATE INDEX IF NOT EXISTS idx_fes_attributions_staked_at ON fes_attributions(staked_at);

-- ── fes_pilot_meta: identidad inmutable del piloto ──────────────────────────
-- Una sola fila por piloto: CID del snapshot publicado, merkle root, seed de
-- la asignación de cohortes, ventana, tamaño de cohorte y piso de exposición.
-- Es el contrato que referencia el reporte final (11-nov): si cambia, cambió
-- el experimento. Por eso el trigger de más abajo bloquea UPDATE y DELETE.
CREATE TABLE IF NOT EXISTS fes_pilot_meta (
    key VARCHAR(64) PRIMARY KEY,
    snapshot_cid TEXT NOT NULL,
    merkle_root TEXT NOT NULL,
    seed TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    cohort_count INTEGER NOT NULL,
    cohort_breakdown JSONB NOT NULL,
    exposure_floor INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fes_pilot_meta_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'fes_pilot_meta es inmutable: no se permite % sobre la identidad del piloto', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fes_pilot_meta_immutable ON fes_pilot_meta;
CREATE TRIGGER trg_fes_pilot_meta_immutable
    BEFORE UPDATE OR DELETE ON fes_pilot_meta
    FOR EACH ROW EXECUTE FUNCTION fes_pilot_meta_block_mutation();

-- Fila del piloto vigente. Idempotente (ON CONFLICT DO NOTHING): la tabla es
-- inmutable, un re-run de la migración no puede 'corregirla' — para cambiar
-- la identidad del piloto haría falta una nueva fila con otra key y una
-- decisión explícita del dueño del proyecto.
INSERT INTO fes_pilot_meta (
    key, snapshot_cid, merkle_root, seed, window_start, window_end,
    cohort_count, cohort_breakdown, exposure_floor
) VALUES (
    'fes_pilot_2026',
    'QmZZpiMZcLmsm3K8ASHaXB3t9Pkdi4ZNsYci7FWTY9ja9b',
    'f203d6de9fbc91e02b7cb79a6847eecb41ef5cd647303f68d1f995c5cee1c0ad',
    '2e5fbdd12f6315578fb2a3e9633f0d2e6870d6f6ab30047b947a4115efd16683',
    '2026-10-14T08:45:00Z',
    '2026-11-11T08:45:00Z',
    18,
    '{"A": 9, "B": 8, "VIP": 1}'::jsonb,
    8
) ON CONFLICT (key) DO NOTHING;

-- RLS: las tablas son sensibles (wallets hasheadas pero vinculables, y la
-- identidad del piloto). Se habilita RLS y NO se crea ninguna policy de
-- lectura/escritura para `anon`/`authenticated`, así que el rol público no
-- puede leer ni escribir. Todo el acceso pasa por el service role
-- (server-side), que bypasea RLS.
ALTER TABLE fes_stake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fes_monitor_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE fes_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE fes_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fes_pilot_meta ENABLE ROW LEVEL SECURITY;

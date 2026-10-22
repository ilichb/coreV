-- 003: marca las vistas de prueba internas del equipo (checks de QA hechos
-- durante el desarrollo del piloto) para excluirlas del funnel y de la
-- atribución. Sin esta marca, el dashboard contaba esas vistas como
-- exposición real y reportaba una "tasa vista" que no existía en holders
-- reales (feedback del piloto, oct-2026).
--
-- Las filas existentes a la fecha de la migración son TODO tráfico de
-- prueba: el enlace del piloto todavía no se distribuyó a los holders.
-- Las vistas reales futuras nacen con is_internal_test = false (default).

ALTER TABLE fes_views
  ADD COLUMN IF NOT EXISTS is_internal_test BOOLEAN NOT NULL DEFAULT false;

UPDATE fes_views
SET is_internal_test = true
WHERE created_at <= '2026-10-22T23:59:59+00:00';

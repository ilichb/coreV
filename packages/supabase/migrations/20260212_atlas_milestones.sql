-- MIGRACIÓN PARA ATLAS MILESTONES REGISTRY
-- Fecha: 12 de Febrero de 2026
-- Autor: Arquitecto Principal de ANDR0M3DA

-- Crear tabla atlas_milestones para la Capa M2 de ATLAS
CREATE TABLE IF NOT EXISTS atlas_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  atlas_id TEXT NOT NULL UNIQUE, -- Clave primaria lógica (hash canónico)
  milestone_data JSONB NOT NULL, -- Datos completos del CanonicalMilestoneProof
  canonical_artifact_cid TEXT, -- CID del artefacto JSON en IPFS
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'CHALLENGED', 'IMMUTABLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_scorecard_cid TEXT, -- CID del Scorecard original en IPFS
  source_scorecard_hash TEXT -- Hash canónico del Scorecard original
);

-- Comentarios para documentación
COMMENT ON TABLE atlas_milestones IS 'Registro inmutable de hitos verificados de ATLAS (Capa M2)';
COMMENT ON COLUMN atlas_milestones.atlas_id IS 'Identificador único del hito (hash canónico) - Clave primaria lógica';
COMMENT ON COLUMN atlas_milestones.milestone_data IS 'Datos completos del CanonicalMilestoneProof en formato JSONB';
COMMENT ON COLUMN atlas_milestones.canonical_artifact_cid IS 'CID del artefacto JSON canónico subido a IPFS';
COMMENT ON COLUMN atlas_milestones.status IS 'Estado de verificación del hito';
COMMENT ON COLUMN atlas_milestones.source_scorecard_cid IS 'Referencia al CID del Scorecard original en IPFS';
COMMENT ON COLUMN atlas_milestones.source_scorecard_hash IS 'Hash canónico del Scorecard original para trazabilidad';

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_atlas_milestones_atlas_id ON atlas_milestones(atlas_id);
CREATE INDEX IF NOT EXISTS idx_atlas_milestones_status ON atlas_milestones(status);
CREATE INDEX IF NOT EXISTS idx_atlas_milestones_created_at ON atlas_milestones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atlas_milestones_source_scorecard_hash ON atlas_milestones(source_scorecard_hash);

-- Trigger para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_atlas_milestones_updated_at 
  BEFORE UPDATE ON atlas_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vista para snapshot de hitos verificados
CREATE OR REPLACE VIEW v_atlas_milestones_snapshot AS
SELECT 
  atlas_id,
  status,
  created_at,
  updated_at,
  source_scorecard_cid,
  source_scorecard_hash,
  canonical_artifact_cid
FROM atlas_milestones
WHERE status IN ('VERIFIED', 'IMMUTABLE')
ORDER BY created_at DESC;

-- Comentario de la vista
COMMENT ON VIEW v_atlas_milestones_snapshot IS 'Snapshot de hitos ATLAS verificados e inmutables para consultas rápidas';
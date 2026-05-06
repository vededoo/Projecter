-- ============================================================================
-- Migration 007 : Sources N-to-N projets (refactoring project_sources)
-- ============================================================================
-- Contexte :
--   Un document source peut être pertinent pour plusieurs projets.
--   Ex: "Principes de gouvernance applicative" → tous les projets MFWB.
--   On migre project_sources (1-to-N) vers un modèle N-to-N, identique
--   au pattern risks ↔ risk_projects (migration 005).
--
-- Changements :
--   1. Renommer project_sources → sources (le doc n'appartient plus à 1 projet)
--   2. Créer source_projects : liaison N-to-N sources ↔ projects
--   3. Migrer les données existantes (project_id → source_projects)
--   4. Supprimer project_id de sources
--   5. Vue v_sources : sources avec leurs projets agrégés
--   6. Adapter les routes : /sources (top-level) + /source-projects
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Renommer la table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE project_sources RENAME TO sources;

-- Renommer les index associés
ALTER INDEX IF EXISTS idx_project_sources_project RENAME TO idx_sources_project_id_old;
ALTER INDEX IF EXISTS idx_project_sources_type    RENAME TO idx_sources_type;

-- Renommer le trigger et la fonction
ALTER TRIGGER trg_project_sources_updated_at ON sources
  RENAME TO trg_sources_updated_at;

ALTER FUNCTION update_project_sources_updated_at()
  RENAME TO update_sources_updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Table de liaison sources ↔ projects (N-to-N)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS source_projects (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  context     TEXT,         -- précise pourquoi ce doc est pertinent pour CE projet
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, project_id)
);

CREATE INDEX idx_source_projects_source  ON source_projects (source_id);
CREATE INDEX idx_source_projects_project ON source_projects (project_id);

COMMENT ON TABLE source_projects IS 'Liaison N-to-N entre sources documentaires et projets.';
COMMENT ON COLUMN source_projects.context IS 'Précise pourquoi ce document est pertinent pour CE projet spécifique.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Migrer les données existantes
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO source_projects (source_id, project_id)
SELECT id, project_id FROM sources WHERE project_id IS NOT NULL
ON CONFLICT (source_id, project_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Supprimer project_id de sources
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sources DROP CONSTRAINT IF EXISTS project_sources_project_id_fkey;
ALTER TABLE sources DROP COLUMN IF EXISTS project_id;
DROP INDEX IF EXISTS idx_sources_project_id_old;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Vue v_sources : sources avec projets agrégés
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_sources AS
SELECT
  s.id,
  s.title,
  s.source_type,
  s.description,
  s.extraction_status,
  s.extraction_error,
  length(s.extracted_text) AS extracted_chars,
  s.storage_path,
  s.original_filename,
  s.mime_type,
  s.file_size_bytes,
  s.uploaded_by_contact_id,
  s.created_at,
  s.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'project_id',    p.id,
        'project_code',  p.code,
        'project_title', p.title,
        'context',       sp.context
      )
      ORDER BY p.code
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS projects
FROM sources s
LEFT JOIN source_projects sp ON sp.source_id = s.id
LEFT JOIN projects p ON p.id = sp.project_id
GROUP BY s.id;

COMMENT ON VIEW v_sources IS 'Sources documentaires avec leurs projets liés (N-to-N). Utilisée par le MCP et l''API.';

COMMIT;

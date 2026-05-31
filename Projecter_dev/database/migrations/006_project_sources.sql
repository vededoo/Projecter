-- ============================================================================
-- Migration 006 : Documents sources projet
-- ============================================================================
-- Contexte :
--   Un projet peut être accompagné de documents de référence libres :
--   liste de PCs, directives, contrats, specs, tableurs... dont on ne connaît
--   jamais la structure à l'avance.
--
--   Deux modes d'alimentation :
--     A) Via chat LLM (MCP tool create_project_source) : le LLM lit le fichier
--        passé en contexte, extrait le texte et écrit directement en DB.
--     B) Via UI upload (futur) : pipeline parse → extracted_text automatique.
--
--   La colonne `embedding` est réservée pour une activation pgvector future
--   (RAG), sans impacter le schéma actuel.
-- ============================================================================

BEGIN;

CREATE TABLE project_sources (
  id                      SERIAL PRIMARY KEY,
  project_id              INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  title                   TEXT NOT NULL,
  source_type             TEXT,              -- libre : "pc_list", "directive", "contract", "spec", ...
  description             TEXT,              -- résumé humain (saisi ou généré par le LLM)

  -- Contenu extrait
  extracted_text          TEXT,              -- texte brut parsé (peut être NULL si parsing non encore fait)
  extraction_status       TEXT NOT NULL DEFAULT 'pending'
                            CHECK (extraction_status IN ('pending', 'success', 'failed', 'skipped')),
  extraction_error        TEXT,

  -- Fichier original (upload futur)
  storage_path            TEXT,              -- /storage/projects/{project_id}/sources/{uuid}.ext
  original_filename       TEXT,
  mime_type               TEXT,
  file_size_bytes         INTEGER,

  -- RAG (phase future — nécessite pgvector)
  -- embedding             vector(1536),
  embedded_at             TIMESTAMPTZ,

  -- Méta
  uploaded_by_contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_sources_project ON project_sources (project_id);
CREATE INDEX idx_project_sources_type    ON project_sources (source_type) WHERE source_type IS NOT NULL;

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_project_sources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_sources_updated_at
  BEFORE UPDATE ON project_sources
  FOR EACH ROW EXECUTE FUNCTION update_project_sources_updated_at();

COMMENT ON TABLE project_sources IS 'Documents sources libres liés à un projet : liste de PCs, directives, specs, contrats... Le texte extrait est stocké dans extracted_text pour être lu par un LLM via MCP.';
COMMENT ON COLUMN project_sources.source_type IS 'Label libre pour catégoriser (pc_list, directive, spec, contract, ...). Pas d''enum pour rester flexible.';
COMMENT ON COLUMN project_sources.extraction_status IS 'pending = pas encore parsé, success = extracted_text rempli, failed = erreur parsing, skipped = format non supporté.';
COMMENT ON COLUMN project_sources.storage_path IS 'Chemin relatif dans /storage/projects/{project_id}/sources/. NULL si le document a été injecté directement via MCP (pas de fichier physique).';

COMMIT;

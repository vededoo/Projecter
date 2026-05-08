-- ========================================================================
-- Projecter — Document templates & generation tracking
-- Migration 009 — 2026-05-08
-- ========================================================================

-- Table des templates Word (.docx avec {{variables}} docxtemplater)
CREATE TABLE document_templates (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    doc_type     document_type NOT NULL,
    description  TEXT,
    file_path    VARCHAR(512) NOT NULL,         -- chemin relatif depuis templates_root
    variables    JSONB NOT NULL DEFAULT '[]',   -- ['project_title', 'pm_name', ...]
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_doc_template_name ON document_templates (name) WHERE active = true;

-- Colonnes supplémentaires sur documents pour le suivi de génération
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS template_id          INTEGER REFERENCES document_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS template_vars        JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS generated_file_path  VARCHAR(512),
    ADD COLUMN IF NOT EXISTS meeting_id           INTEGER REFERENCES meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_template ON documents (template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_meeting  ON documents (meeting_id)  WHERE meeting_id  IS NOT NULL;

CREATE TRIGGER trg_document_templates_upd
    BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ========================================================================
-- 002 — Statut à date du projet (executive summary)
-- ========================================================================

CREATE TYPE rag_color AS ENUM ('green', 'orange', 'red', 'grey');

ALTER TABLE projects
    ADD COLUMN status_brief            TEXT,                                    -- markdown libre
    ADD COLUMN status_brief_updated_at TIMESTAMPTZ,
    ADD COLUMN status_brief_updated_by INTEGER REFERENCES contacts(id),
    ADD COLUMN rag_global              rag_color NOT NULL DEFAULT 'grey',
    ADD COLUMN rag_planning            rag_color NOT NULL DEFAULT 'grey',
    ADD COLUMN rag_budget              rag_color NOT NULL DEFAULT 'grey',
    ADD COLUMN rag_scope               rag_color NOT NULL DEFAULT 'grey',
    ADD COLUMN rag_risques             rag_color NOT NULL DEFAULT 'grey',
    ADD COLUMN highlights              JSONB NOT NULL DEFAULT '[]'::jsonb,    -- ["...", "..."]
    ADD COLUMN concerns                JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN next_steps              JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_projects_rag_global ON projects (rag_global);

-- Historique des versions de status_brief (snapshots) pour tendance
CREATE TABLE project_status_history (
    id                      SERIAL PRIMARY KEY,
    project_id              INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status_brief            TEXT,
    rag_global              rag_color,
    rag_planning            rag_color,
    rag_budget              rag_color,
    rag_scope               rag_color,
    rag_risques             rag_color,
    highlights              JSONB,
    concerns                JSONB,
    next_steps              JSONB,
    snapshot_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snapshot_by_contact_id  INTEGER REFERENCES contacts(id),
    commentaire             TEXT
);
CREATE INDEX idx_psh_project_date ON project_status_history (project_id, snapshot_at DESC);

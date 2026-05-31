-- ========================================================================
-- Projecter — Initial schema (English)
-- DB: Projecter_dev
-- Conventions: snake_case, IDs as SERIAL, JSONB `attributes` for free-form,
-- French FTS for ingested document text.
-- ========================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pgvector enabled in Phase 4:
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================================================
-- Reference tables
-- ========================================================================

CREATE TABLE organizations (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(32) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(32) NOT NULL DEFAULT 'client', -- etnic | client | vendor | partner
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE cc_level AS ENUM ('dg', 'division', 'cc', 'team', 'subteam');

CREATE TABLE competency_centers (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(64) UNIQUE NOT NULL,
    label               VARCHAR(255) NOT NULL,
    department          VARCHAR(128),
    level               cc_level,
    parent_id           INTEGER REFERENCES competency_centers(id) ON DELETE SET NULL,
    manager_contact_id  INTEGER,                          -- FK added later (contacts not yet created)
    is_interim          BOOLEAN NOT NULL DEFAULT FALSE,
    display_order       INTEGER NOT NULL DEFAULT 0,
    notes               TEXT,
    active              BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_cc_parent  ON competency_centers (parent_id);
CREATE INDEX idx_cc_level   ON competency_centers (level);

CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    label       VARCHAR(128) UNIQUE NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public_procurements (
    id                  SERIAL PRIMARY KEY,
    reference           VARCHAR(64) UNIQUE NOT NULL,
    label               VARCHAR(255) NOT NULL,
    type                VARCHAR(64),
    awarded_at          DATE,
    ends_at             DATE,
    active              BOOLEAN NOT NULL DEFAULT TRUE
);

-- ========================================================================
-- Contacts (cross-project base)
-- ========================================================================

CREATE TABLE contacts (
    id                  SERIAL PRIMARY KEY,
    last_name           VARCHAR(128) NOT NULL,
    first_name          VARCHAR(128),
    email               VARCHAR(255),
    phone               VARCHAR(64),
    organization_id     INTEGER REFERENCES organizations(id),
    job_title           VARCHAR(255),
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contacts_lastname_trgm ON contacts USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_contacts_org           ON contacts (organization_id) WHERE active = TRUE;
CREATE UNIQUE INDEX uq_contact_identity ON contacts (lower(last_name), lower(coalesce(first_name,'')), coalesce(organization_id,0));

ALTER TABLE competency_centers
    ADD CONSTRAINT fk_cc_manager FOREIGN KEY (manager_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX idx_cc_manager ON competency_centers (manager_contact_id);

-- ========================================================================
-- Memberships (contact <-> competency center)
-- ========================================================================

CREATE TYPE membership_role AS ENUM (
    'manager',
    'team_leader',
    'member',
    'consultant',
    'advisor',
    'analyst',
    'detached'
);

CREATE TABLE memberships (
    id              SERIAL PRIMARY KEY,
    contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    cc_id           INTEGER NOT NULL REFERENCES competency_centers(id) ON DELETE CASCADE,
    role            membership_role NOT NULL DEFAULT 'member',
    started_at      DATE,
    ended_at        DATE,
    is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_memberships ON memberships (contact_id, cc_id, role) WHERE ended_at IS NULL;
CREATE INDEX idx_membership_contact ON memberships (contact_id);
CREATE INDEX idx_membership_cc      ON memberships (cc_id);

-- ========================================================================
-- Projects
-- ========================================================================

CREATE TYPE project_status AS ENUM (
    'idea',
    'mandate_received',
    'briefing_draft', 'briefing_review', 'briefing_approved',
    'sheet_draft', 'sheet_review',
    'sheet_approved_etnic', 'sheet_approved_wbe', 'sheet_signed',
    'in_progress', 'closed', 'cancelled'
);

CREATE TYPE urgency_level  AS ENUM ('high', 'medium', 'low');
CREATE TYPE priority_level AS ENUM ('ca', 'pdi', 'other');
CREATE TYPE rag_color      AS ENUM ('green', 'amber', 'red', 'grey');

CREATE TABLE projects (
    id                          SERIAL PRIMARY KEY,
    code                        VARCHAR(32) UNIQUE,
    title                       VARCHAR(512) NOT NULL,
    slug                        VARCHAR(255) UNIQUE NOT NULL,
    status                      project_status NOT NULL DEFAULT 'idea',
    client_organization_id      INTEGER REFERENCES organizations(id),
    requesting_service          VARCHAR(255),
    urgency                     urgency_level,
    priority                    priority_level,
    priority_comment            TEXT,
    security_privacy_required   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Key dates
    desired_start_date          DATE,
    desired_end_date            DATE,
    proposed_start_date         DATE,
    proposed_end_date           DATE,
    actual_start_date           DATE,
    actual_end_date             DATE,

    -- External identifiers
    mantis_id                   VARCHAR(64),
    ged_id                      VARCHAR(64),

    -- Meta
    portfolio                   VARCHAR(255),
    project_nature              VARCHAR(128),
    sector                      VARCHAR(128),

    -- Status brief (RAG-style executive summary)
    status_brief                TEXT,
    status_brief_updated_at     TIMESTAMPTZ,
    status_brief_updated_by     INTEGER REFERENCES contacts(id),
    rag_global                  rag_color NOT NULL DEFAULT 'grey',
    rag_planning                rag_color NOT NULL DEFAULT 'grey',
    rag_budget                  rag_color NOT NULL DEFAULT 'grey',
    rag_scope                   rag_color NOT NULL DEFAULT 'grey',
    rag_risks                   rag_color NOT NULL DEFAULT 'grey',
    highlights                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    concerns                    JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_steps                  JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Catch-all for narrative / doc-specific data
    -- Conventional keys: objectives, benefits, deliverables, constraints,
    --                    impacted_populations, costs, scope, …
    attributes                  JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_status     ON projects (status);
CREATE INDEX idx_projects_client     ON projects (client_organization_id);
CREATE INDEX idx_projects_title      ON projects USING gin (title gin_trgm_ops);
CREATE INDEX idx_projects_attributes ON projects USING gin (attributes);

-- Snapshot history of status briefs for trend analysis
CREATE TABLE project_status_history (
    id                          SERIAL PRIMARY KEY,
    project_id                  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_brief                TEXT,
    rag_global                  rag_color,
    rag_planning                rag_color,
    rag_budget                  rag_color,
    rag_scope                   rag_color,
    rag_risks                   rag_color,
    highlights                  JSONB,
    concerns                    JSONB,
    next_steps                  JSONB,
    snapshotted_by              INTEGER REFERENCES contacts(id)
);
CREATE INDEX idx_status_history_project ON project_status_history (project_id, snapshot_at DESC);

-- ========================================================================
-- Project members (project <-> contacts with role)
-- ========================================================================

CREATE TYPE project_role AS ENUM (
    'sponsor_wbe', 'sponsor_etnic',
    'requester', 'responsible_for_request',
    'etnic_project_manager', 'business_project_manager',
    'etnic_portfolio_manager', 'wbe_portfolio_manager',
    'expert',
    'it_team_member', 'business_team_member',
    'observer'
);

CREATE TABLE project_members (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contact_id      INTEGER NOT NULL REFERENCES contacts(id),
    role            project_role NOT NULL,
    cc_id           INTEGER REFERENCES competency_centers(id),
    role_id         INTEGER REFERENCES roles(id),
    effort_md       NUMERIC(10,2),                 -- effort in man-days
    to_be_hired     BOOLEAN NOT NULL DEFAULT FALSE,
    comments        TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pm_project ON project_members (project_id);
CREATE INDEX idx_pm_contact ON project_members (contact_id);
CREATE UNIQUE INDEX uq_pm_role ON project_members (project_id, contact_id, role, coalesce(cc_id, 0));

-- ========================================================================
-- Risks (promoted to typed table — cross-project dashboards)
-- ========================================================================

CREATE TYPE risk_status AS ENUM ('open', 'mitigating', 'closed', 'accepted');
CREATE TYPE risk_level  AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE risks (
    id                  SERIAL PRIMARY KEY,
    project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label               VARCHAR(512) NOT NULL,
    description         TEXT,
    probability         risk_level,
    impact              risk_level,
    severity            risk_level,            -- computed/derived; can store proba×impact bucket
    status              risk_status NOT NULL DEFAULT 'open',
    owner_contact_id    INTEGER REFERENCES contacts(id),
    mitigation_plan     TEXT,
    due_date            DATE,
    detected_at         DATE NOT NULL DEFAULT CURRENT_DATE,
    closed_at           DATE,
    attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_risks_project  ON risks (project_id);
CREATE INDEX idx_risks_status   ON risks (status);
CREATE INDEX idx_risks_severity ON risks (severity);
CREATE INDEX idx_risks_due      ON risks (due_date) WHERE status IN ('open', 'mitigating');

-- ========================================================================
-- Documents (Mandate, Briefing, DIP, Project Sheet, minutes, appendices…)
-- ========================================================================

CREATE TYPE document_type   AS ENUM ('mandate', 'briefing_note', 'dip', 'project_sheet', 'meeting_minutes', 'appendix', 'other');
CREATE TYPE document_status AS ENUM ('draft', 'review', 'approved_etnic', 'approved_wbe', 'signed', 'archived');

CREATE TABLE documents (
    id                          SERIAL PRIMARY KEY,
    project_id                  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type                        document_type NOT NULL,
    title                       VARCHAR(512),
    version                     VARCHAR(32) NOT NULL DEFAULT '0.1',
    status                      document_status NOT NULL DEFAULT 'draft',
    drafted_at                  DATE,
    etnic_approved_at           DATE,
    wbe_approved_at             DATE,
    signed_at                   DATE,
    author_contact_id           INTEGER REFERENCES contacts(id),
    attributes                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_from_template     BOOLEAN NOT NULL DEFAULT FALSE,
    parent_document_id          INTEGER REFERENCES documents(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_project    ON documents (project_id);
CREATE INDEX idx_documents_type       ON documents (project_id, type);
CREATE INDEX idx_documents_status     ON documents (status);
CREATE INDEX idx_documents_attributes ON documents USING gin (attributes);
CREATE UNIQUE INDEX uq_document_version ON documents (project_id, type, version);

-- ========================================================================
-- Document files (binary storage on disk + extracted text for FTS/RAG)
-- ========================================================================

CREATE TYPE extraction_status AS ENUM ('pending', 'success', 'failed', 'skipped');

CREATE TABLE document_files (
    id                          SERIAL PRIMARY KEY,
    document_id                 INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    original_filename           VARCHAR(512) NOT NULL,
    mimetype                    VARCHAR(128),
    size_bytes                  BIGINT,
    storage_path                VARCHAR(1024) NOT NULL,        -- relative to STORAGE_ROOT
    sha256                      VARCHAR(64),
    extracted_text              TEXT,
    extraction_status           extraction_status NOT NULL DEFAULT 'pending',
    extraction_error            TEXT,
    uploaded_by_contact_id      INTEGER REFERENCES contacts(id),
    uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_files_document ON document_files (document_id);
CREATE INDEX idx_files_text     ON document_files
    USING gin (to_tsvector('french', coalesce(extracted_text, '')));

-- ========================================================================
-- Meetings (link to Transformer transcripts)
-- ========================================================================

CREATE TYPE meeting_type AS ENUM (
    'etnic_excom', 'wbe_excom',
    'governance_committee', 'steering_committee', 'portfolio_committee',
    'technical_wg', 'functional_wg', 'procurement_wg',
    'kickoff', 'follow_up', 'other'
);

CREATE TABLE meetings (
    id                          SERIAL PRIMARY KEY,
    project_id                  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title                       VARCHAR(512) NOT NULL,
    type                        meeting_type NOT NULL,
    start_at                    TIMESTAMPTZ NOT NULL,
    end_at                      TIMESTAMPTZ,
    location                    VARCHAR(255),
    video_link                  VARCHAR(512),
    transformer_transcript_id   VARCHAR(128),
    minutes                     TEXT,
    decisions                   TEXT,
    actions                     TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meetings_project ON meetings (project_id);
CREATE INDEX idx_meetings_date    ON meetings (start_at);

CREATE TYPE attendance_status AS ENUM ('present', 'excused', 'absent', 'invited');

CREATE TABLE meeting_attendees (
    id              SERIAL PRIMARY KEY,
    meeting_id      INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    contact_id      INTEGER NOT NULL REFERENCES contacts(id),
    status          attendance_status NOT NULL DEFAULT 'invited',
    UNIQUE (meeting_id, contact_id)
);
CREATE INDEX idx_attendees_meeting ON meeting_attendees (meeting_id);

-- ========================================================================
-- Timeline events (cross-project view: CODIRs, governance, milestones)
-- ========================================================================

CREATE TYPE timeline_event_type AS ENUM (
    'etnic_excom', 'wbe_excom',
    'portfolio_committee', 'governance_committee',
    'minister_signature',
    'project_milestone', 'deadline',
    'other'
);

CREATE TABLE timeline_events (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    label           VARCHAR(512) NOT NULL,
    type            timeline_event_type NOT NULL,
    event_date      DATE NOT NULL,
    is_estimated    BOOLEAN NOT NULL DEFAULT FALSE,
    is_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
    description     TEXT,
    resources       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_timeline_date    ON timeline_events (event_date);
CREATE INDEX idx_timeline_project ON timeline_events (project_id);
CREATE INDEX idx_timeline_type    ON timeline_events (type, event_date);

-- ========================================================================
-- updated_at trigger
-- ========================================================================

CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_upd  BEFORE UPDATE ON contacts  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_projects_upd  BEFORE UPDATE ON projects  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_documents_upd BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_meetings_upd  BEFORE UPDATE ON meetings  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_risks_upd     BEFORE UPDATE ON risks     FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

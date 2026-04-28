-- ========================================================================
-- Projecter — Schéma initial
-- DB: Projecter_dev
-- ========================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pgvector activé en Phase 4 :
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================================================
-- Tables de référence
-- ========================================================================

CREATE TABLE organisations (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(32) UNIQUE NOT NULL,
    nom         VARCHAR(255) NOT NULL,
    type        VARCHAR(32) NOT NULL DEFAULT 'beneficiaire', -- etnic | beneficiaire | prestataire | partenaire
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE centres_competences (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(64) UNIQUE NOT NULL,
    libelle     VARCHAR(255) NOT NULL,
    departement VARCHAR(128),
    actif       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE profils (
    id          SERIAL PRIMARY KEY,
    libelle     VARCHAR(128) UNIQUE NOT NULL,
    actif       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE marches_publics (
    id              SERIAL PRIMARY KEY,
    reference       VARCHAR(64) UNIQUE NOT NULL,
    libelle         VARCHAR(255) NOT NULL,
    type            VARCHAR(64),
    date_attribution DATE,
    date_fin         DATE,
    actif           BOOLEAN NOT NULL DEFAULT TRUE
);

-- ========================================================================
-- Contacts (base cross-projets)
-- ========================================================================

CREATE TABLE contacts (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(128) NOT NULL,
    prenom          VARCHAR(128),
    email           VARCHAR(255),
    telephone       VARCHAR(64),
    organisation_id INTEGER REFERENCES organisations(id),
    fonction        VARCHAR(255),
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contacts_nom_trgm   ON contacts USING gin (nom gin_trgm_ops);
CREATE INDEX idx_contacts_org        ON contacts (organisation_id) WHERE actif = TRUE;
CREATE UNIQUE INDEX uq_contact_identity ON contacts (lower(nom), lower(coalesce(prenom,'')), coalesce(organisation_id,0));

-- ========================================================================
-- Projets
-- ========================================================================

CREATE TYPE project_status AS ENUM (
    'idea',
    'mandate_received',
    'expose_draft', 'expose_review', 'expose_approved',
    'fiche_draft', 'fiche_review',
    'fiche_approved_etnic', 'fiche_approved_wbe', 'fiche_signed',
    'in_progress', 'closed', 'cancelled'
);

CREATE TYPE urgence_level AS ENUM ('haute', 'moyenne', 'basse');
CREATE TYPE priorite_level AS ENUM ('ca', 'pdi', 'autre');

CREATE TABLE projects (
    id                          SERIAL PRIMARY KEY,
    code                        VARCHAR(32) UNIQUE,                    -- ex: 218992 (Mantis/GED)
    intitule                    VARCHAR(512) NOT NULL,
    slug                        VARCHAR(255) UNIQUE NOT NULL,
    statut                      project_status NOT NULL DEFAULT 'idea',
    beneficiaire_organisation_id INTEGER REFERENCES organisations(id),
    service_demandeur           VARCHAR(255),
    urgence                     urgence_level,
    priorite                    priorite_level,
    priorite_commentaire        TEXT,
    security_privacy_required   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Dates clés
    date_demarrage_souhaitee    DATE,
    date_fin_souhaitee          DATE,
    date_demarrage_proposee     DATE,
    date_fin_proposee           DATE,
    date_demarrage_reelle       DATE,
    date_fin_reelle             DATE,

    -- Identifiants externes
    mantis_id                   VARCHAR(64),
    ged_id                      VARCHAR(64),

    -- Méta
    portefeuille                VARCHAR(255),
    nature_projet               VARCHAR(128),
    secteur                     VARCHAR(128),

    -- Fourre-tout pour spécificités
    attributes                  JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_statut    ON projects (statut);
CREATE INDEX idx_projects_benef     ON projects (beneficiaire_organisation_id);
CREATE INDEX idx_projects_intitule  ON projects USING gin (intitule gin_trgm_ops);
CREATE INDEX idx_projects_attrs     ON projects USING gin (attributes);

-- ========================================================================
-- Liens projet ↔ contacts (rôles)
-- ========================================================================

CREATE TYPE project_role AS ENUM (
    'sponsor_wbe', 'sponsor_etnic',
    'demandeur', 'responsable_demande',
    'chef_projet_etnic', 'chef_projet_metier',
    'portfolio_manager_etnic', 'portfolio_manager_wbe',
    'expert',
    'membre_equipe_it', 'membre_equipe_metier',
    'observateur'
);

CREATE TABLE project_contacts (
    id                      SERIAL PRIMARY KEY,
    project_id              INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contact_id              INTEGER NOT NULL REFERENCES contacts(id),
    role                    project_role NOT NULL,
    centre_competence_id    INTEGER REFERENCES centres_competences(id),
    profil_id               INTEGER REFERENCES profils(id),
    charge_jh               NUMERIC(10,2),
    a_recruter              BOOLEAN NOT NULL DEFAULT FALSE,
    commentaires            TEXT,
    ordre                   INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pc_project ON project_contacts (project_id);
CREATE INDEX idx_pc_contact ON project_contacts (contact_id);
CREATE UNIQUE INDEX uq_pc_role_unique
    ON project_contacts (project_id, contact_id, role, coalesce(centre_competence_id, 0));

-- ========================================================================
-- Populations impactées
-- ========================================================================

CREATE TABLE populations_impactees (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    libelle         VARCHAR(255) NOT NULL,
    volumetrie      INTEGER,
    commentaires    TEXT,
    ordre           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_pop_project ON populations_impactees (project_id);

-- ========================================================================
-- Documents (Mandat, Exposé, Fiche, DIP, CR, annexes...)
-- ========================================================================

CREATE TYPE document_type   AS ENUM ('mandat', 'expose', 'dip', 'fiche_projet', 'cr_reunion', 'annexe', 'autre');
CREATE TYPE document_status AS ENUM ('draft', 'review', 'approved_etnic', 'approved_wbe', 'signed', 'archived');

CREATE TABLE documents (
    id                          SERIAL PRIMARY KEY,
    project_id                  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type                        document_type NOT NULL,
    titre                       VARCHAR(512),
    version                     VARCHAR(32) NOT NULL DEFAULT '0.1',
    statut                      document_status NOT NULL DEFAULT 'draft',
    date_redaction              DATE,
    date_validation_etnic       DATE,
    date_validation_wbe         DATE,
    date_signature              DATE,
    redacteur_contact_id        INTEGER REFERENCES contacts(id),
    attributes                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_from_template     BOOLEAN NOT NULL DEFAULT FALSE,
    parent_document_id          INTEGER REFERENCES documents(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_project    ON documents (project_id);
CREATE INDEX idx_documents_type       ON documents (project_id, type);
CREATE INDEX idx_documents_statut     ON documents (statut);
CREATE INDEX idx_documents_attributes ON documents USING gin (attributes);
CREATE UNIQUE INDEX uq_document_version ON documents (project_id, type, version);

-- ========================================================================
-- Fichiers binaires (.docx, .pdf...)
-- ========================================================================

CREATE TYPE extraction_status AS ENUM ('pending', 'success', 'failed', 'skipped');

CREATE TABLE document_files (
    id                  SERIAL PRIMARY KEY,
    document_id         INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    filename_original   VARCHAR(512) NOT NULL,
    mimetype            VARCHAR(128),
    size_bytes          BIGINT,
    storage_path        VARCHAR(1024) NOT NULL,        -- relatif à storage/
    checksum_sha256     VARCHAR(64),
    extracted_text      TEXT,
    extraction_status   extraction_status NOT NULL DEFAULT 'pending',
    extraction_error    TEXT,
    uploaded_by_contact_id INTEGER REFERENCES contacts(id),
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_files_document ON document_files (document_id);
CREATE INDEX idx_files_text     ON document_files USING gin (to_tsvector('french', coalesce(extracted_text, '')));

-- ========================================================================
-- Réunions (lien Transformer)
-- ========================================================================

CREATE TYPE meeting_type AS ENUM (
    'codir_etnic', 'codir_wbe',
    'comite_gouvernance', 'comite_pilotage', 'comite_portefeuille',
    'gt_technique', 'gt_fonctionnel', 'gt_map',
    'kickoff', 'suivi', 'autre'
);

CREATE TABLE meetings (
    id                          SERIAL PRIMARY KEY,
    project_id                  INTEGER REFERENCES projects(id) ON DELETE SET NULL,  -- nullable pour réunions cross
    titre                       VARCHAR(512) NOT NULL,
    type                        meeting_type NOT NULL,
    date_debut                  TIMESTAMPTZ NOT NULL,
    date_fin                    TIMESTAMPTZ,
    lieu                        VARCHAR(255),
    visio_link                  VARCHAR(512),
    transcripter_transcript_id  VARCHAR(128),  -- lien externe Transformer
    compte_rendu                TEXT,
    decisions                   TEXT,
    actions                     TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_meetings_project ON meetings (project_id);
CREATE INDEX idx_meetings_date    ON meetings (date_debut);

CREATE TABLE meeting_attendees (
    id          SERIAL PRIMARY KEY,
    meeting_id  INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    contact_id  INTEGER NOT NULL REFERENCES contacts(id),
    role        VARCHAR(64),                            -- present, excuse, absent, invite
    UNIQUE (meeting_id, contact_id)
);
CREATE INDEX idx_attendees_meeting ON meeting_attendees (meeting_id);

-- ========================================================================
-- Timeline (vue cross-projets : CODIR, gouvernance, jalons)
-- ========================================================================

CREATE TYPE timeline_event_type AS ENUM (
    'codir_etnic', 'codir_wbe',
    'comite_portefeuille', 'comite_gouvernance',
    'signature_ministre',
    'jalon_projet', 'deadline',
    'autre'
);

CREATE TABLE timeline_events (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,  -- nullable pour événements globaux
    label           VARCHAR(512) NOT NULL,
    type            timeline_event_type NOT NULL,
    date_event      DATE NOT NULL,
    est_certain     BOOLEAN NOT NULL DEFAULT TRUE,
    confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
    description     TEXT,
    ressources      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_timeline_date     ON timeline_events (date_event);
CREATE INDEX idx_timeline_project  ON timeline_events (project_id);
CREATE INDEX idx_timeline_type     ON timeline_events (type, date_event);

-- ========================================================================
-- Trigger updated_at
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

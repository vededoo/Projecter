-- ========================================================================
-- Projecter — Hiérarchie organisationnelle (organigramme ETNIC)
-- ========================================================================

-- Niveaux : dg (racine) > division > cc > equipe > sous_equipe
CREATE TYPE cc_niveau AS ENUM ('dg', 'division', 'cc', 'equipe', 'sous_equipe');

ALTER TABLE centres_competences
    ADD COLUMN parent_id            INTEGER REFERENCES centres_competences(id) ON DELETE SET NULL,
    ADD COLUMN niveau               cc_niveau,
    ADD COLUMN manager_contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    ADD COLUMN manager_interim      BOOLEAN NOT NULL DEFAULT FALSE, -- "a.i."
    ADD COLUMN ordre                INTEGER NOT NULL DEFAULT 0,     -- ordre d'affichage entre frères
    ADD COLUMN notes                TEXT;

CREATE INDEX idx_cc_parent   ON centres_competences (parent_id);
CREATE INDEX idx_cc_niveau   ON centres_competences (niveau);
CREATE INDEX idx_cc_manager  ON centres_competences (manager_contact_id);

-- ========================================================================
-- Affectations contact <-> CC (un contact peut être dans 1..n équipes)
-- ========================================================================
CREATE TYPE membership_role AS ENUM (
    'manager',          -- responsable/chef du CC ou de l'équipe
    'team_leader',      -- team leader sous-équipe
    'membre',           -- membre standard
    'consultant',       -- consultant externe rattaché
    'conseiller',       -- conseiller technique/expert
    'analyste',         -- analyste rattaché (ex: Valérie MATHOT chez Infrastructure)
    'detache'           -- membre détaché temporairement
);

CREATE TABLE contact_memberships (
    id              SERIAL PRIMARY KEY,
    contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    cc_id           INTEGER NOT NULL REFERENCES centres_competences(id) ON DELETE CASCADE,
    role            membership_role NOT NULL DEFAULT 'membre',
    date_debut      DATE,
    date_fin        DATE,
    principale      BOOLEAN NOT NULL DEFAULT TRUE,  -- affectation principale vs secondaire
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_membership ON contact_memberships (contact_id, cc_id, role)
    WHERE date_fin IS NULL;
CREATE INDEX idx_membership_contact ON contact_memberships (contact_id);
CREATE INDEX idx_membership_cc      ON contact_memberships (cc_id);

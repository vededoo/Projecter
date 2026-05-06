-- ============================================================================
-- Migration 005 : Risques N-to-N projets + DACI sur décisions
-- ============================================================================
-- Contexte :
--   Un risque transversal (ex: "Validation budget 2026") peut affecter N projets.
--   Le modèle actuel risks.project_id (1-to-N) est trop restrictif.
--
-- Changements :
--   1. risks : suppression de project_id (NOT NULL → remplacé par table liaison)
--              conservation de tous les autres champs
--   2. risk_projects : table de liaison risks ↔ projects (N-to-N)
--              avec un champ "context" pour préciser l'impact sur CE projet
--   3. meeting_decisions : ajout driver_contact_id + approver_contact_id (DACI)
--
-- Données existantes :
--   Les 4 risques actuels sont des smoke tests (project_id=1, label="Smoke risk").
--   La migration les transfère proprement vers risk_projects avant de supprimer
--   la colonne project_id.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table de liaison risks ↔ projects
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_projects (
  id           SERIAL PRIMARY KEY,
  risk_id      INTEGER NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Impact spécifique de ce risque sur CE projet (peut différer d'un projet à l'autre)
  impact       risk_level,
  context      TEXT,             -- précisions sur l'impact pour ce projet spécifique
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (risk_id, project_id)   -- un risque ne peut être lié qu'une fois à un projet
);

CREATE INDEX IF NOT EXISTS idx_risk_projects_risk    ON risk_projects (risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_projects_project ON risk_projects (project_id);

COMMENT ON TABLE risk_projects IS 'Liaison N-to-N entre risques et projets. Un risque transversal peut affecter plusieurs projets avec un impact potentiellement différent sur chacun.';
COMMENT ON COLUMN risk_projects.context IS 'Précise pourquoi / comment ce risque impacte spécifiquement CE projet.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migrer les données existantes vers risk_projects
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO risk_projects (risk_id, project_id, impact)
SELECT id, project_id, impact
FROM risks
WHERE project_id IS NOT NULL
ON CONFLICT (risk_id, project_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Supprimer project_id de risks
-- ─────────────────────────────────────────────────────────────────────────────

-- Supprimer la contrainte FK d'abord
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_project_id_fkey;

-- Supprimer la colonne
ALTER TABLE risks DROP COLUMN IF EXISTS project_id;

-- Supprimer l'index associé s'il existe
DROP INDEX IF EXISTS idx_risks_project;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Vue utilitaire : risques avec leurs projets
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_risks AS
SELECT
  r.id,
  r.label,
  r.description,
  r.probability,
  r.impact         AS impact_global,
  r.severity,
  r.status,
  r.owner_contact_id,
  c.last_name || ' ' || COALESCE(c.first_name, '') AS owner_name,
  r.mitigation_plan,
  r.due_date,
  r.detected_at,
  r.closed_at,
  -- Projets liés (agrégés en JSON pour lisibilité MCP)
  COALESCE(
    json_agg(
      json_build_object(
        'project_id',    p.id,
        'project_code',  p.code,
        'project_title', p.title,
        'impact',        rp.impact,
        'context',       rp.context
      )
      ORDER BY p.code
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS projects
FROM risks r
LEFT JOIN contacts c ON c.id = r.owner_contact_id
LEFT JOIN risk_projects rp ON rp.risk_id = r.id
LEFT JOIN projects p ON p.id = rp.project_id
GROUP BY r.id, c.last_name, c.first_name;

COMMENT ON VIEW v_risks IS 'Risques avec leurs projets liés (N-to-N) et le nom du responsable. Utilisée par le MCP tool list_risks.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DACI sur meeting_decisions
-- ─────────────────────────────────────────────────────────────────────────────
-- driver   : personne qui porte la décision et l'a proposée
-- approver : personne qui a formellement validé

ALTER TABLE meeting_decisions
  ADD COLUMN IF NOT EXISTS driver_contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_reversible        BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN meeting_decisions.driver_contact_id   IS 'DACI : personne qui porte et instruit la décision.';
COMMENT ON COLUMN meeting_decisions.approver_contact_id IS 'DACI : personne qui a formellement validé la décision.';
COMMENT ON COLUMN meeting_decisions.is_reversible        IS 'La décision peut-elle être revue ? false = décision définitive.';

COMMIT;

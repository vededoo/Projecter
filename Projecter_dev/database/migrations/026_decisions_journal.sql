-- 026 — Registre de gouvernance : journal Decisions (3 couches + N-N)
--
-- M\u00eame patron que 025 (actions) appliqu\u00e9 aux d\u00e9cisions.
-- La provenance (decisions.meeting_topic_id) a \u00e9t\u00e9 ajout\u00e9e en 025.
--
-- NOTE : le runner (migrate.js) enveloppe ce fichier dans sa propre
-- transaction \u2192 ne pas ajouter BEGIN/COMMIT ici.

-- Renommage : meeting_decisions devient le registre global « decisions ».
ALTER TABLE meeting_decisions RENAME TO decisions;

-- Colonne updated_at pour aligner le pattern des contrôleurs (SET updated_at = NOW()).
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Relation N-N decisions ↔ projets (miroir de risk_projects / action_projects).
CREATE TABLE IF NOT EXISTS decision_projects (
  id           SERIAL PRIMARY KEY,
  decision_id  INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  project_id   INTEGER NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  role         TEXT,
  context      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (decision_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_decision_projects_project  ON decision_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_decision_projects_decision ON decision_projects(decision_id);

-- Backfill : chaque décision est rattachée au projet de sa réunion d'origine.
INSERT INTO decision_projects (decision_id, project_id)
SELECT d.id, m.project_id
  FROM decisions d
  JOIN meetings m ON m.id = d.meeting_id
 WHERE m.project_id IS NOT NULL
ON CONFLICT (decision_id, project_id) DO NOTHING;

-- Vue journal : driver/approver résolus + provenance réunion + projets agrégés.
CREATE OR REPLACE VIEW v_decisions AS
SELECT
  d.id,
  d.description,
  d.impact,
  d.position,
  d.is_reversible,
  d.driver_contact_id,
  d.approver_contact_id,
  d.meeting_id,
  d.meeting_topic_id,
  d.created_at,
  d.updated_at,
  TRIM(BOTH ' ' FROM COALESCE(dc.last_name, '') || ' ' || COALESCE(dc.first_name, '')) AS driver_name,
  TRIM(BOTH ' ' FROM COALESCE(ac.last_name, '') || ' ' || COALESCE(ac.first_name, '')) AS approver_name,
  m.title    AS meeting_title,
  m.start_at AS meeting_date,
  COALESCE((
    SELECT json_agg(json_build_object(
             'project_id',    dp.project_id,
             'project_title', p.title,
             'project_code',  p.code,
             'role',          dp.role
           ) ORDER BY p.title)
      FROM decision_projects dp
      JOIN projects p ON p.id = dp.project_id
     WHERE dp.decision_id = d.id
  ), '[]'::json) AS projects
FROM decisions d
LEFT JOIN contacts dc ON dc.id = d.driver_contact_id
LEFT JOIN contacts ac ON ac.id = d.approver_contact_id
LEFT JOIN meetings m  ON m.id = d.meeting_id;

-- 025 — Registres de gouvernance : provenance + journal Actions (3 couches + N-N)
--
-- Contexte : généralisation du pattern « risks » (entité globale + N-N projets
-- via risk_projects) à l'ensemble des registres de gouvernance.
--   Couche 1 = réunion (meeting_topics, provenance)
--   Couche 2 = projet  (relation N-N)
--   Couche 3 = journal cross-projet (entité globale + vue filtrable)
--
-- NOTE : le runner (migrate.js) enveloppe ce fichier dans sa propre
-- transaction → ne pas ajouter BEGIN/COMMIT ici.

-- ─────────────────────────────────────────────────────────────────────────
-- Increment 0 — liens de provenance sur les registres existants
-- ─────────────────────────────────────────────────────────────────────────

-- Un risque peut désormais pointer vers la ligne de PV (meeting_topic) qui l'a
-- révélé. Complète la couche 1 → couche 3 pour les risques.
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS source_meeting_topic_id INTEGER
  REFERENCES meeting_topics(id) ON DELETE SET NULL;

-- Symétrie avec meeting_actions.meeting_topic_id : une décision peut pointer
-- vers son topic d'origine (préparation du futur registre Decisions).
ALTER TABLE meeting_decisions
  ADD COLUMN IF NOT EXISTS meeting_topic_id INTEGER
  REFERENCES meeting_topics(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- Increment 1 — Actions : registre global N-N
-- ─────────────────────────────────────────────────────────────────────────

-- Renommage : meeting_actions devient le registre global « actions ».
-- meeting_id / meeting_topic_id restent comme liens de provenance.
ALTER TABLE meeting_actions RENAME TO actions;

-- Relation N-N actions ↔ projets (miroir de risk_projects).
CREATE TABLE IF NOT EXISTS action_projects (
  id          SERIAL PRIMARY KEY,
  action_id   INTEGER NOT NULL REFERENCES actions(id)  ON DELETE CASCADE,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role        TEXT,
  context     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (action_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_action_projects_project ON action_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_action_projects_action  ON action_projects(action_id);

-- Backfill : chaque action est rattachée au projet de sa réunion d'origine.
INSERT INTO action_projects (action_id, project_id)
SELECT a.id, m.project_id
  FROM actions a
  JOIN meetings m ON m.id = a.meeting_id
 WHERE m.project_id IS NOT NULL
ON CONFLICT (action_id, project_id) DO NOTHING;

-- Vue journal : owner résolu + provenance réunion + projets agrégés (N-N).
CREATE OR REPLACE VIEW v_actions AS
SELECT
  a.id,
  a.description,
  a.deadline,
  a.status,
  a.notes,
  a.owner_id,
  a.owner_raw,
  a.meeting_id,
  a.meeting_topic_id,
  a.created_at,
  a.updated_at,
  a.closed_at,
  (a.deadline < CURRENT_DATE AND a.status = 'open'::action_status) AS is_overdue,
  c.last_name,
  c.first_name,
  TRIM(BOTH ' ' FROM COALESCE(c.last_name, '') || ' ' || COALESCE(c.first_name, '')) AS owner_name,
  c.email AS owner_email,
  m.title    AS meeting_title,
  m.start_at AS meeting_date,
  COALESCE((
    SELECT json_agg(json_build_object(
             'project_id',    ap.project_id,
             'project_title', p.title,
             'project_code',  p.code,
             'role',          ap.role
           ) ORDER BY p.title)
      FROM action_projects ap
      JOIN projects p ON p.id = ap.project_id
     WHERE ap.action_id = a.id
  ), '[]'::json) AS projects
FROM actions a
LEFT JOIN contacts c ON c.id = a.owner_id
LEFT JOIN meetings m ON m.id = a.meeting_id;

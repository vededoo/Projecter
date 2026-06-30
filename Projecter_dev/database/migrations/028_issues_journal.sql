-- 028_issues_journal.sql
-- Increment 4 — Registre des issues (problèmes survenus, à résoudre)
-- Pattern 3 couches : table globale + N-N projets + vue v_issues.
-- NOTE: appliquer MANUELLEMENT via psql -f puis `npm run migrate -- --baseline`.
-- PAS de BEGIN/COMMIT.

-- ── Enums issue ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_severity') THEN
    CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
    CREATE TYPE issue_status AS ENUM
      ('open', 'investigating', 'resolved', 'closed', 'cancelled');
  END IF;
END$$;

-- ── Table issues ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id               SERIAL PRIMARY KEY,
  label            VARCHAR(500) NOT NULL,
  description      TEXT,
  severity         issue_severity NOT NULL DEFAULT 'medium',
  status           issue_status   NOT NULL DEFAULT 'open',
  owner_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  resolution       TEXT,
  due_date         DATE,
  detected_at      DATE,
  resolved_at      DATE,
  meeting_id       INTEGER REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_topic_id INTEGER REFERENCES meeting_topics(id) ON DELETE SET NULL,
  attributes       JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── N-N issues ↔ projets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_projects (
  id         SERIAL PRIMARY KEY,
  issue_id   INTEGER NOT NULL REFERENCES issues(id)   ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role       TEXT,
  context    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_issue_projects_issue   ON issue_projects(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_projects_project ON issue_projects(project_id);

-- ── Vue journal cross-projet ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_issues AS
SELECT
  i.id,
  i.label,
  i.description,
  i.severity,
  i.status,
  i.owner_contact_id,
  TRIM(COALESCE(oc.last_name, '') || ' ' || COALESCE(oc.first_name, '')) AS owner_name,
  i.resolution,
  i.due_date,
  i.detected_at,
  i.resolved_at,
  i.meeting_id,
  i.meeting_topic_id,
  m.title    AS meeting_title,
  m.start_at AS meeting_date,
  (i.due_date IS NOT NULL
     AND i.due_date < CURRENT_DATE
     AND i.status NOT IN ('resolved', 'closed', 'cancelled')) AS is_overdue,
  COALESCE(
    (SELECT json_agg(json_build_object(
              'project_id', p.id,
              'project_title', p.title,
              'project_code', p.code,
              'role', ip.role))
       FROM issue_projects ip JOIN projects p ON p.id = ip.project_id
      WHERE ip.issue_id = i.id),
    '[]'::json) AS projects,
  i.attributes,
  i.created_at,
  i.updated_at
FROM issues i
LEFT JOIN contacts oc ON oc.id = i.owner_contact_id
LEFT JOIN meetings m  ON m.id  = i.meeting_id;

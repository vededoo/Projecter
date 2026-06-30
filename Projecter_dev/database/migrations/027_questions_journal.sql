-- 027_questions_journal.sql
-- Increment 2 — Registre des questions (futures questions / points à clarifier)
-- Pattern 3 couches : table globale + N-N projets + N-N destinataires + vue v_questions.
-- NOTE: appliquer MANUELLEMENT via psql -f puis `npm run migrate -- --baseline`.
-- PAS de BEGIN/COMMIT (migrate.js enveloppe déjà, et ALTER TYPE ADD VALUE exige l'autocommit).

-- ── Enum statut question ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_status') THEN
    CREATE TYPE question_status AS ENUM
      ('to_ask', 'asked', 'reminded', 'partially_answered', 'answered', 'cancelled');
  END IF;
END$$;

-- ── topic_type += 'question' (épine dorsale réunion) ──────────────────────────
ALTER TYPE topic_type ADD VALUE IF NOT EXISTS 'question';

-- ── Table questions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id                    SERIAL PRIMARY KEY,
  title                 TEXT NOT NULL,
  status                question_status NOT NULL DEFAULT 'to_ask',
  owner_contact_id      INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  due_date              DATE,
  answer                TEXT,
  answered_at           TIMESTAMPTZ,
  answered_in_meeting_id INTEGER REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_id            INTEGER REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_topic_id      INTEGER REFERENCES meeting_topics(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── N-N questions ↔ projets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_projects (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  project_id  INTEGER NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  role        TEXT,
  context     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_question_projects_question ON question_projects(question_id);
CREATE INDEX IF NOT EXISTS idx_question_projects_project  ON question_projects(project_id);

-- ── N-N questions ↔ destinataires (asked_to) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS question_contacts (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  contact_id  INTEGER NOT NULL REFERENCES contacts(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_question_contacts_question ON question_contacts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_contacts_contact  ON question_contacts(contact_id);

-- ── Vue journal cross-projet ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_questions AS
SELECT
  q.id,
  q.title,
  q.status,
  q.owner_contact_id,
  TRIM(COALESCE(oc.last_name, '') || ' ' || COALESCE(oc.first_name, '')) AS owner_name,
  q.due_date,
  q.answer,
  q.answered_at,
  q.answered_in_meeting_id,
  q.meeting_id,
  q.meeting_topic_id,
  m.title    AS meeting_title,
  m.start_at AS meeting_date,
  (q.due_date IS NOT NULL
     AND q.due_date < CURRENT_DATE
     AND q.status NOT IN ('answered', 'cancelled')) AS is_overdue,
  COALESCE(
    (SELECT json_agg(json_build_object(
              'contact_id', c.id,
              'contact_name', TRIM(COALESCE(c.last_name, '') || ' ' || COALESCE(c.first_name, ''))))
       FROM question_contacts qc JOIN contacts c ON c.id = qc.contact_id
      WHERE qc.question_id = q.id),
    '[]'::json) AS asked_to,
  COALESCE(
    (SELECT json_agg(json_build_object(
              'project_id', p.id,
              'project_title', p.title,
              'project_code', p.code,
              'role', qp.role))
       FROM question_projects qp JOIN projects p ON p.id = qp.project_id
      WHERE qp.question_id = q.id),
    '[]'::json) AS projects,
  q.created_at,
  q.updated_at
FROM questions q
LEFT JOIN contacts oc ON oc.id = q.owner_contact_id
LEFT JOIN meetings m  ON m.id  = q.meeting_id;

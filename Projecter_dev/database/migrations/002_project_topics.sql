-- Migration 002 — Project Topics + Meeting Category
-- 
-- Purpose: introduce project_topics as canonical living entities at project level,
-- and meeting_category to distinguish formal meetings from informal exchanges.
--
-- Run with:
--   psql -U ldurpel -d Projecter_dev -f database/migrations/002_project_topics.sql

-- ── 1. meeting_category on meetings ─────────────────────────────────────────
--
-- Separate from "type" (which describes the governance body: steering committee, WG, etc.)
-- meeting_category describes the nature of the exchange:
--   formal      → scheduled, has an agenda, potentially a recording
--   informal    → impromptu exchange (corridor, machine à café)
--   phone_call  → phone / audio call, no recording
--   video_call  → ad-hoc video call, not formally scheduled

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_category VARCHAR(20) DEFAULT 'formal'
    CHECK (meeting_category IN ('formal', 'informal', 'phone_call', 'video_call'));

-- ── 2. project_topics — canonical topic entities at project level ────────────
--
-- A project_topic is the stable, named entity.
-- meeting_topics are snapshots: each time a topic is discussed/refined,
-- a new meeting_topic row is created and linked here.
--
-- status lifecycle:
--   open         → actively tracked
--   on_hold      → paused, awaiting info or decision
--   invalidated  → superseded by a newer understanding or decision
--   closed       → resolved / no longer relevant

CREATE TABLE IF NOT EXISTS project_topics (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'on_hold', 'invalidated', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_topics_project ON project_topics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_topics_status  ON project_topics(status);

-- ── 3. Link meeting_topics → project_topics ──────────────────────────────────
--
-- Nullable: not all meeting_topics need to be linked to a project_topic.
-- ON DELETE SET NULL: if a project_topic is deleted, meeting_topics keep their data.

ALTER TABLE meeting_topics
  ADD COLUMN IF NOT EXISTS project_topic_id INTEGER
    REFERENCES project_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_topics_project_topic
  ON meeting_topics(project_topic_id);

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT 'meetings.meeting_category' AS check,
       COUNT(*) FILTER (WHERE meeting_category IS NOT NULL) AS rows_with_value
FROM meetings
UNION ALL
SELECT 'project_topics table', COUNT(*) FROM project_topics
UNION ALL
SELECT 'meeting_topics.project_topic_id', COUNT(*) FILTER (WHERE project_topic_id IS NOT NULL) FROM meeting_topics;

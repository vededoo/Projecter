-- ========================================================================
-- Migration 017 — Champs administratifs projet
-- Mantis, Planview, phase, mandat, date de premier enregistrement
-- ========================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS date_first_raised       DATE,
  ADD COLUMN IF NOT EXISTS mantis_submission_date  DATE,
  ADD COLUMN IF NOT EXISTS mantis_id               VARCHAR(7),
  ADD COLUMN IF NOT EXISTS mantis_reporter         TEXT,
  ADD COLUMN IF NOT EXISTS mantis_assignment       TEXT,
  ADD COLUMN IF NOT EXISTS stage                   TEXT,
  ADD COLUMN IF NOT EXISTS phase                   TEXT,
  ADD COLUMN IF NOT EXISTS phase_progress          TEXT,
  ADD COLUMN IF NOT EXISTS project_mandate_date    DATE,
  ADD COLUMN IF NOT EXISTS project_mandate_comment TEXT,
  ADD COLUMN IF NOT EXISTS planview_item_name      TEXT,
  ADD COLUMN IF NOT EXISTS planview_id             TEXT,
  ADD COLUMN IF NOT EXISTS planview_type           TEXT,
  ADD COLUMN IF NOT EXISTS planview_comment        TEXT,
  ADD COLUMN IF NOT EXISTS planview_activity       TEXT;

-- Migration 019 : sort_order sur meeting_attendees
-- Permet le tri manuel des participants par drag & drop

ALTER TABLE meeting_attendees
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialiser l'ordre par défaut = ordre d'insertion (id)
UPDATE meeting_attendees ma
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY meeting_id ORDER BY id) - 1 AS rn
  FROM meeting_attendees
) sub
WHERE ma.id = sub.id;

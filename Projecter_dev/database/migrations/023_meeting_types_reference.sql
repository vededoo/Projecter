-- Migration 023 : meeting_types en table de référence ordonnable
-- Remplace l'enum meeting_type par un référentiel éditable côté UI.

CREATE TABLE IF NOT EXISTS meeting_types (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(64) NOT NULL UNIQUE,
  label       VARCHAR(255) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO meeting_types (code, label, sort_order, active) VALUES
  ('follow_up', 'Follow-up', 1, TRUE),
  ('functional_wg', 'Functional Workshop', 2, TRUE),
  ('technical_wg', 'Technical Workshop', 3, TRUE),
  ('procurement_wg', 'Procurement Workshop', 4, TRUE),
  ('governance_committee', 'Governance Workshop', 5, TRUE),
  ('excom', 'ExCom', 6, TRUE),
  ('steering_committee', 'Steering Committee', 7, TRUE),
  ('portfolio_committee', 'Portfolio Committee', 8, TRUE),
  ('kickoff', 'Kickoff', 9, TRUE),
  ('other', 'Other', 10, TRUE),
  ('mail', 'Mail', 11, TRUE),
  ('chat', 'Chat', 12, TRUE),
  ('call', 'Call', 13, TRUE),
  ('encounter', 'Encounter', 14, TRUE)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    active = EXCLUDED.active,
    updated_at = NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'meetings'
      AND column_name = 'type'
      AND udt_name = 'meeting_type'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE meetings
      ALTER COLUMN type TYPE VARCHAR(64)
      USING CASE
        WHEN type::text IN ('etnic_excom', 'wbe_excom') THEN 'excom'
        ELSE type::text
      END
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_meetings_type'
  ) THEN
    ALTER TABLE meetings
      ADD CONSTRAINT fk_meetings_type
      FOREIGN KEY (type) REFERENCES meeting_types(code)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    DROP TYPE meeting_type;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_types_sort_order ON meeting_types(sort_order);
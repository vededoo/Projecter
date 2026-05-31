-- ═══════════════════════════════════════════════════════════════════════════════
-- 012_meeting_speakers.sql
-- Speaker diarization result storage for meetings.
--
-- Each row represents one detected speaker (SPEAKER_00, SPEAKER_01…) for a
-- given meeting.  contact_id links the speaker to a Projecter contact after
-- manual or automatic (voice-id) identification.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meeting_speakers (
  id                    SERIAL PRIMARY KEY,
  meeting_id            INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  label                 TEXT NOT NULL,              -- 'SPEAKER_00', 'SPEAKER_01'…
  display_name          TEXT,                       -- free text or from contact
  contact_id            INTEGER,                    -- linked Projecter contact (no FK — cross-DB logic)
  suggested_contact_id  INTEGER,                    -- voice-id best match
  suggested_score       REAL,                       -- cosine similarity (0-1)
  suggested_confidence  TEXT,                       -- 'high' | 'low' | 'unknown'
  total_duration_s      REAL    DEFAULT 0,          -- sum of speaker segments
  validated_by_user     BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (meeting_id, label)
);

CREATE INDEX IF NOT EXISTS idx_meeting_speakers_meeting_id ON meeting_speakers(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_contact_id ON meeting_speakers(contact_id);

COMMENT ON TABLE  meeting_speakers IS 'One row per detected speaker per meeting. Contact assignment can be manual or suggested by voice-id.';
COMMENT ON COLUMN meeting_speakers.label               IS 'Raw pyannote label: SPEAKER_00, SPEAKER_01, …';
COMMENT ON COLUMN meeting_speakers.display_name        IS 'Human-readable name (overrides contact.full_name for display)';
COMMENT ON COLUMN meeting_speakers.contact_id          IS 'Projecter contact assigned to this speaker (logical link, no DB FK)';
COMMENT ON COLUMN meeting_speakers.suggested_contact_id IS 'Best match from voice-id identify endpoint';
COMMENT ON COLUMN meeting_speakers.suggested_score      IS 'Cosine similarity score returned by voice-id';
COMMENT ON COLUMN meeting_speakers.suggested_confidence IS 'high (≥0.80) | low (≥0.65) | unknown';
COMMENT ON COLUMN meeting_speakers.total_duration_s    IS 'Cumulative speaking time in seconds (computed from transcription_segments)';

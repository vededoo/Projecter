-- ============================================================
-- 016 — Whisper error-correction dictionary + per-meeting suggestions
-- ============================================================
-- whisper_corrections  : global dict  (incorrect → correct, by domain)
-- meeting_whisper_suggestions : per-meeting flagged tokens (MCP → user review)
-- ============================================================

-- Ensure pg_trgm is available (already enabled on this instance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. Global corrections dictionary ────────────────────────────────────
CREATE TABLE whisper_corrections (
  id          SERIAL PRIMARY KEY,
  domain      TEXT NOT NULL DEFAULT 'ETNIC',
  -- what Whisper heard (e.g. "laine", "Web BE")
  incorrect   TEXT NOT NULL,
  -- the truth (e.g. "Lesne", "WBE")
  correct     TEXT NOT NULL,
  -- optional notes/context for why this correction exists
  notes       TEXT,
  -- 'user' = manually added  |  'mcp' = auto-confirmed by AI
  source      TEXT NOT NULL DEFAULT 'user'
                CHECK (source IN ('user', 'mcp')),
  confidence  FLOAT CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain, incorrect)
);

-- GIN index for fast trigram similarity lookups
CREATE INDEX idx_whisper_corrections_incorrect_trgm
  ON whisper_corrections USING gin (incorrect gin_trgm_ops);
CREATE INDEX idx_whisper_corrections_correct_trgm
  ON whisper_corrections USING gin (correct gin_trgm_ops);
CREATE INDEX idx_whisper_corrections_domain
  ON whisper_corrections (domain);

-- ── 2. Per-meeting flagged tokens ────────────────────────────────────────
-- status lifecycle: pending → confirmed | rejected | custom
CREATE TYPE whisper_suggestion_status AS ENUM ('pending', 'confirmed', 'rejected', 'custom');

CREATE TABLE meeting_whisper_suggestions (
  id              SERIAL PRIMARY KEY,
  meeting_id      INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- what Whisper wrote in the transcript
  token           TEXT NOT NULL,
  -- a few words of surrounding text for context display
  context_text    TEXT,

  -- best suggested correction (may be null if no match found)
  suggestion      TEXT,
  -- if suggestion comes from a known contact, link it
  contact_id      INT REFERENCES contacts(id) ON DELETE SET NULL,

  -- Whisper timecodes for audio seek
  tc_start        FLOAT,
  tc_end          FLOAT,

  -- how confident the system is (0-1)
  confidence      FLOAT CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  -- where the suggestion came from
  source          TEXT NOT NULL DEFAULT 'mcp'
                    CHECK (source IN ('dict', 'phonetic_contact', 'mcp')),

  -- user resolution
  status          whisper_suggestion_status NOT NULL DEFAULT 'pending',
  -- if user types a custom correction different from suggestion
  user_correction TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mws_meeting_id ON meeting_whisper_suggestions (meeting_id);
CREATE INDEX idx_mws_status     ON meeting_whisper_suggestions (status);

-- ── 3. Seed: some ETNIC-domain examples (can be removed) ─────────────────
-- (Uncomment if you want initial seed data)
-- INSERT INTO whisper_corrections (domain, incorrect, correct, notes, source) VALUES
--   ('ETNIC', 'laine',  'Lesne',      'Philippe Lesne, nom propre mal compris', 'user'),
--   ('ETNIC', 'web be', 'WBE',        'Sigle Wallonie Bruxelles Enseignement', 'user'),
--   ('ETNIC', 'etnique','ETNIC',       'Acronyme mal compris', 'user');

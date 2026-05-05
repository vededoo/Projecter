-- ============================================================================
-- Migration 004 : Extraction structurée des comptes rendus de réunion
-- ============================================================================
-- Contexte :
--   La table meetings existante stocke minutes/decisions/actions en TEXT libre.
--   Cette migration ajoute les tables satellites qui permettent de rendre
--   ces informations queryables (actions par responsable, par deadline, etc.)
--   et de tracer l'état de l'extraction LLM.
--
-- Principe :
--   - meetings.minutes / .decisions / .actions  → conservés (raw fallback)
--   - meetings.raw_transcript                   → nouveau, texte brut source
--   - meetings.extraction_status                → suivi du pipeline LLM
--   - meeting_actions                           → actions structurées
--   - meeting_decisions                         → décisions structurées
--   - meeting_topics                            → sujets / points de l'ODJ
--   - meeting_attendees.role                    → rôle dans la réunion
--
-- Flux attendu :
--   Transformer → transcription → Projecter (raw_transcript)
--   LLM (MCP tool ingest_meeting) → extraction → tables satellites
--   Tool review_extraction(id) → validation humaine
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enrichissement de meetings
-- ─────────────────────────────────────────────────────────────────────────────

-- Texte brut source (transcription Whisper ou CR collé manuellement).
-- Immuable une fois enregistré — sert de source pour réextraire si besoin.
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS raw_transcript TEXT;

-- Statut du pipeline d'extraction LLM.
-- NOTE : le type extraction_status existe déjà (créé pour document_files) avec
--        les valeurs : pending | success | failed | skipped
--        On réutilise ce type tel quel.
--        Sémantique pour meetings :
--          pending  → réunion créée, extraction pas encore lancée
--          success  → extraction terminée (+ validée)
--          failed   → extraction échouée (voir extraction_error)
--          skipped  → pas d'extraction prévue (réunion sans CR structuré)

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS extraction_status extraction_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_error  TEXT,             -- message d'erreur si 'failed'
  ADD COLUMN IF NOT EXISTS extracted_at      TIMESTAMPTZ,     -- timestamp fin extraction LLM
  ADD COLUMN IF NOT EXISTS validated_at      TIMESTAMPTZ,     -- timestamp validation humaine
  ADD COLUMN IF NOT EXISTS executive_summary TEXT;            -- résumé 10 lignes généré par LLM

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rôle dans meeting_attendees
-- ─────────────────────────────────────────────────────────────────────────────
-- Complète la FK contact_id déjà présente avec le rôle tenu pendant la réunion.

ALTER TABLE meeting_attendees
  ADD COLUMN IF NOT EXISTS role VARCHAR(64); -- 'animateur', 'décideur', 'invité', 'observateur'

COMMENT ON COLUMN meeting_attendees.role IS 'Rôle dans la réunion : animateur, décideur, invité, observateur...';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Actions structurées
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE action_status AS ENUM (
    'open',       -- en cours
    'done',       -- terminée
    'cancelled',  -- annulée
    'overdue'     -- calculé à la volée mais utile pour filtrage explicite
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS meeting_actions (
  id           SERIAL PRIMARY KEY,
  meeting_id   INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  owner_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  owner_raw    VARCHAR(255),     -- nom libre tel qu'extrait par le LLM (avant résolution FK)
  description  TEXT NOT NULL,
  deadline     DATE,
  status       action_status NOT NULL DEFAULT 'open',
  closed_at    TIMESTAMPTZ,
  notes        TEXT,             -- précisions ou suivi ultérieur
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_meeting   ON meeting_actions (meeting_id);
CREATE INDEX IF NOT EXISTS idx_actions_owner     ON meeting_actions (owner_id);
CREATE INDEX IF NOT EXISTS idx_actions_deadline  ON meeting_actions (deadline) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_actions_status    ON meeting_actions (status);

COMMENT ON COLUMN meeting_actions.owner_raw IS 'Nom brut extrait par le LLM avant résolution vers contacts.id. Conservé pour audit.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Décisions structurées
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_decisions (
  id           SERIAL PRIMARY KEY,
  meeting_id   INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  impact       TEXT,             -- conséquence ou implication identifiée
  position     INTEGER,          -- ordre dans le CR
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_meeting ON meeting_decisions (meeting_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Sujets / points à l'ordre du jour
-- ─────────────────────────────────────────────────────────────────────────────
-- Structure libre : le LLM découpe le CR en sujets distincts.
-- Chaque sujet peut être lié à des actions ou décisions (via FK optionnelles).

DO $$ BEGIN
  CREATE TYPE topic_type AS ENUM (
    'information',   -- point informatif, pas de décision
    'decision',      -- a abouti à une décision
    'action',        -- a généré une ou plusieurs actions
    'open_point',    -- point en suspens, à retraiter
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS meeting_topics (
  id           SERIAL PRIMARY KEY,
  meeting_id   INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,   -- ordre dans le CR (1-based)
  title        VARCHAR(255) NOT NULL,
  summary      TEXT,
  type         topic_type NOT NULL DEFAULT 'other',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_meeting ON meeting_topics (meeting_id);
CREATE INDEX IF NOT EXISTS idx_topics_type    ON meeting_topics (meeting_id, type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Vue utilitaire : actions ouvertes avec contexte complet
-- ─────────────────────────────────────────────────────────────────────────────
-- Utilisée par le tool MCP list_open_actions pour éviter des JOINs répétés.

CREATE OR REPLACE VIEW v_open_actions AS
SELECT
  a.id,
  a.description,
  a.deadline,
  a.status,
  CASE WHEN a.deadline < CURRENT_DATE AND a.status = 'open' THEN TRUE ELSE FALSE END AS is_overdue,
  a.owner_raw,
  c.last_name  || ' ' || COALESCE(c.first_name, '') AS owner_name,
  c.email      AS owner_email,
  m.id         AS meeting_id,
  m.title      AS meeting_title,
  m.start_at   AS meeting_date,
  p.id         AS project_id,
  p.title      AS project_title,
  p.code       AS project_code
FROM meeting_actions a
LEFT  JOIN contacts c ON c.id = a.owner_id
JOIN  meetings  m ON m.id = a.meeting_id
LEFT  JOIN projects p ON p.id = m.project_id
WHERE a.status IN ('open', 'overdue');

COMMENT ON VIEW v_open_actions IS 'Actions ouvertes avec contexte réunion/projet/responsable. Utilisée par le MCP tool list_open_actions.';

COMMIT;

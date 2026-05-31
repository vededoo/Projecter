-- ============================================================================
-- Migration 014 : Sémantique enrichie des topics de réunion
-- ============================================================================
-- Contexte :
--   Un meeting_topic est un SIGNAL capturé dans une conversation.
--   Ce n'est PAS un objet formel de gestion (risk, task, décision loggée).
--   
--   La distinction clé :
--     - topic.type          → nature sémantique de l'échange ("on a évoqué un risque")
--     - topic.commitment_level → force de l'engagement exprimé verbalement
--     - topic.linked_object_* → lien optionnel vers l'objet formel (promotion)
--   
--   Flux : réunion → topic (signal) → [promotion manuelle] → objet formel
--   La promotion crée la traçabilité ; elle n'est pas automatique.
-- ============================================================================

BEGIN;

-- 1. Ajouter 'risk' à l'enum topic_type existant
ALTER TYPE topic_type ADD VALUE IF NOT EXISTS 'risk';

-- 2. Niveau d'engagement exprimé dans la réunion
--    mentioned   : évoqué ("ça pourrait bloquer")
--    acknowledged: pris en compte ("je vais vérifier")
--    agreed      : accord informel ("on est d'accord")
--    decided     : décision formelle prise en séance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commitment_level') THEN
    CREATE TYPE commitment_level AS ENUM (
      'mentioned',
      'acknowledged',
      'agreed',
      'decided'
    );
  END IF;
END$$;

ALTER TABLE meeting_topics
  ADD COLUMN IF NOT EXISTS commitment_level commitment_level DEFAULT 'mentioned';

-- 3. Lien optionnel vers l'objet formel (promotion)
--    Type générique : 'risk', 'task', 'decision', 'project_topic'
--    L'id est l'id de l'objet dans sa table respective.
--    NULL = signal non encore promu en objet formel.
ALTER TABLE meeting_topics
  ADD COLUMN IF NOT EXISTS linked_object_type VARCHAR(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_object_id   INTEGER     DEFAULT NULL;

COMMENT ON COLUMN meeting_topics.commitment_level IS
  'Force de l''engagement exprimé verbalement : mentioned < acknowledged < agreed < decided';

COMMENT ON COLUMN meeting_topics.linked_object_type IS
  'Type de l''objet formel créé par promotion : risk | task | decision | project_topic';

COMMENT ON COLUMN meeting_topics.linked_object_id IS
  'ID de l''objet formel dans sa table respective (risks.id, project_topics.id, etc.)';

COMMIT;

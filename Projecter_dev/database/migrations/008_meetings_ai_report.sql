-- ============================================================================
-- Migration 008 : ai_report dans meetings + champs extraction migration 004
-- ============================================================================
-- Contexte :
--   Suite au refactoring Transformer↔Projecter :
--   - ai_report (CR IA détaillé) migre de Transformer vers Projecter
--   - executive_summary était déjà ajouté par migration 004
--   - On enrichit aussi COLS dans le controller (raw_transcript, extraction_status,
--     extracted_at, validated_at qui viennent aussi de la migration 004)
-- ============================================================================

BEGIN;

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS ai_report TEXT;

COMMENT ON COLUMN meetings.ai_report IS 'Compte-rendu IA détaillé généré par LLM (migré depuis Transformer)';

COMMIT;

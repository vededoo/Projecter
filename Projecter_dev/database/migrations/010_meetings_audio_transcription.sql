-- ============================================================================
-- Migration 010 — Meetings : colonnes audio + statut transcription directe
-- ============================================================================
-- Contexte : Projecter appelle désormais Transcripter directement (sans passer
--            par Transformer). On ajoute :
--   - audio_path              → chemin local du fichier audio uploadé
--   - transcription_status    → 'idle' | 'running' | 'done' | 'error'
--   - transcription_error     → message d'erreur si statut = 'error'
--   - transcription_segments  → segments JSON bruts retournés par Whisper
--                               (chaque segment peut avoir un champ `speaker`)
-- ============================================================================

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS audio_path             TEXT,
  ADD COLUMN IF NOT EXISTS transcription_status   VARCHAR(32) NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS transcription_error    TEXT,
  ADD COLUMN IF NOT EXISTS transcription_segments JSONB;

COMMENT ON COLUMN meetings.audio_path             IS 'Chemin absolu vers le fichier audio (mp3/wav/m4a) uploadé';
COMMENT ON COLUMN meetings.transcription_status   IS 'idle | running | done | error';
COMMENT ON COLUMN meetings.transcription_error    IS 'Message d''erreur si transcription_status = error';
COMMENT ON COLUMN meetings.transcription_segments IS 'Segments Whisper bruts [{start,end,text,speaker?},...] retournés par Transcripter';

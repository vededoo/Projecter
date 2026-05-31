-- Migration 018 — Mail CR + lien action↔topic
-- 2026-06-XX

-- Champ mail_cr sur meetings (texte libre généré par l'agent IA)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mail_cr TEXT;

-- Lien optionnel entre une action et le topic de meeting auquel elle appartient
ALTER TABLE meeting_actions
  ADD COLUMN IF NOT EXISTS meeting_topic_id INTEGER
  REFERENCES meeting_topics(id) ON DELETE SET NULL;

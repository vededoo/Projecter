-- Migration 024 : Ajout de la colonne category à meeting_types + seed Rumor
-- Appliquée manuellement le 2026-06-01

-- 1. Ajouter la colonne category (défaut = 'formal' pour tous les existants)
ALTER TABLE meeting_types
  ADD COLUMN IF NOT EXISTS category VARCHAR(64) NOT NULL DEFAULT 'formal';

-- 2. Marquer les types informels
UPDATE meeting_types
  SET category = 'informal'
  WHERE code IN ('mail', 'chat', 'call', 'encounter');

-- 3. Ajouter le type Rumor (catégorie informelle)
INSERT INTO meeting_types (code, label, category, sort_order, active)
  VALUES ('rumor', 'Rumor', 'informal', 15, TRUE)
  ON CONFLICT (code) DO UPDATE
    SET label       = EXCLUDED.label,
        category    = EXCLUDED.category,
        sort_order  = EXCLUDED.sort_order,
        active      = EXCLUDED.active,
        updated_at  = NOW();

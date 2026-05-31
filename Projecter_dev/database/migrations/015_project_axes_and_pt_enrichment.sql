-- Migration 015 : Axes projet + enrichissement project_topics
-- 
-- 1. Ajoute 'issue' à topic_type (distinct de 'risk' : problème réel vs potentiel)
-- 2. Crée l'ENUM project_axis (13 axes inspirés PMI/PRINCE2)
-- 3. Enrichit project_topics : axes[], synthesis, confidence, owner, due_date

-- ─── 1. Ajouter 'issue' à topic_type ────────────────────────────────────────
ALTER TYPE topic_type ADD VALUE IF NOT EXISTS 'issue';

-- ─── 2. Créer l'ENUM project_axis ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE project_axis AS ENUM (
    'scope',           -- périmètre, livrables
    'planning',        -- jalons, dates, séquençage
    'budget',          -- coûts, remises, taux, TCO
    'resources',       -- personnes, disponibilités, compétences
    'risk',            -- risques potentiels
    'governance',      -- décisions, RACI, escalade
    'stakeholder',     -- parties prenantes, alignement
    'quality',         -- stabilité, maintenabilité, UX, sécurité applicative
    'security',        -- cybersécurité, RGPD, vade mecum sécurité
    'change_management', -- adoption, formation, résistance
    'benefits',        -- valeur attendue, ROI, alignement stratégique
    'dependencies',    -- inter-projets, fournisseurs, validations
    'support_run'      -- exploitation, SLA, N1/N2/N3, documentation
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Enrichir project_topics ─────────────────────────────────────────────

-- Axes (multi-valeur : un PT peut appartenir à plusieurs axes)
ALTER TABLE project_topics
  ADD COLUMN IF NOT EXISTS axes project_axis[] DEFAULT '{}';

-- Synthèse rédigée par le PM (statut global, au-dessus des signaux)
ALTER TABLE project_topics
  ADD COLUMN IF NOT EXISTS synthesis TEXT DEFAULT NULL;

-- Niveau de confiance sur l'avancement du topic
DO $$ BEGIN
  CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE project_topics
  ADD COLUMN IF NOT EXISTS confidence confidence_level DEFAULT NULL;

-- Owner : personne responsable du sujet (texte libre, pas FK pour l'instant)
ALTER TABLE project_topics
  ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT NULL;

-- Date cible (deadline souple associée au topic)
ALTER TABLE project_topics
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;

-- ─── Index GIN pour recherche sur les axes ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_topics_axes
  ON project_topics USING GIN (axes);

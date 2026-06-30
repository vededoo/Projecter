-- 029_axes_cleanup.sql
-- Inc5 : nettoyage de l'enum project_axis
--   - retire 'risk' (couvert par le registre risks) et 'dependencies' (relation, pas un axe)
--   - ajoute 'procurement' (marchés publics / achats)
--   + ajoute la colonne axes a meeting_topics (les topics portent desormais les axes)
-- NOTE : pas de BEGIN/COMMIT (migrate.js enveloppe chaque fichier dans sa transaction).

-- 1. Nettoyer les valeurs obsoletes dans les donnees existantes
UPDATE project_topics
   SET axes = array_remove(array_remove(axes, 'risk'::project_axis), 'dependencies'::project_axis)
 WHERE axes && ARRAY['risk', 'dependencies']::project_axis[];

-- 2. Nouveau type sans risk/dependencies, avec procurement
CREATE TYPE project_axis_new AS ENUM (
  'scope', 'planning', 'budget', 'resources', 'governance',
  'stakeholder', 'quality', 'security', 'change_management',
  'benefits', 'procurement', 'support_run'
);

-- 3. Retirer le default qui depend de l'ancien type
ALTER TABLE project_topics ALTER COLUMN axes DROP DEFAULT;

-- 4. Migrer la colonne vers le nouveau type
ALTER TABLE project_topics
  ALTER COLUMN axes TYPE project_axis_new[]
  USING axes::text[]::project_axis_new[];

-- 5. Remplacer l'ancien type
DROP TYPE project_axis;
ALTER TYPE project_axis_new RENAME TO project_axis;

-- 6. Restaurer le default
ALTER TABLE project_topics ALTER COLUMN axes SET DEFAULT '{}'::project_axis[];

-- 7. Ajouter axes a meeting_topics
ALTER TABLE meeting_topics
  ADD COLUMN IF NOT EXISTS axes project_axis[] NOT NULL DEFAULT '{}'::project_axis[];

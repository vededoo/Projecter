-- Migration 022 : default_role_id sur contacts
-- Harmonise les notions de "fonction" (job_title texte libre Azure)
-- et de "rôle dans un projet" (project_members.role_id → roles).
--
-- default_role_id = fonction par défaut du contact, exprimée dans le
-- vocabulaire contrôlé des rôles. Utilisée pour pré-remplir le rôle
-- du stakeholder lors de l'ajout à un projet (modifiable ensuite).
-- job_title reste le libellé descriptif libre synchronisé depuis Azure.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS default_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Pré-remplissage best-effort : si le job_title correspond exactement
-- (insensible à la casse) à un libellé de rôle, on initialise default_role_id.
UPDATE contacts c
SET default_role_id = r.id
FROM roles r
WHERE c.default_role_id IS NULL
  AND c.job_title IS NOT NULL
  AND TRIM(LOWER(c.job_title)) = TRIM(LOWER(r.label));

CREATE INDEX IF NOT EXISTS idx_contacts_default_role_id ON contacts(default_role_id);

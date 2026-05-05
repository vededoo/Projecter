-- ========================================================================
-- 003_contacts_department_displayname.sql — Champs Graph additionnels
-- ========================================================================
-- Complète la migration 002_graph_sync_fields.sql avec :
--   • department, display_name, user_principal_name (peuplés par fetch-graph-users.js)
--   • index trigram sur last_name (recherche floue contacts)
--   • index unique métier sur (last_name, first_name, organization_id) pour
--     prévenir les doublons lors d'un upsert manuel
--   • index sur department et UPN pour les filtres organigramme
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS department          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS user_principal_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contacts_department    ON contacts (department);
CREATE INDEX IF NOT EXISTS idx_contacts_upn           ON contacts (lower(user_principal_name::text));
CREATE INDEX IF NOT EXISTS idx_contacts_lastname_trgm ON contacts USING gin (last_name gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_identity
  ON contacts (
    lower(last_name::text),
    lower(COALESCE(first_name, '')::text),
    COALESCE(organization_id, 0)
  );

COMMENT ON COLUMN contacts.user_principal_name IS 'Microsoft Graph userPrincipalName (login Azure).';
COMMENT ON COLUMN contacts.display_name        IS 'Microsoft Graph displayName (nom complet affiché).';
COMMENT ON COLUMN contacts.department          IS 'Microsoft Graph department (ex: AGE, DSI, ...).';

-- =============================================================================
-- Migration 002 : Extension de la table contacts pour la synchronisation
--                 Azure / Microsoft Graph
-- =============================================================================
-- Ajoute les colonnes nécessaires à l'import des utilisateurs Microsoft Graph
-- (script server/scripts/fetch-graph-users.js + import-graph-contacts.js),
-- la hiérarchie manager → contact, et les index associés.
--
-- Idempotente : utilise IF NOT EXISTS partout.
-- =============================================================================

BEGIN;

-- Extensions requises ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Nouvelles colonnes (Azure / Graph) ------------------------------------------
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employee_id         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS employee_type       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS user_type           VARCHAR(32),
  ADD COLUMN IF NOT EXISTS account_enabled     BOOLEAN,
  ADD COLUMN IF NOT EXISTS office_location     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS street_address      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS postal_code         VARCHAR(32),
  ADD COLUMN IF NOT EXISTS city                VARCHAR(128),
  ADD COLUMN IF NOT EXISTS country             VARCHAR(64),
  ADD COLUMN IF NOT EXISTS state               VARCHAR(128),
  ADD COLUMN IF NOT EXISTS usage_location      VARCHAR(8),
  ADD COLUMN IF NOT EXISTS preferred_language  VARCHAR(16),
  ADD COLUMN IF NOT EXISTS sam_account_name    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS azure_object_id     UUID,
  ADD COLUMN IF NOT EXISTS manager_contact_id  INTEGER,
  ADD COLUMN IF NOT EXISTS graph_attributes    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS graph_synced_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS user_principal_name VARCHAR(255);

-- Foreign key manager → contact (auto-référence) ------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_manager_contact_id_fkey'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_manager_contact_id_fkey
      FOREIGN KEY (manager_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Index ----------------------------------------------------------------------
CREATE INDEX        IF NOT EXISTS idx_contacts_department    ON contacts (department);
CREATE INDEX        IF NOT EXISTS idx_contacts_email_lower   ON contacts (lower(email::text));
CREATE INDEX        IF NOT EXISTS idx_contacts_employee_id   ON contacts (employee_id);
CREATE INDEX        IF NOT EXISTS idx_contacts_graph_attrs   ON contacts USING gin (graph_attributes);
CREATE INDEX        IF NOT EXISTS idx_contacts_lastname_trgm ON contacts USING gin (last_name gin_trgm_ops);
CREATE INDEX        IF NOT EXISTS idx_contacts_manager       ON contacts (manager_contact_id);
CREATE INDEX        IF NOT EXISTS idx_contacts_org           ON contacts (organization_id) WHERE active = true;
CREATE INDEX        IF NOT EXISTS idx_contacts_sam           ON contacts (sam_account_name);
CREATE INDEX        IF NOT EXISTS idx_contacts_upn           ON contacts (lower(user_principal_name::text));

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_identity
  ON contacts (
    lower(last_name::text),
    lower(COALESCE(first_name, '')::text),
    COALESCE(organization_id, 0)
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_azure_oid
  ON contacts (azure_object_id) WHERE azure_object_id IS NOT NULL;

COMMIT;

-- ========================================================================
-- 002_graph_sync_fields.sql — Champs additionnels pour synchro MS Graph
-- ========================================================================
-- Ajoute des colonnes optionnelles peuplées par scripts/import-graph-contacts.js
-- + une clé stable azure_object_id pour upsert idempotent.
-- + manager_contact_id pour reconstruire l'organigramme automatiquement.
-- ========================================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employee_id         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS employee_type       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS user_type           VARCHAR(32),     -- Member / Guest
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
  ADD COLUMN IF NOT EXISTS manager_contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS graph_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS graph_synced_at     TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_azure_oid ON contacts (azure_object_id) WHERE azure_object_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_manager       ON contacts (manager_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_employee_id   ON contacts (employee_id);
CREATE INDEX IF NOT EXISTS idx_contacts_sam           ON contacts (sam_account_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower   ON contacts (lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_graph_attrs   ON contacts USING gin (graph_attributes);

COMMENT ON COLUMN contacts.azure_object_id    IS 'Microsoft Graph user.id (clé stable de matching).';
COMMENT ON COLUMN contacts.graph_attributes   IS 'Fourre-tout JSONB pour tous les champs Graph non typés en colonnes.';
COMMENT ON COLUMN contacts.manager_contact_id IS 'Hiérarchie reconstruite depuis Graph user.manager (N+1 direct).';

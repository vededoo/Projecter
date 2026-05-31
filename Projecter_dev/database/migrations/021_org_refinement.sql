-- ============================================================================
-- Migration 021 : Affinage organisation
-- ----------------------------------------------------------------------------
--   • organizations : suppression de la colonne `type` (rôle = contextuel,
--     non structurel). "organizations" = master neutre (public/privé/asbl…).
--   • org_units.company_id -> organization_id (terme neutre "organization")
--     + renommage du trigger/fonction/index associés, level_label racine.
--   • contacts : ajout `floor` (étage) et `office_ref` (référence de bureau).
--   • Données : "Bd du Jardin Botanique 20" -> "Bd Pachéco 32" (1000 Bruxelles).
-- ============================================================================

BEGIN;

-- ─── 1. organizations : drop `type` ─────────────────────────────────────────
ALTER TABLE organizations DROP COLUMN type;

-- ─── 2. org_units.company_id -> organization_id ─────────────────────────────
ALTER TABLE org_units RENAME COLUMN company_id TO organization_id;
ALTER INDEX idx_org_units_company RENAME TO idx_org_units_organization;

-- Fonction d'héritage : référence la nouvelle colonne
CREATE OR REPLACE FUNCTION org_units_inherit_company() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM org_units WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Renommage propre fonction + trigger (cosmétique mais cohérent)
ALTER FUNCTION org_units_inherit_company() RENAME TO org_units_inherit_organization;
ALTER TRIGGER trg_org_units_inherit_company ON org_units
  RENAME TO trg_org_units_inherit_organization;

-- level_label de la racine company : "Company" -> "Organization"
UPDATE org_units SET level_label = 'Organization'
 WHERE parent_id IS NULL AND level_label = 'Company';

-- ─── 3. contacts : étage + référence bureau ─────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN floor      VARCHAR(32),
  ADD COLUMN office_ref VARCHAR(64);

-- ─── 4. Données : changement d'adresse Botanique -> Pachéco ─────────────────
UPDATE contacts
   SET street_address = 'Bd Pachéco 32',
       postal_code    = COALESCE(postal_code, '1000'),
       city           = COALESCE(city, 'Bruxelles')
 WHERE street_address ILIKE 'Bd du Jardin Botanique 20';

COMMIT;

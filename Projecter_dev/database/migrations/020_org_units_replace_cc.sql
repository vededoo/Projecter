-- ============================================================================
-- Migration 020 : Remplacement de competency_centers par org_units
-- ----------------------------------------------------------------------------
-- Objectif : hiérarchie organisationnelle DYNAMIQUE (profondeur illimitée),
-- multi-company, sans dette "ETNIC-specific".
--
--   • org_units : adjacency list (parent_id) + company_id dénormalisé sur
--     chaque nœud (isolation multi-tenant garantie par trigger)
--   • path : multigram en cache (ex. ETNIC/DG_IT/DIV_DEV/CC_AF) maintenu par trigger
--   • depth : profondeur (0 = racine company)
--   • level_label : libellé de niveau LIBRE (descriptif, non structurel)
--
-- Stratégie : copie des 73 CC en conservant leurs id (FK intactes),
-- création d'une racine company "ETNIC" (L0), repointage des FK, DROP de l'ancien.
-- ============================================================================

BEGIN;

-- ─── 1. Table org_units + index non conflictuels ────────────────────────────
CREATE TABLE org_units (
  id                 SERIAL PRIMARY KEY,
  company_id         INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id          INTEGER REFERENCES org_units(id) ON DELETE CASCADE,
  code               VARCHAR(64)  NOT NULL,
  label              VARCHAR(255) NOT NULL,
  level_label        VARCHAR(64),
  depth              INTEGER NOT NULL DEFAULT 0,
  path               TEXT,
  manager_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  is_interim         BOOLEAN NOT NULL DEFAULT false,
  display_order      INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  active             BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_org_units_parent  ON org_units(parent_id);
CREATE INDEX idx_org_units_company ON org_units(company_id);
CREATE INDEX idx_org_units_manager ON org_units(manager_contact_id);

-- code unique entre frères (et non globalement) : 'WIN' peut exister sous 2 branches
CREATE UNIQUE INDEX uq_org_units_sibling_code
  ON org_units(company_id, COALESCE(parent_id, 0), code);

-- ─── 2. Trigger : héritage company_id depuis le parent ──────────────────────
CREATE OR REPLACE FUNCTION org_units_inherit_company() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM org_units WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_units_inherit_company
  BEFORE INSERT OR UPDATE OF parent_id ON org_units
  FOR EACH ROW EXECUTE FUNCTION org_units_inherit_company();

-- ─── 3. Trigger : recalcul depth + path (multigram) ─────────────────────────
CREATE OR REPLACE FUNCTION org_units_compute_path() RETURNS trigger AS $$
DECLARE
  p_path  TEXT;
  p_depth INTEGER;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
    NEW.path  := NEW.code;
  ELSE
    SELECT path, depth INTO p_path, p_depth FROM org_units WHERE id = NEW.parent_id;
    NEW.depth := COALESCE(p_depth, 0) + 1;
    NEW.path  := COALESCE(p_path, '') || '/' || NEW.code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_units_compute_path
  BEFORE INSERT OR UPDATE OF parent_id, code ON org_units
  FOR EACH ROW EXECUTE FUNCTION org_units_compute_path();

-- ─── 4. Copie des competency_centers (id conservés, triggers OFF) ───────────
-- DISABLE TRIGGER ALL désactive aussi les triggers RI (self-FK parent_id),
-- ce qui autorise un INSERT...SELECT en vrac quel que soit l'ordre des lignes.
ALTER TABLE org_units DISABLE TRIGGER ALL;

INSERT INTO org_units (id, company_id, parent_id, code, label, level_label,
                       manager_contact_id, is_interim, display_order, notes, active)
SELECT cc.id,
       101 AS company_id,                       -- ETNIC (rattachement initial)
       cc.parent_id,
       cc.code,
       cc.label,
       CASE cc.level::text
         WHEN 'dg'       THEN 'DG'
         WHEN 'division' THEN 'Division'
         WHEN 'cc'       THEN 'CC'
         WHEN 'team'     THEN 'Team'
         WHEN 'subteam'  THEN 'Subteam'
         ELSE NULL
       END AS level_label,
       cc.manager_contact_id,
       cc.is_interim,
       cc.display_order + 1,                    -- on libère display_order 0 pour la racine
       cc.notes,
       cc.active
FROM competency_centers cc;

ALTER TABLE org_units ENABLE TRIGGER ALL;

-- Resync séquence AVANT d'insérer la racine (les id ont été forcés)
SELECT setval('org_units_id_seq', (SELECT MAX(id) FROM org_units));

-- ─── 5. Racine company "ETNIC" (L0) + rattachement de l'ancienne racine ─────
INSERT INTO org_units (company_id, parent_id, code, label, level_label, display_order)
VALUES (101, NULL, 'ETNIC', 'ETNIC', 'Company', 0);

UPDATE org_units
   SET parent_id = (SELECT id FROM org_units
                    WHERE company_id = 101 AND code = 'ETNIC' AND parent_id IS NULL)
 WHERE company_id = 101 AND parent_id IS NULL AND code <> 'ETNIC';

-- Une seule racine (L0) par company — créé maintenant que seul ETNIC est NULL
CREATE UNIQUE INDEX uq_org_units_root
  ON org_units(company_id) WHERE parent_id IS NULL;

-- ─── 6. Repointage memberships.cc_id -> org_unit_id ─────────────────────────
ALTER TABLE memberships DROP CONSTRAINT memberships_cc_id_fkey;
ALTER TABLE memberships RENAME COLUMN cc_id TO org_unit_id;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_org_unit_id_fkey
  FOREIGN KEY (org_unit_id) REFERENCES org_units(id) ON DELETE CASCADE;
ALTER INDEX idx_membership_cc RENAME TO idx_membership_org_unit;

-- ─── 7. Repointage project_members.cc_id -> org_unit_id ─────────────────────
ALTER TABLE project_members DROP CONSTRAINT project_members_cc_id_fkey;
ALTER TABLE project_members RENAME COLUMN cc_id TO org_unit_id;
ALTER TABLE project_members
  ADD CONSTRAINT project_members_org_unit_id_fkey
  FOREIGN KEY (org_unit_id) REFERENCES org_units(id);

-- ─── 8. Suppression de l'ancien modèle ──────────────────────────────────────
DROP TABLE competency_centers;
DROP TYPE cc_level;

-- ─── 9. Recalcul depth + path pour tout l'arbre (ordre topologique) ─────────
WITH RECURSIVE tree AS (
  SELECT id, code, parent_id, 0 AS d, code::text AS p
    FROM org_units WHERE parent_id IS NULL
  UNION ALL
  SELECT u.id, u.code, u.parent_id, t.d + 1, t.p || '/' || u.code
    FROM org_units u JOIN tree t ON u.parent_id = t.id
)
UPDATE org_units o
   SET depth = t.d, path = t.p
  FROM tree t
 WHERE o.id = t.id;

COMMIT;

-- Seed 002 : Organigramme ETNIC avril 2025 (hiérarchie complète + contacts)
-- Source : /Shared/templates/projecter-samples/Organigramme avril 2025.pdf
-- ============================================================

BEGIN;

-- Organisation ETNIC assumée présente (seed 001)

-- ========================================================================
-- Phase 1 : Centres de compétences (insert/update, sans FK parent/manager)
-- ========================================================================
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('DG_IT', 'Direction Générale IT', 'DG IT', 'dg', TRUE, 0, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CELL_APPUI', 'Cellule d''appui', 'DG IT', 'division', FALSE, 1, 'Christian DEGUELDRE = Conseiller Expert')
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CONS_TACT', 'Conseiller tactique', 'DG IT', 'division', FALSE, 2, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('DIV_DEV', 'Développement', 'DG IT', 'division', FALSE, 3, 'Manager TBD')
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_AF', 'cc. Analyse Fonctionnelle', 'DG IT', 'cc', FALSE, 4, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_TR_ENS', 'TR-ENS', 'DG IT', 'equipe', FALSE, 5, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_AUTRES_AF', 'AUTRES', 'DG IT', 'equipe', FALSE, 6, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_SOL_MES', 'cc. Solutions sur Mesure', 'DG IT', 'cc', FALSE, 7, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ERIS', 'ERIS', 'DG IT', 'equipe', FALSE, 8, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_eDEV', 'eDEV', 'DG IT', 'sous_equipe', FALSE, 9, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_GESTE', 'GESTE', 'DG IT', 'sous_equipe', FALSE, 10, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ETE', 'ETE', 'DG IT', 'sous_equipe', FALSE, 11, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ARES_WBE', 'ARES/WBE', 'DG IT', 'sous_equipe', FALSE, 12, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_EP5', 'EP5', 'DG IT', 'equipe', FALSE, 13, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_GESPER', 'GESPER', 'DG IT', 'sous_equipe', FALSE, 14, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ALIEN_AUT', 'ALIEN AUTRES', 'DG IT', 'sous_equipe', FALSE, 15, 'Andras KOVACS détaché temporairement chez transversal jusqu''au 21 avril')
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_CAROS', 'CAROS', 'DG IT', 'equipe', FALSE, 16, 'Manager TBD')
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ONE', 'ONE', 'DG IT', 'sous_equipe', FALSE, 17, 'Thierry MASSENAUX détaché chez Transversal')
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_AGAJ_IMAJ', 'AGAJ/IMAJ', 'DG IT', 'sous_equipe', FALSE, 18, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_AGS_AGC', 'AGS/AGC', 'DG IT', 'sous_equipe', FALSE, 19, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_TRANSAM', 'TRANSAM', 'DG IT', 'equipe', FALSE, 20, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_AGMJ', 'AGMJ', 'DG IT', 'sous_equipe', FALSE, 21, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_MON_ESPACE', 'MON ESPACE', 'DG IT', 'sous_equipe', FALSE, 22, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_TRANSVERSAL', 'TRANSVERSAL', 'DG IT', 'sous_equipe', FALSE, 23, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_AEF', 'AEF', 'DG IT', 'sous_equipe', FALSE, 24, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_SOL_ACQ', 'cc. Solutions Acquises', 'DG IT', 'cc', FALSE, 25, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ERP', 'ERP', 'DG IT', 'equipe', FALSE, 26, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_SAP', 'SAP', 'DG IT', 'sous_equipe', FALSE, 27, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_DGI_PROGIBAT', 'DGI / PROGIBAT', 'DG IT', 'sous_equipe', FALSE, 28, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_SIRH', 'SIRH', 'DG IT', 'sous_equipe', FALSE, 29, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_eGOV', 'e-GOV', 'DG IT', 'equipe', FALSE, 30, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_GED', 'GED', 'DG IT', 'sous_equipe', FALSE, 31, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_SIMPLIF_ADM', 'SIMPLIFICATION ADMINISTRATIVE', 'DG IT', 'sous_equipe', FALSE, 32, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_SUBSIDES', 'SUBSIDES', 'DG IT', 'sous_equipe', FALSE, 33, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_WEB', 'WEB', 'DG IT', 'sous_equipe', FALSE, 34, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_eLEARNING', 'e-LEARNING', 'DG IT', 'equipe', FALSE, 35, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_BI', 'cc. BI', 'DG IT', 'cc', FALSE, 36, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_SID', 'SID', 'DG IT', 'equipe', FALSE, 37, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('DIV_TRANSVERSAL', 'Transversal IT', 'DG IT', 'division', FALSE, 38, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_PS_PROJETS', 'cc. Pilotage et Support aux Projets', 'DG IT', 'cc', FALSE, 39, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_CDP', 'Chefs de projet', 'DG IT', 'equipe', FALSE, 40, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_PSO', 'PSO', 'DG IT', 'equipe', FALSE, 41, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_METHO', 'cc. Méthodologie, Standards et Architecture technique', 'DG IT', 'cc', FALSE, 42, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ALM_DEVOPS', 'ALM/DevOps', 'DG IT', 'equipe', FALSE, 43, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ARCHI_TECH', 'Architecture Technique', 'DG IT', 'equipe', FALSE, 44, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_DESIGN_SYS', 'Design System', 'DG IT', 'equipe', FALSE, 45, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ACCESSIBILITE', 'Accessibilité numérique', 'DG IT', 'equipe', FALSE, 46, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_DONNEES', 'cc. des Données', 'DG IT', 'cc', FALSE, 47, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_TESTS', 'cc. Tests', 'DG IT', 'cc', FALSE, 48, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_SECURITE', 'cc Sécurité', 'DG IT', 'cc', FALSE, 49, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_PROD_SEC', 'Produits et Services de sécurité', 'DG IT', 'equipe', FALSE, 50, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_TAR', 'TAR', 'DG IT', 'equipe', FALSE, 51, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_IAM', 'IAM', 'DG IT', 'equipe', FALSE, 52, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_ITIL', 'cc ITIL & Monitoring', 'DG IT', 'cc', FALSE, 53, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ITSM', 'ITSM', 'DG IT', 'equipe', FALSE, 54, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ITIL_PROC', 'ITIL - process', 'DG IT', 'equipe', FALSE, 55, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_MONITORING', 'Monitoring', 'DG IT', 'equipe', FALSE, 56, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_SERVICEDESK', 'cc Service Desk', 'DG IT', 'cc', FALSE, 57, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('DIV_INFRA', 'Infrastructure', 'DG IT', 'division', FALSE, 58, 'Philippe KOENIG = Conseiller Technique ; Valérie MATHOT = Analyste Infrastructure')
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_SERVEURS', 'cc. Serveurs', 'DG IT', 'cc', TRUE, 59, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_INFRA_SRV', 'Infrastructure', 'DG IT', 'equipe', FALSE, 60, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_WINDOWS', 'Windows', 'DG IT', 'equipe', FALSE, 61, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_LINUX', 'Linux', 'DG IT', 'equipe', FALSE, 62, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_MIDDLEWARE', 'cc. Middleware', 'DG IT', 'cc', FALSE, 63, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_DB', 'DB', 'DG IT', 'equipe', FALSE, 64, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_WAS', 'Web App Server', 'DG IT', 'equipe', FALSE, 65, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_ESB', 'ESB', 'DG IT', 'equipe', FALSE, 66, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_TELECOM', 'cc. Telecom', 'DG IT', 'cc', TRUE, 67, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_TELEPHONIE', 'Téléphonie', 'DG IT', 'equipe', FALSE, 68, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('EQ_RESEAU', 'Réseau', 'DG IT', 'equipe', FALSE, 69, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_PRODUCTION', 'cc. Production', 'DG IT', 'cc', TRUE, 70, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_MAINFRAME', 'cc. Mainframe', 'DG IT', 'cc', FALSE, 71, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;
INSERT INTO centres_competences (code, libelle, departement, niveau, manager_interim, ordre, notes) VALUES
  ('CC_POSTES', 'cc. Postes de travail', 'DG IT', 'cc', FALSE, 72, NULL)
ON CONFLICT (code) DO UPDATE SET
  libelle = EXCLUDED.libelle,
  niveau = EXCLUDED.niveau,
  manager_interim = EXCLUDED.manager_interim,
  ordre = EXCLUDED.ordre,
  notes = EXCLUDED.notes;

-- ========================================================================
-- Phase 2 : Mise à jour des parents
-- ========================================================================
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DG_IT') WHERE code = 'CELL_APPUI';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DG_IT') WHERE code = 'CONS_TACT';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DG_IT') WHERE code = 'DIV_DEV';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_DEV') WHERE code = 'CC_AF';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_AF') WHERE code = 'EQ_TR_ENS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_AF') WHERE code = 'EQ_AUTRES_AF';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_DEV') WHERE code = 'CC_SOL_MES';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_ERIS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERIS') WHERE code = 'EQ_eDEV';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERIS') WHERE code = 'EQ_GESTE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERIS') WHERE code = 'EQ_ETE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERIS') WHERE code = 'EQ_ARES_WBE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_EP5';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_EP5') WHERE code = 'EQ_GESPER';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_EP5') WHERE code = 'EQ_ALIEN_AUT';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_CAROS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_CAROS') WHERE code = 'EQ_ONE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_CAROS') WHERE code = 'EQ_AGAJ_IMAJ';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_CAROS') WHERE code = 'EQ_AGS_AGC';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_TRANSAM';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_AGMJ';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_MON_ESPACE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_TRANSVERSAL';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_AEF';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_DEV') WHERE code = 'CC_SOL_ACQ';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_ACQ') WHERE code = 'EQ_ERP';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERP') WHERE code = 'EQ_SAP';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERP') WHERE code = 'EQ_DGI_PROGIBAT';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_ERP') WHERE code = 'EQ_SIRH';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_ACQ') WHERE code = 'EQ_eGOV';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_eGOV') WHERE code = 'EQ_GED';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_eGOV') WHERE code = 'EQ_SIMPLIF_ADM';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_eGOV') WHERE code = 'EQ_SUBSIDES';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'EQ_eGOV') WHERE code = 'EQ_WEB';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SOL_ACQ') WHERE code = 'EQ_eLEARNING';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_DEV') WHERE code = 'CC_BI';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_BI') WHERE code = 'EQ_SID';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DG_IT') WHERE code = 'DIV_TRANSVERSAL';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_PS_PROJETS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_PS_PROJETS') WHERE code = 'EQ_CDP';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_PS_PROJETS') WHERE code = 'EQ_PSO';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_METHO';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_METHO') WHERE code = 'EQ_ALM_DEVOPS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_METHO') WHERE code = 'EQ_ARCHI_TECH';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_METHO') WHERE code = 'EQ_DESIGN_SYS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_METHO') WHERE code = 'EQ_ACCESSIBILITE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_DONNEES';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_TESTS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_SECURITE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SECURITE') WHERE code = 'EQ_PROD_SEC';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SECURITE') WHERE code = 'EQ_TAR';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SECURITE') WHERE code = 'EQ_IAM';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_ITIL';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_ITIL') WHERE code = 'EQ_ITSM';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_ITIL') WHERE code = 'EQ_ITIL_PROC';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_ITIL') WHERE code = 'EQ_MONITORING';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_SERVICEDESK';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DG_IT') WHERE code = 'DIV_INFRA';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_INFRA') WHERE code = 'CC_SERVEURS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SERVEURS') WHERE code = 'EQ_INFRA_SRV';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SERVEURS') WHERE code = 'EQ_WINDOWS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_SERVEURS') WHERE code = 'EQ_LINUX';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_INFRA') WHERE code = 'CC_MIDDLEWARE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_MIDDLEWARE') WHERE code = 'EQ_DB';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_MIDDLEWARE') WHERE code = 'EQ_WAS';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_MIDDLEWARE') WHERE code = 'EQ_ESB';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_INFRA') WHERE code = 'CC_TELECOM';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_TELECOM') WHERE code = 'EQ_TELEPHONIE';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'CC_TELECOM') WHERE code = 'EQ_RESEAU';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_INFRA') WHERE code = 'CC_PRODUCTION';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_INFRA') WHERE code = 'CC_MAINFRAME';
UPDATE centres_competences SET parent_id = (SELECT id FROM centres_competences WHERE code = 'DIV_INFRA') WHERE code = 'CC_POSTES';

-- ========================================================================
-- Phase 3 : Contacts ETNIC (insert si manquants)
-- ========================================================================
WITH etnic AS (SELECT id FROM organisations WHERE code = 'ETNIC')
INSERT INTO contacts (nom, prenom, organisation_id) VALUES
  ('AAMLAOUI', 'Sofian', (SELECT id FROM etnic)),
  ('AARAB', 'Nabil', (SELECT id FROM etnic)),
  ('ADAM', 'Antoine', (SELECT id FROM etnic)),
  ('ADAM', 'Vincent', (SELECT id FROM etnic)),
  ('ADLINE', 'Stéphane', (SELECT id FROM etnic)),
  ('AHRIKA', 'Soufiane', (SELECT id FROM etnic)),
  ('ALMANZAR FERNANDEZ', 'David', (SELECT id FROM etnic)),
  ('ALTARES MENENDEZ', 'Nathan', (SELECT id FROM etnic)),
  ('AMBRI', 'Abid', (SELECT id FROM etnic)),
  ('ANGENOT', 'Arnaud', (SELECT id FROM etnic)),
  ('ANSION', 'Alain', (SELECT id FROM etnic)),
  ('ANTOINE', 'Romain', (SELECT id FROM etnic)),
  ('ARABIA', 'Jonathan', (SELECT id FROM etnic)),
  ('ARS', 'Pierre', (SELECT id FROM etnic)),
  ('AZNAG', 'Mohamed', (SELECT id FROM etnic)),
  ('BAILLET', 'Corinne', (SELECT id FROM etnic)),
  ('BAKKALI', 'Hicham', (SELECT id FROM etnic)),
  ('BARBIAUX', 'Aline', (SELECT id FROM etnic)),
  ('BARRIAN', 'Abdennabi', (SELECT id FROM etnic)),
  ('BARS', 'Zekerija', (SELECT id FROM etnic)),
  ('BAUDOUIN', 'Aline', (SELECT id FROM etnic)),
  ('BAUDOUX', 'Rudy', (SELECT id FROM etnic)),
  ('BAY', 'Julien', (SELECT id FROM etnic)),
  ('BEN ABDESLEM', 'Jamal', (SELECT id FROM etnic)),
  ('BEN KHALFALLAH', 'Aymen', (SELECT id FROM etnic)),
  ('BENALI', 'Abdelkader', (SELECT id FROM etnic)),
  ('BENDA', 'Joëlle', (SELECT id FROM etnic)),
  ('BENGHANAM', 'Abde Rahman', (SELECT id FROM etnic)),
  ('BERNARD', 'Bruno', (SELECT id FROM etnic)),
  ('BERTIEAUX', 'Pierre-Paul', (SELECT id FROM etnic)),
  ('BERTRAND', 'Nicolas', (SELECT id FROM etnic)),
  ('BILLEN', 'Laurent', (SELECT id FROM etnic)),
  ('BIT', 'Arnaud', (SELECT id FROM etnic)),
  ('BLONDIAUX', 'Denis', (SELECT id FROM etnic)),
  ('BODSON', 'Marc', (SELECT id FROM etnic)),
  ('BOILAN', 'Jérémie', (SELECT id FROM etnic)),
  ('BONGARTZ', 'Michaël', (SELECT id FROM etnic)),
  ('BOON', 'Alexis', (SELECT id FROM etnic)),
  ('BORILE', 'Loris', (SELECT id FROM etnic)),
  ('BOUNOU', 'Abdelhafid', (SELECT id FROM etnic)),
  ('BOURGEOIS', 'Adrien', (SELECT id FROM etnic)),
  ('BOUTINZITE', 'Larbi', (SELECT id FROM etnic)),
  ('BOUZIANE', 'Mohamed', (SELECT id FROM etnic)),
  ('BOUZROUTI', 'Mohamed', (SELECT id FROM etnic)),
  ('BRANCART', 'Jerry', (SELECT id FROM etnic)),
  ('BRIDOUX', 'Stéphane', (SELECT id FROM etnic)),
  ('BROUEZ', 'Benjamen', (SELECT id FROM etnic)),
  ('BUREAU', 'Catherine', (SELECT id FROM etnic)),
  ('CALBEAU', 'Aude', (SELECT id FROM etnic)),
  ('CAPUTO', 'Laurent', (SELECT id FROM etnic)),
  ('CARLETTI', 'Florence', (SELECT id FROM etnic)),
  ('CARRETTE', 'Michaël', (SELECT id FROM etnic)),
  ('CASSAN', 'Anelita', (SELECT id FROM etnic)),
  ('CAUDRON', 'Sébastien', (SELECT id FROM etnic)),
  ('CHAHBOUNI', 'Soufiane', (SELECT id FROM etnic)),
  ('CHALTIN', 'Pierre', (SELECT id FROM etnic)),
  ('CHAMBERT', 'Yann', (SELECT id FROM etnic)),
  ('CHARLET', 'Laurent', (SELECT id FROM etnic)),
  ('CHERGUI', 'Ilias', (SELECT id FROM etnic)),
  ('CHERPION', 'Yaël', (SELECT id FROM etnic)),
  ('CHOUSTOULAKIS', 'Charidimos', (SELECT id FROM etnic)),
  ('COCKELAERE', 'Mathias', (SELECT id FROM etnic)),
  ('COGELS', 'Dorothée', (SELECT id FROM etnic)),
  ('CONSTANT', 'Simon', (SELECT id FROM etnic)),
  ('CORIJN', 'Benoit', (SELECT id FROM etnic)),
  ('COSTABEBER', 'Michaël', (SELECT id FROM etnic)),
  ('COUROUPPE', 'Olivier', (SELECT id FROM etnic)),
  ('CRICKX', 'Jonathan', (SELECT id FROM etnic)),
  ('CROISELET', 'Nicolas', (SELECT id FROM etnic)),
  ('CUYPERS', 'Valérian', (SELECT id FROM etnic)),
  ('CYIMENA', 'Emile', (SELECT id FROM etnic)),
  ('DA SILVA ARAUJO', 'David', (SELECT id FROM etnic)),
  ('DAL', 'Jean-Marc', (SELECT id FROM etnic)),
  ('DANG NGOC', 'Thomas', (SELECT id FROM etnic)),
  ('DARDENNE', 'Thomas', (SELECT id FROM etnic)),
  ('DAVREUX', 'Julian', (SELECT id FROM etnic)),
  ('DAWAGNE', 'Florence', (SELECT id FROM etnic)),
  ('DE BACKER', 'Lina', (SELECT id FROM etnic)),
  ('DE BACKER', 'Sophie', (SELECT id FROM etnic)),
  ('DE LANDSHEER', 'Thierry', (SELECT id FROM etnic)),
  ('DE MICHELE', 'Angelo Giuseppe', (SELECT id FROM etnic)),
  ('DE PREZ', 'Laurence', (SELECT id FROM etnic)),
  ('DEFOURNY', 'Violaine', (SELECT id FROM etnic)),
  ('DEFRAENE', 'Adrien', (SELECT id FROM etnic)),
  ('DEGLAS', 'Thomas', (SELECT id FROM etnic)),
  ('DEGOLS', 'Thierry', (SELECT id FROM etnic)),
  ('DEGUELDRE', 'Christian', (SELECT id FROM etnic)),
  ('DELBEKE', 'Christophe', (SELECT id FROM etnic)),
  ('DELCAMBE', 'Elodie', (SELECT id FROM etnic)),
  ('DELPORTE', 'Marc', (SELECT id FROM etnic)),
  ('DEMOITIE', 'Stéphane', (SELECT id FROM etnic)),
  ('DENIS', 'Damien', (SELECT id FROM etnic)),
  ('DENY', 'Eric', (SELECT id FROM etnic)),
  ('DEPUYDT', 'Raphaël', (SELECT id FROM etnic)),
  ('DESFACHELLE', 'Frédéric', (SELECT id FROM etnic)),
  ('DEVIS', 'Arnaud', (SELECT id FROM etnic)),
  ('DEVRESSE', 'Malcolm', (SELECT id FROM etnic)),
  ('DEWAILLY', 'Jean', (SELECT id FROM etnic)),
  ('DIALLO', 'Mamadou', (SELECT id FROM etnic)),
  ('DOUBLIER', 'Sami', (SELECT id FROM etnic)),
  ('DUBIE', 'Dimitri', (SELECT id FROM etnic)),
  ('DUBOIS', 'Christophe', (SELECT id FROM etnic)),
  ('DUCHESNE', 'Françoise', (SELECT id FROM etnic)),
  ('DUFRANE', 'Nicolas', (SELECT id FROM etnic)),
  ('DURET', 'Hugo', (SELECT id FROM etnic)),
  ('DURIEUX', 'Valentin', (SELECT id FROM etnic)),
  ('DUTERME', 'Fabian', (SELECT id FROM etnic)),
  ('EL BOUBSI', 'Salma', (SELECT id FROM etnic)),
  ('EL GHANASSY', 'Nawal', (SELECT id FROM etnic)),
  ('EL HAKYM', 'Khalid', (SELECT id FROM etnic)),
  ('EL JASOULI', 'Sidi Mohamed', (SELECT id FROM etnic)),
  ('ELBAZZOUNA', 'Anas', (SELECT id FROM etnic)),
  ('FALQUE', 'Patrick', (SELECT id FROM etnic)),
  ('FALZONE', 'Christophe', (SELECT id FROM etnic)),
  ('FARRAPA PINGUINHAS', 'Lucas', (SELECT id FROM etnic)),
  ('FERNANDEZ', 'Xavier', (SELECT id FROM etnic)),
  ('FERRERO', 'Ezequiel', (SELECT id FROM etnic)),
  ('FONTAINE', 'Olivier', (SELECT id FROM etnic)),
  ('FRANCESCANGELI', 'Joachim', (SELECT id FROM etnic)),
  ('FREGER', 'Thomas', (SELECT id FROM etnic)),
  ('GASPARD', 'Renaud', (SELECT id FROM etnic)),
  ('GAVRIILIDIS', 'Alexandre', (SELECT id FROM etnic)),
  ('GENTILI', 'Luca', (SELECT id FROM etnic)),
  ('GHOUL', 'Mounir', (SELECT id FROM etnic)),
  ('GHYSSELS', 'Cédric', (SELECT id FROM etnic)),
  ('GILLARD', 'Pierre', (SELECT id FROM etnic)),
  ('GILLES', 'Olivier', (SELECT id FROM etnic)),
  ('GLOWACKI', 'Stéphane', (SELECT id FROM etnic)),
  ('GOFFINET', 'Yves', (SELECT id FROM etnic)),
  ('GOSSET', 'Valéry', (SELECT id FROM etnic)),
  ('GOURMAND', 'Frederic', (SELECT id FROM etnic)),
  ('GOVAERT', 'Simon', (SELECT id FROM etnic)),
  ('GRANDJEAN', 'Bastien', (SELECT id FROM etnic)),
  ('GUAZZO', 'Jean-Jacques', (SELECT id FROM etnic)),
  ('GURNY', 'Olivier', (SELECT id FROM etnic)),
  ('HACHA', 'Raphael', (SELECT id FROM etnic)),
  ('HAMDI', 'Aissam', (SELECT id FROM etnic)),
  ('HAMRANI', 'Younes', (SELECT id FROM etnic)),
  ('HANS', 'Michaël', (SELECT id FROM etnic)),
  ('HARMATI', 'Kévin', (SELECT id FROM etnic)),
  ('HERMES', 'Thibault', (SELECT id FROM etnic)),
  ('HEUNINCKX', 'Renaud', (SELECT id FROM etnic)),
  ('HOFMAN', 'Ingrid', (SELECT id FROM etnic)),
  ('HOST', 'Michel', (SELECT id FROM etnic)),
  ('HOTAK', 'Faisal', (SELECT id FROM etnic)),
  ('HOTEITE', 'Rami', (SELECT id FROM etnic)),
  ('HOUSNI', 'Abdellatif', (SELECT id FROM etnic)),
  ('HOYOIS', 'Jenny', (SELECT id FROM etnic)),
  ('IDES', 'Loup', (SELECT id FROM etnic)),
  ('IYAKAREMYE', 'Noël', (SELECT id FROM etnic)),
  ('JAMART', 'Cécile', (SELECT id FROM etnic)),
  ('JELTI', 'Souad', (SELECT id FROM etnic)),
  ('JEUNIAUX', 'Olivier', (SELECT id FROM etnic)),
  ('JEURISSEN', 'Geoffrey', (SELECT id FROM etnic)),
  ('JOERTZ', 'Arnaud', (SELECT id FROM etnic)),
  ('JOIRET', 'Julien', (SELECT id FROM etnic)),
  ('JORIS', 'Nicolas', (SELECT id FROM etnic)),
  ('JOUREZ', 'Sylvian', (SELECT id FROM etnic)),
  ('KARRAWA BEMBIADE', 'Sandra', (SELECT id FROM etnic)),
  ('KERSTENS', 'Gaëtan', (SELECT id FROM etnic)),
  ('KOENIG', 'Philippe', (SELECT id FROM etnic)),
  ('KOUAHOU YONGUE', 'Aubert', (SELECT id FROM etnic)),
  ('KOVACS', 'Andras', (SELECT id FROM etnic)),
  ('LADON', 'Anthony', (SELECT id FROM etnic)),
  ('LADURON', 'Pierre', (SELECT id FROM etnic)),
  ('LALOUX', 'Olivier', (SELECT id FROM etnic)),
  ('LAMBERT', 'Cliff', (SELECT id FROM etnic)),
  ('LAMBERT', 'Valery', (SELECT id FROM etnic)),
  ('LAURENT', 'Paul', (SELECT id FROM etnic)),
  ('LEFEVRE', 'Catherine', (SELECT id FROM etnic)),
  ('LEJEUNE', 'Vincent', (SELECT id FROM etnic)),
  ('LEMAIRE', 'Fabienne', (SELECT id FROM etnic)),
  ('LEMMENS', 'Pascal', (SELECT id FROM etnic)),
  ('LEONARD', 'Philippe', (SELECT id FROM etnic)),
  ('LIVOLSI', 'Salvatore', (SELECT id FROM etnic)),
  ('LOUIS', 'Christophe', (SELECT id FROM etnic)),
  ('LUKASHEVICH', 'Violetta', (SELECT id FROM etnic)),
  ('LURDE', 'Vincent', (SELECT id FROM etnic)),
  ('LUTZ', 'Steeve', (SELECT id FROM etnic)),
  ('MAGIS', 'Tom', (SELECT id FROM etnic)),
  ('MAKRAI', 'Yassin', (SELECT id FROM etnic)),
  ('MALVOISIN', 'Jérôme', (SELECT id FROM etnic)),
  ('MANAD', 'Abdelhadi', (SELECT id FROM etnic)),
  ('MARCHANT', 'Pierre', (SELECT id FROM etnic)),
  ('MARKOWSKI', 'Jean-Marie', (SELECT id FROM etnic)),
  ('MARQUET', 'David', (SELECT id FROM etnic)),
  ('MARSEILLE', 'Samuel', (SELECT id FROM etnic)),
  ('MARTIN', 'Xavier', (SELECT id FROM etnic)),
  ('MARZOUK', 'Mounir', (SELECT id FROM etnic)),
  ('MASSENAUX', 'Thierry', (SELECT id FROM etnic)),
  ('MASSY', 'Stéphan', (SELECT id FROM etnic)),
  ('MATHELART', 'Pierre', (SELECT id FROM etnic)),
  ('MATHOT', 'Valérie', (SELECT id FROM etnic)),
  ('MATHUES', 'Annick', (SELECT id FROM etnic)),
  ('MATHY', 'Vincent', (SELECT id FROM etnic)),
  ('MELCHERS', 'Thomas', (SELECT id FROM etnic)),
  ('MELIN', 'Michael', (SELECT id FROM etnic)),
  ('MENDOZA GODOY', 'Diego', (SELECT id FROM etnic)),
  ('MERRY', 'Pierre', (SELECT id FROM etnic)),
  ('MESTRONE', 'Grégory', (SELECT id FROM etnic)),
  ('METTENS', 'Quentin', (SELECT id FROM etnic)),
  ('MICHEL', 'Marc', (SELECT id FROM etnic)),
  ('MICHEL', 'Sébastien', (SELECT id FROM etnic)),
  ('MILO', 'Julien', (SELECT id FROM etnic)),
  ('MINAZZI', 'Paolo', (SELECT id FROM etnic)),
  ('MINNENS', 'Christian', (SELECT id FROM etnic)),
  ('MOJUYE TOUKAM', 'Eunice Vianey', (SELECT id FROM etnic)),
  ('MOSTENNE', 'Patrick', (SELECT id FROM etnic)),
  ('MOULILA', 'Younes', (SELECT id FROM etnic)),
  ('MOURETTE', 'Aurore', (SELECT id FROM etnic)),
  ('NAVARRA', 'Gregory', (SELECT id FROM etnic)),
  ('NDJOH EYOUM', 'Serge', (SELECT id FROM etnic)),
  ('NERINCKX', 'Fabrice', (SELECT id FROM etnic)),
  ('NEVEN', 'Simon', (SELECT id FROM etnic)),
  ('NGONGANG TCHOUMKEU', 'Gilles', (SELECT id FROM etnic)),
  ('NGUYEN', 'Michel Khanh', (SELECT id FROM etnic)),
  ('NICAISE', 'Thomas', (SELECT id FROM etnic)),
  ('NOSEDA', 'Anne', (SELECT id FROM etnic)),
  ('NOWICKI-RAIKHLIN', 'Marion', (SELECT id FROM etnic)),
  ('NOËL', 'Guy', (SELECT id FROM etnic)),
  ('ONAY', 'Ayse', (SELECT id FROM etnic)),
  ('ONDERBEKE', 'Jean-Claude', (SELECT id FROM etnic)),
  ('OUEIDAT', 'Rabih', (SELECT id FROM etnic)),
  ('PAGNIEAU', 'Jonathan', (SELECT id FROM etnic)),
  ('PATART', 'Alexandre', (SELECT id FROM etnic)),
  ('PAULET', 'Cyril', (SELECT id FROM etnic)),
  ('PAUWELS', 'Stephan', (SELECT id FROM etnic)),
  ('PETIT', 'Jean-François', (SELECT id FROM etnic)),
  ('PHOLSENA', 'Phonenarinh', (SELECT id FROM etnic)),
  ('PIERRE-LOUIS', 'Alix', (SELECT id FROM etnic)),
  ('PIPERS', 'Chris', (SELECT id FROM etnic)),
  ('PIRMEZ', 'Géry', (SELECT id FROM etnic)),
  ('PISSENS', 'Sébastien', (SELECT id FROM etnic)),
  ('PLANCQ', 'Jonathan', (SELECT id FROM etnic)),
  ('PLOVIE', 'Christophe', (SELECT id FROM etnic)),
  ('PONSELET', 'André', (SELECT id FROM etnic)),
  ('POTHIER', 'Christophe', (SELECT id FROM etnic)),
  ('RAES', 'Frédéric', (SELECT id FROM etnic)),
  ('RASQUIN', 'Sabine', (SELECT id FROM etnic)),
  ('RASSART', 'Julien', (SELECT id FROM etnic)),
  ('REGA', 'Carine', (SELECT id FROM etnic)),
  ('REGNIER', 'Frédéric', (SELECT id FROM etnic)),
  ('REZETTE', 'Michèle', (SELECT id FROM etnic)),
  ('RHAITI', 'Azzeddine', (SELECT id FROM etnic)),
  ('ROCHEZ', 'Jean-Christophe', (SELECT id FROM etnic)),
  ('ROGGEMANS', 'Frédéric', (SELECT id FROM etnic)),
  ('ROSCA', 'Gabriela', (SELECT id FROM etnic)),
  ('ROUSSEL', 'Dominique', (SELECT id FROM etnic)),
  ('ROUWEZ', 'Stéphane', (SELECT id FROM etnic)),
  ('ROUXHET', 'Patrick', (SELECT id FROM etnic)),
  ('SAVE LARA', 'Luis', (SELECT id FROM etnic)),
  ('SCHAILLIE', 'Christophe', (SELECT id FROM etnic)),
  ('SCHILTZ', 'Sébastien', (SELECT id FROM etnic)),
  ('SCHMIDT', 'Emmanuel', (SELECT id FROM etnic)),
  ('SEDDA', 'Kevin', (SELECT id FROM etnic)),
  ('SEQUEIRA GUIMARAES', 'Paulo Leandro', (SELECT id FROM etnic)),
  ('SERBANESCU', 'Andreï', (SELECT id FROM etnic)),
  ('SERVAIS', 'Laurent', (SELECT id FROM etnic)),
  ('SLAEDTS', 'Mathieu', (SELECT id FROM etnic)),
  ('SOHY', 'Patrice', (SELECT id FROM etnic)),
  ('SOLLIMA', 'Stéphane', (SELECT id FROM etnic)),
  ('SOORS', 'Aurore', (SELECT id FROM etnic)),
  ('STIENS', 'Laurent', (SELECT id FROM etnic)),
  ('STINGLHAMBER', 'Grégory', (SELECT id FROM etnic)),
  ('STRYKERS', 'Simon', (SELECT id FROM etnic)),
  ('SWAELENS', 'Fabian', (SELECT id FROM etnic)),
  ('TELLIER', 'Serge', (SELECT id FROM etnic)),
  ('THYS', 'Johan', (SELECT id FROM etnic)),
  ('TONDEUR', 'Jonathan', (SELECT id FROM etnic)),
  ('TONGRES', 'Florian', (SELECT id FROM etnic)),
  ('TONGRES', 'Stéphane', (SELECT id FROM etnic)),
  ('TOUDA LACHIRI', 'Anas', (SELECT id FROM etnic)),
  ('TRICHA', 'Amine', (SELECT id FROM etnic)),
  ('TUDOSE', 'Alina', (SELECT id FROM etnic)),
  ('VAN DAMME', 'Ryan', (SELECT id FROM etnic)),
  ('VAN DEN HOVE', 'Alain', (SELECT id FROM etnic)),
  ('VAN LIERDE', 'Boris', (SELECT id FROM etnic)),
  ('VAN ROMPU', 'Frédéric', (SELECT id FROM etnic)),
  ('VANCUTSEM', 'Pierre', (SELECT id FROM etnic)),
  ('VANDE PITTE', 'Nicolas', (SELECT id FROM etnic)),
  ('VANDENBROECK', 'Dimitri', (SELECT id FROM etnic)),
  ('VANOYCKE', 'Cédric', (SELECT id FROM etnic)),
  ('VANSWEEVELT', 'Christophe', (SELECT id FROM etnic)),
  ('VAZQUEZ FREIRE', 'Raphaël', (SELECT id FROM etnic)),
  ('VELARDE GONZALEZ', 'Sandra', (SELECT id FROM etnic)),
  ('VELASCO ESPEJO', 'Sofia', (SELECT id FROM etnic)),
  ('VERHEGGEN', 'Stephan', (SELECT id FROM etnic)),
  ('VIALE', 'Stefano', (SELECT id FROM etnic)),
  ('VIEIRA RAMOS', 'Alexandre', (SELECT id FROM etnic)),
  ('VINCART', 'Stéphanie', (SELECT id FROM etnic)),
  ('VINCENT', 'Yannick', (SELECT id FROM etnic)),
  ('WARNOTTE', 'Nicolas', (SELECT id FROM etnic)),
  ('WAUTHION', 'Eric', (SELECT id FROM etnic)),
  ('WILLEM', 'Augustin', (SELECT id FROM etnic)),
  ('WILLOCQ', 'Philippe', (SELECT id FROM etnic)),
  ('WYCKAERT', 'Jérémie', (SELECT id FROM etnic)),
  ('YAHTIT', 'Mohamed', (SELECT id FROM etnic)),
  ('YEMLAHI CHAER', 'Mariem', (SELECT id FROM etnic)),
  ('ZULU KILO', 'Didier', (SELECT id FROM etnic))
ON CONFLICT (lower(nom), lower(coalesce(prenom,'')), coalesce(organisation_id,0)) DO NOTHING;

-- ========================================================================
-- Phase 4 : Assignation des managers aux CC
-- ========================================================================
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('VERHEGGEN') AND lower(coalesce(prenom,'')) = lower('Stephan') LIMIT 1) WHERE code = 'DG_IT';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('PATART') AND lower(coalesce(prenom,'')) = lower('Alexandre') LIMIT 1) WHERE code = 'CONS_TACT';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('SCHILTZ') AND lower(coalesce(prenom,'')) = lower('Sébastien') LIMIT 1) WHERE code = 'CC_AF';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('MATHY') AND lower(coalesce(prenom,'')) = lower('Vincent') LIMIT 1) WHERE code = 'EQ_TR_ENS';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('ANGENOT') AND lower(coalesce(prenom,'')) = lower('Arnaud') LIMIT 1) WHERE code = 'EQ_AUTRES_AF';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('DELPORTE') AND lower(coalesce(prenom,'')) = lower('Marc') LIMIT 1) WHERE code = 'CC_SOL_MES';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('GLOWACKI') AND lower(coalesce(prenom,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'EQ_ERIS';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('CAUDRON') AND lower(coalesce(prenom,'')) = lower('Sébastien') LIMIT 1) WHERE code = 'EQ_GESTE';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('PHOLSENA') AND lower(coalesce(prenom,'')) = lower('Phonenarinh') LIMIT 1) WHERE code = 'EQ_ETE';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('NERINCKX') AND lower(coalesce(prenom,'')) = lower('Fabrice') LIMIT 1) WHERE code = 'EQ_EP5';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('VELASCO ESPEJO') AND lower(coalesce(prenom,'')) = lower('Sofia') LIMIT 1) WHERE code = 'EQ_ALIEN_AUT';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('BORILE') AND lower(coalesce(prenom,'')) = lower('Loris') LIMIT 1) WHERE code = 'EQ_ONE';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('MARZOUK') AND lower(coalesce(prenom,'')) = lower('Mounir') LIMIT 1) WHERE code = 'EQ_AGS_AGC';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('BOUNOU') AND lower(coalesce(prenom,'')) = lower('Abdelhafid') LIMIT 1) WHERE code = 'EQ_TRANSAM';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('YEMLAHI CHAER') AND lower(coalesce(prenom,'')) = lower('Mariem') LIMIT 1) WHERE code = 'EQ_TRANSVERSAL';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('BRANCART') AND lower(coalesce(prenom,'')) = lower('Jerry') LIMIT 1) WHERE code = 'CC_SOL_ACQ';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('DUTERME') AND lower(coalesce(prenom,'')) = lower('Fabian') LIMIT 1) WHERE code = 'EQ_ERP';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('DAVREUX') AND lower(coalesce(prenom,'')) = lower('Julian') LIMIT 1) WHERE code = 'EQ_eGOV';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('DUBIE') AND lower(coalesce(prenom,'')) = lower('Dimitri') LIMIT 1) WHERE code = 'EQ_GED';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('LAMBERT') AND lower(coalesce(prenom,'')) = lower('Valery') LIMIT 1) WHERE code = 'EQ_SUBSIDES';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('PISSENS') AND lower(coalesce(prenom,'')) = lower('Sébastien') LIMIT 1) WHERE code = 'EQ_WEB';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('HERMES') AND lower(coalesce(prenom,'')) = lower('Thibault') LIMIT 1) WHERE code = 'EQ_eLEARNING';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('MASSY') AND lower(coalesce(prenom,'')) = lower('Stéphan') LIMIT 1) WHERE code = 'CC_BI';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('DEFOURNY') AND lower(coalesce(prenom,'')) = lower('Violaine') LIMIT 1) WHERE code = 'EQ_SID';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('VERHEGGEN') AND lower(coalesce(prenom,'')) = lower('Stephan') LIMIT 1) WHERE code = 'DIV_TRANSVERSAL';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('BERTIEAUX') AND lower(coalesce(prenom,'')) = lower('Pierre-Paul') LIMIT 1) WHERE code = 'CC_PS_PROJETS';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('TONGRES') AND lower(coalesce(prenom,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'CC_METHO';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('BENDA') AND lower(coalesce(prenom,'')) = lower('Joëlle') LIMIT 1) WHERE code = 'CC_DONNEES';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('VIEIRA RAMOS') AND lower(coalesce(prenom,'')) = lower('Alexandre') LIMIT 1) WHERE code = 'CC_TESTS';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('SERVAIS') AND lower(coalesce(prenom,'')) = lower('Laurent') LIMIT 1) WHERE code = 'CC_SECURITE';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('BODSON') AND lower(coalesce(prenom,'')) = lower('Marc') LIMIT 1) WHERE code = 'CC_ITIL';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('EL GHANASSY') AND lower(coalesce(prenom,'')) = lower('Nawal') LIMIT 1) WHERE code = 'CC_SERVICEDESK';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('PONSELET') AND lower(coalesce(prenom,'')) = lower('André') LIMIT 1) WHERE code = 'DIV_INFRA';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('ROUWEZ') AND lower(coalesce(prenom,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'CC_SERVEURS';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('STINGLHAMBER') AND lower(coalesce(prenom,'')) = lower('Grégory') LIMIT 1) WHERE code = 'CC_MIDDLEWARE';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('ROUWEZ') AND lower(coalesce(prenom,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'CC_TELECOM';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('WILLOCQ') AND lower(coalesce(prenom,'')) = lower('Philippe') LIMIT 1) WHERE code = 'CC_PRODUCTION';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('WILLOCQ') AND lower(coalesce(prenom,'')) = lower('Philippe') LIMIT 1) WHERE code = 'CC_MAINFRAME';
UPDATE centres_competences SET manager_contact_id = (SELECT id FROM contacts WHERE lower(nom) = lower('LEMMENS') AND lower(coalesce(prenom,'')) = lower('Pascal') LIMIT 1) WHERE code = 'CC_POSTES';

-- ========================================================================
-- Phase 5 : Affectations contact <-> CC (memberships)
-- On insert manager comme role='manager', les autres comme 'membre'.
-- ========================================================================
DELETE FROM contact_memberships;  -- reset idempotent pour ce seed

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VERHEGGEN') AND lower(coalesce(prenom,''))=lower('Stephan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='DG_IT'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MOURETTE') AND lower(coalesce(prenom,''))=lower('Aurore') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CELL_APPUI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FALZONE') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CELL_APPUI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEGUELDRE') AND lower(coalesce(prenom,''))=lower('Christian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CELL_APPUI'), 'conseiller'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PATART') AND lower(coalesce(prenom,''))=lower('Alexandre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CONS_TACT'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SCHILTZ') AND lower(coalesce(prenom,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_AF'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MATHY') AND lower(coalesce(prenom,''))=lower('Vincent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MARQUET') AND lower(coalesce(prenom,''))=lower('David') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BUREAU') AND lower(coalesce(prenom,''))=lower('Catherine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GOFFINET') AND lower(coalesce(prenom,''))=lower('Yves') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROUXHET') AND lower(coalesce(prenom,''))=lower('Patrick') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('COGELS') AND lower(coalesce(prenom,''))=lower('Dorothée') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GENTILI') AND lower(coalesce(prenom,''))=lower('Luca') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HAMDI') AND lower(coalesce(prenom,''))=lower('Aissam') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DE BACKER') AND lower(coalesce(prenom,''))=lower('Lina') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TR_ENS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ANGENOT') AND lower(coalesce(prenom,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AUTRES_AF'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HOYOIS') AND lower(coalesce(prenom,''))=lower('Jenny') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AUTRES_AF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MANAD') AND lower(coalesce(prenom,''))=lower('Abdelhadi') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AUTRES_AF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ZULU KILO') AND lower(coalesce(prenom,''))=lower('Didier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AUTRES_AF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('KARRAWA BEMBIADE') AND lower(coalesce(prenom,''))=lower('Sandra') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AUTRES_AF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('REGA') AND lower(coalesce(prenom,''))=lower('Carine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AUTRES_AF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DELPORTE') AND lower(coalesce(prenom,''))=lower('Marc') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SOL_MES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GLOWACKI') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ERIS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHAHBOUNI') AND lower(coalesce(prenom,''))=lower('Soufiane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eDEV'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FREGER') AND lower(coalesce(prenom,''))=lower('Thomas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eDEV'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CAUDRON') AND lower(coalesce(prenom,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOON') AND lower(coalesce(prenom,''))=lower('Alexis') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PLANCQ') AND lower(coalesce(prenom,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VAZQUEZ FREIRE') AND lower(coalesce(prenom,''))=lower('Raphaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOUZIANE') AND lower(coalesce(prenom,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('IDES') AND lower(coalesce(prenom,''))=lower('Loup') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SEQUEIRA GUIMARAES') AND lower(coalesce(prenom,''))=lower('Paulo Leandro') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MOULILA') AND lower(coalesce(prenom,''))=lower('Younes') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HOTEITE') AND lower(coalesce(prenom,''))=lower('Rami') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ELBAZZOUNA') AND lower(coalesce(prenom,''))=lower('Anas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LURDE') AND lower(coalesce(prenom,''))=lower('Vincent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LEMAIRE') AND lower(coalesce(prenom,''))=lower('Fabienne') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('COUROUPPE') AND lower(coalesce(prenom,''))=lower('Olivier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESTE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PHOLSENA') AND lower(coalesce(prenom,''))=lower('Phonenarinh') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LADURON') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NOËL') AND lower(coalesce(prenom,''))=lower('Guy') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SCHMIDT') AND lower(coalesce(prenom,''))=lower('Emmanuel') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CALBEAU') AND lower(coalesce(prenom,''))=lower('Aude') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FARRAPA PINGUINHAS') AND lower(coalesce(prenom,''))=lower('Lucas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PETIT') AND lower(coalesce(prenom,''))=lower('Jean-François') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BAY') AND lower(coalesce(prenom,''))=lower('Julien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ETE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MERRY') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ARES_WBE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NERINCKX') AND lower(coalesce(prenom,''))=lower('Fabrice') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_EP5'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BARBIAUX') AND lower(coalesce(prenom,''))=lower('Aline') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BARS') AND lower(coalesce(prenom,''))=lower('Zekerija') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOUZROUTI') AND lower(coalesce(prenom,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HANS') AND lower(coalesce(prenom,''))=lower('Michaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JORIS') AND lower(coalesce(prenom,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LEJEUNE') AND lower(coalesce(prenom,''))=lower('Vincent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROSCA') AND lower(coalesce(prenom,''))=lower('Gabriela') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SOHY') AND lower(coalesce(prenom,''))=lower('Patrice') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VAN DEN HOVE') AND lower(coalesce(prenom,''))=lower('Alain') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TUDOSE') AND lower(coalesce(prenom,''))=lower('Alina') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('REGNIER') AND lower(coalesce(prenom,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DE LANDSHEER') AND lower(coalesce(prenom,''))=lower('Thierry') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('AZNAG') AND lower(coalesce(prenom,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VAN DAMME') AND lower(coalesce(prenom,''))=lower('Ryan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MELCHERS') AND lower(coalesce(prenom,''))=lower('Thomas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CORIJN') AND lower(coalesce(prenom,''))=lower('Benoit') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GESPER'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VELASCO ESPEJO') AND lower(coalesce(prenom,''))=lower('Sofia') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('AMBRI') AND lower(coalesce(prenom,''))=lower('Abid') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GURNY') AND lower(coalesce(prenom,''))=lower('Olivier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LOUIS') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('REZETTE') AND lower(coalesce(prenom,''))=lower('Michèle') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SEDDA') AND lower(coalesce(prenom,''))=lower('Kevin') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DOUBLIER') AND lower(coalesce(prenom,''))=lower('Sami') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHERGUI') AND lower(coalesce(prenom,''))=lower('Ilias') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DELBEKE') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DARDENNE') AND lower(coalesce(prenom,''))=lower('Thomas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NGONGANG TCHOUMKEU') AND lower(coalesce(prenom,''))=lower('Gilles') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('KOVACS') AND lower(coalesce(prenom,''))=lower('Andras') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALIEN_AUT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BORILE') AND lower(coalesce(prenom,''))=lower('Loris') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ONE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MASSENAUX') AND lower(coalesce(prenom,''))=lower('Thierry') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ONE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FRANCESCANGELI') AND lower(coalesce(prenom,''))=lower('Joachim') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ONE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SAVE LARA') AND lower(coalesce(prenom,''))=lower('Luis') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ONE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DESFACHELLE') AND lower(coalesce(prenom,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGAJ_IMAJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEVRESSE') AND lower(coalesce(prenom,''))=lower('Malcolm') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGAJ_IMAJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NAVARRA') AND lower(coalesce(prenom,''))=lower('Gregory') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGAJ_IMAJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HEUNINCKX') AND lower(coalesce(prenom,''))=lower('Renaud') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGAJ_IMAJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('STRYKERS') AND lower(coalesce(prenom,''))=lower('Simon') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGAJ_IMAJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TOUDA LACHIRI') AND lower(coalesce(prenom,''))=lower('Anas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGAJ_IMAJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MARZOUK') AND lower(coalesce(prenom,''))=lower('Mounir') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGS_AGC'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HACHA') AND lower(coalesce(prenom,''))=lower('Raphael') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGS_AGC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NGUYEN') AND lower(coalesce(prenom,''))=lower('Michel Khanh') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGS_AGC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('OUEIDAT') AND lower(coalesce(prenom,''))=lower('Rabih') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGS_AGC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DE MICHELE') AND lower(coalesce(prenom,''))=lower('Angelo Giuseppe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGS_AGC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOUNOU') AND lower(coalesce(prenom,''))=lower('Abdelhafid') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSAM'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CARLETTI') AND lower(coalesce(prenom,''))=lower('Florence') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGMJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VANCUTSEM') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGMJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PIPERS') AND lower(coalesce(prenom,''))=lower('Chris') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGMJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SOORS') AND lower(coalesce(prenom,''))=lower('Aurore') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGMJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CYIMENA') AND lower(coalesce(prenom,''))=lower('Emile') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AGMJ'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DANG NGOC') AND lower(coalesce(prenom,''))=lower('Thomas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_MON_ESPACE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('AAMLAOUI') AND lower(coalesce(prenom,''))=lower('Sofian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_MON_ESPACE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('YEMLAHI CHAER') AND lower(coalesce(prenom,''))=lower('Mariem') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'manager'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BENGHANAM') AND lower(coalesce(prenom,''))=lower('Abde Rahman') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DURET') AND lower(coalesce(prenom,''))=lower('Hugo') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LALOUX') AND lower(coalesce(prenom,''))=lower('Olivier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PAGNIEAU') AND lower(coalesce(prenom,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DAWAGNE') AND lower(coalesce(prenom,''))=lower('Florence') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BAUDOUIN') AND lower(coalesce(prenom,''))=lower('Aline') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ARABIA') AND lower(coalesce(prenom,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SLAEDTS') AND lower(coalesce(prenom,''))=lower('Mathieu') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JOERTZ') AND lower(coalesce(prenom,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MICHEL') AND lower(coalesce(prenom,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TRANSVERSAL'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('RAES') AND lower(coalesce(prenom,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AEF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HOTAK') AND lower(coalesce(prenom,''))=lower('Faisal') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_AEF'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BRANCART') AND lower(coalesce(prenom,''))=lower('Jerry') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SOL_ACQ'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DUTERME') AND lower(coalesce(prenom,''))=lower('Fabian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ERP'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('EL JASOULI') AND lower(coalesce(prenom,''))=lower('Sidi Mohamed') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JAMART') AND lower(coalesce(prenom,''))=lower('Cécile') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MATHUES') AND lower(coalesce(prenom,''))=lower('Annick') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ONDERBEKE') AND lower(coalesce(prenom,''))=lower('Jean-Claude') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROUSSEL') AND lower(coalesce(prenom,''))=lower('Dominique') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SWAELENS') AND lower(coalesce(prenom,''))=lower('Fabian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PLOVIE') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VANSWEEVELT') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ARS') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('WYCKAERT') AND lower(coalesce(prenom,''))=lower('Jérémie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CRICKX') AND lower(coalesce(prenom,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SAP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HARMATI') AND lower(coalesce(prenom,''))=lower('Kévin') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DGI_PROGIBAT'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PAULET') AND lower(coalesce(prenom,''))=lower('Cyril') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SIRH'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DAVREUX') AND lower(coalesce(prenom,''))=lower('Julian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eGOV'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DUBIE') AND lower(coalesce(prenom,''))=lower('Dimitri') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GED'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FERRERO') AND lower(coalesce(prenom,''))=lower('Ezequiel') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GED'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SCHAILLIE') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GED'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CUYPERS') AND lower(coalesce(prenom,''))=lower('Valérian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GED'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MAKRAI') AND lower(coalesce(prenom,''))=lower('Yassin') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_GED'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BENALI') AND lower(coalesce(prenom,''))=lower('Abdelkader') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SIMPLIF_ADM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('WILLEM') AND lower(coalesce(prenom,''))=lower('Augustin') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SIMPLIF_ADM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NEVEN') AND lower(coalesce(prenom,''))=lower('Simon') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SIMPLIF_ADM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEFRAENE') AND lower(coalesce(prenom,''))=lower('Adrien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SIMPLIF_ADM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEGLAS') AND lower(coalesce(prenom,''))=lower('Thomas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SIMPLIF_ADM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LAMBERT') AND lower(coalesce(prenom,''))=lower('Valery') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SUBSIDES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TONGRES') AND lower(coalesce(prenom,''))=lower('Florian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SUBSIDES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LADON') AND lower(coalesce(prenom,''))=lower('Anthony') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SUBSIDES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PISSENS') AND lower(coalesce(prenom,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MICHEL') AND lower(coalesce(prenom,''))=lower('Marc') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('EL HAKYM') AND lower(coalesce(prenom,''))=lower('Khalid') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GILLES') AND lower(coalesce(prenom,''))=lower('Olivier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('IYAKAREMYE') AND lower(coalesce(prenom,''))=lower('Noël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LIVOLSI') AND lower(coalesce(prenom,''))=lower('Salvatore') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('WARNOTTE') AND lower(coalesce(prenom,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BIT') AND lower(coalesce(prenom,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MILO') AND lower(coalesce(prenom,''))=lower('Julien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GOVAERT') AND lower(coalesce(prenom,''))=lower('Simon') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DURIEUX') AND lower(coalesce(prenom,''))=lower('Valentin') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WEB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HERMES') AND lower(coalesce(prenom,''))=lower('Thibault') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DELCAMBE') AND lower(coalesce(prenom,''))=lower('Elodie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DA SILVA ARAUJO') AND lower(coalesce(prenom,''))=lower('David') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ALTARES MENENDEZ') AND lower(coalesce(prenom,''))=lower('Nathan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('WAUTHION') AND lower(coalesce(prenom,''))=lower('Eric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CARRETTE') AND lower(coalesce(prenom,''))=lower('Michaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MENDOZA GODOY') AND lower(coalesce(prenom,''))=lower('Diego') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GAVRIILIDIS') AND lower(coalesce(prenom,''))=lower('Alexandre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MOJUYE TOUKAM') AND lower(coalesce(prenom,''))=lower('Eunice Vianey') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TONDEUR') AND lower(coalesce(prenom,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_eLEARNING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MASSY') AND lower(coalesce(prenom,''))=lower('Stéphan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MINNENS') AND lower(coalesce(prenom,''))=lower('Christian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VAN ROMPU') AND lower(coalesce(prenom,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BILLEN') AND lower(coalesce(prenom,''))=lower('Laurent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LEFEVRE') AND lower(coalesce(prenom,''))=lower('Catherine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BAUDOUX') AND lower(coalesce(prenom,''))=lower('Rudy') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROCHEZ') AND lower(coalesce(prenom,''))=lower('Jean-Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_BI'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEFOURNY') AND lower(coalesce(prenom,''))=lower('Violaine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SID'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEPUYDT') AND lower(coalesce(prenom,''))=lower('Raphaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SID'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BARRIAN') AND lower(coalesce(prenom,''))=lower('Abdennabi') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SID'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DENY') AND lower(coalesce(prenom,''))=lower('Eric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SID'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('POTHIER') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_SID'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VERHEGGEN') AND lower(coalesce(prenom,''))=lower('Stephan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='DIV_TRANSVERSAL'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BERTIEAUX') AND lower(coalesce(prenom,''))=lower('Pierre-Paul') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_PS_PROJETS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEMOITIE') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LAURENT') AND lower(coalesce(prenom,''))=lower('Paul') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DUBOIS') AND lower(coalesce(prenom,''))=lower('Christophe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DUCHESNE') AND lower(coalesce(prenom,''))=lower('Françoise') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VIALE') AND lower(coalesce(prenom,''))=lower('Stefano') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHERPION') AND lower(coalesce(prenom,''))=lower('Yaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DUFRANE') AND lower(coalesce(prenom,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MESTRONE') AND lower(coalesce(prenom,''))=lower('Grégory') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MATHELART') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GUAZZO') AND lower(coalesce(prenom,''))=lower('Jean-Jacques') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_CDP'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DAL') AND lower(coalesce(prenom,''))=lower('Jean-Marc') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PSO'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DE PREZ') AND lower(coalesce(prenom,''))=lower('Laurence') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PSO'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NOWICKI-RAIKHLIN') AND lower(coalesce(prenom,''))=lower('Marion') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PSO'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BAILLET') AND lower(coalesce(prenom,''))=lower('Corinne') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PSO'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TONGRES') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_METHO'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NOSEDA') AND lower(coalesce(prenom,''))=lower('Anne') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_METHO'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MELIN') AND lower(coalesce(prenom,''))=lower('Michael') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALM_DEVOPS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('THYS') AND lower(coalesce(prenom,''))=lower('Johan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ALM_DEVOPS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MARTIN') AND lower(coalesce(prenom,''))=lower('Xavier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ARCHI_TECH'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('KOUAHOU YONGUE') AND lower(coalesce(prenom,''))=lower('Aubert') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ARCHI_TECH'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHOUSTOULAKIS') AND lower(coalesce(prenom,''))=lower('Charidimos') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ARCHI_TECH'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JOUREZ') AND lower(coalesce(prenom,''))=lower('Sylvian') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DESIGN_SYS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CASSAN') AND lower(coalesce(prenom,''))=lower('Anelita') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DESIGN_SYS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VELARDE GONZALEZ') AND lower(coalesce(prenom,''))=lower('Sandra') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ACCESSIBILITE'), 'membre'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MARSEILLE') AND lower(coalesce(prenom,''))=lower('Samuel') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ACCESSIBILITE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DE BACKER') AND lower(coalesce(prenom,''))=lower('Sophie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ACCESSIBILITE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BENDA') AND lower(coalesce(prenom,''))=lower('Joëlle') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_DONNEES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MALVOISIN') AND lower(coalesce(prenom,''))=lower('Jérôme') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_DONNEES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BERNARD') AND lower(coalesce(prenom,''))=lower('Bruno') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_DONNEES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VINCART') AND lower(coalesce(prenom,''))=lower('Stéphanie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_DONNEES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VIEIRA RAMOS') AND lower(coalesce(prenom,''))=lower('Alexandre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SOLLIMA') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MARKOWSKI') AND lower(coalesce(prenom,''))=lower('Jean-Marie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NDJOH EYOUM') AND lower(coalesce(prenom,''))=lower('Serge') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VAN LIERDE') AND lower(coalesce(prenom,''))=lower('Boris') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LUKASHEVICH') AND lower(coalesce(prenom,''))=lower('Violetta') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BEN KHALFALLAH') AND lower(coalesce(prenom,''))=lower('Aymen') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TESTS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SERVAIS') AND lower(coalesce(prenom,''))=lower('Laurent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SECURITE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BEN ABDESLEM') AND lower(coalesce(prenom,''))=lower('Jamal') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PROD_SEC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHALTIN') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PROD_SEC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MARCHANT') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PROD_SEC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MAGIS') AND lower(coalesce(prenom,''))=lower('Tom') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PROD_SEC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GASPARD') AND lower(coalesce(prenom,''))=lower('Renaud') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_PROD_SEC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEGOLS') AND lower(coalesce(prenom,''))=lower('Thierry') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TAR'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TELLIER') AND lower(coalesce(prenom,''))=lower('Serge') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_IAM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('COSTABEBER') AND lower(coalesce(prenom,''))=lower('Michaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_IAM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LEONARD') AND lower(coalesce(prenom,''))=lower('Philippe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_IAM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHAMBERT') AND lower(coalesce(prenom,''))=lower('Yann') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_IAM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ADLINE') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_IAM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PAUWELS') AND lower(coalesce(prenom,''))=lower('Stephan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_IAM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BODSON') AND lower(coalesce(prenom,''))=lower('Marc') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_ITIL'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JOIRET') AND lower(coalesce(prenom,''))=lower('Julien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ITSM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('RASQUIN') AND lower(coalesce(prenom,''))=lower('Sabine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ITSM'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VANOYCKE') AND lower(coalesce(prenom,''))=lower('Cédric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ITIL_PROC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PIERRE-LOUIS') AND lower(coalesce(prenom,''))=lower('Alix') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ITIL_PROC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('STIENS') AND lower(coalesce(prenom,''))=lower('Laurent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ITIL_PROC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('RASSART') AND lower(coalesce(prenom,''))=lower('Julien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ITIL_PROC'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('KOUAHOU YONGUE') AND lower(coalesce(prenom,''))=lower('Aubert') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_MONITORING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JELTI') AND lower(coalesce(prenom,''))=lower('Souad') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_MONITORING'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('EL GHANASSY') AND lower(coalesce(prenom,''))=lower('Nawal') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOILAN') AND lower(coalesce(prenom,''))=lower('Jérémie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOURGEOIS') AND lower(coalesce(prenom,''))=lower('Adrien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('AHRIKA') AND lower(coalesce(prenom,''))=lower('Soufiane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CAPUTO') AND lower(coalesce(prenom,''))=lower('Laurent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JEURISSEN') AND lower(coalesce(prenom,''))=lower('Geoffrey') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PIRMEZ') AND lower(coalesce(prenom,''))=lower('Géry') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('NICAISE') AND lower(coalesce(prenom,''))=lower('Thomas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ONAY') AND lower(coalesce(prenom,''))=lower('Ayse') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ALMANZAR FERNANDEZ') AND lower(coalesce(prenom,''))=lower('David') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('METTENS') AND lower(coalesce(prenom,''))=lower('Quentin') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('EL BOUBSI') AND lower(coalesce(prenom,''))=lower('Salma') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MINAZZI') AND lower(coalesce(prenom,''))=lower('Paolo') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BOUTINZITE') AND lower(coalesce(prenom,''))=lower('Larbi') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('YAHTIT') AND lower(coalesce(prenom,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVICEDESK'), 'membre'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('PONSELET') AND lower(coalesce(prenom,''))=lower('André') LIMIT 1), (SELECT id FROM centres_competences WHERE code='DIV_INFRA'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('KOENIG') AND lower(coalesce(prenom,''))=lower('Philippe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='DIV_INFRA'), 'conseiller'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MATHOT') AND lower(coalesce(prenom,''))=lower('Valérie') LIMIT 1), (SELECT id FROM centres_competences WHERE code='DIV_INFRA'), 'analyste'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROUWEZ') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_SERVEURS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GHOUL') AND lower(coalesce(prenom,''))=lower('Mounir') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_INFRA_SRV'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GRANDJEAN') AND lower(coalesce(prenom,''))=lower('Bastien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_INFRA_SRV'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GHYSSELS') AND lower(coalesce(prenom,''))=lower('Cédric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_INFRA_SRV'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BRIDOUX') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WINDOWS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CROISELET') AND lower(coalesce(prenom,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WINDOWS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FALQUE') AND lower(coalesce(prenom,''))=lower('Patrick') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WINDOWS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FERNANDEZ') AND lower(coalesce(prenom,''))=lower('Xavier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WINDOWS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('SERBANESCU') AND lower(coalesce(prenom,''))=lower('Andreï') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WINDOWS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEWAILLY') AND lower(coalesce(prenom,''))=lower('Jean') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WINDOWS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DEVIS') AND lower(coalesce(prenom,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_LINUX'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HOUSNI') AND lower(coalesce(prenom,''))=lower('Abdellatif') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_LINUX'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LAMBERT') AND lower(coalesce(prenom,''))=lower('Cliff') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_LINUX'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('MOSTENNE') AND lower(coalesce(prenom,''))=lower('Patrick') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_LINUX'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BONGARTZ') AND lower(coalesce(prenom,''))=lower('Michaël') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_LINUX'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('KERSTENS') AND lower(coalesce(prenom,''))=lower('Gaëtan') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_LINUX'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('STINGLHAMBER') AND lower(coalesce(prenom,''))=lower('Grégory') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_MIDDLEWARE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CHARLET') AND lower(coalesce(prenom,''))=lower('Laurent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('JEUNIAUX') AND lower(coalesce(prenom,''))=lower('Olivier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('FONTAINE') AND lower(coalesce(prenom,''))=lower('Olivier') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROGGEMANS') AND lower(coalesce(prenom,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_DB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VANDE PITTE') AND lower(coalesce(prenom,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WAS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GOURMAND') AND lower(coalesce(prenom,''))=lower('Frederic') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_WAS'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BAKKALI') AND lower(coalesce(prenom,''))=lower('Hicham') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ESB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('TRICHA') AND lower(coalesce(prenom,''))=lower('Amine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_ESB'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ROUWEZ') AND lower(coalesce(prenom,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_TELECOM'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('AARAB') AND lower(coalesce(prenom,''))=lower('Nabil') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TELEPHONIE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ANTOINE') AND lower(coalesce(prenom,''))=lower('Romain') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TELEPHONIE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GOSSET') AND lower(coalesce(prenom,''))=lower('Valéry') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TELEPHONIE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BERTRAND') AND lower(coalesce(prenom,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TELEPHONIE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('CONSTANT') AND lower(coalesce(prenom,''))=lower('Simon') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_TELEPHONIE'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('RHAITI') AND lower(coalesce(prenom,''))=lower('Azzeddine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_RESEAU'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DIALLO') AND lower(coalesce(prenom,''))=lower('Mamadou') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_RESEAU'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VINCENT') AND lower(coalesce(prenom,''))=lower('Yannick') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_RESEAU'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HAMRANI') AND lower(coalesce(prenom,''))=lower('Younes') LIMIT 1), (SELECT id FROM centres_competences WHERE code='EQ_RESEAU'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('WILLOCQ') AND lower(coalesce(prenom,''))=lower('Philippe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_PRODUCTION'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('GILLARD') AND lower(coalesce(prenom,''))=lower('Pierre') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_PRODUCTION'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HOFMAN') AND lower(coalesce(prenom,''))=lower('Ingrid') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_PRODUCTION'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('WILLOCQ') AND lower(coalesce(prenom,''))=lower('Philippe') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_MAINFRAME'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ANSION') AND lower(coalesce(prenom,''))=lower('Alain') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_MAINFRAME'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BLONDIAUX') AND lower(coalesce(prenom,''))=lower('Denis') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_MAINFRAME'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('HOST') AND lower(coalesce(prenom,''))=lower('Michel') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_MAINFRAME'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LEMMENS') AND lower(coalesce(prenom,''))=lower('Pascal') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ADAM') AND lower(coalesce(prenom,''))=lower('Antoine') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('ADAM') AND lower(coalesce(prenom,''))=lower('Vincent') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('BROUEZ') AND lower(coalesce(prenom,''))=lower('Benjamen') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('DENIS') AND lower(coalesce(prenom,''))=lower('Damien') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO contact_memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(nom)=lower('LUTZ') AND lower(coalesce(prenom,''))=lower('Steeve') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('VANDENBROECK') AND lower(coalesce(prenom,''))=lower('Dimitri') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role),
  ((SELECT id FROM contacts WHERE lower(nom)=lower('COCKELAERE') AND lower(coalesce(prenom,''))=lower('Mathias') LIMIT 1), (SELECT id FROM centres_competences WHERE code='CC_POSTES'), 'membre'::membership_role)
ON CONFLICT DO NOTHING;

COMMIT;

-- Récap
SELECT '✅ Organigramme ETNIC seed 002 appliqué' AS status;
SELECT niveau, COUNT(*) AS nb FROM centres_competences GROUP BY niveau ORDER BY niveau;
SELECT COUNT(*) AS total_contacts FROM contacts;
SELECT COUNT(*) AS total_memberships FROM contact_memberships;
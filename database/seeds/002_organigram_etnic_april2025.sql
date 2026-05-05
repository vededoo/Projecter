-- Seed 002: ETNIC Organigram April 2025 (full hierarchy + contacts)
-- Source: /Shared/templates/projecter-samples/Organigramme avril 2025.pdf
-- ============================================================
BEGIN;

-- Phase 1: competency centers (no parent/manager FK yet)
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('DG_IT', 'Direction Générale IT', 'DG IT', 'dg', TRUE, 0, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CELL_APPUI', 'Cellule d''appui', 'DG IT', 'division', FALSE, 1, 'Christian DEGUELDRE = Expert Advisor')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CONS_TACT', 'Tactical Advisor', 'DG IT', 'division', FALSE, 2, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('DIV_DEV', 'Development', 'DG IT', 'division', FALSE, 3, 'Manager TBD')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_AF', 'cc. Functional Analysis', 'DG IT', 'cc', FALSE, 4, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_TR_ENS', 'TR-ENS', 'DG IT', 'team', FALSE, 5, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_AUTRES_AF', 'OTHERS', 'DG IT', 'team', FALSE, 6, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_SOL_MES', 'cc. Custom Solutions', 'DG IT', 'cc', FALSE, 7, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ERIS', 'ERIS', 'DG IT', 'team', FALSE, 8, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_eDEV', 'eDEV', 'DG IT', 'subteam', FALSE, 9, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_GESTE', 'GESTE', 'DG IT', 'subteam', FALSE, 10, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ETE', 'ETE', 'DG IT', 'subteam', FALSE, 11, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ARES_WBE', 'ARES/WBE', 'DG IT', 'subteam', FALSE, 12, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_EP5', 'EP5', 'DG IT', 'team', FALSE, 13, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_GESPER', 'GESPER', 'DG IT', 'subteam', FALSE, 14, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ALIEN_AUT', 'ALIEN OTHERS', 'DG IT', 'subteam', FALSE, 15, 'Andras KOVACS detached to Transversal until April 21')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_CAROS', 'CAROS', 'DG IT', 'team', FALSE, 16, 'Manager TBD')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ONE', 'ONE', 'DG IT', 'subteam', FALSE, 17, 'Thierry MASSENAUX detached to Transversal')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_AGAJ_IMAJ', 'AGAJ/IMAJ', 'DG IT', 'subteam', FALSE, 18, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_AGS_AGC', 'AGS/AGC', 'DG IT', 'subteam', FALSE, 19, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_TRANSAM', 'TRANSAM', 'DG IT', 'team', FALSE, 20, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_AGMJ', 'AGMJ', 'DG IT', 'subteam', FALSE, 21, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_MON_ESPACE', 'MON ESPACE', 'DG IT', 'subteam', FALSE, 22, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_TRANSVERSAL', 'TRANSVERSAL', 'DG IT', 'subteam', FALSE, 23, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_AEF', 'AEF', 'DG IT', 'subteam', FALSE, 24, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_SOL_ACQ', 'cc. Acquired Solutions', 'DG IT', 'cc', FALSE, 25, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ERP', 'ERP', 'DG IT', 'team', FALSE, 26, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_SAP', 'SAP', 'DG IT', 'subteam', FALSE, 27, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_DGI_PROGIBAT', 'DGI / PROGIBAT', 'DG IT', 'subteam', FALSE, 28, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_SIRH', 'SIRH', 'DG IT', 'subteam', FALSE, 29, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_eGOV', 'e-GOV', 'DG IT', 'team', FALSE, 30, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_GED', 'GED', 'DG IT', 'subteam', FALSE, 31, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_SIMPLIF_ADM', 'ADMINISTRATIVE SIMPLIFICATION', 'DG IT', 'subteam', FALSE, 32, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_SUBSIDES', 'SUBSIDIES', 'DG IT', 'subteam', FALSE, 33, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_WEB', 'WEB', 'DG IT', 'subteam', FALSE, 34, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_eLEARNING', 'e-LEARNING', 'DG IT', 'team', FALSE, 35, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_BI', 'cc. BI', 'DG IT', 'cc', FALSE, 36, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_SID', 'SID', 'DG IT', 'team', FALSE, 37, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('DIV_TRANSVERSAL', 'Transversal IT', 'DG IT', 'division', FALSE, 38, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_PS_PROJETS', 'cc. Project Steering & Support', 'DG IT', 'cc', FALSE, 39, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_CDP', 'Project Managers', 'DG IT', 'team', FALSE, 40, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_PSO', 'PSO', 'DG IT', 'team', FALSE, 41, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_METHO', 'cc. Methodology, Standards & Technical Architecture', 'DG IT', 'cc', FALSE, 42, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ALM_DEVOPS', 'ALM/DevOps', 'DG IT', 'team', FALSE, 43, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ARCHI_TECH', 'Technical Architecture', 'DG IT', 'team', FALSE, 44, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_DESIGN_SYS', 'Design System', 'DG IT', 'team', FALSE, 45, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ACCESSIBILITE', 'Digital Accessibility', 'DG IT', 'team', FALSE, 46, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_DONNEES', 'cc. Data', 'DG IT', 'cc', FALSE, 47, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_TESTS', 'cc. Tests', 'DG IT', 'cc', FALSE, 48, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_SECURITE', 'cc. Security', 'DG IT', 'cc', FALSE, 49, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_PROD_SEC', 'Security Products & Services', 'DG IT', 'team', FALSE, 50, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_TAR', 'TAR', 'DG IT', 'team', FALSE, 51, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_IAM', 'IAM', 'DG IT', 'team', FALSE, 52, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_ITIL', 'cc. ITIL & Monitoring', 'DG IT', 'cc', FALSE, 53, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ITSM', 'ITSM', 'DG IT', 'team', FALSE, 54, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ITIL_PROC', 'ITIL - process', 'DG IT', 'team', FALSE, 55, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_MONITORING', 'Monitoring', 'DG IT', 'team', FALSE, 56, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_SERVICEDESK', 'cc. Service Desk', 'DG IT', 'cc', FALSE, 57, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('DIV_INFRA', 'Infrastructure', 'DG IT', 'division', FALSE, 58, 'Philippe KOENIG = Technical Advisor ; Valérie MATHOT = Infrastructure Analyst')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_SERVEURS', 'cc. Servers', 'DG IT', 'cc', TRUE, 59, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_INFRA_SRV', 'Infrastructure', 'DG IT', 'team', FALSE, 60, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_WINDOWS', 'Windows', 'DG IT', 'team', FALSE, 61, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_LINUX', 'Linux', 'DG IT', 'team', FALSE, 62, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_MIDDLEWARE', 'cc. Middleware', 'DG IT', 'cc', FALSE, 63, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_DB', 'DB', 'DG IT', 'team', FALSE, 64, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_WAS', 'Web App Server', 'DG IT', 'team', FALSE, 65, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_ESB', 'ESB', 'DG IT', 'team', FALSE, 66, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_TELECOM', 'cc. Telecom', 'DG IT', 'cc', TRUE, 67, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_TELEPHONIE', 'Telephony', 'DG IT', 'team', FALSE, 68, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('EQ_RESEAU', 'Network', 'DG IT', 'team', FALSE, 69, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_PRODUCTION', 'cc. Production', 'DG IT', 'cc', TRUE, 70, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_MAINFRAME', 'cc. Mainframe', 'DG IT', 'cc', FALSE, 71, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;
INSERT INTO competency_centers (code, label, department, level, is_interim, display_order, notes) VALUES
  ('CC_POSTES', 'cc. Workstations', 'DG IT', 'cc', FALSE, 72, NULL)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  is_interim = EXCLUDED.is_interim,
  display_order = EXCLUDED.display_order,
  notes = EXCLUDED.notes;

-- Phase 2: parent links
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DG_IT') WHERE code = 'CELL_APPUI';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DG_IT') WHERE code = 'CONS_TACT';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DG_IT') WHERE code = 'DIV_DEV';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_DEV') WHERE code = 'CC_AF';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_AF') WHERE code = 'EQ_TR_ENS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_AF') WHERE code = 'EQ_AUTRES_AF';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_DEV') WHERE code = 'CC_SOL_MES';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_ERIS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERIS') WHERE code = 'EQ_eDEV';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERIS') WHERE code = 'EQ_GESTE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERIS') WHERE code = 'EQ_ETE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERIS') WHERE code = 'EQ_ARES_WBE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_EP5';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_EP5') WHERE code = 'EQ_GESPER';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_EP5') WHERE code = 'EQ_ALIEN_AUT';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_CAROS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_CAROS') WHERE code = 'EQ_ONE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_CAROS') WHERE code = 'EQ_AGAJ_IMAJ';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_CAROS') WHERE code = 'EQ_AGS_AGC';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_MES') WHERE code = 'EQ_TRANSAM';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_AGMJ';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_MON_ESPACE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_TRANSVERSAL';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_TRANSAM') WHERE code = 'EQ_AEF';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_DEV') WHERE code = 'CC_SOL_ACQ';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_ACQ') WHERE code = 'EQ_ERP';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERP') WHERE code = 'EQ_SAP';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERP') WHERE code = 'EQ_DGI_PROGIBAT';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_ERP') WHERE code = 'EQ_SIRH';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_ACQ') WHERE code = 'EQ_eGOV';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_eGOV') WHERE code = 'EQ_GED';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_eGOV') WHERE code = 'EQ_SIMPLIF_ADM';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_eGOV') WHERE code = 'EQ_SUBSIDES';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'EQ_eGOV') WHERE code = 'EQ_WEB';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SOL_ACQ') WHERE code = 'EQ_eLEARNING';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_DEV') WHERE code = 'CC_BI';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_BI') WHERE code = 'EQ_SID';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DG_IT') WHERE code = 'DIV_TRANSVERSAL';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_PS_PROJETS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_PS_PROJETS') WHERE code = 'EQ_CDP';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_PS_PROJETS') WHERE code = 'EQ_PSO';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_METHO';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_METHO') WHERE code = 'EQ_ALM_DEVOPS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_METHO') WHERE code = 'EQ_ARCHI_TECH';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_METHO') WHERE code = 'EQ_DESIGN_SYS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_METHO') WHERE code = 'EQ_ACCESSIBILITE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_DONNEES';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_TESTS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_SECURITE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SECURITE') WHERE code = 'EQ_PROD_SEC';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SECURITE') WHERE code = 'EQ_TAR';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SECURITE') WHERE code = 'EQ_IAM';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_ITIL';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_ITIL') WHERE code = 'EQ_ITSM';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_ITIL') WHERE code = 'EQ_ITIL_PROC';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_ITIL') WHERE code = 'EQ_MONITORING';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_TRANSVERSAL') WHERE code = 'CC_SERVICEDESK';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DG_IT') WHERE code = 'DIV_INFRA';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_INFRA') WHERE code = 'CC_SERVEURS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SERVEURS') WHERE code = 'EQ_INFRA_SRV';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SERVEURS') WHERE code = 'EQ_WINDOWS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_SERVEURS') WHERE code = 'EQ_LINUX';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_INFRA') WHERE code = 'CC_MIDDLEWARE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_MIDDLEWARE') WHERE code = 'EQ_DB';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_MIDDLEWARE') WHERE code = 'EQ_WAS';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_MIDDLEWARE') WHERE code = 'EQ_ESB';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_INFRA') WHERE code = 'CC_TELECOM';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_TELECOM') WHERE code = 'EQ_TELEPHONIE';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'CC_TELECOM') WHERE code = 'EQ_RESEAU';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_INFRA') WHERE code = 'CC_PRODUCTION';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_INFRA') WHERE code = 'CC_MAINFRAME';
UPDATE competency_centers SET parent_id = (SELECT id FROM competency_centers WHERE code = 'DIV_INFRA') WHERE code = 'CC_POSTES';

-- Phase 3: ETNIC contacts (insert if missing)
WITH etnic AS (SELECT id FROM organizations WHERE code = 'ETNIC')
INSERT INTO contacts (last_name, first_name, organization_id) VALUES
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
ON CONFLICT (lower(last_name), lower(coalesce(first_name,'')), coalesce(organization_id,0)) DO NOTHING;

-- Phase 4: assign managers to CCs
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('VERHEGGEN') AND lower(coalesce(first_name,'')) = lower('Stephan') LIMIT 1) WHERE code = 'DG_IT';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('PATART') AND lower(coalesce(first_name,'')) = lower('Alexandre') LIMIT 1) WHERE code = 'CONS_TACT';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('SCHILTZ') AND lower(coalesce(first_name,'')) = lower('Sébastien') LIMIT 1) WHERE code = 'CC_AF';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('MATHY') AND lower(coalesce(first_name,'')) = lower('Vincent') LIMIT 1) WHERE code = 'EQ_TR_ENS';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('ANGENOT') AND lower(coalesce(first_name,'')) = lower('Arnaud') LIMIT 1) WHERE code = 'EQ_AUTRES_AF';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('DELPORTE') AND lower(coalesce(first_name,'')) = lower('Marc') LIMIT 1) WHERE code = 'CC_SOL_MES';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('GLOWACKI') AND lower(coalesce(first_name,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'EQ_ERIS';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('CAUDRON') AND lower(coalesce(first_name,'')) = lower('Sébastien') LIMIT 1) WHERE code = 'EQ_GESTE';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('PHOLSENA') AND lower(coalesce(first_name,'')) = lower('Phonenarinh') LIMIT 1) WHERE code = 'EQ_ETE';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('NERINCKX') AND lower(coalesce(first_name,'')) = lower('Fabrice') LIMIT 1) WHERE code = 'EQ_EP5';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('VELASCO ESPEJO') AND lower(coalesce(first_name,'')) = lower('Sofia') LIMIT 1) WHERE code = 'EQ_ALIEN_AUT';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('BORILE') AND lower(coalesce(first_name,'')) = lower('Loris') LIMIT 1) WHERE code = 'EQ_ONE';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('MARZOUK') AND lower(coalesce(first_name,'')) = lower('Mounir') LIMIT 1) WHERE code = 'EQ_AGS_AGC';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('BOUNOU') AND lower(coalesce(first_name,'')) = lower('Abdelhafid') LIMIT 1) WHERE code = 'EQ_TRANSAM';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('YEMLAHI CHAER') AND lower(coalesce(first_name,'')) = lower('Mariem') LIMIT 1) WHERE code = 'EQ_TRANSVERSAL';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('BRANCART') AND lower(coalesce(first_name,'')) = lower('Jerry') LIMIT 1) WHERE code = 'CC_SOL_ACQ';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('DUTERME') AND lower(coalesce(first_name,'')) = lower('Fabian') LIMIT 1) WHERE code = 'EQ_ERP';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('DAVREUX') AND lower(coalesce(first_name,'')) = lower('Julian') LIMIT 1) WHERE code = 'EQ_eGOV';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('DUBIE') AND lower(coalesce(first_name,'')) = lower('Dimitri') LIMIT 1) WHERE code = 'EQ_GED';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('LAMBERT') AND lower(coalesce(first_name,'')) = lower('Valery') LIMIT 1) WHERE code = 'EQ_SUBSIDES';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('PISSENS') AND lower(coalesce(first_name,'')) = lower('Sébastien') LIMIT 1) WHERE code = 'EQ_WEB';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('HERMES') AND lower(coalesce(first_name,'')) = lower('Thibault') LIMIT 1) WHERE code = 'EQ_eLEARNING';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('MASSY') AND lower(coalesce(first_name,'')) = lower('Stéphan') LIMIT 1) WHERE code = 'CC_BI';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('DEFOURNY') AND lower(coalesce(first_name,'')) = lower('Violaine') LIMIT 1) WHERE code = 'EQ_SID';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('VERHEGGEN') AND lower(coalesce(first_name,'')) = lower('Stephan') LIMIT 1) WHERE code = 'DIV_TRANSVERSAL';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('BERTIEAUX') AND lower(coalesce(first_name,'')) = lower('Pierre-Paul') LIMIT 1) WHERE code = 'CC_PS_PROJETS';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('TONGRES') AND lower(coalesce(first_name,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'CC_METHO';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('BENDA') AND lower(coalesce(first_name,'')) = lower('Joëlle') LIMIT 1) WHERE code = 'CC_DONNEES';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('VIEIRA RAMOS') AND lower(coalesce(first_name,'')) = lower('Alexandre') LIMIT 1) WHERE code = 'CC_TESTS';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('SERVAIS') AND lower(coalesce(first_name,'')) = lower('Laurent') LIMIT 1) WHERE code = 'CC_SECURITE';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('BODSON') AND lower(coalesce(first_name,'')) = lower('Marc') LIMIT 1) WHERE code = 'CC_ITIL';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('EL GHANASSY') AND lower(coalesce(first_name,'')) = lower('Nawal') LIMIT 1) WHERE code = 'CC_SERVICEDESK';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('PONSELET') AND lower(coalesce(first_name,'')) = lower('André') LIMIT 1) WHERE code = 'DIV_INFRA';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('ROUWEZ') AND lower(coalesce(first_name,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'CC_SERVEURS';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('STINGLHAMBER') AND lower(coalesce(first_name,'')) = lower('Grégory') LIMIT 1) WHERE code = 'CC_MIDDLEWARE';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('ROUWEZ') AND lower(coalesce(first_name,'')) = lower('Stéphane') LIMIT 1) WHERE code = 'CC_TELECOM';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('WILLOCQ') AND lower(coalesce(first_name,'')) = lower('Philippe') LIMIT 1) WHERE code = 'CC_PRODUCTION';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('WILLOCQ') AND lower(coalesce(first_name,'')) = lower('Philippe') LIMIT 1) WHERE code = 'CC_MAINFRAME';
UPDATE competency_centers SET manager_contact_id = (SELECT id FROM contacts WHERE lower(last_name) = lower('LEMMENS') AND lower(coalesce(first_name,'')) = lower('Pascal') LIMIT 1) WHERE code = 'CC_POSTES';

-- Phase 5: contact <-> CC memberships
DELETE FROM memberships;  -- idempotent reset for this seed
INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VERHEGGEN') AND lower(coalesce(first_name,''))=lower('Stephan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='DG_IT'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MOURETTE') AND lower(coalesce(first_name,''))=lower('Aurore') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CELL_APPUI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FALZONE') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CELL_APPUI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEGUELDRE') AND lower(coalesce(first_name,''))=lower('Christian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CELL_APPUI'), 'advisor'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PATART') AND lower(coalesce(first_name,''))=lower('Alexandre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CONS_TACT'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SCHILTZ') AND lower(coalesce(first_name,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_AF'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MATHY') AND lower(coalesce(first_name,''))=lower('Vincent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MARQUET') AND lower(coalesce(first_name,''))=lower('David') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BUREAU') AND lower(coalesce(first_name,''))=lower('Catherine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GOFFINET') AND lower(coalesce(first_name,''))=lower('Yves') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROUXHET') AND lower(coalesce(first_name,''))=lower('Patrick') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('COGELS') AND lower(coalesce(first_name,''))=lower('Dorothée') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GENTILI') AND lower(coalesce(first_name,''))=lower('Luca') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HAMDI') AND lower(coalesce(first_name,''))=lower('Aissam') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DE BACKER') AND lower(coalesce(first_name,''))=lower('Lina') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TR_ENS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ANGENOT') AND lower(coalesce(first_name,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AUTRES_AF'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HOYOIS') AND lower(coalesce(first_name,''))=lower('Jenny') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AUTRES_AF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MANAD') AND lower(coalesce(first_name,''))=lower('Abdelhadi') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AUTRES_AF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ZULU KILO') AND lower(coalesce(first_name,''))=lower('Didier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AUTRES_AF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('KARRAWA BEMBIADE') AND lower(coalesce(first_name,''))=lower('Sandra') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AUTRES_AF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('REGA') AND lower(coalesce(first_name,''))=lower('Carine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AUTRES_AF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DELPORTE') AND lower(coalesce(first_name,''))=lower('Marc') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SOL_MES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GLOWACKI') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ERIS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHAHBOUNI') AND lower(coalesce(first_name,''))=lower('Soufiane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eDEV'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FREGER') AND lower(coalesce(first_name,''))=lower('Thomas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eDEV'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CAUDRON') AND lower(coalesce(first_name,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOON') AND lower(coalesce(first_name,''))=lower('Alexis') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PLANCQ') AND lower(coalesce(first_name,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VAZQUEZ FREIRE') AND lower(coalesce(first_name,''))=lower('Raphaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOUZIANE') AND lower(coalesce(first_name,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('IDES') AND lower(coalesce(first_name,''))=lower('Loup') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SEQUEIRA GUIMARAES') AND lower(coalesce(first_name,''))=lower('Paulo Leandro') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MOULILA') AND lower(coalesce(first_name,''))=lower('Younes') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HOTEITE') AND lower(coalesce(first_name,''))=lower('Rami') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ELBAZZOUNA') AND lower(coalesce(first_name,''))=lower('Anas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LURDE') AND lower(coalesce(first_name,''))=lower('Vincent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LEMAIRE') AND lower(coalesce(first_name,''))=lower('Fabienne') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('COUROUPPE') AND lower(coalesce(first_name,''))=lower('Olivier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESTE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PHOLSENA') AND lower(coalesce(first_name,''))=lower('Phonenarinh') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LADURON') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NOËL') AND lower(coalesce(first_name,''))=lower('Guy') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SCHMIDT') AND lower(coalesce(first_name,''))=lower('Emmanuel') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CALBEAU') AND lower(coalesce(first_name,''))=lower('Aude') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FARRAPA PINGUINHAS') AND lower(coalesce(first_name,''))=lower('Lucas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PETIT') AND lower(coalesce(first_name,''))=lower('Jean-François') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BAY') AND lower(coalesce(first_name,''))=lower('Julien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ETE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MERRY') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ARES_WBE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NERINCKX') AND lower(coalesce(first_name,''))=lower('Fabrice') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_EP5'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BARBIAUX') AND lower(coalesce(first_name,''))=lower('Aline') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BARS') AND lower(coalesce(first_name,''))=lower('Zekerija') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOUZROUTI') AND lower(coalesce(first_name,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HANS') AND lower(coalesce(first_name,''))=lower('Michaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JORIS') AND lower(coalesce(first_name,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LEJEUNE') AND lower(coalesce(first_name,''))=lower('Vincent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROSCA') AND lower(coalesce(first_name,''))=lower('Gabriela') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SOHY') AND lower(coalesce(first_name,''))=lower('Patrice') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VAN DEN HOVE') AND lower(coalesce(first_name,''))=lower('Alain') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TUDOSE') AND lower(coalesce(first_name,''))=lower('Alina') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('REGNIER') AND lower(coalesce(first_name,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DE LANDSHEER') AND lower(coalesce(first_name,''))=lower('Thierry') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('AZNAG') AND lower(coalesce(first_name,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VAN DAMME') AND lower(coalesce(first_name,''))=lower('Ryan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MELCHERS') AND lower(coalesce(first_name,''))=lower('Thomas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CORIJN') AND lower(coalesce(first_name,''))=lower('Benoit') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GESPER'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VELASCO ESPEJO') AND lower(coalesce(first_name,''))=lower('Sofia') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('AMBRI') AND lower(coalesce(first_name,''))=lower('Abid') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GURNY') AND lower(coalesce(first_name,''))=lower('Olivier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LOUIS') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('REZETTE') AND lower(coalesce(first_name,''))=lower('Michèle') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SEDDA') AND lower(coalesce(first_name,''))=lower('Kevin') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DOUBLIER') AND lower(coalesce(first_name,''))=lower('Sami') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHERGUI') AND lower(coalesce(first_name,''))=lower('Ilias') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DELBEKE') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DARDENNE') AND lower(coalesce(first_name,''))=lower('Thomas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NGONGANG TCHOUMKEU') AND lower(coalesce(first_name,''))=lower('Gilles') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('KOVACS') AND lower(coalesce(first_name,''))=lower('Andras') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALIEN_AUT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BORILE') AND lower(coalesce(first_name,''))=lower('Loris') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ONE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MASSENAUX') AND lower(coalesce(first_name,''))=lower('Thierry') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ONE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FRANCESCANGELI') AND lower(coalesce(first_name,''))=lower('Joachim') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ONE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SAVE LARA') AND lower(coalesce(first_name,''))=lower('Luis') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ONE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DESFACHELLE') AND lower(coalesce(first_name,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGAJ_IMAJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEVRESSE') AND lower(coalesce(first_name,''))=lower('Malcolm') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGAJ_IMAJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NAVARRA') AND lower(coalesce(first_name,''))=lower('Gregory') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGAJ_IMAJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HEUNINCKX') AND lower(coalesce(first_name,''))=lower('Renaud') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGAJ_IMAJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('STRYKERS') AND lower(coalesce(first_name,''))=lower('Simon') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGAJ_IMAJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TOUDA LACHIRI') AND lower(coalesce(first_name,''))=lower('Anas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGAJ_IMAJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MARZOUK') AND lower(coalesce(first_name,''))=lower('Mounir') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGS_AGC'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HACHA') AND lower(coalesce(first_name,''))=lower('Raphael') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGS_AGC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NGUYEN') AND lower(coalesce(first_name,''))=lower('Michel Khanh') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGS_AGC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('OUEIDAT') AND lower(coalesce(first_name,''))=lower('Rabih') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGS_AGC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DE MICHELE') AND lower(coalesce(first_name,''))=lower('Angelo Giuseppe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGS_AGC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOUNOU') AND lower(coalesce(first_name,''))=lower('Abdelhafid') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSAM'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CARLETTI') AND lower(coalesce(first_name,''))=lower('Florence') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGMJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VANCUTSEM') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGMJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PIPERS') AND lower(coalesce(first_name,''))=lower('Chris') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGMJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SOORS') AND lower(coalesce(first_name,''))=lower('Aurore') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGMJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CYIMENA') AND lower(coalesce(first_name,''))=lower('Emile') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AGMJ'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DANG NGOC') AND lower(coalesce(first_name,''))=lower('Thomas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_MON_ESPACE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('AAMLAOUI') AND lower(coalesce(first_name,''))=lower('Sofian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_MON_ESPACE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('YEMLAHI CHAER') AND lower(coalesce(first_name,''))=lower('Mariem') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'manager'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BENGHANAM') AND lower(coalesce(first_name,''))=lower('Abde Rahman') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DURET') AND lower(coalesce(first_name,''))=lower('Hugo') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LALOUX') AND lower(coalesce(first_name,''))=lower('Olivier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PAGNIEAU') AND lower(coalesce(first_name,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DAWAGNE') AND lower(coalesce(first_name,''))=lower('Florence') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BAUDOUIN') AND lower(coalesce(first_name,''))=lower('Aline') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ARABIA') AND lower(coalesce(first_name,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SLAEDTS') AND lower(coalesce(first_name,''))=lower('Mathieu') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JOERTZ') AND lower(coalesce(first_name,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MICHEL') AND lower(coalesce(first_name,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TRANSVERSAL'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('RAES') AND lower(coalesce(first_name,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AEF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HOTAK') AND lower(coalesce(first_name,''))=lower('Faisal') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_AEF'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BRANCART') AND lower(coalesce(first_name,''))=lower('Jerry') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SOL_ACQ'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DUTERME') AND lower(coalesce(first_name,''))=lower('Fabian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ERP'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('EL JASOULI') AND lower(coalesce(first_name,''))=lower('Sidi Mohamed') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JAMART') AND lower(coalesce(first_name,''))=lower('Cécile') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MATHUES') AND lower(coalesce(first_name,''))=lower('Annick') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ONDERBEKE') AND lower(coalesce(first_name,''))=lower('Jean-Claude') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROUSSEL') AND lower(coalesce(first_name,''))=lower('Dominique') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SWAELENS') AND lower(coalesce(first_name,''))=lower('Fabian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PLOVIE') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VANSWEEVELT') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ARS') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('WYCKAERT') AND lower(coalesce(first_name,''))=lower('Jérémie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CRICKX') AND lower(coalesce(first_name,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SAP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HARMATI') AND lower(coalesce(first_name,''))=lower('Kévin') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DGI_PROGIBAT'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PAULET') AND lower(coalesce(first_name,''))=lower('Cyril') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SIRH'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DAVREUX') AND lower(coalesce(first_name,''))=lower('Julian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eGOV'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DUBIE') AND lower(coalesce(first_name,''))=lower('Dimitri') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GED'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FERRERO') AND lower(coalesce(first_name,''))=lower('Ezequiel') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GED'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SCHAILLIE') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GED'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CUYPERS') AND lower(coalesce(first_name,''))=lower('Valérian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GED'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MAKRAI') AND lower(coalesce(first_name,''))=lower('Yassin') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_GED'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BENALI') AND lower(coalesce(first_name,''))=lower('Abdelkader') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SIMPLIF_ADM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('WILLEM') AND lower(coalesce(first_name,''))=lower('Augustin') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SIMPLIF_ADM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NEVEN') AND lower(coalesce(first_name,''))=lower('Simon') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SIMPLIF_ADM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEFRAENE') AND lower(coalesce(first_name,''))=lower('Adrien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SIMPLIF_ADM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEGLAS') AND lower(coalesce(first_name,''))=lower('Thomas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SIMPLIF_ADM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LAMBERT') AND lower(coalesce(first_name,''))=lower('Valery') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SUBSIDES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TONGRES') AND lower(coalesce(first_name,''))=lower('Florian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SUBSIDES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LADON') AND lower(coalesce(first_name,''))=lower('Anthony') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SUBSIDES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PISSENS') AND lower(coalesce(first_name,''))=lower('Sébastien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MICHEL') AND lower(coalesce(first_name,''))=lower('Marc') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('EL HAKYM') AND lower(coalesce(first_name,''))=lower('Khalid') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GILLES') AND lower(coalesce(first_name,''))=lower('Olivier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('IYAKAREMYE') AND lower(coalesce(first_name,''))=lower('Noël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LIVOLSI') AND lower(coalesce(first_name,''))=lower('Salvatore') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('WARNOTTE') AND lower(coalesce(first_name,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BIT') AND lower(coalesce(first_name,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MILO') AND lower(coalesce(first_name,''))=lower('Julien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GOVAERT') AND lower(coalesce(first_name,''))=lower('Simon') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DURIEUX') AND lower(coalesce(first_name,''))=lower('Valentin') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WEB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HERMES') AND lower(coalesce(first_name,''))=lower('Thibault') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DELCAMBE') AND lower(coalesce(first_name,''))=lower('Elodie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DA SILVA ARAUJO') AND lower(coalesce(first_name,''))=lower('David') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ALTARES MENENDEZ') AND lower(coalesce(first_name,''))=lower('Nathan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('WAUTHION') AND lower(coalesce(first_name,''))=lower('Eric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CARRETTE') AND lower(coalesce(first_name,''))=lower('Michaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MENDOZA GODOY') AND lower(coalesce(first_name,''))=lower('Diego') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GAVRIILIDIS') AND lower(coalesce(first_name,''))=lower('Alexandre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MOJUYE TOUKAM') AND lower(coalesce(first_name,''))=lower('Eunice Vianey') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TONDEUR') AND lower(coalesce(first_name,''))=lower('Jonathan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_eLEARNING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MASSY') AND lower(coalesce(first_name,''))=lower('Stéphan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MINNENS') AND lower(coalesce(first_name,''))=lower('Christian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VAN ROMPU') AND lower(coalesce(first_name,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BILLEN') AND lower(coalesce(first_name,''))=lower('Laurent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LEFEVRE') AND lower(coalesce(first_name,''))=lower('Catherine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BAUDOUX') AND lower(coalesce(first_name,''))=lower('Rudy') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROCHEZ') AND lower(coalesce(first_name,''))=lower('Jean-Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_BI'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEFOURNY') AND lower(coalesce(first_name,''))=lower('Violaine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SID'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEPUYDT') AND lower(coalesce(first_name,''))=lower('Raphaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SID'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BARRIAN') AND lower(coalesce(first_name,''))=lower('Abdennabi') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SID'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DENY') AND lower(coalesce(first_name,''))=lower('Eric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SID'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('POTHIER') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_SID'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VERHEGGEN') AND lower(coalesce(first_name,''))=lower('Stephan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='DIV_TRANSVERSAL'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BERTIEAUX') AND lower(coalesce(first_name,''))=lower('Pierre-Paul') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_PS_PROJETS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEMOITIE') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LAURENT') AND lower(coalesce(first_name,''))=lower('Paul') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DUBOIS') AND lower(coalesce(first_name,''))=lower('Christophe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DUCHESNE') AND lower(coalesce(first_name,''))=lower('Françoise') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VIALE') AND lower(coalesce(first_name,''))=lower('Stefano') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHERPION') AND lower(coalesce(first_name,''))=lower('Yaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DUFRANE') AND lower(coalesce(first_name,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MESTRONE') AND lower(coalesce(first_name,''))=lower('Grégory') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MATHELART') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GUAZZO') AND lower(coalesce(first_name,''))=lower('Jean-Jacques') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_CDP'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DAL') AND lower(coalesce(first_name,''))=lower('Jean-Marc') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PSO'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DE PREZ') AND lower(coalesce(first_name,''))=lower('Laurence') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PSO'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NOWICKI-RAIKHLIN') AND lower(coalesce(first_name,''))=lower('Marion') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PSO'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BAILLET') AND lower(coalesce(first_name,''))=lower('Corinne') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PSO'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TONGRES') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_METHO'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NOSEDA') AND lower(coalesce(first_name,''))=lower('Anne') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_METHO'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MELIN') AND lower(coalesce(first_name,''))=lower('Michael') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALM_DEVOPS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('THYS') AND lower(coalesce(first_name,''))=lower('Johan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ALM_DEVOPS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MARTIN') AND lower(coalesce(first_name,''))=lower('Xavier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ARCHI_TECH'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('KOUAHOU YONGUE') AND lower(coalesce(first_name,''))=lower('Aubert') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ARCHI_TECH'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHOUSTOULAKIS') AND lower(coalesce(first_name,''))=lower('Charidimos') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ARCHI_TECH'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JOUREZ') AND lower(coalesce(first_name,''))=lower('Sylvian') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DESIGN_SYS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CASSAN') AND lower(coalesce(first_name,''))=lower('Anelita') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DESIGN_SYS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VELARDE GONZALEZ') AND lower(coalesce(first_name,''))=lower('Sandra') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ACCESSIBILITE'), 'member'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MARSEILLE') AND lower(coalesce(first_name,''))=lower('Samuel') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ACCESSIBILITE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DE BACKER') AND lower(coalesce(first_name,''))=lower('Sophie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ACCESSIBILITE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BENDA') AND lower(coalesce(first_name,''))=lower('Joëlle') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_DONNEES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MALVOISIN') AND lower(coalesce(first_name,''))=lower('Jérôme') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_DONNEES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BERNARD') AND lower(coalesce(first_name,''))=lower('Bruno') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_DONNEES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VINCART') AND lower(coalesce(first_name,''))=lower('Stéphanie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_DONNEES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VIEIRA RAMOS') AND lower(coalesce(first_name,''))=lower('Alexandre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SOLLIMA') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MARKOWSKI') AND lower(coalesce(first_name,''))=lower('Jean-Marie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NDJOH EYOUM') AND lower(coalesce(first_name,''))=lower('Serge') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VAN LIERDE') AND lower(coalesce(first_name,''))=lower('Boris') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LUKASHEVICH') AND lower(coalesce(first_name,''))=lower('Violetta') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BEN KHALFALLAH') AND lower(coalesce(first_name,''))=lower('Aymen') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TESTS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SERVAIS') AND lower(coalesce(first_name,''))=lower('Laurent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SECURITE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BEN ABDESLEM') AND lower(coalesce(first_name,''))=lower('Jamal') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PROD_SEC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHALTIN') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PROD_SEC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MARCHANT') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PROD_SEC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MAGIS') AND lower(coalesce(first_name,''))=lower('Tom') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PROD_SEC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GASPARD') AND lower(coalesce(first_name,''))=lower('Renaud') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_PROD_SEC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEGOLS') AND lower(coalesce(first_name,''))=lower('Thierry') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TAR'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TELLIER') AND lower(coalesce(first_name,''))=lower('Serge') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_IAM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('COSTABEBER') AND lower(coalesce(first_name,''))=lower('Michaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_IAM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LEONARD') AND lower(coalesce(first_name,''))=lower('Philippe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_IAM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHAMBERT') AND lower(coalesce(first_name,''))=lower('Yann') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_IAM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ADLINE') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_IAM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PAUWELS') AND lower(coalesce(first_name,''))=lower('Stephan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_IAM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BODSON') AND lower(coalesce(first_name,''))=lower('Marc') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_ITIL'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JOIRET') AND lower(coalesce(first_name,''))=lower('Julien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ITSM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('RASQUIN') AND lower(coalesce(first_name,''))=lower('Sabine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ITSM'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VANOYCKE') AND lower(coalesce(first_name,''))=lower('Cédric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ITIL_PROC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PIERRE-LOUIS') AND lower(coalesce(first_name,''))=lower('Alix') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ITIL_PROC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('STIENS') AND lower(coalesce(first_name,''))=lower('Laurent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ITIL_PROC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('RASSART') AND lower(coalesce(first_name,''))=lower('Julien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ITIL_PROC'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('KOUAHOU YONGUE') AND lower(coalesce(first_name,''))=lower('Aubert') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_MONITORING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JELTI') AND lower(coalesce(first_name,''))=lower('Souad') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_MONITORING'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('EL GHANASSY') AND lower(coalesce(first_name,''))=lower('Nawal') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOILAN') AND lower(coalesce(first_name,''))=lower('Jérémie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOURGEOIS') AND lower(coalesce(first_name,''))=lower('Adrien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('AHRIKA') AND lower(coalesce(first_name,''))=lower('Soufiane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CAPUTO') AND lower(coalesce(first_name,''))=lower('Laurent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JEURISSEN') AND lower(coalesce(first_name,''))=lower('Geoffrey') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PIRMEZ') AND lower(coalesce(first_name,''))=lower('Géry') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('NICAISE') AND lower(coalesce(first_name,''))=lower('Thomas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ONAY') AND lower(coalesce(first_name,''))=lower('Ayse') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ALMANZAR FERNANDEZ') AND lower(coalesce(first_name,''))=lower('David') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('METTENS') AND lower(coalesce(first_name,''))=lower('Quentin') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('EL BOUBSI') AND lower(coalesce(first_name,''))=lower('Salma') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MINAZZI') AND lower(coalesce(first_name,''))=lower('Paolo') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BOUTINZITE') AND lower(coalesce(first_name,''))=lower('Larbi') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('YAHTIT') AND lower(coalesce(first_name,''))=lower('Mohamed') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVICEDESK'), 'member'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('PONSELET') AND lower(coalesce(first_name,''))=lower('André') LIMIT 1), (SELECT id FROM competency_centers WHERE code='DIV_INFRA'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('KOENIG') AND lower(coalesce(first_name,''))=lower('Philippe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='DIV_INFRA'), 'advisor'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MATHOT') AND lower(coalesce(first_name,''))=lower('Valérie') LIMIT 1), (SELECT id FROM competency_centers WHERE code='DIV_INFRA'), 'analyst'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROUWEZ') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_SERVEURS'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GHOUL') AND lower(coalesce(first_name,''))=lower('Mounir') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_INFRA_SRV'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GRANDJEAN') AND lower(coalesce(first_name,''))=lower('Bastien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_INFRA_SRV'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GHYSSELS') AND lower(coalesce(first_name,''))=lower('Cédric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_INFRA_SRV'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BRIDOUX') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WINDOWS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CROISELET') AND lower(coalesce(first_name,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WINDOWS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FALQUE') AND lower(coalesce(first_name,''))=lower('Patrick') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WINDOWS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FERNANDEZ') AND lower(coalesce(first_name,''))=lower('Xavier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WINDOWS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('SERBANESCU') AND lower(coalesce(first_name,''))=lower('Andreï') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WINDOWS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEWAILLY') AND lower(coalesce(first_name,''))=lower('Jean') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WINDOWS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DEVIS') AND lower(coalesce(first_name,''))=lower('Arnaud') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_LINUX'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HOUSNI') AND lower(coalesce(first_name,''))=lower('Abdellatif') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_LINUX'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LAMBERT') AND lower(coalesce(first_name,''))=lower('Cliff') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_LINUX'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('MOSTENNE') AND lower(coalesce(first_name,''))=lower('Patrick') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_LINUX'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BONGARTZ') AND lower(coalesce(first_name,''))=lower('Michaël') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_LINUX'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('KERSTENS') AND lower(coalesce(first_name,''))=lower('Gaëtan') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_LINUX'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('STINGLHAMBER') AND lower(coalesce(first_name,''))=lower('Grégory') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_MIDDLEWARE'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CHARLET') AND lower(coalesce(first_name,''))=lower('Laurent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('JEUNIAUX') AND lower(coalesce(first_name,''))=lower('Olivier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('FONTAINE') AND lower(coalesce(first_name,''))=lower('Olivier') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROGGEMANS') AND lower(coalesce(first_name,''))=lower('Frédéric') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_DB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VANDE PITTE') AND lower(coalesce(first_name,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WAS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GOURMAND') AND lower(coalesce(first_name,''))=lower('Frederic') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_WAS'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BAKKALI') AND lower(coalesce(first_name,''))=lower('Hicham') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ESB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('TRICHA') AND lower(coalesce(first_name,''))=lower('Amine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_ESB'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ROUWEZ') AND lower(coalesce(first_name,''))=lower('Stéphane') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_TELECOM'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('AARAB') AND lower(coalesce(first_name,''))=lower('Nabil') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TELEPHONIE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ANTOINE') AND lower(coalesce(first_name,''))=lower('Romain') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TELEPHONIE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GOSSET') AND lower(coalesce(first_name,''))=lower('Valéry') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TELEPHONIE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BERTRAND') AND lower(coalesce(first_name,''))=lower('Nicolas') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TELEPHONIE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('CONSTANT') AND lower(coalesce(first_name,''))=lower('Simon') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_TELEPHONIE'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('RHAITI') AND lower(coalesce(first_name,''))=lower('Azzeddine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_RESEAU'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DIALLO') AND lower(coalesce(first_name,''))=lower('Mamadou') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_RESEAU'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VINCENT') AND lower(coalesce(first_name,''))=lower('Yannick') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_RESEAU'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HAMRANI') AND lower(coalesce(first_name,''))=lower('Younes') LIMIT 1), (SELECT id FROM competency_centers WHERE code='EQ_RESEAU'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('WILLOCQ') AND lower(coalesce(first_name,''))=lower('Philippe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_PRODUCTION'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('GILLARD') AND lower(coalesce(first_name,''))=lower('Pierre') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_PRODUCTION'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HOFMAN') AND lower(coalesce(first_name,''))=lower('Ingrid') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_PRODUCTION'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('WILLOCQ') AND lower(coalesce(first_name,''))=lower('Philippe') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_MAINFRAME'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ANSION') AND lower(coalesce(first_name,''))=lower('Alain') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_MAINFRAME'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BLONDIAUX') AND lower(coalesce(first_name,''))=lower('Denis') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_MAINFRAME'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('HOST') AND lower(coalesce(first_name,''))=lower('Michel') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_MAINFRAME'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LEMMENS') AND lower(coalesce(first_name,''))=lower('Pascal') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'manager'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ADAM') AND lower(coalesce(first_name,''))=lower('Antoine') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('ADAM') AND lower(coalesce(first_name,''))=lower('Vincent') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('BROUEZ') AND lower(coalesce(first_name,''))=lower('Benjamen') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('DENIS') AND lower(coalesce(first_name,''))=lower('Damien') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (contact_id, cc_id, role) VALUES
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('LUTZ') AND lower(coalesce(first_name,''))=lower('Steeve') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('VANDENBROECK') AND lower(coalesce(first_name,''))=lower('Dimitri') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role),
  ((SELECT id FROM contacts WHERE lower(last_name)=lower('COCKELAERE') AND lower(coalesce(first_name,''))=lower('Mathias') LIMIT 1), (SELECT id FROM competency_centers WHERE code='CC_POSTES'), 'member'::membership_role)
ON CONFLICT DO NOTHING;

COMMIT;

SELECT '✅ ETNIC organigram seed 002 applied' AS status;
SELECT level, COUNT(*) AS nb FROM competency_centers GROUP BY level ORDER BY level;
SELECT COUNT(*) AS total_contacts FROM contacts;
SELECT COUNT(*) AS total_memberships FROM memberships;
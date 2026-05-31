-- ============================================================================
-- Migration 013 — Renumérotation des IDs existants selon les tiers structurés
-- ============================================================================
-- Contexte :
--   Migration 011 a fixé les séquences pour les futurs inserts,
--   mais les IDs déjà en base (1, 2, 3…) n'étaient pas mis à jour.
--   Cette migration renumérote tous les enregistrements existants.
--
-- Offsets appliqués (aucun chevauchement possible) :
--   +10       → document_templates      (1-1     → 11-11)
--   +100      → roles, organizations,   (max 73  → jamais > 173)
--               competency_centers,
--               projects
--   +1000     → risks, public_procurements (max 5 → 1005)
--   +10000    → contacts, meetings,     (max 8491 → 18491)
--               sources, project_members,
--               source_projects, risk_projects
--   +100000   → documents, memberships  (max 303 → 100303)
--   meeting_attendees : déjà 100001+ → PK inchangée, FKs mises à jour
--
-- Stratégie :
--   SET session_replication_role = 'replica' — désactive les triggers FK
--   (contrainte UNIQUE reste active → les offsets sont choisis sans overlap)
--   Étape 1 : mise à jour des PKs
--   Étape 2 : mise à jour des colonnes FK (même offset que leur parent)
--   Étape 3 : réinitialisation des séquences
--   Étape 4 : réactivation FK + vérification des orphelins (doit retourner 0)
-- ============================================================================

BEGIN;

-- ── Désactiver les triggers FK ───────────────────────────────────────────────
SET session_replication_role = 'replica';

-- ── Étape 1 : Mise à jour des PKs ───────────────────────────────────────────

-- Tier 0 — document_templates (+10)
UPDATE document_templates SET id = id + 10;

-- Tier 1 — entités de base (+100)
UPDATE roles                SET id = id + 100;
UPDATE organizations        SET id = id + 100;
UPDATE competency_centers   SET id = id + 100;   -- self-FK parent_id → traité étape 2
UPDATE projects             SET id = id + 100;

-- Tier 2 — entités moyennes (+1000)
UPDATE risks                SET id = id + 1000;
UPDATE public_procurements  SET id = id + 1000;

-- Tier 3 — entités volumineuses (+10000)
UPDATE contacts             SET id = id + 10000; -- self-FK manager_contact_id → étape 2
UPDATE meetings             SET id = id + 10000;
UPDATE sources              SET id = id + 10000;
UPDATE project_members      SET id = id + 10000;
UPDATE source_projects      SET id = id + 10000;
UPDATE risk_projects        SET id = id + 10000;
-- project_status_history : vide, séquence réinitialisée étape 3
-- meeting_speakers         : vide, séquence réinitialisée étape 3

-- Tier 4 — volume élevé (+100000)
UPDATE documents    SET id = id + 100000;        -- self-FK parent_document_id → étape 2
UPDATE memberships  SET id = id + 100000;
-- meeting_attendees : déjà 100001+, PK inchangée

-- ── Étape 2 : Mise à jour des colonnes FK ────────────────────────────────────

-- ── organisations (+100) ─────
UPDATE contacts  SET organization_id         = organization_id + 100
  WHERE organization_id IS NOT NULL;
UPDATE projects  SET client_organization_id  = client_organization_id + 100
  WHERE client_organization_id IS NOT NULL;

-- ── contacts (+10000) ────────
-- self-FK (manager → manager)
UPDATE contacts  SET manager_contact_id      = manager_contact_id + 10000
  WHERE manager_contact_id IS NOT NULL;
-- tables enfants
UPDATE competency_centers SET manager_contact_id = manager_contact_id + 10000
  WHERE manager_contact_id IS NOT NULL;
UPDATE documents          SET author_contact_id   = author_contact_id + 10000
  WHERE author_contact_id IS NOT NULL;
UPDATE document_files     SET uploaded_by_contact_id = uploaded_by_contact_id + 10000
  WHERE uploaded_by_contact_id IS NOT NULL;
UPDATE meeting_actions    SET owner_id              = owner_id + 10000
  WHERE owner_id IS NOT NULL;
UPDATE meeting_attendees  SET contact_id            = contact_id + 10000
  WHERE contact_id IS NOT NULL;
UPDATE meeting_decisions  SET approver_contact_id   = approver_contact_id + 10000
  WHERE approver_contact_id IS NOT NULL;
UPDATE meeting_decisions  SET driver_contact_id     = driver_contact_id + 10000
  WHERE driver_contact_id IS NOT NULL;
UPDATE memberships        SET contact_id            = contact_id + 10000
  WHERE contact_id IS NOT NULL;
UPDATE project_members    SET contact_id            = contact_id + 10000
  WHERE contact_id IS NOT NULL;
UPDATE project_status_history SET snapshotted_by    = snapshotted_by + 10000
  WHERE snapshotted_by IS NOT NULL;
UPDATE projects           SET status_brief_updated_by = status_brief_updated_by + 10000
  WHERE status_brief_updated_by IS NOT NULL;
UPDATE risks              SET owner_contact_id      = owner_contact_id + 10000
  WHERE owner_contact_id IS NOT NULL;
UPDATE sources            SET uploaded_by_contact_id = uploaded_by_contact_id + 10000
  WHERE uploaded_by_contact_id IS NOT NULL;

-- ── projects (+100) ──────────
UPDATE meetings               SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;
UPDATE project_members        SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;
UPDATE project_status_history SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;
UPDATE risk_projects          SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;
UPDATE source_projects        SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;
UPDATE timeline_events        SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;
UPDATE documents              SET project_id = project_id + 100
  WHERE project_id IS NOT NULL;

-- ── competency_centers (+100) ─
-- self-FK (parent → parent)
UPDATE competency_centers SET parent_id = parent_id + 100
  WHERE parent_id IS NOT NULL;
UPDATE memberships        SET cc_id     = cc_id + 100
  WHERE cc_id IS NOT NULL;
UPDATE project_members    SET cc_id     = cc_id + 100
  WHERE cc_id IS NOT NULL;

-- ── roles (+100) ─────────────
UPDATE project_members SET role_id = role_id + 100
  WHERE role_id IS NOT NULL;

-- ── document_templates (+10) ─
UPDATE documents SET template_id = template_id + 10
  WHERE template_id IS NOT NULL;

-- ── meetings (+10000) ────────
UPDATE documents         SET meeting_id = meeting_id + 10000
  WHERE meeting_id IS NOT NULL;
UPDATE meeting_actions   SET meeting_id = meeting_id + 10000
  WHERE meeting_id IS NOT NULL;
UPDATE meeting_attendees SET meeting_id = meeting_id + 10000
  WHERE meeting_id IS NOT NULL;
UPDATE meeting_decisions SET meeting_id = meeting_id + 10000
  WHERE meeting_id IS NOT NULL;
UPDATE meeting_speakers  SET meeting_id = meeting_id + 10000
  WHERE meeting_id IS NOT NULL;
UPDATE meeting_topics    SET meeting_id = meeting_id + 10000
  WHERE meeting_id IS NOT NULL;

-- ── risks (+1000) ────────────
UPDATE risk_projects SET risk_id = risk_id + 1000
  WHERE risk_id IS NOT NULL;

-- ── sources (+10000) ─────────
UPDATE source_projects SET source_id = source_id + 10000
  WHERE source_id IS NOT NULL;

-- ── documents (+100000) ──────
-- self-FK parent → parent
UPDATE documents      SET parent_document_id = parent_document_id + 100000
  WHERE parent_document_id IS NOT NULL;
UPDATE document_files SET document_id        = document_id + 100000
  WHERE document_id IS NOT NULL;

-- ── Étape 3 : Réinitialisation des séquences ────────────────────────────────

SELECT setval('document_templates_id_seq',
  GREATEST(11,      (SELECT COALESCE(MAX(id), 0) + 1 FROM document_templates)),    false);
SELECT setval('roles_id_seq',
  GREATEST(101,     (SELECT COALESCE(MAX(id), 0) + 1 FROM roles)),                 false);
SELECT setval('organizations_id_seq',
  GREATEST(101,     (SELECT COALESCE(MAX(id), 0) + 1 FROM organizations)),         false);
SELECT setval('competency_centers_id_seq',
  GREATEST(101,     (SELECT COALESCE(MAX(id), 0) + 1 FROM competency_centers)),    false);
SELECT setval('projects_id_seq',
  GREATEST(101,     (SELECT COALESCE(MAX(id), 0) + 1 FROM projects)),              false);
SELECT setval('risks_id_seq',
  GREATEST(1001,    (SELECT COALESCE(MAX(id), 0) + 1 FROM risks)),                 false);
SELECT setval('public_procurements_id_seq',
  GREATEST(1001,    (SELECT COALESCE(MAX(id), 0) + 1 FROM public_procurements)),   false);
SELECT setval('contacts_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM contacts)),              false);
SELECT setval('meetings_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM meetings)),              false);
SELECT setval('project_sources_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM sources)),               false);
SELECT setval('project_members_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM project_members)),       false);
SELECT setval('source_projects_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM source_projects)),       false);
SELECT setval('risk_projects_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM risk_projects)),         false);
SELECT setval('project_status_history_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM project_status_history)),false);
SELECT setval('meeting_speakers_id_seq',
  GREATEST(10001,   (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_speakers)),      false);
SELECT setval('documents_id_seq',
  GREATEST(100001,  (SELECT COALESCE(MAX(id), 0) + 1 FROM documents)),             false);
SELECT setval('memberships_id_seq',
  GREATEST(100001,  (SELECT COALESCE(MAX(id), 0) + 1 FROM memberships)),           false);
SELECT setval('meeting_attendees_id_seq',
  GREATEST(100001,  (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_attendees)),     false);
SELECT setval('meeting_topics_id_seq',
  GREATEST(100001,  (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_topics)),        false);
SELECT setval('meeting_decisions_id_seq',
  GREATEST(100001,  (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_decisions)),     false);
SELECT setval('timeline_events_id_seq',
  GREATEST(100001,  (SELECT COALESCE(MAX(id), 0) + 1 FROM timeline_events)),       false);
SELECT setval('document_files_id_seq',
  GREATEST(1000001, (SELECT COALESCE(MAX(id), 0) + 1 FROM document_files)),        false);
SELECT setval('meeting_actions_id_seq',
  GREATEST(1000001, (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_actions)),       false);

-- ── Réactiver les triggers FK ────────────────────────────────────────────────
SET session_replication_role = 'origin';

-- ── Étape 4 : Vérification des orphelins (toutes les valeurs doivent être 0) ─

SELECT 'contacts → organizations'        AS fk_check,
  COUNT(*) AS orphans
  FROM contacts WHERE organization_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = contacts.organization_id)
UNION ALL
SELECT 'projects → organizations',    COUNT(*) FROM projects
  WHERE client_organization_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = projects.client_organization_id)
UNION ALL
SELECT 'memberships → contacts',      COUNT(*) FROM memberships
  WHERE contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM contacts WHERE id = memberships.contact_id)
UNION ALL
SELECT 'memberships → comp_centers',  COUNT(*) FROM memberships
  WHERE cc_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM competency_centers WHERE id = memberships.cc_id)
UNION ALL
SELECT 'project_members → projects',  COUNT(*) FROM project_members
  WHERE project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id)
UNION ALL
SELECT 'project_members → contacts',  COUNT(*) FROM project_members
  WHERE contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM contacts WHERE id = project_members.contact_id)
UNION ALL
SELECT 'project_members → roles',     COUNT(*) FROM project_members
  WHERE role_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM roles WHERE id = project_members.role_id)
UNION ALL
SELECT 'risk_projects → risks',       COUNT(*) FROM risk_projects
  WHERE risk_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM risks WHERE id = risk_projects.risk_id)
UNION ALL
SELECT 'risk_projects → projects',    COUNT(*) FROM risk_projects
  WHERE project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = risk_projects.project_id)
UNION ALL
SELECT 'source_projects → sources',   COUNT(*) FROM source_projects
  WHERE source_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sources WHERE id = source_projects.source_id)
UNION ALL
SELECT 'source_projects → projects',  COUNT(*) FROM source_projects
  WHERE project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = source_projects.project_id)
UNION ALL
SELECT 'meeting_attendees → meetings',COUNT(*) FROM meeting_attendees
  WHERE meeting_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM meetings WHERE id = meeting_attendees.meeting_id)
UNION ALL
SELECT 'meeting_attendees → contacts',COUNT(*) FROM meeting_attendees
  WHERE contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM contacts WHERE id = meeting_attendees.contact_id)
UNION ALL
SELECT 'meetings → projects',         COUNT(*) FROM meetings
  WHERE project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = meetings.project_id)
ORDER BY fk_check;

-- ── Résumé des nouvelles plages ──────────────────────────────────────────────
SELECT
  tablename,
  min_id,
  max_id,
  row_count,
  CASE
    WHEN min_id <       100 THEN '⚠ Tier 0 (2 chiffres)'
    WHEN min_id <      1000 THEN 'Tier 1 (3 chiffres) ✓'
    WHEN min_id <     10000 THEN 'Tier 2 (4 chiffres) ✓'
    WHEN min_id <    100000 THEN 'Tier 3 (5 chiffres) ✓'
    WHEN min_id <   1000000 THEN 'Tier 4 (6 chiffres) ✓'
    ELSE                         'Tier 5 (7 chiffres) ✓'
  END AS tier_status
FROM (
  SELECT 'document_templates'     AS tablename, MIN(id) min_id, MAX(id) max_id, COUNT(*) row_count FROM document_templates
  UNION ALL SELECT 'roles',                MIN(id), MAX(id), COUNT(*) FROM roles
  UNION ALL SELECT 'organizations',        MIN(id), MAX(id), COUNT(*) FROM organizations
  UNION ALL SELECT 'competency_centers',   MIN(id), MAX(id), COUNT(*) FROM competency_centers
  UNION ALL SELECT 'projects',             MIN(id), MAX(id), COUNT(*) FROM projects
  UNION ALL SELECT 'risks',                MIN(id), MAX(id), COUNT(*) FROM risks
  UNION ALL SELECT 'contacts',             MIN(id), MAX(id), COUNT(*) FROM contacts
  UNION ALL SELECT 'meetings',             MIN(id), MAX(id), COUNT(*) FROM meetings
  UNION ALL SELECT 'sources',              MIN(id), MAX(id), COUNT(*) FROM sources
  UNION ALL SELECT 'project_members',      MIN(id), MAX(id), COUNT(*) FROM project_members
  UNION ALL SELECT 'source_projects',      MIN(id), MAX(id), COUNT(*) FROM source_projects
  UNION ALL SELECT 'risk_projects',        MIN(id), MAX(id), COUNT(*) FROM risk_projects
  UNION ALL SELECT 'documents',            MIN(id), MAX(id), COUNT(*) FROM documents
  UNION ALL SELECT 'memberships',          MIN(id), MAX(id), COUNT(*) FROM memberships
  UNION ALL SELECT 'meeting_attendees',    MIN(id), MAX(id), COUNT(*) FROM meeting_attendees
) t
ORDER BY min_id NULLS LAST, tablename;

COMMIT;

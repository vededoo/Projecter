-- ============================================================================
-- Migration 011 — Séquences ID structurées
-- ============================================================================
-- Logique :
--   Chaque tier définit l'ordre de grandeur attendu pour la table.
--   Le chiffre de départ fixe le nombre de digits et donc la capacité max.
--
--   Tier 0 — configuration   (11 → 88,    ~77 enregistrements max)  [document_templates uniquement]
--   Tier 1 — entités petites (101 → 888,  ~787)  [roles, competency_centers, projects, organizations]
--   Tier 2 — entités moyennes(1001 → 8888, ~7887)
--   Tier 3 — entités grandes (10001 → 88888, ~78887)
--   Tier 4 — volume élevé    (100001 → 888888, ~788887)
--   Tier 5 — très grand vol. (1000001 → …)
--
--   Règle enfant → parent :
--     ≤ 10 enfants par parent  → start_enfant = start_parent × 10
--     > 10 enfants par parent  → start_enfant = start_parent × 100
--
--   Sécurité : GREATEST(start_voulu, MAX(id_existant) + 1)
--   Garantit l'absence de conflit avec les données déjà importées.
--   setval(seq, n, false) → le prochain INSERT reçoit n.
-- ============================================================================

-- ── TIER 0 — Configuration / référentiels (2 chiffres, max ~77) ─────────────

-- roles : données existantes > 11 → tier 1 (101)
SELECT setval(
  'roles_id_seq',
  GREATEST(101, (SELECT COALESCE(MAX(id), 0) + 1 FROM roles)),
  false
);

-- competency_centers : données existantes > 11 → tier 1 (101)
SELECT setval(
  'competency_centers_id_seq',
  GREATEST(101, (SELECT COALESCE(MAX(id), 0) + 1 FROM competency_centers)),
  false
);

-- document_templates : petite bibliothèque de templates
SELECT setval(
  'document_templates_id_seq',
  GREATEST(11, (SELECT COALESCE(MAX(id), 0) + 1 FROM document_templates)),
  false
);

-- ── TIER 1 — Entités de base (3 chiffres, max ~787) ─────────────────────────

-- projects : ~900 projets dans la vie de l'application
SELECT setval(
  'projects_id_seq',
  GREATEST(101, (SELECT COALESCE(MAX(id), 0) + 1 FROM projects)),
  false
);

-- organizations : toujours < projets car parent des contacts
SELECT setval(
  'organizations_id_seq',
  GREATEST(101, (SELECT COALESCE(MAX(id), 0) + 1 FROM organizations)),
  false
);

-- ── TIER 2 — Entités de volume moyen (4 chiffres, max ~7887) ────────────────

-- risks : ~5-10 risques par projet × ~900 projets = ~9000 max
SELECT setval(
  'risks_id_seq',
  GREATEST(1001, (SELECT COALESCE(MAX(id), 0) + 1 FROM risks)),
  false
);

-- public_procurements : ~5-10 par projet, volume similaire aux risques
SELECT setval(
  'public_procurements_id_seq',
  GREATEST(1001, (SELECT COALESCE(MAX(id), 0) + 1 FROM public_procurements)),
  false
);

-- ── TIER 3 — Entités volumineuses (5 chiffres, max ~78887) ──────────────────

-- contacts : importés depuis annuaires, peut dépasser 10000
SELECT setval(
  'contacts_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM contacts)),
  false
);

-- meetings : cœur de Projecter, des milliers de réunions sur le long terme
SELECT setval(
  'meetings_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM meetings)),
  false
);

-- project_members : ~20 membres par projet × ~900 projets = ~18000
--   ≤ 10 membres "directs" → tier3 (10001), mais > 10 avec tous rôles → tier3 conservateur
SELECT setval(
  'project_members_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM project_members)),
  false
);

-- project_status_history : ~10-20 snapshots par projet × ~900 = ~18000
SELECT setval(
  'project_status_history_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM project_status_history)),
  false
);

-- sources : documents sources importés (PDFs, Office…) — volume similaire aux documents
--   Nota : la séquence s'appelle project_sources_id_seq (héritage de migration)
SELECT setval(
  'project_sources_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM sources)),
  false
);

-- source_projects : table jonction sources ↔ projets (N-to-N)
SELECT setval(
  'source_projects_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM source_projects)),
  false
);

-- risk_projects : table jonction risques ↔ projets (risques transverses)
SELECT setval(
  'risk_projects_id_seq',
  GREATEST(10001, (SELECT COALESCE(MAX(id), 0) + 1 FROM risk_projects)),
  false
);

-- ── TIER 4 — Volume élevé (6 chiffres, max ~788887) ─────────────────────────

-- documents : mandats, notes, DIP, fiches projet — jusqu'à ~100 par projet × 900 = ~90000
SELECT setval(
  'documents_id_seq',
  GREATEST(100001, (SELECT COALESCE(MAX(id), 0) + 1 FROM documents)),
  false
);

-- memberships : contacts × CC (303 actuellement, peut monter à ~50000+)
--   contacts démarrent à 10001 × ~5 CC par contact → tier4
SELECT setval(
  'memberships_id_seq',
  GREATEST(100001, (SELECT COALESCE(MAX(id), 0) + 1 FROM memberships)),
  false
);

-- meeting_attendees : meetings × ~10 participants ≤ 10 → tier4 = tier3 × 10
--   10001 (meetings) × 10 = 100001
SELECT setval(
  'meeting_attendees_id_seq',
  GREATEST(100001, (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_attendees)),
  false
);

-- meeting_topics : meetings × ~5-10 sujets ≤ 10 → tier4
SELECT setval(
  'meeting_topics_id_seq',
  GREATEST(100001, (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_topics)),
  false
);

-- meeting_decisions : meetings × ~5-10 décisions ≤ 10 → tier4
SELECT setval(
  'meeting_decisions_id_seq',
  GREATEST(100001, (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_decisions)),
  false
);

-- timeline_events : events sur projets + réunions, volume similaire aux decisions
SELECT setval(
  'timeline_events_id_seq',
  GREATEST(100001, (SELECT COALESCE(MAX(id), 0) + 1 FROM timeline_events)),
  false
);

-- ── TIER 5 — Très grand volume (7 chiffres, max illimité) ───────────────────

-- document_files : pièces jointes → ~10 fichiers par document × 100001 docs = ~1M+
--   100001 (documents) × 10 (≤ 10 fichiers) → 1000001
SELECT setval(
  'document_files_id_seq',
  GREATEST(1000001, (SELECT COALESCE(MAX(id), 0) + 1 FROM document_files)),
  false
);

-- meeting_actions : points d'action → > 10 par réunion (cf. exemple utilisateur)
--   10001 (meetings) × 100 (> 10 actions) = 1000001
SELECT setval(
  'meeting_actions_id_seq',
  GREATEST(1000001, (SELECT COALESCE(MAX(id), 0) + 1 FROM meeting_actions)),
  false
);

-- ── VÉRIFICATION ─────────────────────────────────────────────────────────────
SELECT
  sequencename,
  last_value,
  CASE
    WHEN last_value <       100 THEN 'Tier 0 (2 digits)'
    WHEN last_value <      1000 THEN 'Tier 1 (3 digits)'
    WHEN last_value <     10000 THEN 'Tier 2 (4 digits)'
    WHEN last_value <    100000 THEN 'Tier 3 (5 digits)'
    WHEN last_value <   1000000 THEN 'Tier 4 (6 digits)'
    ELSE                             'Tier 5 (7+ digits)'
  END AS tier
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY last_value, sequencename;

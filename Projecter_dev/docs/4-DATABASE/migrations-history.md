# Projecter — Historique des migrations

> DB : `Projecter_dev` · Outil : `psql` via `server/scripts/db_query.sh`  
> Convention : appliquer les migrations dans l'ordre numérique.

---

## 001 — Schéma initial

**Fichier** : `001_init_schema.sql`

Tables créées :

- `organizations` — entités légales (ETNIC, WBE, MFWB, NSI)
- `competency_centers` — arbre org ETNIC (73 CCs, hiérarchique)
- `roles` — labels de rôle standards
- `public_procurements` — références marchés publics
- `contacts` — personnes récurrentes inter-projets
- `projects` — projets avec colonnes typées + JSONB `attributes`
- `project_members` — DACI et membres projet
- `risks` — table risques avec colonnes typed
- `meetings` — réunions
- `documents` — documents générés (mandate, briefing_note, project_sheet…)

**ENUMs** : `project_status`, `urgence_level`, `priority_type`, `rag_color`, `meeting_type`, `document_type`, `document_status`

---

## 002a — Champs synchronisation MS Graph

**Fichier** : `002_graph_sync_fields.sql`

- `contacts` : + `azure_object_id` (clé stable pour upsert idempotent), `sam_account_name`, `manager_id`, `office_location`, `city`, `country`, `employee_id`, `graph_synced_at`

---

## 002b — Project Topics + Meeting Category

**Fichier** : `002_project_topics.sql`

- `project_topics` — entités canoniques de suivi (niveau projet)
- `meeting_topics` — signaux capturés en réunion (N-to-1 meeting, N-to-1 project_topic via promotion)
- `meetings` : + `meeting_category` ENUM (formal / informal / phone_call / video_call)
- `topic_type` ENUM : decision / action / open_point / risk / information / follow_up

---

## 003 — Contacts Graph additionnels

**Fichier** : `003_contacts_department_displayname.sql`

- `contacts` : + `department`, `display_name`, `user_principal_name`

---

## 004 — Extraction structurée des CR

**Fichier** : `004_meeting_structured_extraction.sql`

- `meeting_topics` enrichi avec `commitment_level`, `confidence`, `owner_id` (FK contacts), `due_date`, `extracted_at`
- `meeting_decisions` — décisions structurées (DACI, rationale)
- `meeting_actions` — actions avec assignee, due_date, status
- `meetings` : + `executive_summary`, `extraction_status`, `extracted_at`

---

## 005 — Risques N-to-N projets + DACI décisions

**Fichier** : `005_risks_nton_projects_daci_decisions.sql`

- `risk_projects` — table de jonction risques ↔ projets (impact, context)
- `meeting_decisions` : + champs DACI (decision_maker, accountable, consulted, informed)
- Risques initialement liés à un seul projet migré vers la table de jonction

---

## 006 — Sources projet

**Fichier** : `006_project_sources.sql`

- `project_sources` — documents de référence liés à un projet 1-to-1

---

## 007 — Sources N-to-N projets

**Fichier** : `007_sources_nton_projects.sql`

- `sources` — table centrale (titre, fichier, mime_type, extraction_status)
- `source_projects` — table de jonction sources ↔ projets
- Migration des données de `project_sources` vers le nouveau schéma
- Suppression de `project_sources`

---

## 008 — AI Report meetings

**Fichier** : `008_meetings_ai_report.sql`

- `meetings` : + `ai_report` (JSONB), `validated_at`, `raw_transcript`, `minutes`
- Nettoyage des colonnes legacy de la migration 004

---

## 009 — Document templates

**Fichier** : `009_document_templates.sql`

- `document_templates` — templates .docx uploadés (name, doc_type, file_path, version)
- `documents` : + `template_id` (FK), `generation_params` (JSONB)

---

## 010 — Transcription audio directe

**Fichier** : `010_meetings_audio_transcription.sql`

- `meetings` : + `audio_path`, `transcription_status` (idle/running/done/error), `transcription_started_at`, `transcription_completed_at`, `transcription_error`, `transcription_segments` (JSONB array [{start, end, text, speaker}])

---

## 011 — Séquences ID structurées

**Fichier** : `011_sequence_structured_ids.sql`

Chaque tier de taille définit un plafond :

- Référentiels (roles, orgs, CCs) : < 1 000
- Contacts : < 10 000
- Projets, documents, templates, sources : < 100 000
- Meetings, topics, risks, membres : < 1 000 000

Les séquences `ALTER SEQUENCE … RESTART WITH …` garantissent des IDs humainement lisibles.

---

## 012 — Meeting speakers (diarization)

**Fichier** : `012_meeting_speakers.sql`

- `meeting_speakers` — un speaker détecté par réunion (SPEAKER_00, SPEAKER_01…)
  - `contact_id` (FK, nullable) — identification validée
  - `suggested_contact_id`, `suggested_score`, `suggested_confidence` — proposition voice-ID
  - `display_name` — nom affiché overridé
  - `total_duration_s`, `total_pct` — statistiques de parole
  - `validated_by_user` — flag de confirmation humaine

---

## 013 — Renumérotation des IDs existants

**Fichier** : `013_renumber_existing_ids.sql`

- Applique rétroactivement le schéma de tiers de la migration 011 aux données existantes
- Met à jour les FKs en cascade

---

## 014 — Sémantique enrichie des topics de réunion

**Fichier** : `014_meeting_topic_semantics.sql`

- `meeting_topics` : + `topic_type` étendu (+ 'issue'), `axes` (project_axis[]), `synthesis`, `confidence_level`
- `topic_type` ENUM étendu : + 'issue'
- Préparation du registre unifié (topics-registry endpoint)

---

## 015 — Axes projet + enrichissement project_topics ✅ (actuel)

**Fichier** : `015_project_axes_and_pt_enrichment.sql`

- `topic_type` ENUM : + 'issue' (problème réel, distinct de 'risk' = potentiel)
- `project_axis` ENUM : 13 axes (scope / planning / budget / resources / risk / governance / stakeholder / quality / security / change_management / benefits / dependencies / support_run)
- `confidence_level` ENUM : low / medium / high
- `project_topics` : + `axes project_axis[]`, `synthesis text`, `confidence confidence_level`, `owner text`, `due_date date`

---

## Appliquer une migration

```bash
# Via le wrapper (timeout 5s, recommandé pour SELECT)
./server/scripts/db_query.sh "SELECT …"

# Pour les migrations DDL (timeout long)
psql -d Projecter_dev -f database/migrations/015_project_axes_and_pt_enrichment.sql
```

> **Important** : vérifier `database/migrations/_verify_sequences.sql` après toute migration qui touche les séquences.

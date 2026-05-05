# Projecter — Schema fields

> Derived from analysis of 3 sample WBE/ETNIC documents:
>
> - `Mandat-de-Projet-WBE-GT10-Postes-travail-MFWB-V0.1.docx` (Mandate)
> - `ExposéDeProjet_WBE GED.docx` (Briefing note)
> - `FP_Projet Maison WBE V1_1 20250916.docx` (Project sheet)
>
> Schema is in **English** (snake_case). Documents ingested remain French (FTS uses `'french'`).

## Schema architecture

**Hybrid**: typed columns for the cross-document "core" + JSONB `attributes` for sections that vary by document type.

**Decision criteria for a typed table** (vs. nested JSONB):

1. 1→N cardinality from a parent (e.g. project → risks)
2. Cross-project querying / dashboarding need
3. Stable schema
4. Volume justifies relational indexing

→ This is why `risks` is a typed table (cross-project risk dashboards, owner FK, due-date index) but `impacted_populations` is a JSONB key inside `projects.attributes` (free-form, doc-local).

## Reference tables

| Table                 | Description                                                                     | Examples                                                                                      |
| --------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `organizations`       | Legal entities                                                                  | ETNIC, WBE, MFWB, NSI                                                                         |
| `competency_centers`  | ETNIC org structure (73 CCs, hierarchical: dg → division → cc → team → subteam) | CC Servers, CC Security, CC Middleware, CC Telecom, CC Workstations, CC Service Desk          |
| `roles`               | Standard role labels                                                            | Sponsor, Project Manager, Portfolio Manager, Analyst, Team Leader, Expert, Manager, Architect |
| `public_procurements` | Procurement references                                                          | 2023/2216 (Alfresco GED licenses)                                                             |

## Main tables

### `contacts` — cross-project base

Recurring people (LESNE Philippe, VAN DEN DURPEL Laurent, JEBNOUN Philippe, ETEKI Pierre-Giscard, …). Columns: `last_name`, `first_name`, `email`, `phone`, `organization_id`, `job_title`.

### `projects` — typed columns

Fields present in ≥2 documents. See [database/migrations/001_init_schema.sql](../database/migrations/001_init_schema.sql).

Lifecycle (`project_status` enum):

```
idea → mandate_received → briefing_draft → briefing_review → briefing_approved
     → sheet_draft → sheet_review → sheet_approved_etnic → sheet_approved_wbe
     → sheet_signed → in_progress → closed | cancelled
```

RAG indicators (`rag_color`: green / amber / red / grey): `rag_global`, `rag_planning`, `rag_budget`, `rag_scope`, `rag_risks`. Plus `status_brief` (text), `highlights`/`concerns`/`next_steps` (JSONB arrays).

### `documents` (+ `documents.attributes` JSONB)

A project has many documents (mandate, briefing_note, dip, project_sheet, meeting_minutes, appendix), each with version + status.

JSONB `attributes` is typed by section depending on `documents.type`:

#### `type = 'mandate'`

```
context, smart_objectives, indicators, future_state_needs,
expected_benefits[], stakes, scope_in[], scope_out[],
grey_zones, scenarios[], deadline_constraints, free_budget_resources,
critical_factors, other_constraints
```

#### `type = 'briefing_note'`

Sections II → VII of the Briefing Note:

- `section_2_request_qualification`: objectives, benefits, stakes, scope, prioritization_criteria (qualification, budget_impact, archi_impact, user_count, comments), deadlines, solution, applications[], security_gdpr (confidentiality / availability / integrity)
- `section_3_project_qualification`: assumptions, constraints, project_approach_nature, product_approach_nature, dependencies, deliverables[], costs (HR per CC + procurement), it_stakeholders[], business_stakeholders[], risks_summary[]
- `section_4_quality_requirements`: acceptance_criteria[]
- `section_5_roles_workload`, `section_6_phases_milestones[]`, `section_7_quality_assurance` (DIP optional)

#### `type = 'project_sheet'`

- `preamble` (representatives, allocation, usage rights)
- `description` (context, descriptive, scope_in/out, actions, objectives, prerequisites, project_type, administrative_simplification)
- `governance` (Governance Committee, Steering Committee, Project Leads, Technical/Functional/Procurement WG)
- `resources[]` + `totals`
- `impacts` (convention, public_procurement, resources)
- `risks_summary[]`, `indicators[]`, `schedule[]`
- `acceptance_funding_terms`, `validity_period`, `signatures` (Minister)

### `project_members` — cross-doc roles

`project_role` enum: `sponsor_wbe`, `sponsor_etnic`, `requester`, `responsible_for_request`, `etnic_project_manager`, `business_project_manager`, `etnic_portfolio_manager`, `wbe_portfolio_manager`, `expert`, `it_team_member`, `business_team_member`, `observer`.

### `risks` — typed (cross-project dashboards)

`probability`, `impact`, `severity` (`risk_level`: low/medium/high/critical), `status` (`risk_status`: open/mitigating/closed/accepted), `owner_contact_id`, `mitigation_plan`, `due_date`. Free-form `attributes` JSONB for doc-specific fields.

### `document_files`

Disk storage + extracted text (FTS in `'french'`, RAG in Phase 4).

### `meetings` + `meeting_attendees`

Linked to Transformer via `transformer_transcript_id`.

### `timeline_events` — cross-project view

`timeline_event_type`: `etnic_excom`, `wbe_excom`, `portfolio_committee`, `governance_committee`, `minister_signature`, `project_milestone`, `deadline`, `other`.

### Phase 4 (planned)

`embeddings` table backed by pgvector for semantic search over `document_files.extracted_text` and `meetings.minutes`.

## Free-form keys inside `projects.attributes` (JSONB)

Conventional (not enforced) — used by templates and UI:

```
objectives, benefits, deliverables, constraints,
impacted_populations[], costs, scope_in[], scope_out[]
```

## docx → DB mapping (docxtemplater placeholders)

Templates use `{{...}}` placeholders:

| Placeholder                                         | DB source                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `{{project.title}}`                                 | `projects.title`                                                         |
| `{{project.code}}`                                  | `projects.code`                                                          |
| `{{client.name}}`                                   | `organizations.name` via `projects.client_organization_id`               |
| `{{project.sponsor_wbe}}`                           | `project_members WHERE role='sponsor_wbe'` → contact full name           |
| `{{project.etnic_project_manager}}`                 | role `etnic_project_manager`                                             |
| `{{project.business_project_manager}}`              | role `business_project_manager`                                          |
| `{{briefing.objectives}}`                           | `documents.attributes->'section_2_request_qualification'->>'objectives'` |
| `{{#briefing.costs.human_resources}} ... {{/}}`     | docxtemplater loop                                                       |
| `{{#project.risks}} {{label}} — {{severity}} {{/}}` | `risks WHERE project_id = …`                                             |
| `{{sheet.signatures.minister}}`                     | `documents.attributes->'signatures'->>'minister'`                        |

Convention: one template per document type, stored under `server/templates/{mandate,briefing,project-sheet}.docx`.

## Recurring fields across the 3 samples

| Field                       | Mandate | Briefing    | Sheet       |
| --------------------------- | ------- | ----------- | ----------- |
| Project title               | ✅      | ✅          | ✅          |
| Client                      | ✅      | ✅          | ✅          |
| WBE Sponsor                 | ✅      | ✅          | ✅          |
| ETNIC Project Manager       | —       | ✅          | ✅          |
| Business Project Manager    | ✅      | ✅          | ✅          |
| ETNIC Portfolio Manager     | —       | ✅          | ✅          |
| Context                     | ✅      | ✅          | ✅          |
| Objectives                  | ✅      | ✅          | ✅          |
| Benefits                    | ✅      | ✅          | ✅          |
| Stakes                      | ✅      | ✅          | —           |
| Scope in/out                | ✅      | ✅          | ✅          |
| Prerequisites / Assumptions | ✅      | ✅          | ✅          |
| Deadlines                   | ✅      | ✅          | ✅          |
| Impacted populations        | ✅      | ✅          | —           |
| Costs / Budget              | partial | ✅ detailed | ✅ detailed |
| Risks                       | —       | ✅          | ✅          |
| Stakeholders                | partial | ✅ detailed | ✅ detailed |

→ Justifies the pattern: recurring fields as typed columns, document-specific data in JSONB.

## Seeded contacts (recurring across the 3 samples)

| Name                   | Organization | Observed roles                                     |
| ---------------------- | ------------ | -------------------------------------------------- |
| Philippe LESNE         | WBE          | Sponsor (3/3 docs)                                 |
| Tony STRUGARECK        | WBE          | Business Project Manager (Briefing GED)            |
| Jean-Pierre DEVOOGHT   | WBE          | Requester, Business Project Manager (Mandate GT10) |
| Hélène FERNANDEZ       | WBE          | Project Manager (Sheet Maison)                     |
| Céline DELAUNOIS       | WBE          | Project Manager (Sheet Maison)                     |
| Laurent VAN DEN DURPEL | ETNIC        | Project Manager (3/3 docs)                         |
| Pierre-Giscard ETEKI   | ETNIC        | Portfolio Manager (Briefing)                       |
| Philippe JEBNOUN       | ETNIC        | Portfolio Manager (Sheet Maison)                   |
| André PONSELET         | ETNIC        | Sponsor (Sheet Maison)                             |
| Yvan PIRENNE           | ETNIC        | Director General                                   |
| Olivier DOYEN          | WBE          | Acting Director General                            |
| Jacqueline GALANT      | Cabinet      | Signing Minister                                   |

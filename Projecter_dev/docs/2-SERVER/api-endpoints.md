# Projecter — API Endpoints Reference

> Base URL (dev) : `http://localhost:5054/api`  
> Format obligatoire : **JSON:API** (`data.attributes`)

---

## Health

| Méthode | Path      | Description    |
| ------- | --------- | -------------- |
| GET     | `/health` | Statut serveur |

---

## Projects

| Méthode | Path            | Description                                    |
| ------- | --------------- | ---------------------------------------------- |
| GET     | `/projects`     | Liste tous les projets                         |
| GET     | `/projects/:id` | Détail projet (include members, risks, topics) |
| POST    | `/projects`     | Créer un projet                                |
| PATCH   | `/projects/:id` | Mettre à jour un projet                        |

**Champs PATCH acceptés** : `code`, `title`, `slug`, `status`, `urgency`, `priority`, `attributes` (jsonb), `status_brief`, `rag_global`, `rag_planning`, `rag_budget`, `rag_scope`, `rag_risks`, `highlights` (jsonb), `concerns` (jsonb), `next_steps` (jsonb)

**ENUMs** :

- `status` → `project_status` (idea → … → closed/cancelled)
- `urgency` → `urgence_level` (low / medium / high)
- `priority` → `priority_type` (ca / pdi / other)
- `rag_*` → `rag_color` (green / amber / red / grey)

---

## Contacts & Competency Centers

| Méthode | Path                  | Description                                            |
| ------- | --------------------- | ------------------------------------------------------ |
| GET     | `/contacts`           | Liste contacts (query `?q=` pour recherche, `?limit=`) |
| GET     | `/contacts/facets`    | Facettes pour filtrage                                 |
| GET     | `/contacts/:id`       | Détail contact                                         |
| POST    | `/contacts`           | Créer contact                                          |
| PATCH   | `/contacts/:id`       | Mettre à jour contact                                  |
| DELETE  | `/contacts/:id`       | Supprimer contact                                      |
| GET     | `/competency-centers` | Arbre ETNIC (73 CCs)                                   |

---

## Risks

| Méthode | Path                             | Description                                |
| ------- | -------------------------------- | ------------------------------------------ |
| GET     | `/risks`                         | Liste tous les risques (avec projets liés) |
| GET     | `/risks/:id`                     | Détail risque                              |
| POST    | `/risks`                         | Créer risque                               |
| PATCH   | `/risks/:id`                     | Mettre à jour risque                       |
| DELETE  | `/risks/:id`                     | Supprimer risque                           |
| POST    | `/risks/:id/projects/:projectId` | Lier un risque à un projet                 |
| DELETE  | `/risks/:id/projects/:projectId` | Délier un risque d'un projet               |

**Champs** : `label` (requis), `description`, `probability`, `impact`, `severity`, `status`, `mitigation_plan`, `due_date`, `owner_name`  
**ENUMs** : `probability/impact/severity` → low/medium/high/critical · `status` → open/mitigating/closed/accepted

---

## Project Members

| Méthode | Path                   | Description                          |
| ------- | ---------------------- | ------------------------------------ |
| GET     | `/project-members`     | Liste membres (query `?project_id=`) |
| POST    | `/project-members`     | Ajouter membre                       |
| PATCH   | `/project-members/:id` | Modifier rôle                        |
| DELETE  | `/project-members/:id` | Retirer membre                       |

---

## Documents (générés)

| Méthode | Path                  | Description                     |
| ------- | --------------------- | ------------------------------- |
| GET     | `/documents`          | Liste documents                 |
| GET     | `/documents/:id`      | Détail document                 |
| GET     | `/documents/:id/file` | Télécharger le fichier          |
| POST    | `/documents/generate` | Générer un docx depuis template |
| POST    | `/documents`          | Créer entrée document           |
| PATCH   | `/documents/:id`      | Mettre à jour document          |
| DELETE  | `/documents/:id`      | Supprimer document              |

---

## Document Templates

| Méthode | Path                         | Description                  |
| ------- | ---------------------------- | ---------------------------- |
| GET     | `/document-templates`        | Liste templates              |
| POST    | `/document-templates/upload` | Uploader un template (.docx) |
| POST    | `/document-templates`        | Créer entrée template        |
| PATCH   | `/document-templates/:id`    | Mettre à jour template       |
| DELETE  | `/document-templates/:id`    | Supprimer template           |

---

## Sources (documents de référence)

| Méthode | Path                               | Description                                             |
| ------- | ---------------------------------- | ------------------------------------------------------- |
| GET     | `/sources`                         | Liste sources (query `?project_id=`)                    |
| POST    | `/sources/upload`                  | Uploader une source (multipart/form-data, field `file`) |
| GET     | `/sources/:id/content`             | Contenu extrait (texte)                                 |
| GET     | `/sources/:id/file`                | Télécharger le fichier original                         |
| PATCH   | `/sources/:id`                     | Mettre à jour métadonnées                               |
| DELETE  | `/sources/:id`                     | Supprimer source                                        |
| POST    | `/sources/:id/projects/:projectId` | Lier source à projet                                    |
| DELETE  | `/sources/:id/projects/:projectId` | Délier source de projet                                 |

---

## Meetings

| Méthode | Path                                 | Description                                                              |
| ------- | ------------------------------------ | ------------------------------------------------------------------------ |
| GET     | `/meetings`                          | Liste réunions                                                           |
| GET     | `/meetings/:id`                      | Détail réunion (include attendees, topics, decisions, actions, segments) |
| POST    | `/meetings`                          | Créer réunion                                                            |
| PATCH   | `/meetings/:id`                      | Mettre à jour réunion                                                    |
| DELETE  | `/meetings/:id`                      | Supprimer réunion                                                        |
| POST    | `/meetings/:id/attendees`            | Ajouter participant                                                      |
| DELETE  | `/meetings/:id/attendees/:contactId` | Retirer participant                                                      |
| POST    | `/meetings/:id/validate`             | Valider/invalider extraction CR                                          |

**Champs PATCH** : `title`, `type`, `meeting_category`, `start_at`, `end_at`, `location`, `video_link`, `project_id`, `executive_summary`, `minutes`, `raw_transcript`

### Transcription audio (via Transcripter)

| Méthode | Path                                   | Description                                                   |
| ------- | -------------------------------------- | ------------------------------------------------------------- |
| POST    | `/meetings/:id/upload-audio`           | Uploader fichier audio (multipart, field `audio`, max 500 Mo) |
| POST    | `/meetings/:id/start-transcription`    | Lancer Whisper+diarization                                    |
| GET     | `/meetings/:id/transcription-progress` | SSE — suivi temps réel                                        |
| GET     | `/meetings/:id/transcription-status`   | Statut DB de la transcription                                 |
| GET     | `/meetings/:id/audio`                  | Stream audio                                                  |

**Options start-transcription** : `{ language, model, device, diarize }` (language: fr/en, model: tiny/base/medium/large-v2, device: cpu/mps/cuda)

### Speaker diarization

| Méthode | Path                              | Description                       |
| ------- | --------------------------------- | --------------------------------- |
| GET     | `/meetings/:id/speakers`          | Liste speakers détectés           |
| POST    | `/meetings/:id/speakers/sync`     | Synchroniser depuis transcription |
| POST    | `/meetings/:id/speakers/identify` | Voice-ID automatique              |
| PATCH   | `/meetings/:id/speakers/:label`   | Assigner contact à un speaker     |
| DELETE  | `/meetings/:id/speakers`          | Réinitialiser speakers            |

---

## Project Topics

| Méthode | Path                  | Description                                |
| ------- | --------------------- | ------------------------------------------ |
| GET     | `/project-topics`     | Liste topics projet (query `?project_id=`) |
| GET     | `/project-topics/:id` | Détail topic                               |
| POST    | `/project-topics`     | Créer topic manuel                         |
| PATCH   | `/project-topics/:id` | Mettre à jour topic                        |
| DELETE  | `/project-topics/:id` | Supprimer topic                            |

**Champs** : `title`, `status`, `axes` (project_axis[]), `synthesis`, `confidence`, `owner`, `due_date`  
**ENUMs** : `status` → open/in_progress/closed/deferred · `confidence` → low/medium/high · `axes` → scope/planning/budget/resources/risk/governance/stakeholder/quality/security/change_management/benefits/dependencies/support_run

### Meeting Topics

| Méthode | Path                  | Description                                                                                       |
| ------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| POST    | `/meeting-topics`     | Créer topic de réunion                                                                            |
| PATCH   | `/meeting-topics/:id` | Lier/promouvoir topic de réunion                                                                  |
| GET     | `/topics-registry`    | Registre unifié (query `?project_id=`) — tous les meeting_topics d'un projet (promus + orphelins) |

---

## Format de réponse JSON:API

```json
// Collection
{ "data": [{ "id": "101", "type": "project", "attributes": { "title": "...", ... } }] }

// Objet unique
{ "data": { "id": "101", "type": "project", "attributes": { ... } } }

// Erreur
{ "errors": [{ "status": "400", "detail": "label is required" }] }
```

## Format de requête JSON:API

```json
{ "data": { "type": "project", "attributes": { "title": "New name" } } }
```

## Wrapper client (`api.ts`)

```typescript
api.get<JsonApiList<T>>("/resources"); // → { data: T[] }
api.post("/resources", attributes, type); // → JsonApiOne
api.patch("/resources/:id", attributes, type); // → JsonApiOne
api.del("/resources/:id"); // → void
```

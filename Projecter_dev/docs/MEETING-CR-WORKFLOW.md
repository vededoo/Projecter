# Workflow de génération de CR de réunion avec MCP Projecter

**Version** : 1.2  
**Date** : 29 mai 2026  
**Scope** : Génération et ingestion de compte-rendus structurés via GitHub Copilot (mode agent VS Code)

---

## Vue d'ensemble

Le workflow de génération de CR est entièrement orchestré par **GitHub Copilot en mode agent** dans VS Code, en utilisant les tools MCP Projecter. Il n'existe pas de prompt `generate_meeting_cr` — c'est l'IA qui pilote les étapes séquentiellement.

**Pré-requis** : Le serveur MCP doit être actif (lancé automatiquement par VS Code via `.vscode/mcp.json`).

---

## Serveur MCP actif

| Fichier                                                                  | Rôle                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `/Users/ldurpel/Development/Projects/Projecter/server/src/mcp/server.js` | **Serveur MCP actif** (23 tools) — référencé dans `.vscode/mcp.json` |
| `Projecter_dev/server/src/mcp/server.js`                                 | Version dev (13 tools) — **non utilisée** par le MCP VS Code         |

Config MCP (`.vscode/mcp.json`) :

```json
{
  "servers": {
    "projecter": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/ldurpel/Development/Projects/Projecter/server/src/mcp/server.js"
      ],
      "env": {
        "PGDATABASE": "Projecter_dev",
        "TRANSFORMER_URL": "http://localhost:5044"
      }
    }
  }
}
```

---

## Inventaire des 23 tools MCP

### Lecture projets / contacts

| Tool                      | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `list_projects`           | Lister tous les projets avec statut, RAG, métadonnées           |
| `get_project`             | Détail complet d'un projet (id ou slug)                         |
| `search_contacts`         | Recherche de contacts par nom (substring insensible à la casse) |
| `list_competency_centers` | Arbre organisationnel ETNIC (73 centres)                        |
| `list_risks`              | Risques tous projets confondus (filtrable)                      |

### Lecture réunions / transcripts

| Tool                         | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `list_meeting_transcripts`   | Lister les transcripts liés à un projet (titres, dates, résumés) |
| `get_meeting_transcript`     | Récupérer un transcript Transformer (résumé ou complet)          |
| `search_meeting_transcripts` | Recherche fulltext dans les transcripts                          |
| `list_meetings`              | Lister les réunions (filtrable par projet, extraction_status)    |

### Lecture actions / décisions

| Tool                  | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `list_open_actions`   | Toutes les actions ouvertes (filtrable par projet, surdate) |
| `get_meeting_actions` | Actions, décisions et topics d'une réunion spécifique       |

### Revue et ingestion

| Tool                        | Description                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `review_extraction`         | Vue côte-à-côte transcript brut ↔ données structurées                                 |
| `ingest_meeting_extraction` | **Outil principal** — ingère topics, décisions, actions, attendees, executive_summary |
| `set_validated`             | Marquer une extraction comme validée (ou annuler la validation)                       |

### Topics projet

| Tool                   | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `get_project_topics`   | Lister les topics stratégiques d'un projet (persistants, multi-réunions) |
| `upsert_project_topic` | Créer ou mettre à jour un topic stratégique                              |

### Sources (documents de référence)

| Tool                 | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `list_sources`       | Lister les documents de référence (filtrable par projet, type) |
| `get_source_content` | Récupérer le texte intégral d'une source (avec offset/limit)   |
| `create_source`      | Sauvegarder un document depuis le contexte de chat             |
| `update_source`      | Mettre à jour le contenu ou les métadonnées d'une source       |

### Corrections Whisper & matching phonétique

| Tool                         | Description                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `lookup_whisper_corrections` | Rechercher un token dans le dictionnaire ET/OU retrouver un contact par similarité trigramme (`include_contacts: true`) |
| `search_contacts_phonetic`   | Recherche fuzzy dédiée sur les contacts (trigramme pg_trgm, score 0–1). Alternative à `lookup_whisper_corrections`  |
| `store_whisper_suggestions`  | Stocker des tokens suspects pour revue interactive                                                                   |

> **Règle** : Avant d'écrire un nom de personne dans le CR, si le token semble approximatif ou phonétique,
> utiliser `lookup_whisper_corrections(token, include_contacts: true)`. Un score ≥ 0.3 est un match plausible.
> Exemple : "Kiné" → KINET Eric (score 0.43).

### Requête libre

| Tool       | Description                                           |
| ---------- | ----------------------------------------------------- |
| `db_query` | SELECT libre en lecture seule sur la DB Projecter_dev |

---

## Workflow pas-à-pas (9 étapes)

### Étape 1 — Charger le transcript

```
review_extraction(meeting_id, include_raw: true)
```

Retourne le transcript brut + les données structurées existantes (si déjà partiellement extrait). Permet d'évaluer si l'extraction est à faire ou à compléter.

### Étape 2 — Corriger les tokens Whisper suspects + matching phonétique des noms propres

**2a — Tokens techniques (sigles, acronymes, termes métier)**
```
lookup_whisper_corrections({ token: "OIBE" })
```

**2b — Noms de personnes suspects** : en tant qu'IA, je dois raisonner phonétiquement AVANT de conclure sur un nom.

Raisonnement phonétique (règles françaises) :
- Finale muette : "Kiné" → K-I-N-E-T → chercher "Kinet"
- "Van den X" / "Van der X" : noms composés, Whisper peut les couper ("Vanderpoel" → "VAN DER POEL")
- Apostrophe manquante : "Delacour" vs "De la Cour"
- Confusion voyelles : "Stinglaumber" → "Stinglhamber"

Outil de vérification :
```
lookup_whisper_corrections({ token: "Kiné", include_contacts: true })
// → { best_contact: { id: 14784, name: "KINET Eric", score: 0.43 } }
```
Ou, pour une recherche purement centrée contact :
```
search_contacts_phonetic({ q: "Kiné", min_score: 0.3 })
```

Un score ≥ 0.3 est un match plausible. Toujours vérifier first_name + organization avant de conclure.  
Si le token n'est pas dans le dictionnaire et qu'il y a des doutes, noter pour `store_whisper_suggestions` en fin de session.

### Étape 3 — Demander à l'utilisateur la liste des participants identifiés

⚠️ **Avant de chercher les contacts soi-même dans la DB**, utiliser `vscode_askQuestions` pour demander si l'utilisateur dispose d'une liste de participants déjà diarisée et identifiée.

```
vscode_askQuestions([{
  header: "Participants identifiés",
  question: "As-tu la liste des participants identifiés (après diarisation) ? Si oui, indique les noms — sinon je les déduis du transcript.",
  options: [
    { label: "Oui, je vais les lister dans la réponse" },
    { label: "Non, déduis-les toi-même du transcript" }
  ]
}])
```

Si l'utilisateur fournit la liste → utiliser directement ces noms pour les requêtes `contacts`.  
Si non → déduire les noms depuis le transcript (locuteurs identifiés, noms cités) puis chercher en DB.

### Étape 3bis — Identifier les contacts (attendees potentiels) en DB

```
db_query("SELECT id, last_name, first_name FROM contacts WHERE last_name ILIKE '%NOM%'")
```

Résoudre les sigles et acronymes du transcript vers des `contact_id` réels. Cette étape est critique pour éviter les homonymes (voir bug section suivante).

### Étape 4 — Récupérer les topics stratégiques existants

```
get_project_topics({ project_id_or_slug: "105" })
```

Permet de lier les `meeting_topics` à des `project_topic_id` existants. Si un topic n'existe pas encore, le créer à l'étape suivante.

### Étape 5 — Créer / mettre à jour les topics projet

```
upsert_project_topic({
  project_id: 105,
  title: "Titre du topic",
  status: "open",           // voir valeurs autorisées
  axes: ["scope", "governance"],
  synthesis: "Description ...",
  confidence: "high"        // high | medium | low
})
```

Retourne l'`id` du topic créé/mis à jour — à utiliser comme `project_topic_id` dans l'ingestion.

### Étape 6 — Ingérer le CR structuré

```
ingest_meeting_extraction({
  meeting_id: 10008,
  executive_summary: "10 lignes ...",
  topics: [{ position: 1, title: "...", type: "information", project_topic_id: 7, summary: "..." }, ...],
  decisions: [{ description: "...", impact: "...", position: 1 }, ...],
  actions: [{ description: "...", owner_raw: "JEUNIAUX", deadline: "2026-06-30" }, ...],
  attendees: [{ name_raw: "CROISELET", role: "Administrateur serveur applicatif", status: "present" }, ...]
})
```

**Attention** : chaque appel remplace intégralement les données existantes (idempotent).  
Retourne `unresolved_owners` et `unresolved_attendees` → déclencher l'étape 7 si non vides.

> **Note** : `executive_summary` est **automatiquement stocké** dans le champ `meetings.executive_summary`
> via cet appel. C'est ce champ qui s'affiche dans l'UI et dans les exports.
> Il n'est **pas** nécessaire de faire un UPDATE SQL séparé pour ce champ.

### Étape 7 — Correctif SQL pour les noms composés (si nécessaire)

Si `unresolved_owners` ou `unresolved_attendees` contient des noms (ex. `"VAN DEN DURPEL"`) :

```sql
-- Corriger les actions sans owner_id
UPDATE meeting_actions
  SET owner_id = 10007
  WHERE meeting_id = 10008 AND owner_raw = 'VAN DEN DURPEL' AND owner_id IS NULL;

-- Corriger l'attendee non résolu
UPDATE meeting_attendees
  SET status = 'present', role = 'Chef de projet WBE'
  WHERE meeting_id = 10008 AND contact_id = 10007;
```

Commande psql (sans ouvrir de session interactive) :

```bash
./server/scripts/db_query.sh "SELECT ..."
# ou
psql -d Projecter_dev -c "UPDATE ..."
```

### Étape 8 — Générer et sauvegarder le CR complet formaté

Après ingestion, générer un **CR lisible en markdown** et le sauvegarder comme source document liée au projet via `create_source`. C'est la version destinée à être partagée (chef de projet, métier, archives).

```
create_source({
  title: "CR — [Titre réunion] ([date])",
  source_type: "other",
  mime_type: "text/markdown",
  original_filename: "CR-[meeting_id]-[slug]-[YYYYMMDD].md",
  project_ids: [105],
  description: "Compte-rendu de la réunion du [date]...",
  extracted_text: "# Compte-Rendu\n\n## Participants\n...\n## Executive Summary\n...\n## Points discutés\n...\n## Décisions\n...\n## Plan d'actions\n...\n## Prochaine réunion\n..."
})
```

**Structure du CR markdown** (template) :
- `## Participants` — tableau avec Nom, Organisation, Rôle, Statut
- `## Executive Summary` — 10 lignes (identique au champ `executive_summary` en DB)
- `## Points discutés` — un sous-titre par `meeting_topic`, avec le résumé développé
- `## Décisions` — tableau des `meeting_decisions`
- `## Plan d'actions` — tableau des `meeting_actions` (responsable, échéance)
- `## Prochaine réunion` — date et objectif si annoncés

> **Note** : le champ `meetings.minutes` (texte libre) existe en DB mais n'est pas écrit par
> `ingest_meeting_extraction`. Pour l'alimenter, utiliser `db_query.sh` avec dollar-quoting
> ou préférer la source document ci-dessus (plus robuste, indexable, searchable).

### Étape 9 — Valider l'extraction

---

## Bug connu : résolution des noms composés

### Symptôme

`ingest_meeting_extraction` retourne `unresolved_owners: ["VAN DEN DURPEL"]` alors que le contact existe.

### Cause

L'algorithme de résolution extrait le **dernier mot** du `name_raw` et cherche `last_name ILIKE 'DURPEL'`.  
Or en DB, `last_name = 'VAN DEN DURPEL'` — la recherche ILIKE échoue.

```javascript
// Code dans server/src/mcp/server.js (simplifié)
const nameParts = owner_raw.trim().split(/\s+/);
// Pour "VAN DEN DURPEL" → cherche last_name ILIKE 'DURPEL'
WHERE last_name ILIKE $1  // → aucun match
```

### Contacts connus affectés

| Nom                    | contact_id | Workaround                                                           |
| ---------------------- | ---------- | -------------------------------------------------------------------- |
| VAN DEN DURPEL Laurent | 10007      | `UPDATE ... SET owner_id = 10007 WHERE owner_raw = 'VAN DEN DURPEL'` |

### Workaround (étape 7 ci-dessus)

Après ingestion, exécuter les UPDATE SQL directement. Toujours vérifier `unresolved_owners` dans le retour de `ingest_meeting_extraction`.

---

## Bug connu : homonymes dans la résolution des attendees

### Symptôme

Un faux contact est inséré (ex. Christine LEBRUN au lieu de Vincent LEBRUN).

### Cause

La requête `ILIKE last_name LIMIT 1` sans `ORDER BY` retourne un résultat non déterministe quand plusieurs contacts partagent le même `last_name`.

### Workaround

Après ingestion, vérifier les attendees avec `db_query` et corriger manuellement :

```sql
-- Identifier les faux doublons
SELECT ma.id, c.last_name, c.first_name, ma.status, ma.role
FROM meeting_attendees ma JOIN contacts c ON c.id = ma.contact_id
WHERE ma.meeting_id = ?;

-- Supprimer le faux doublon
DELETE FROM meeting_attendees WHERE id = ?;

-- Corriger l'entrée réelle
UPDATE meeting_attendees SET status = 'present', role = '...' WHERE id = ?;
```

---

## Valeurs autorisées

### `meeting_topics.type`

```
information | decision | action | risk | issue | open_point | other
```

### `meeting_attendees.status`

```
present | excused | absent | invited
```

### `project_topics.status`

```
open | on_hold | invalidated | closed
```

⚠️ `in_progress` n'existe **pas** — utiliser `open`.

### `project_topics.axes` (tableau)

13 valeurs — ENUM `project_axis` (migration 015) :

```
scope | planning | budget | resources | risk | governance | stakeholder
| quality | security | change_management | benefits | dependencies | support_run
```

⚠️ `risks` (avec s), `communications` et `other` **n'existent pas** — utiliser `risk` et `change_management`.

### `meeting_topics.commitment_level`

Niveau d'engagement exprimé sur un topic lors de la réunion :

```
mentioned     — évoqué, sans engagement
acknowledged  — pris en compte / acté
agreed        — accord de principe
decided       — décision formelle
```

Valeur par défaut dans `ingest_meeting_extraction` : `mentioned`.

### `project_topics.confidence`

```
high | medium | low
```

---

## Champs texte meetings : raw_transcript vs minutes vs ai_report

| Champ               | Type    | Rôle                                                                                                                                                                                                          |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `raw_transcript`    | `text`  | Source brute **immuable** — transcript Whisper ou texte collé. Écrit via `ingest_meeting_extraction`. Ne pas toucher après ingestion.                                                                         |
| `minutes`           | `text`  | CR **lisible** (markdown) destiné à être partagé. Optionnel, écrit par PATCH ou LLM.                                                                                                                          |
| `ai_report`         | `jsonb` | Rapport structuré **machine**. Convention : `{ executive_summary, topics[], decisions[], actions[], attendees[], generated_at }`. Non écrit par `ingest_meeting_extraction` — usage futur ou pipeline séparé. |
| `executive_summary` | `text`  | Résumé scalaire (10 lignes). Écrit directement par `ingest_meeting_extraction`. C’est ce champ qui apparaît dans l’UI.                                                                                        |

---

## Schéma de données simplifié

```
meetings (id, title, type, start_at, project_id, extraction_status, executive_summary, raw_transcript)
  ├── meeting_topics (position, title, summary, type, project_topic_id)
  ├── meeting_decisions (description, impact, position)
  ├── meeting_actions (description, owner_id→contacts, owner_raw, deadline, status)
  └── meeting_attendees (contact_id→contacts, status, role)

project_topics (project_id→projects, title, status, axes[], synthesis, confidence)
  └── référencé par meeting_topics.project_topic_id
```

---

## Exemple complet : réunion 10008

**Réunion** : "WBE : Infra pour application PICO : périmètre" (2026-05-13)  
**Projet** : 105 "WBE PICO"

```
Étape 1 : review_extraction(10008, include_raw: true)
           → transcript 84KB chargé

Étape 2 : lookup_whisper_corrections("OIBE") → aucun match (token OK)

Étape 3 : vscode_askQuestions("As-tu la liste des participants identifiés ?")
           → utilisateur répond non → déduction depuis le transcript

Étape 3bis : db_query("SELECT id, last_name, first_name FROM contacts
                    WHERE last_name ILIKE '%KINET%' OR last_name ILIKE '%LEBRUN%'")
           → Eric KINET (14784), Vincent LEBRUN (10490), plusieurs homonymes détectés

Étape 4 : get_project_topics(105) → 0 topics existants

Étape 5 : upsert_project_topic → PT7 "Migration infrastructure ETNIC" (axes: scope, dependencies, governance)
           upsert_project_topic → PT8 "Gouvernance post-migration : reprise C#" (axes: governance, resources)

Étape 6 : ingest_meeting_extraction(10008, topics×7, decisions×4, actions×6, attendees×6)
           → executive_summary stocké automatiquement dans meetings.executive_summary
           → unresolved_owners: ["VAN DEN DURPEL", "VAN DEN DURPEL"]
           → unresolved_attendees: ["VAN DEN DURPEL"]
           → homonymes détectés : faux KINET (Fabian) + faux LEBRUN (Christine)

Étape 7 : DELETE meeting_attendees WHERE id IN (faux Fabian, faux Christine)
           UPDATE meeting_attendees SET status='present', role='...' WHERE id IN (Eric, Vincent, Laurent)
           UPDATE meeting_actions SET owner_id=10007 WHERE owner_raw='VAN DEN DURPEL'

Étape 8 : create_source({ title: "CR — WBE PICO : Infra périmètre (13/05/2026)", source_type: "other",
           mime_type: "text/markdown", project_ids: [105], extracted_text: "# CR...\n..." })
           → source_id créé, lié au projet 105

Étape 9 : set_validated({ meeting_id: 10008, validated: true })
```

Résultat final : 7 topics, 4 décisions, 6 actions (toutes avec owner_id), 6 attendees corrects, CR source #id créé.

---

## Checklist de validation

Après ingestion, vérifier :

- [ ] `extraction_status = 'success'`
- [ ] `executive_summary IS NOT NULL` (stocké automatiquement via `ingest_meeting_extraction`)
- [ ] Nombre de topics / décisions / actions conforme au transcript
- [ ] Tous les `owner_id` renseignés (0 actions sans owner si owners identifiés)
- [ ] 0 `unresolved_attendees` (ou correctif SQL appliqué)
- [ ] Pas d'homonymes (vérifier last_name/first_name de chaque attendee)
- [ ] `project_topic_id` renseigné sur les topics pertinents
- [ ] CR formaté sauvegardé comme source document (`create_source`, lié au projet)

Pour marquer le CR comme validé après vérification :

```
set_validated({ meeting_id: 10008, validated: true })
```

---

## Bonnes pratiques : titres de project_topics

Les `project_topics` sont des **thèmes stratégiques persistants** qui survivent à de nombreuses réunions. Ils apparaissent dans l'onglet **Topics** de la page de détail du projet et représentent l'état courant des enjeux du projet.

### ⚠️ Piège : titres orientés « réunion »

Quand vous créez un `project_topic` depuis un `meeting_topic`, évitez les titres contextuels liés à la réunion :

| ❌ Éviter (trop contextuel)                               | ✅ Préférer (intemporel)                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Discussion sur la migration lors de la réunion du 13/05` | `Migration infrastructure ETNIC (SQL Server + serveur applicatif)`            |
| `Point de situation Pico suite au départ de Kinet`        | `Gouvernance post-migration : reprise applicative C# et point de contact WBE` |
| `Décision prise en COPIL du 5 mai sur le budget`          | `Budget projet PICO — arbitrage phase 2`                                      |
| `Suivi des risques évoqués en réunion`                    | `Risques de transition : dépendances ETNIC / calendrier retraite`             |

### Règle de formulation

Un titre de `project_topic` doit rester lisible **hors contexte de la réunion**, comme s'il était affiché seul dans un tableau de bord projet. Posez-vous la question :

> _« Si quelqu'un lit ce titre dans 6 mois sans avoir participé à la réunion, comprend-il de quoi il s'agit ? »_

Si la réponse est non → reformuler en termes de thème, livrable ou décision stratégique.

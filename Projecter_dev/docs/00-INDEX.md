# Projecter — Index de la documentation

> **Projet** : Gestion de portefeuille de projets ETNIC ↔ WBE  
> **Stack** : React+TypeScript (CRA) · Node.js/Express · PostgreSQL  
> **Ports DEV** : Client 3054 · Server 5054 · Caddy 60054 · Externe 6054

---

## 📁 Docs dans ce dossier

| Fichier                            | Description                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| `SCHEMA-FIELDS.md`                 | Mapping champs documents → schéma DB, décisions d'architecture |
| `MCP-SETUP.md`                     | Serveur MCP (Claude Desktop / VS Code Copilot Chat)            |
| `MEETING-CR-WORKFLOW.md`           | Workflow génération CR via MCP (tools, étapes, bugs connus)    |
| `2-SERVER/api-endpoints.md`        | Référence complète des endpoints REST                          |
| `4-DATABASE/migrations-history.md` | Historique et objectif de chaque migration SQL                 |
| `shared-docs/`                     | Documentation partagée MSA (ports, patterns, notifications…)   |

---

## 🗂️ Structure du projet

```
Projecter/
├── client/              # React + TypeScript (CRA via craco)
│   └── src/
│       ├── pages/       # ProjectsPage, ProjectDetailPage, MeetingsPage, RisksPage, …
│       ├── components/  # InlineEdit, Modal, ConfirmDialog, ProjectFormModal, ContactFormModal
│       └── api.ts       # Wrapper axios (JSON:API helper)
├── server/
│   ├── src/
│   │   ├── controllers/ # Un fichier par ressource
│   │   ├── routes/index.js  # Toutes les routes
│   │   ├── services/    # docGenerator, docExtractor, embedder
│   │   ├── templates/   # mandat.docx, expose.docx, fiche-projet.docx
│   │   └── mcp/         # Serveur MCP (stdio)
│   └── scripts/
│       └── db_query.sh  # Wrapper psql (timeout 5s)
├── database/
│   ├── migrations/      # 001 → 015 (voir 4-DATABASE/migrations-history.md)
│   └── seeds/           # Référentiels + contacts récurrents
├── docs/                # ← CE DOSSIER
└── storage/
    ├── uploads/         # Fichiers uploadés (docx, pdf, audio…)
    └── generated/       # Docx générés depuis templates
```

---

## 🔑 Conventions clés

- **Format API** : JSON:API obligatoire — `{ data: { type, attributes } }`
- **DB** : `./server/scripts/db_query.sh "SELECT …"` — jamais `psql` direct
- **ENUMs** : toujours caster côté server (`$1::project_status`, `$2::urgence_level`)
- **JSONB** : passer `JSON.stringify(obj)` côté pg (highlights, concerns, next_steps, attributes)
- **Inline editing** : composant `InlineEdit` (double-clic → save onBlur/Enter, cancel Escape)
- **Notifications** : `flash()` local dans chaque page (pas de `alert()`)
- **PM2** : `pm2 restart projecter_dev_server` après toute modif serveur

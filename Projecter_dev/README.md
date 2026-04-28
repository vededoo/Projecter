# Projecter

Application MSA de gestion de portefeuille de projets ETNIC ↔ WBE.

Cycle géré : **Mandat de Projet → Exposé de Projet → Fiche Projet → Suivi**.

## Stack

- **Server** : Node.js + Express + PostgreSQL (`Projecter_dev`)
- **Client** : React + TypeScript (CRA)
- **DocGen** : `docxtemplater` (templates `.docx` dans `server/templates/`)
- **RAG** : pgvector (Phase 4)
- **MCP** : serveur dédié pour intégration VSCode Copilot (Phase 4)
- **Reverse-proxy** : Caddy (via `Languapp/Caddyfile` maître)

## Ports DEV (POS 05)

| Type                      | Port                               |
| ------------------------- | ---------------------------------- |
| Externe (HTTPS via Caddy) | 6054                               |
| Caddy local               | 60054                              |
| Client React              | 3054                               |
| Server Node               | 5054                               |
| DB                        | `Projecter_dev` (PostgreSQL local) |

URL externe : `https://msa.hopto.org:6054`

## Structure

```
Projecter_dev/
├── client/              # React + TS (CRA)
├── server/              # Express + PG
│   ├── controllers/
│   ├── services/        # docGenerator, docExtractor, embedder
│   ├── routes/
│   ├── middleware/
│   ├── templates/       # mandat.docx, expose.docx, fiche-projet.docx
│   ├── mcp/             # serveur MCP (process séparé)
│   └── scripts/         # db_query.sh, ...
├── database/
│   ├── migrations/      # 001_init_schema.sql, ...
│   └── seeds/           # 001_referentials.sql, ...
├── storage/
│   ├── uploads/         # docx reçus (Mandats WBE...)
│   └── generated/       # docx générés depuis templates
├── docs/
│   ├── SCHEMA-FIELDS.md       # Mapping champs → schéma DB
│   └── shared-docs → /Shared/docs
└── ecosystem.config.js  # PM2
```

## Statut

**Phase 0 — Cadrage et fondations** (en cours)

- [x] Analyse des 3 docx exemples
- [x] Schéma des champs (`docs/SCHEMA-FIELDS.md`)
- [x] Migration SQL initiale
- [x] Seed référentiels + contacts récurrents
- [ ] Templates `.docx` avec placeholders
- [ ] Réservation POS 05 dans `Shared/docs/PORTS-REGISTRY.md`
- [ ] Bloc Caddyfile

Plan complet : voir mémoire de session `/memories/session/plan.md`.

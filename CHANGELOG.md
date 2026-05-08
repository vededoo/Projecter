# Changelog

## [1.0.4] - 2026-05-08

## ✨ Nouvelles fonctionnalités
- UI génération document — bouton Generate + select template + download dans ProjectDetailPage
- docxtemplater generation + GET /documents/:id/file + package-lock.json
- fileManager + config dirkeys (sources/templates/documents/exports) + migration 009 document_templates
- sources delete + file preview + sources in project detail + add/remove member
- meetings full flow — create form, edit panel, Transformer webhook
- Transformer integration — meetings own the transcript lifecycle
## 🐛 Corrections
- project members — CC auto-fill from primary membership (COALESCE + backfill + LATERAL)
## 📚 Documentation
- mise à jour du CHANGELOG pour v1.0.3
## 🔄 Refactorisation
- localFileManager (délègue FileManagerCore) + documentTemplatesController + routes
- flatten repo structure — move Projecter_dev/* to root
## 🔹 Autres changements
- fix+feat: pdf-parse v2 API + RisksPage CRUD + link/unlink project
- fix(sources): getContent — pagination with substr() + return content/total_chars/has_more
- fix(sources): auto-description from extracted text; fallback code→title in all project badges
- fix(sources): remove remaining orphan code after SourcesPage (lines 408-448)
- fix(sources): remove duplicate SourcesPage export (caused compile loop)
- fix(risks): N-to-N via v_risks (drop project_id filter) — fix 500 on project detail; feat(sources): detail panel + project link/unlink UI
- feat(sources): N-to-N sources↔projects — migration 007, controller, routes, MCP, UI tab
- feat(sources): upload pipeline — parser docx/xlsx/pdf/txt + route POST upload
- feat(sources): project_sources table + 4 MCP tools (list/get/create/update)
- feat(risks): N-to-N risks↔projects + DACI on decisions (migration 005 + MCP update)
- feat(meetings): structured extraction tables + MCP tools

## [1.0.3] - 2026-05-05

## ✨ Nouvelles fonctionnalités
- mini migration runner + UI projet creation
## 📚 Documentation
- mise à jour du CHANGELOG pour v1.0.2
## 🔹 Autres changements
- feat(db): mini migration runner + UI projet (création)
- feat(db): migration 002 - contacts Azure/Graph sync columns

## [1.0.2] - 2026-04-29

## 📚 Documentation
- mise à jour du CHANGELOG pour v1.0.1
## 🔹 Autres changements
- fix(client): spread attributes before id override (TS2783)

## [1.0.1] - 2026-04-29

## 📚 Documentation
- mise à jour du CHANGELOG pour v1.0.0
## 🔹 Autres changements
- fix(client): target es2015 to allow Set spread (fix TS2802 in prod build)

## [1.0.0] - 2026-04-29

## ✨ Nouvelles fonctionnalités
- ajouter les users via MS Graph
## 📚 Documentation
- mise à jour du CHANGELOG pour v0.1.0

## [0.1.0] - 2026-04-28

## ✨ Nouvelles fonctionnalités
- add deploy.sh and activate PRD blocks in ecosystem.config.js
## 🐛 Corrections
- convert Projecter_dev/client from gitlink to regular tree
## 🔧 Maintenance
- bootstrap Projecter top-level repo (PM2 ecosystem, .gitignore, copilot instructions)
## 🔹 Autres changements
- fix(deploy): correct bash conditional syntax


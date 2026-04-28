# Instructions pour GitHub Copilot - Projecter

**Version**: 1.0  
**Date**: 28 avril 2026  
**Projet**: Projecter (Application de gestion de projets / portefeuille)

> Ce fichier est volontairement minimal pour économiser la context window.
> La documentation complète est dans `Projecter_dev/docs/` et `Projecter_dev/docs/shared-docs/`.

## Règles essentielles

- **Ports** : Client 3054 / Server 5054 / Caddy 60054 / Externe 6054 (DEV)
- **Format API** : JSON:API obligatoire (`data.attributes`)
- **UI strings** : English only. Use `useNotifications()` / `useConfirm()`. No `alert()`, no `window.confirm()`, no empty `catch{}`. Voir `docs/shared-docs/3-PATTERNS/notifications-architecture.md`.
- **Logging** : Winston + emojis (🚀 📥 ✅ ❌ 🗄️)
- **PM2** : `pm2 restart projecter_dev_server` après modifs serveur
- **DB** : PostgreSQL `Projecter_dev` (user `ldurpel`). Ne jamais `psql` direct.
- **Environnement DEV** : Travailler dans `Projecter_dev/client` et `Projecter_dev/server`
- **ENUMs PostgreSQL** : Toujours caster (`$4::project_status`, `$5::urgence_level`)
- **JSONB** : Passer `JSON.stringify(...)` côté pg, pas l'objet brut
- **Doc partagée** : `Projecter_dev/docs/shared-docs/` (symlink vers Shared/docs)

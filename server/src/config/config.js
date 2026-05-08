'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Environnement ────────────────────────────────────────────────────────────
// CURRENT_ENVIRONMENT = DEV | PRD (défini dans .env)
// ROOT_PATH = racine sur le volume backupé (ex: /Volumes/LOAD/WORK EXTENSION/Projects)
const currentEnv = process.env.CURRENT_ENVIRONMENT || 'DEV';
const rootPath   = process.env.ROOT_PATH;           // obligatoire si fileManager utilisé
const basePath   = rootPath ? path.join(rootPath, currentEnv) : null;

// ─── Dirkeys ──────────────────────────────────────────────────────────────────
// Chaque clé pointe vers un sous-dossier du volume backupé.
// Utilisées par fileManager pour résoudre les chemins physiques.
//
//   sources/     → documents sources uploadés (PDF, Office, …)
//   templates/   → templates .docx (docxtemplater)
//   documents/   → .docx générés depuis templates
//   exports/     → exports texte / rapport PDF
//
const directories = {
  sources:   { path: 'sources/'   },
  templates: { path: 'templates/' },
  documents: { path: 'documents/' },
  exports:   { path: 'exports/'   },
};

let baseDirPaths = null;
if (basePath) {
  baseDirPaths = Object.fromEntries(
    Object.entries(directories).map(([key, { path: sub, subDirCut }]) => [
      key,
      { path: path.join(basePath, sub), subDirCut },
    ])
  );
  console.log(`📂 Storage root : ${basePath}`);
} else {
  // Fallback local (pas de ROOT_PATH → stockage dans server/storage/)
  const localBase = path.join(__dirname, '../storage');
  baseDirPaths = Object.fromEntries(
    Object.entries(directories).map(([key, { path: sub }]) => [
      key,
      { path: path.join(localBase, sub) },
    ])
  );
  console.warn('⚠️  ROOT_PATH non défini — stockage local (server/storage/)');
}

// ─── Backup paths ─────────────────────────────────────────────────────────────
// Accès aux deux environnements depuis n'importe quel contexte
const backupPaths = rootPath
  ? { dev: path.join(rootPath, 'DEV'), prd: path.join(rootPath, 'PRD') }
  : null;

module.exports = { baseDirPaths, backupPaths, currentEnv };

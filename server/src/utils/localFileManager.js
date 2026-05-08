'use strict';
/**
 * Projecter — LocalFileManager
 *
 * Délègue TOUTES les opérations File System à FileManagerCore (Services/_shared).
 * Ce fichier n'importe JAMAIS `fs` / `fs.promises` directement.
 *
 * Logique métier Projecter :
 *   - Résolution par dirkeys : sources | templates | documents | exports
 *   - Chemins plats (pas de sharding), ex : resolvePath('sources', '1746700000000.docx')
 *
 * En PRD, deploy.sh remplace Services_dev → Services_prd.
 *
 * @module localFileManager
 * @version 1.0.0
 */

// En PRD, deploy.sh remplace Services_dev → Services_prd
const FileManagerCore = require('../../../../Services/Services_dev/_shared/utils/FileManagerCore');
const { baseDirPaths } = require('../config/config');
const logger = require('./logger');

const MODULE = 'localFileManager';

class LocalFileManager {
  constructor() {
    this.baseDirPaths = baseDirPaths;
    this.core = new FileManagerCore(baseDirPaths, {
      info:  (_m, _fn, msg)       => logger.info(`📂 [${MODULE}] ${msg}`),
      error: (_m, _fn, msg, meta) => logger.error(`❌ [${MODULE}] ${msg}`, meta || {}),
      warn:  (_m, _fn, msg)       => logger.warn(`⚠️  [${MODULE}] ${msg}`),
      debug: (_m, _fn, msg)       => logger.debug(`📂 [${MODULE}] ${msg}`),
    });
  }

  // ── Résolution de chemin (logique métier Projecter) ──────────────────────────

  /**
   * Retourne le chemin absolu pour un dirkey + nom de fichier optionnel.
   * @param {string} dirKey   - 'sources' | 'templates' | 'documents' | 'exports'
   * @param {string} [filename] - nom du fichier (ex: '1746700000000.docx')
   */
  resolvePath(dirKey, filename = null) {
    const dirConfig = this.baseDirPaths[dirKey];
    if (!dirConfig) throw new Error(`localFileManager: invalid dirKey "${dirKey}"`);
    return filename
      ? this.core.joinPath(dirConfig.path, filename)
      : dirConfig.path;
  }

  /**
   * Retourne le chemin du dossier racine d'un dirkey.
   */
  dirPath(dirKey) {
    return this.resolvePath(dirKey);
  }

  // ── Initialisation ────────────────────────────────────────────────────────────

  /**
   * Crée tous les dossiers manquants au démarrage de l'app.
   */
  async ensureDirectories() {
    for (const [key, cfg] of Object.entries(this.baseDirPaths)) {
      await this.core.ensureDirectory(cfg.path);
      logger.debug(`📂 [${MODULE}] dirKey "${key}" → ${cfg.path}`);
    }
  }

  // ── Opérations répertoires ────────────────────────────────────────────────────

  async createDirectory(dirPath) {
    return this.core.createDirectory(dirPath);
  }

  createDirectorySync(dirPath) {
    return this.core.createDirectorySync(dirPath);
  }

  // ── Lecture / écriture ────────────────────────────────────────────────────────

  async readFile(fullPath, encoding = 'utf8') {
    return this.core.readFile(fullPath, encoding);
  }

  async readFileBinary(fullPath) {
    return this.core.readFileBuffer(fullPath);
  }

  async writeFile(fullPath, content, encoding = 'utf8') {
    // encoding null → écriture binaire (Buffer) — on s'assure que le dossier existe
    await this.core.ensureDirectory(this.core.dirname(fullPath));
    return this.core.writeFile(fullPath, content, encoding);
  }

  writeFileSync(fullPath, content) {
    return this.core.writeFileSync(fullPath, content);
  }

  // ── Existence / stat ──────────────────────────────────────────────────────────

  /**
   * Vérifie l'existence d'un fichier (version sync, sans bloquer le process).
   */
  exists(fullPath) {
    return this.core.existsSync(fullPath);
  }

  stat(fullPath) {
    return this.core.getFileStats(fullPath);
  }

  // ── Copie / déplacement / suppression ────────────────────────────────────────

  copyFile(src, dest) {
    this.core.ensureDirectory(this.core.dirname(dest)).catch(() => {});
    this.core.copyFileSync(src, dest);
    return true;
  }

  moveFile(src, dest) {
    try {
      this.core.renameSync(src, dest);
      return true;
    } catch (err) {
      // cross-device fallback
      if (err.code === 'EXDEV') {
        try {
          this.core.copyFileSync(src, dest);
          this.core.unlinkSync(src);
          return true;
        } catch {
          return false;
        }
      }
      logger.error(`❌ [${MODULE}] moveFile ${src} → ${dest}`, { error: err.message });
      return false;
    }
  }

  async deleteFile(fullPath) {
    try {
      await this.core.unlink(fullPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return true; // déjà supprimé
      logger.error(`❌ [${MODULE}] deleteFile ${fullPath}`, { error: err.message });
      return false;
    }
  }

  // ── Streaming ─────────────────────────────────────────────────────────────────

  createReadStream(fullPath) {
    return this.core.createReadStream(fullPath);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  joinPath(...args) {
    return this.core.joinPath(...args);
  }

  basename(fullPath) {
    return this.core.basename(fullPath);
  }
}

module.exports = new LocalFileManager();

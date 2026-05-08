'use strict';
/**
 * Projecter — FileManager
 *
 * RÈGLE : seul ce fichier est autorisé à utiliser `fs` / `fs.promises`.
 * Aucun autre module ne doit importer `fs` directement.
 *
 * Les chemins sont résolus depuis `baseDirPaths` (config.js → ROOT_PATH + env).
 * Dirkeys disponibles : sources | templates | documents | exports
 */

const fss  = require('fs');
const fs   = require('fs').promises;
const path = require('path');
const { baseDirPaths } = require('../config/config');
const logger = require('./logger');

const MODULE = 'fileManager';

class FileManager {
  constructor() {
    this.baseDirPaths = baseDirPaths;
  }

  // ── Résolution de chemin ────────────────────────────────────────────────────

  /**
   * Retourne le chemin absolu pour un dirkey + nom de fichier optionnel.
   * @param {string} dirKey   - 'sources' | 'templates' | 'documents' | 'exports'
   * @param {string} [filename] - nom du fichier (ex: '1746700000000.docx')
   */
  resolvePath(dirKey, filename = null) {
    const dirConfig = this.baseDirPaths[dirKey];
    if (!dirConfig) throw new Error(`FileManager: invalid dirKey "${dirKey}"`);
    return filename ? path.join(dirConfig.path, filename) : dirConfig.path;
  }

  /**
   * Retourne le chemin du dossier racine d'un dirkey.
   */
  dirPath(dirKey) {
    return this.resolvePath(dirKey);
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  /**
   * Crée tous les dossiers manquants au démarrage de l'app.
   */
  async ensureDirectories() {
    for (const [key, cfg] of Object.entries(this.baseDirPaths)) {
      await this.createDirectory(cfg.path);
      logger.debug(`📂 [${MODULE}] dirKey "${key}" → ${cfg.path}`);
    }
  }

  // ── Opérations répertoires ──────────────────────────────────────────────────

  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (err) {
      logger.error(`❌ [${MODULE}] createDirectory ${dirPath}`, { error: err.message });
      return false;
    }
  }

  createDirectorySync(dirPath) {
    try {
      fss.mkdirSync(dirPath, { recursive: true });
      return true;
    } catch (err) {
      logger.error(`❌ [${MODULE}] createDirectorySync ${dirPath}`, { error: err.message });
      return false;
    }
  }

  // ── Lecture / écriture ──────────────────────────────────────────────────────

  async readFile(fullPath, encoding = 'utf8') {
    try {
      return await fs.readFile(fullPath, encoding);
    } catch (err) {
      logger.error(`❌ [${MODULE}] readFile ${fullPath}`, { error: err.message });
      throw err;
    }
  }

  async readFileBinary(fullPath) {
    return this.readFile(fullPath, null);
  }

  async writeFile(fullPath, content, encoding = 'utf8') {
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, encoding);
    } catch (err) {
      logger.error(`❌ [${MODULE}] writeFile ${fullPath}`, { error: err.message });
      throw err;
    }
  }

  async writeFileBinary(fullPath, buffer) {
    return this.writeFile(fullPath, buffer, null);
  }

  writeFileSync(fullPath, content) {
    try {
      fss.mkdirSync(path.dirname(fullPath), { recursive: true });
      fss.writeFileSync(fullPath, content);
    } catch (err) {
      logger.error(`❌ [${MODULE}] writeFileSync ${fullPath}`, { error: err.message });
      throw err;
    }
  }

  // ── Existence / stat ────────────────────────────────────────────────────────

  async exists(fullPath) {
    try {
      await fs.stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async stat(fullPath) {
    try {
      return await fs.stat(fullPath);
    } catch {
      return null;
    }
  }

  // ── Copie / déplacement / suppression ──────────────────────────────────────

  async copyFile(src, dest) {
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      return true;
    } catch (err) {
      logger.error(`❌ [${MODULE}] copyFile ${src} → ${dest}`, { error: err.message });
      return false;
    }
  }

  async moveFile(src, dest) {
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.rename(src, dest);
      return true;
    } catch (err) {
      // rename cross-device → fallback copy+delete
      if (err.code === 'EXDEV') {
        const ok = await this.copyFile(src, dest);
        if (ok) await this.deleteFile(src);
        return ok;
      }
      logger.error(`❌ [${MODULE}] moveFile ${src} → ${dest}`, { error: err.message });
      return false;
    }
  }

  async deleteFile(fullPath) {
    try {
      await fs.unlink(fullPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return true; // déjà supprimé
      logger.error(`❌ [${MODULE}] deleteFile ${fullPath}`, { error: err.message });
      return false;
    }
  }

  // ── Streaming (pour servir les fichiers via Express) ────────────────────────

  /**
   * Renvoie un ReadStream prêt à être pipé dans res.
   * @param {string} fullPath
   */
  createReadStream(fullPath) {
    return fss.createReadStream(fullPath);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  joinPath(...args) {
    return path.join(...args);
  }

  basename(fullPath) {
    return path.basename(fullPath);
  }
}

module.exports = new FileManager();

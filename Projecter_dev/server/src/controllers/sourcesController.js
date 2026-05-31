'use strict';
const path        = require('path');
const { query }   = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger      = require('../utils/logger');
const fileManager = require('../utils/localFileManager');
const { parseDocument } = require('../services/documentParser');

const VIEW_COLS = `id, title, source_type, description,
                   extraction_status, extraction_error, extracted_chars,
                   storage_path, original_filename, mime_type, file_size_bytes,
                   uploaded_by_contact_id, created_at, updated_at, projects`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /sources  (toutes les sources, tous projets confondus)
// ─────────────────────────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { project_id, source_type } = req.query;
    const conds = []; const params = [];
    if (project_id) {
      params.push(project_id);
      conds.push(`id IN (SELECT source_id FROM source_projects WHERE project_id = $${params.length})`);
    }
    if (source_type) { params.push(source_type); conds.push(`source_type = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_sources ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(serialize('source', rows));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /sources/:id/content?offset=0&limit=40000
// ─────────────────────────────────────────────────────────────────────────────
exports.getContent = async (req, res, next) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const limit  = Math.min(80000, Math.max(1, parseInt(req.query.limit) || 40000));
    const { rows } = await query(
      `SELECT id, title, source_type, description, extraction_status, extraction_error,
              original_filename, mime_type, file_size_bytes,
              length(extracted_text)              AS total_chars,
              substr(extracted_text, $2::int, $3::int) AS content,
              created_at, updated_at
         FROM sources WHERE id = $1`,
      [req.params.id, offset + 1, limit]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Source not found'));
    const r = rows[0];
    const returned_chars = (r.content || '').length;
    res.json(serialize('source', {
      ...r,
      offset,
      returned_chars,
      has_more: offset + returned_chars < (r.total_chars || 0),
    }));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /sources/upload  (multipart/form-data)
// Champs form-data :
//   file         (obligatoire)
//   title        (optionnel) — défaut = nom du fichier
//   source_type  (optionnel) — pc_list | directive | spec | contract | ...
//   description  (optionnel)
//   project_ids  (optionnel) — JSON array d'ids ex: "[1,3]" ou "1" (single)
// ─────────────────────────────────────────────────────────────────────────────
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse(400, 'No file provided (field: file)'));
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const title       = req.body.title       || path.parse(originalname).name;
    const source_type = req.body.source_type || null;
    const description = req.body.description || null;

    // Lire les project_ids liés (optionnel)
    let projectIds = [];
    if (req.body.project_ids) {
      try {
        const raw = req.body.project_ids;
        projectIds = Array.isArray(raw)
          ? raw.map(Number)
          : typeof raw === 'string' && raw.startsWith('[')
            ? JSON.parse(raw).map(Number)
            : [Number(raw)];
        projectIds = projectIds.filter(n => !isNaN(n) && n > 0);
      } catch { projectIds = []; }
    }

    // Parser le document
    logger.info(`📥 Parsing source: ${originalname} (${size} bytes)`);
    const { text, status: extractionStatus, error: extractionError } = await parseDocument(buffer, originalname);

    // Auto-description depuis le texte extrait si absente
    let autoDescription = description;
    if (!autoDescription && text && text.trim()) {
      const firstBlock = text.trim().split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
      autoDescription = firstBlock.length > 280 ? firstBlock.slice(0, 277) + '…' : firstBlock;
    }

    // Stocker le fichier original via fileManager (dirkey 'sources')
    const ext      = path.extname(originalname);
    const filename = `${Date.now()}${ext}`;
    const fullPath = fileManager.resolvePath('sources', filename);
    await fileManager.writeFile(fullPath, buffer, null);
    const storagePath = filename; // chemin relatif au dossier sources

    // Insérer la source
    const { rows } = await query(
      `INSERT INTO sources
         (title, source_type, description,
          extracted_text, extraction_status, extraction_error,
          storage_path, original_filename, mime_type, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, source_type, extraction_status,
                 length(extracted_text) AS extracted_chars, created_at`,
      [title, source_type, autoDescription,
       text || null, extractionStatus, extractionError || null,
       storagePath, originalname, mimetype, size]
    );
    const sourceId = rows[0].id;

    // Lier aux projets demandés
    for (const pid of projectIds) {
      await query(
        `INSERT INTO source_projects (source_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [sourceId, pid]
      );
    }

    // Retourner la vue complète
    const { rows: full } = await query(
      `SELECT ${VIEW_COLS} FROM v_sources WHERE id = $1`, [sourceId]
    );
    logger.info(`✅ Source uploaded: ${sourceId} — ${originalname} → ${extractionStatus}`);
    res.status(201).json(serialize('source', full[0]));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /sources/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const EDITABLE = ['title', 'source_type', 'description'];
    const sets = []; const vals = []; let i = 1;
    for (const f of EDITABLE) {
      if (a[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(a[f]); }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    await query(`UPDATE sources SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_sources WHERE id = $${i}`, vals);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Source not found'));
    res.json(serialize('source', rows[0]));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /sources/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const { rows } = await query(
      `DELETE FROM sources WHERE id = $1 RETURNING id, storage_path`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Source not found'));
    if (rows[0].storage_path) {
      const full = fileManager.resolvePath('sources', rows[0].storage_path);
      await fileManager.deleteFile(full);
    }
    logger.info(`🗑️  Source deleted: ${rows[0].id}`);
    res.status(204).end();
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /sources/:id/projects/:projectId  — lier une source à un projet
// ─────────────────────────────────────────────────────────────────────────────
exports.linkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    const context = req.body?.data?.attributes?.context || null;
    await query(
      `INSERT INTO source_projects (source_id, project_id, context)
       VALUES ($1, $2, $3) ON CONFLICT (source_id, project_id)
       DO UPDATE SET context = EXCLUDED.context`,
      [id, projectId, context]
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_sources WHERE id = $1`, [id]);
    res.json(serialize('source', rows[0]));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /sources/:id/file  — serve le fichier original
// ─────────────────────────────────────────────────────────────────────────────
exports.serveFile = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT storage_path, original_filename, mime_type FROM sources WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0] || !rows[0].storage_path) {
      return res.status(404).json(errorResponse(404, 'Source not found or no file stored'));
    }
    const { storage_path, original_filename, mime_type } = rows[0];
    const filePath = fileManager.resolvePath('sources', storage_path);
    if (!fileManager.exists(filePath)) {
      return res.status(404).json(errorResponse(404, 'File not found on disk'));
    }
    const isPdf = (mime_type || '').includes('pdf');
    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${isPdf ? 'inline' : 'attachment'}; filename="${encodeURIComponent(original_filename || 'file')}"`
    );
    fileManager.createReadStream(filePath).pipe(res);
    logger.info(`📄 Source file served: ${req.params.id}`);
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /sources/:id/projects/:projectId  — délier une source d'un projet
// ─────────────────────────────────────────────────────────────────────────────
exports.unlinkProject = async (req, res, next) => {
  try {
    await query(
      `DELETE FROM source_projects WHERE source_id = $1 AND project_id = $2`,
      [req.params.id, req.params.projectId]
    );
    res.status(204).end();
  } catch (e) { next(e); }
};

'use strict';
const path = require('path');
const fs   = require('fs');
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');
const { parseDocument } = require('../services/documentParser');

const STORAGE_BASE = path.resolve(__dirname, '../../storage/project-sources');

const COLS = `id, project_id, title, source_type, description,
              extraction_status, extraction_error,
              length(extracted_text) AS extracted_chars,
              storage_path, original_filename, mime_type, file_size_bytes,
              uploaded_by_contact_id, created_at, updated_at`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /projects/:projectId/sources
// ─────────────────────────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${COLS} FROM project_sources
        WHERE project_id = $1
        ORDER BY created_at DESC`,
      [req.params.projectId]
    );
    res.json(serialize('project-source', rows));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /project-sources/:id/content   (texte extrait complet)
// ─────────────────────────────────────────────────────────────────────────────
exports.getContent = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, title, source_type, extraction_status, extraction_error,
              extracted_text, length(extracted_text) AS total_chars,
              original_filename, mime_type, created_at
         FROM project_sources WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Source not found'));
    res.json(serialize('project-source', rows[0]));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /projects/:projectId/sources/upload   (multipart/form-data)
// Champs form-data attendus :
//   file        (obligatoire) — le fichier
//   title       (optionnel) — titre affiché ; défaut = nom du fichier
//   source_type (optionnel) — pc_list | directive | spec | contract | ...
//   description (optionnel) — résumé du contenu
// ─────────────────────────────────────────────────────────────────────────────
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse(400, 'No file provided (field: file)'));
    }

    const projectId = req.params.projectId;

    // Vérifier que le projet existe
    const { rows: pj } = await query(`SELECT id FROM projects WHERE id = $1`, [projectId]);
    if (!pj[0]) {
      // Nettoyer le fichier temporaire
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json(errorResponse(404, 'Project not found'));
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const title       = req.body.title       || path.parse(originalname).name;
    const source_type = req.body.source_type || null;
    const description = req.body.description || null;

    // Parser le document
    logger.info(`📥 Parsing source: ${originalname} (${size} bytes)`);
    const { text, status: extractionStatus, error: extractionError } = await parseDocument(buffer, originalname);

    // Stocker le fichier original sur disque
    const dir = path.join(STORAGE_BASE, String(projectId));
    fs.mkdirSync(dir, { recursive: true });
    const ext      = path.extname(originalname);
    const filename = `${Date.now()}${ext}`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, buffer);
    const storagePath = `project-sources/${projectId}/${filename}`;

    // Insérer en DB
    const { rows } = await query(
      `INSERT INTO project_sources
         (project_id, title, source_type, description,
          extracted_text, extraction_status, extraction_error,
          storage_path, original_filename, mime_type, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${COLS}`,
      [projectId, title, source_type, description,
       text || null, extractionStatus, extractionError || null,
       storagePath, originalname, mimetype, size]
    );

    logger.info(`✅ Source uploaded: ${rows[0].id} — ${originalname} → ${extractionStatus}`);
    res.status(201).json(serialize('project-source', rows[0]));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /project-sources/:id
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
    const { rows } = await query(
      `UPDATE project_sources SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${COLS}`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Source not found'));
    res.json(serialize('project-source', rows[0]));
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /project-sources/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const { rows } = await query(
      `DELETE FROM project_sources WHERE id = $1 RETURNING id, storage_path`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Source not found'));
    // Supprimer le fichier physique s'il existe
    if (rows[0].storage_path) {
      const full = path.join(path.resolve(__dirname, '../../storage'), rows[0].storage_path);
      fs.unlink(full, () => {});
    }
    logger.info(`🗑️  Source deleted: ${rows[0].id}`);
    res.status(204).end();
  } catch (e) { next(e); }
};

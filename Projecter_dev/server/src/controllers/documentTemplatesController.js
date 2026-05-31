'use strict';
const { query }   = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger      = require('../utils/logger');
const fileManager = require('../utils/localFileManager');

// ─────────────────────────────────────────────────────────────────────────────
// GET /document-templates
// ─────────────────────────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const where = activeOnly ? 'WHERE active = true' : '';
    const { rows } = await query(
      `SELECT id, name, doc_type, description, file_path, variables, active,
              created_at, updated_at
       FROM document_templates ${where}
       ORDER BY name ASC`
    );
    res.json(serialize('document-templates', rows));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /document-templates/upload   (multipart — multer)
// ─────────────────────────────────────────────────────────────────────────────
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse(400, 'No file provided'));
    }
    const { name, doc_type, description = null, variables = '[]' } = parseAttributes(req);

    if (!name || !doc_type) {
      return res.status(422).json(errorResponse(422, 'name and doc_type are required'));
    }

    const filename   = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const fullPath   = fileManager.resolvePath('templates', filename);
    await fileManager.writeFile(fullPath, req.file.buffer, null);

    let parsedVars;
    try { parsedVars = typeof variables === 'string' ? JSON.parse(variables) : variables; }
    catch { parsedVars = []; }

    const { rows } = await query(
      `INSERT INTO document_templates (name, doc_type, description, file_path, variables)
       VALUES ($1, $2::document_type, $3, $4, $5)
       RETURNING id, name, doc_type, description, file_path, variables, active, created_at, updated_at`,
      [name, doc_type, description, filename, JSON.stringify(parsedVars)]
    );
    logger.info(`✅ [documentTemplates] Template créé : ${filename}`);
    res.status(201).json(serialize('document-templates', rows[0]));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /document-templates   (enregistre un template déjà présent sur le volume)
// ─────────────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { name, doc_type, description = null, file_path, variables = [] } = parseAttributes(req);

    if (!name || !doc_type || !file_path) {
      return res.status(422).json(errorResponse(422, 'name, doc_type and file_path are required'));
    }

    const fullPath = fileManager.resolvePath('templates', file_path);
    if (!fileManager.exists(fullPath)) {
      return res.status(422).json(errorResponse(422, `File not found in templates directory: ${file_path}`));
    }

    const { rows } = await query(
      `INSERT INTO document_templates (name, doc_type, description, file_path, variables)
       VALUES ($1, $2::document_type, $3, $4, $5)
       RETURNING id, name, doc_type, description, file_path, variables, active, created_at, updated_at`,
      [name, doc_type, description, file_path, JSON.stringify(variables)]
    );
    logger.info(`✅ [documentTemplates] Template enregistré : ${file_path}`);
    res.status(201).json(serialize('document-templates', rows[0]));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /document-templates/:id   (mettre à jour name / description / variables / active)
// ─────────────────────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attrs = parseAttributes(req);
    const allowed = ['name', 'doc_type', 'description', 'variables', 'active'];
    const sets = []; const params = []; let pi = 1;

    for (const key of allowed) {
      if (attrs[key] !== undefined) {
        let val = attrs[key];
        if (key === 'variables') val = JSON.stringify(typeof val === 'string' ? JSON.parse(val) : val);
        sets.push(`${key} = $${pi++}${key === 'doc_type' ? '::document_type' : ''}`);
        params.push(val);
      }
    }
    if (!sets.length) {
      return res.status(422).json(errorResponse(422, 'No valid fields to update'));
    }
    sets.push(`updated_at = now()`);
    params.push(id);

    const { rows } = await query(
      `UPDATE document_templates SET ${sets.join(', ')}
       WHERE id = $${pi}
       RETURNING id, name, doc_type, description, file_path, variables, active, created_at, updated_at`,
      params
    );
    if (!rows.length) return res.status(404).json(errorResponse(404, 'Template not found'));
    res.json(serialize('document-templates', rows[0]));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /document-templates/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'SELECT file_path FROM document_templates WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json(errorResponse(404, 'Template not found'));

    const filePath = fileManager.resolvePath('templates', rows[0].file_path);
    await fileManager.deleteFile(filePath);

    await query('DELETE FROM document_templates WHERE id = $1', [id]);
    logger.info(`🗑️  [documentTemplates] Template supprimé id=${id}`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

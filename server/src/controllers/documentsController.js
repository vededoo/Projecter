'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `id, project_id, type, title, version, status, drafted_at,
              etnic_approved_at, wbe_approved_at, signed_at, author_contact_id,
              attributes, generated_from_template, parent_document_id,
              created_at, updated_at`;

const FIELDS = ['type', 'title', 'version', 'status', 'drafted_at',
                'etnic_approved_at', 'wbe_approved_at', 'signed_at',
                'author_contact_id', 'attributes', 'generated_from_template', 'parent_document_id'];

const ENUM_CASTS = { type: '::document_type', status: '::document_status' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, type, status } = req.query;
    const conds = []; const params = [];
    if (project_id) { params.push(project_id); conds.push(`project_id = $${params.length}`); }
    if (type)       { params.push(type);       conds.push(`type = $${params.length}::document_type`); }
    if (status)     { params.push(status);     conds.push(`status = $${params.length}::document_status`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLS} FROM documents ${where} ORDER BY updated_at DESC LIMIT 500`,
      params
    );
    res.json(serialize('document', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLS} FROM documents WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Document not found'));
    res.json(serialize('document', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.project_id || !a.type) {
      return res.status(400).json(errorResponse(400, 'project_id and type are required'));
    }
    const { rows } = await query(
      `INSERT INTO documents (project_id, type, title, version, status, drafted_at, author_contact_id, attributes, parent_document_id)
       VALUES ($1, $2::document_type, $3, COALESCE($4,'0.1'),
               COALESCE($5::document_status,'draft'::document_status),
               $6, $7, COALESCE($8::jsonb,'{}'::jsonb), $9)
       RETURNING ${COLS}`,
      [a.project_id, a.type, a.title || null, a.version, a.status, a.drafted_at || null,
       a.author_contact_id || null,
       a.attributes ? JSON.stringify(a.attributes) : null,
       a.parent_document_id || null]
    );
    logger.info('✅ Document created', { id: rows[0].id, type: rows[0].type });
    res.status(201).json(serialize('document', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        const cast = ENUM_CASTS[f] || (f === 'attributes' ? '::jsonb' : '');
        sets.push(`${f} = $${i++}${cast}`);
        vals.push(f === 'attributes' && a[f] && typeof a[f] === 'object' ? JSON.stringify(a[f]) : a[f]);
      }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE documents SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING ${COLS}`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Document not found'));
    res.json(serialize('document', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM documents WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Document not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

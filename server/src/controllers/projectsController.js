'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `id, code, title, slug, status, urgency, priority, attributes,
              status_brief, status_brief_updated_at, rag_global, rag_planning,
              rag_budget, rag_scope, rag_risks, highlights, concerns, next_steps,
              created_at, updated_at`;

exports.list = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${COLS} FROM projects ORDER BY updated_at DESC LIMIT 200`
    );
    res.json(serialize('project', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${COLS} FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Project not found'));
    res.json(serialize('project', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.title || !a.slug) {
      return res.status(400).json(errorResponse(400, 'title and slug are required'));
    }
    const { rows } = await query(
      `INSERT INTO projects (code, title, slug, status, urgency, priority, attributes)
       VALUES ($1, $2, $3, COALESCE($4::project_status,'idea'::project_status),
               $5::urgency_level, $6::priority_level, COALESCE($7::jsonb,'{}'::jsonb))
       RETURNING ${COLS}`,
      [a.code || null, a.title, a.slug, a.status || null,
       a.urgency || null, a.priority || null, a.attributes ? JSON.stringify(a.attributes) : null]
    );
    logger.info('✅ Project created', { id: rows[0].id, slug: rows[0].slug });
    res.status(201).json(serialize('project', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const fields = ['code', 'title', 'slug', 'status', 'urgency', 'priority', 'attributes',
                    'status_brief', 'rag_global', 'rag_planning', 'rag_budget', 'rag_scope',
                    'rag_risks', 'highlights', 'concerns', 'next_steps'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const f of fields) {
      if (a[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(a[f]); }
    }
    if (a.status_brief !== undefined) {
      sets.push(`status_brief_updated_at = NOW()`);
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE projects SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id::text = $${i} OR slug = $${i} RETURNING ${COLS}`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Project not found'));
    logger.info('💾 Project updated', { id: rows[0].id });
    res.json(serialize('project', rows[0]));
  } catch (e) { next(e); }
};

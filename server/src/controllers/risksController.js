'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `id, project_id, label, description, probability, impact, severity,
              status, owner_contact_id, mitigation_plan, due_date,
              detected_at, closed_at, attributes, created_at, updated_at`;

const FIELDS = ['label', 'description', 'probability', 'impact', 'severity',
                'status', 'owner_contact_id', 'mitigation_plan', 'due_date',
                'closed_at', 'attributes'];

const ENUM_CASTS = {
  probability: '::risk_level', impact: '::risk_level', severity: '::risk_level',
  status: '::risk_status',
};

exports.list = async (req, res, next) => {
  try {
    const { project_id, status, severity } = req.query;
    const conds = [];
    const params = [];
    if (project_id) { params.push(project_id); conds.push(`project_id = $${params.length}`); }
    if (status)     { params.push(status);     conds.push(`status = $${params.length}::risk_status`); }
    if (severity)   { params.push(severity);   conds.push(`severity = $${params.length}::risk_level`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLS} FROM risks ${where}
       ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
                due_date ASC NULLS LAST LIMIT 500`,
      params
    );
    res.json(serialize('risk', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLS} FROM risks WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Risk not found'));
    res.json(serialize('risk', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.project_id || !a.label) {
      return res.status(400).json(errorResponse(400, 'project_id and label are required'));
    }
    const { rows } = await query(
      `INSERT INTO risks (project_id, label, description, probability, impact, severity,
                          status, owner_contact_id, mitigation_plan, due_date, attributes)
       VALUES ($1, $2, $3, $4::risk_level, $5::risk_level, $6::risk_level,
               COALESCE($7::risk_status,'open'::risk_status), $8, $9, $10,
               COALESCE($11::jsonb,'{}'::jsonb))
       RETURNING ${COLS}`,
      [a.project_id, a.label, a.description || null,
       a.probability || null, a.impact || null, a.severity || null,
       a.status || null, a.owner_contact_id || null, a.mitigation_plan || null, a.due_date || null,
       a.attributes ? JSON.stringify(a.attributes) : null]
    );
    logger.info('✅ Risk created', { id: rows[0].id, project_id: rows[0].project_id });
    res.status(201).json(serialize('risk', rows[0]));
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
      `UPDATE risks SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING ${COLS}`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Risk not found'));
    res.json(serialize('risk', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM risks WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Risk not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

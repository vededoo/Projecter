'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// Colonnes issues de v_risks + champs complémentaires de la table risks
const VIEW_COLS = `v.id, v.label, v.description, v.probability,
                   v.impact_global AS impact, v.severity, v.status,
                   v.owner_contact_id, v.owner_name, v.mitigation_plan,
                   v.due_date, v.detected_at, v.closed_at, v.projects,
                   r.attributes, r.created_at, r.updated_at`;

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
    const conds = []; const params = [];
    if (project_id) {
      params.push(project_id);
      conds.push(`v.id IN (SELECT risk_id FROM risk_projects WHERE project_id = $${params.length}::integer)`);
    }
    if (status)   { params.push(status);   conds.push(`v.status = $${params.length}::risk_status`); }
    if (severity) { params.push(severity); conds.push(`v.severity = $${params.length}::risk_level`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${VIEW_COLS}
         FROM v_risks v
         JOIN risks r ON r.id = v.id
         ${where}
         ORDER BY CASE v.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                                  WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
                  v.due_date ASC NULLS LAST LIMIT 500`,
      params
    );
    res.json(serialize('risk', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${VIEW_COLS}
         FROM v_risks v JOIN risks r ON r.id = v.id
         WHERE v.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Risk not found'));
    res.json(serialize('risk', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.label) return res.status(400).json(errorResponse(400, 'label is required'));
    const { rows: [risk] } = await query(
      `INSERT INTO risks (label, description, probability, impact, severity,
                          status, owner_contact_id, mitigation_plan, due_date, attributes)
       VALUES ($1, $2, $3::risk_level, $4::risk_level, $5::risk_level,
               COALESCE($6::risk_status,'open'::risk_status), $7, $8, $9,
               COALESCE($10::jsonb,'{}'::jsonb))
       RETURNING id`,
      [a.label, a.description || null,
       a.probability || null, a.impact || null, a.severity || null,
       a.status || null, a.owner_contact_id || null, a.mitigation_plan || null, a.due_date || null,
       a.attributes ? JSON.stringify(a.attributes) : null]
    );
    // Lier aux projets (project_ids: number[] ou project_id: number)
    const pids = a.project_ids || (a.project_id ? [a.project_id] : []);
    for (const pid of pids) {
      await query(
        `INSERT INTO risk_projects (risk_id, project_id, impact, context)
         VALUES ($1, $2, $3::risk_level, $4) ON CONFLICT DO NOTHING`,
        [risk.id, pid, a.impact || null, a.context || null]
      );
    }
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_risks v JOIN risks r ON r.id = v.id WHERE v.id = $1`,
      [risk.id]
    );
    logger.info('✅ Risk created', { id: risk.id });
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
    await query(
      `UPDATE risks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
      vals
    );
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_risks v JOIN risks r ON r.id = v.id WHERE v.id = $1`,
      [req.params.id]
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

exports.linkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    const { impact, context } = req.body?.data?.attributes || {};
    await query(
      `INSERT INTO risk_projects (risk_id, project_id, impact, context)
       VALUES ($1, $2, $3::risk_level, $4)
       ON CONFLICT (risk_id, project_id) DO UPDATE
         SET impact = EXCLUDED.impact, context = EXCLUDED.context`,
      [id, projectId, impact || null, context || null]
    );
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_risks v JOIN risks r ON r.id = v.id WHERE v.id = $1`,
      [id]
    );
    logger.info('✅ Risk linked to project', { riskId: id, projectId });
    res.json(serialize('risk', rows[0]));
  } catch (e) { next(e); }
};

exports.unlinkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    await query(
      `DELETE FROM risk_projects WHERE risk_id = $1 AND project_id = $2`,
      [id, projectId]
    );
    logger.info('✅ Risk unlinked from project', { riskId: id, projectId });
    res.status(204).end();
  } catch (e) { next(e); }
};


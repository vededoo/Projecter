'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// v_decisions expose driver/approver résolus, provenance réunion et projets (N-N).
const VIEW_COLS = `id, description, impact, position, is_reversible,
                   driver_contact_id, approver_contact_id, driver_name, approver_name,
                   meeting_id, meeting_topic_id, meeting_title, meeting_date,
                   projects, created_at, updated_at`;

const FIELDS = ['description', 'impact', 'position', 'is_reversible',
                'driver_contact_id', 'approver_contact_id', 'meeting_topic_id'];

exports.list = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const conds = []; const params = [];
    if (project_id) {
      params.push(project_id);
      conds.push(`id IN (SELECT decision_id FROM decision_projects WHERE project_id = $${params.length}::integer)`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${VIEW_COLS}
         FROM v_decisions
         ${where}
         ORDER BY created_at DESC, position NULLS LAST, id LIMIT 500`,
      params
    );
    res.json(serialize('decision', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_decisions WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Decision not found'));
    res.json(serialize('decision', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.description) return res.status(400).json(errorResponse(400, 'description is required'));
    const { rows: [decision] } = await query(
      `INSERT INTO decisions (meeting_id, description, impact, position,
                              is_reversible, driver_contact_id, approver_contact_id,
                              meeting_topic_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [a.meeting_id || null, a.description, a.impact || null, a.position ?? null,
       a.is_reversible ?? null, a.driver_contact_id || null, a.approver_contact_id || null,
       a.meeting_topic_id || null]
    );
    // Lier aux projets (project_ids: number[] ou project_id: number)
    const pids = a.project_ids || (a.project_id ? [a.project_id] : []);
    for (const pid of pids) {
      await query(
        `INSERT INTO decision_projects (decision_id, project_id, role, context)
         VALUES ($1, $2, $3, $4) ON CONFLICT (decision_id, project_id) DO NOTHING`,
        [decision.id, pid, a.role || null, a.context || null]
      );
    }
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_decisions WHERE id = $1`, [decision.id]);
    logger.info('✅ Decision created', { id: decision.id });
    res.status(201).json(serialize('decision', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        sets.push(`${f} = $${i++}`);
        vals.push(a[f]);
      }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    await query(
      `UPDATE decisions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
      vals
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_decisions WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Decision not found'));
    res.json(serialize('decision', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM decisions WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Decision not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

exports.linkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    const { role, context } = req.body?.data?.attributes || {};
    await query(
      `INSERT INTO decision_projects (decision_id, project_id, role, context)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (decision_id, project_id) DO UPDATE
         SET role = EXCLUDED.role, context = EXCLUDED.context`,
      [id, projectId, role || null, context || null]
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_decisions WHERE id = $1`, [id]);
    logger.info('✅ Decision linked to project', { decisionId: id, projectId });
    res.json(serialize('decision', rows[0]));
  } catch (e) { next(e); }
};

exports.unlinkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    await query(
      `DELETE FROM decision_projects WHERE decision_id = $1 AND project_id = $2`,
      [id, projectId]
    );
    logger.info('✅ Decision unlinked from project', { decisionId: id, projectId });
    res.status(204).end();
  } catch (e) { next(e); }
};

'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// v_actions expose déjà owner résolu, provenance réunion et projets (N-N).
const VIEW_COLS = `id, description, deadline, status, notes, owner_id, owner_raw,
                   owner_name, owner_email, meeting_id, meeting_topic_id,
                   meeting_title, meeting_date, is_overdue, projects,
                   created_at, updated_at, closed_at`;

const FIELDS = ['description', 'deadline', 'status', 'notes', 'owner_id',
                'owner_raw', 'meeting_topic_id', 'closed_at'];

const ENUM_CASTS = { status: '::action_status' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, status, owner_id, overdue } = req.query;
    const conds = []; const params = [];
    if (project_id) {
      params.push(project_id);
      conds.push(`id IN (SELECT action_id FROM action_projects WHERE project_id = $${params.length}::integer)`);
    }
    if (status)   { params.push(status);   conds.push(`status = $${params.length}::action_status`); }
    if (owner_id) { params.push(owner_id); conds.push(`owner_id = $${params.length}::integer`); }
    if (overdue === 'true') conds.push('is_overdue = true');
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${VIEW_COLS}
         FROM v_actions
         ${where}
         ORDER BY CASE status WHEN 'overdue' THEN 1 WHEN 'open' THEN 2
                              WHEN 'done' THEN 3 ELSE 4 END,
                  deadline ASC NULLS LAST, id LIMIT 500`,
      params
    );
    res.json(serialize('action', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_actions WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Action not found'));
    res.json(serialize('action', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.description) return res.status(400).json(errorResponse(400, 'description is required'));
    const { rows: [action] } = await query(
      `INSERT INTO actions (meeting_id, owner_id, owner_raw, description, deadline,
                            status, notes, meeting_topic_id)
       VALUES ($1, $2, $3, $4, $5,
               COALESCE($6::action_status,'open'::action_status), $7, $8)
       RETURNING id`,
      [a.meeting_id || null, a.owner_id || null, a.owner_raw || null,
       a.description, a.deadline || null, a.status || null,
       a.notes || null, a.meeting_topic_id || null]
    );
    // Lier aux projets (project_ids: number[] ou project_id: number)
    const pids = a.project_ids || (a.project_id ? [a.project_id] : []);
    for (const pid of pids) {
      await query(
        `INSERT INTO action_projects (action_id, project_id, role, context)
         VALUES ($1, $2, $3, $4) ON CONFLICT (action_id, project_id) DO NOTHING`,
        [action.id, pid, a.role || null, a.context || null]
      );
    }
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_actions WHERE id = $1`, [action.id]);
    logger.info('✅ Action created', { id: action.id });
    res.status(201).json(serialize('action', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        const cast = ENUM_CASTS[f] || '';
        sets.push(`${f} = $${i++}${cast}`);
        vals.push(a[f]);
      }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    await query(
      `UPDATE actions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
      vals
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_actions WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Action not found'));
    res.json(serialize('action', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM actions WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Action not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

exports.linkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    const { role, context } = req.body?.data?.attributes || {};
    await query(
      `INSERT INTO action_projects (action_id, project_id, role, context)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (action_id, project_id) DO UPDATE
         SET role = EXCLUDED.role, context = EXCLUDED.context`,
      [id, projectId, role || null, context || null]
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_actions WHERE id = $1`, [id]);
    logger.info('✅ Action linked to project', { actionId: id, projectId });
    res.json(serialize('action', rows[0]));
  } catch (e) { next(e); }
};

exports.unlinkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    await query(
      `DELETE FROM action_projects WHERE action_id = $1 AND project_id = $2`,
      [id, projectId]
    );
    logger.info('✅ Action unlinked from project', { actionId: id, projectId });
    res.status(204).end();
  } catch (e) { next(e); }
};

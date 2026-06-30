'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// v_issues : sévérité/statut, owner résolu, provenance réunion + projets N-N.
const VIEW_COLS = `id, label, description, severity, status,
                   owner_contact_id, owner_name, resolution,
                   due_date, detected_at, resolved_at,
                   meeting_id, meeting_topic_id, meeting_title, meeting_date,
                   is_overdue, projects, attributes, created_at, updated_at`;

const FIELDS = ['label', 'description', 'severity', 'status', 'owner_contact_id',
                'resolution', 'due_date', 'detected_at', 'resolved_at',
                'meeting_topic_id', 'attributes'];
const ENUM_CASTS = { severity: '::issue_severity', status: '::issue_status' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, status, severity, overdue } = req.query;
    const conds = []; const params = [];
    if (project_id) {
      params.push(project_id);
      conds.push(`id IN (SELECT issue_id FROM issue_projects WHERE project_id = $${params.length}::integer)`);
    }
    if (status)   { params.push(status);   conds.push(`status = $${params.length}::issue_status`); }
    if (severity) { params.push(severity); conds.push(`severity = $${params.length}::issue_severity`); }
    if (overdue === 'true') conds.push('is_overdue = true');
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_issues ${where}
         ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                                WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
                  due_date ASC NULLS LAST LIMIT 500`,
      params
    );
    res.json(serialize('issue', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_issues WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Issue not found'));
    res.json(serialize('issue', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.label) return res.status(400).json(errorResponse(400, 'label is required'));
    const { rows: [issue] } = await query(
      `INSERT INTO issues (label, description, severity, status, owner_contact_id,
                           resolution, due_date, detected_at, resolved_at,
                           meeting_id, meeting_topic_id, attributes)
       VALUES ($1, $2, $3::issue_severity, $4::issue_status, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [a.label, a.description || null, a.severity || 'medium', a.status || 'open',
       a.owner_contact_id || null, a.resolution || null, a.due_date || null,
       a.detected_at || null, a.resolved_at || null, a.meeting_id || null,
       a.meeting_topic_id || null, a.attributes ? JSON.stringify(a.attributes) : null]
    );
    const pids = a.project_ids || (a.project_id ? [a.project_id] : []);
    for (const pid of pids) {
      await query(
        `INSERT INTO issue_projects (issue_id, project_id, role, context)
         VALUES ($1, $2, $3, $4) ON CONFLICT (issue_id, project_id) DO NOTHING`,
        [issue.id, pid, a.role || null, a.context || null]
      );
    }
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_issues WHERE id = $1`, [issue.id]);
    logger.info('✅ Issue created', { id: issue.id });
    res.status(201).json(serialize('issue', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        sets.push(`${f} = $${i++}${ENUM_CASTS[f] || ''}`);
        vals.push(f === 'attributes' && a[f] != null ? JSON.stringify(a[f]) : a[f]);
      }
    }
    // Auto-stamp resolved_at quand le statut passe à 'resolved' sans date fournie
    if (a.status === 'resolved' && a.resolved_at === undefined) {
      sets.push(`resolved_at = COALESCE(resolved_at, CURRENT_DATE)`);
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    await query(`UPDATE issues SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`, vals);
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_issues WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Issue not found'));
    res.json(serialize('issue', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM issues WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Issue not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

exports.linkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    const { role, context } = req.body?.data?.attributes || {};
    await query(
      `INSERT INTO issue_projects (issue_id, project_id, role, context)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (issue_id, project_id) DO UPDATE
         SET role = EXCLUDED.role, context = EXCLUDED.context`,
      [id, projectId, role || null, context || null]
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_issues WHERE id = $1`, [id]);
    logger.info('✅ Issue linked to project', { issueId: id, projectId });
    res.json(serialize('issue', rows[0]));
  } catch (e) { next(e); }
};

exports.unlinkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    await query(`DELETE FROM issue_projects WHERE issue_id = $1 AND project_id = $2`, [id, projectId]);
    logger.info('✅ Issue unlinked from project', { issueId: id, projectId });
    res.status(204).end();
  } catch (e) { next(e); }
};

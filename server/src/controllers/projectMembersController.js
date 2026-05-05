'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `pm.id, pm.project_id, pm.contact_id, pm.role, pm.cc_id, pm.role_id,
              pm.effort_md, pm.to_be_hired, pm.comments, pm.display_order, pm.created_at,
              c.last_name, c.first_name, c.email, c.job_title,
              o.code AS organization_code,
              cc.code AS cc_code, cc.label AS cc_label`;

const JOINS = `LEFT JOIN contacts c ON c.id = pm.contact_id
               LEFT JOIN organizations o ON o.id = c.organization_id
               LEFT JOIN competency_centers cc ON cc.id = pm.cc_id`;

exports.list = async (req, res, next) => {
  try {
    const { project_id, role } = req.query;
    const conds = []; const params = [];
    if (project_id) { params.push(project_id); conds.push(`pm.project_id = $${params.length}`); }
    if (role)       { params.push(role);       conds.push(`pm.role = $${params.length}::project_role`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLS} FROM project_members pm ${JOINS} ${where}
       ORDER BY pm.project_id, pm.display_order LIMIT 500`,
      params
    );
    res.json(serialize('project-member', rows));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.project_id || !a.contact_id || !a.role) {
      return res.status(400).json(errorResponse(400, 'project_id, contact_id and role are required'));
    }
    const { rows: ins } = await query(
      `INSERT INTO project_members (project_id, contact_id, role, cc_id, role_id, effort_md, to_be_hired, comments, display_order)
       VALUES ($1, $2, $3::project_role, $4, $5, $6, COALESCE($7, FALSE), $8, COALESCE($9, 0))
       RETURNING id`,
      [a.project_id, a.contact_id, a.role, a.cc_id || null, a.role_id || null,
       a.effort_md || null, a.to_be_hired, a.comments || null, a.display_order]
    );
    const { rows } = await query(
      `SELECT ${COLS} FROM project_members pm ${JOINS} WHERE pm.id = $1`,
      [ins[0].id]
    );
    logger.info('✅ Project member added', { id: ins[0].id });
    res.status(201).json(serialize('project-member', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const fields = ['role', 'cc_id', 'role_id', 'effort_md', 'to_be_hired', 'comments', 'display_order'];
    const sets = []; const vals = []; let i = 1;
    for (const f of fields) {
      if (a[f] !== undefined) {
        const cast = f === 'role' ? '::project_role' : '';
        sets.push(`${f} = $${i++}${cast}`); vals.push(a[f]);
      }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    const { rowCount } = await query(`UPDATE project_members SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Project member not found'));
    const { rows } = await query(`SELECT ${COLS} FROM project_members pm ${JOINS} WHERE pm.id = $1`, [req.params.id]);
    res.json(serialize('project-member', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM project_members WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Project member not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

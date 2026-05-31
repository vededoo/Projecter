'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `pm.id, pm.project_id, pm.contact_id, pm.role, pm.org_unit_id, pm.role_id,
              pm.effort_md, pm.to_be_hired, pm.comments, pm.display_order, pm.created_at,
              c.last_name, c.first_name, c.email, c.job_title,
              o.code AS organization_code,
              COALESCE(u.code,  u_prim.code)  AS org_unit_code,
              COALESCE(u.label, u_prim.label) AS org_unit_label,
              COALESCE(u.path,  u_prim.path)  AS org_unit_path,
              r.label AS role_label`;

// u_prim = unité primaire du contact (memberships.is_primary=true, ended_at IS NULL)
// utilisée en fallback quand pm.org_unit_id n'est pas renseigné
const JOINS = `LEFT JOIN contacts c ON c.id = pm.contact_id
               LEFT JOIN organizations o ON o.id = c.organization_id
               LEFT JOIN org_units u ON u.id = pm.org_unit_id
               LEFT JOIN roles r ON r.id = pm.role_id
               LEFT JOIN LATERAL (
                 SELECT org_unit_id FROM memberships
                 WHERE contact_id = pm.contact_id AND is_primary = true AND ended_at IS NULL
                 ORDER BY id LIMIT 1
               ) mb_prim ON true
               LEFT JOIN org_units u_prim ON u_prim.id = mb_prim.org_unit_id`;

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
    if (!a.project_id || !a.contact_id) {
      return res.status(400).json(errorResponse(400, 'project_id and contact_id are required'));
    }
    // Fallback : si aucun rôle fourni, hériter de la fonction par défaut du contact
    if (!a.role && !a.role_id) {
      const { rows: cRows } = await query(
        `SELECT default_role_id FROM contacts WHERE id = $1`, [a.contact_id]
      );
      if (cRows.length && cRows[0].default_role_id) a.role_id = cRows[0].default_role_id;
    }
    // role_id suffit : role enum est optionnel (défaut 'expert')
    if (!a.role && !a.role_id) {
      return res.status(400).json(errorResponse(400, 'role or role_id is required (contact has no default role)'));
    }
    if (!a.role) a.role = 'expert';
    // Auto-fill org_unit_id depuis l'unité primaire du contact si non fourni
    let unitId = a.org_unit_id || null;
    if (!unitId) {
      const { rows: mbRows } = await query(
        `SELECT org_unit_id FROM memberships WHERE contact_id = $1 AND is_primary = true AND ended_at IS NULL LIMIT 1`,
        [a.contact_id]
      );
      if (mbRows.length) unitId = mbRows[0].org_unit_id;
    }

    const { rows: ins } = await query(
      `INSERT INTO project_members (project_id, contact_id, role, org_unit_id, role_id, effort_md, to_be_hired, comments, display_order)
       VALUES ($1, $2, $3::project_role, $4, $5, $6, COALESCE($7, FALSE), $8, COALESCE($9, 0))
       RETURNING id`,
      [a.project_id, a.contact_id, a.role, unitId, a.role_id || null,
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
    const fields = ['role', 'org_unit_id', 'role_id', 'effort_md', 'to_be_hired', 'comments', 'display_order'];
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

exports.reorder = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const order = a.order;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json(errorResponse(400, 'order must be a non-empty array of IDs'));
    }
    for (let i = 0; i < order.length; i++) {
      await query(`UPDATE project_members SET display_order = $1 WHERE id = $2`, [i + 1, order[i]]);
    }
    logger.info(`💾 Project members reordered (${order.length} items)`);
    res.json({ data: { type: 'project-member', attributes: { ok: true } } });
  } catch (e) { next(e); }
};

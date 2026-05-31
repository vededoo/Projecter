'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

/**
 * GET /roles
 * Liste tous les rôles avec le nombre de project_members qui les utilisent.
 */
exports.list = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.label, r.active,
              COUNT(pm.id)::int AS members_count
       FROM roles r
       LEFT JOIN project_members pm ON pm.role_id = r.id
       GROUP BY r.id, r.label, r.active
       ORDER BY r.label`
    );
    res.json(serialize('role', rows));
  } catch (e) { next(e); }
};

/**
 * GET /roles/:id
 * Un rôle + la liste des project_members qui l'ont assigné (via role_id).
 */
exports.get = async (req, res, next) => {
  try {
    const { rows: rRows } = await query(
      `SELECT id, label, active FROM roles WHERE id = $1`,
      [req.params.id]
    );
    if (!rRows.length) return res.status(404).json(errorResponse(404, 'Role not found'));

    const { rows: mRows } = await query(
      `SELECT pm.id        AS member_id,
              pm.project_id,
              pm.contact_id,
              c.first_name, c.last_name,
              p.title      AS project_title,
              p.code       AS project_code
       FROM project_members pm
       LEFT JOIN contacts c ON c.id = pm.contact_id
       LEFT JOIN projects  p ON p.id = pm.project_id
       WHERE pm.role_id = $1
       ORDER BY p.title, c.last_name`,
      [req.params.id]
    );

    const role = { ...rRows[0], members: mRows, members_count: mRows.length };
    res.json(serialize('role', role));
  } catch (e) { next(e); }
};

/**
 * POST /roles
 */
exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.label?.trim()) {
      return res.status(400).json(errorResponse(400, 'label is required'));
    }
    const { rows } = await query(
      `INSERT INTO roles (label, active) VALUES ($1, $2) RETURNING *`,
      [a.label.trim(), a.active !== false]
    );
    logger.info('✅ Role created', { id: rows[0].id, label: rows[0].label });
    res.status(201).json(serialize('role', rows[0]));
  } catch (e) { next(e); }
};

/**
 * PATCH /roles/:id
 * Modification généralisée : met à jour le label pour toutes les relations existantes
 * (pas besoin de migration car label est dans la table roles, les FK pointent vers l'id).
 */
exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    if (a.label !== undefined) { sets.push(`label = $${i++}`); vals.push(a.label.trim()); }
    if (a.active !== undefined) { sets.push(`active = $${i++}`); vals.push(a.active); }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes to update'));
    vals.push(req.params.id);
    const { rowCount, rows } = await query(
      `UPDATE roles SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Role not found'));
    logger.info('✅ Role updated', { id: req.params.id });
    res.json(serialize('role', rows[0]));
  } catch (e) { next(e); }
};

/**
 * DELETE /roles/:id
 * Bloqué (409) si des project_members référencent ce rôle via role_id.
 */
exports.remove = async (req, res, next) => {
  try {
    const { rows: used } = await query(
      `SELECT COUNT(*)::int AS cnt FROM project_members WHERE role_id = $1`,
      [req.params.id]
    );
    if (used[0].cnt > 0) {
      return res.status(409).json(
        errorResponse(409, `Cannot delete: role is used by ${used[0].cnt} project member(s)`)
      );
    }
    const { rowCount } = await query(`DELETE FROM roles WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Role not found'));
    logger.info('🗑️ Role deleted', { id: req.params.id });
    res.status(204).end();
  } catch (e) { next(e); }
};

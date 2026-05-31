'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `u.id, u.organization_id, u.parent_id, u.code, u.label, u.level_label,
              u.depth, u.path, u.manager_contact_id, u.is_interim,
              u.display_order, u.notes, u.active,
              org.name AS organization_name,
              m.last_name AS manager_last_name, m.first_name AS manager_first_name`;

const JOINS = `LEFT JOIN organizations org ON org.id = u.organization_id
               LEFT JOIN contacts m ON m.id = u.manager_contact_id`;

// ─── GET /org-units ──────────────────────────────────────────────
// Renvoie l'arbre complet (toutes organizations) trié par profondeur + ordre.
exports.list = async (req, res, next) => {
  try {
    const { organization_id } = req.query;
    const conds = []; const params = [];
    if (organization_id) { params.push(organization_id); conds.push(`u.organization_id = $${params.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLS} FROM org_units u ${JOINS} ${where}
       ORDER BY u.depth, u.display_order, u.label`,
      params
    );
    res.json(serialize('org-unit', rows));
  } catch (e) { next(e); }
};

// ─── GET /org-units/:id ─────────────────────────────────────────────────
exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLS} FROM org_units u ${JOINS} WHERE u.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Org unit not found'));
    res.json(serialize('org-unit', rows[0]));
  } catch (e) { next(e); }
};

// ─── POST /org-units ────────────────────────────────────────────────────
// organization_id est hérité du parent par trigger ; requis seulement pour une racine.
exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.code || !a.label) {
      return res.status(400).json(errorResponse(400, 'code and label are required'));
    }
    if (!a.parent_id && !a.organization_id) {
      return res.status(400).json(errorResponse(400, 'organization_id is required for a root unit'));
    }
    const { rows: ins } = await query(
      `INSERT INTO org_units (organization_id, parent_id, code, label, level_label,
                              manager_contact_id, is_interim, display_order, notes)
       VALUES (COALESCE($1, 0), $2, $3, $4, $5, $6, COALESCE($7, FALSE), COALESCE($8, 0), $9)
       RETURNING id`,
      [a.organization_id || null, a.parent_id || null, a.code, a.label, a.level_label || null,
       a.manager_contact_id || null, a.is_interim, a.display_order, a.notes || null]
    );
    const { rows } = await query(`SELECT ${COLS} FROM org_units u ${JOINS} WHERE u.id = $1`, [ins[0].id]);
    logger.info('✅ Org unit created', { id: ins[0].id, code: a.code });
    res.status(201).json(serialize('org-unit', rows[0]));
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json(errorResponse(409, 'Duplicate code', 'A sibling unit already uses this code.'));
    }
    next(e);
  }
};

// ─── PATCH /org-units/:id ───────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const fields = ['parent_id', 'code', 'label', 'level_label', 'manager_contact_id',
                    'is_interim', 'display_order', 'notes', 'active'];
    const sets = []; const vals = []; let i = 1;
    for (const f of fields) {
      if (a[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(a[f]); }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    if ('parent_id' in a && a.parent_id != null && String(a.parent_id) === String(req.params.id)) {
      return res.status(400).json(errorResponse(400, 'A unit cannot be its own parent'));
    }
    vals.push(req.params.id);
    const { rowCount } = await query(`UPDATE org_units SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Org unit not found'));
    const { rows } = await query(`SELECT ${COLS} FROM org_units u ${JOINS} WHERE u.id = $1`, [req.params.id]);
    logger.info('✅ Org unit updated', { id: req.params.id });
    res.json(serialize('org-unit', rows[0]));
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json(errorResponse(409, 'Duplicate code', 'A sibling unit already uses this code.'));
    }
    next(e);
  }
};

// ─── DELETE /org-units/:id ──────────────────────────────────────────────
// Soft-delete par défaut ; ?hard=true supprime (CASCADE sur les enfants + memberships).
exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const hard = req.query.hard === 'true';
    if (!hard) {
      const { rowCount } = await query(`UPDATE org_units SET active = FALSE WHERE id = $1`, [id]);
      if (!rowCount) return res.status(404).json(errorResponse(404, 'Org unit not found'));
      logger.info('🗄️ Org unit deactivated', { id });
      return res.status(204).end();
    }
    const { rowCount } = await query(`DELETE FROM org_units WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Org unit not found'));
    logger.info('🗑️ Org unit hard-deleted', { id });
    res.status(204).end();
  } catch (e) { next(e); }
};

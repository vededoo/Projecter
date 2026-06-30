'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

exports.list = async (req, res, next) => {
  try {
    const { active } = req.query;
    const params = [];
    const conds = [];
    if (active === '1' || active === 'true') {
      params.push(true);
      conds.push(`mt.active = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT mt.id, mt.code, mt.label, mt.category, mt.sort_order, mt.active,
              COUNT(m.id)::int AS meetings_count
       FROM meeting_types mt
       LEFT JOIN meetings m ON m.type = mt.code
       ${where}
       GROUP BY mt.id, mt.code, mt.label, mt.category, mt.sort_order, mt.active
       ORDER BY mt.sort_order, mt.label`,
      params
    );
    res.json(serialize('meeting-type', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mt.id, mt.code, mt.label, mt.category, mt.sort_order, mt.active,
              COUNT(m.id)::int AS meetings_count
       FROM meeting_types mt
       LEFT JOIN meetings m ON m.type = mt.code
       WHERE mt.id = $1
       GROUP BY mt.id, mt.code, mt.label, mt.category, mt.sort_order, mt.active`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json(errorResponse(404, 'Meeting type not found'));
    res.json(serialize('meeting-type', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const code = normalizeCode(a.code);
    const label = String(a.label || '').trim();
    if (!code || !label) {
      return res.status(400).json(errorResponse(400, 'code and label are required'));
    }
    const category = String(a.category || 'formal').trim();
    const { rows } = await query(
      `INSERT INTO meeting_types (code, label, category, sort_order, active)
       VALUES (
         $1,
         $2,
         $3,
         COALESCE($4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM meeting_types)),
         $5
       )
       RETURNING id, code, label, category, sort_order, active`,
      [code, label, category, a.sort_order ?? null, a.active !== false]
    );
    logger.info('✅ Meeting type created', { id: rows[0].id, code: rows[0].code });
    res.status(201).json(serialize('meeting-type', rows[0]));
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json(errorResponse(409, 'Meeting type code already exists'));
    }
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = [];
    const vals = [];
    let i = 1;

    if (a.code !== undefined) {
      const code = normalizeCode(a.code);
      if (!code) return res.status(400).json(errorResponse(400, 'code cannot be empty'));
      sets.push(`code = $${i++}`);
      vals.push(code);
    }
    if (a.label !== undefined) {
      const label = String(a.label || '').trim();
      if (!label) return res.status(400).json(errorResponse(400, 'label cannot be empty'));
      sets.push(`label = $${i++}`);
      vals.push(label);
    }
    if (a.sort_order !== undefined) {
      sets.push(`sort_order = $${i++}`);
      vals.push(Number(a.sort_order) || 0);
    }
    if (a.active !== undefined) {
      sets.push(`active = $${i++}`);
      vals.push(Boolean(a.active));
    }
    if (a.category !== undefined) {
      sets.push(`category = $${i++}`);
      vals.push(String(a.category).trim() || 'formal');
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes to update'));

    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE meeting_types
       SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i}
       RETURNING id, code, label, category, sort_order, active`,
      vals
    );
    if (!rows.length) return res.status(404).json(errorResponse(404, 'Meeting type not found'));
    logger.info('✅ Meeting type updated', { id: req.params.id });
    res.json(serialize('meeting-type', rows[0]));
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json(errorResponse(409, 'Meeting type code already exists'));
    }
    next(e);
  }
};

exports.reorder = async (req, res, next) => {
  try {
    const { order } = parseAttributes(req);
    if (!Array.isArray(order) || !order.length) {
      return res.status(400).json(errorResponse(400, 'order must be a non-empty array of IDs'));
    }
    await Promise.all(
      order.map((id, idx) => query(
        `UPDATE meeting_types SET sort_order = $1, updated_at = NOW() WHERE id = $2`,
        [idx + 1, id]
      ))
    );
    logger.info('💾 Meeting types reordered', { count: order.length });
    res.json({ data: { type: 'meeting-type-order', attributes: { order } } });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT code FROM meeting_types WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json(errorResponse(404, 'Meeting type not found'));

    const { rows: used } = await query(
      `SELECT COUNT(*)::int AS cnt FROM meetings WHERE type = $1`,
      [rows[0].code]
    );
    if (used[0].cnt > 0) {
      return res.status(409).json(errorResponse(409, `Cannot delete: meeting type is used by ${used[0].cnt} meeting(s)`));
    }

    await query(`DELETE FROM meeting_types WHERE id = $1`, [req.params.id]);
    logger.info('🗑️ Meeting type deleted', { id: req.params.id });
    res.status(204).end();
  } catch (e) { next(e); }
};
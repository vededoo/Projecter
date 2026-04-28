'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `id, project_id, title, type, start_at, end_at, location, video_link,
              transformer_transcript_id, minutes, decisions, actions, created_at, updated_at`;

const FIELDS = ['title', 'type', 'start_at', 'end_at', 'location', 'video_link',
                'transformer_transcript_id', 'minutes', 'decisions', 'actions'];

const ENUM_CASTS = { type: '::meeting_type' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, type, from, to } = req.query;
    const conds = []; const params = [];
    if (project_id) { params.push(project_id); conds.push(`project_id = $${params.length}`); }
    if (type)       { params.push(type);       conds.push(`type = $${params.length}::meeting_type`); }
    if (from)       { params.push(from);       conds.push(`start_at >= $${params.length}::timestamptz`); }
    if (to)         { params.push(to);         conds.push(`start_at <= $${params.length}::timestamptz`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLS} FROM meetings ${where} ORDER BY start_at DESC LIMIT 500`,
      params
    );
    res.json(serialize('meeting', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLS} FROM meetings WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    const { rows: attendees } = await query(
      `SELECT ma.contact_id, ma.status, c.last_name, c.first_name
         FROM meeting_attendees ma JOIN contacts c ON c.id = ma.contact_id
         WHERE ma.meeting_id = $1`,
      [req.params.id]
    );
    const data = serialize('meeting', rows[0]);
    data.data.attributes.attendees = attendees;
    res.json(data);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.title || !a.type || !a.start_at) {
      return res.status(400).json(errorResponse(400, 'title, type and start_at are required'));
    }
    const { rows } = await query(
      `INSERT INTO meetings (project_id, title, type, start_at, end_at, location, video_link,
                             transformer_transcript_id, minutes, decisions, actions)
       VALUES ($1, $2, $3::meeting_type, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9, $10, $11)
       RETURNING ${COLS}`,
      [a.project_id || null, a.title, a.type, a.start_at, a.end_at || null,
       a.location || null, a.video_link || null, a.transformer_transcript_id || null,
       a.minutes || null, a.decisions || null, a.actions || null]
    );
    logger.info('✅ Meeting created', { id: rows[0].id, type: rows[0].type });
    res.status(201).json(serialize('meeting', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        const cast = ENUM_CASTS[f] || ((f === 'start_at' || f === 'end_at') ? '::timestamptz' : '');
        sets.push(`${f} = $${i++}${cast}`); vals.push(a[f]);
      }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE meetings SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING ${COLS}`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    res.json(serialize('meeting', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM meetings WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

// ── attendees sub-resource ─────────────────────────────────────────────
exports.addAttendee = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.contact_id) return res.status(400).json(errorResponse(400, 'contact_id is required'));
    const { rows } = await query(
      `INSERT INTO meeting_attendees (meeting_id, contact_id, status)
       VALUES ($1, $2, COALESCE($3::attendance_status,'invited'::attendance_status))
       ON CONFLICT (meeting_id, contact_id) DO UPDATE SET status = EXCLUDED.status
       RETURNING id, meeting_id, contact_id, status`,
      [req.params.id, a.contact_id, a.status || null]
    );
    res.status(201).json(serialize('meeting-attendee', rows[0]));
  } catch (e) { next(e); }
};

exports.removeAttendee = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM meeting_attendees WHERE meeting_id = $1 AND contact_id = $2`,
      [req.params.id, req.params.contactId]
    );
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Attendee not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

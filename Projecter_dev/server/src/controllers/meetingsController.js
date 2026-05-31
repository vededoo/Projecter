'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const COLS = `id, project_id, title, type, meeting_category, start_at, end_at, location, video_link,
              transformer_transcript_id, minutes, mail_cr, decisions, actions,
              raw_transcript, extraction_status, extraction_error,
              extracted_at, validated_at, executive_summary, ai_report,
              audio_path, transcription_status, transcription_error, transcription_segments,
              created_at, updated_at`;

const FIELDS = ['project_id', 'title', 'type', 'meeting_category', 'start_at', 'end_at', 'location', 'video_link',
                'transformer_transcript_id', 'minutes', 'mail_cr', 'decisions', 'actions',
                'raw_transcript', 'extraction_status', 'executive_summary', 'ai_report',
                'audio_path', 'transcription_status'];

const ENUM_CASTS = { type: '::meeting_type' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, type, from, to, unlinked } = req.query;
    const conds = []; const params = [];
    if (project_id) { params.push(project_id); conds.push(`project_id = $${params.length}`); }
    if (type)       { params.push(type);       conds.push(`type = $${params.length}::meeting_type`); }
    if (from)       { params.push(from);       conds.push(`start_at >= $${params.length}::timestamptz`); }
    if (to)         { params.push(to);         conds.push(`start_at <= $${params.length}::timestamptz`); }
    if (unlinked === '1') conds.push(`transformer_transcript_id IS NULL`);
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
    const [attendeesRes, topicsRes, decisionsRes, actionsRes] = await Promise.all([
      query(
        `SELECT ma.contact_id, ma.status, ma.role, ma.sort_order, c.last_name, c.first_name
           FROM meeting_attendees ma JOIN contacts c ON c.id = ma.contact_id
           WHERE ma.meeting_id = $1
           ORDER BY ma.sort_order, ma.id`,
        [req.params.id]
      ),
      query(
        `SELECT id, position, title, summary, type, project_topic_id,
                commitment_level, linked_object_type, linked_object_id
           FROM meeting_topics
           WHERE meeting_id = $1 ORDER BY position, id`,
        [req.params.id]
      ),
      query(
        `SELECT id, description, impact, position FROM meeting_decisions
           WHERE meeting_id = $1 ORDER BY position NULLS LAST, id`,
        [req.params.id]
      ),
      query(
        `SELECT id, description, owner_id, owner_raw, deadline, status, notes, meeting_topic_id FROM meeting_actions
           WHERE meeting_id = $1 ORDER BY id`,
        [req.params.id]
      ),
    ]);
    const data = serialize('meeting', rows[0]);
    data.data.attributes.attendees       = attendeesRes.rows;
    data.data.attributes.meeting_topics   = topicsRes.rows;
    data.data.attributes.meeting_decisions = decisionsRes.rows;
    data.data.attributes.meeting_actions  = actionsRes.rows;
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
      `INSERT INTO meetings (project_id, title, type, meeting_category, start_at, end_at, location, video_link,
                             transformer_transcript_id, minutes, decisions, actions)
       VALUES ($1, $2, $3::meeting_type, COALESCE($4,'formal'), $5::timestamptz, $6::timestamptz, $7, $8, $9, $10, $11, $12)
       RETURNING ${COLS}`,
      [a.project_id || null, a.title, a.type, a.meeting_category || null, a.start_at, a.end_at || null,
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
      `INSERT INTO meeting_attendees (meeting_id, contact_id, status, role)
       VALUES ($1, $2, COALESCE($3::attendance_status,'invited'::attendance_status), $4)
       ON CONFLICT (meeting_id, contact_id) DO UPDATE SET status = EXCLUDED.status, role = COALESCE(EXCLUDED.role, meeting_attendees.role)
       RETURNING id, meeting_id, contact_id, status, role`,
      [req.params.id, a.contact_id, a.status || null, a.role || null]
    );
    res.status(201).json(serialize('meeting-attendee', rows[0]));
  } catch (e) { next(e); }
};

exports.updateAttendee = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = [];
    const params = [req.params.id, req.params.contactId];
    if (a.role !== undefined)   { params.push(a.role || null);              sets.push(`role = $${params.length}`); }
    if (a.status !== undefined) { params.push(a.status);                   sets.push(`status = $${params.length}::attendance_status`); }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'Nothing to update'));
    const { rows } = await query(
      `UPDATE meeting_attendees SET ${sets.join(', ')}
       WHERE meeting_id = $1 AND contact_id = $2
       RETURNING id, meeting_id, contact_id, status, role`,
      params
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Attendee not found'));
    res.json(serialize('meeting-attendee', rows[0]));
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

exports.reorderAttendees = async (req, res, next) => {
  try {
    const { order } = req.body?.data?.attributes || {}; // order = [contact_id, ...] in desired order
    if (!Array.isArray(order) || !order.length) return res.status(400).json(errorResponse(400, 'order[] is required'));
    await Promise.all(
      order.map((contactId, idx) => query(
        `UPDATE meeting_attendees SET sort_order = $1 WHERE meeting_id = $2 AND contact_id = $3`,
        [idx, req.params.id, contactId]
      ))
    );
    logger.info(`💾 Attendees reordered — meeting #${req.params.id}`);
    res.json({ data: { type: 'meeting-attendees-order', attributes: { meeting_id: req.params.id, order } } });
  } catch (e) { next(e); }
};

exports.validateExtraction = async (req, res, next) => {
  try {
    const a = require('../utils/jsonapi').parseAttributes(req);
    const validated = a.validated !== undefined ? Boolean(a.validated) : true;
    const { rows } = await query(
      `UPDATE meetings
         SET validated_at = ${validated ? 'NOW()' : 'NULL'},
             updated_at   = NOW()
         WHERE id = $1
         RETURNING id, validated_at, extraction_status`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    logger.info(validated ? '✅ Meeting CR validated' : '⚠️ Meeting CR unvalidated', { id: req.params.id });
    res.json({ data: { type: 'meeting', id: String(rows[0].id), attributes: { validated_at: rows[0].validated_at, extraction_status: rows[0].extraction_status } } });
  } catch (e) { next(e); }
};

'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// ── List project topics with their latest snapshot ──────────────────────────
//
// For each project_topic, we use a LATERAL join to fetch the most recent
// meeting_topic linked to it (ordered by meeting.start_at DESC).
// This gives the "current state" view at project level.

exports.list = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json(errorResponse(400, 'project_id is required'));
    }

    const { rows } = await query(
      `SELECT
         pt.id, pt.project_id, pt.title, pt.status,
         pt.axes::text[] AS axes, pt.synthesis, pt.confidence, pt.owner, pt.due_date,
         pt.created_at, pt.updated_at,
         -- Latest snapshot fields (NULL if no meeting_topic linked yet)
         ls.snapshot_id,
         ls.snapshot_title,
         ls.snapshot_summary,
         ls.snapshot_type,
         ls.last_meeting_id,
         ls.last_meeting_title,
         ls.last_meeting_date,
         ls.last_meeting_category
       FROM project_topics pt
       LEFT JOIN LATERAL (
         SELECT
           mt.id             AS snapshot_id,
           mt.title          AS snapshot_title,
           mt.summary        AS snapshot_summary,
           mt.type           AS snapshot_type,
           m.id              AS last_meeting_id,
           m.title           AS last_meeting_title,
           m.start_at        AS last_meeting_date,
           m.meeting_category AS last_meeting_category
         FROM meeting_topics mt
         JOIN meetings m ON m.id = mt.meeting_id
         WHERE mt.project_topic_id = pt.id
         ORDER BY m.start_at DESC
         LIMIT 1
       ) ls ON true
       WHERE pt.project_id = $1
       ORDER BY pt.updated_at DESC`,
      [project_id]
    );

    res.json(serialize('project-topic', rows));
  } catch (e) { next(e); }
};

// ── Get one topic + full snapshot history ────────────────────────────────────

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, project_id, title, status,
              axes::text[] AS axes, synthesis, confidence, owner, due_date,
              created_at, updated_at
         FROM project_topics WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Project topic not found'));

    const { rows: history } = await query(
      `SELECT
         mt.id, mt.title, mt.summary, mt.type, mt.position,
         m.id AS meeting_id, m.title AS meeting_title,
         m.start_at AS meeting_date, m.meeting_category
       FROM meeting_topics mt
       JOIN meetings m ON m.id = mt.meeting_id
       WHERE mt.project_topic_id = $1
       ORDER BY m.start_at DESC`,
      [req.params.id]
    );

    const data = serialize('project-topic', rows[0]);
    data.data.attributes.history = history;
    res.json(data);
  } catch (e) { next(e); }
};

// ── Create project topic ─────────────────────────────────────────────────────

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.project_id || !a.title) {
      return res.status(400).json(errorResponse(400, 'project_id and title are required'));
    }
    const { rows } = await query(
      `INSERT INTO project_topics (project_id, title, status, axes, synthesis, confidence, owner, due_date)
       VALUES ($1, $2, COALESCE($3, 'open'), COALESCE($4, '{}')::project_axis[], $5,
               $6::confidence_level, $7, $8)
       RETURNING id, project_id, title, status, axes::text[] AS axes, synthesis, confidence, owner, due_date, created_at, updated_at`,
      [a.project_id, a.title, a.status || null,
       a.axes || null, a.synthesis || null,
       a.confidence || null, a.owner || null, a.due_date || null]
    );
    logger.info('✅ Project topic created', { id: rows[0].id, title: rows[0].title });
    res.status(201).json(serialize('project-topic', rows[0]));
  } catch (e) { next(e); }
};

// ── Update project topic ─────────────────────────────────────────────────────

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    if (a.title      !== undefined) { sets.push(`title      = $${i++}`); vals.push(a.title); }
    if (a.status     !== undefined) { sets.push(`status     = $${i++}`); vals.push(a.status); }
    if (a.axes       !== undefined) { sets.push(`axes       = $${i++}::project_axis[]`); vals.push(a.axes); }
    if (a.synthesis  !== undefined) { sets.push(`synthesis  = $${i++}`); vals.push(a.synthesis); }
    if (a.confidence !== undefined) { sets.push(`confidence = $${i++}::confidence_level`); vals.push(a.confidence); }
    if (a.owner      !== undefined) { sets.push(`owner      = $${i++}`); vals.push(a.owner); }
    if (a.due_date   !== undefined) { sets.push(`due_date   = $${i++}`); vals.push(a.due_date); }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE project_topics SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING id, project_id, title, status,
             axes::text[] AS axes, synthesis, confidence, owner, due_date, created_at, updated_at`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Project topic not found'));
    logger.info('✅ Project topic updated', { id: rows[0].id, status: rows[0].status });
    res.json(serialize('project-topic', rows[0]));
  } catch (e) { next(e); }
};

// ── Delete project topic ─────────────────────────────────────────────────────

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM project_topics WHERE id = $1`, [req.params.id]
    );
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Project topic not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

// ── Create a meeting_topic manually ─────────────────────────────────────────
//
// POST /meeting-topics  { meeting_id, title, summary?, type?, commitment_level? }

exports.createMeetingTopic = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.meeting_id || !a.title) {
      return res.status(400).json(errorResponse(400, 'meeting_id and title are required'));
    }
    const { rows: [{ max_pos }] } = await query(
      `SELECT COALESCE(MAX(position), 0) AS max_pos FROM meeting_topics WHERE meeting_id = $1`,
      [a.meeting_id]
    );
    const { rows } = await query(
      `INSERT INTO meeting_topics (meeting_id, position, title, summary, type, commitment_level)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'open_point')::topic_type, COALESCE($6, 'mentioned')::commitment_level)
       RETURNING id, meeting_id, position, title, summary, type, commitment_level, project_topic_id`,
      [a.meeting_id, Number(max_pos) + 1, a.title, a.summary || null, a.type || null, a.commitment_level || null]
    );
    logger.info('✅ Meeting topic created manually', { id: rows[0].id, title: rows[0].title });
    res.status(201).json(serialize('meeting-topic', rows[0]));
  } catch (e) { next(e); }
};

// ── Unified topics registry for a project ───────────────────────────────────
//
// GET /topics-registry?project_id=X
// Returns ALL meeting_topics for every meeting in the project,
// with their linked project_topic info (if any).
// Sorted: promoted topics first (alphabetically), orphans last; then by meeting date desc.

exports.registry = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json(errorResponse(400, 'project_id is required'));

    const { rows } = await query(
      `SELECT
         mt.id,
         mt.title, mt.summary, mt.type, mt.commitment_level,
         mt.project_topic_id, mt.position,
         m.id              AS meeting_id,
         m.title           AS meeting_title,
         m.start_at        AS meeting_date,
         m.meeting_category,
         pt.title          AS project_topic_title,
         pt.status         AS project_topic_status
       FROM meeting_topics mt
       JOIN meetings m ON m.id = mt.meeting_id
       LEFT JOIN project_topics pt ON pt.id = mt.project_topic_id
       WHERE m.project_id = $1
       ORDER BY COALESCE(pt.title, 'zzzzz') ASC, m.start_at DESC`,
      [project_id]
    );
    res.json(serialize('topic-registry-item', rows));
  } catch (e) { next(e); }
};

// ── Link / unlink a meeting_topic to a project_topic ────────────────────────
//
// PATCH /meeting-topics/:id  { project_topic_id: 5 | null }
//   OR                       { link_to_meeting_topic_id: 12 }  → auto-promote

exports.linkMeetingTopic = async (req, res, next) => {
  try {
    const a = parseAttributes(req);

    // Auto-promote: link to another meeting_topic (orphan) → creates a project_topic if needed
    if (a.link_to_meeting_topic_id) {
      const { rows: [src] } = await query(
        `SELECT mt.id, mt.title, mt.project_topic_id, m.project_id
           FROM meeting_topics mt
           JOIN meetings m ON m.id = mt.meeting_id
          WHERE mt.id = $1`,
        [a.link_to_meeting_topic_id]
      );
      if (!src) return res.status(404).json(errorResponse(404, 'Source meeting topic not found'));

      let ptId = src.project_topic_id;
      if (!ptId) {
        // Promote the source meeting_topic to a new project_topic
        const { rows: [newPt] } = await query(
          `INSERT INTO project_topics (project_id, title, status)
           VALUES ($1, $2, 'open') RETURNING id`,
          [src.project_id, src.title]
        );
        ptId = newPt.id;
        await query(
          `UPDATE meeting_topics SET project_topic_id = $1 WHERE id = $2`,
          [ptId, src.id]
        );
        logger.info('✅ Meeting topic auto-promoted to project topic', { src_id: src.id, pt_id: ptId });
      }

      const { rows } = await query(
        `UPDATE meeting_topics SET project_topic_id = $1
           WHERE id = $2
         RETURNING id, meeting_id, title, summary, type, project_topic_id`,
        [ptId, req.params.id]
      );
      if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting topic not found'));
      logger.info('✅ Meeting topic linked via auto-promote', { id: rows[0].id, pt_id: ptId });
      return res.json(serialize('meeting-topic', { ...rows[0], auto_promoted_pt_id: ptId }));
    }

    // Standard link to an explicit project_topic_id
    const projectTopicId = a.project_topic_id !== undefined ? a.project_topic_id : null;
    const { rows } = await query(
      `UPDATE meeting_topics
         SET project_topic_id = $1
       WHERE id = $2
       RETURNING id, meeting_id, title, summary, type, project_topic_id`,
      [projectTopicId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting topic not found'));
    logger.info('✅ Meeting topic linked', { id: rows[0].id, project_topic_id: projectTopicId });
    res.json(serialize('meeting-topic', rows[0]));
  } catch (e) { next(e); }
};

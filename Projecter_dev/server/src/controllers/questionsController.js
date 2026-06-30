'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// v_questions : statut, owner résolu, destinataires (asked_to) + projets N-N, provenance réunion.
const VIEW_COLS = `id, title, status, owner_contact_id, owner_name, due_date,
                   answer, answered_at, answered_in_meeting_id,
                   meeting_id, meeting_topic_id, meeting_title, meeting_date,
                   is_overdue, asked_to, projects, created_at, updated_at`;

const FIELDS = ['title', 'status', 'owner_contact_id', 'due_date',
                'answer', 'answered_at', 'answered_in_meeting_id', 'meeting_topic_id'];
const ENUM_CASTS = { status: '::question_status' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, status, owner_id, overdue } = req.query;
    const conds = []; const params = [];
    if (project_id) {
      params.push(project_id);
      conds.push(`id IN (SELECT question_id FROM question_projects WHERE project_id = $${params.length}::integer)`);
    }
    if (status)   { params.push(status);   conds.push(`status = $${params.length}::question_status`); }
    if (owner_id) { params.push(owner_id); conds.push(`owner_contact_id = $${params.length}::integer`); }
    if (overdue === 'true') conds.push('is_overdue = true');
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${VIEW_COLS} FROM v_questions ${where}
         ORDER BY is_overdue DESC, due_date NULLS LAST, created_at DESC LIMIT 500`,
      params
    );
    res.json(serialize('question', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_questions WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Question not found'));
    res.json(serialize('question', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.title) return res.status(400).json(errorResponse(400, 'title is required'));
    const { rows: [question] } = await query(
      `INSERT INTO questions (title, status, owner_contact_id, due_date, answer,
                              answered_at, answered_in_meeting_id, meeting_id, meeting_topic_id)
       VALUES ($1, $2::question_status, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [a.title, a.status || 'to_ask', a.owner_contact_id || null, a.due_date || null,
       a.answer || null, a.answered_at || null, a.answered_in_meeting_id || null,
       a.meeting_id || null, a.meeting_topic_id || null]
    );
    // Destinataires (asked_to: number[])
    for (const cid of (a.asked_to || [])) {
      await query(
        `INSERT INTO question_contacts (question_id, contact_id)
         VALUES ($1, $2) ON CONFLICT (question_id, contact_id) DO NOTHING`,
        [question.id, cid]
      );
    }
    // Projets (project_ids ou project_id)
    const pids = a.project_ids || (a.project_id ? [a.project_id] : []);
    for (const pid of pids) {
      await query(
        `INSERT INTO question_projects (question_id, project_id, role, context)
         VALUES ($1, $2, $3, $4) ON CONFLICT (question_id, project_id) DO NOTHING`,
        [question.id, pid, a.role || null, a.context || null]
      );
    }
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_questions WHERE id = $1`, [question.id]);
    logger.info('✅ Question created', { id: question.id });
    res.status(201).json(serialize('question', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        sets.push(`${f} = $${i++}${ENUM_CASTS[f] || ''}`);
        vals.push(a[f]);
      }
    }
    // Auto-stamp answered_at quand le statut passe à 'answered' sans date fournie
    if (a.status === 'answered' && a.answered_at === undefined) {
      sets.push(`answered_at = COALESCE(answered_at, NOW())`);
    }
    if (!sets.length && a.asked_to === undefined) {
      return res.status(400).json(errorResponse(400, 'No attributes provided'));
    }
    if (sets.length) {
      vals.push(req.params.id);
      await query(`UPDATE questions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`, vals);
    }
    // Remplacement complet des destinataires si asked_to fourni
    if (a.asked_to !== undefined) {
      await query(`DELETE FROM question_contacts WHERE question_id = $1`, [req.params.id]);
      for (const cid of (a.asked_to || [])) {
        await query(
          `INSERT INTO question_contacts (question_id, contact_id)
           VALUES ($1, $2) ON CONFLICT (question_id, contact_id) DO NOTHING`,
          [req.params.id, cid]
        );
      }
    }
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_questions WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Question not found'));
    res.json(serialize('question', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM questions WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Question not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

exports.linkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    const { role, context } = req.body?.data?.attributes || {};
    await query(
      `INSERT INTO question_projects (question_id, project_id, role, context)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (question_id, project_id) DO UPDATE
         SET role = EXCLUDED.role, context = EXCLUDED.context`,
      [id, projectId, role || null, context || null]
    );
    const { rows } = await query(`SELECT ${VIEW_COLS} FROM v_questions WHERE id = $1`, [id]);
    logger.info('✅ Question linked to project', { questionId: id, projectId });
    res.json(serialize('question', rows[0]));
  } catch (e) { next(e); }
};

exports.unlinkProject = async (req, res, next) => {
  try {
    const { id, projectId } = req.params;
    await query(`DELETE FROM question_projects WHERE question_id = $1 AND project_id = $2`, [id, projectId]);
    logger.info('✅ Question unlinked from project', { questionId: id, projectId });
    res.status(204).end();
  } catch (e) { next(e); }
};

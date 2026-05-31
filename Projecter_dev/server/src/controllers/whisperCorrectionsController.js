'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// ─── whisper_corrections CRUD ────────────────────────────────────────────

exports.listCorrections = async (req, res) => {
  try {
    const domain = req.query.domain || 'ETNIC';
    const { rows } = await query(
      `SELECT id, domain, incorrect, correct, notes, source, confidence, created_at, updated_at
         FROM whisper_corrections
        WHERE domain = $1
        ORDER BY incorrect ASC`,
      [domain]
    );
    res.json({ data: rows.map(r => ({ id: String(r.id), type: 'whisper-correction', attributes: r })) });
  } catch (e) {
    logger.error('❌ listCorrections', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

exports.createCorrection = async (req, res) => {
  try {
    const attrs = parseAttributes(req.body);
    const { domain = 'ETNIC', incorrect, correct, notes, source = 'user', confidence } = attrs;
    if (!incorrect || !correct) return res.status(422).json(errorResponse('incorrect and correct are required'));

    const { rows } = await query(
      `INSERT INTO whisper_corrections (domain, incorrect, correct, notes, source, confidence)
       VALUES ($1, LOWER(TRIM($2)), $3, $4, $5, $6)
       ON CONFLICT (domain, incorrect) DO UPDATE
         SET correct = EXCLUDED.correct, notes = EXCLUDED.notes,
             source = EXCLUDED.source, confidence = EXCLUDED.confidence,
             updated_at = NOW()
       RETURNING id, domain, incorrect, correct, notes, source, confidence, created_at, updated_at`,
      [domain, incorrect, correct, notes || null, source, confidence ?? null]
    );
    logger.info('✅ whisper correction upserted', { incorrect, correct, domain });
    res.status(201).json({ data: { id: String(rows[0].id), type: 'whisper-correction', attributes: rows[0] } });
  } catch (e) {
    logger.error('❌ createCorrection', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

exports.updateCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const attrs = parseAttributes(req.body);
    const { correct, notes, source, confidence } = attrs;
    const { rows } = await query(
      `UPDATE whisper_corrections
          SET correct = COALESCE($1, correct),
              notes = COALESCE($2, notes),
              source = COALESCE($3, source),
              confidence = COALESCE($4::float, confidence),
              updated_at = NOW()
        WHERE id = $5
        RETURNING id, domain, incorrect, correct, notes, source, confidence, created_at, updated_at`,
      [correct ?? null, notes ?? null, source ?? null, confidence ?? null, id]
    );
    if (!rows.length) return res.status(404).json(errorResponse('Not found'));
    res.json({ data: { id: String(rows[0].id), type: 'whisper-correction', attributes: rows[0] } });
  } catch (e) {
    logger.error('❌ updateCorrection', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

exports.deleteCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM whisper_corrections WHERE id = $1', [id]);
    res.status(204).send();
  } catch (e) {
    logger.error('❌ deleteCorrection', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

// ─── Phonetic / trigram contact search ──────────────────────────────────
// Uses pg_trgm similarity on "last_name first_name".
// Also tries similarity on last_name alone (handles "Lesne" when only surname spoken).
exports.phoneticContactSearch = async (req, res) => {
  try {
    const token = (req.query.q || '').trim();
    if (!token || token.length < 2) return res.json({ data: [] });

    const { rows } = await query(
      `SELECT id, last_name, first_name, job_title, department, email,
              GREATEST(
                similarity(LOWER(last_name), LOWER($1)),
                similarity(LOWER(COALESCE(last_name,'') || ' ' || COALESCE(first_name,'')), LOWER($1)),
                similarity(LOWER(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), LOWER($1))
              ) AS score
         FROM contacts
        WHERE active = true
          AND (
            similarity(LOWER(last_name), LOWER($1)) > 0.15
            OR similarity(LOWER(COALESCE(last_name,'') || ' ' || COALESCE(first_name,'')), LOWER($1)) > 0.15
          )
        ORDER BY score DESC
        LIMIT 10`,
      [token]
    );
    res.json({
      data: rows.map(r => ({
        id: String(r.id),
        type: 'contact',
        attributes: {
          id: r.id, last_name: r.last_name, first_name: r.first_name,
          job_title: r.job_title, department: r.department, email: r.email,
          score: parseFloat(r.score),
        },
      })),
    });
  } catch (e) {
    logger.error('❌ phoneticContactSearch', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

// ─── Per-meeting whisper suggestions ────────────────────────────────────

exports.listSuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // optional filter: pending | confirmed | rejected | custom
    const params = [id];
    const whereStatus = status ? ` AND status = $2::whisper_suggestion_status` : '';
    if (status) params.push(status);

    const { rows } = await query(
      `SELECT s.id, s.meeting_id, s.token, s.context_text, s.suggestion,
              s.contact_id, c.last_name AS contact_last_name, c.first_name AS contact_first_name,
              s.tc_start, s.tc_end, s.confidence, s.source,
              s.status, s.user_correction, s.created_at, s.updated_at
         FROM meeting_whisper_suggestions s
         LEFT JOIN contacts c ON c.id = s.contact_id
        WHERE s.meeting_id = $1 ${whereStatus}
        ORDER BY s.tc_start ASC NULLS LAST, s.id ASC`,
      params
    );
    res.json({
      data: rows.map(r => ({ id: String(r.id), type: 'whisper-suggestion', attributes: r })),
    });
  } catch (e) {
    logger.error('❌ listSuggestions', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

// Bulk upsert called by MCP after scanning transcript
exports.storeSuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    const attrs = parseAttributes(req.body);
    const suggestions = attrs.suggestions;
    if (!Array.isArray(suggestions) || !suggestions.length) {
      return res.status(422).json(errorResponse('suggestions array is required'));
    }

    const inserted = [];
    for (const s of suggestions) {
      const { rows } = await query(
        `INSERT INTO meeting_whisper_suggestions
           (meeting_id, token, context_text, suggestion, contact_id,
            tc_start, tc_end, confidence, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          id, s.token, s.context_text || null, s.suggestion || null,
          s.contact_id || null, s.tc_start ?? null, s.tc_end ?? null,
          s.confidence ?? null, s.source || 'mcp',
        ]
      );
      if (rows.length) inserted.push(rows[0].id);
    }
    logger.info(`✅ stored ${inserted.length} whisper suggestions for meeting ${id}`);
    res.status(201).json({ data: { attributes: { stored: inserted.length } } });
  } catch (e) {
    logger.error('❌ storeSuggestions', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

// User resolves a suggestion (confirm / reject / custom correction)
exports.resolveSuggestion = async (req, res) => {
  try {
    const { id: meetingId, suggId } = req.params;
    const attrs = parseAttributes(req.body);
    const { status, user_correction } = attrs;

    if (!['confirmed', 'rejected', 'custom'].includes(status)) {
      return res.status(422).json(errorResponse('status must be confirmed | rejected | custom'));
    }

    const { rows } = await query(
      `UPDATE meeting_whisper_suggestions
          SET status = $1::whisper_suggestion_status,
              user_correction = $2,
              updated_at = NOW()
        WHERE id = $3 AND meeting_id = $4
        RETURNING id, meeting_id, token, suggestion, status, user_correction, tc_start, tc_end`,
      [status, user_correction || null, suggId, meetingId]
    );
    if (!rows.length) return res.status(404).json(errorResponse('Not found'));

    // If confirmed or custom → auto-add to dictionary (domain ETNIC by default)
    if (status === 'confirmed' || status === 'custom') {
      const correct = status === 'custom' ? user_correction : rows[0].suggestion;
      if (correct && rows[0].token) {
        await query(
          `INSERT INTO whisper_corrections (domain, incorrect, correct, source, confidence)
           VALUES ('ETNIC', LOWER(TRIM($1)), $2, 'user', 1.0)
           ON CONFLICT (domain, incorrect) DO UPDATE
             SET correct = EXCLUDED.correct, source = 'user', confidence = 1.0, updated_at = NOW()`,
          [rows[0].token, correct]
        );
        logger.info(`✅ dict enriched: "${rows[0].token}" → "${correct}"`);
      }
    }

    res.json({ data: { id: String(rows[0].id), type: 'whisper-suggestion', attributes: rows[0] } });
  } catch (e) {
    logger.error('❌ resolveSuggestion', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

// Clear all pending suggestions for a meeting (before re-scan)
exports.clearSuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      `DELETE FROM meeting_whisper_suggestions WHERE meeting_id = $1 AND status = 'pending'`,
      [id]
    );
    res.status(204).send();
  } catch (e) {
    logger.error('❌ clearSuggestions', { msg: e.message });
    res.status(500).json(errorResponse(e.message));
  }
};

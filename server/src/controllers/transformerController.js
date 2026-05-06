'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

const TRANSFORMER_URL = process.env.TRANSFORMER_URL || 'http://localhost:5044';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/transformer/texts/:id
// Proxy : récupère la transcription complète depuis Transformer.
// Utilisé dans le détail d'une réunion pour afficher la transcription liée.
// ─────────────────────────────────────────────────────────────────────────────
exports.getText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const url = `${TRANSFORMER_URL}/api/texts/${id}`;
    logger.info('🔗 Fetching text from Transformer', { url });
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(502).json({
        errors: [{ status: '502', detail: `Transformer responded ${r.status}` }],
      });
    }
    const body = await r.json();
    // Re-shape : on ne retourne que ce dont Projecter a besoin
    const t = body.data?.attributes || {};
    res.json({
      data: {
        id: body.data?.id,
        type: 'transformer-text',
        attributes: {
          title:            t.title,
          content:          t.content,
          recording_date:   t.recording_date,
          location:         t.location,
          transcript_type:  t.transcript_type,
          language_code:    t.language_code,
          language_name:    t.language_name,
          authors:          t.authors,
          has_mp3:          t.has_mp3 || false,
        },
      },
      meta: { source: TRANSFORMER_URL },
    });
  } catch (e) {
    logger.error('❌ Transformer unreachable', { error: e.message });
    res.status(502).json({
      errors: [{ status: '502', detail: `Transformer unreachable: ${e.message}` }],
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meetings/:id/inject-transcript
// Injecte la réunion dans Transformer (crée ou met à jour le text lié).
// Corps JSON:API :
//   { data: { type: 'inject-transcript', attributes: { force?: boolean } } }
//
// Workflow :
//   1. Charger la réunion Projecter
//   2. Si transformer_transcript_id existe déjà → retourner l'existant (sauf force=true)
//   3. Appeler POST /api/texts sur Transformer avec les métadonnées de la réunion
//   4. Stocker le text_id retourné dans meetings.transformer_transcript_id
// ─────────────────────────────────────────────────────────────────────────────
exports.injectTranscript = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const attrs = parseAttributes(req);
    const force = attrs.force === true;

    // Charger la réunion
    const { rows } = await query(
      `SELECT id, title, start_at, end_at, location, project_id, transformer_transcript_id
         FROM meetings WHERE id = $1`,
      [meetingId]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    const meeting = rows[0];

    // Déjà lié → retourner l'existant sauf si force
    if (meeting.transformer_transcript_id && !force) {
      return res.json({
        data: {
          id: String(meeting.transformer_transcript_id),
          type: 'transformer-text',
          attributes: { already_linked: true },
        },
        meta: { meeting_id: meetingId },
      });
    }

    // Créer le text dans Transformer
    const payload = {
      data: {
        type: 'text',
        attributes: {
          title:                meeting.title,
          recording_date:       meeting.start_at,
          location:             meeting.location || '',
          transcript_type:      'meeting',
          projecter_meeting_id: Number(meetingId),
          description:          `Transcription de la réunion Projecter #${meetingId}`,
        },
      },
    };

    const url = `${TRANSFORMER_URL}/api/texts`;
    logger.info('🚀 Creating text in Transformer for meeting', { meetingId, url });
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errBody = await r.text();
      logger.error('❌ Transformer create text failed', { status: r.status, body: errBody });
      return res.status(502).json({
        errors: [{ status: '502', detail: `Transformer responded ${r.status}: ${errBody}` }],
      });
    }

    const created = await r.json();
    const textId = Number(created.data?.id);
    if (!textId) {
      return res.status(502).json({
        errors: [{ status: '502', detail: 'Transformer did not return a valid text id' }],
      });
    }

    // Stocker le lien dans Projecter
    await query(
      `UPDATE meetings SET transformer_transcript_id = $1, updated_at = NOW() WHERE id = $2`,
      [textId, meetingId]
    );

    logger.info('✅ Meeting linked to Transformer text', { meetingId, textId });
    res.status(201).json({
      data: {
        id: String(textId),
        type: 'transformer-text',
        attributes: { title: meeting.title, transcript_type: 'meeting' },
      },
      meta: { meeting_id: meetingId },
    });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meetings/:id/transcript-webhook
// Webhook appelé par Transformer quand la transcription d'un text est terminée.
// Corps JSON:API :
//   { data: { type: 'transcript-webhook', attributes: { content: string, text_id: number } } }
//
// Workflow :
//   1. Vérifier que text_id correspond au transformer_transcript_id de la réunion
//   2. Stocker le contenu dans meetings.raw_transcript
//   3. Marquer extraction_status = 'pending' (prêt pour le pipeline LLM)
// ─────────────────────────────────────────────────────────────────────────────
exports.receiveTranscript = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const attrs = parseAttributes(req);
    const { content, text_id } = attrs;

    if (!content || !text_id) {
      return res.status(400).json(errorResponse(400, 'content and text_id are required'));
    }

    // Charger la réunion
    const { rows } = await query(
      `SELECT id, transformer_transcript_id FROM meetings WHERE id = $1`,
      [meetingId]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    if (rows[0].transformer_transcript_id !== Number(text_id)) {
      return res.status(409).json(
        errorResponse(409, `text_id mismatch: expected ${rows[0].transformer_transcript_id}, got ${text_id}`)
      );
    }

    await query(
      `UPDATE meetings
          SET raw_transcript    = $1,
              extraction_status = 'pending',
              updated_at        = NOW()
        WHERE id = $2`,
      [content, meetingId]
    );

    logger.info('✅ Transcript received for meeting', { meetingId, chars: content.length });
    res.json({
      data: { id: String(meetingId), type: 'meeting', attributes: { extraction_status: 'pending' } },
    });
  } catch (e) {
    next(e);
  }
};

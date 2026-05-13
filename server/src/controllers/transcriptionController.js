'use strict';
/**
 * transcriptionController.js — Transcription directe via Transcripter (sans Transformer).
 *
 * Routes :
 *   POST /api/meetings/:id/upload-audio          → upload fichier audio
 *   POST /api/meetings/:id/start-transcription   → lance la transcription en arrière-plan
 *   GET  /api/meetings/:id/transcription-progress → SSE progression (proxy vers Transcripter)
 *   GET  /api/meetings/:id/transcription-status   → statut courant (polling léger)
 */

const path = require('path');
const { query }                    = require('../utils/db');
const { parseAttributes, errorResponse } = require('../utils/jsonapi');
const transcripterClient           = require('../services/transcripterClient');
const logger                       = require('../utils/logger');
const localFileManager             = require('../utils/localFileManager');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Construit le textId SSE à partir de l'id de réunion.
 * Format "meeting-{id}" pour éviter les collisions avec les textId Languapp.
 */
function meetingTextId(meetingId) {
  return `meeting-${meetingId}`;
}

/**
 * Construit le texte brut du transcript depuis les segments Whisper.
 * Format : [SPEAKER_00 00:01:23] Texte du segment.
 */
function segmentsToRawTranscript(segments) {
  return segments.map((seg) => {
    const start = formatTime(seg.start || 0);
    const speaker = seg.speaker ? `[${seg.speaker} ${start}] ` : `[${start}] `;
    return `${speaker}${(seg.text || '').trim()}`;
  }).join('\n');
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── POST /api/meetings/:id/upload-audio ─────────────────────────────────────
// Multer (déclaré dans routes) dépose le fichier dans req.file (memoryStorage).
// On délègue la conversion mp3 128k mono à Transcripter (bytes-in/bytes-out),
// puis on persiste le résultat sous le nom canonique `{meetingId}.mp3`.

exports.uploadAudio = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    if (!req.file) {
      return res.status(400).json(errorResponse(400, 'audio file required'));
    }

    const { rows } = await query('SELECT id FROM meetings WHERE id = $1', [meetingId]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    // Conversion → mp3 128k mono via Transcripter
    const mp3Buffer = await transcripterClient.convertAudio(req.file.buffer, {
      filename: req.file.originalname || `meeting-${meetingId}`,
      mimeType: req.file.mimetype || 'application/octet-stream',
      bitrate:  '128k',
      channels: 1,
    });

    const audioPath = localFileManager.resolveAudioPath(meetingId); // → {audioDir}/{id}.mp3
    localFileManager.writeFileSync(audioPath, mp3Buffer);
    logger.info(`💾 Audio uploadé+converti pour meeting ${meetingId} → ${audioPath} (${mp3Buffer.length} bytes mp3, source ${req.file.size}B)`);

    await query(
      `UPDATE meetings
          SET audio_path = $1, transcription_status = 'idle', updated_at = NOW()
        WHERE id = $2`,
      [audioPath, meetingId]
    );

    res.json({
      data: {
        id: String(meetingId),
        type: 'meeting-audio',
        attributes: { audio_path: audioPath, size_bytes: mp3Buffer.length },
      },
    });
  } catch (e) {
    next(e);
  }
};

// ─── POST /api/meetings/:id/start-transcription ──────────────────────────────
// Lance la transcription en arrière-plan et répond immédiatement.
// Le client suit la progression via GET .../transcription-progress (SSE).

exports.startTranscription = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const attrs = parseAttributes(req);

    const { rows } = await query(
      `SELECT id, title, audio_path, transcription_status FROM meetings WHERE id = $1`,
      [meetingId]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    const meeting = rows[0];

    if (!meeting.audio_path || !localFileManager.exists(meeting.audio_path)) {
      return res.status(422).json(errorResponse(422, 'No audio file — upload audio first'));
    }
    if (meeting.transcription_status === 'running') {
      return res.status(409).json(errorResponse(409, 'Transcription already running'));
    }

    // Options depuis les attributs de la requête
    const language    = attrs.language    || 'fr';
    const model       = attrs.model       || 'large-v3-turbo';
    const maxLen      = attrs.maxLen      ?? 0;
    const splitOnWord = attrs.splitOnWord !== false;
    const diarize     = attrs.diarize     === true;
    const numSpeakers = attrs.numSpeakers || null;

    // Marquer comme en cours
    await query(
      `UPDATE meetings
          SET transcription_status = 'running', transcription_error = NULL, updated_at = NOW()
        WHERE id = $1`,
      [meetingId]
    );

    const textId = meetingTextId(meetingId);

    logger.info(`🚀 [transcription] Démarrage meeting ${meetingId} — ${meeting.audio_path}`, {
      language, model, diarize,
    });

    // Répondre immédiatement
    res.json({
      data: {
        id: String(meetingId),
        type: 'meeting',
        attributes: { transcription_status: 'running', textId },
      },
    });

    // ── Transcription en arrière-plan ──────────────────────────────────────
    transcripterClient.transcribeAudio({
      audioUrl:    meeting.audio_path,
      language,
      model,
      maxLen,
      splitOnWord,
      diarize,
      numSpeakers,
      textId,
    })
      .then(async ({ segments = [], stats, diarizeStats }) => {
        const rawTranscript = segmentsToRawTranscript(segments);
        await query(
          `UPDATE meetings
              SET transcription_status   = 'done',
                  transcription_error    = NULL,
                  transcription_segments = $1::jsonb,
                  raw_transcript         = $2,
                  extraction_status      = 'pending',
                  updated_at             = NOW()
            WHERE id = $3`,
          [JSON.stringify(segments), rawTranscript, meetingId]
        );
        logger.info(`✅ [transcription] Meeting ${meetingId} terminé — ${segments.length} segments${diarizeStats ? `, ${diarizeStats.numSpeakers} speakers` : ''}`);
      })
      .catch(async (err) => {
        logger.error(`❌ [transcription] Meeting ${meetingId} échoué : ${err.message}`);
        await query(
          `UPDATE meetings
              SET transcription_status = 'error',
                  transcription_error  = $1,
                  updated_at           = NOW()
            WHERE id = $2`,
          [err.message, meetingId]
        );
      });
  } catch (e) {
    next(e);
  }
};

// ─── GET /api/meetings/:id/transcription-progress ────────────────────────────
// SSE proxy : relaie la progression depuis Transcripter vers le client Projecter.

exports.transcriptionProgress = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { rows } = await query('SELECT id FROM meetings WHERE id = $1', [meetingId]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    const textId = meetingTextId(meetingId);
    transcripterClient.pipeProgress(textId, req, res);
  } catch (e) {
    next(e);
  }
};

// ─── GET /api/meetings/:id/audio ─────────────────────────────────────────────
// Stream le fichier audio avec support des range requests (seek dans le player).

exports.streamAudio = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { rows } = await query(
      'SELECT audio_path FROM meetings WHERE id = $1',
      [meetingId]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    const audioPath = rows[0].audio_path;
    if (!audioPath || !localFileManager.exists(audioPath)) {
      return res.status(404).json(errorResponse(404, 'Audio file not found'));
    }

    const fs = require('fs');
    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;
    const ext = path.extname(audioPath).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4'
      : ext === '.webm' ? 'audio/webm'
      : ext === '.ogg'  ? 'audio/ogg'
      : ext === '.wav'  ? 'audio/wav'
      : 'audio/mpeg';

    const commonHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(audioPath, { start, end });
      res.writeHead(206, {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize,
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, { ...commonHeaders, 'Content-Length': fileSize });
      fs.createReadStream(audioPath).pipe(res);
    }
  } catch (e) {
    next(e);
  }
};

// ─── GET /api/meetings/:id/transcription-status ──────────────────────────────
// Polling léger : retourne le statut courant (idle/running/done/error).

exports.transcriptionStatus = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { rows } = await query(
      `SELECT transcription_status, transcription_error,
              (transcription_segments IS NOT NULL) AS has_segments
         FROM meetings WHERE id = $1`,
      [meetingId]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    const { transcription_status, transcription_error, has_segments } = rows[0];
    res.json({
      data: {
        id: String(meetingId),
        type: 'transcription-status',
        attributes: {
          status:      transcription_status,
          error:       transcription_error || null,
          hasSegments: has_segments,
          textId:      meetingTextId(meetingId),
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

'use strict';
/**
 * diarizationController.js — Gestion des locuteurs détectés après transcription.
 *
 * Routes :
 *   GET    /api/meetings/:id/speakers                    → liste des locuteurs (DB + stats segments)
 *   POST   /api/meetings/:id/speakers/sync               → (re)crée les speakers depuis transcription_segments
 *   POST   /api/meetings/:id/speakers/identify           → appelle voice-id pour suggestions auto
 *   PATCH  /api/meetings/:id/speakers/:label             → assigne un contact à un locuteur
 *   DELETE /api/meetings/:id/speakers                    → remet à zéro tous les locuteurs du meeting
 */

const fs                  = require('fs');
const path                = require('path');
const { query }           = require('../utils/db');
const { parseAttributes, errorResponse } = require('../utils/jsonapi');
const voiceIdClient       = require('../services/voiceIdClient');
const logger              = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calcule la durée totale parlée par speaker à partir des segments Whisper. */
function _computeSpeakerStats(segments) {
  const byLabel = new Map();
  for (const seg of segments || []) {
    const label = seg.speaker;
    if (!label) continue;
    const dur = Math.max(0, (seg.end || 0) - (seg.start || 0));
    byLabel.set(label, (byLabel.get(label) || 0) + dur);
  }
  return byLabel; // Map<label, totalSeconds>
}

/** Sélectionne le ou les segments les plus longs par locuteur (pour voice-id). */
function _longestSegmentPerLabel(segments, topN = 3) {
  const byLabel = new Map();
  for (const seg of segments || []) {
    const label = seg.speaker;
    if (!label) continue;
    const dur = Math.max(0, (seg.end || 0) - (seg.start || 0));
    const list = byLabel.get(label) || [];
    list.push({ label, start: seg.start, end: seg.end, dur });
    list.sort((a, b) => b.dur - a.dur);
    byLabel.set(label, list.slice(0, topN));
  }
  return byLabel; // Map<label, [{label,start,end,dur}]>
}

function _serialize(row) {
  return {
    type: 'meeting-speaker',
    id:   String(row.id),
    attributes: {
      meeting_id:           row.meeting_id,
      label:                row.label,
      display_name:         row.display_name,
      contact_id:           row.contact_id,
      suggested_contact_id: row.suggested_contact_id,
      suggested_score:      row.suggested_score,
      suggested_confidence: row.suggested_confidence,
      total_duration_s:     row.total_duration_s,
      validated_by_user:    row.validated_by_user,
      created_at:           row.created_at,
      updated_at:           row.updated_at,
    },
  };
}

async function _getMeetingWithAudio(meetingId) {
  const { rows } = await query(
    `SELECT id, audio_path, transcription_segments, transcription_status
       FROM meetings WHERE id = $1`,
    [meetingId]
  );
  return rows[0] || null;
}

// ─── GET /api/meetings/:id/speakers ──────────────────────────────────────────

exports.list = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const meeting = await _getMeetingWithAudio(meetingId);
    if (!meeting) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    const { rows } = await query(
      `SELECT * FROM meeting_speakers WHERE meeting_id = $1 ORDER BY label`,
      [meetingId]
    );

    // Enrichir avec les stats calculées à partir des segments
    const stats = _computeSpeakerStats(meeting.transcription_segments);
    const totalDuration = [...stats.values()].reduce((s, v) => s + v, 0);

    const data = rows.map((row) => {
      const s = _serialize(row);
      s.attributes.total_duration_s = stats.get(row.label) || row.total_duration_s || 0;
      s.attributes.total_pct = totalDuration > 0
        ? Math.round(((s.attributes.total_duration_s / totalDuration) * 100) * 10) / 10
        : 0;
      return s;
    });

    res.json({ data, meta: { totalDuration } });
  } catch (e) { next(e); }
};

// ─── POST /api/meetings/:id/speakers/sync ────────────────────────────────────
// (Re)construit les lignes meeting_speakers à partir des segments Whisper.
// Idempotent — UPSERT par (meeting_id, label).

exports.sync = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const meeting = await _getMeetingWithAudio(meetingId);
    if (!meeting) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    const segments = meeting.transcription_segments || [];
    const stats    = _computeSpeakerStats(segments);

    if (stats.size === 0) {
      return res.status(422).json(errorResponse(422, 'No speaker labels in transcription_segments — run transcription with diarize:true first'));
    }

    const inserted = [];
    for (const [label, totalDuration] of stats.entries()) {
      const { rows } = await query(
        `INSERT INTO meeting_speakers (meeting_id, label, total_duration_s)
              VALUES ($1, $2, $3)
         ON CONFLICT (meeting_id, label)
         DO UPDATE SET total_duration_s = EXCLUDED.total_duration_s,
                       updated_at = NOW()
         RETURNING *`,
        [meetingId, label, totalDuration]
      );
      inserted.push(rows[0]);
    }

    logger.info(`🔄 [diarization] sync meeting ${meetingId} — ${inserted.length} speakers`);
    res.json({ data: inserted.map(_serialize) });
  } catch (e) { next(e); }
};

// Appelle voice-id pour suggérer un contact pour chaque locuteur.
// Les suggestions sont stockées dans meeting_speakers.

exports.identify = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const meeting   = await _getMeetingWithAudio(meetingId);
    if (!meeting) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    if (!meeting.audio_path) {
      return res.status(422).json(errorResponse(422, 'No audio file for this meeting'));
    }

    const segments = meeting.transcription_segments || [];
    if (!segments.length) {
      return res.status(422).json(errorResponse(422, 'No transcription segments'));
    }

    // Prendre les 3 segments les plus longs par speaker (>= 3s) pour voice-id
    const longestByLabel = _longestSegmentPerLabel(segments, 3);
    if (longestByLabel.size === 0) {
      return res.status(422).json(errorResponse(422, 'No speaker segments found'));
    }

    // Construire la liste des segments à envoyer à voice-id (aplatir)
    const querySegs = [];
    for (const [label, segs] of longestByLabel.entries()) {
      for (const s of segs) {
        if (s.dur >= 2) { // au moins 2s
          querySegs.push({ label, start: s.start, end: s.end });
        }
      }
    }

    if (querySegs.length === 0) {
      return res.status(422).json(errorResponse(422, 'All speaker segments are too short (< 2s)'));
    }

    logger.info(`🔍 [diarization] identify meeting ${meetingId} — ${querySegs.length} segments → voice-id (bytes)`);

    let audioBuffer;
    try {
      audioBuffer = fs.readFileSync(meeting.audio_path);
    } catch (e) {
      return res.status(422).json(errorResponse(422, `Cannot read audio file: ${e.message}`));
    }
    const fileName = path.basename(meeting.audio_path);

    const matches = await voiceIdClient.identifyBytes(audioBuffer, querySegs, {
      fileName,
      mimeType: 'audio/mpeg',
    });

    // Agréger les matches par label (multiple segments → garder le meilleur score)
    const bestByLabel = new Map();
    for (const m of matches) {
      const cur = bestByLabel.get(m.label);
      if (!cur || (m.score || 0) > (cur.score || 0)) {
        bestByLabel.set(m.label, m);
      }
    }

    // Mettre à jour meeting_speakers
    const updated = [];
    for (const [label, match] of bestByLabel.entries()) {
      const { rows } = await query(
        `UPDATE meeting_speakers
            SET suggested_contact_id  = $1,
                suggested_score       = $2,
                suggested_confidence  = $3,
                updated_at            = NOW()
          WHERE meeting_id = $4 AND label = $5
          RETURNING *`,
        [
          match.contact_id || null,
          match.score      || null,
          match.confidence || 'unknown',
          meetingId,
          label,
        ]
      );
      if (rows[0]) updated.push(rows[0]);
    }

    logger.info(`✅ [diarization] identify meeting ${meetingId} — ${updated.length} speakers updated`);
    res.json({ data: updated.map(_serialize) });
  } catch (e) {
    logger.error(`❌ [diarization] identify meeting ${req.params.id}: ${e.message}`);
    next(e);
  }
};

// ─── PATCH /api/meetings/:id/speakers/:label ─────────────────────────────────
// Met à jour l'assignation d'un locuteur (contact_id, display_name, validated).
// Si un contact_id est fourni, déclenche un enrôlement voice-id best-effort.

exports.update = async (req, res, next) => {
  try {
    const { id: meetingId, label } = req.params;
    const attrs = parseAttributes(req);

    const meeting = await _getMeetingWithAudio(meetingId);
    if (!meeting) return res.status(404).json(errorResponse(404, 'Meeting not found'));

    // Champs modifiables
    const setClauses = ['updated_at = NOW()'];
    const values     = [];

    if ('display_name'     in attrs) { values.push(attrs.display_name);     setClauses.push(`display_name = $${values.length}`); }
    if ('contact_id'       in attrs) { values.push(attrs.contact_id || null); setClauses.push(`contact_id = $${values.length}`); }
    if ('validated_by_user' in attrs) { values.push(!!attrs.validated_by_user); setClauses.push(`validated_by_user = $${values.length}`); }

    values.push(meetingId, label);
    const { rows } = await query(
      `UPDATE meeting_speakers
          SET ${setClauses.join(', ')}
        WHERE meeting_id = $${values.length - 1} AND label = $${values.length}
        RETURNING *`,
      values
    );

    if (!rows[0]) return res.status(404).json(errorResponse(404, `Speaker ${label} not found for meeting ${meetingId}`));

    logger.info(`✏️  [diarization] update meeting ${meetingId} speaker ${label} → contact=${rows[0].contact_id}`);

    // Enrôlement voice-id best-effort si un contact vient d'être assigné
    if (attrs.contact_id && meeting.audio_path) {
      const segments    = meeting.transcription_segments || [];
      const longest     = _longestSegmentPerLabel(segments, 3).get(label) || [];
      const enrollSegs  = longest.filter((s) => s.dur >= 2).map((s) => ({ label, start: s.start, end: s.end }));

      if (enrollSegs.length > 0) {
        try {
          const audioBuffer = fs.readFileSync(meeting.audio_path);
          const fileName    = path.basename(meeting.audio_path);
          // Fire-and-forget — best-effort, never blocks the response
          voiceIdClient.enrollBytesBestEffort(
            Number(attrs.contact_id),
            audioBuffer,
            enrollSegs,
            { validatedByUser: !!attrs.validated_by_user, fileName, mimeType: 'audio/mpeg' }
          );
        } catch (e) {
          logger.warn(`⚠️ [diarization] enroll-bytes skipped (audio read failed): ${e.message}`);
        }
      }
    }

    res.json({ data: _serialize(rows[0]) });
  } catch (e) { next(e); }
};

// ─── DELETE /api/meetings/:id/speakers ───────────────────────────────────────

exports.reset = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { rowCount } = await query(
      'DELETE FROM meeting_speakers WHERE meeting_id = $1',
      [meetingId]
    );
    logger.info(`🗑️  [diarization] reset meeting ${meetingId} — ${rowCount} speakers removed`);
    res.status(204).send();
  } catch (e) { next(e); }
};

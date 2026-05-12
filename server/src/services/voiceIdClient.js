'use strict';
/**
 * voiceIdClient.js — Client HTTP vers le service Voice-ID (port 5444 DEV).
 *
 * Endpoints utilisés :
 *   POST /api/voice/identify   → identification par embeddings ou audio+segments
 *   POST /api/voice/enroll     → enrôlement d'un contact à partir d'un segment
 *
 * Format JSON:API : { data: { type, attributes: { ... } } }
 */

const http  = require('http');
const https = require('https');
const logger = require('../utils/logger');

const VOICE_ID_URL = process.env.VOICE_ID_URL || 'http://localhost:5444';

// Identify peut nécessiter d'extraire les embeddings (wespeaker) → plusieurs min
const IDENTIFY_TIMEOUT_MS = 10 * 60 * 1000;

// ─── Helper HTTP ──────────────────────────────────────────────────────────────

function _request(urlStr, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed    = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;
    const body      = JSON.stringify(payload);

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + (parsed.search || ''),
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString());
            if (res.statusCode >= 400) {
              const detail = parsed.errors?.[0]?.detail || `HTTP ${res.statusCode}`;
              reject(new Error(`voice-id error: ${detail}`));
            } else {
              resolve(parsed.data?.attributes || parsed);
            }
          } catch (e) {
            reject(new Error(`voice-id bad response: ${e.message}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`voice-id timeout (${timeoutMs}ms)`));
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Service voice-id non disponible sur ${VOICE_ID_URL}`));
      } else {
        reject(e);
      }
    });

    req.write(body);
    req.end();
  });
}

// ─── identify ─────────────────────────────────────────────────────────────────

/**
 * Identifie un ou plusieurs locuteurs via leurs segments audio.
 *
 * Mode auto-embed : fournir audioPath + segments.
 * Le service voice-id extrait les embeddings puis compare aux profils en DB.
 *
 * @param {object} opts
 * @param {string}  opts.audioPath   Chemin absolu du fichier audio
 * @param {Array<{label:string,start:number,end:number}>} opts.segments
 * @param {string}  [opts.device]   cpu|mps|cuda
 * @returns {Promise<Array<{label, contact_id, score, confidence, profileCount}>>}
 */
async function identify({ audioPath, segments, device } = {}) {
  const url = `${VOICE_ID_URL}/api/voice/identify`;
  logger.info(`🔍 [voiceIdClient] identify ${segments.length} speaker(s) — ${audioPath}`);

  const attrs = await _request(
    url,
    {
      data: {
        type: 'identify-request',
        attributes: { audio_path: audioPath, segments, device: device || process.env.VOICE_ID_DEVICE || 'mps' },
      },
    },
    IDENTIFY_TIMEOUT_MS
  );

  return attrs.matches || [];
}

// ─── enroll ───────────────────────────────────────────────────────────────────

/**
 * Enrôle un contact à partir d'un ou plusieurs segments audio (best-effort).
 * Ne rejette pas si voice-id est indisponible.
 *
 * @param {object} opts
 * @param {number}  opts.contactId
 * @param {string}  opts.audioPath
 * @param {Array<{label:string,start:number,end:number}>} opts.segments
 * @param {boolean} [opts.validatedByUser]
 */
async function enrollBestEffort({ contactId, audioPath, segments, validatedByUser = false } = {}) {
  try {
    const url = `${VOICE_ID_URL}/api/voice/enroll`;
    logger.info(`💾 [voiceIdClient] enroll contact=${contactId} segments=${segments.length}`);
    await _request(
      url,
      {
        data: {
          type: 'enroll-request',
          attributes: {
            contact_id:        contactId,
            audio_path:        audioPath,
            segments,
            device:            process.env.VOICE_ID_DEVICE || 'mps',
            validated_by_user: validatedByUser,
          },
        },
      },
      IDENTIFY_TIMEOUT_MS
    );
  } catch (err) {
    // Best-effort — log but don't propagate
    logger.warn(`⚠️ [voiceIdClient] enroll best-effort failed: ${err.message}`);
  }
}

module.exports = { identify, enrollBestEffort };

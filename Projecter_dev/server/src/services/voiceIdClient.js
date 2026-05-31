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

// ─── Bytes-in helpers (modular Option B) ─────────────────────────────────────
//
// Caller (Projecter) reads the audio file from its own storage and uploads
// the bytes to voice-id via multipart/form-data. No shared filesystem coupling.

function _multipartRequest(urlStr, fields, fileBuf, fileName, mimeType, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed    = new URL(urlStr);
    const transport = parsed.protocol === 'https:' ? https : http;
    const boundary  = `----ProjecterVoiceId${Date.now()}${Math.random().toString(36).slice(2, 10)}`;

    const parts = [];
    for (const [name, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue;
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`
      ));
    }
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(fileBuf);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + (parsed.search || ''),
        method:   'POST',
        headers:  {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            if (res.statusCode >= 400) {
              const detail = json.errors?.[0]?.detail || `HTTP ${res.statusCode}`;
              reject(new Error(`voice-id error: ${detail}`));
            } else {
              resolve(json.data?.attributes || json);
            }
          } catch (e) {
            reject(new Error(`voice-id bad response: ${e.message}`));
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error(`voice-id timeout (${timeoutMs}ms)`)); });
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

/**
 * Identify locuteurs via bytes-in (multipart upload).
 *
 * @param {Buffer} audioBuffer   Bytes du fichier audio (mp3 typiquement)
 * @param {Array<{label,start,end}>} segments
 * @param {object} [opts]
 * @param {string} [opts.device]
 * @param {string} [opts.fileName='audio.mp3']
 * @param {string} [opts.mimeType='audio/mpeg']
 * @returns {Promise<Array>} matches
 */
async function identifyBytes(audioBuffer, segments, opts = {}) {
  const url = `${VOICE_ID_URL}/api/voice/identify-bytes`;
  logger.info(`🔍 [voiceIdClient] identify-bytes segments=${segments.length} size=${audioBuffer.length}B`);
  const attrs = await _multipartRequest(
    url,
    {
      segments: JSON.stringify(segments),
      device:   opts.device || process.env.VOICE_ID_DEVICE || 'mps',
    },
    audioBuffer,
    opts.fileName || 'audio.mp3',
    opts.mimeType || 'audio/mpeg',
    IDENTIFY_TIMEOUT_MS
  );
  return attrs.matches || [];
}

/**
 * Enroll best-effort via bytes-in. Ne rejette pas si voice-id KO.
 *
 * @param {number} contactId
 * @param {Buffer} audioBuffer
 * @param {Array<{label,start,end}>} segments
 * @param {object} [opts]
 * @param {boolean} [opts.validatedByUser=false]
 * @param {string}  [opts.device]
 * @param {string}  [opts.fileName='audio.mp3']
 * @param {string}  [opts.mimeType='audio/mpeg']
 */
async function enrollBytesBestEffort(contactId, audioBuffer, segments, opts = {}) {
  try {
    const url = `${VOICE_ID_URL}/api/voice/enroll-bytes`;
    logger.info(`💾 [voiceIdClient] enroll-bytes contact=${contactId} segments=${segments.length} size=${audioBuffer.length}B`);
    await _multipartRequest(
      url,
      {
        segments:          JSON.stringify(segments),
        contact_id:        String(contactId),
        validated_by_user: String(!!opts.validatedByUser),
        device:            opts.device || process.env.VOICE_ID_DEVICE || 'mps',
      },
      audioBuffer,
      opts.fileName || 'audio.mp3',
      opts.mimeType || 'audio/mpeg',
      IDENTIFY_TIMEOUT_MS
    );
  } catch (err) {
    logger.warn(`⚠️ [voiceIdClient] enroll-bytes best-effort failed: ${err.message}`);
  }
}

module.exports = { identify, enrollBestEffort, identifyBytes, enrollBytesBestEffort };

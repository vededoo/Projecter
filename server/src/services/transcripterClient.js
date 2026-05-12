'use strict';
/**
 * transcripterClient.js — Client HTTP vers le service Transcripter.
 *
 * Appelle Transcripter directement (comme Languapp), sans passer par Transformer.
 *
 * Endpoints utilisés :
 *   POST /api/transcribe/transcribe-audio  → transcription Whisper (+ diarization optionnelle)
 *   GET  /api/transcribe/progress/:textId  → SSE progression (relayé au client Projecter)
 *
 * Format JSON:API : { data: { type, attributes: { ... } } }
 */

const http = require('http');
const https = require('https');
const logger = require('../utils/logger');

const TRANSCRIPTER_URL   = process.env.TRANSCRIPTER_URL   || 'http://localhost:5424';
const TRANSCRIPTER_DEVICE = process.env.TRANSCRIPTER_DEVICE || 'mps';

// Timeout 4h — les réunions longues peuvent prendre du temps
const TRANSCRIBE_TIMEOUT_MS = 4 * 60 * 60 * 1000;

/**
 * Lance la transcription d'un fichier audio via Transcripter.
 *
 * @param {object} params
 * @param {string}  params.audioUrl     - Chemin absolu local du fichier audio
 * @param {string}  [params.language]   - Code langue ('fr', 'en', 'ru', …) — défaut 'fr'
 * @param {string}  [params.model]      - Modèle Whisper — défaut 'large-v3-turbo'
 * @param {number}  [params.maxLen]     - Max chars par segment (0 = auto) — défaut 0
 * @param {boolean} [params.splitOnWord] - Couper sur les mots — défaut true
 * @param {boolean} [params.diarize]    - Enchaîner pyannote pour les locuteurs — défaut false
 * @param {number}  [params.numSpeakers] - Nombre de locuteurs (null = auto)
 * @param {string}  [params.textId]     - Identifiant pour SSE (ex: `meeting-${id}`)
 *
 * @returns {Promise<{ segments: Array, stats: object, diarizeStats?: object }>}
 */
async function transcribeAudio({
  audioUrl,
  language    = 'fr',
  model       = 'large-v3-turbo',
  maxLen      = 0,
  splitOnWord = true,
  diarize     = false,
  numSpeakers = null,
  textId      = null,
}) {
  const url = `${TRANSCRIPTER_URL}/api/transcribe/transcribe-audio`;

  const payload = JSON.stringify({
    data: {
      type: 'transcribe-request',
      attributes: {
        audioUrl,
        language,
        model,
        maxLen,
        splitOnWord,
        diarize,
        ...(numSpeakers ? { numSpeakers } : {}),
        textId:      textId ? String(textId) : null,
        device:      TRANSCRIPTER_DEVICE,
        suppressNst: true,
      },
    },
  });

  logger.info('📤 [transcripterClient] transcribeAudio →', {
    url, audioUrl, language, model, diarize, textId,
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path:     parsedUrl.pathname + (parsedUrl.search || ''),
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: TRANSCRIBE_TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            if (res.statusCode >= 400) {
              const detail = body.errors?.[0]?.detail || `HTTP ${res.statusCode}`;
              reject(new Error(`Transcripter error: ${detail}`));
            } else {
              resolve(body.data?.attributes || body);
            }
          } catch (e) {
            reject(new Error(`Transcripter bad response: ${e.message}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Transcripter timeout after 4h'));
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Service Transcripter non disponible sur ${TRANSCRIPTER_URL}`));
      } else {
        reject(e);
      }
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Vérifie la disponibilité du service Transcripter.
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  return new Promise((resolve) => {
    const parsedUrl = new URL(`${TRANSCRIPTER_URL}/api/health`);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const req = transport.get(
      { hostname: parsedUrl.hostname, port: parsedUrl.port, path: '/api/health', timeout: 5000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

/**
 * Proxy SSE : connecte la réponse Express à la progression Transcripter.
 *
 * Usage dans un contrôleur Express :
 *   transcripterClient.pipeProgress(textId, req, res);
 *
 * @param {string}           textId   - Identifiant de progression (ex: `meeting-12`)
 * @param {import('http').IncomingMessage} clientReq  - req Express (pour détecter disconnect)
 * @param {import('http').ServerResponse}  clientRes  - res Express
 */
function pipeProgress(textId, clientReq, clientRes) {
  const upstreamUrl = `${TRANSCRIPTER_URL}/api/transcribe/progress/${encodeURIComponent(textId)}`;
  const parsedUrl = new URL(upstreamUrl);
  const transport = parsedUrl.protocol === 'https:' ? https : http;

  // En-têtes SSE
  clientRes.writeHead(200, {
    'Content-Type':    'text/event-stream',
    'Cache-Control':   'no-cache',
    'Connection':      'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (clientReq.socket) clientReq.socket.setNoDelay(true);

  const upstreamReq = transport.get(
    {
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port || 80,
      path:     parsedUrl.pathname,
    },
    (upstreamRes) => {
      upstreamRes.on('data', (chunk) => {
        try { clientRes.write(chunk); } catch {}
      });
      upstreamRes.on('end', () => {
        try { clientRes.end(); } catch {}
      });
      upstreamRes.on('error', () => {
        try { clientRes.end(); } catch {}
      });
    }
  );

  upstreamReq.on('error', (e) => {
    logger.error('❌ [transcripterClient] pipeProgress error', { error: e.message, textId });
    try {
      clientRes.write(`data: ${JSON.stringify({ phase: '__error__', detail: e.message })}\n\n`);
      clientRes.end();
    } catch {}
  });

  // Nettoyage si le client Projecter se déconnecte
  clientReq.on('close', () => {
    upstreamReq.destroy();
  });

  logger.info(`📡 [transcripterClient] pipeProgress → ${upstreamUrl}`);
}

module.exports = { transcribeAudio, healthCheck, pipeProgress, TRANSCRIPTER_URL, TRANSCRIPTER_DEVICE };

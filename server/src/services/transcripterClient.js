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
 * Convertit un audio arbitraire en MP3 normalisé via Transcripter.
 * Bytes-in / bytes-out : aucun chemin partagé.
 *
 * @param {Buffer} buffer        - Contenu binaire du fichier source
 * @param {object} [opts]
 * @param {string} [opts.filename='input']
 * @param {string} [opts.mimeType='application/octet-stream']
 * @param {string} [opts.bitrate='128k']
 * @param {number} [opts.channels=1]
 * @param {number} [opts.sampleRate=44100]
 * @returns {Promise<Buffer>}    - Contenu MP3 normalisé
 */
async function convertAudio(buffer, opts = {}) {
  const {
    filename   = 'input',
    mimeType   = 'application/octet-stream',
    bitrate    = '128k',
    channels   = 1,
    sampleRate = 44100,
  } = opts;

  const url = `${TRANSCRIPTER_URL}/api/audio/convert`;
  const boundary = `----ProjecterBoundary${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

  // Build multipart body
  const textField = (name, value) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;

  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename.replace(/"/g, '')}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const closing = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(textField('bitrate', bitrate)),
    Buffer.from(textField('channels', String(channels))),
    Buffer.from(textField('sampleRate', String(sampleRate))),
    Buffer.from(fileHeader),
    buffer,
    Buffer.from(closing),
  ]);

  logger.info(`📤 [transcripterClient] convertAudio → ${url} (${buffer.length}B → mp3 ${bitrate})`);

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path:     parsedUrl.pathname,
        method:   'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 30 * 60 * 1000, // 30 min
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const out = Buffer.concat(chunks);
          if (res.statusCode >= 400) {
            let detail = `HTTP ${res.statusCode}`;
            try {
              const j = JSON.parse(out.toString());
              detail = j.errors?.[0]?.detail || detail;
            } catch { /* binary or non-JSON */ }
            reject(new Error(`Transcripter convertAudio: ${detail}`));
            return;
          }
          logger.info(`✅ [transcripterClient] convertAudio done (${out.length}B mp3)`);
          resolve(out);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Transcripter convertAudio timeout (30min)'));
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Service Transcripter non disponible sur ${TRANSCRIPTER_URL}`));
      } else {
        reject(e);
      }
    });

    req.write(body);
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

module.exports = { transcribeAudio, convertAudio, healthCheck, pipeProgress, TRANSCRIPTER_URL, TRANSCRIPTER_DEVICE };

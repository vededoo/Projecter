'use strict';
/**
 * graphService.js
 * ---------------
 * Service Microsoft Graph — Device Code Flow (MSAL Node).
 *
 * Flux :
 *   1. startDeviceFlow()        → retourne { user_code, verification_uri, expires_at }
 *   2. L'utilisateur va sur verification_uri et entre user_code
 *   3. getDeviceFlowStatus()    → { acquired: true } quand l'auth est complète
 *   4. getCalendarEvents(...)   → appelle Graph avec le token stocké (refresh auto)
 *   5. disconnect()             → efface le cache token
 */

const path = require('path');
const fs   = require('fs');
const { PublicClientApplication } = require('@azure/msal-node');
const logger = require('../utils/logger');

const CACHE_FILE        = path.join(process.env.STORAGE_ROOT || '/tmp', 'graph_token_cache.json');
const MANUAL_TOKEN_FILE = path.join(process.env.STORAGE_ROOT || '/tmp', 'graph_manual_token.json');
const SCOPES = ['Calendars.Read', 'User.Read', 'offline_access'];
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// État en mémoire du device flow en cours
let _pca = null;
let _deviceFlowData = null;    // { user_code, verification_uri, expires_at, message }
let _tokenAcquired  = false;

// ─── Token manuel (Graph Explorer) ───────────────────────────────────────────

function readManualToken() {
  try {
    if (!fs.existsSync(MANUAL_TOKEN_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(MANUAL_TOKEN_FILE, 'utf8'));
    if (!data.access_token || !data.expires_at) return null;
    if (new Date(data.expires_at) <= new Date()) return null; // expiré
    return data;
  } catch { return null; }
}

exports.setManualToken = (token) => {
  // Les tokens Graph Explorer expirent après ~1h
  const expires_at = new Date(Date.now() + 55 * 60 * 1000).toISOString(); // 55 min de marge
  const data = { access_token: token, expires_at, source: 'manual' };
  fs.mkdirSync(path.dirname(MANUAL_TOKEN_FILE), { recursive: true });
  fs.writeFileSync(MANUAL_TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
  logger.info('🔑 Graph token manuel enregistré (expire à ' + expires_at + ')');
  return data;
};

exports.clearManualToken = () => {
  try { if (fs.existsSync(MANUAL_TOKEN_FILE)) fs.unlinkSync(MANUAL_TOKEN_FILE); } catch { /* ignore */ }
};

// ─── Cache MSAL sur disque ────────────────────────────────────────────────────

const cachePlugin = {
  beforeCacheAccess: async (ctx) => {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        ctx.tokenCache.deserialize(raw);
      }
    } catch (e) {
      logger.warn('⚠️ Graph cache read error: ' + e.message);
    }
  },
  afterCacheAccess: async (ctx) => {
    if (ctx.cacheHasChanged) {
      try {
        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
        fs.writeFileSync(CACHE_FILE, ctx.tokenCache.serialize(), 'utf8');
      } catch (e) {
        logger.warn('⚠️ Graph cache write error: ' + e.message);
      }
    }
  },
};

// ─── Instance PCA (créée à la demande) ───────────────────────────────────────

function getPca() {
  if (_pca) return _pca;

  const clientId = process.env.AZURE_CLIENT_ID;
  const tenantId = process.env.AZURE_TENANT_ID || 'common';

  if (!clientId) throw new Error('AZURE_CLIENT_ID not configured in .env');

  _pca = new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: { cachePlugin },
  });
  return _pca;
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Vérifie si un compte est déjà authentifié (MSAL ou token manuel).
 */
exports.isConnected = async () => {
  // 1. Token manuel encore valide ?
  if (readManualToken()) return true;
  // 2. MSAL cache ?
  try {
    const pca = getPca();
    const accounts = await pca.getTokenCache().getAllAccounts();
    return accounts.length > 0;
  } catch {
    return false;
  }
};

/**
 * Initie le Device Code Flow.
 * Résout dès que le user_code est disponible (avant que l'utilisateur s'authentifie).
 * L'acquisition du token continue en background.
 */
exports.startDeviceFlow = () => {
  const pca = getPca();
  _tokenAcquired = false;
  _deviceFlowData = null;

  return new Promise((resolve, reject) => {
    const req = {
      scopes: SCOPES,
      deviceCodeCallback: (response) => {
        _deviceFlowData = {
          user_code:        response.userCode,
          verification_uri: response.verificationUri,
          expires_at:       new Date(Date.now() + response.expiresIn * 1000).toISOString(),
          message:          response.message,
        };
        resolve(_deviceFlowData); // Retourne immédiatement le code à l'UI
      },
    };

    pca.acquireTokenByDeviceCode(req)
      .then(result => {
        _tokenAcquired = true;
        logger.info('✅ Graph token acquis pour ' + (result?.account?.username || 'unknown'));
      })
      .catch(err => {
        logger.error('❌ Graph device code flow échec : ' + err.message);
        _tokenAcquired = false;
        // Si le reject n'a pas encore été appelé (unlikely), on le fait
        reject(err);
      });
  });
};

/**
 * Retourne l'état courant du device flow.
 */
exports.getDeviceFlowStatus = () => ({
  pending:    !!_deviceFlowData,
  acquired:   _tokenAcquired,
  deviceFlow: _deviceFlowData,
});

/**
 * Obtient un access token valide (token manuel > MSAL silent).
 * Lance TOUJOURS 'Not authenticated' si aucun token disponible,
 * même si AZURE_CLIENT_ID n'est pas configuré.
 */
exports.getAccessToken = async () => {
  // 1. Token manuel encore valide ?
  const manual = readManualToken();
  if (manual) return manual.access_token;

  // 2. MSAL (Device Code Flow) — seulement si AZURE_CLIENT_ID est configuré
  const clientId = process.env.AZURE_CLIENT_ID;
  if (!clientId) throw new Error('Not authenticated');

  const pca = getPca();
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (!accounts.length) throw new Error('Not authenticated');

  const result = await pca.acquireTokenSilent({
    account: accounts[0],
    scopes:  SCOPES,
  });
  return result.accessToken;
};

/**
 * Retourne le compte connecté (displayName, username).
 * Pour un token manuel, appelle GET /me pour obtenir les infos.
 */
exports.getAccount = async () => {
  try {
    // Token manuel : appeler /me pour avoir le nom
    const manual = readManualToken();
    if (manual) {
      try {
        const r = await fetch(`${GRAPH_BASE}/me?$select=displayName,userPrincipalName`, {
          headers: { Authorization: `Bearer ${manual.access_token}` },
        });
        if (r.ok) {
          const me = await r.json();
          return { display_name: me.displayName, username: me.userPrincipalName, source: 'manual' };
        }
      } catch { /* ignore */ }
      return { display_name: 'Manual token', username: null, source: 'manual' };
    }
    // MSAL
    const pca = getPca();
    const accounts = await pca.getTokenCache().getAllAccounts();
    if (!accounts.length) return null;
    return { display_name: accounts[0].name, username: accounts[0].username, source: 'msal' };
  } catch {
    return null;
  }
};

/**
 * Récupère les événements du calendrier via calendarView (fenêtre temporelle).
 * @param {string} start  ISO datetime (défaut : maintenant)
 * @param {string} end    ISO datetime (défaut : +30 jours)
 * @param {number} top    Nombre max d'événements (défaut : 50)
 */
exports.getCalendarEvents = async ({ start, end, top = 50 } = {}) => {
  const token = await exports.getAccessToken();

  const startDT = start || new Date().toISOString();
  const endDT   = end   || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    startDateTime: startDT,
    endDateTime:   endDT,
    $select:       'id,subject,start,end,location,attendees,onlineMeeting,webLink,bodyPreview,isCancelled',
    $orderby:      'start/dateTime asc',
    $top:          String(Math.min(top, 100)),
  });

  const r = await fetch(
    `${GRAPH_BASE}/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="Europe/Brussels"',
      },
    }
  );

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Graph calendarView ${r.status}: ${body.slice(0, 400)}`);
  }

  const json = await r.json();
  return json.value || [];
};

/**
 * Récupère un événement unique par son ID Graph.
 */
exports.getEvent = async (eventId) => {
  const token = await exports.getAccessToken();

  const r = await fetch(
    `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}?$select=id,subject,start,end,location,attendees,onlineMeeting,webLink,bodyPreview,isCancelled`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="Europe/Brussels"',
      },
    }
  );

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Graph event ${r.status}: ${body.slice(0, 400)}`);
  }
  return r.json();
};

// ─── Mail ─────────────────────────────────────────────────────────────────────

/**
 * Envoie un e-mail via Microsoft Graph (POST /me/sendMail).
 * @param {Object} opts
 * @param {string} opts.subject
 * @param {string} opts.bodyHtml     Corps HTML du mail
 * @param {Array}  opts.toList       [{ name, email }]
 * @param {Array}  [opts.ccList]     [{ name, email }]
 */
exports.sendMail = async ({ subject, bodyHtml, toList = [], ccList = [] }) => {
  const token = await exports.getAccessToken();

  const toRecipients = toList
    .filter(r => r.email)
    .map(r => ({ emailAddress: { address: r.email, name: r.name || r.email } }));

  const ccRecipients = ccList
    .filter(r => r.email)
    .map(r => ({ emailAddress: { address: r.email, name: r.name || r.email } }));

  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: bodyHtml },
      toRecipients,
      ...(ccRecipients.length ? { ccRecipients } : {}),
    },
    saveToSentItems: true,
  };

  const r = await fetch(`${GRAPH_BASE}/me/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Graph sendMail ${r.status}: ${body.slice(0, 500)}`);
  }
  // 202 No Content = OK
  logger.info(`✅ Graph sendMail — "${subject}" → ${toList.map(t => t.email).join(', ')}`);
};

// ─── OneNote ──────────────────────────────────────────────────────────────────

/**
 * Liste les notebooks OneNote de l'utilisateur.
 */
exports.listOneNoteNotebooks = async () => {
  const token = await exports.getAccessToken();
  const r = await fetch(`${GRAPH_BASE}/me/onenote/notebooks?$select=id,displayName,createdDateTime`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Graph listNotebooks ${r.status}: ${body.slice(0, 400)}`);
  }
  const json = await r.json();
  return json.value || [];
};

/**
 * Liste les sections d'un notebook OneNote.
 * @param {string} notebookId
 */
exports.listOneNoteSections = async (notebookId) => {
  const token = await exports.getAccessToken();
  const r = await fetch(
    `${GRAPH_BASE}/me/onenote/notebooks/${encodeURIComponent(notebookId)}/sections?$select=id,displayName`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Graph listSections ${r.status}: ${body.slice(0, 400)}`);
  }
  const json = await r.json();
  return json.value || [];
};

/**
 * Crée une page OneNote dans une section donnée.
 * @param {Object} opts
 * @param {string} opts.sectionId   ID de la section cible
 * @param {string} opts.title       Titre de la page
 * @param {string} opts.bodyHtml    Contenu HTML (format OneNote page)
 * @returns {Object} Page créée { id, links }
 */
exports.createOneNotePage = async ({ sectionId, title, bodyHtml }) => {
  const token = await exports.getAccessToken();

  // Le corps d'une page OneNote doit être un document HTML complet
  const now = new Date().toISOString();
  const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <meta name="created" content="${now}" />
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const r = await fetch(
    `${GRAPH_BASE}/me/onenote/sections/${encodeURIComponent(sectionId)}/pages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/xhtml+xml',
      },
      body: pageHtml,
    }
  );

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Graph createOneNotePage ${r.status}: ${body.slice(0, 500)}`);
  }
  const json = await r.json();
  logger.info(`✅ Graph OneNote page créée — "${title}" (section ${sectionId})`);
  return { id: json.id, links: json.links };
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * Efface le cache token (MSAL + manuel) et réinitialise l'état.
 */
exports.disconnect = async () => {
  try { if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE); } catch { /* ignore */ }
  exports.clearManualToken();
  _pca            = null;
  _tokenAcquired  = false;
  _deviceFlowData = null;
  logger.info('🔌 Graph déconnecté — cache effacé');
};

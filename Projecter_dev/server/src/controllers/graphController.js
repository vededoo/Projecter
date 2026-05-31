'use strict';
/**
 * graphController.js
 * ------------------
 * Endpoints Microsoft Graph — Device Code Flow + import de réunions Outlook.
 *
 * Routes :
 *   POST   /api/graph/auth/start    → initie le device code flow
 *   GET    /api/graph/auth/status   → poll pour savoir si le token est acquis
 *   GET    /api/graph/status        → est-on connecté ?
 *   DELETE /api/graph/auth          → déconnexion
 *   GET    /api/graph/events        → liste les events du calendrier
 *   POST   /api/graph/events/import → importe un event Outlook en meeting Projecter
 */

const graph  = require('../services/graphService');
const { query } = require('../utils/db');
const { serialize, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/graph/auth/start
 * Démarre le Device Code Flow.
 * Retourne { user_code, verification_uri, expires_at, message } immédiatement.
 */
exports.startAuth = async (_req, res, next) => {
  try {
    const flowData = await graph.startDeviceFlow();
    res.json({
      data: {
        type: 'graph-auth',
        attributes: flowData,
      },
    });
  } catch (e) {
    if (e.message.includes('AZURE_CLIENT_ID')) {
      return res.status(503).json(errorResponse(503, 'Azure not configured — add AZURE_CLIENT_ID in server/.env'));
    }
    next(e);
  }
};

/**
 * GET /api/graph/auth/status
 * Poll côté client pour savoir si le token a été acquis après le device login.
 */
exports.authStatus = (_req, res) => {
  const status = graph.getDeviceFlowStatus();
  res.json({
    data: {
      type: 'graph-auth-status',
      attributes: status,
    },
  });
};

/**
 * GET /api/graph/status
 * Indique si un compte est déjà authentifié (token en cache).
 */
exports.connectionStatus = async (_req, res) => {
  try {
    const connected = await graph.isConnected();
    const account   = connected ? await graph.getAccount() : null;
    res.json({
      data: {
        type: 'graph-status',
        attributes: { connected, account },
      },
    });
  } catch {
    res.json({ data: { type: 'graph-status', attributes: { connected: false, account: null } } });
  }
};

/**
 * DELETE /api/graph/auth
 * Déconnecte l'utilisateur (efface le cache MSAL).
 */
exports.disconnect = async (_req, res, next) => {
  try {
    await graph.disconnect();
    res.json({ data: { type: 'graph-status', attributes: { connected: false, account: null } } });
  } catch (e) { next(e); }
};

/**
 * POST /api/graph/manual-token
 * Enregistre un token Graph obtenu manuellement (depuis Graph Explorer).
 * Body JSON:API : { data: { attributes: { token: "eyJ0eX..." } } }
 */
exports.setManualToken = async (req, res, next) => {
  try {
    const token = req.body?.data?.attributes?.token;
    if (!token || typeof token !== 'string' || token.length < 20) {
      return res.status(400).json(errorResponse(400, 'token is required (paste from Graph Explorer → Access token tab)'));
    }
    const data = graph.setManualToken(token);
    // Vérifier que le token fonctionne réellement
    const account = await graph.getAccount();
    logger.info('✅ Graph manual token OK — ' + (account?.username || 'unknown'));
    res.json({
      data: {
        type: 'graph-status',
        attributes: { connected: true, account, expires_at: data.expires_at },
      },
    });
  } catch (e) { next(e); }
};

// ─── Events calendrier ────────────────────────────────────────────────────────

/**
 * GET /api/graph/events?start=ISO&end=ISO&top=N
 * Liste les événements du calendrier Outlook dans la fenêtre demandée.
 */
exports.listEvents = async (req, res, next) => {
  try {
    const { start, end, top } = req.query;
    const events = await graph.getCalendarEvents({
      start,
      end,
      top: top ? Math.min(Number(top), 100) : 50,
    });

    res.json({
      data: events.map(e => ({
        type: 'outlook-event',
        id:   e.id,
        attributes: {
          subject:            e.subject,
          start:              e.start,
          end:                e.end,
          location:           e.location?.displayName || null,
          online_meeting_url: e.onlineMeeting?.joinUrl || null,
          web_link:           e.webLink || null,
          body_preview:       e.bodyPreview || null,
          is_cancelled:       e.isCancelled || false,
          attendees: (e.attendees || []).map(a => ({
            name:  a.emailAddress?.name  || null,
            email: a.emailAddress?.address || null,
            type:  a.type || null,
          })),
        },
      })),
    });
  } catch (e) {
    if (e.message === 'Not authenticated') {
      return res.status(401).json(errorResponse(401, 'Not connected to Outlook — use POST /api/graph/auth/start'));
    }
    next(e);
  }
};

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * POST /api/graph/events/import
 * Importe un événement Outlook comme meeting Projecter.
 *
 * Body JSON:API :
 *   { data: { type: 'outlook-import', attributes: {
 *       event_id:   string  (ID Graph de l'événement — obligatoire)
 *       project_id: number  (optionnel)
 *       type:       string  (meeting_type, défaut: 'other')
 *   }}}
 *
 * Comportement :
 *   - Crée le meeting (title, start_at, end_at, location, video_link)
 *   - Tente de matcher les attendees Outlook sur les contacts Projecter (par email)
 *   - Retourne le meeting créé en JSON:API
 */
exports.importEvent = async (req, res, next) => {
  try {
    const attrs = req.body?.data?.attributes || {};
    const { event_id, project_id, type: meetingType } = attrs;

    if (!event_id) {
      return res.status(400).json(errorResponse(400, 'event_id is required'));
    }

    const ev = await graph.getEvent(event_id);

    // ── Normaliser les dates (Graph retourne en heure locale Brussels via Prefer header)
    const parseEventDT = (dtObj) => {
      if (!dtObj?.dateTime) return null;
      // Graph retourne "2026-05-16T14:00:00.0000000" sans TZ quand on a demandé Brussels
      // On force l'interprétation en Europe/Brussels via offset (CEST = UTC+2)
      const raw = dtObj.dateTime;
      const hasZ = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw);
      return hasZ ? new Date(raw).toISOString() : new Date(raw + '+02:00').toISOString();
    };

    const startAt = parseEventDT(ev.start);
    const endAt   = parseEventDT(ev.end);

    if (!startAt) {
      return res.status(422).json(errorResponse(422, 'Event has no valid start date'));
    }

    // ── Créer le meeting
    const { rows } = await query(
      `INSERT INTO meetings
         (project_id, title, type, start_at, end_at, location, video_link, created_at, updated_at)
       VALUES ($1, $2, $3::meeting_type, $4::timestamptz, $5::timestamptz, $6, $7, NOW(), NOW())
       RETURNING id, project_id, title, type, start_at, end_at, location, video_link, created_at, updated_at`,
      [
        project_id || null,
        ev.subject || '(no subject)',
        meetingType || 'other',
        startAt,
        endAt,
        ev.location?.displayName || null,
        ev.onlineMeeting?.joinUrl || null,
      ]
    );
    const meetingId = rows[0].id;

    // ── Matcher attendees → contacts (par email, insensible à la casse)
    const attendeeEmails = (ev.attendees || [])
      .map(a => a.emailAddress?.address?.toLowerCase())
      .filter(Boolean);

    let matchedCount = 0;
    if (attendeeEmails.length > 0) {
      const { rows: matched } = await query(
        `SELECT id FROM contacts WHERE LOWER(email) = ANY($1::text[])`,
        [attendeeEmails]
      );
      for (const c of matched) {
        await query(
          `INSERT INTO meeting_attendees (meeting_id, contact_id, status, role)
           VALUES ($1, $2, 'invited'::attendance_status, NULL)
           ON CONFLICT (meeting_id, contact_id) DO NOTHING`,
          [meetingId, c.id]
        );
        matchedCount++;
      }
    }

    logger.info(`✅ Meeting importé depuis Outlook #${meetingId} "${ev.subject}" (${matchedCount} attendees matchés)`);

    res.status(201).json(serialize('meeting', rows[0]));
  } catch (e) {
    if (e.message === 'Not authenticated') {
      return res.status(401).json(errorResponse(401, 'Not connected to Outlook — use POST /api/graph/auth/start'));
    }
    next(e);
  }
};

// ─── OneNote notebooks / sections ────────────────────────────────────────────

/**
 * GET /api/graph/onenote/notebooks
 * Liste les notebooks OneNote (+ leurs sections) pour afficher un sélecteur dans l'UI.
 */
exports.listOneNoteNotebooks = async (_req, res, next) => {
  try {
    const notebooks = await graph.listOneNoteNotebooks();
    res.json({
      data: notebooks.map(nb => ({
        type: 'onenote-notebook',
        id: nb.id,
        attributes: { displayName: nb.displayName, createdDateTime: nb.createdDateTime },
      })),
    });
  } catch (e) {
    if (e.message === 'Not authenticated') return res.status(401).json(errorResponse(401, 'Not connected to Graph'));
    next(e);
  }
};

/**
 * GET /api/graph/onenote/notebooks/:notebookId/sections
 */
exports.listOneNoteSections = async (req, res, next) => {
  try {
    const sections = await graph.listOneNoteSections(req.params.notebookId);
    res.json({
      data: sections.map(s => ({
        type: 'onenote-section',
        id: s.id,
        attributes: { displayName: s.displayName },
      })),
    });
  } catch (e) {
    if (e.message === 'Not authenticated') return res.status(401).json(errorResponse(401, 'Not connected to Graph'));
    next(e);
  }
};

// ─── Envoi mail CR ───────────────────────────────────────────────────────────

/**
 * POST /api/meetings/:id/send-mail
 * Envoie le mail_cr de la réunion via Graph sendMail.
 *
 * Body JSON:API :
 *   { data: { attributes: {
 *       to:   [{ name, email }]   (requis)
 *       cc:   [{ name, email }]   (optionnel)
 *       subject: string           (optionnel, sinon généré depuis le titre)
 *   }}}
 */
exports.sendMeetingMail = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, title, start_at, mail_cr FROM meetings WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    const meeting = rows[0];
    if (!meeting.mail_cr) return res.status(400).json(errorResponse(400, 'mail_cr is empty — generate it first via the AI agent'));

    const attrs = req.body?.data?.attributes || {};
    const toList = Array.isArray(attrs.to) ? attrs.to : [];
    if (!toList.length) return res.status(400).json(errorResponse(400, 'to[] is required'));

    const dateStr = meeting.start_at ? new Date(meeting.start_at).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const subject = attrs.subject || `CR — ${meeting.title}${dateStr ? ' (' + dateStr + ')' : ''}`;

    // Convertir mail_cr (texte pipe-table) en HTML lisible
    const bodyHtml = mailCrToHtml(meeting.mail_cr, subject);

    await graph.sendMail({ subject, bodyHtml, toList, ccList: attrs.cc || [] });

    logger.info(`✅ Mail CR envoyé — meeting #${meeting.id} → ${toList.map(t => t.email).join(', ')}`);
    res.json({ data: { type: 'mail-sent', attributes: { subject, to: toList, cc: attrs.cc || [] } } });
  } catch (e) {
    if (e.message === 'Not authenticated') return res.status(401).json(errorResponse(401, 'Not connected to Graph — provide a manual token first'));
    next(e);
  }
};

// ─── Export OneNote ───────────────────────────────────────────────────────────

/**
 * POST /api/meetings/:id/export-onenote
 * Crée une page OneNote dans la section configurée.
 *
 * Body JSON:API :
 *   { data: { attributes: {
 *       section_id: string   (requis — ID de la section OneNote cible)
 *   }}}
 *
 * Fallback : si ONENOTE_SECTION_ID est défini dans .env, section_id est optionnel.
 */
exports.exportMeetingOneNote = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT m.id, m.title, m.start_at, m.mail_cr,
              coalesce(
                json_agg(
                  json_build_object('name', concat(c.first_name, ' ', c.last_name), 'role', ma.role, 'status', ma.status)
                  ORDER BY c.last_name
                ) FILTER (WHERE c.id IS NOT NULL),
                '[]'::json
              ) AS attendees
         FROM meetings m
         LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
         LEFT JOIN contacts c ON c.id = ma.contact_id
         WHERE m.id = $1
         GROUP BY m.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Meeting not found'));
    const meeting = rows[0];
    if (!meeting.mail_cr) return res.status(400).json(errorResponse(400, 'mail_cr is empty — generate it first via the AI agent'));

    const attrs = req.body?.data?.attributes || {};
    const sectionId = attrs.section_id || process.env.ONENOTE_SECTION_ID;
    if (!sectionId) return res.status(400).json(errorResponse(400, 'section_id is required (or set ONENOTE_SECTION_ID in .env)'));

    const dateStr = meeting.start_at ? new Date(meeting.start_at).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const title = `CR — ${meeting.title}${dateStr ? ' (' + dateStr + ')' : ''}`;
    const bodyHtml = mailCrToHtml(meeting.mail_cr, title, { onenote: true, attendees: meeting.attendees || [] });

    const result = await graph.createOneNotePage({ sectionId, title, bodyHtml });

    logger.info(`✅ OneNote page créée — meeting #${meeting.id} "${title}"`);
    res.json({ data: { type: 'onenote-page', id: result.id, attributes: { title, links: result.links } } });
  } catch (e) {
    if (e.message === 'Not authenticated') return res.status(401).json(errorResponse(401, 'Not connected to Graph — provide a manual token first'));
    next(e);
  }
};

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

/**
 * Convertit le texte mail_cr (pipe-table markdown) en HTML lisible.
 * Gère aussi le cas où mail_cr est du texte libre.
 */
function mailCrToHtml(mailCr, title, { onenote = false, attendees = [] } = {}) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = mailCr.split('\n');

  // Mapper statut → libellé Outlook
  const statusLabel = (role, status) => {
    if (role && /organis/i.test(role)) return 'Meeting Organiser';
    if (status === 'accepted') return 'Accepted Meeting';
    if (status === 'declined') return 'Declined';
    return 'Invited';
  };

  let html = `<h2>${esc(title)}</h2>`;
  if (Array.isArray(attendees) && attendees.length > 0) {
    // Format liste style OneNote « Insert Meeting Details »
    const items = attendees
      .filter(a => a && a.name && a.name.trim())
      .map(a => `<p data-tag="to-do" style="font-family:Calibri,Arial,sans-serif;font-size:13px;margin:2px 0">${esc(a.name.trim())} (${esc(statusLabel(a.role, a.status))})</p>`)
      .join('');
    html += `<div style="margin:0 0 12px 0">${items}</div>`;
    html += '<br />';
  } else if (!Array.isArray(attendees) && attendees && attendees.filter(Boolean).length > 0) {
    // Compat ancienne forme (array de strings)
    html += `<p><strong>Participants :</strong> ${attendees.filter(Boolean).map(esc).join(', ')}</p>`;
  }

  // Détecter s'il y a un tableau pipe (|col1|col2|…)
  const tableLines = lines.filter(l => l.trim().startsWith('|'));
  if (tableLines.length >= 2) {
    // Extraire les lignes non-tableau comme paragraphes
    let inTable = false;
    let tableHtml = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px">';
    let rowCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|')) {
        // Ignorer les lignes séparateur (|---|---|)
        if (/^\|[-|: ]+\|$/.test(trimmed)) { inTable = true; continue; }
        const cells = trimmed.split('|').filter((_c, i, arr) => i !== 0 && i !== arr.length - 1).map(c => c.trim());
        if (rowCount === 0) {
          tableHtml += '<thead><tr>' + cells.map(c => `<th style="background:#f0f0f0;text-align:left;padding:6px">${esc(c)}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td style="vertical-align:top;padding:6px">${esc(c)}</td>`).join('') + '</tr>';
        }
        rowCount++;
      } else if (inTable) {
        // Ligne après le tableau : paragraphe
        if (trimmed) html += `<p>${esc(trimmed)}</p>`;
      } else {
        if (trimmed) html += `<p>${esc(trimmed)}</p>`;
      }
    }
    tableHtml += '</tbody></table>';
    if (rowCount > 0) html += tableHtml;
  } else {
    // Pas de tableau — simple pre-wrap
    html += `<p style="white-space:pre-wrap;font-family:Calibri,Arial,sans-serif">${esc(mailCr)}</p>`;
  }

  return html;
}


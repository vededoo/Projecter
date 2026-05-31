'use strict';
/**
 * costraController.js — Endpoints REST pour les fiches Costra
 *
 * Routes :
 *   POST   /api/projects/:id/costra/generate        → génère le .xlsx
 *   GET    /api/projects/:id/costra/files            → liste les fichiers existants
 *   GET    /api/projects/:id/costra/files/:filename  → télécharger un fichier
 *   GET    /api/projects/:id/costra/attributes       → lire les champs Costra dans project.attributes
 *   PATCH  /api/projects/:id/costra/attributes       → mettre à jour les champs Costra
 */

const path          = require('path');
const { query }     = require('../utils/db');
const { errorResponse } = require('../utils/jsonapi');
const logger        = require('../utils/logger');
const costraService = require('../services/costraService');
const { ATTRIBUTE_FIELDS } = require('../config/costraTemplate');

const MODULE = 'costraController';

// ── POST /api/projects/:id/costra/generate ────────────────────────────────────
exports.generate = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json(errorResponse('Invalid project id'));

    const { filename, filePath } = await costraService.generate(projectId);

    logger.info(`📥 [${MODULE}] Fiche générée → ${filename}`);
    res.status(201).json({
      data: {
        type: 'costra-file',
        attributes: { filename, message: 'Costra sheet generated successfully' },
      },
    });
  } catch (err) {
    logger.error(`❌ [${MODULE}] generate: ${err.message}`);
    next(err);
  }
};

// ── GET /api/projects/:id/costra/files ────────────────────────────────────────
exports.listFiles = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json(errorResponse('Invalid project id'));

    // Récupérer le slug du projet
    const { rows } = await query('SELECT slug FROM projects WHERE id = $1', [projectId]);
    if (!rows.length) return res.status(404).json(errorResponse('Project not found'));

    const files = await costraService.listFiles(projectId, rows[0].slug);

    res.json({
      data: files.map(f => ({
        type: 'costra-file',
        id:   f.filename,
        attributes: {
          filename:  f.filename,
          size:      f.size,
          createdAt: f.createdAt,
        },
      })),
    });
  } catch (err) {
    logger.error(`❌ [${MODULE}] listFiles: ${err.message}`);
    next(err);
  }
};

// ── GET /api/projects/:id/costra/files/:filename ──────────────────────────────
exports.downloadFile = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json(errorResponse('Invalid project id'));

    // Sécurité : interdire les path traversal
    const filename = path.basename(req.params.filename);
    if (!filename.endsWith('.xlsm')) return res.status(400).json(errorResponse('Invalid filename'));

    const filePath = costraService.resolvePath(filename);
    res.download(filePath, filename, err => {
      if (err) {
        logger.error(`❌ [${MODULE}] downloadFile: ${err.message}`);
        if (!res.headersSent) res.status(404).json(errorResponse('File not found'));
      }
    });
  } catch (err) {
    logger.error(`❌ [${MODULE}] downloadFile: ${err.message}`);
    next(err);
  }
};

// ── GET /api/projects/:id/costra/attributes ───────────────────────────────────
exports.getAttributes = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json(errorResponse('Invalid project id'));

    const { rows } = await query('SELECT id, attributes FROM projects WHERE id = $1', [projectId]);
    if (!rows.length) return res.status(404).json(errorResponse('Project not found'));

    const attrs = rows[0].attributes || {};
    // Ne retourner que les champs Costra (évite de fuiter d'autres données du JSONB)
    const costraAttrs = {};
    for (const f of ATTRIBUTE_FIELDS) {
      if (attrs[f] !== undefined) costraAttrs[f] = attrs[f];
    }

    res.json({
      data: {
        type: 'costra-attributes',
        id:   String(projectId),
        attributes: costraAttrs,
      },
    });
  } catch (err) {
    logger.error(`❌ [${MODULE}] getAttributes: ${err.message}`);
    next(err);
  }
};

// ── PATCH /api/projects/:id/costra/attributes ─────────────────────────────────
exports.updateAttributes = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json(errorResponse('Invalid project id'));

    const incoming = req.body.data?.attributes || {};

    // Filtrer : n'accepter que les champs déclarés dans ATTRIBUTE_FIELDS
    const patch = {};
    for (const f of ATTRIBUTE_FIELDS) {
      if (incoming[f] !== undefined) patch[f] = incoming[f];
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json(errorResponse('No valid Costra attributes provided'));
    }

    // Merge avec les attributes existants (JSONB || operator)
    const { rows } = await query(
      `UPDATE projects
          SET attributes  = attributes || $1::jsonb,
              updated_at  = now()
        WHERE id = $2
        RETURNING id, attributes`,
      [JSON.stringify(patch), projectId]
    );

    if (!rows.length) return res.status(404).json(errorResponse('Project not found'));

    const savedAttrs = rows[0].attributes || {};
    const costraAttrs = {};
    for (const f of ATTRIBUTE_FIELDS) {
      if (savedAttrs[f] !== undefined) costraAttrs[f] = savedAttrs[f];
    }

    logger.info(`💾 [${MODULE}] Costra attributes mis à jour — projet #${projectId}`);
    res.json({
      data: {
        type: 'costra-attributes',
        id:   String(projectId),
        attributes: costraAttrs,
      },
    });
  } catch (err) {
    logger.error(`❌ [${MODULE}] updateAttributes: ${err.message}`);
    next(err);
  }
};

'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');
const generator = require('../services/documentGeneratorService');
const fileManager = require('../utils/localFileManager');

const COLS = `id, project_id, type, title, version, status, drafted_at,
              etnic_approved_at, wbe_approved_at, signed_at, author_contact_id,
              attributes, generated_from_template, parent_document_id,
              template_id, template_vars, generated_file_path, meeting_id,
              created_at, updated_at`;

const FIELDS = ['type', 'title', 'version', 'status', 'drafted_at',
                'etnic_approved_at', 'wbe_approved_at', 'signed_at',
                'author_contact_id', 'attributes', 'generated_from_template', 'parent_document_id'];

const ENUM_CASTS = { type: '::document_type', status: '::document_status' };

exports.list = async (req, res, next) => {
  try {
    const { project_id, type, status } = req.query;
    const conds = []; const params = [];
    if (project_id) { params.push(project_id); conds.push(`project_id = $${params.length}`); }
    if (type)       { params.push(type);       conds.push(`type = $${params.length}::document_type`); }
    if (status)     { params.push(status);     conds.push(`status = $${params.length}::document_status`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLS} FROM documents ${where} ORDER BY updated_at DESC LIMIT 500`,
      params
    );
    res.json(serialize('document', rows));
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLS} FROM documents WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Document not found'));
    res.json(serialize('document', rows[0]));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    if (!a.project_id || !a.type) {
      return res.status(400).json(errorResponse(400, 'project_id and type are required'));
    }
    const { rows } = await query(
      `INSERT INTO documents (project_id, type, title, version, status, drafted_at, author_contact_id, attributes, parent_document_id)
       VALUES ($1, $2::document_type, $3, COALESCE($4,'0.1'),
               COALESCE($5::document_status,'draft'::document_status),
               $6, $7, COALESCE($8::jsonb,'{}'::jsonb), $9)
       RETURNING ${COLS}`,
      [a.project_id, a.type, a.title || null, a.version, a.status, a.drafted_at || null,
       a.author_contact_id || null,
       a.attributes ? JSON.stringify(a.attributes) : null,
       a.parent_document_id || null]
    );
    logger.info('✅ Document created', { id: rows[0].id, type: rows[0].type });
    res.status(201).json(serialize('document', rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const a = parseAttributes(req);
    const sets = []; const vals = []; let i = 1;
    for (const f of FIELDS) {
      if (a[f] !== undefined) {
        const cast = ENUM_CASTS[f] || (f === 'attributes' ? '::jsonb' : '');
        sets.push(`${f} = $${i++}${cast}`);
        vals.push(f === 'attributes' && a[f] && typeof a[f] === 'object' ? JSON.stringify(a[f]) : a[f]);
      }
    }
    if (!sets.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE documents SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING ${COLS}`,
      vals
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Document not found'));
    res.json(serialize('document', rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM documents WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Document not found'));
    res.status(204).end();
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /documents/:id/file   — téléchargement du .docx généré
// ─────────────────────────────────────────────────────────────────────────────
exports.serveFile = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT title, generated_file_path FROM documents WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Document not found'));
    const { generated_file_path, title } = rows[0];
    if (!generated_file_path) {
      return res.status(404).json(errorResponse(404, 'No generated file for this document'));
    }
    const fullPath = fileManager.resolvePath('documents', generated_file_path);
    if (!fileManager.exists(fullPath)) {
      return res.status(404).json(errorResponse(404, 'File not found on disk'));
    }
    const safeTitle = (title || 'document').replace(/[^a-z0-9_\-\s]/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.docx"`);
    fileManager.createReadStream(fullPath).pipe(res);
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /documents/generate
// Body JSON:API : { template_id, project_id, [meeting_id], [overrides: {}] }
// ─────────────────────────────────────────────────────────────────────────────
exports.generate = async (req, res, next) => {
  try {
    const { template_id, project_id, meeting_id = null, overrides = {} } = parseAttributes(req);
    if (!template_id || !project_id) {
      return res.status(422).json(errorResponse(422, 'template_id and project_id are required'));
    }

    // Charger le template
    const { rows: tRows } = await query(
      'SELECT * FROM document_templates WHERE id = $1 AND active = true',
      [template_id]
    );
    if (!tRows[0]) return res.status(404).json(errorResponse(404, 'Template not found or inactive'));
    const template = tRows[0];

    // Charger le projet + attributs narratifs + membres clés
    const memberSubquery = (role) =>
      `(SELECT COALESCE(NULLIF(c.display_name,''), NULLIF(TRIM(c.first_name||' '||c.last_name),''), c.email)
         FROM project_members pm JOIN contacts c ON c.id = pm.contact_id
        WHERE pm.project_id = p.id AND pm.role = '${role}' LIMIT 1)`;

    const { rows: pRows } = await query(
      `SELECT p.id, p.title, p.code, p.status, p.status_brief,
              p.requesting_service, p.portfolio, p.attributes,
              ${memberSubquery('etnic_portfolio_manager')}  AS etnic_portfolio_manager,
              ${memberSubquery('etnic_project_manager')}    AS etnic_project_manager,
              ${memberSubquery('business_project_manager')} AS business_project_manager,
              ${memberSubquery('sponsor_wbe')}              AS sponsor_wbe,
              ${memberSubquery('wbe_portfolio_manager')}    AS wbe_portfolio_manager
       FROM projects p
       WHERE p.id = $1`,
      [project_id]
    );
    if (!pRows[0]) return res.status(404).json(errorResponse(404, 'Project not found'));
    const project = pRows[0];

    // Construire la map de variables
    // Priorité : données structurées < attributes JSONB < overrides manuels
    const now    = new Date();
    const dateStr = now.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const vars = {
      // Données structurées
      project_title:               project.title               || '',
      project_code:                project.code                || '',
      project_status:              project.status              || '',
      project_description:         project.status_brief        || '',
      requesting_service:          project.requesting_service  || '',
      portfolio:                   project.portfolio           || '',
      // Membres clés
      etnic_portfolio_manager:     project.etnic_portfolio_manager  || '',
      etnic_project_manager:       project.etnic_project_manager    || '',
      business_project_manager:    project.business_project_manager || '',
      sponsor_wbe:                 project.sponsor_wbe              || '',
      wbe_portfolio_manager:       project.wbe_portfolio_manager    || '',
      // Compat ancien placeholder
      pm_name:                     project.etnic_project_manager || project.business_project_manager || '',
      // Dates
      date:                        dateStr,
      year:                        String(now.getFullYear()),
      // Attributs narratifs communs (projects.attributes JSONB)
      ...(project.attributes || {}),
      // Overrides manuels (priorité max)
      ...overrides,
    };

    // Générer le fichier
    const outputFilename = `${Date.now()}_${template.file_path}`;
    await generator.generate(template.file_path, vars, outputFilename);

    // Créer l'entrée dans documents
    const { rows: dRows } = await query(
      `INSERT INTO documents
         (project_id, type, title, status, template_id, template_vars, generated_file_path, meeting_id, generated_from_template)
       VALUES ($1, $2::document_type, $3, 'draft'::document_status, $4, $5, $6, $7, true)
       RETURNING ${COLS}`,
      [
        project_id,
        template.doc_type,
        `${template.name} — ${project.title}`,
        template_id,
        JSON.stringify(vars),
        outputFilename,
        meeting_id,
      ]
    );

    logger.info(`✅ [documents] Généré id=${dRows[0].id} → ${outputFilename}`);
    res.status(201).json(serialize('document', dRows[0]));
  } catch (err) {
    // Erreur docxtemplater — extraire le message propre
    if (err.properties && err.properties.errors) {
      const details = err.properties.errors.map(e => e.message).join(', ');
      return res.status(422).json(errorResponse(422, `Template error: ${details}`));
    }
    next(err);
  }
};

'use strict';
const { query } = require('../utils/db');
const { serialize, parseAttributes, errorResponse } = require('../utils/jsonapi');
const logger = require('../utils/logger');

// ─── Champs éditables côté API ───────────────────────────────────────────
// (les champs Graph — azure_object_id, sam_account_name, graph_attributes,
//  graph_synced_at — restent gérés par le script d'import, pas par l'UI)
const EDITABLE_FIELDS = [
  'last_name', 'first_name', 'email', 'phone',
  'job_title', 'department', 'company_name',
  'organization_id', 'manager_contact_id',
  'office_location', 'street_address', 'postal_code',
  'city', 'state', 'country',
  'employee_id', 'employee_type', 'user_type',
  'preferred_language', 'usage_location',
  'account_enabled', 'active', 'notes',
];

// SELECT enrichi (mêmes colonnes que list, factorisé)
const DETAIL_SELECT = `
  SELECT c.id, c.last_name, c.first_name, c.email, c.phone,
         c.job_title, c.department, c.company_name,
         c.organization_id, o.code AS organization_code,
         c.office_location, c.street_address, c.postal_code,
         c.city, c.state, c.country,
         c.employee_id, c.employee_type, c.user_type, c.account_enabled,
         c.preferred_language, c.usage_location,
         c.sam_account_name, c.azure_object_id, c.active, c.notes,
         c.manager_contact_id,
         NULLIF(TRIM(COALESCE(m.last_name,'') || ' ' || COALESCE(m.first_name, '')), '') AS manager_name,
         c.graph_synced_at, c.created_at, c.updated_at
    FROM contacts c
    LEFT JOIN organizations o ON o.id = c.organization_id
    LEFT JOIN contacts m       ON m.id = c.manager_contact_id`;

// Normalise les valeurs entrantes (chaîne vide → null, IDs en int)
function normalize(attrs) {
  const out = {};
  for (const f of EDITABLE_FIELDS) {
    if (!(f in attrs)) continue;
    let v = attrs[f];
    if (typeof v === 'string') v = v.trim();
    if (v === '') v = null;
    if ((f === 'organization_id' || f === 'manager_contact_id') && v != null) {
      v = parseInt(v, 10);
      if (Number.isNaN(v)) v = null;
    }
    if ((f === 'active' || f === 'account_enabled') && v != null) {
      v = !!v;
    }
    out[f] = v;
  }
  return out;
}

// Validation basique côté serveur (ne JAMAIS faire confiance au client)
function validate(attrs, { partial = false } = {}) {
  const errs = [];
  if (!partial && !attrs.last_name) errs.push('last_name is required');
  if (attrs.email != null && attrs.email !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attrs.email)) errs.push('email is invalid');
  }
  return errs;
}

// ─── Colonnes triables (whitelist) ───────────────────────────────────────
const SORTABLE = new Set([
  'last_name', 'first_name', 'email', 'job_title', 'department',
  'company_name', 'organization_code', 'city', 'country',
  'manager_name', 'employee_id', 'graph_synced_at', 'updated_at', 'created_at',
]);

function parseSort(sortStr) {
  if (!sortStr) return [{ col: 'last_name', dir: 'ASC' }, { col: 'first_name', dir: 'ASC' }];
  return sortStr.split(',').map((s) => {
    const dir = s.startsWith('-') ? 'DESC' : 'ASC';
    const col = s.replace(/^-/, '').trim();
    return SORTABLE.has(col) ? { col, dir } : null;
  }).filter(Boolean);
}

// ─── LIST ────────────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const {
      q, organization, department,
      has_email, has_manager, active,
      sort, page = '1', pageSize = '50',
    } = req.query;

    const conds = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      conds.push(`(c.last_name ILIKE $${i} OR c.first_name ILIKE $${i} OR c.email ILIKE $${i} OR c.job_title ILIKE $${i} OR c.department ILIKE $${i} OR c.company_name ILIKE $${i})`);
    }
    if (organization) { params.push(organization); conds.push(`o.code = $${params.length}`); }
    if (department)   { params.push(department);   conds.push(`c.department = $${params.length}`); }
    if (has_email === 'true')  conds.push(`c.email IS NOT NULL AND c.email <> ''`);
    if (has_email === 'false') conds.push(`(c.email IS NULL OR c.email = '')`);
    if (has_manager === 'true')  conds.push(`c.manager_contact_id IS NOT NULL`);
    if (has_manager === 'false') conds.push(`c.manager_contact_id IS NULL`);
    if (active === 'true')  conds.push(`c.active = TRUE`);
    if (active === 'false') conds.push(`c.active = FALSE`);

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const sizeNum = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50));
    const offset = (pageNum - 1) * sizeNum;

    const sortCols = parseSort(sort);
    const orderBy = sortCols.map(({ col, dir }) => `${col} ${dir} NULLS LAST`).join(', ');

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total
         FROM contacts c
         LEFT JOIN organizations o ON o.id = c.organization_id
         LEFT JOIN contacts m       ON m.id = c.manager_contact_id
         ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    params.push(sizeNum); const pSize = `$${params.length}`;
    params.push(offset);  const pOff  = `$${params.length}`;
    const { rows } = await query(
      `SELECT c.id, c.last_name, c.first_name, c.email, c.phone,
              c.job_title, c.department, c.company_name,
              c.organization_id, o.code AS organization_code,
              c.office_location, c.city, c.country,
              c.employee_id, c.employee_type, c.user_type, c.account_enabled,
              c.sam_account_name, c.azure_object_id, c.active,
              c.manager_contact_id,
              NULLIF(TRIM(COALESCE(m.last_name,'') || ' ' || COALESCE(m.first_name, '')), '') AS manager_name,
              c.graph_synced_at, c.created_at, c.updated_at
         FROM contacts c
         LEFT JOIN organizations o ON o.id = c.organization_id
         LEFT JOIN contacts m       ON m.id = c.manager_contact_id
         ${where}
         ORDER BY ${orderBy}
         LIMIT ${pSize} OFFSET ${pOff}`,
      params
    );

    res.json({
      ...serialize('contact', rows),
      meta: {
        total,
        page: pageNum,
        pageSize: sizeNum,
        totalPages: Math.max(1, Math.ceil(total / sizeNum)),
      },
    });
  } catch (e) { next(e); }
};

// ─── FACETS (orgs + departments distincts pour les filtres UI) ──────────
exports.facets = async (_req, res, next) => {
  try {
    const [orgs, depts] = await Promise.all([
      query(`SELECT o.id, o.code, COUNT(c.id)::int AS n
               FROM organizations o
               LEFT JOIN contacts c ON c.organization_id = o.id
               GROUP BY o.id, o.code ORDER BY o.code`),
      query(`SELECT department, COUNT(*)::int AS n
               FROM contacts
               WHERE department IS NOT NULL AND department <> ''
               GROUP BY department ORDER BY department`),
    ]);
    res.json({
      data: {
        type: 'contact-facets', id: 'all',
        attributes: {
          organizations: orgs.rows,
          departments: depts.rows,
        },
      },
    });
  } catch (e) { next(e); }
};

// ─── TREE (centres de compétences, inchangé) ────────────────────────────
exports.tree = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT cc.id, cc.code, cc.label, cc.level, cc.parent_id, cc.is_interim,
              cc.manager_contact_id,
              m.last_name AS manager_last_name, m.first_name AS manager_first_name,
              cc.display_order, cc.notes
         FROM competency_centers cc
         LEFT JOIN contacts m ON m.id = cc.manager_contact_id
         WHERE cc.level IS NOT NULL
         ORDER BY cc.display_order`
    );
    res.json(serialize('competency-center', rows));
  } catch (e) { next(e); }
};

// ─── GET /contacts/:id ──────────────────────────────────────────────────
exports.get = async (req, res, next) => {
  try {
    const { rows } = await query(`${DETAIL_SELECT} WHERE c.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json(errorResponse(404, 'Contact not found'));
    res.json(serialize('contact', rows[0]));
  } catch (e) { next(e); }
};

// ─── POST /contacts ─────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const a = normalize(parseAttributes(req));
    const errs = validate(a, { partial: false });
    if (errs.length) return res.status(400).json(errorResponse(400, 'Validation failed', errs.join('; ')));

    const cols = Object.keys(a).filter((k) => a[k] !== undefined);
    if (!cols.includes('last_name')) cols.push('last_name'); // déjà validé
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map((c) => a[c]);

    let inserted;
    try {
      const result = await query(
        `INSERT INTO contacts (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        values
      );
      inserted = result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json(errorResponse(409, 'Duplicate contact',
          'A contact with the same identity (last name, first name, organization) already exists.'));
      }
      throw err;
    }

    const { rows } = await query(`${DETAIL_SELECT} WHERE c.id = $1`, [inserted.id]);
    logger.info('✅ Contact created', { id: inserted.id, last_name: a.last_name });
    res.status(201).json(serialize('contact', rows[0]));
  } catch (e) { next(e); }
};

// ─── PATCH /contacts/:id ────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const a = normalize(parseAttributes(req));
    const errs = validate(a, { partial: true });
    if (errs.length) return res.status(400).json(errorResponse(400, 'Validation failed', errs.join('; ')));

    const cols = Object.keys(a);
    if (!cols.length) return res.status(400).json(errorResponse(400, 'No attributes provided'));

    // Empêche un contact d'être son propre manager
    if ('manager_contact_id' in a && a.manager_contact_id != null
        && String(a.manager_contact_id) === String(req.params.id)) {
      return res.status(400).json(errorResponse(400, 'A contact cannot be its own manager'));
    }

    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const values = cols.map((c) => a[c]);
    values.push(req.params.id);

    let updated;
    try {
      const result = await query(
        `UPDATE contacts SET ${sets}, updated_at = NOW()
         WHERE id = $${values.length} RETURNING id`,
        values
      );
      updated = result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json(errorResponse(409, 'Duplicate contact',
          'These changes would conflict with another contact.'));
      }
      throw err;
    }
    if (!updated) return res.status(404).json(errorResponse(404, 'Contact not found'));

    const { rows } = await query(`${DETAIL_SELECT} WHERE c.id = $1`, [updated.id]);
    logger.info('✅ Contact updated', { id: updated.id });
    res.json(serialize('contact', rows[0]));
  } catch (e) { next(e); }
};

// ─── DELETE /contacts/:id ───────────────────────────────────────────────
// Soft-delete par défaut (active = FALSE), hard-delete avec ?hard=true.
// Refuse le hard-delete si le contact est référencé.
exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const hard = req.query.hard === 'true';

    if (!hard) {
      const { rowCount } = await query(
        `UPDATE contacts SET active = FALSE, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      if (!rowCount) return res.status(404).json(errorResponse(404, 'Contact not found'));
      logger.info('🗄️ Contact deactivated (soft-delete)', { id });
      return res.status(204).end();
    }

    // Hard-delete : vérifier les références
    const { rows: refs } = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM contacts        WHERE manager_contact_id = $1) AS as_manager,
         (SELECT COUNT(*)::int FROM memberships     WHERE contact_id = $1)         AS memberships,
         (SELECT COUNT(*)::int FROM competency_centers WHERE manager_contact_id = $1) AS cc_manager`,
      [id]
    );
    const r = refs[0] || {};
    const blocking = (r.as_manager || 0) + (r.memberships || 0) + (r.cc_manager || 0);
    if (blocking > 0) {
      return res.status(409).json(errorResponse(409, 'Contact is referenced',
        `Cannot hard-delete: ${r.as_manager} report(s), ${r.memberships} membership(s), ${r.cc_manager} CC management(s). Deactivate instead.`));
    }

    const { rowCount } = await query(`DELETE FROM contacts WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json(errorResponse(404, 'Contact not found'));
    logger.info('🗑️ Contact hard-deleted', { id });
    res.status(204).end();
  } catch (e) { next(e); }
};

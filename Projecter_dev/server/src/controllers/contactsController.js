'use strict';
const { query } = require('../utils/db');
const { serialize, errorResponse } = require('../utils/jsonapi');

exports.list = async (req, res, next) => {
  try {
    const { q, organization } = req.query;
    const conds = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      conds.push(`(c.last_name ILIKE $${params.length} OR c.first_name ILIKE $${params.length})`);
    }
    if (organization) {
      params.push(organization);
      conds.push(`o.code = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT c.id, c.last_name, c.first_name, c.email, c.job_title,
              c.organization_id, o.code AS organization_code
         FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id
         ${where}
         ORDER BY c.last_name, c.first_name LIMIT 500`,
      params
    );
    res.json(serialize('contact', rows));
  } catch (e) { next(e); }
};

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

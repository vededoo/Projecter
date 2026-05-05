'use strict';

/**
 * Helpers JSON:API.
 *  - serialize(type, row, { id, attributes, relationships })
 *  - parseAttributes(req)  : extrait data.attributes du body
 *  - errors(status, title, detail)
 */

function serialize(type, row, opts = {}) {
  if (row == null) return { data: null };
  if (Array.isArray(row)) {
    return { data: row.map(r => serializeOne(type, r, opts)) };
  }
  return { data: serializeOne(type, row, opts) };
}

function serializeOne(type, row, opts = {}) {
  const idField = opts.idField || 'id';
  const id = String(row[idField]);
  const { [idField]: _, ...rest } = row;
  return {
    type,
    id,
    attributes: opts.attributes ? opts.attributes(row) : rest,
    ...(opts.relationships ? { relationships: opts.relationships(row) } : {}),
  };
}

function parseAttributes(req) {
  if (!req.body || typeof req.body !== 'object') return {};
  return req.body.data?.attributes || {};
}

function errorResponse(status, title, detail) {
  return {
    errors: [{ status: String(status), title, ...(detail ? { detail } : {}) }],
  };
}

module.exports = { serialize, parseAttributes, errorResponse };

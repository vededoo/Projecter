'use strict';
const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD || undefined,
  max: 10,
});

pool.on('error', (err) => logger.error('❌ PG pool error', { msg: err.message }));

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  logger.debug('🗄️  pg query', { ms: Date.now() - start, rows: res.rowCount, sql: text.split('\n')[0].slice(0, 80) });
  return res;
}

module.exports = { pool, query };

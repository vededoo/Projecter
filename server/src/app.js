'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const routes = require('./routes');
const { errorResponse } = require('./utils/jsonapi');

const app = express();
const PORT = Number(process.env.PORT) || 5054;
const ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({ origin: ORIGINS.length ? ORIGINS : true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  logger.debug('📥 ' + req.method + ' ' + req.url);
  next();
});

app.use('/api', routes);

app.use((req, res) => res.status(404).json(errorResponse(404, 'Not found', req.url)));

app.use((err, _req, res, _next) => {
  logger.error('❌ ' + err.message, { stack: err.stack });
  res.status(500).json(errorResponse(500, 'Internal server error', err.message));
});

app.listen(PORT, () => logger.info(`🚀 Projecter server listening on :${PORT}`));

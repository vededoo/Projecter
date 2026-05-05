'use strict';
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const fmt = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const m = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${timestamp} [${level}] ${message}${m}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    fmt
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'projecter_dev_server.log') }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'projecter_dev_server-error.log'), level: 'error' }),
  ],
});

module.exports = logger;

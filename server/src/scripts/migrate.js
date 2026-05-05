#!/usr/bin/env node
/**
 * Projecter — Mini runner de migrations SQL.
 *
 * Lit `database/migrations/*.sql` (ordre alphabétique, donc préfixe numérique
 * obligatoire) et applique uniquement celles non encore présentes dans la
 * table `_migrations`. Chaque migration tourne dans sa propre transaction.
 *
 * Usage :
 *   node src/scripts/migrate.js                # applique les migrations en attente
 *   node src/scripts/migrate.js --status       # affiche l'état (appliquées / en attente)
 *   node src/scripts/migrate.js --dry-run      # affiche ce qui serait fait, sans exécuter
 *   node src/scripts/migrate.js --baseline     # marque TOUTES les migrations comme appliquées
 *                                              # (à utiliser une fois sur une DB déjà en place)
 *   PGDATABASE=Projecter_prd node src/scripts/migrate.js
 *
 * Convention : un fichier de migration = un nom du type `NNN_description.sql`
 * (ex : `002_contacts_azure_sync.sql`). Les migrations sont identifiées par
 * leur nom de fichier et ne sont JAMAIS rejouées.
 *
 * IMPORTANT : ne jamais modifier une migration déjà appliquée. Pour corriger,
 * créer une nouvelle migration.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

const args = process.argv.slice(2);
const flagStatus = args.includes('--status');
const flagDryRun = args.includes('--dry-run');
const flagBaseline = args.includes('--baseline');

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD || undefined,
  max: 2,
});

const log = (...a) => console.log(...a);
const err = (...a) => console.error(...a);

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename     TEXT PRIMARY KEY,
      checksum     TEXT NOT NULL,
      applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration_ms  INTEGER NOT NULL
    );
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations folder not found: ${MIGRATIONS_DIR}`);
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

async function getApplied(client) {
  const { rows } = await client.query(`SELECT filename, checksum FROM _migrations ORDER BY filename`);
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

async function applyOne(client, filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(fullPath, 'utf8');
  const sum = checksum(sql);
  const t0 = Date.now();
  log(`⏳ Applying ${filename} (sha=${sum}) ...`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO _migrations (filename, checksum, duration_ms) VALUES ($1, $2, $3)`,
      [filename, sum, Date.now() - t0]
    );
    await client.query('COMMIT');
    log(`✅ Applied ${filename} in ${Date.now() - t0}ms`);
  } catch (e) {
    await client.query('ROLLBACK');
    err(`❌ Failed ${filename} after ${Date.now() - t0}ms`);
    err(`   ${e.message}`);
    throw e;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const files = listMigrationFiles();
    const applied = await getApplied(client);

    log(`🗄️  DB: ${process.env.PGDATABASE}`);
    log(`📂 Migrations dir: ${MIGRATIONS_DIR}`);
    log(`📋 ${files.length} file(s) found, ${applied.size} already applied`);

    // Detect drift (a migration was modified after being applied)
    const drift = [];
    for (const f of files) {
      if (applied.has(f)) {
        const sum = checksum(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'));
        if (sum !== applied.get(f)) drift.push({ file: f, was: applied.get(f), now: sum });
      }
    }
    if (drift.length) {
      err(`⚠️  WARNING: ${drift.length} applied migration(s) have changed on disk:`);
      for (const d of drift) err(`   - ${d.file} (was ${d.was}, now ${d.now})`);
      err(`   → never modify an applied migration; create a new one.`);
    }

    // Detect "missing in folder but applied" (someone deleted a file)
    for (const [f] of applied) {
      if (!files.includes(f)) err(`⚠️  Applied but missing from folder: ${f}`);
    }

    const pending = files.filter((f) => !applied.has(f));

    if (flagStatus) {
      log(`\n=== Applied (${applied.size}) ===`);
      for (const [f, sum] of applied) log(`  ✓ ${f}  [${sum}]`);
      log(`\n=== Pending (${pending.length}) ===`);
      for (const f of pending) log(`  ▢ ${f}`);
      return;
    }

    if (flagBaseline) {
      if (!pending.length) {
        log(`✅ Nothing to baseline; all migrations are already recorded.`);
        return;
      }
      log(`\n📌 Baselining ${pending.length} migration(s) WITHOUT executing them:`);
      for (const f of pending) {
        const sum = checksum(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'));
        await client.query(
          `INSERT INTO _migrations (filename, checksum, duration_ms) VALUES ($1, $2, 0)`,
          [f, sum]
        );
        log(`   ✓ ${f}`);
      }
      log(`\n🎉 Baseline complete.`);
      return;
    }

    if (!pending.length) {
      log(`✅ Database is up to date. Nothing to apply.`);
      return;
    }

    log(`\n📥 ${pending.length} migration(s) to apply:`);
    for (const f of pending) log(`   - ${f}`);

    if (flagDryRun) {
      log(`\n🔎 --dry-run mode: nothing was executed.`);
      return;
    }

    for (const f of pending) {
      await applyOne(client, f);
    }
    log(`\n🎉 ${pending.length} migration(s) applied successfully.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  err('❌ Migration runner failed:', e.message);
  process.exit(1);
});

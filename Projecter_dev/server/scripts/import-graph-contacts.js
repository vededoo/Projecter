#!/usr/bin/env node
/**
 * import-graph-contacts.js
 * ------------------------
 * Filtre un dump Graph et UPSERT la table `contacts` (clé = azure_object_id).
 * Pass 1: insert/update tous les contacts retenus.
 * Pass 2: résout manager_contact_id depuis l'expand manager.
 *
 * Usage :
 *   node scripts/import-graph-contacts.js /tmp/graph-users-raw.json [options]
 *
 * Options :
 *   --apply              Exécute (par défaut: dry-run)
 *   --scope etnic|etnic+cfwb|all   Périmètre (défaut: etnic+cfwb)
 *   --no-create          UPDATE uniquement (n'insère pas les nouveaux)
 *   --overwrite          Écrase les valeurs existantes (par défaut: COALESCE)
 *   --report <file>      Détail JSON (défaut: /tmp/graph-import-report.json)
 *
 * Variables d'env (lues comme le serveur Projecter) :
 *   PGHOST, PGPORT, PGDATABASE (défaut Projecter_dev), PGUSER, PGPASSWORD
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ─── CLI ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.match(/^--(scope|report)$/));
const APPLY = args.includes('--apply');
const NO_CREATE = args.includes('--no-create');
const OVERWRITE = args.includes('--overwrite');
const scopeIdx = args.indexOf('--scope');
const SCOPE = scopeIdx >= 0 ? args[scopeIdx + 1] : 'etnic+cfwb';
const reportIdx = args.indexOf('--report');
const REPORT_PATH = reportIdx >= 0 ? args[reportIdx + 1] : '/tmp/graph-import-report.json';

if (!inputPath) {
  console.error('Usage: import-graph-contacts.js <graph-users.json> [--apply] [--scope etnic|etnic+cfwb|all] [--no-create] [--overwrite] [--report file]');
  process.exit(2);
}
if (!['etnic', 'etnic+cfwb', 'all'].includes(SCOPE)) {
  console.error(`❌ --scope invalide: ${SCOPE} (etnic | etnic+cfwb | all)`);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const users = Array.isArray(raw) ? raw : raw.value || [];
console.log(`📂 Lu ${users.length} entrées depuis ${path.basename(inputPath)}`);

// ─── Filtrage ───────────────────────────────────────────────────────────
const STUDENT_DOMAINS = /@(student\.|he-|umons\.ac\.be|ulb\.ac\.be|uliege\.be|uclouvain\.be|unamur\.be|usaintlouis\.be|umh\.ac\.be)/i;
const SHARED_DEPT = /^(SharedMailboxes|Service Accounts|Contractors-NoLicense|Resources)$/i;

function classify(u) {
  const mail = (u.mail || '').toLowerCase();
  if (!mail && !u.userPrincipalName) return 'no-email';
  if (SHARED_DEPT.test(u.department || '')) return 'shared-mailbox';
  if (!u.surname && !u.givenName) return 'no-name';
  if (STUDENT_DOMAINS.test(mail)) return 'student-external';
  if (mail.endsWith('@etnic.be')) return 'etnic';
  if (mail.endsWith('@cfwb.be')) return 'cfwb';
  return 'other';
}

const buckets = { etnic: [], cfwb: [], 'shared-mailbox': [], 'student-external': [], 'no-email': [], 'no-name': [], other: [] };
users.forEach((u) => buckets[classify(u)].push(u));

console.log('🔎 Classification :');
Object.entries(buckets).forEach(([k, v]) => console.log(`   ${k.padEnd(18)} ${v.length}`));

let candidates;
if (SCOPE === 'etnic') candidates = buckets.etnic;
else if (SCOPE === 'etnic+cfwb') candidates = [...buckets.etnic, ...buckets.cfwb];
else candidates = [...buckets.etnic, ...buckets.cfwb, ...buckets.other];
console.log(`\n👉 ${candidates.length} candidat(s) à importer (scope=${SCOPE})`);

if (candidates.length === 0) { console.log('Rien à faire.'); process.exit(0); }

// ─── DB ─────────────────────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'Projecter_dev',
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD || undefined,
  max: 4,
});

// Champs typés en colonnes (le reste va dans graph_attributes JSONB)
const COL_FIELDS = new Set([
  'id', 'displayName', 'givenName', 'surname', 'mail', 'userPrincipalName',
  'jobTitle', 'department', 'companyName',
  'employeeId', 'employeeType', 'userType', 'accountEnabled',
  'officeLocation', 'mobilePhone', 'businessPhones',
  'streetAddress', 'postalCode', 'city', 'state', 'country',
  'usageLocation', 'preferredLanguage',
  'onPremisesSamAccountName',
  'manager', '@odata.type', '@odata.id',
]);

function buildAttributes(u) {
  const attrs = {};
  for (const [k, v] of Object.entries(u)) {
    if (COL_FIELDS.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    attrs[k] = v;
  }
  return attrs;
}

function rowFromGraph(u, orgId) {
  return {
    azure_object_id: u.id,
    last_name: (u.surname || '').trim() || null,
    first_name: (u.givenName || '').trim() || null,
    display_name: u.displayName || null,
    user_principal_name: u.userPrincipalName || null,
    email: (u.mail || '').toLowerCase().trim() || null,
    phone: u.mobilePhone || (u.businessPhones && u.businessPhones[0]) || null,
    job_title: u.jobTitle || null,
    department: u.department || null,
    organization_id: orgId,
    company_name: u.companyName || null,
    employee_id: u.employeeId || null,
    employee_type: u.employeeType || null,
    user_type: u.userType || null,
    account_enabled: typeof u.accountEnabled === 'boolean' ? u.accountEnabled : null,
    office_location: u.officeLocation || null,
    street_address: u.streetAddress || null,
    postal_code: u.postalCode || null,
    city: u.city || null,
    state: u.state || null,
    country: u.country || null,
    usage_location: u.usageLocation || null,
    preferred_language: u.preferredLanguage || null,
    sam_account_name: u.onPremisesSamAccountName || null,
    graph_attributes: buildAttributes(u),
  };
}

(async () => {
  const { rows: orgs } = await pool.query('SELECT id, code FROM organizations');
  const orgByCode = Object.fromEntries(orgs.map((o) => [o.code.toUpperCase(), o.id]));
  const ETNIC_ID = orgByCode.ETNIC;
  const CFWB_ID = orgByCode.MFWB || orgByCode.WBE;

  const { rows: existing } = await pool.query(
    'SELECT id, azure_object_id, last_name, first_name, email, organization_id FROM contacts'
  );
  const byOid = new Map();
  const byNameOrg = new Map();
  const byEmail = new Map();
  for (const c of existing) {
    if (c.azure_object_id) byOid.set(c.azure_object_id, c);
    if (c.email) byEmail.set(c.email.toLowerCase(), c);
    const k = `${(c.last_name || '').toLowerCase()}|${(c.first_name || '').toLowerCase()}|${c.organization_id || 0}`;
    byNameOrg.set(k, c);
  }
  console.log(`📚 ${existing.length} contacts en base (${byOid.size} déjà liés à un Azure Object ID)`);

  const report = {
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    options: { SCOPE, NO_CREATE, OVERWRITE },
    counts: { updated: 0, created: 0, unchanged: 0, skipped: 0 },
    counts_pass2: { manager_set: 0, manager_unresolved: 0, no_manager: 0 },
    samples: { created: [], updated: [], unresolved_managers: [] },
  };

  // Map locale Azure OID → contact id (alimentée à mesure des INSERTs APPLY)
  const oidToContactId = new Map();
  for (const c of existing) if (c.azure_object_id) oidToContactId.set(c.azure_object_id, c.id);

  // ─── PASS 1 : UPSERT ──────────────────────────────────────────────────
  console.log('\n🔄 Pass 1 — UPSERT contacts');
  for (const u of candidates) {
    const isEtnic = (u.mail || '').toLowerCase().endsWith('@etnic.be');
    const isCfwb = (u.mail || '').toLowerCase().endsWith('@cfwb.be');
    const orgId = isEtnic ? ETNIC_ID : (isCfwb ? CFWB_ID : null);
    const row = rowFromGraph(u, orgId);

    if (!row.last_name && !row.email) { report.counts.skipped++; continue; }

    // Match : OID > email > nom+prénom+org > nom+prénom+(sans org)
    const lkLast = (row.last_name || '').toLowerCase();
    const lkFirst = (row.first_name || '').toLowerCase();
    let match = byOid.get(u.id)
             || (row.email && byEmail.get(row.email))
             || byNameOrg.get(`${lkLast}|${lkFirst}|${orgId || 0}`)
             || byNameOrg.get(`${lkLast}|${lkFirst}|0`); // fallback contact pré-existant sans org

    if (match) {
      // UPDATE
      report.counts.updated++;
      if (report.samples.updated.length < 5) report.samples.updated.push({ id: match.id, name: `${row.last_name || ''} ${row.first_name || ''}`.trim(), email: row.email });
      if (APPLY) {
        const cols = ['azure_object_id','display_name','user_principal_name','department','company_name','employee_id','employee_type','user_type','account_enabled',
                      'office_location','street_address','postal_code','city','state','country',
                      'usage_location','preferred_language','sam_account_name'];
        const sets = [];
        const vals = [];
        let i = 1;
        // azure_object_id : toujours mettre si vide
        sets.push(`azure_object_id = COALESCE(azure_object_id, $${i++})`); vals.push(row.azure_object_id);
        // email/phone/job_title : COALESCE sauf --overwrite
        const upsert = (col, val) => {
          if (val === null || val === undefined) return;
          if (OVERWRITE) { sets.push(`${col} = $${i++}`); vals.push(val); }
          else           { sets.push(`${col} = COALESCE(${col}, $${i++})`); vals.push(val); }
        };
        upsert('email', row.email);
        upsert('phone', row.phone);
        upsert('job_title', row.job_title);
        if (!match.organization_id && orgId) { sets.push(`organization_id = $${i++}`); vals.push(orgId); }
        // colonnes Graph : toujours rafraîchir (source d'autorité)
        for (const col of cols.slice(1)) { sets.push(`${col} = $${i++}`); vals.push(row[col]); }
        sets.push(`graph_attributes = $${i++}`); vals.push(row.graph_attributes);
        sets.push(`graph_synced_at = NOW()`);
        sets.push(`updated_at = NOW()`);
        vals.push(match.id);
        await pool.query(`UPDATE contacts SET ${sets.join(', ')} WHERE id = $${i}`, vals);
        oidToContactId.set(u.id, match.id);
      }
    } else {
      if (NO_CREATE) { report.counts.skipped++; continue; }
      if (!row.last_name) { report.counts.skipped++; continue; }
      report.counts.created++;
      if (report.samples.created.length < 5) report.samples.created.push({ name: `${row.last_name} ${row.first_name || ''}`.trim(), email: row.email, org: isEtnic ? 'ETNIC' : (isCfwb ? 'CFWB' : 'other') });
      if (APPLY) {
        // INSERT simple — la dédup est gérée applicativement par byOid/byEmail/byNameOrg
        // (l'index unique uq_contact_identity utilise des expressions et ne peut pas servir d'ON CONFLICT target).
        let inserted;
        try {
          const { rows } = await pool.query(
            `INSERT INTO contacts (
               last_name, first_name, display_name, user_principal_name,
               email, phone, job_title, department, organization_id,
               azure_object_id, company_name, employee_id, employee_type, user_type, account_enabled,
               office_location, street_address, postal_code, city, state, country,
               usage_location, preferred_language, sam_account_name,
               graph_attributes, graph_synced_at
             ) VALUES (
               $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               $16,$17,$18,$19,$20,$21,$22,$23,$24,$25, NOW()
             ) RETURNING id`,
            [
              row.last_name, row.first_name, row.display_name, row.user_principal_name,
              row.email, row.phone, row.job_title, row.department, row.organization_id,
              row.azure_object_id, row.company_name, row.employee_id, row.employee_type, row.user_type, row.account_enabled,
              row.office_location, row.street_address, row.postal_code, row.city, row.state, row.country,
              row.usage_location, row.preferred_language, row.sam_account_name,
              row.graph_attributes,
            ]
          );
          inserted = rows[0];
        } catch (e) {
          if (e.code !== '23505') throw e; // unique violation → fusion logique ci-dessous
          // Récupère la fiche existante via les expressions de l'index
          const { rows: dup } = await pool.query(
            `SELECT id FROM contacts
              WHERE lower(last_name) = lower($1)
                AND lower(coalesce(first_name,'')) = lower(coalesce($2,''))
                AND coalesce(organization_id,0) = coalesce($3,0)
              LIMIT 1`,
            [row.last_name, row.first_name, row.organization_id]
          );
          if (!dup[0]) throw e;
          // Met à jour la fiche existante (fusion COALESCE + JSONB merge)
          await pool.query(
            `UPDATE contacts SET
               email = COALESCE(email, $1),
               phone = COALESCE(phone, $2),
               job_title = COALESCE(job_title, $3),
               azure_object_id = COALESCE(azure_object_id, $4),
               display_name = COALESCE(display_name, $5),
               user_principal_name = COALESCE(user_principal_name, $6),
               department = COALESCE(department, $7),
               company_name = COALESCE(company_name, $8),
               employee_id = COALESCE(employee_id, $9),
               employee_type = COALESCE(employee_type, $10),
               user_type = COALESCE(user_type, $11),
               account_enabled = COALESCE(account_enabled, $12),
               office_location = COALESCE(office_location, $13),
               street_address = COALESCE(street_address, $14),
               postal_code = COALESCE(postal_code, $15),
               city = COALESCE(city, $16),
               state = COALESCE(state, $17),
               country = COALESCE(country, $18),
               usage_location = COALESCE(usage_location, $19),
               preferred_language = COALESCE(preferred_language, $20),
               sam_account_name = COALESCE(sam_account_name, $21),
               graph_attributes = graph_attributes || $22,
               graph_synced_at = NOW(),
               updated_at = NOW()
             WHERE id = $23`,
            [row.email, row.phone, row.job_title, row.azure_object_id,
             row.display_name, row.user_principal_name, row.department,
             row.company_name, row.employee_id, row.employee_type, row.user_type, row.account_enabled,
             row.office_location, row.street_address, row.postal_code, row.city, row.state, row.country,
             row.usage_location, row.preferred_language, row.sam_account_name,
             row.graph_attributes, dup[0].id]
          );
          inserted = { id: dup[0].id };
          report.counts.created--; // ce n'était pas une vraie création
          report.counts.updated++;
        }
        if (inserted) {
          oidToContactId.set(u.id, inserted.id);
          const k = `${row.last_name.toLowerCase()}|${(row.first_name || '').toLowerCase()}|${orgId || 0}`;
          byNameOrg.set(k, { id: inserted.id, last_name: row.last_name, first_name: row.first_name, email: row.email, organization_id: orgId });
          if (row.email) byEmail.set(row.email, { id: inserted.id, last_name: row.last_name, first_name: row.first_name, email: row.email, organization_id: orgId });
          if (row.azure_object_id) byOid.set(row.azure_object_id, { id: inserted.id });
        }
      }
    }
  }
  console.log(`   updated ${report.counts.updated} / created ${report.counts.created} / skipped ${report.counts.skipped}`);

  // ─── PASS 2 : managers ────────────────────────────────────────────────
  console.log('\n🔗 Pass 2 — résolution des managers');
  for (const u of candidates) {
    if (!u.manager || !u.manager.id) { report.counts_pass2.no_manager++; continue; }
    const myCid = oidToContactId.get(u.id);
    const mgrCid = oidToContactId.get(u.manager.id);
    if (!myCid) continue;
    if (!mgrCid) {
      report.counts_pass2.manager_unresolved++;
      if (report.samples.unresolved_managers.length < 10) {
        report.samples.unresolved_managers.push({ user: u.displayName, manager: u.manager.displayName, manager_oid: u.manager.id });
      }
      continue;
    }
    if (myCid === mgrCid) continue; // safety
    report.counts_pass2.manager_set++;
    if (APPLY) {
      await pool.query('UPDATE contacts SET manager_contact_id = $1, updated_at = NOW() WHERE id = $2 AND (manager_contact_id IS DISTINCT FROM $1)', [mgrCid, myCid]);
    }
  }
  console.log(`   manager_set ${report.counts_pass2.manager_set} / unresolved ${report.counts_pass2.manager_unresolved} / no_manager ${report.counts_pass2.no_manager}`);

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('\n📊 Résumé global :');
  console.table(report.counts);
  console.table(report.counts_pass2);
  console.log(`\n📝 Détail écrit dans ${REPORT_PATH}`);
  if (!APPLY) console.log('\n⚠️  DRY-RUN (aucune écriture). Relance avec --apply pour exécuter.');
  await pool.end();
})().catch((e) => { console.error('❌', e); process.exit(1); });

#!/usr/bin/env node
/**
 * fetch-graph-users.js
 * --------------------
 * Aspire TOUS les /v1.0/users de Microsoft Graph (pagination automatique).
 * Inclut tous les champs utiles + expand manager pour reconstruire la hiérarchie.
 *
 * Pré-requis : un access token Graph (depuis Graph Explorer
 *              → onglet "Access token", puis copier).
 *
 * Usage :
 *   GRAPH_TOKEN="eyJ0eXAi..." node scripts/fetch-graph-users.js > /tmp/graph-users-raw.json
 *
 * Options (env) :
 *   GRAPH_SELECT  liste de champs (par défaut : SELECT_DEFAULT ci-dessous)
 *   GRAPH_TOP     taille de page (défaut: 999, max Graph)
 *   NO_MANAGER=1  désactive l'expand manager (plus rapide, pas de hiérarchie)
 */
'use strict';

const TOKEN = process.env.GRAPH_TOKEN;
if (!TOKEN) {
  console.error('❌ GRAPH_TOKEN env var is required.');
  console.error('   Get one from https://developer.microsoft.com/graph/graph-explorer');
  console.error('   → tab "Access token" → copy → export GRAPH_TOKEN="..."');
  process.exit(2);
}

const SELECT_DEFAULT = [
  'id',
  'displayName', 'givenName', 'surname', 'mail', 'userPrincipalName',
  'proxyAddresses',
  'jobTitle', 'department', 'companyName',
  'employeeId', 'employeeType', 'userType', 'accountEnabled',
  'officeLocation', 'mobilePhone', 'businessPhones',
  'streetAddress', 'postalCode', 'city', 'state', 'country',
  'usageLocation', 'preferredLanguage',
  'onPremisesSamAccountName', 'onPremisesDistinguishedName',
  'onPremisesDomainName', 'onPremisesSyncEnabled',
  'createdDateTime',
].join(',');

const SELECT = process.env.GRAPH_SELECT || SELECT_DEFAULT;
const TOP = process.env.GRAPH_TOP || '999';
const WITH_MANAGER = process.env.NO_MANAGER !== '1';

const params = new URLSearchParams({ $select: SELECT, $top: TOP });
if (WITH_MANAGER) params.set('$expand', 'manager($select=id,displayName,mail)');

const BASE = `https://graph.microsoft.com/v1.0/users?${params.toString()}`;

(async () => {
  const all = [];
  let url = BASE;
  let page = 0;

  while (url) {
    page += 1;
    process.stderr.write(`📥 page ${page}… `);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) {
      const body = await r.text();
      console.error(`\n❌ HTTP ${r.status} — ${body.slice(0, 600)}`);
      if (r.status === 401) console.error('   Token expiré ? Récupère-en un nouveau dans Graph Explorer.');
      if (r.status === 400 && WITH_MANAGER) console.error('   Astuce : NO_MANAGER=1 pour désactiver l\'expand manager.');
      process.exit(1);
    }
    const json = await r.json();
    all.push(...json.value);
    process.stderr.write(`+${json.value.length} (total ${all.length})\n`);
    url = json['@odata.nextLink'] || null;
  }

  process.stderr.write(`✅ done — ${all.length} users in ${page} page(s)\n`);
  process.stdout.write(JSON.stringify({ count: all.length, value: all }, null, 2));
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});

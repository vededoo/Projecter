'use strict';
/**
 * costraService.js — Génération de fiches Costra (.xlsm) depuis les données Projecter
 *
 * Flux :
 *   1. Charger le template depuis dirkey 'templates' (NomDuProjet - Fiches Costra - v00.xlsm)
 *   2. Résoudre les données du projet (DB + project_members + risks)
 *   3. Ouvrir le template comme archive ZIP (PizZip) — macros + mise en forme préservées
 *   4. Pour chaque cellule du CELL_MAPPING, injecter la valeur directement dans les XML worksheets
 *   5. Sauvegarder en .xlsm dans dirkey 'costra_fiches'
 *   6. Retourner le chemin absolu du fichier généré
 *
 * Ce service n'importe JAMAIS fs directement — tout passe par localFileManager.
 * La logique de mapping est isolée dans config/costraTemplate.js.
 *
 * @module costraService
 * @version 2.0.0
 */

const PizZip      = require('pizzip');
const path        = require('path');
const fileManager = require('../utils/localFileManager');
const logger      = require('../utils/logger');
const { query }   = require('../utils/db');
const {
  TEMPLATE_FILENAME,
  OUTPUT_DIR_KEY,
  OUTPUT_EXTENSION,
  CELL_MAPPING,
  ATTRIBUTE_FIELDS,
} = require('../config/costraTemplate');

const MODULE = 'costraService';

// ── Résolution des données ────────────────────────────────────────────────────

async function loadProjectData(projectId) {
  const { rows: projects } = await query(
    `SELECT p.*,
            o.name AS client_org_name
       FROM projects p
       LEFT JOIN organizations o ON o.id = p.client_organization_id
      WHERE p.id = $1`,
    [projectId]
  );
  if (!projects.length) throw new Error(`Project ${projectId} not found`);
  return projects[0];
}

async function loadProjectMembers(projectId) {
  const { rows } = await query(
    `SELECT pm.role,
            COALESCE(
              NULLIF(c.display_name, ''),
              NULLIF(TRIM(c.first_name || ' ' || c.last_name), ''),
              NULLIF(c.email, '')
            ) AS display_name
       FROM project_members pm
       JOIN contacts c ON c.id = pm.contact_id
      WHERE pm.project_id = $1`,
    [projectId]
  );
  // Indexer par role (prend le premier si plusieurs)
  return rows.reduce((acc, r) => {
    if (!acc[r.role]) acc[r.role] = r.display_name || '';
    return acc;
  }, {});
}

async function loadProjectRisks(projectId) {
  // Risques liés via risk_projects (many-to-many)
  // La distinction dependency/obstacle vient de attributes.risk_type (JSONB)
  // Si pas de type défini, on classe tout dans 'other'
  const { rows } = await query(
    `SELECT r.label AS description, r.mitigation_plan AS mitigation,
            r.attributes->>'risk_type' AS risk_type
       FROM risks r
       JOIN risk_projects rp ON rp.risk_id = r.id
      WHERE rp.project_id = $1
      ORDER BY r.id`,
    [projectId]
  );
  const result = {};
  for (const r of rows) {
    const t = (r.risk_type || 'other').toLowerCase();
    if (!result[t]) result[t] = [];
    result[t].push(r);
  }
  return result;
}

// ── Résolution d'une valeur de cellule ────────────────────────────────────────

function resolveCell(entry, project, members, risks) {
  const attrs = project.attributes || {};
  const { source, field, role, riskType, multi, format, scenarioIdx, budgetType, costType, year, period } = entry;

  switch (source) {

    case 'project':
      return project[field] ?? '';

    case 'attribute': {
      const raw = attrs[field];
      if (raw == null) return '';
      // Arrays : prendre l'élément à l'index multi
      if (Array.isArray(raw)) return raw[multi ?? 0] ?? '';
      return String(raw);
    }

    case 'member':
      return members[role] || '';

    case 'risk': {
      const list = risks[riskType] || [];
      const item = list[multi ?? 0];
      return item ? (item.description || '') : '';
    }

    case 'date': {
      const raw = project[field];
      if (!raw) return '';
      const d = new Date(raw);
      if (isNaN(d.getTime())) return '';
      if (format === 'day')   return d.getDate();
      if (format === 'month') return d.getMonth() + 1;
      if (format === 'year')  return d.getFullYear();
      // full : DD/MM/YYYY
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }

    case 'scenario': {
      const scenarios = attrs.scenarios;
      if (!Array.isArray(scenarios) || !scenarios[scenarioIdx]) return '';
      const sc = scenarios[scenarioIdx];
      if (field) return sc[field] ?? '';
      // Budget
      if (budgetType && costType && year && period) {
        return sc.budget?.[budgetType]?.[costType]?.[year]?.[period] ?? 0;
      }
      return '';
    }

    default:
      return '';
  }
}

// ── Helpers ZIP / XML ─────────────────────────────────────────────────────────

/**
 * Échappe les caractères spéciaux XML dans une valeur string.
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extrait l'attribut style (s="N") depuis la chaîne d'attributs d'un élément XML.
 * Retourne ` s="N"` (avec espace préfixe) ou '' si absent.
 */
function extractStyleAttr(attrsStr = '') {
  const m = attrsStr.match(/\bs="(\d+)"/);
  return m ? ` s="${m[1]}"` : '';
}

/**
 * Parse xl/workbook.xml + xl/_rels/workbook.xml.rels pour obtenir le mapping
 * nom_feuille → chemin_fichier_dans_zip (ex: 'xl/worksheets/sheet1.xml').
 */
function parseWorkbookSheets(zip) {
  const workbookXml = zip.file('xl/workbook.xml').asText();
  const relsXml     = zip.file('xl/_rels/workbook.xml.rels').asText();

  // rId → target
  const relMap    = {};
  const relRegex  = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g;
  let m;
  while ((m = relRegex.exec(relsXml)) !== null) {
    relMap[m[1]] = m[2];
  }

  // sheet name → rId → target
  const sheetMap    = {};
  const sheetRegex  = /<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g;
  while ((m = sheetRegex.exec(workbookXml)) !== null) {
    const target = relMap[m[2]];
    if (target) {
      sheetMap[m[1]] = target.startsWith('xl/') ? target : `xl/${target}`;
    }
  }

  return sheetMap;
}

/**
 * Insère une cellule dans la ligne correspondante du XML.
 * Si la ligne n'existe pas, crée une ligne minimale avant </sheetData>.
 */
function insertCellIntoRow(wsXml, cellRef, newCell) {
  const rowNum      = cellRef.match(/\d+/)[0];
  const escapedRow  = rowNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rowPattern  = new RegExp(`(<row\\b[^>]*\\br="${escapedRow}"[^>]*>)([\\s\\S]*?)(</row>)`);
  const rowMatch    = wsXml.match(rowPattern);

  if (rowMatch) {
    return wsXml.replace(rowPattern, `$1$2${newCell}$3`);
  }

  // Ligne inexistante — insérer avant </sheetData>
  const newRow = `<row r="${rowNum}">${newCell}</row>`;
  return wsXml.replace(/<\/sheetData>/, `${newRow}</sheetData>`);
}

/**
 * Injecte une valeur dans une cellule du XML worksheet.
 * Préserve l'attribut de style (s="N") de la cellule originale.
 * Utilise inlineStr pour les chaînes (pas de gestion de sharedStrings nécessaire).
 */
function injectCell(wsXml, cellRef, value) {
  const escapedRef  = cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Cellule existante : <c r="D9" s="3" ...>...</c>  ou  <c r="D9" s="3"/>
  const cellPattern = new RegExp(
    `<c\\b([^>]*?)\\br="${escapedRef}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`
  );

  const match     = wsXml.match(cellPattern);
  const attrsStr  = match ? (match[1] + ' ' + match[2]) : '';
  const styleAttr = extractStyleAttr(attrsStr);

  let newCell;
  if (typeof value === 'number') {
    newCell = `<c r="${cellRef}"${styleAttr}><v>${value}</v></c>`;
  } else {
    const xmlVal = escapeXml(String(value));
    newCell = `<c r="${cellRef}" t="inlineStr"${styleAttr}><is><t>${xmlVal}</t></is></c>`;
  }

  if (match) {
    return wsXml.replace(cellPattern, newCell);
  }

  // Cellule absente du template — l'insérer dans la bonne ligne
  return insertCellIntoRow(wsXml, cellRef, newCell);
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

/**
 * Génère une fiche Costra pour un projet donné.
 * Copie le template .xlsm et y injecte les valeurs directement — macros et
 * mise en forme originales entièrement préservées.
 *
 * @param {number} projectId
 * @returns {Promise<{ filename: string, filePath: string }>}
 */
async function generate(projectId) {
  logger.info(`🚀 [${MODULE}] Génération fiche Costra pour projet #${projectId}`);

  // 1. Charger les données
  const [project, members, risks] = await Promise.all([
    loadProjectData(projectId),
    loadProjectMembers(projectId),
    loadProjectRisks(projectId),
  ]);

  // 2. Lire le template en binaire et l'ouvrir comme archive ZIP
  const templatePath   = fileManager.resolvePath('templates', TEMPLATE_FILENAME);
  const templateBuffer = await fileManager.readFileBinary(templatePath);
  const zip            = new PizZip(templateBuffer);

  // 3. Résoudre le mapping nom_feuille → fichier dans le ZIP
  const sheetMap = parseWorkbookSheets(zip);

  // 4. Injecter les valeurs cellule par cellule dans les XML worksheets
  for (const [sheetName, entries] of Object.entries(CELL_MAPPING)) {
    const sheetFile = sheetMap[sheetName];
    if (!sheetFile || !zip.file(sheetFile)) {
      logger.warn(`⚠️  [${MODULE}] Feuille introuvable dans le template : "${sheetName}"`);
      continue;
    }

    let wsXml = zip.file(sheetFile).asText();

    for (const entry of entries) {
      const value = resolveCell(entry, project, members, risks);
      if (value === '' || value == null) continue;
      wsXml = injectCell(wsXml, entry.cell, value);
    }

    zip.file(sheetFile, wsXml);
  }

  // 5. Générer le buffer de sortie — le ZIP est écrit tel quel, extension .xlsm
  const timestamp  = Date.now();
  const slug       = (project.slug || String(projectId)).replace(/[^a-z0-9_-]/gi, '_');
  const filename   = `Costra_${slug}_${timestamp}${OUTPUT_EXTENSION}`;
  const outputPath = fileManager.resolvePath(OUTPUT_DIR_KEY, filename);

  const outputBuffer = zip.generate({ type: 'nodebuffer' });
  await fileManager.writeFile(outputPath, outputBuffer, null);

  logger.info(`✅ [${MODULE}] Fiche générée : ${filename}`);
  return { filename, filePath: outputPath };
}

/**
 * Retourne la liste des fichiers Costra générés pour un projet.
 * Convention de nommage : `Costra_{slug}_*.xlsx`
 *
 * @param {number}  projectId
 * @param {string}  slug
 * @returns {Promise<Array<{ filename: string, size: number, createdAt: Date }>>}
 */
async function listFiles(projectId, slug) {
  const dirPath = fileManager.resolvePath(OUTPUT_DIR_KEY);
  const prefix  = `Costra_${(slug || String(projectId)).replace(/[^a-z0-9_-]/gi, '_')}_`;
  try {
    const result = await fileManager.core.browseFiles(dirPath);
    if (!result.success) return [];
    return result.files
      .filter(f => f.isFile && f.name.startsWith(prefix) && f.name.endsWith(OUTPUT_EXTENSION))
      .map(f => ({ filename: f.name, size: 0, createdAt: null }))
      .sort((a, b) => b.filename.localeCompare(a.filename));
  } catch {
    return [];
  }
}

/**
 * Retourne le chemin absolu d'un fichier Costra existant.
 *
 * @param {string} filename
 * @returns {string}
 */
function resolvePath(filename) {
  return fileManager.resolvePath(OUTPUT_DIR_KEY, filename);
}

module.exports = { generate, listFiles, resolvePath, ATTRIBUTE_FIELDS };

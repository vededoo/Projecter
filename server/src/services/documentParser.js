'use strict';
/**
 * documentParser — extrait le texte brut de fichiers Office/PDF uploadés.
 *
 * Formats supportés :
 *   .docx  → mammoth (excellent — texte + tableaux)
 *   .xlsx  → xlsx / SheetJS (texte de toutes les cellules par feuille)
 *   .pdf   → pdf-parse (bon si sélectionnable, vide si scanné)
 *   .txt / .csv → lecture directe (utf-8)
 *   .pptx  → skipped (extraction fiable impossible sans librairie dédiée)
 *   autres → skipped
 *
 * Retourne : { text: string, status: 'success'|'skipped', error?: string }
 */

const mammoth  = require('mammoth');
const XLSX     = require('xlsx');
const pdfParse = require('pdf-parse');
const path     = require('path');

const MAX_CHARS = 200_000; // limite raisonnable pour éviter les blobs monstres

/**
 * @param {Buffer} buffer  — contenu du fichier
 * @param {string} filename — nom original (pour détecter l'extension)
 * @returns {Promise<{ text: string|null, status: string, error?: string }>}
 */
async function parseDocument(buffer, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  try {
    // ── .docx ──────────────────────────────────────────────────────────────
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim().slice(0, MAX_CHARS);
      return { text, status: 'success' };
    }

    // ── .xlsx ──────────────────────────────────────────────────────────────
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const parts = [];
      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
        if (csv.trim()) parts.push(`=== Feuille : ${sheetName} ===\n${csv}`);
      }
      const text = parts.join('\n\n').trim().slice(0, MAX_CHARS);
      return { text, status: 'success' };
    }

    // ── .pdf ───────────────────────────────────────────────────────────────
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim().slice(0, MAX_CHARS);
      if (!text) {
        return { text: null, status: 'skipped', error: 'PDF vide ou scanné (pas de texte sélectionnable)' };
      }
      return { text, status: 'success' };
    }

    // ── .txt / .csv ────────────────────────────────────────────────────────
    if (ext === '.txt' || ext === '.csv') {
      const text = buffer.toString('utf-8').trim().slice(0, MAX_CHARS);
      return { text, status: 'success' };
    }

    // ── .pptx — extraction partielle via XML brut ──────────────────────────
    if (ext === '.pptx') {
      // On extrait les balises <a:t> (runs de texte) directement du ZIP
      try {
        const JSZip = require('jszip');
        const zip = await JSZip.loadAsync(buffer);
        const slideFiles = Object.keys(zip.files)
          .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
          .sort();
        const texts = [];
        for (const sf of slideFiles) {
          const xml = await zip.files[sf].async('string');
          const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
          const slideText = matches
            .map(m => m.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .join(' ');
          if (slideText) texts.push(slideText);
        }
        const text = texts.join('\n\n').trim().slice(0, MAX_CHARS);
        if (!text) return { text: null, status: 'skipped', error: 'PPTX : aucun texte extrait' };
        return { text, status: 'success' };
      } catch {
        return { text: null, status: 'skipped', error: 'PPTX : extraction non supportée (exporter en PDF)' };
      }
    }

    // ── format non supporté ────────────────────────────────────────────────
    return {
      text: null,
      status: 'skipped',
      error: `Format non supporté : ${ext || 'inconnu'}. Convertir en .docx, .xlsx, .pdf ou .txt.`,
    };

  } catch (e) {
    return { text: null, status: 'failed', error: e.message };
  }
}

module.exports = { parseDocument };

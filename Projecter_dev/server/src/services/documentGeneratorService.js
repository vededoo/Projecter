'use strict';
/**
 * documentGeneratorService — génération .docx via docxtemplater
 *
 * Charge le template depuis dirkey 'templates', injecte les variables,
 * sauvegarde le résultat dans dirkey 'documents'.
 *
 * Ce service n'importe JAMAIS fs directement — tout passe par localFileManager.
 */

const Docxtemplater = require('docxtemplater');
const PizZip        = require('pizzip');
const fileManager   = require('../utils/localFileManager');
const logger        = require('../utils/logger');

const MODULE = 'documentGeneratorService';

/**
 * Génère un document .docx à partir d'un template et de variables.
 *
 * @param {string}  templateFilePath  - filename dans dirkey 'templates' (ex: 'O10C_ExposéDeProjet.docx')
 * @param {Object}  variables         - map des variables à injecter { project_title: 'Mon projet', ... }
 * @param {string}  outputFilename    - filename pour le résultat dans dirkey 'documents' (ex: '1746700000000.docx')
 * @returns {Promise<string>}         - chemin absolu du fichier généré
 */
async function generate(templateFilePath, variables, outputFilename) {
  const templateFullPath = fileManager.resolvePath('templates', templateFilePath);
  const outputFullPath   = fileManager.resolvePath('documents', outputFilename);

  // Lecture du template
  const templateBuffer = await fileManager.readFileBinary(templateFullPath);

  // Chargement dans PizZip + injection des variables
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
    nullGetter:    () => '',  // Variables manquantes → chaîne vide
  });

  doc.render(variables);

  // Export en buffer
  const outputBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  // Sauvegarde
  await fileManager.writeFile(outputFullPath, outputBuffer, null);

  logger.info(`✅ [${MODULE}] Document généré : ${outputFilename}`);
  return outputFullPath;
}

module.exports = { generate };

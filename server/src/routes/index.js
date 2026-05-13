'use strict';
const router  = require('express').Router();
const multer  = require('multer');
const projects = require('../controllers/projectsController');
const contacts = require('../controllers/contactsController');
const risks    = require('../controllers/risksController');
const members  = require('../controllers/projectMembersController');
const documents = require('../controllers/documentsController');
const meetings  = require('../controllers/meetingsController');
const sources   = require('../controllers/sourcesController');
const transformer    = require('../controllers/transformerController');
const docTemplates   = require('../controllers/documentTemplatesController');
const transcription  = require('../controllers/transcriptionController');
const diarization    = require('../controllers/diarizationController');

// Multer en mémoire — 20 Mo max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-excel',          // .xls
      'application/msword',                // .doc (fallback)
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/octet-stream',          // fallback générique
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(docx|xlsx|xls|pdf|txt|csv|pptx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Format non supporté : ${file.mimetype}`));
    }
  },
});

router.get('/health', (_req, res) => res.json({
  data: { type: 'health', attributes: { status: 'ok', ts: new Date().toISOString() } }
}));

// Projects
router.get('/projects', projects.list);
router.get('/projects/:id', projects.get);
router.post('/projects', projects.create);
router.patch('/projects/:id', projects.update);

// Contacts & competency centers
router.get('/contacts', contacts.list);
router.get('/contacts/facets', contacts.facets);
router.get('/contacts/:id', contacts.get);
router.post('/contacts', contacts.create);
router.patch('/contacts/:id', contacts.update);
router.delete('/contacts/:id', contacts.remove);
router.get('/competency-centers', contacts.tree);

// Risks
router.get('/risks', risks.list);
router.get('/risks/:id', risks.get);
router.post('/risks', risks.create);
router.patch('/risks/:id', risks.update);
router.delete('/risks/:id', risks.remove);
router.post('/risks/:id/projects/:projectId', risks.linkProject);
router.delete('/risks/:id/projects/:projectId', risks.unlinkProject);

// Project members
router.get('/project-members', members.list);
router.post('/project-members', members.create);
router.patch('/project-members/:id', members.update);
router.delete('/project-members/:id', members.remove);

// Documents
router.get('/documents', documents.list);
router.get('/documents/:id', documents.get);
router.get('/documents/:id/file', documents.serveFile);
router.post('/documents/generate', documents.generate);
router.post('/documents', documents.create);
router.patch('/documents/:id', documents.update);
router.delete('/documents/:id', documents.remove);

// Meetings
router.get('/meetings', meetings.list);
router.get('/meetings/:id', meetings.get);
router.post('/meetings', meetings.create);
router.patch('/meetings/:id', meetings.update);
router.delete('/meetings/:id', meetings.remove);
router.post('/meetings/:id/attendees', meetings.addAttendee);
router.delete('/meetings/:id/attendees/:contactId', meetings.removeAttendee);
// Transformer integration (affichage transcript existant dans Transformer)
router.post('/meetings/:id/inject-transcript', transformer.injectTranscript);
router.post('/meetings/:id/transcript-webhook', transformer.receiveTranscript);
router.get('/transformer/texts/:id', transformer.getText);
// Transcription directe via Transcripter (upload audio → Whisper + diarization)
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },  // 500 Mo max pour les enregistrements longs
  fileFilter: (_req, file, cb) => {
    const ok = /\.(mp3|mp4|m4a|wav|ogg|webm|flac)$/i.test(file.originalname)
      || /^audio\//i.test(file.mimetype)
      || file.mimetype === 'video/mp4';
    ok ? cb(null, true) : cb(new Error(`Format audio non supporté : ${file.mimetype}`));
  },
});
router.post('/meetings/:id/upload-audio',           uploadAudio.single('audio'), transcription.uploadAudio);
router.post('/meetings/:id/start-transcription',    transcription.startTranscription);
router.get('/meetings/:id/transcription-progress',  transcription.transcriptionProgress);
router.get('/meetings/:id/transcription-status',    transcription.transcriptionStatus);
router.get('/meetings/:id/audio',                   transcription.streamAudio);
// Speaker diarization (voice-id P3)
router.get('/meetings/:id/speakers',                diarization.list);
router.post('/meetings/:id/speakers/sync',          diarization.sync);
router.post('/meetings/:id/speakers/identify',      diarization.identify);
router.patch('/meetings/:id/speakers/:label',       diarization.update);
router.delete('/meetings/:id/speakers',             diarization.reset);

// Sources (documents de référence — N-to-N projets)
router.get('/sources', sources.list);
router.post('/sources/upload', upload.single('file'), sources.upload);
router.get('/sources/:id/content', sources.getContent);
router.get('/sources/:id/file', sources.serveFile);
router.patch('/sources/:id', sources.update);
router.delete('/sources/:id', sources.remove);
router.post('/sources/:id/projects/:projectId', sources.linkProject);
router.delete('/sources/:id/projects/:projectId', sources.unlinkProject);

// Document templates
router.get('/document-templates', docTemplates.list);
router.post('/document-templates/upload', upload.single('file'), docTemplates.upload);
router.post('/document-templates', docTemplates.create);
router.patch('/document-templates/:id', docTemplates.update);
router.delete('/document-templates/:id', docTemplates.remove);

module.exports = router;

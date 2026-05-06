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

// Project members
router.get('/project-members', members.list);
router.post('/project-members', members.create);
router.patch('/project-members/:id', members.update);
router.delete('/project-members/:id', members.remove);

// Documents
router.get('/documents', documents.list);
router.get('/documents/:id', documents.get);
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

// Project sources
router.get('/projects/:projectId/sources', sources.list);
router.post('/projects/:projectId/sources/upload', upload.single('file'), sources.upload);
router.get('/project-sources/:id/content', sources.getContent);
router.patch('/project-sources/:id', sources.update);
router.delete('/project-sources/:id', sources.remove);

module.exports = router;

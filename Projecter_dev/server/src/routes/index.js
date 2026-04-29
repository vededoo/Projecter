'use strict';
const router = require('express').Router();
const projects = require('../controllers/projectsController');
const contacts = require('../controllers/contactsController');
const risks = require('../controllers/risksController');
const members = require('../controllers/projectMembersController');
const documents = require('../controllers/documentsController');
const meetings = require('../controllers/meetingsController');

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

module.exports = router;

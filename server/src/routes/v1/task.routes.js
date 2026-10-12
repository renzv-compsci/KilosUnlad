const router = require('express').Router();
const multer = require('multer'); // Required for parsing multipart/form-data (images)
const { createDispatch, createSubmit } = require('../controllers/task.controller');

// Configure multer to store files in memory so we can hash the buffer directly
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

// --- Existing Routes ---

// GET /assigned (Currently using mock data. Replace with real controller if available)
const assignedTasks = require('../../mocks/field-task-download.json');
router.get('/assigned', (req, res) => res.status(200).json(assignedTasks));

// POST /dispatch (Live per Turnover 1.1. Ensure taskDispatcher is passed if your controller requires it)
// const taskDispatcher = require('../services/taskDispatcher.service');
// router.post('/dispatch', createDispatch(taskDispatcher));


// --- NEW INT-02 Route ---

// POST /:id/submit
// The upload.array() middleware parses the 'evidence_files' field from the FormData 
// and attaches the buffers to req.files, which createSubmit() uses for hash verification.
router.post('/:id/submit', upload.array('evidence_files', 10), createSubmit());

module.exports = router;
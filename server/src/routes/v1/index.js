const { Router } = require('express');
const multer = require('multer'); // Added for multipart form data parsing
const { createAuthService } = require('../../services/auth.service');
const { createLogin } = require('../../controllers/auth.controller');
const { createAuthenticate } = require('../../middleware/auth.middleware');
const { allowRoles, scopeJurisdiction } = require('../../middleware/rbac.middleware');
const R = require('../../constants/roles');
const { createReadFeeds } = require('../../services/readFeeds.service');
const { createTaskDispatcher } = require('../../services/taskDispatcher.service');
const { createDispatch, createSubmit } = require('../../controllers/task.controller');
const { createVerifyChain } = require('../../controllers/audit.controller');
const { createFileAppeal } = require('../../controllers/appeals.controller'); // Added for INT-03

// Configure multer for in-memory file buffering (required for SHA-256 hash verification)
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

module.exports = function createRouter({ mockMode, production, authService = createAuthService(),
  taskDispatcher = createTaskDispatcher(), readFeeds = createReadFeeds(), chainVerifier }) {
  
  const router = Router();
  
  if (mockMode) {
    if (production) throw new Error('Phase 1 mock mode is forbidden in production.');
    router.use((req, res, next) => { res.set('X-KilosUnlad-Mock', 'true'); next(); });
    router.use('/auth', require('./auth.routes'));
    router.use('/beneficiaries', require('./beneficiary.routes'));
    router.use('/tasks', require('./task.routes'));
    return router;
  }

  // --- LIVE ROUTES ---

  router.post('/auth/login', createLogin(authService));

  const authenticate = createAuthenticate({ secret: authService.secret, findCurrentUser: authService.findCurrentUser });

  // Audit Verification
  router.get('/audit/verify-chain', authenticate, allowRoles(R.COA_AUDITOR, R.SUPER_ADMIN),
    createVerifyChain(chainVerifier));

  // Task Dispatch (Admin/Director only)
  router.post('/tasks/dispatch', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, createDispatch(taskDispatcher));

  // Task Submission (Case Worker only, with multipart upload)
  router.post('/tasks/:id/submit', authenticate, allowRoles(R.CASE_WORKER), 
    upload.array('evidence_files', 10), createSubmit());

  // Appeals Docket (Director/Admin only) - INT-03
  router.post('/appeals/docket', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, createFileAppeal());

  // Feed Helpers
  const feed = operation => async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await operation(req)); } catch (error) { next(error); }
  };

  // Triage Queue
  router.get('/beneficiaries/triage-queue', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction,
    feed(req => readFeeds.triage(req.query, req.jurisdictionFilter)));

  // Assigned Tasks
  router.get('/tasks/assigned', authenticate, allowRoles(R.CASE_WORKER), scopeJurisdiction,
    feed(req => readFeeds.assigned(req.query, req.jurisdictionFilter, req.user.userId)));

  return router;
};
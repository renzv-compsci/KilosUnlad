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
const { createTaskSubmission } = require('../../services/taskSubmission.service');
const { createVerifyChain } = require('../../controllers/audit.controller');
const validateBody = require('../../middleware/validation.middleware');
const { createAppealDocket, docketSchema } = require('../../services/appealDocket.service');
const { createFileAppeal } = require('../../controllers/appeal.controller');
const { createCalamityToggle, toggleSchema } = require('../../services/calamityToggle.service');
const { createToggleCalamity } = require('../../controllers/calamity.controller');
const { createRiskAssessment, assessSchema } = require('../../services/riskAssessment.service');
const { createAssess, createExplain } = require('../../controllers/beneficiary.controller');

// Configure multer for in-memory file buffering (required for SHA-256 hash verification)
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

module.exports = function createRouter({ mockMode, production, authService = createAuthService(),
  taskDispatcher = createTaskDispatcher(), readFeeds = createReadFeeds(), chainVerifier,
  appealDocket = createAppealDocket(), calamityToggle = createCalamityToggle(),
  taskSubmission = createTaskSubmission(), riskAssessment = createRiskAssessment() }) {
  
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

  // NEW: Task Submission (Case Worker only, with multipart upload)
  // This wires the INT-02 integration seam to the live API surface.
  router.post('/tasks/:id/submit', authenticate, allowRoles(R.CASE_WORKER), 
    upload.array('evidence_files', 10), createSubmit(taskSubmission));

  // INT-03: Appeals Docket (Admin/Director only). Registers a formal appeal and
  // pauses the 15-day countdown; household status is unchanged (frozen enum).
  router.post('/appeals/docket', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, validateBody(docketSchema), createFileAppeal(appealDocket));

  // INT-04: Calamity Moratorium Toggle (Super Admin only; RA 10121 declarations
  // are municipality-wide and exceed a barangay-scoped director's jurisdiction).
  router.post('/calamity/toggle', authenticate, allowRoles(R.SUPER_ADMIN),
    scopeJurisdiction, validateBody(toggleSchema), createToggleCalamity(calamityToggle));

  // INT-05: Live risk assessment (Admin/Director). ML or fallback -> risk score;
  // when flagged, ACTIVE_COMPLIANT -> FLAGGED_FOR_REVIEW with MODEL_FLAG_RAISED.
  router.post('/beneficiaries/:household_id/assess', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR), scopeJurisdiction, validateBody(assessSchema),
    createAssess(riskAssessment));

  // E2E-04: Triage drawer explanation (read-only; sealed MODEL_FLAG_RAISED block).
  router.get('/beneficiaries/:household_id/assessment', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction, createExplain(riskAssessment));

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
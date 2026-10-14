const { Router } = require('express');
const multer = require('multer');

// --- Auth & Middleware ---
const { createAuthService } = require('../../services/auth.service');
const { createLogin } = require('../../controllers/auth.controller');
const { createAuthenticate } = require('../../middleware/auth.middleware');
const { allowRoles, scopeJurisdiction } = require('../../middleware/rbac.middleware');
const validateBody = require('../../middleware/validation.middleware');

// --- Roles ---
const R = require('../../constants/roles');

// --- Feeds & Tasks ---
const { createReadFeeds } = require('../../services/readFeeds.service');
const { createInsights } = require('../../services/insights.service');
const { createResolution } = require('../../services/resolution.service');
const { createTaskDispatcher } = require('../../services/taskDispatcher.service');
const { createDispatch, createSubmit } = require('../../controllers/task.controller');
const { createTaskSubmission } = require('../../services/taskSubmission.service');
const { createVerifyChain } = require('../../controllers/audit.controller');

// --- New Turnover Services (Schemas are exported directly from here) ---
const { createAppealDocket, docketSchema } = require('../../services/appealDocket.service');
const { createCalamityToggle, toggleSchema } = require('../../services/calamityToggle.service');
const { createRiskAssessment, assessSchema } = require('../../services/riskAssessment.service');

// --- New Turnover Controllers ---
const { createFileAppeal, createListDocket } = require('../../controllers/appeal.controller');
const { createToggleCalamity } = require('../../controllers/calamity.controller');
const { createAssess, createExplain } = require('../../controllers/beneficiary.controller');

// Configure multer for in-memory file buffering (required for SHA-256 hash verification)
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

module.exports = function createRouter({ mockMode, production, authService = createAuthService(),
  taskDispatcher = createTaskDispatcher(), readFeeds = createReadFeeds(), chainVerifier,
  appealDocket = createAppealDocket(), calamityToggle = createCalamityToggle(),
  taskSubmission = createTaskSubmission(), riskAssessment = createRiskAssessment(), insights = createInsights(),
  resolution = createResolution() }) {
  
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
    upload.array('evidence_files', 10), createSubmit(taskSubmission));

  // INT-03: Appeals Docket (Admin/Director only). Registers a formal appeal and
  // pauses the 15-day countdown; household status is unchanged (frozen enum).
  router.post('/appeals/docket', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, validateBody(docketSchema), createFileAppeal(appealDocket));
    
  // INT-08: Due Process read model (Admin/Director/COA; jurisdiction-scoped).
  router.get('/appeals/docket', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR),
    scopeJurisdiction, createListDocket(appealDocket));

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

  // UI live data (DECISION-010): read-only aggregates and lists, same scoping as the triage feed.
  router.get('/insights/overview', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction,
    feed(req => insights.overview(req.query, req.jurisdictionFilter, req.user)));
  router.get('/insights/map', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction,
    feed(req => insights.mapDensity(req.query, req.jurisdictionFilter)));
  router.get('/tasks', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR), scopeJurisdiction,
    feed(req => insights.tasksList(req.query, req.jurisdictionFilter)));
  router.get('/users/caseworkers', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR), scopeJurisdiction,
    feed(req => insights.caseworkers(req.query, req.user)));
  router.get('/audit/blocks', authenticate, allowRoles(R.COA_AUDITOR, R.SUPER_ADMIN),
    feed(req => insights.auditBlocks(req.query)));
  router.get('/system/policy', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction,
    feed(req => insights.policy(req.query, req.user)));

  // DECISION-011: review a submitted report, view its evidence, issue the notice, complete graduation.
  router.get('/tasks/:task_id/report', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction,
    feed(req => resolution.report(req.params.task_id, req.query, req.jurisdictionFilter)));
  router.get('/evidence/:sha256', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction, async (req, res, next) => {
      try {
        const file = await resolution.evidence(req.params.sha256, req.query, req.jurisdictionFilter);
        res.set({ 'Content-Type': file.mediaType, 'Cache-Control': 'private, no-store', 'X-Content-SHA256': file.hash,
          'X-Content-Type-Options': 'nosniff' });
        res.send(file.bytes);
      } catch (error) { next(error); }
    });
  router.post('/tasks/:task_id/resolve', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      try { res.json(await resolution.resolve(req.params.task_id, req.body, req.user.userId)); } catch (error) { next(error); }
    });
  router.post('/beneficiaries/:household_id/graduate', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      try { res.json(await resolution.graduate(req.params.household_id, req.body, req.user.userId)); } catch (error) { next(error); }
    });
  // DECISION-012: retention after a field visit, and the outcome of an appeal hearing.
  router.post('/tasks/:task_id/retain', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      try { res.json(await resolution.retain(req.params.task_id, req.body, req.user.userId)); } catch (error) { next(error); }
    });
  router.post('/appeals/:appeal_docket_id/decide', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      try { res.json(await resolution.decideAppeal(req.params.appeal_docket_id, req.body, req.user.userId)); } catch (error) { next(error); }
    });

  return router;
};
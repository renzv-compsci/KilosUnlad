const { Router } = require('express');
const { createAuthService } = require('../../services/auth.service');
const { createLogin } = require('../../controllers/auth.controller');
const { createAuthenticate } = require('../../middleware/auth.middleware');
const { allowRoles, scopeJurisdiction } = require('../../middleware/rbac.middleware');
const R = require('../../constants/roles');
const { createReadFeeds } = require('../../services/readFeeds.service');
const { createTaskDispatcher } = require('../../services/taskDispatcher.service');
const { createDispatch } = require('../../controllers/task.controller');
const { createVerifyChain } = require('../../controllers/audit.controller');

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
  router.post('/auth/login', createLogin(authService));
  // Live feeds require authentication and current-user jurisdiction.

  const authenticate = createAuthenticate({ secret: authService.secret, findCurrentUser: authService.findCurrentUser });
  // The global chain cannot be filtered by jurisdiction without breaking its links.
  router.get('/audit/verify-chain', authenticate, allowRoles(R.COA_AUDITOR, R.SUPER_ADMIN),
    createVerifyChain(chainVerifier));
  router.post('/tasks/dispatch', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, createDispatch(taskDispatcher));
  const feed = operation => async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await operation(req)); } catch (error) { next(error); }
  };
  router.get('/beneficiaries/triage-queue', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction,
    feed(req => readFeeds.triage(req.query, req.jurisdictionFilter)));
  router.get('/tasks/assigned', authenticate, allowRoles(R.CASE_WORKER), scopeJurisdiction,
    feed(req => readFeeds.assigned(req.query, req.jurisdictionFilter, req.user.userId)));
  return router;
};

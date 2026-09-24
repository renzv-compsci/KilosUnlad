const { Router } = require('express');
const { createAuthService } = require('../../services/auth.service');
const { createLogin } = require('../../controllers/auth.controller');
const { createAuthenticate } = require('../../middleware/auth.middleware');
const { allowRoles, scopeJurisdiction } = require('../../middleware/rbac.middleware');
const R = require('../../constants/roles');
const triage = require('../../mocks/admin-triage-feed.json');
const tasks = require('../../mocks/field-task-download.json');
const { createTaskDispatcher } = require('../../services/taskDispatcher.service');
const { createDispatch } = require('../../controllers/task.controller');

function within(address, user) {
  if ([R.SUPER_ADMIN, R.COA_AUDITOR].includes(user.role)) return true;
  const j = user.jurisdiction;
  return address.province === j.province && address.municipality === j.municipality &&
    j.assigned_barangays.includes(address.barangay);
}

module.exports = function createRouter({ mockMode, production, authService = createAuthService(),
  taskDispatcher = createTaskDispatcher() }) {
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
  // Until live data controllers are implemented, expose clearly marked fixtures
  // only outside production. Authentication and per-user filtering are real.
  const authenticate = createAuthenticate({ secret: authService.secret, findCurrentUser: authService.findCurrentUser });
  router.post('/tasks/dispatch', authenticate, allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR),
    scopeJurisdiction, createDispatch(taskDispatcher));
  const fixture = (req, res, next) => {
    if (production) return res.status(503).json({ error: {
      code: 'ENDPOINT_NOT_READY', message: 'The database-backed data endpoint is not implemented yet.'
    } });
    res.set('X-KilosUnlad-Mock', 'true');
    res.set('Cache-Control', 'no-store');
    return next();
  };
  router.get('/beneficiaries/triage-queue', authenticate,
    allowRoles(R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR), scopeJurisdiction, fixture,
    (req, res) => {
      const items = triage.items.filter(item => within(item.address, req.user) &&
        ['province', 'municipality', 'barangay'].every(k => !req.query[k] || req.query[k] === item.address[k]) &&
        (!req.query.status || req.query.status === item.program_status));
      // Never disclose the fixture's global counts to a geographically scoped user.
      res.json({ pagination: { total_records: items.length, current_page: 1, total_pages: items.length ? 1 : 0, limit: 10 },
        summary_metrics: { high_risk_count: items.filter(i => i.composite_risk_score >= 70).length,
          under_investigation_count: items.filter(i => i.program_status === 'UNDER_INVESTIGATION').length,
          notice_of_ineligibility_count: items.filter(i => i.program_status === 'NOTICE_OF_INELIGIBILITY').length }, items });
    });
  router.get('/tasks/assigned', authenticate, allowRoles(R.CASE_WORKER), scopeJurisdiction, fixture,
    (req, res) => {
      const items = req.user.userId === tasks.worker_id ? tasks.tasks.filter(t => within(t.address, req.user)) : [];
      res.json({ worker_id: req.user.userId, sync_timestamp: new Date().toISOString(), assigned_tasks_count: items.length, tasks: items });
    });
  return router;
};

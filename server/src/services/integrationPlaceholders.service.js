const { WorkflowError } = require('./workflowPersistence.service');

// PM-authorized handoff boundaries. These perform no writes and never return
// simulated predictions, audit receipts or verification success.
function notReady(component) {
  throw new WorkflowError(503, 'ENDPOINT_NOT_READY', `${component} integration is pending.`);
}
module.exports = {
  evaluateHousehold: async () => notReady('ML/fallback evaluation'),
  submitTask: async () => notReady('Transactional field submission'),
  applyRiskAssessment: async () => notReady('Persisted risk assessment'),
  toggleCalamity: async () => notReady('Calamity toggle'),
  verifyChain: async () => notReady('Audit chain verification')
};

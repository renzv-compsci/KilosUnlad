const { PROGRAM_STATUSES: S } = require('../constants/statuses');

// Only the lifecycle explicitly defined in Mae's roadmap is approved here.
// Calamity/resumption and retention transitions need their own agreed rules.
const nextStatus = new Map([
  [S.ACTIVE_COMPLIANT, S.FLAGGED_FOR_REVIEW],
  [S.FLAGGED_FOR_REVIEW, S.UNDER_INVESTIGATION],
  [S.UNDER_INVESTIGATION, S.NOTICE_OF_INELIGIBILITY],
  [S.NOTICE_OF_INELIGIBILITY, S.GRADUATED]
]);

class InvalidStatusTransitionError extends Error {
  constructor() {
    super('The requested beneficiary status transition is not allowed.');
    this.name = 'InvalidStatusTransitionError';
    this.code = 'INVALID_STATUS_TRANSITION';
    this.status = 400;
  }
}

function assertTransition(currentStatus, requestedStatus) {
  if (!nextStatus.has(currentStatus) || nextStatus.get(currentStatus) !== requestedStatus) {
    throw new InvalidStatusTransitionError();
  }
}

// A guard, not a database writer or authorization decision. Call with the status
// read from MongoDB, after RBAC. Callers must also enforce workflow prerequisites,
// including due process, and atomically persist the change with its audit entry.
module.exports = { assertTransition, InvalidStatusTransitionError };

const { PROGRAM_STATUSES: S } = require('../constants/statuses');

// The lifecycle in Mae's roadmap, plus the two DECISION-012 returns to
// ACTIVE_COMPLIANT: retention after a field visit and a granted appeal.
// GRADUATED is final; calamity/resumption transitions need their own agreed rules.
const nextStatuses = new Map([
  [S.ACTIVE_COMPLIANT, [S.FLAGGED_FOR_REVIEW]],
  [S.FLAGGED_FOR_REVIEW, [S.UNDER_INVESTIGATION]],
  [S.UNDER_INVESTIGATION, [S.NOTICE_OF_INELIGIBILITY, S.ACTIVE_COMPLIANT]],
  [S.NOTICE_OF_INELIGIBILITY, [S.GRADUATED, S.ACTIVE_COMPLIANT]]
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
  if (typeof currentStatus !== 'string' || !nextStatuses.has(currentStatus) ||
      !nextStatuses.get(currentStatus).includes(requestedStatus)) {
    throw new InvalidStatusTransitionError();
  }
}

// A guard, not a database writer or authorization decision. Call with the status
// read from MongoDB, after RBAC. Callers must also enforce workflow prerequisites,
// including due process, and atomically persist the change with its audit entry.
module.exports = { assertTransition, InvalidStatusTransitionError };

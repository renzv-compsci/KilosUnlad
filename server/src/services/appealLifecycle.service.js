const { PROGRAM_STATUSES: S } = require('../constants/statuses');

// Roadmap rule: notice time + 15 elapsed days. This is not a business-day or
// local-midnight calendar. Keep persistence and docket resolution out of here.
const APPEAL_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

class AppealLifecycleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppealLifecycleError';
    this.code = code;
  }
}

function timestamp(date) {
  // Trusted services supply Date objects from storage/the server clock. Do not
  // coerce request strings, nulls, numeric values, or timezone-free timestamps.
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new AppealLifecycleError('INVALID_APPEAL_TIME', 'A valid server-side date is required.');
  }
  return date.getTime();
}

function calculateAppealDeadline(noticeAt) {
  const deadline = new Date(timestamp(noticeAt) + APPEAL_WINDOW_MS);
  timestamp(deadline); // Reject Date-range overflow as well.
  return deadline;
}

// Timing prerequisite only, not permission to graduate. Call using persisted
// state after administrative approval and RBAC, inside the workflow transaction.
// No appeal-resolution/resume rule is invented: any appeal or pause blocks exit.
function assertAppealWindowElapsed({ programStatus, noticeAt, appealDeadline,
  hasAppeal, isPaused, now = new Date() } = {}) {
  if (programStatus !== S.NOTICE_OF_INELIGIBILITY) {
    throw new AppealLifecycleError('NOTICE_REQUIRED', 'Household must be under notice before graduation.');
  }
  const minimumDeadline = calculateAppealDeadline(noticeAt).getTime();
  const deadline = timestamp(appealDeadline);
  const current = timestamp(now);
  if (deadline < minimumDeadline) {
    throw new AppealLifecycleError('INVALID_APPEAL_DEADLINE', 'The appeal deadline cannot shorten the 15-day window.');
  }
  // Unknown/missing values fail closed, including after the deadline.
  if (hasAppeal !== false || isPaused !== false) {
    throw new AppealLifecycleError('APPEAL_HOLD', 'An appeal or unconfirmed hold prevents graduation.');
  }
  if (current < deadline) {
    throw new AppealLifecycleError('APPEAL_WINDOW_OPEN', 'The appeal window has not elapsed.');
  }
  return true;
}

module.exports = { calculateAppealDeadline, assertAppealWindowElapsed, AppealLifecycleError };

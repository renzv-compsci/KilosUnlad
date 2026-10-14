const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { assertTransition, InvalidStatusTransitionError } = require('../src/services/workflow.service');
const { PROGRAM_STATUSES } = require('../src/constants/statuses');
const errorHandler = require('../src/middleware/error.middleware');

test('only the documented lifecycle transitions are accepted', () => {
  // Forward path, plus the two DECISION-012 returns to ACTIVE_COMPLIANT:
  // retention after a field visit, and a granted appeal.
  const allowed = new Set(['ACTIVE_COMPLIANT>FLAGGED_FOR_REVIEW', 'FLAGGED_FOR_REVIEW>UNDER_INVESTIGATION',
    'UNDER_INVESTIGATION>NOTICE_OF_INELIGIBILITY', 'NOTICE_OF_INELIGIBILITY>GRADUATED',
    'UNDER_INVESTIGATION>ACTIVE_COMPLIANT', 'NOTICE_OF_INELIGIBILITY>ACTIVE_COMPLIANT']);
  for (const from of Object.values(PROGRAM_STATUSES)) {
    for (const to of Object.values(PROGRAM_STATUSES)) {
      if (allowed.has(`${from}>${to}`)) {
        assert.doesNotThrow(() => assertTransition(from, to));
      } else {
        assert.throws(() => assertTransition(from, to), InvalidStatusTransitionError);
      }
    }
  }
  // GRADUATED is final and FLAGGED_FOR_REVIEW cannot skip the field visit.
  assert.throws(() => assertTransition('GRADUATED', 'ACTIVE_COMPLIANT'), InvalidStatusTransitionError);
  assert.throws(() => assertTransition('FLAGGED_FOR_REVIEW', 'ACTIVE_COMPLIANT'), InvalidStatusTransitionError);
});

test('unknown, missing, and structured status inputs cannot bypass the guard', () => {
  for (const value of [undefined, null, '', 'ACTIVE', 'active_compliant', {}, [],
    { $ne: 'GRADUATED' }, '__proto__', 'constructor']) {
    assert.throws(() => assertTransition(value, 'FLAGGED_FOR_REVIEW'), InvalidStatusTransitionError);
    assert.throws(() => assertTransition('ACTIVE_COMPLIANT', value), InvalidStatusTransitionError);
  }
});

test('invalid jumps return sanitized HTTP 400 through the application error handler', async t => {
  // Test-only endpoint: no unrestricted status mutation route is added to the app.
  const app = express();
  app.post('/transition', (req, res, next) => {
    try {
      assertTransition('ACTIVE_COMPLIANT', 'GRADUATED');
      res.sendStatus(204);
    } catch (error) { next(error); }
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/transition`, { method: 'POST' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: {
    code: 'INVALID_STATUS_TRANSITION',
    message: 'The requested beneficiary status transition is not allowed.'
  } });
});

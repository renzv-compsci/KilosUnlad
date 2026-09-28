const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { assertTransition, InvalidStatusTransitionError } = require('../src/services/workflow.service');
const { PROGRAM_STATUSES } = require('../src/constants/statuses');
const errorHandler = require('../src/middleware/error.middleware');

test('only the four documented forward transitions are accepted', () => {
  const lifecycle = ['ACTIVE_COMPLIANT', 'FLAGGED_FOR_REVIEW', 'UNDER_INVESTIGATION',
    'NOTICE_OF_INELIGIBILITY', 'GRADUATED'];
  for (const from of Object.values(PROGRAM_STATUSES)) {
    for (const to of Object.values(PROGRAM_STATUSES)) {
      const index = lifecycle.indexOf(from);
      if (index >= 0 && index < lifecycle.length - 1 && to === lifecycle[index + 1]) {
        assert.doesNotThrow(() => assertTransition(from, to));
      } else {
        assert.throws(() => assertTransition(from, to), InvalidStatusTransitionError);
      }
    }
  }
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

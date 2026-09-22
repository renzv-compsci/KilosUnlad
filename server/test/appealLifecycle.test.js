const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateAppealDeadline, assertAppealWindowElapsed } = require('../src/services/appealLifecycle.service');

const noticeAt = new Date('2026-09-22T12:00:00.000Z');
const appealDeadline = new Date('2026-10-07T12:00:00.000Z');
const state = { programStatus: 'NOTICE_OF_INELIGIBILITY', noticeAt, appealDeadline,
  hasAppeal: false, isPaused: false, now: appealDeadline };

test('deadline adds 15 elapsed days across month/year/leap-day boundaries without changing input', () => {
  for (const [start, expected] of [
    ['2026-09-22T12:00:00.000Z', '2026-10-07T12:00:00.000Z'],
    ['2026-12-25T23:59:59.123Z', '2027-01-09T23:59:59.123Z'],
    ['2028-02-20T00:00:00.000Z', '2028-03-06T00:00:00.000Z'],
    ['2026-03-01T08:00:00+08:00', '2026-03-16T00:00:00.000Z']
  ]) {
    const original = new Date(start);
    const time = original.getTime();
    assert.equal(calculateAppealDeadline(original).toISOString(), expected);
    assert.equal(original.getTime(), time);
  }
});

test('one millisecond before expiry is blocked; exact expiry and later satisfy timing only', () => {
  assert.throws(() => assertAppealWindowElapsed({ ...state, now: new Date(appealDeadline.getTime() - 1) }), { code: 'APPEAL_WINDOW_OPEN' });
  assert.equal(assertAppealWindowElapsed(state), true);
  assert.equal(assertAppealWindowElapsed({ ...state, now: new Date(appealDeadline.getTime() + 1) }), true);
  assert.throws(() => assertAppealWindowElapsed({ ...state, now: new Date(noticeAt.getTime() - 1) }), { code: 'APPEAL_WINDOW_OPEN' });
});

test('appeals, pauses, and unknown hold information block exit even after expiry', () => {
  for (const key of ['hasAppeal', 'isPaused']) {
    for (const value of [true, undefined, null, 0, 'false', {}]) {
      assert.throws(() => assertAppealWindowElapsed({ ...state, [key]: value }), { code: 'APPEAL_HOLD' });
    }
  }
});

test('missing notice and shortened deadlines cannot bypass the window; longer deadlines are respected', () => {
  for (const programStatus of [undefined, 'ACTIVE_COMPLIANT', 'UNDER_INVESTIGATION', 'GRADUATED', 'CALAMITY_SUSPENDED']) {
    assert.throws(() => assertAppealWindowElapsed({ ...state, programStatus }), { code: 'NOTICE_REQUIRED' });
  }
  assert.throws(() => assertAppealWindowElapsed({ ...state, appealDeadline: new Date(appealDeadline.getTime() - 1) }), { code: 'INVALID_APPEAL_DEADLINE' });
  assert.throws(() => assertAppealWindowElapsed({ ...state, appealDeadline: new Date(appealDeadline.getTime() + 1) }), { code: 'APPEAL_WINDOW_OPEN' });
});

test('invalid dates, implicit date coercion and overflow fail closed', () => {
  for (const value of [undefined, null, '', '2026-09-22', 0, {}, new Date(NaN)]) {
    assert.throws(() => calculateAppealDeadline(value), { code: 'INVALID_APPEAL_TIME' });
    for (const key of ['noticeAt', 'appealDeadline', 'now']) {
      if (key === 'now' && value === undefined) continue; // Omission uses the server clock.
      assert.throws(() => assertAppealWindowElapsed({ ...state, [key]: value }), { code: 'INVALID_APPEAL_TIME' });
    }
  }
  assert.throws(() => calculateAppealDeadline(new Date(8640000000000000)), { code: 'INVALID_APPEAL_TIME' });
});

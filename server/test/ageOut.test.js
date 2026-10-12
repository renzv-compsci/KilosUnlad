const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateAgeOut, ageOnManilaDate } = require('../src/services/ageOut.service');

// 2026-10-13 00:30 in Manila is still 2026-10-12 in UTC.
const NOW = new Date('2026-10-12T16:30:00Z');
const child = (birthdate, is_eligible = true) => ({ birthdate, is_eligible });

test('age is counted on the Asia/Manila calendar date', () => {
  assert.equal(ageOnManilaDate(new Date('2007-10-13T00:00:00Z'), NOW), 19); // 19th birthday today in Manila
  assert.equal(ageOnManilaDate(new Date('2007-10-14T00:00:00Z'), NOW), 18);
  assert.equal(ageOnManilaDate(new Date('2008-02-29T00:00:00Z'), new Date('2027-02-28T00:00:00Z')), 18);
  assert.equal(ageOnManilaDate(new Date('2008-02-29T00:00:00Z'), new Date('2027-03-01T00:00:00Z')), 19);
});

test('RA 11310 Sec. 6: eligible until the 19th birthday', () => {
  const r = evaluateAgeOut([child(new Date('2005-10-13T00:00:00Z')), child(new Date('2007-10-13T00:00:00Z')),
    child(new Date('2007-10-14T00:00:00Z')), child(new Date('2026-01-01T00:00:00Z'))], NOW);
  assert.deepEqual(r.summary, { total: 4, eligible: 2, aged_out: 2, unknown: 0 });
  assert.deepEqual(r.children.map(c => c.is_eligible), [false, false, true, true]);
});

test('ISO strings from legacy inserts are accepted; invalid dates keep the stored flag as unknown', () => {
  const r = evaluateAgeOut([child('2010-05-12T00:00:00.000Z'), child('not-a-date', true), child(null, false)], NOW);
  assert.deepEqual(r.summary, { total: 3, eligible: 1, aged_out: 0, unknown: 2 });
  assert.ok(r.children[0].birthdate instanceof Date);
  assert.deepEqual(r.children.slice(1).map(c => c.is_eligible), [true, false]);
});

test('future birthdates are unknown, never eligible-by-default changes', () => {
  const r = evaluateAgeOut([child(new Date('2027-01-01T00:00:00Z'), true)], NOW);
  assert.deepEqual(r.summary, { total: 1, eligible: 0, aged_out: 0, unknown: 1 });
  assert.equal(r.children[0].is_eligible, true);
});

test('empty or missing registry', () => {
  assert.deepEqual(evaluateAgeOut(undefined, NOW).summary, { total: 0, eligible: 0, aged_out: 0, unknown: 0 });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { hasActiveCalamityMoratorium: check } = require('../src/services/calamity.service');
const start = new Date('2026-09-29T00:00:00Z');
const end = new Date('2026-09-30T00:00:00Z');
const address = { province: 'Laguna', municipality: 'Calamba' };
const zone = () => ({ ...address, declared_at: new Date(start), expires_at: new Date(end), is_active: true });
const input = () => ({ zones: [zone()], address: { ...address }, now: new Date(start) });

test('moratorium matches both province and municipality', () => {
  assert.equal(check(input()), true);
  for (const key of ['province', 'municipality']) {
    const data = input(); data.address[key] = 'Other'; assert.equal(check(data), false);
  }
  assert.equal(check({ ...input(), zones: [] }), false);
});

test('provisional interval includes declaration and excludes exact expiry', () => {
  for (const [now, expected] of [[start.getTime() - 1, false], [start.getTime(), true],
    [end.getTime() - 1, true], [end.getTime(), false], [end.getTime() + 1, false]]) {
    assert.equal(check({ ...input(), now: new Date(now) }), expected);
  }
});

test('inactive declarations and open-ended declarations retain distinct behavior', () => {
  const data = input(); data.zones[0].is_active = false;
  assert.equal(check(data), false);
  delete data.zones[0].expires_at;
  assert.equal(check(data), false);
  data.zones[0].is_active = true; data.now = new Date('2027-01-01T00:00:00Z');
  assert.equal(check(data), true);
});

test('overlapping valid zones preserve a hold regardless of ordering', () => {
  const active = zone(), inactive = { ...zone(), is_active: false };
  for (const zones of [[inactive, active], [active, inactive]]) assert.equal(check({ ...input(), zones }), true);
});

test('malformed data throws instead of returning permission to continue', () => {
  for (const mutate of [
    x => { x.zones = null; }, x => { x.address = {}; }, x => { x.now = start.toISOString(); },
    x => { x.now = new Date(NaN); }, x => { x.zones[0].is_active = 'true'; },
    x => { delete x.zones[0].declared_at; }, x => { x.zones[0].expires_at = null; },
    x => { x.zones[0].expires_at = new Date(start); },
    x => { x.zones[0].expires_at = new Date(start.getTime() - 1); },
    x => { x.zones.push({ ...zone(), province: '' }); }
  ]) { const data = input(); mutate(data); assert.throws(() => check(data), TypeError); }
});

test('checking a stored zone does not mutate it', () => {
  const data = input(), before = structuredClone(data);
  check(data); assert.deepEqual(data, before);
});

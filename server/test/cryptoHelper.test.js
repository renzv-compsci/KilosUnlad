const { test } = require('node:test');
const assert = require('node:assert/strict');
const canonicalStringify = require('../src/utils/canonicalJson');
const { sha256, computeEntryHash } = require('../src/utils/cryptoHelper');

const entry = {
  sequenceIndex: 1,
  previousEntryHash: '0'.repeat(64),
  timestamp: '2026-09-10T08:00:00.000Z',
  actorId: '60c72b2f9b1e8a001c8a1099',
  action: 'UPDATE_BENEFICIARY',
  stateDelta: { a: 1, b: 2 }
};

test('SHA-256 matches the standard known vector', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256(Buffer.from('abc')), sha256('abc'));
});

test('reordered keys produce identical canonical JSON and entry hashes', () => {
  assert.equal(canonicalStringify({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(computeEntryHash(entry), computeEntryHash({ ...entry, stateDelta: { b: 2, a: 1 } }));
  assert.equal(
    canonicalStringify({ z: [{ b: 2, a: 1 }], a: { d: 4, c: 3 } }),
    canonicalStringify({ a: { c: 3, d: 4 }, z: [{ a: 1, b: 2 }] })
  );
});

test('canonical JSON preserves falsy values and array ordering', () => {
  for (const value of [null, false, 0, '']) {
    assert.equal(canonicalStringify(value), JSON.stringify(value));
  }
  assert.notEqual(canonicalStringify([1, 2]), canonicalStringify([2, 1]));
  const hashes = [null, false, 0, '', {}].map(stateDelta => computeEntryHash({ ...entry, stateDelta }));
  assert.equal(new Set(hashes).size, hashes.length);
});

test('Date objects and equivalent ISO timestamps hash identically', () => {
  assert.equal(computeEntryHash(entry), computeEntryHash({ ...entry, timestamp: new Date(entry.timestamp) }));
  assert.equal(computeEntryHash(entry), computeEntryHash({ ...entry, timestamp: '2026-09-10T16:00:00+08:00' }));
});

test('the seal binds every field using the existing colon-separated format', () => {
  assert.equal(computeEntryHash(entry), sha256(`1:${'0'.repeat(64)}:2026-09-10T08:00:00.000Z:60c72b2f9b1e8a001c8a1099:UPDATE_BENEFICIARY:{"a":1,"b":2}`));
  const changes = {
    sequenceIndex: 2,
    previousEntryHash: '1'.repeat(64),
    timestamp: '2026-09-11T08:00:00.000Z',
    actorId: 'another-actor',
    action: 'DISPATCH_TASK',
    stateDelta: { a: 1, b: 3 }
  };
  for (const [field, value] of Object.entries(changes)) {
    assert.notEqual(computeEntryHash(entry), computeEntryHash({ ...entry, [field]: value }), field);
  }
});

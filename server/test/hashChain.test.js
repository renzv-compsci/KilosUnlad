const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createChainVerifier, parseRange } = require('../src/services/hashChain.service');
const { computeEntryHash } = require('../src/utils/cryptoHelper');
const { createApp } = require('../src/app');

function chain(count = 1000) {
  const entries = [];
  for (let i = 1; i <= count; i++) {
    const entry = { sequence_index: i, previous_entry_hash: entries.at(-1)?.entry_hash || '0'.repeat(64),
      timestamp: new Date('2026-10-02T00:00:00Z'), actor: { user_id: 'test-actor' },
      action: 'TASK_DISPATCHED', state_delta: { after: { household_id: `HH-${i}` } },
      target_entity: { collection_name: 'beneficiaries', entity_id: `HH-${i}` } };
    entry.entry_hash = computeEntryHash({ sequenceIndex: i, previousEntryHash: entry.previous_entry_hash,
      timestamp: entry.timestamp, actorId: entry.actor.user_id, action: entry.action, stateDelta: entry.state_delta });
    entries.push(entry);
  }
  return entries;
}

function fixture(entries, failure) {
  let ended = false;
  const session = { async withTransaction(fn, options) {
    assert.equal(options.readConcern.level, 'snapshot'); return fn();
  }, async endSession() { ended = true; } };
  const audits = { db: { async startSession() { return session; } }, find({ sequence_index: range }) {
    return { sort(order) { assert.deepEqual(order, { sequence_index: 1 }); return this; },
      limit(n) { assert.equal(n, 1001); return this; },
      session(value) { assert.equal(value, session); return this; }, async lean() {
        if (failure) throw failure;
        return entries.filter(e => e.sequence_index >= range.$gte && e.sequence_index <= range.$lte);
      } };
  } };
  return { service: createChainVerifier({ audits, now: () => new Date('2026-10-02T01:00:00Z') }),
    ended: () => ended };
}
const range = (start = 1, end = 1000) => ({ start_sequence: String(start), end_sequence: String(end) });

test('1000 valid blocks match the frozen response keys and partial ranges anchor to predecessor', async () => {
  const entries = chain();
  const f = fixture(entries);
  const body = await f.service.verifyChain(range());
  const contract = require('../../docs/contracts/admin-web/audit-chain-verification.json');
  assert.deepEqual(Object.keys(body).sort(), Object.keys(contract.response.data).sort());
  assert.equal(body.is_chain_valid, true); assert.equal(body.total_blocks_verified, 1000);
  assert.equal(body.head_hash, entries.at(-1).entry_hash); assert.deepEqual(body.broken_blocks, []);
  assert.equal(f.ended(), true);
  assert.equal((await f.service.verifyChain(range(451, 500))).total_blocks_verified, 50);
});

test('changed delta and recomputed broken link identify exact compromised sequence', async () => {
  const entries = chain();
  entries[450].state_delta.after.household_id = 'ALTERED';
  let body = await fixture(entries).service.verifyChain(range());
  assert.equal(body.is_chain_valid, false);
  assert.equal(body.head_hash, 'INVALID_HASH_AT_SEQUENCE_451');
  assert.deepEqual(body.broken_blocks.map(b => b.sequence_index), [451]);
  const contract = require('../../docs/contracts/admin-web/audit-chain-verification.json');
  assert.deepEqual(Object.keys(body.broken_blocks[0]).sort(),
    Object.keys(contract.error_responses[0].data.broken_blocks[0]).sort());
  const linked = chain(3);
  linked[1].previous_entry_hash = 'f'.repeat(64);
  linked[1].entry_hash = computeEntryHash({ sequenceIndex: 2, previousEntryHash: linked[1].previous_entry_hash,
    timestamp: linked[1].timestamp, actorId: linked[1].actor.user_id,
    action: linked[1].action, stateDelta: linked[1].state_delta });
  body = await fixture(linked).service.verifyChain(range(2, 2));
  assert.equal(body.is_chain_valid, false); assert.equal(body.broken_blocks[0].sequence_index, 2);
});

test('genesis, missing blocks, missing predecessor, malformed entry and storage failures fail safely', async () => {
  const entries = chain(3);
  entries[0].previous_entry_hash = 'f'.repeat(64);
  assert.equal((await fixture(entries).service.verifyChain(range(1, 3))).is_chain_valid, false);
  for (const [data, query] of [[[], range(1, 1)], [chain(2), range(1, 3)],
    [chain(3).filter(e => e.sequence_index !== 2), range(1, 3)], [chain(3).slice(1), range(2, 3)]]) {
    const f = fixture(data);
    await assert.rejects(f.service.verifyChain(query), { code: 'AUDIT_RANGE_INCOMPLETE' });
    assert.equal(f.ended(), true);
  }
  const malformed = chain(1); malformed[0].timestamp = 'invalid';
  await assert.rejects(fixture(malformed).service.verifyChain(range(1, 1)), { code: 'AUDIT_ENTRY_INVALID' });
  const failed = fixture([], new Error('private database details'));
  await assert.rejects(failed.service.verifyChain(range(1, 1)), /private database details/);
  assert.equal(failed.ended(), true);
});

test('ranges reject missing, repeated, unknown, unsafe, negative and oversized parameters', () => {
  for (const query of [{}, range(2, 1), range(1, 1001), range(0, 1), range(-1, 1),
    { ...range(), extra: 'x' }, { ...range(), start_sequence: ['1', '2'] },
    { ...range(), end_sequence: '9007199254740992' }, { ...range(), start_sequence: '1e0' }]) {
    assert.throws(() => parseRange(query), { status: 400, code: 'INVALID_QUERY' });
  }
});

test('live route enforces current role, authentication, query errors and sanitized storage failures', async t => {
  const secret = 'isolated-audit-test-secret-not-for-deployment';
  let role = 'COA_AUDITOR';
  let active = true;
  let service = fixture(chain(1)).service;
  const app = createApp({ mockMode: false, production: true,
    authService: { secret, findCurrentUser: async () => active ? { userId: 'actor', role } : null },
    chainVerifier: { verifyChain: query => service.verifyChain(query) } });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const token = jwt.sign({ userId: 'actor', role: 'COA_AUDITOR' }, secret, { expiresIn: '15m' });
  const get = (query = 'start_sequence=1&end_sequence=1', bearer = token) => fetch(
    `http://127.0.0.1:${server.address().port}/api/v1/audit/verify-chain?${query}`,
    { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
  assert.equal((await get(undefined, null)).status, 401);
  assert.equal((await get(undefined, 'bad')).status, 401);
  for (role of ['COA_AUDITOR', 'SUPER_ADMIN', 'REGIONAL_DIRECTOR', 'CASE_WORKER']) {
    const response = await get();
    assert.equal(response.status, ['COA_AUDITOR', 'SUPER_ADMIN'].includes(role) ? 200 : 403);
    if (response.status === 200) {
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).is_chain_valid, true);
    }
  }
  role = 'COA_AUDITOR'; active = false; assert.equal((await get()).status, 401); active = true;
  for (const query of ['', 'start_sequence=1&start_sequence=2&end_sequence=2',
    'start_sequence[$gt]=0&end_sequence=2', 'start_sequence=1&end_sequence=1001']) {
    assert.equal((await get(query)).status, 400);
  }
  assert.equal((await get('start_sequence=1&end_sequence=2')).status, 409);
  service = fixture([], new Error('private database details')).service;
  const failed = await get(); assert.equal(failed.status, 503);
  assert.equal(JSON.stringify(await failed.json()).includes('private'), false);
});

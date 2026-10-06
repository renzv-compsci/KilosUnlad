const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyEvidenceHash } = require('../src/services/sync.service');
const errorMiddleware = require('../src/middleware/error.middleware');
const contract = require('../../docs/contracts/field-tablet/field-task-submission.json');
// Synthetic PNG bytes; digest verification does not decode or validate images.
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
const digest = crypto.createHash('sha256').update(image).digest('hex');

test('matching raw image bytes return a normalized digest without mutation', () => {
  const before = Buffer.from(image);
  assert.equal(verifyEvidenceHash(image, digest), digest);
  assert.equal(verifyEvidenceHash(image, digest.toUpperCase()), digest);
  assert.deepEqual(image, before);
});

test('one-byte changes, truncation and a different valid hash produce contract mismatch', () => {
  const altered = Buffer.from(image); altered[20] ^= 1;
  for (const [bytes, hash] of [[altered, digest], [image.subarray(0, -1), digest], [image, '0'.repeat(64)]]) {
    assert.throws(() => verifyEvidenceHash(bytes, hash), {
      status: 422, code: 'EVIDENCE_HASH_MISMATCH', message: contract.error_responses[0].error.message
    });
  }
});

test('invalid bytes and malformed hashes fail before digest comparison', () => {
  for (const bytes of [undefined, null, '', image.toString('base64'), 'https://example.test/photo.png',
    { type: 'Buffer', data: [...image] }, new Uint8Array(image), Buffer.alloc(0)]) {
    assert.throws(() => verifyEvidenceHash(bytes, digest), { status: 400, code: 'INVALID_EVIDENCE_INPUT' });
  }
  for (const hash of [undefined, null, 123, '', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), ` ${digest}`]) {
    assert.throws(() => verifyEvidenceHash(image, hash), { status: 400, code: 'INVALID_EVIDENCE_INPUT' });
  }
});

test('raw buffer slices are hashed as bytes without encoding or backing-buffer changes', () => {
  const wrapped = Buffer.concat([Buffer.from('prefix'), image, Buffer.from('suffix')]);
  assert.equal(verifyEvidenceHash(wrapped.subarray(6, 6 + image.length), digest), digest);
});

test('existing error middleware emits the exact frozen mismatch response', () => {
  let error;
  try { verifyEvidenceHash(image, '0'.repeat(64)); } catch (caught) { error = caught; }
  let status, body;
  errorMiddleware(error, {}, {
    status(value) { status = value; return this; }, json(value) { body = value; }
  }, () => assert.fail('Mismatch should be handled'));
  assert.deepEqual({ status, ...body }, contract.error_responses[0]);
});

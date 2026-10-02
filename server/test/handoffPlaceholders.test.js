const test = require('node:test');
const assert = require('node:assert/strict');
const Joi = require('joi');
const placeholders = require('../src/services/integrationPlaceholders.service');
const { createVerifyChain } = require('../src/controllers/audit.controller');
const audit = require('../src/middleware/audit.middleware');
const validateBody = require('../src/middleware/validation.middleware');
const errors = require('../src/middleware/error.middleware');

test('all unfinished integration boundaries reject rather than report success', async () => {
  for (const operation of Object.values(placeholders)) {
    await assert.rejects(operation({}), { status: 503, code: 'ENDPOINT_NOT_READY' });
  }
});

test('audit controller forwards service failure and emits no valid-chain response', async () => {
  let forwarded, cache;
  await createVerifyChain({ verifyChain: placeholders.submitTask })({ query: { start_sequence: '1', end_sequence: '1000' } }, {
    set(key, value) { cache = [key, value]; }, json() { assert.fail('No false verification success'); }
  }, error => { forwarded = error; });
  assert.deepEqual(cache, ['Cache-Control', 'no-store']);
  assert.equal(forwarded.code, 'ENDPOINT_NOT_READY');
  let status, body;
  errors(forwarded, {}, { status(s) { status = s; return this; }, json(b) { body = b; } }, assert.fail);
  assert.equal(status, 503); assert.equal(body.error.code, 'ENDPOINT_NOT_READY');
});

test('audit placeholder blocks mutations and allows reads through', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    audit({ method }, {}, error => { assert.equal(error.status, 503); });
  }
  audit({ method: 'GET' }, {}, error => assert.equal(error, undefined));
});

test('Joi middleware retains validated body and rejects invalid input without details', () => {
  const validate = validateBody(Joi.object({ count: Joi.number().integer().required() }).required());
  const req = { body: { count: 3 } };
  validate(req, {}, error => assert.equal(error, undefined));
  assert.deepEqual(req.validatedBody, { count: 3 });
  for (const body of [undefined, { count: '3' }, { count: 3, extra: 'private' }]) {
    validate({ body }, {}, error => {
      assert.equal(error.status, 400); assert.equal(error.code, 'INVALID_REQUEST');
      assert.equal(error.message.includes('private'), false);
    });
  }
  assert.throws(() => validateBody(), TypeError);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const Joi = require('joi');
const validate = require('../src/middleware/validation.middleware');
const errors = require('../src/middleware/error.middleware');

test('HTTP error boundary sanitizes malformed requests and remains available', async t => {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.post('/validate', validate(Joi.object({ count: Joi.number().integer().required() }).required()),
    (req, res) => res.json(req.validatedBody));
  app.get('/validation', (req, res, next) => {
    const error = new mongoose.Error.ValidationError();
    error.addError('private', new mongoose.Error.ValidatorError({ message: 'private-value' }));
    next(error);
  });
  app.get('/cast', (req, res, next) => next(new mongoose.Error.CastError('ObjectId', 'private-value', '_id')));
  app.get('/async', async (req, res, next) => {
    try { await Promise.reject(new Error('private-connection-details')); } catch (error) { next(error); }
  });
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use(errors);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(base + '/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  for (const [body, status, code] of [
    ['{', 400, 'INVALID_JSON'], ['{"count":"3"}', 400, 'INVALID_REQUEST'],
    ['{"count":3,"extra":"private-value"}', 400, 'INVALID_REQUEST'],
    [JSON.stringify({ count: 3, data: 'x'.repeat(2000) }), 413, 'PAYLOAD_TOO_LARGE']
  ]) {
    const response = await post(body); assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  for (const [path, status, code] of [['/validation', 400, 'INVALID_REQUEST'],
    ['/cast', 400, 'INVALID_REQUEST'], ['/async', 503, 'SERVICE_UNAVAILABLE']]) {
    const response = await fetch(base + path); assert.equal(response.status, status);
    const body = await response.json(); assert.equal(body.error.code, code);
    assert.equal(JSON.stringify(body).includes('private'), false);
  }
  const good = await post('{"count":3}'); assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), { count: 3 });
  assert.equal((await fetch(base + '/health')).status, 200);
});

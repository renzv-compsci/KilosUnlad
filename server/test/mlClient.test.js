const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createMlClient } = require('../src/services/mlClient.service');
const contract = require('../../docs/contracts/ml/ml-swdi-inference.json');
const copy = value => JSON.parse(JSON.stringify(value));
async function serve(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return createMlClient({ baseURL: `http://127.0.0.1:${server.address().port}` });
}
test('ML request and successful response match the frozen contract', async t => {
  let received;
  const client = await serve(t, async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    received = { method: req.method, path: req.url, body: JSON.parse(body) };
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(contract.response.data));
  });
  assert.deepEqual(await client.predict(contract.request), contract.response.data);
  assert.deepEqual(received, { method: 'POST', path: contract.endpoint, body: contract.request });
});
test('invalid feature vectors are rejected before network access', async t => {
  let calls = 0;
  const client = await serve(t, (req, res) => { calls++; res.end(); });
  for (const payload of [undefined, {}, { ...contract.request, extra: true },
    ...[0, 21, 1.5, '6', null].map(household_size => ({ ...contract.request, demographics: { ...contract.request.demographics, household_size } })),
    ...Object.keys(contract.request.demographics).map(key => {
      const body = copy(contract.request); delete body.demographics[key]; return body;
    })]) await assert.rejects(() => client.predict(payload), { code: 'INVALID_FEATURE_VECTOR' });
  assert.equal(calls, 0);
});
test('malformed, wrong-household and invalid prediction responses are rejected', async t => {
  let body;
  const client = await serve(t, (req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(body); });
  const invalid = ['not json', JSON.stringify({ data: contract.response.data })];
  for (const mutate of [
    data => { data.household_id = 'different'; },
    data => { data.ml_evaluation.predicted_swdi_level = 4; },
    data => { data.ml_evaluation.class_probabilities.level_1_survival = 0.9; },
    data => { delete data.ml_evaluation.shap_explainability; },
    data => { data.ml_evaluation.shap_explainability[0].contribution_weight = '0.42'; },
    data => { data.evaluated_at = '2026-09-22'; }
  ]) { const data = copy(contract.response.data); mutate(data); invalid.push(JSON.stringify(data)); }
  for (body of invalid) await assert.rejects(() => client.predict(contract.request), { code: 'INVALID_ML_RESPONSE' });
});
test('upstream rejection, errors and redirects are sanitized without retries', async t => {
  let status = 422, calls = 0;
  const client = await serve(t, (req, res) => {
    calls++; res.writeHead(status, { Location: '/redirect' }); res.end('private upstream details');
  });
  for (status of [422, 500, 404, 302]) await assert.rejects(() => client.predict(contract.request), error => {
    assert.equal(error.code, status === 422 ? 'INVALID_FEATURE_VECTOR' : 'ML_UNAVAILABLE');
    assert.equal(error.message.includes('private'), false); return true;
  });
  assert.equal(calls, 4);
});
test('hung ML request aborts at the 2500 ms deadline', async t => {
  const client = await serve(t, () => {});
  const start = performance.now();
  await assert.rejects(() => client.predict(contract.request), { code: 'ML_TIMEOUT' });
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 2400 && elapsed < 4500, `Elapsed ${elapsed} ms`);
});
test('connection errors are sanitized and invalid service origins rejected', async t => {
  const client = await serve(t, req => { req.socket.destroy(); });
  await assert.rejects(() => client.predict(contract.request), { code: 'ML_UNAVAILABLE' });
  for (const baseURL of ['file:///tmp/service', 'http://user:secret@localhost', 'http://localhost/path', 'http://localhost?query=1']) {
    assert.throws(() => createMlClient({ baseURL }));
  }
});

test('streaming responses cannot extend the overall ML deadline', async t => {
  let streamTimer;
  t.after(() => clearInterval(streamTimer));
  const client = await serve(t, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(' ');
    streamTimer = setInterval(() => res.write(' '), 100);
    res.on('close', () => clearInterval(streamTimer));
  });
  const start = performance.now();
  await assert.rejects(() => client.predict(contract.request), { code: 'ML_TIMEOUT' });
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 2400 && elapsed < 4500, `Elapsed ${elapsed} ms`);
});

test('oversized ML responses fail safely', async t => {
  const client = await serve(t, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ private_details: 'x'.repeat(1024 * 1024) }));
  });
  await assert.rejects(() => client.predict(contract.request), error => {
    assert.equal(error.code, 'ML_UNAVAILABLE');
    assert.equal(error.message, 'ML service is temporarily unavailable.');
    assert.equal(error.response, undefined);
    assert.equal(error.config, undefined);
    return true;
  });
});

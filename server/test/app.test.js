const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
const { createApp } = require('../src/app');
const app = createApp({ mockMode: true, production: false });
let server;

before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
});
after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path, ...options }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

test('health and API discovery respond successfully', async () => {
  const health = await request('/health');
  assert.equal(health.status, 200);
  const body = JSON.parse(health.body);
  assert.equal(body.status, 'online');
  assert.equal(body.service, 'kilosunlad-server');
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  assert.equal((await request('/api/v1')).status, 200);
});

for (const fixture of ['auth/auth-session', 'admin-web/admin-triage-feed', 'field-tablet/field-task-download']) {
  const contract = require(`../../docs/contracts/${fixture}.json`);
  test(`${contract.method} ${contract.endpoint} matches the frozen response data`, async () => {
    const response = await request(contract.endpoint, {
      method: contract.method,
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: contract.request ? JSON.stringify(contract.request) : undefined
    });
    assert.equal(response.status, contract.response.status);
    assert.deepEqual(JSON.parse(response.body), contract.response.data);
    assert.equal(response.headers['x-kilosunlad-mock'], 'true');
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-powered-by'], undefined);
  });
}

test('browser login preflight allows JSON and authorization headers', async () => {
  const response = await request('/api/v1/auth/login', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization'
    }
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
  assert.match(response.headers['access-control-allow-headers'], /authorization/);
});

test('legacy unauthenticated mock mode is rejected in production', () => {
  assert.throws(() => createApp({ mockMode: true, production: true }), /forbidden/);
});

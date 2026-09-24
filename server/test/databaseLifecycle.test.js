const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const connectDB = require('../src/config/database');

test('connection observers are installed once, survive runtime errors and sanitize logs', async () => {
  const connection = new EventEmitter();
  const messages = [];
  const logger = Object.fromEntries(['log', 'warn', 'error'].map(key => [key, text => messages.push(text)]));
  connectDB.observeConnection(connection, logger);
  connectDB.observeConnection(connection, logger);
  for (const event of ['disconnected', 'reconnected', 'error']) assert.equal(connection.listenerCount(event), 1);
  connection.emit('disconnected');
  connection.emit('error', new Error('mongodb://private:secret@host'));
  connection.emit('reconnected');
  assert.equal(messages.length, 3);
  assert.ok(messages.some(m => m.includes('Reconnected')));
  assert.equal(messages.join('').includes('secret'), false);
});

test('startup rejection is sanitized and preserves documented pool settings', async () => {
  let options;
  const client = { connection: new EventEmitter(), connect: async (uri, settings) => {
    options = settings; throw Error('private credential');
  } };
  await assert.rejects(() => connectDB({ client, uri: 'test', logger: { error() {} } }),
    { message: 'Initial database connection failed.' });
  assert.deepEqual(options, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });
});

test('isolated Docker MongoDB outage preserves HTTP service and recovers queries', {
  skip: process.env.RUN_DB_RECOVERY_TESTS !== '1', timeout: 120000
}, async t => {
  const { execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const crypto = require('node:crypto');
  const mongoose = require('mongoose');
  const { createApp } = require('../src/app');
  const { createAuthService } = require('../src/services/auth.service');
  const User = require('../src/models/User');
  const docker = process.env.DOCKER_PATH || 'docker';
  const name = 'mae-reconnect-test-' + crypto.randomBytes(6).toString('hex');
  const run = args => promisify(execFile)(docker, args, { windowsHide: true, timeout: 30000 });
  const client = new mongoose.Mongoose();
  const messages = [];
  const logger = Object.fromEntries(['log', 'warn', 'error'].map(key => [key, text => messages.push(text)]));
  let server, created = false;
  t.after(async () => {
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await client.disconnect();
    if (created) await run(['rm', '-f', '-v', name]);
  });
  // Docker may reassign an ephemeral published port when restarting a container.
  // Reserve a free host port and publish it explicitly for the recovery test.
  const reservation = require('node:net').createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  await run(['run', '-d', '--name', name, '-p', `127.0.0.1:${port}:27017`, 'mongo:6.0']);
  created = true;
  const { stdout } = await run(['port', name, '27017/tcp']);
  const address = stdout.trim();
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  const uri = `mongodb://${address}/recovery_test`;
  const until = async check => {
    const deadline = Date.now() + 35000;
    while (!(await check())) {
      if (Date.now() > deadline) throw Error('Recovery condition timed out.');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  };
  await until(async () => {
    try { await connectDB({ client, uri, logger }); return true; } catch { return false; }
  });
  const users = client.model('User', User.schema);
  await users.init();
  const app = createApp({ mockMode: false, production: false,
    authService: createAuthService({ users, secret: crypto.randomBytes(32).toString('hex') }) });
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = () => fetch(base + '/api/v1/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'missing-synthetic-user', password: 'Test-only-password!' }),
    signal: AbortSignal.timeout(25000) });
  assert.equal((await login()).status, 401);
  await run(['stop', '-t', '2', name]);
  await until(async () => client.connection.readyState === 0);
  assert.equal((await fetch(base + '/health')).status, 200); // Liveness, not readiness.
  const unavailable = await login();
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error.code, 'SERVICE_UNAVAILABLE');
  await run(['start', name]);
  await until(async () => client.connection.readyState === 1);
  assert.equal((await login()).status, 401); // Database query recovered, no new connect call.
  assert.ok(messages.some(m => m.includes('Disconnected')));
  assert.ok(messages.some(m => m.includes('Reconnected successfully')));
  assert.equal(client.connection.listenerCount('reconnected'), 1);
});

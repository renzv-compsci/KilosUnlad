// Disposable single-node replica set for transactional integration tests.
// Mirrors the harness in workflowPersistence.test.js. Never points at an
// existing data path: the directory is created and removed by this helper.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { once } = require('node:events');
const mongoose = require('mongoose');

const PREFIX = 'kilosunlad-int-test-';

async function startReplicaSet(t, dbName) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), PREFIX));
  const portServer = net.createServer();
  await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
  const port = portServer.address().port;
  await new Promise(resolve => portServer.close(resolve));
  const child = spawn(process.env.MONGOD_PATH || 'mongod', [
    '--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1',
    '--replSet', 'intTest', '--logpath', path.join(directory, 'mongo.log')
  ], { windowsHide: true, stdio: 'ignore' });
  let spawnError;
  child.on('error', error => { spawnError = error; });
  let connection, client;
  t.after(async () => {
    if (connection) await connection.close();
    if (client) await client.close();
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill(); await exited;
    }
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith(PREFIX));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const uri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
  const deadline = Date.now() + 30000;
  while (true) {
    if (spawnError) throw spawnError;
    try {
      client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 500 });
      await client.connect(); break;
    } catch (error) {
      await client?.close();
      if (Date.now() > deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  await client.db('admin').command({ replSetInitiate: {
    _id: 'intTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }]
  } });
  while (!(await client.db('admin').command({ hello: 1 })).isWritablePrimary) {
    if (Date.now() > deadline) throw Error('Temporary replica set did not become primary.');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  connection = await mongoose.createConnection(uri, { dbName }).asPromise();
  const model = name => connection.model(name, require(`../../src/models/${name}`).schema);
  const models = {
    users: model('User'), beneficiaries: model('Beneficiary'), audits: model('AuditLog'),
    tasks: model('VerificationTask'), configs: model('SystemConfig'),
    externals: model('ExternalRecord')
  };
  await Promise.all(Object.values(models).map(m => m.init()));
  return { connection, models };
}

module.exports = { startReplicaSet };

const mongoose = require('mongoose');
const environment = require('./environment');

const observedConnections = new WeakSet();

function observeConnection(connection, logger = console) {
  if (observedConnections.has(connection)) return;
  observedConnections.add(connection);
  // The driver handles reconnection. Observers report lifecycle events without
  // starting overlapping connect loops or exiting on a temporary outage.
  connection.on('disconnected', () => logger.warn('>> [MongoDB] Disconnected; awaiting driver reconnection.'));
  connection.on('reconnected', () => logger.log('>> [MongoDB] Reconnected successfully.'));
  connection.on('error', () => logger.error('>> [MongoDB] Connection error; database requests may be unavailable.'));
}

const connectDB = async ({ client = mongoose, uri = environment.MONGO_URI, logger = console } = {}) => {
  observeConnection(client.connection, logger);
  try {
    const conn = await client.connect(uri, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      socketTimeoutMS: 45000,
    });

    logger.log(`>> [MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error('>> [MongoDB] Initial connection failed; server startup aborted.');
    // Entry point decides startup exit policy; never expose a URI/password.
    throw new Error('Initial database connection failed.');
  }
};

module.exports = connectDB;
module.exports.observeConnection = observeConnection;

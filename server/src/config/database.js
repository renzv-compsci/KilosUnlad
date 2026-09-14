const mongoose = require('mongoose');
const environment = require('./environment');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(environment.MONGO_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      socketTimeoutMS: 45000,
    });

    console.log(`>> [MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`>> [MongoDB] Connection error: ${error.message}`);
    // Exit process with failure code so Docker restarts the container
    process.exit(1);
  }
};

module.exports = connectDB;
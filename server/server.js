const app = require('./src/app');
const connectDB = require('./src/config/database');
const environment = require('./src/config/environment');

// 1. First, connect to MongoDB
connectDB().then(() => {
  // 2. Only start listening for requests AFTER the database connection succeeds
  const server = app.listen(environment.PORT, () => {
    console.log(`>> [KilosUnlad Server] Running in ${environment.NODE_ENV} mode on port ${environment.PORT}`);
    console.log(`>> [Health Check] Available at: http://localhost:${environment.PORT}/health`);
  });

  // Handle unexpected process termination gracefully
  process.on('unhandledRejection', (err) => {
    console.error(`>> [Fatal Error] Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
});
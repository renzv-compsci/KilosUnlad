const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const environment = require('./config/environment');
const v1Routes = require('./routes/v1');

function createApp({ mockMode = process.env.PHASE1_MOCK_MODE === 'true',
  production = environment.NODE_ENV === 'production', authService, taskDispatcher, readFeeds, chainVerifier,
  appealDocket, calamityToggle, taskSubmission, riskAssessment, insights } = {}) {
const app = express();

// 1. Security Headers & CORS Middleware
app.use(helmet());
app.use(cors({
  origin: environment.CORS_ORIGIN,
  credentials: true
}));

// 2. Request Parsing & Terminal Logging Middleware
app.use(express.json({ limit: '30mb' })); // Match Nginx 30MB upload limit
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(morgan(environment.NODE_ENV === 'development' ? 'dev' : 'combined'));

// 3. System Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'kilosunlad-server',
    environment: environment.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 4. Real authentication by default; legacy fixtures require explicit opt-in.
app.use('/api/v1', v1Routes({ mockMode, production, authService, taskDispatcher, readFeeds, chainVerifier,
  appealDocket, calamityToggle, taskSubmission, riskAssessment, insights }));

// API discovery route.
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    message: 'Welcome to KilosUnlad 4Ps Auditing API v1. All services operational.'
  });
});

app.use(require('./middleware/error.middleware'));
return app;
}

module.exports = createApp();
module.exports.createApp = createApp;

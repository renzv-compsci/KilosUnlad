const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  
  // Database Configuration
  MONGO_URI: process.env.MONGO_URI || 'mongodb://app_user:AppUserPassword2026!@db:27017/kilosunlad?authSource=kilosunlad',
  
  // Security & JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_fallback_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_token_secret_fallback',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  
  // CORS Origins (Array)
  CORS_ORIGIN: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:3000', 'http://localhost'],

  // Internal Microservices
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://ml-service:8000',
  ML_SERVICE_TIMEOUT_MS: parseInt(process.env.ML_SERVICE_TIMEOUT_MS, 10) || 2500,

  // File Upload Settings
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  ALLOWED_MIME_TYPES: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp').split(','),

  // Statutory Policies
  APPEAL_WINDOW_DAYS: parseInt(process.env.APPEAL_WINDOW_DAYS, 10) || 15
};

module.exports = environment;
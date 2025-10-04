// File: fpl-hub-backend/src/config/environment.js
// Environment configuration and validation

const path = require('path');

// Environment validation
const validateEnvironment = () => {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate database URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    console.warn('⚠️  DATABASE_URL should use file: protocol for SQLite in production');
  }

  // Validate port
  const port = parseInt(process.env.PORT) || 5000;
  if (port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
};

// Environment configuration
const config = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 5000,
  HOST: process.env.HOST || '0.0.0.0',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  
  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Security configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001'],
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  OTP_RATE_LIMIT_MAX: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs'),
  
  // Redis configuration (for production)
  REDIS_URL: process.env.REDIS_URL || null,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null,
  
  // FPL API configuration
  FPL_API_BASE_URL: process.env.FPL_API_BASE_URL || 'https://fantasy.premierleague.com/api',
  FPL_API_TIMEOUT: parseInt(process.env.FPL_API_TIMEOUT) || 10000,
  
  // SMS configuration (for OTP)
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'mock', // mock, twilio, africas_talking
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || null,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || null,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || null,
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY || null,
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME || null,
  
  // Email configuration
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'mock', // mock, sendgrid, nodemailer
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || null,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || null,
  SMTP_HOST: process.env.SMTP_HOST || null,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || null,
  SMTP_PASS: process.env.SMTP_PASS || null,
  
  // File upload configuration
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
  UPLOAD_ALLOWED_TYPES: process.env.UPLOAD_ALLOWED_TYPES 
    ? process.env.UPLOAD_ALLOWED_TYPES.split(',') 
    : ['image/jpeg', 'image/png', 'image/gif'],
  
  // Session configuration
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
  SESSION_MAX_SESSIONS: parseInt(process.env.SESSION_MAX_SESSIONS) || 5,
  
  // Maintenance mode
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
  MAINTENANCE_ALLOWED_IPS: process.env.MAINTENANCE_ALLOWED_IPS 
    ? process.env.MAINTENANCE_ALLOWED_IPS.split(',') 
    : [],
  
  // Performance monitoring
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  PERFORMANCE_SAMPLE_RATE: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE) || 0.1,
  
  // Backup configuration
  BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  
  // SSL/TLS configuration (for production)
  SSL_ENABLED: process.env.SSL_ENABLED === 'true',
  SSL_KEY_PATH: process.env.SSL_KEY_PATH || null,
  SSL_CERT_PATH: process.env.SSL_CERT_PATH || null,
  
  // API versioning
  API_VERSION: process.env.API_VERSION || 'v1',
  API_PREFIX: process.env.API_PREFIX || '/api',
  
  // Feature flags
  FEATURES: {
    OTP_VERIFICATION: process.env.FEATURE_OTP_VERIFICATION !== 'false',
    EMAIL_VERIFICATION: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
    TWO_FACTOR_AUTH: process.env.FEATURE_TWO_FACTOR_AUTH === 'true',
    LIVE_SCORING: process.env.FEATURE_LIVE_SCORING !== 'false',
    PUSH_NOTIFICATIONS: process.env.FEATURE_PUSH_NOTIFICATIONS === 'true',
    ADVANCED_ANALYTICS: process.env.FEATURE_ADVANCED_ANALYTICS === 'true'
  }
};

// Production-specific overrides
if (config.NODE_ENV === 'production') {
  // Force HTTPS in production
  config.FORCE_HTTPS = true;
  
  // Stricter rate limiting in production
  config.RATE_LIMIT_MAX_REQUESTS = Math.min(config.RATE_LIMIT_MAX_REQUESTS, 50);
  config.AUTH_RATE_LIMIT_MAX = Math.min(config.AUTH_RATE_LIMIT_MAX, 3);
  config.OTP_RATE_LIMIT_MAX = Math.min(config.OTP_RATE_LIMIT_MAX, 2);
  
  // Enable performance monitoring in production
  config.ENABLE_PERFORMANCE_MONITORING = true;
  
  // Enable backups in production
  config.BACKUP_ENABLED = true;
  
  // Stricter logging in production
  config.LOG_LEVEL = 'warn';
}

// Development-specific overrides
if (config.NODE_ENV === 'development') {
  // More permissive rate limiting in development
  config.RATE_LIMIT_MAX_REQUESTS = 1000;
  config.AUTH_RATE_LIMIT_MAX = 100;
  config.OTP_RATE_LIMIT_MAX = 100;
  
  // Detailed logging in development
  config.LOG_LEVEL = 'debug';
  
  // Disable performance monitoring in development
  config.ENABLE_PERFORMANCE_MONITORING = false;
}

// Validation
const validateConfig = () => {
  // Validate feature flags
  if (!config.FEATURES.OTP_VERIFICATION && !config.FEATURES.EMAIL_VERIFICATION) {
    throw new Error('At least one verification method must be enabled');
  }
  
  // Validate SMS configuration
  if (config.SMS_PROVIDER === 'twilio') {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio configuration incomplete');
    }
  }
  
  if (config.SMS_PROVIDER === 'africas_talking') {
    if (!config.AFRICAS_TALKING_API_KEY || !config.AFRICAS_TALKING_USERNAME) {
      throw new Error('Africa\'s Talking configuration incomplete');
    }
  }
  
  // Validate SSL configuration
  if (config.SSL_ENABLED) {
    if (!config.SSL_KEY_PATH || !config.SSL_CERT_PATH) {
      throw new Error('SSL enabled but key/cert paths not provided');
    }
  }
};

// Initialize configuration
const initializeConfig = () => {
  try {
    validateEnvironment();
    validateConfig();
    
    console.log(`✅ Environment configuration loaded for ${config.NODE_ENV}`);
    console.log(`🌍 Server will run on ${config.HOST}:${config.PORT}`);
    console.log(`🔐 JWT expires in: ${config.JWT_EXPIRES_IN}`);
    console.log(`📊 Log level: ${config.LOG_LEVEL}`);
    
    if (config.MAINTENANCE_MODE) {
      console.log('⚠️  MAINTENANCE MODE ENABLED');
    }
    
    return config;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  config,
  initializeConfig,
  validateConfig
};

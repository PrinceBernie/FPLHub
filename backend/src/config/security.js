// File: fpl-hub-backend/src/config/security.js
// Security configuration for production deployment

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const hpp = require('hpp');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message || 'Too many requests from this IP, please try again later.'
      });
    }
  });
};

// Global rate limiting
const globalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // limit each IP to 1000 requests per windowMs (increased for development)
  'Too many requests from this IP, please try again later.'
);

// Auth endpoints rate limiting (stricter)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // limit each IP to 500 requests per windowMs (increased for development)
  'Too many authentication attempts, please try again later.'
);

// OTP endpoints rate limiting (very strict)
const otpLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes (reduced from 1 hour)
  20, // limit each IP to 20 requests per windowMs (increased from 3)
  'Too many OTP requests, please try again later.'
);

// Admin endpoints rate limiting
const adminLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // limit each IP to 50 requests per windowMs
  'Too many admin requests, please try again later.'
);

// Speed limiting for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }
});

// Helmet security configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Default allowed origins including mobile access and production frontend
    const defaultOrigins = [
      'http://localhost:3000', 
      'http://localhost:3001',
      'https://phantaccihub.vercel.app',  // Production Vercel frontend
      'http://192.168.21.30:3000',  // Your local IP for mobile access
      'http://192.168.21.30:3001',  // Your local IP for mobile access
      'http://192.168.21.30:5000',  // Your local IP for mobile access
      'http://10.235.56.247:3000',  // Your hotspot IP for mobile access
      'http://10.235.56.247:3001',  // Your hotspot IP for mobile access
      'http://10.235.56.247:5000',  // Your hotspot IP for mobile access
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5000'
    ];
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : defaultOrigins;
    
    // Add any additional origins from environment
    const allOrigins = [...new Set([...defaultOrigins, ...allowedOrigins])];
    
    if (allOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS: Origin ${origin} not allowed. Allowed origins:`, allOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// HPP (HTTP Parameter Pollution) protection
const hppConfig = hpp({
  whitelist: ['filter', 'sort', 'order', 'page', 'limit'] // Allow these parameters to have multiple values
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  adminLimiter,
  speedLimiter,
  helmetConfig,
  corsOptions,
  hppConfig
};

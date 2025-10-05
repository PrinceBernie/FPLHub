const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Load environment variables first
require('dotenv').config();

// Import configurations
const { initializeConfig, config } = require('./src/config/environment');
const { 
  globalLimiter, 
  authLimiter, 
  otpLimiter, 
  adminLimiter, 
  speedLimiter, 
  helmetConfig, 
  corsOptions, 
  hppConfig 
} = require('./src/config/security');
const { 
  logger, 
  requestLogger, 
  errorLogger 
} = require('./src/config/logger');

// Initialize configuration after dotenv is loaded
initializeConfig();

const app = express();
let server;
const PORT = config.PORT;
const HOST = config.HOST;

// Import database service to initialize connection
const { prisma } = require('./src/services/databaseService');

// Import services
const socketService = require('./src/services/socketService');
// Legacy services (can be removed after migration)
// const liveScoringService = require('./src/services/liveScoringService');
const liveStandingsScheduler = require('./src/services/liveStandingsScheduler');

// Import routes
const fplRoutes = require('./src/routes/fplRoutes');
const authRoutes = require('./src/routes/authRoutes');
const leagueRoutes = require('./src/routes/leagueRoutes');
const userRoutes = require('./src/routes/userRoutes');
const rewardRoutes = require('./src/routes/rewardRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const adminRbacRoutes = require('./src/routes/adminRbacRoutes');
const adminUserRoutes = require('./src/routes/adminUserRoutes');
const adminApiRoutes = require('./src/routes/adminApiRoutes');
const automaticLeagueRoutes = require('./src/routes/automaticLeagueRoutes');
// const enhancedAdminRoutes = require('./src/routes/enhancedAdminRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
// const adminWalletRoutes = require('./src/routes/adminWalletRoutes');
// const liveScoringRoutes = require('./src/routes/liveScoringRoutes');
const leagueCreationRoutes = require('./src/routes/leagueCreationRoutes');
const userSettingsRoutes = require('./src/routes/userSettingsRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const performanceRoutes = require('./src/routes/performanceRoutes');
const gameweekLifecycleRoutes = require('./src/routes/gameweekLifecycleRoutes');

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmetConfig);

// CORS configuration
app.use(cors(corsOptions));

// HTTP Parameter Pollution protection
app.use(hppConfig);

// Global rate limiting
app.use(globalLimiter);

// Speed limiting for repeated requests
app.use(speedLimiter);

// Request logging
app.use(requestLogger);

// Body parsing with size limits
app.use(express.json({ 
  limit: config.UPLOAD_MAX_SIZE,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: config.UPLOAD_MAX_SIZE 
}));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// ============================================================================
// HEALTH CHECK ROUTES (No rate limiting)
// ============================================================================
app.use('/health', healthRoutes);

// ============================================================================
// RATE-LIMITED ROUTES
// ============================================================================

// Auth routes with strict rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// OTP routes with very strict rate limiting
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/send-otp', otpLimiter);

// Admin routes with admin rate limiting
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/admin', adminLimiter, adminApiRoutes);
app.use('/api/admin/rbac', adminLimiter, adminRbacRoutes);
app.use('/api/admin/users', adminLimiter, adminUserRoutes);
app.use('/api/admin/leagues', adminLimiter, automaticLeagueRoutes);
// app.use('/api/admin/enhanced', adminLimiter, enhancedAdminRoutes);
// app.use('/api/admin/wallet', adminLimiter, adminWalletRoutes);

// ============================================================================
// STANDARD ROUTES
// ============================================================================

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'FPL Hub API is running with Database!',
    version: '2.0.0',
    database: 'SQLite with Prisma',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API routes - uncomment one by one to test
app.use('/api/fpl', fplRoutes);    // FPL data routes
app.use('/api/leagues', leagueRoutes); // League management routes
app.use('/api/user', userRoutes);  // User-specific routes (FPL team linking, profile)
app.use('/api/user', userSettingsRoutes); // User settings routes (profile, password, notifications, theme)
app.use('/api/rewards', rewardRoutes); // Reward system routes (bonus wallet, streak tracking)
app.use('/api/wallet', walletRoutes); // Wallet management routes
// app.use('/api/live-scoring', liveScoringRoutes); // Live scoring routes
app.use('/api/league-creation', leagueCreationRoutes); // User league creation routes
app.use('/api/performance', performanceRoutes); // Performance monitoring routes
app.use('/api/gameweek-lifecycle', gameweekLifecycleRoutes); // Gameweek lifecycle management routes

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler - use a more specific pattern
app.use((req, res) => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorLogger);

app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const errorMessage = config.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({ 
    success: false,
    error: errorMessage,
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Create server based on SSL configuration
async function createServer() {
  if (config.SSL_ENABLED && config.SSL_KEY_PATH && config.SSL_CERT_PATH) {
    try {
      const privateKey = fs.readFileSync(config.SSL_KEY_PATH, 'utf8');
      const certificate = fs.readFileSync(config.SSL_CERT_PATH, 'utf8');
      const credentials = { key: privateKey, cert: certificate };
      
      server = https.createServer(credentials, app);
      logger.info('HTTPS server created with SSL certificates');
    } catch (error) {
      logger.error('Failed to load SSL certificates, falling back to HTTP', error);
      server = http.createServer(app);
    }
  } else {
    server = http.createServer(app);
  }
  
  return server;
}

// Connect to database and start server
async function startServer() {
  try {
    // Set default environment variables if not provided
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./prisma/production.db';
      logger.info('Using default DATABASE_URL:', process.env.DATABASE_URL);
    }
    
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'your-super-secret-jwt-key-that-is-at-least-32-characters-long-for-production-use';
      logger.warn('Using default JWT_SECRET - please set a secure one in production');
    }
    
    // Initialize database if needed
    try {
      logger.info('Initializing database...');
      const { execSync } = require('child_process');
      
      // Generate Prisma client
      execSync('npx prisma generate', { stdio: 'pipe' });
      logger.info('Prisma client generated');
      
      // Run database migrations
      execSync('npx prisma migrate deploy', { stdio: 'pipe' });
      logger.info('Database migrations completed');
      
    } catch (dbError) {
      logger.warn('Database initialization warning:', dbError.message);
      // Continue anyway - the database might already exist
    }
    
    // Create server
    server = await createServer();
    
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Initialize Socket.io
    socketService.initialize(server);
    logger.info('Socket.io server initialized');
    
    // Start legacy services (can be removed after migration)
    // await liveScoringService.start();
    // logger.info('Live scoring service started');
    liveStandingsScheduler.start(); // ENABLED - fallback for live standings updates
    logger.info('Legacy live standings scheduler started');
    
    // Start server
    server.listen(PORT, HOST, () => {
      const protocol = config.SSL_ENABLED ? 'https' : 'http';
      logger.info(`Server running on ${protocol}://${HOST}:${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Database: SQLite with Prisma`);
      logger.info(`Authentication: JWT enabled`);
      logger.info(`WebSocket: Socket.io enabled`);
      logger.info(`Live Scoring: Monitoring for live fixtures`);
      logger.info(`Live Standings: Auto-updating every 2 minutes during live gameweeks`);
      logger.info(`League Management: Open future gameweeks (GW1-38) approach`);
      logger.info(`Rate Limiting: Enabled`);
      logger.info(`Security: Helmet, CORS, HPP enabled`);
      
      console.log(`\n🚀 FPL Hub API Server Started Successfully!`);
      console.log(`🌍 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 URL: ${protocol}://${HOST}:${PORT}`);
      console.log(`📊 Health Check: ${protocol}://${HOST}:${PORT}/health`);
      console.log(`📝 API Documentation: ${protocol}://${HOST}:${PORT}/api`);
      console.log(`\n🔐 Test the API:`);
      console.log(`   POST ${protocol}://${HOST}:${PORT}/api/auth/register`);
      console.log(`   POST ${protocol}://${HOST}:${PORT}/api/auth/login`);
      console.log(`\n🔌 WebSocket Events:`);
      console.log(`   authenticate, join-league, live-scores-update`);
      
      // Automatic league scheduler disabled - using "open all future gameweeks" approach
      // The scheduler is no longer needed since all gameweeks (GW1-38) are created and open for entry
      /*
      try {
        const leagueScheduler = require('./src/services/leagueSchedulerService');
        leagueScheduler.start();
        console.log('🤖 Automatic League Scheduler started');
      } catch (error) {
        console.error('❌ Failed to start league scheduler:', error.message);
      }
      */
      console.log('ℹ️  Automatic League Scheduler disabled - using open future gameweeks approach');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  
  // Stop legacy services
  liveStandingsScheduler.stop();
  console.log('✅ Live standings scheduler stopped');
  
  // Disconnect from database
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  
  console.log('👋 Server shutdown complete');
  process.exit(0);
});
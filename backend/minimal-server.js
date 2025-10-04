// Minimal server with basic security setup
const express = require('express');
const http = require('http');
require('dotenv').config();

// Import configurations
const { initializeConfig, config } = require('./src/config/environment');
const { 
  globalLimiter, 
  helmetConfig, 
  corsOptions 
} = require('./src/config/security');
const { 
  logger, 
  requestLogger, 
  errorLogger 
} = require('./src/config/logger');

// Initialize configuration
initializeConfig();

const app = express();
const server = http.createServer(app);
const PORT = config.PORT;
const HOST = config.HOST;

// Basic security middleware
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(requestLogger);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Minimal FPL Hub API Server',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorLogger);
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Minimal FPL Hub API Server Started!`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 URL: http://${HOST}:${PORT}`);
  console.log(`📊 Health Check: http://${HOST}:${PORT}/health`);
});

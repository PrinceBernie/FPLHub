// File: fpl-hub-backend/src/routes/healthRoutes.js
// Health check and monitoring endpoints

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { logger, performanceLogger } = require('../config/logger');
const os = require('os');

const prisma = new PrismaClient();

// Basic health check
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  const healthData = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  try {
    // Database health check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbDuration = Date.now() - dbStart;
    healthData.checks.database = {
      status: 'healthy',
      responseTime: `${dbDuration}ms`,
      timestamp: new Date().toISOString()
    };

    // Memory usage
    const memUsage = process.memoryUsage();
    healthData.checks.memory = {
      status: 'healthy',
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    };

    // CPU usage
    const cpuUsage = process.cpuUsage();
    healthData.checks.cpu = {
      status: 'healthy',
      user: `${Math.round(cpuUsage.user / 1000)}ms`,
      system: `${Math.round(cpuUsage.system / 1000)}ms`
    };

    // System information
    healthData.checks.system = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
      loadAverage: os.loadavg(),
      uptime: `${Math.round(os.uptime() / 3600)}h`
    };

    // Overall response time
    const totalDuration = Date.now() - startTime;
    healthData.responseTime = `${totalDuration}ms`;

    // Log performance
    performanceLogger('Health Check', totalDuration, {
      database: dbDuration,
      memory: memUsage.rss,
      cpu: cpuUsage.user
    });

    res.json(healthData);
  } catch (error) {
    logger.error('Detailed health check error:', error);
    
    // Mark failed checks
    if (error.message.includes('database')) {
      healthData.checks.database = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    healthData.status = 'degraded';
    healthData.error = error.message;
    res.status(503).json(healthData);
  }
});

// Database health check
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database stats
    const userCount = await prisma.user.count();
    const leagueCount = await prisma.league.count();
    const entryCount = await prisma.leagueEntry.count();
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      status: 'healthy',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      stats: {
        users: userCount,
        leagues: leagueCount,
        entries: entryCount
      }
    });
  } catch (error) {
    logger.error('Database health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Memory health check
router.get('/memory', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;

    // Determine memory status
    let status = 'healthy';
    if (memoryUsagePercent > 90) {
      status = 'critical';
    } else if (memoryUsagePercent > 80) {
      status = 'warning';
    }

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
      memory: {
        process: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },
        system: {
          total: `${Math.round(totalMem / 1024 / 1024 / 1024)}GB`,
          free: `${Math.round(freeMem / 1024 / 1024 / 1024)}GB`,
          used: `${Math.round(usedMem / 1024 / 1024 / 1024)}GB`,
          usagePercent: Math.round(memoryUsagePercent)
        }
      }
    });
  } catch (error) {
    logger.error('Memory health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics
router.get('/performance', async (req, res) => {
  try {
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    
    // Determine CPU status based on load average
    let status = 'healthy';
    const cpuCores = os.cpus().length;
    const avgLoad = loadAverage[0]; // 1 minute average
    
    if (avgLoad > cpuCores * 2) {
      status = 'critical';
    } else if (avgLoad > cpuCores) {
      status = 'warning';
    }

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
      cpu: {
        cores: cpuCores,
        usage: {
          user: `${Math.round(cpuUsage.user / 1000)}ms`,
          system: `${Math.round(cpuUsage.system / 1000)}ms`
        },
        loadAverage: {
          '1min': Math.round(loadAverage[0] * 100) / 100,
          '5min': Math.round(loadAverage[1] * 100) / 100,
          '15min': Math.round(loadAverage[2] * 100) / 100
        }
      },
      uptime: {
        process: `${Math.round(process.uptime() / 3600)}h`,
        system: `${Math.round(os.uptime() / 3600)}h`
      }
    });
  } catch (error) {
    logger.error('Performance health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness probe failed:', error);
    res.status(503).json({
      success: false,
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', async (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;

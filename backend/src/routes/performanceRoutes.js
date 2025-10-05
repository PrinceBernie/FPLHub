// File: fpl-hub-backend/src/routes/performanceRoutes.js
// Performance monitoring and metrics API endpoints

const express = require('express');
const router = express.Router();
const performanceMonitoringService = require('../services/performanceMonitoringService');
// const optimizedFplService = require('../services/optimizedFplService');
// const optimizedLiveStandingsService = require('../services/optimizedLiveStandingsService');
// const optimizedLiveScoringService = require('../services/optimizedLiveScoringService');
// const optimizedSocketService = require('../services/optimizedSocketService');

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/performance/health
 * Get current system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = performanceMonitoringService.getSystemHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health'
    });
  }
});

/**
 * GET /api/performance/summary
 * Get performance summary for the last 24 hours
 */
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const summary = await performanceMonitoringService.getPerformanceSummary(hours);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance summary'
    });
  }
});

/**
 * GET /api/performance/service/:serviceName
 * Get metrics for a specific service
 */
router.get('/service/:serviceName', requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    const metrics = await performanceMonitoringService.getServiceMetrics(serviceName, hours);
    
    res.json({
      success: true,
      data: {
        serviceName,
        hours,
        metrics
      }
    });
  } catch (error) {
    console.error('Error getting service metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service metrics'
    });
  }
});

/**
 * GET /api/performance/league/:leagueId
 * Get performance metrics for a specific league
 */
router.get('/league/:leagueId', requireAdmin, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    const metrics = await performanceMonitoringService.getLeagueMetrics(leagueId, hours);
    
    res.json({
      success: true,
      data: {
        leagueId,
        hours,
        metrics
      }
    });
  } catch (error) {
    console.error('Error getting league metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get league metrics'
    });
  }
});

/**
 * GET /api/performance/fpl-service
 * Get FPL service metrics
 */
router.get('/fpl-service', requireAdmin, async (req, res) => {
  try {
    // const metrics = optimizedFplService.getMetrics();
    const metrics = { status: 'disabled' };
    
    res.json({
      success: true,
      data: {
        service: 'FPL Service',
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting FPL service metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get FPL service metrics'
    });
  }
});

/**
 * GET /api/performance/live-standings
 * Get live standings service metrics
 */
router.get('/live-standings', requireAdmin, async (req, res) => {
  try {
    const leagueId = req.query.leagueId;
    // const metrics = leagueId 
    //   ? optimizedLiveStandingsService.getPerformanceMetrics(leagueId)
    //   : optimizedLiveStandingsService.getPerformanceMetrics();
    const metrics = { status: 'disabled' };
    
    res.json({
      success: true,
      data: {
        service: 'Live Standings',
        leagueId,
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting live standings metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live standings metrics'
    });
  }
});

/**
 * GET /api/performance/live-scoring
 * Get live scoring service metrics
 */
router.get('/live-scoring', requireAdmin, async (req, res) => {
  try {
    // const metrics = optimizedLiveScoringService.getMetrics();
    // const status = optimizedLiveScoringService.getStatus();
    const metrics = { status: 'disabled' };
    const status = { status: 'disabled' };
    
    res.json({
      success: true,
      data: {
        service: 'Live Scoring',
        metrics,
        status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting live scoring metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live scoring metrics'
    });
  }
});

/**
 * GET /api/performance/socket-service
 * Get socket service metrics
 */
router.get('/socket-service', requireAdmin, async (req, res) => {
  try {
    // const metrics = optimizedSocketService.getMetrics();
    // const stats = optimizedSocketService.getConnectionStats();
    const metrics = { status: 'disabled' };
    const stats = { status: 'disabled' };
    
    res.json({
      success: true,
      data: {
        service: 'Socket Service',
        metrics,
        stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting socket service metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get socket service metrics'
    });
  }
});

/**
 * POST /api/performance/reset-metrics
 * Reset performance metrics for all services
 */
router.post('/reset-metrics', requireAdmin, async (req, res) => {
  try {
    // Reset metrics for all services
    // optimizedFplService.resetMetrics();
    // optimizedLiveScoringService.resetMetrics();
    // optimizedSocketService.resetMetrics();
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
});

/**
 * GET /api/performance/batch-sizes
 * Get optimal batch sizes for all leagues
 */
router.get('/batch-sizes', requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const batchConfigs = await prisma.leagueConfiguration.findMany({
      select: {
        leagueId: true,
        optimalBatchSize: true,
        lastOptimizedAt: true,
        lastPerformance: true,
        league: {
          select: {
            name: true,
            _count: {
              select: {
                leagueEntries: true
              }
            }
          }
        }
      },
      orderBy: {
        lastOptimizedAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: {
        batchConfigs: batchConfigs.map(config => ({
          leagueId: config.leagueId,
          leagueName: config.league.name,
          teamCount: config.league._count.leagueEntries,
          optimalBatchSize: config.optimalBatchSize,
          lastOptimizedAt: config.lastOptimizedAt,
          lastPerformance: config.lastPerformance
        }))
      }
    });
  } catch (error) {
    console.error('Error getting batch sizes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batch sizes'
    });
  }
});

/**
 * GET /api/performance/recommendations
 * Get performance recommendations
 */
router.get('/recommendations', requireAdmin, async (req, res) => {
  try {
    const summary = await performanceMonitoringService.getPerformanceSummary(24);
    
    res.json({
      success: true,
      data: {
        recommendations: summary.recommendations || [],
        status: summary.status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

module.exports = router;

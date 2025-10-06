// File: fpl-hub-backend/src/services/performanceMonitoringService.js
// Performance monitoring and metrics collection service

// Reuse the shared Prisma instance to avoid multiple clients and ensure
// consistent configuration (DATABASE_URL, logging, etc.) across the app.
const { prisma } = require('./databaseService');
// const optimizedFplService = require('./optimizedFplService');
// const optimizedLiveStandingsService = require('./optimizedLiveStandingsService');
// const optimizedLiveScoringService = require('./optimizedLiveScoringService');
// const optimizedSocketService = require('./optimizedSocketService');

// Small helper to detect if the PerformanceMetrics model exists on the client
function hasPerformanceMetricsModel() {
  try {
    return Boolean(prisma && prisma.performanceMetrics && typeof prisma.performanceMetrics.create === 'function');
  } catch (_) {
    return false;
  }
}

class PerformanceMonitoringService {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.metricsCollectionInterval = 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.metricsSupported = hasPerformanceMetricsModel();
    
    // Performance thresholds
    this.thresholds = {
      apiResponseTime: 5000, // 5 seconds
      batchProcessingTime: 1000, // 1 second per team
      websocketLatency: 100, // 100ms
      cacheHitRate: 80, // 80%
      errorRate: 5 // 5%
    };

    // Start monitoring only if metrics are supported; otherwise, stay disabled
    if (this.metricsSupported) {
      this.start();
    } else {
      console.warn('PerformanceMonitoringService: PerformanceMetrics model not found. Monitoring disabled.');
    }
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (!this.metricsSupported) {
      return; // no-op if model unsupported
    }
    if (this.isRunning) {
      console.log('⚠️ Performance monitoring is already running');
      return;
    }

    this.isRunning = true;
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start cleanup process
    this.startCleanupProcess();
    
    console.log('📊 Performance monitoring service started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('📊 Performance monitoring service stopped');
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    if (!this.metricsSupported) {
      return; // no-op
    }
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectAndStoreMetrics();
      } catch (error) {
        console.error('Error collecting performance metrics:', error);
      }
    }, this.metricsCollectionInterval);
  }

  /**
   * Collect and store performance metrics
   */
  async collectAndStoreMetrics() {
    if (!this.metricsSupported) {
      return; // no-op
    }
    const timestamp = new Date();
    
    try {
      // Collect metrics from all services
      const metrics = {
        // fplService: optimizedFplService.getMetrics(),
        // liveStandings: optimizedLiveStandingsService.getPerformanceMetrics(),
        // liveScoring: optimizedLiveScoringService.getMetrics(),
        // socketService: optimizedSocketService.getMetrics()
        fplService: { status: 'disabled' },
        liveStandings: { status: 'disabled' },
        liveScoring: { status: 'disabled' },
        socketService: { status: 'disabled' }
      };

      // Store metrics in database
      await this.storeMetrics('system_performance', null, metrics, timestamp);
      
      // Check for performance issues
      await this.checkPerformanceThresholds(metrics);
      
      console.log('📊 Performance metrics collected and stored');
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Store performance metrics in database
   */
  async storeMetrics(serviceName, leagueId, metricData, timestamp) {
    if (!this.metricsSupported) {
      return; // no-op
    }
    try {
      await prisma.performanceMetrics.create({
        data: {
          id: `${serviceName}-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
          serviceName,
          leagueId,
          metricType: 'system_performance',
          metricData,
          timestamp
        }
      });
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
  }

  /**
   * Check performance thresholds and alert if needed
   */
  async checkPerformanceThresholds(metrics) {
    const alerts = [];

    // Check FPL Service metrics
    if (metrics.fplService.avgResponseTime > this.thresholds.apiResponseTime) {
      alerts.push({
        service: 'FPL Service',
        metric: 'API Response Time',
        value: metrics.fplService.avgResponseTime,
        threshold: this.thresholds.apiResponseTime,
        severity: 'warning'
      });
    }

    if (metrics.fplService.cacheHitRate < this.thresholds.cacheHitRate) {
      alerts.push({
        service: 'FPL Service',
        metric: 'Cache Hit Rate',
        value: metrics.fplService.cacheHitRate,
        threshold: this.thresholds.cacheHitRate,
        severity: 'warning'
      });
    }

    // Check Live Standings metrics
    if (metrics.liveStandings.length > 0) {
      const avgPerformance = metrics.liveStandings.reduce((sum, m) => sum + (m.performancePerTeam || 0), 0) / metrics.liveStandings.length;
      
      if (avgPerformance > this.thresholds.batchProcessingTime) {
        alerts.push({
          service: 'Live Standings',
          metric: 'Batch Processing Time',
          value: avgPerformance,
          threshold: this.thresholds.batchProcessingTime,
          severity: 'critical'
        });
      }
    }

    // Check Socket Service metrics
    if (metrics.socketService.avgConnectionsPerMinute > 100) {
      alerts.push({
        service: 'Socket Service',
        metric: 'Connection Rate',
        value: metrics.socketService.avgConnectionsPerMinute,
        threshold: 100,
        severity: 'info'
      });
    }

    // Log alerts
    if (alerts.length > 0) {
      console.log('🚨 Performance alerts:', alerts);
      
      // Store alerts in database
      await this.storeAlerts(alerts);
    }
  }

  /**
   * Store performance alerts
   */
  async storeAlerts(alerts) {
    if (!this.metricsSupported) {
      return; // no-op
    }
    try {
      await prisma.performanceMetrics.create({
        data: {
          id: `alerts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          serviceName: 'performance_monitoring',
          metricType: 'performance_alerts',
          metricData: { alerts, timestamp: new Date() },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to store performance alerts:', error);
    }
  }

  /**
   * Get performance metrics for a specific service
   */
  async getServiceMetrics(serviceName, hours = 24) {
    if (!this.metricsSupported) {
      return [];
    }
    try {
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const metrics = await prisma.performanceMetrics.findMany({
        where: {
          serviceName,
          timestamp: {
            gte: since
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });

      return metrics.map(m => ({
        id: m.id,
        timestamp: m.timestamp,
        data: m.metricData
      }));
    } catch (error) {
      console.error('Failed to get service metrics:', error);
      return [];
    }
  }

  /**
   * Get league-specific performance metrics
   */
  async getLeagueMetrics(leagueId, hours = 24) {
    if (!this.metricsSupported) {
      return [];
    }
    try {
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const metrics = await prisma.performanceMetrics.findMany({
        where: {
          leagueId,
          timestamp: {
            gte: since
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return metrics.map(m => ({
        id: m.id,
        serviceName: m.serviceName,
        timestamp: m.timestamp,
        data: m.metricData
      }));
    } catch (error) {
      console.error('Failed to get league metrics:', error);
      return [];
    }
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(hours = 24) {
    if (!this.metricsSupported) {
      return {
        status: 'disabled',
        message: 'Performance metrics disabled (model not found)'
      };
    }
    try {
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      // Get recent metrics
      const recentMetrics = await prisma.performanceMetrics.findMany({
        where: {
          timestamp: {
            gte: since
          },
          metricType: 'system_performance'
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 10
      });

      if (recentMetrics.length === 0) {
        return {
          status: 'no_data',
          message: 'No performance data available'
        };
      }

      // Calculate averages
      const summary = {
        status: 'healthy',
        services: {},
        alerts: [],
        recommendations: []
      };

      // Analyze each service
      recentMetrics.forEach(metric => {
        const data = metric.metricData;
        
        if (data.fplService) {
          summary.services.fplService = {
            avgResponseTime: data.fplService.avgResponseTime,
            cacheHitRate: data.fplService.cacheHitRate,
            totalRequests: data.fplService.totalRequests,
            errors: data.fplService.errors
          };
        }

        if (data.liveStandings) {
          summary.services.liveStandings = {
            totalUpdates: data.liveStandings.length,
            avgProcessingTime: data.liveStandings.reduce((sum, m) => sum + (m.performancePerTeam || 0), 0) / data.liveStandings.length
          };
        }

        if (data.socketService) {
          summary.services.socketService = {
            activeConnections: data.socketService.activeConnections,
            totalBroadcasts: data.socketService.totalBroadcasts,
            broadcastsPerMinute: data.socketService.broadcastsPerMinute
          };
        }
      });

      // Generate recommendations
      this.generateRecommendations(summary);

      return summary;
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return {
        status: 'error',
        message: 'Failed to generate performance summary'
      };
    }
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(summary) {
    const recommendations = [];

    // FPL Service recommendations
    if (summary.services.fplService) {
      const fpl = summary.services.fplService;
      
      if (fpl.cacheHitRate < 70) {
        recommendations.push({
          service: 'FPL Service',
          issue: 'Low cache hit rate',
          recommendation: 'Consider increasing cache duration or optimizing cache keys',
          priority: 'medium'
        });
      }

      if (fpl.avgResponseTime > 3000) {
        recommendations.push({
          service: 'FPL Service',
          issue: 'High API response time',
          recommendation: 'Consider implementing request queuing or increasing concurrency limits',
          priority: 'high'
        });
      }
    }

    // Live Standings recommendations
    if (summary.services.liveStandings) {
      const standings = summary.services.liveStandings;
      
      if (standings.avgProcessingTime > 500) {
        recommendations.push({
          service: 'Live Standings',
          issue: 'Slow batch processing',
          recommendation: 'Consider reducing batch size or optimizing database queries',
          priority: 'high'
        });
      }
    }

    // Socket Service recommendations
    if (summary.services.socketService) {
      const socket = summary.services.socketService;
      
      if (socket.broadcastsPerMinute > 1000) {
        recommendations.push({
          service: 'Socket Service',
          issue: 'High broadcast frequency',
          recommendation: 'Consider implementing broadcast throttling or message batching',
          priority: 'medium'
        });
      }
    }

    summary.recommendations = recommendations;
  }

  /**
   * Start cleanup process for old metrics
   */
  startCleanupProcess() {
    setInterval(async () => {
      try {
        await this.cleanupOldMetrics();
      } catch (error) {
        console.error('Error cleaning up old metrics:', error);
      }
    }, this.cleanupInterval);
  }

  /**
   * Clean up old performance metrics
   */
  async cleanupOldMetrics() {
    try {
      const cutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      
      const deleted = await prisma.performanceMetrics.deleteMany({
        where: {
          timestamp: {
            lt: cutoff
          }
        }
      });

      if (deleted.count > 0) {
        console.log(`🧹 Cleaned up ${deleted.count} old performance metrics`);
      }
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }

  /**
   * Get current system health status
   */
  getSystemHealth() {
    return {
      isRunning: this.isRunning,
      uptime: Date.now() - (this.startTime || Date.now()),
      services: {
        // fplService: optimizedFplService.getMetrics(),
        // liveStandings: optimizedLiveStandingsService.getPerformanceMetrics(),
        // liveScoring: optimizedLiveScoringService.getMetrics(),
        // socketService: optimizedSocketService.getConnectionStats()
        fplService: { status: 'disabled' },
        liveStandings: { status: 'disabled' },
        liveScoring: { status: 'disabled' },
        socketService: { status: 'disabled' }
      }
    };
  }
}

module.exports = new PerformanceMonitoringService();

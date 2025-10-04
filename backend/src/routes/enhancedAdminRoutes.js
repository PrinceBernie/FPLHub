// File: fpl-hub-backend/src/routes/enhancedAdminRoutes.js
// Enhanced admin routes with authentication, moderation, and system administration

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { 
  adminAuthMiddleware, 
  requireAdminLevel, 
  requirePermission, 
  logAdminAction 
} = require('../middleware/adminAuth');
const SystemAdminService = require('../services/systemAdminService');
const ContentModerationService = require('../services/contentModerationService');
const LeagueService = require('../services/leagueService');
const fplService = require('../services/fplService');

const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// ============================================================================
// SYSTEM ADMINISTRATION
// ============================================================================

// Get system maintenance status
router.get('/system/maintenance', async (req, res) => {
  try {
    const status = await SystemAdminService.getMaintenanceStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get maintenance status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance status'
    });
  }
});

// Enable maintenance mode (SUPER_ADMIN only)
router.post('/system/maintenance/enable', 
  requireAdminLevel('SUPER_ADMIN'),
  logAdminAction('MAINTENANCE_ENABLED', null, 'SYSTEM', null),
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Maintenance reason is required'
        });
      }

      const maintenance = await SystemAdminService.enableMaintenanceMode(reason, req.adminId);
      
      res.json({
        success: true,
        message: 'Maintenance mode enabled successfully',
        data: maintenance
      });
    } catch (error) {
      console.error('Enable maintenance mode error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Disable maintenance mode (SUPER_ADMIN only)
router.post('/system/maintenance/disable',
  requireAdminLevel('SUPER_ADMIN'),
  logAdminAction('MAINTENANCE_DISABLED', null, 'SYSTEM', null),
  async (req, res) => {
    try {
      const maintenance = await SystemAdminService.disableMaintenanceMode(req.adminId);
      
      res.json({
        success: true,
        message: 'Maintenance mode disabled successfully',
        data: maintenance
      });
    } catch (error) {
      console.error('Disable maintenance mode error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Check system health
router.get('/system/health', async (req, res) => {
  try {
    const health = await SystemAdminService.checkSystemHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health'
    });
  }
});

// Get system health history
router.get('/system/health/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = await SystemAdminService.getSystemHealthHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get system health history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health history'
    });
  }
});

// Get system information
router.get('/system/info', async (req, res) => {
  try {
    const info = await SystemAdminService.getSystemInfo();
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system information'
    });
  }
});

// Create database backup (SUPER_ADMIN only)
router.post('/system/backup',
  requireAdminLevel('SUPER_ADMIN'),
  logAdminAction('BACKUP_CREATED', null, 'SYSTEM', null),
  async (req, res) => {
    try {
      const { backupType = 'FULL' } = req.body;
      const backup = await SystemAdminService.createDatabaseBackup(backupType);
      
      res.json({
        success: true,
        message: 'Database backup initiated successfully',
        data: backup
      });
    } catch (error) {
      console.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create database backup'
      });
    }
  }
);

// Get backup history
router.get('/system/backup/history', async (req, res) => {
  try {
    const backups = await SystemAdminService.getBackupHistory();
    
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Get backup history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup history'
    });
  }
});

// Get system logs
router.get('/system/logs', async (req, res) => {
  try {
    const { level, category, limit = 100, offset = 0 } = req.query;
    const logs = await SystemAdminService.getSystemLogs(level, category, parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system logs'
    });
  }
});

// ============================================================================
// CONTENT MODERATION
// ============================================================================

// Ban user (MODERATOR+ required)
router.post('/moderation/ban/:userId',
  requireAdminLevel('MODERATOR'),
  requirePermission('CONTENT_MODERATION'),
  logAdminAction('USER_BANNED', null, 'USER', null),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, duration, isPermanent = false } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Ban reason is required'
        });
      }

      // Convert duration to milliseconds if provided
      let durationMs = null;
      if (duration && !isPermanent) {
        durationMs = parseInt(duration) * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      }

      const result = await ContentModerationService.banUser(
        userId, 
        req.adminId, 
        reason, 
        durationMs, 
        isPermanent
      );
      
      res.json({
        success: true,
        message: 'User banned successfully',
        data: result
      });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Unban user (MODERATOR+ required)
router.post('/moderation/unban/:userId',
  requireAdminLevel('MODERATOR'),
  requirePermission('CONTENT_MODERATION'),
  logAdminAction('USER_UNBANNED', null, 'USER', null),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      const result = await ContentModerationService.unbanUser(userId, req.adminId, reason);
      
      res.json({
        success: true,
        message: 'User unbanned successfully',
        data: result
      });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get user ban status
router.get('/moderation/user/:userId/ban-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await ContentModerationService.getUserBanStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get user ban status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get banned users list
router.get('/moderation/banned-users', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const bannedUsers = await ContentModerationService.getBannedUsers(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      data: bannedUsers
    });
  } catch (error) {
    console.error('Get banned users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get banned users'
    });
  }
});

// Get user ban history
router.get('/moderation/user/:userId/ban-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await ContentModerationService.getBanHistory(userId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get ban history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ban history'
    });
  }
});

// Get moderation statistics
router.get('/moderation/statistics', async (req, res) => {
  try {
    const stats = await ContentModerationService.getModerationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get moderation stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get moderation statistics'
    });
  }
});

// ============================================================================
// ENHANCED ANALYTICS
// ============================================================================

// Get comprehensive system statistics
router.get('/analytics/system-stats', async (req, res) => {
  try {
    const stats = await SystemAdminService.getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics'
    });
  }
});

// Get performance metrics
router.get('/analytics/performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));

    // Get health check data for the period
    const healthData = await prisma.systemHealth.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Calculate performance metrics
    const metrics = {
      period: { startDate, endDate, days: parseInt(days) },
      database: {
        averageResponseTime: 0,
        uptime: 0,
        criticalIssues: 0
      },
      api: {
        averageResponseTime: 0,
        totalRequests: 0,
        errors: 0
      },
      external: {
        averageResponseTime: 0,
        availability: 0
      }
    };

    if (healthData.length > 0) {
      const dbTimes = healthData.map(h => {
        const details = h.details ? JSON.parse(h.details) : {};
        return details.databaseResponseTime || 0;
      }).filter(t => t > 0);

      const apiTimes = healthData.map(h => {
        const details = h.details ? JSON.parse(h.details) : {};
        return details.apiResponseTime || 0;
      }).filter(t => t > 0);

      const externalTimes = healthData.map(h => {
        const details = h.details ? JSON.parse(h.details) : {};
        return details.externalResponseTime || 0;
      }).filter(t => t > 0);

      metrics.database.averageResponseTime = dbTimes.length > 0 ? 
        dbTimes.reduce((a, b) => a + b, 0) / dbTimes.length : 0;
      metrics.api.averageResponseTime = apiTimes.length > 0 ? 
        apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length : 0;
      metrics.external.averageResponseTime = externalTimes.length > 0 ? 
        externalTimes.reduce((a, b) => a + b, 0) / externalTimes.length : 0;

      metrics.database.criticalIssues = healthData.filter(h => h.database === 'CRITICAL').length;
      metrics.api.errors = healthData.filter(h => h.api === 'CRITICAL').length;
      metrics.external.availability = ((healthData.length - healthData.filter(h => h.external === 'CRITICAL').length) / healthData.length) * 100;
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

// Get revenue analytics
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const endDate = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(endDate.getMonth() / 3);
        startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      }
    });

    // Calculate revenue metrics
    const revenue = {
      period: { startDate, endDate, type: period },
      totalRevenue: 0,
      platformFees: 0,
      entryFees: 0,
      prizePayouts: 0,
      withdrawals: 0,
      netRevenue: 0,
      byGameweek: {},
      byLeagueType: {}
    };

    transactions.forEach(transaction => {
      revenue.totalRevenue += transaction.amount || 0;
      
      switch (transaction.type) {
        case 'ENTRY_FEE':
          revenue.entryFees += transaction.amount || 0;
          break;
        case 'PRIZE_WINNING':
          revenue.prizePayouts += Math.abs(transaction.amount || 0);
          break;
        case 'WITHDRAWAL':
          revenue.withdrawals += Math.abs(transaction.amount || 0);
          break;
      }
    });

    // Calculate platform fees (assuming 5% of entry fees)
    revenue.platformFees = revenue.entryFees * 0.05;
    revenue.netRevenue = revenue.platformFees - revenue.prizePayouts - revenue.withdrawals;

    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue analytics'
    });
  }
});

// ============================================================================
// GAME MANAGEMENT
// ============================================================================

// Start new FPL season (SUPER_ADMIN only)
router.post('/game/season/start',
  requireAdminLevel('SUPER_ADMIN'),
  logAdminAction('SEASON_STARTED', null, 'GAME', null),
  async (req, res) => {
    try {
      const { season, startDate, description } = req.body;
      
      if (!season || !startDate) {
        return res.status(400).json({
          success: false,
          error: 'Season and start date are required'
        });
      }

      // In a real implementation, this would:
      // 1. Archive current season data
      // 2. Reset league standings
      // 3. Clear gameweek data
      // 4. Initialize new season

      const seasonData = {
        season: parseInt(season),
        startDate: new Date(startDate),
        description: description || `FPL Season ${season}`,
        status: 'ACTIVE',
        createdBy: req.adminId
      };

      // For now, just return the season data
      res.json({
        success: true,
        message: `FPL Season ${season} started successfully`,
        data: seasonData
      });
    } catch (error) {
      console.error('Start season error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start new season'
      });
    }
  }
);

// Get current gameweek info
router.get('/game/gameweek/current', async (req, res) => {
  try {
    const gameweek = await fplService.getCurrentGameweek();
    
    res.json({
      success: true,
      data: gameweek
    });
  } catch (error) {
    console.error('Get current gameweek error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current gameweek'
    });
  }
});

// ============================================================================
// EXISTING ADMIN FEATURES (Enhanced with new middleware)
// ============================================================================

// Create weekly leagues (now with admin authentication)
router.post('/leagues/create-weekly',
  requirePermission('LEAGUE_MANAGEMENT'),
  logAdminAction('WEEKLY_LEAGUES_CREATED', null, 'LEAGUE', null),
  async (req, res) => {
    try {
      const { gameweek, season, platformFeeType = 'PERCENTAGE', platformFeeValue = 5.0 } = req.body;
      
      if (!gameweek || !season) {
        return res.status(400).json({
          success: false,
          error: 'Gameweek and season are required'
        });
      }

      // Validate platform fee configuration
      if (platformFeeType === 'PERCENTAGE' && (platformFeeValue < 0 || platformFeeValue > 100)) {
        return res.status(400).json({
          success: false,
          error: 'Percentage platform fee must be between 0 and 100'
        });
      }

      if (platformFeeType === 'FIXED' && platformFeeValue < 0) {
        return res.status(400).json({
          success: false,
          error: 'Fixed platform fee must be positive'
        });
      }
      
      const leagues = await LeagueService.createWeeklyLeagues(gameweek, season, platformFeeType, platformFeeValue);
      
      res.json({
        success: true,
        message: 'Weekly leagues created successfully',
        data: leagues
      });
    } catch (error) {
      console.error('Create weekly leagues error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create weekly leagues'
      });
    }
  }
);

// Update league points
router.post('/leagues/update-points/:gameweekId',
  requirePermission('LEAGUE_MANAGEMENT'),
  logAdminAction('LEAGUE_POINTS_UPDATED', null, 'LEAGUE', null),
  async (req, res) => {
    try {
      const { gameweekId } = req.params;
      await LeagueService.updateLeaguePoints(parseInt(gameweekId));
      
      res.json({
        success: true,
        message: `League points updated for Gameweek ${gameweekId}`
      });
    } catch (error) {
      console.error('Update league points error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update league points'
      });
    }
  }
);

// Get all users (now with admin authentication)
router.get('/users',
  requirePermission('USER_MANAGEMENT'),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          linkedTeams: true,
          leagueEntries: {
            include: {
              league: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }
  }
);

// Get system statistics (enhanced)
router.get('/statistics',
  requirePermission('SYSTEM_ADMINISTRATION'),
  async (req, res) => {
    try {
      // Get counts
      const totalUsers = await prisma.user.count();
      const totalLeagues = await prisma.league.count();
      const totalLeagueEntries = await prisma.leagueEntry.count();
      const totalLinkedTeams = await prisma.linkedTeam.count();
      
      // Get active users (users with linked teams)
      const activeUsers = await prisma.user.count({
        where: {
          linkedTeams: {
            some: {}
          }
        }
      });
      
      // Get leagues by type
      const paidLeagues = await prisma.league.count({
        where: { type: 'PAID' }
      });
      
      const freeLeagues = await prisma.league.count({
        where: { type: 'FREE' }
      });
      
      // Get recent activity
      const recentUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });
      
      const recentLeagues = await prisma.league.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });
      
      // Get admin statistics
      const adminUsers = await prisma.user.count({ where: { isAdmin: true } });
      const bannedUsers = await prisma.user.count({ where: { isBanned: true } });
      
      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          adminUsers,
          bannedUsers,
          totalLeagues,
          paidLeagues,
          freeLeagues,
          totalLeagueEntries,
          totalLinkedTeams,
          recentUsers,
          recentLeagues,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get system statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system statistics'
      });
    }
  }
);

module.exports = router;

// File: fpl-hub-backend/src/routes/adminRoutes.js
// Admin routes for league management

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const LeagueService = require('../services/leagueService');
const fplService = require('../services/fplService');
const LiveStandingsService = require('../services/liveStandingsService');
const { adminAuthMiddleware, isAdmin, isSuperAdmin } = require('../middleware/adminAuth');

const prisma = new PrismaClient();

// Create weekly leagues for specified gameweek (Admin+ only)
router.post('/leagues/create-weekly', adminAuthMiddleware, isAdmin, async (req, res) => {
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
});

// Update league points for a specific gameweek
router.post('/leagues/update-points/:gameweekId', adminAuthMiddleware, isAdmin, async (req, res) => {
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
});

// Get current gameweek info
router.get('/gameweek/current', adminAuthMiddleware, isAdmin, async (req, res) => {
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

// Get all leagues for a gameweek
router.get('/leagues/gameweek/:gameweekId', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const leagues = await prisma.league.findMany({
      where: { startGameweek: parseInt(gameweekId) },
      include: {
        entries: {
          include: {
            linkedTeam: true,
            user: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: leagues
    });
  } catch (error) {
    console.error('Get gameweek leagues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gameweek leagues'
    });
  }
});

// Get all users
router.get('/users', adminAuthMiddleware, isAdmin, async (req, res) => {
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
});

// Delete user (Super Admin only)
router.delete('/users/:userId', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user exists with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        linkedTeams: true,
        leagueEntries: {
          include: {
            league: true
          }
        },
        wallet: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of other admin users (Super Admin can only delete regular users)
    if (user.adminLevel !== 'USER') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin users. Use demote functionality instead.'
      });
    }

    // Check if user has cash in their account
    if (user.wallet && user.wallet.balance > 0) {
      return res.status(403).json({
        success: false,
        error: `Cannot delete user with cash balance of ${user.wallet.balance} GHC. Please process withdrawal or transfer funds first.`
      });
    }

    // Check if user is in any leagues at all
    if (user.leagueEntries.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete user who is participating in league(s)'
      });
    }

    // Use transaction to ensure all related data is deleted
    await prisma.$transaction(async (tx) => {
      // Delete league entries first (due to foreign key constraints)
      await tx.leagueEntry.deleteMany({
        where: { userId: userId }
      });

      // Delete linked teams
      await tx.linkedTeam.deleteMany({
        where: { userId: userId }
      });

      // Delete user sessions
      await tx.session.deleteMany({
        where: { userId: userId }
      });

      // Delete wallet (if exists)
      if (user.wallet) {
        await tx.wallet.delete({
          where: { userId: userId }
        });
      }

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    console.log(`User ${userId} (${user.email}) deleted by admin ${req.userId}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user'
    });
  }
});

// Get system statistics
router.get('/statistics', adminAuthMiddleware, isAdmin, async (req, res) => {
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
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
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
});

// Get analytics data (Admin+ only)
router.get('/analytics', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user metrics
    const totalUsers = await prisma.user.count();
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });
    
    // Get previous period for growth calculation
    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousNewUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });
    
    const userGrowth = previousNewUsers > 0 ? ((newUsers - previousNewUsers) / previousNewUsers) * 100 : 0;

    // Get league metrics
    const totalLeagues = await prisma.league.count();
    const activeLeagues = await prisma.league.count({
      where: {
        status: 'ACTIVE'
      }
    });
    
    const totalEntries = await prisma.leagueEntry.count();
    const averageLeagueSize = totalLeagues > 0 ? totalEntries / totalLeagues : 0;

    // Get financial metrics
    const totalRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    const platformFees = await prisma.transaction.aggregate({
      where: {
        type: 'PLATFORM_FEE',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Get top countries (mock data for now - would need user location data)
    const topCountries = [
      { country: 'Ghana', users: Math.floor(totalUsers * 0.7), percentage: 70.0 },
      { country: 'Nigeria', users: Math.floor(totalUsers * 0.15), percentage: 15.0 },
      { country: 'Kenya', users: Math.floor(totalUsers * 0.10), percentage: 10.0 },
      { country: 'South Africa', users: Math.floor(totalUsers * 0.05), percentage: 5.0 }
    ];

    const analyticsData = {
      userMetrics: {
        totalUsers,
        activeUsers: Math.floor(totalUsers * 0.7), // Mock active users
        newUsers,
        userGrowth,
        retentionRate: 75.0, // Mock retention rate
        averageSessionDuration: 25.5, // Mock session duration
        topCountries,
        userEngagement: {
          daily: Math.floor(totalUsers * 0.25),
          weekly: Math.floor(totalUsers * 0.60),
          monthly: Math.floor(totalUsers * 0.80)
        }
      },
      leagueMetrics: {
        totalLeagues,
        activeLeagues,
        completedLeagues: totalLeagues - activeLeagues,
        averageLeagueSize,
        leagueParticipation: totalLeagues > 0 ? (totalEntries / (totalLeagues * 10)) * 100 : 0, // Assuming max 10 per league
        popularFormats: [
          { format: 'Gameweek Champions', count: Math.floor(totalLeagues * 0.6), percentage: 60.0 },
          { format: 'Free2Play', count: Math.floor(totalLeagues * 0.4), percentage: 40.0 }
        ]
      },
      financialMetrics: {
        totalRevenue: totalRevenue._sum.amount || 0,
        monthlyRevenue: totalRevenue._sum.amount || 0, // Same as total for now
        platformFees: platformFees._sum.amount || 0,
        revenueGrowth: 15.0, // Mock growth
        averageTransactionValue: 50.0, // Mock average
        paymentMethods: [
          { method: 'Mobile Money', percentage: 80.0, count: Math.floor(totalUsers * 0.8) },
          { method: 'Bank Transfer', percentage: 15.0, count: Math.floor(totalUsers * 0.15) },
          { method: 'Card', percentage: 5.0, count: Math.floor(totalUsers * 0.05) }
        ]
      },
      performanceMetrics: {
        systemUptime: 99.9,
        averageResponseTime: 150,
        errorRate: 0.1,
        activeConnections: 25,
        databasePerformance: {
          queryTime: 45,
          connectionPool: 8,
          cacheHitRate: 85.0
        }
      }
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics data'
    });
  }
});

// Get system logs (Admin+ only)
router.get('/logs', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { level, category, dateRange, limit = 100 } = req.query;
    
    // For now, return empty array since we don't have a logging system
    // In a real implementation, this would query a logging database
    const logs = [];
    
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

// Get log statistics (Admin+ only)
router.get('/logs/stats', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    // Mock log statistics since we don't have a logging system
    const stats = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      averageResponseTime: 0,
      systemHealth: {
        uptime: 99.9,
        memoryUsage: 45.2,
        cpuUsage: 12.8,
        diskUsage: 67.3,
        databaseConnections: 8
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get log statistics'
    });
  }
});

// Get system settings (Admin+ only)
router.get('/settings', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    // Mock system settings - in a real app, these would come from a settings table
    const settings = {
      general: {
        siteName: 'FPL Hub',
        siteDescription: 'Fantasy Premier League Hub',
        siteUrl: 'https://fplhub.com',
        adminEmail: 'admin@fplhub.com',
        supportEmail: 'support@fplhub.com',
        timezone: 'Africa/Accra',
        language: 'en',
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerificationRequired: true
      },
      security: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        twoFactorEnabled: false,
        ipWhitelist: [],
        rateLimitingEnabled: true
      },
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'noreply@fplhub.com',
        fromName: 'FPL Hub',
        fromEmail: 'noreply@fplhub.com',
        emailVerificationTemplate: 'default',
        passwordResetTemplate: 'default',
        notificationTemplate: 'default'
      },
      payment: {
        currency: 'GHS',
        platformFeePercentage: 5.0,
        platformFeeFixed: 0,
        minimumDeposit: 10.0,
        maximumDeposit: 1000.0,
        paymentMethods: ['mobile_money', 'bank_transfer'],
        mobileMoneyProvider: 'mtn',
        bankAccountNumber: '',
        bankAccountName: '',
        bankName: '',
        testMode: true
      },
      league: {
        defaultEntryFee: 10.0,
        maximumTeamsPerUser: 5,
        minimumLeagueSize: 2,
        maximumLeagueSize: 20,
        autoCreateLeagues: true,
        leagueCreationSchedule: 'weekly',
        pointsCalculationMethod: 'fpl_official',
        prizeDistribution: [70, 20, 10], // Winner, Runner-up, Third place percentages
        allowLateEntries: false,
        lateEntryPenalty: 0.1
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        leagueUpdates: true,
        paymentNotifications: true,
        systemAlerts: true,
        marketingEmails: false,
        notificationFrequency: 'immediate'
      },
      performance: {
        cacheEnabled: true,
        cacheTimeout: 300,
        compressionEnabled: true,
        cdnEnabled: false,
        cdnUrl: '',
        databaseOptimization: true,
        queryOptimization: true,
        imageOptimization: true,
        lazyLoading: true
      }
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system settings'
    });
  }
});

// Update system settings (Super Admin only)
router.put('/settings', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    // In a real implementation, this would save to a settings table
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system settings'
    });
  }
});

// Update live standings for a specific gameweek (Admin+ only)
router.post('/live-standings/update/:gameweekId', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweek = parseInt(gameweekId);

    if (isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gameweek. Must be between 1 and 38.'
      });
    }

    console.log(`🔄 Admin requested live standings update for Gameweek ${gameweek}`);
    
    const result = await LiveStandingsService.updateLiveStandings(gameweek);
    
    res.json({
      success: true,
      message: `Live standings updated for Gameweek ${gameweek}`,
      data: result
    });

  } catch (error) {
    console.error('Update live standings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update live standings'
    });
  }
});

// Get live standings status (Admin+ only)
router.get('/live-standings/status', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const liveGameweek = await LiveStandingsService.getCurrentLiveGameweek();
    const isLive = liveGameweek !== null;
    
    res.json({
      success: true,
      data: {
        isLive,
        liveGameweek,
        message: isLive 
          ? `Gameweek ${liveGameweek} is currently live` 
          : 'No gameweek is currently live'
      }
    });

  } catch (error) {
    console.error('Get live standings status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live standings status'
    });
  }
});

module.exports = router;

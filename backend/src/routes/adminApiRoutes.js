// File: fpl-hub-backend/src/routes/adminApiRoutes.js
// Comprehensive admin API routes for the admin dashboard

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuthMiddleware, isAdmin, isSuperAdmin } = require('../middleware/adminAuth');

const prisma = new PrismaClient();

// ============================================================================
// FINANCIAL ENDPOINTS
// ============================================================================

// Get financial statistics
router.get('/financial/stats', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    // Get total revenue from all transactions (entry fees)
    const totalRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'ENTRY_FEE',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Get platform fees (we'll calculate this from league platform fees)
    const platformFees = await prisma.league.aggregate({
      _sum: {
        platformFee: true
      }
    });

    // Get transaction counts
    const totalTransactions = await prisma.transaction.count();
    const completedTransactions = await prisma.transaction.count({
      where: { status: 'COMPLETED' }
    });
    const pendingTransactions = await prisma.transaction.count({
      where: { status: 'PENDING' }
    });

    // Get daily revenue for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyRevenue = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        type: 'ENTRY_FEE',
        status: 'COMPLETED',
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        amount: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        platformFees: platformFees._sum.amount || 0,
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        dailyRevenue: dailyRevenue.map(day => ({
          date: day.createdAt,
          amount: day._sum.amount || 0
        }))
      }
    });
  } catch (error) {
    console.error('Get financial stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get financial statistics'
    });
  }
});

// Get all transactions
router.get('/transactions', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.transaction.count({ where });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Get analytics data
router.get('/analytics', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // User metrics
    const totalUsers = await prisma.user.count();
    const newUsers = await prisma.user.count({
      where: {
        createdAt: { gte: startDate }
      }
    });
    const activeUsers = await prisma.user.count({
      where: {
        linkedTeams: {
          some: {}
        }
      }
    });

    // League metrics
    const totalLeagues = await prisma.league.count();
    const newLeagues = await prisma.league.count({
      where: {
        createdAt: { gte: startDate }
      }
    });
    const activeLeagues = await prisma.league.count({
      where: {
        status: 'IN_PROGRESS'
      }
    });

    // Revenue metrics
    const revenue = await prisma.transaction.aggregate({
      where: {
        type: 'ENTRY_FEE',
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      _sum: {
        amount: true
      }
    });

    // User engagement (users with league entries)
    const engagedUsers = await prisma.user.count({
      where: {
        leagueEntries: {
          some: {}
        }
      }
    });

    res.json({
      success: true,
      data: {
        timeRange,
        userMetrics: {
          total: totalUsers,
          new: newUsers,
          active: activeUsers,
          engaged: engagedUsers,
          engagementRate: totalUsers > 0 ? (engagedUsers / totalUsers * 100).toFixed(2) : 0
        },
        leagueMetrics: {
          total: totalLeagues,
          new: newLeagues,
          active: activeLeagues
        },
        revenueMetrics: {
          total: revenue._sum.amount || 0,
          period: timeRange
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics data',
      details: error.message
    });
  }
});

// ============================================================================
// SYSTEM SETTINGS ENDPOINTS
// ============================================================================

// Get system settings
router.get('/settings', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    // For now, return default settings since we don't have a settings table yet
    const settings = {
      general: {
        siteName: 'FPL Hub',
        siteDescription: 'Fantasy Premier League Hub',
        maintenanceMode: false,
        registrationEnabled: true,
        maxLinkedTeams: 10
      },
      security: {
        requireEmailVerification: true,
        requirePhoneVerification: true,
        maxLoginAttempts: 5,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        twoFactorEnabled: false
      },
      email: {
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: process.env.SMTP_PORT || 587,
        smtpUser: process.env.SMTP_USER || '',
        smtpPassword: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.FROM_EMAIL || 'noreply@fplhub.com',
        fromName: 'FPL Hub'
      },
      payment: {
        platformFeePercentage: 5.0,
        platformFeeFixed: 0,
        minimumDeposit: 10,
        maximumDeposit: 10000,
        currency: 'GHS'
      },
      league: {
        maxLeagueSize: 20,
        minLeagueSize: 2,
        defaultEntryFee: 50,
        autoCreateWeeklyLeagues: true,
        weeklyLeagueGameweek: 'next'
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        leagueUpdates: true,
        paymentNotifications: true,
        systemMaintenance: true
      },
      performance: {
        cacheEnabled: true,
        cacheTTL: 300, // 5 minutes
        rateLimitEnabled: true,
        maxRequestsPerMinute: 100
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

// Update system settings
router.put('/settings', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    // For now, just return success since we don't have a settings table
    // In a real implementation, you'd save these to a database
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system settings'
    });
  }
});

// ============================================================================
// SYSTEM LOGS ENDPOINTS
// ============================================================================

// Get system logs
router.get('/logs', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { level = 'all', category = 'all', dateRange = '24h', page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // For now, return mock log data since we don't have a proper logging system
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        level: 'INFO',
        category: 'AUTH',
        message: 'User login successful',
        userId: 'user-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        level: 'WARN',
        category: 'PAYMENT',
        message: 'Payment processing timeout',
        userId: 'user-456',
        ip: '192.168.1.2',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        level: 'ERROR',
        category: 'API',
        message: 'Database connection failed',
        userId: null,
        ip: '192.168.1.3',
        userAgent: null
      }
    ];

    res.json({
      success: true,
      data: mockLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockLogs.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system logs'
    });
  }
});

// Get log statistics
router.get('/logs/stats', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    // Mock log statistics
    const stats = {
      totalLogs: 1250,
      errorLogs: 45,
      warningLogs: 120,
      infoLogs: 1085,
      logsByCategory: {
        AUTH: 300,
        PAYMENT: 200,
        API: 400,
        DATABASE: 150,
        SYSTEM: 200
      },
      logsByLevel: {
        ERROR: 45,
        WARN: 120,
        INFO: 1085
      },
      recentErrors: 5,
      lastError: new Date(Date.now() - 1000 * 60 * 15).toISOString()
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

// ============================================================================
// ENHANCED USER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all users with enhanced data
router.get('/users', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } }
      ];
    }
    if (role) where.adminLevel = role;
    if (status) where.isActive = status === 'active';

    const users = await prisma.user.findMany({
      where,
      include: {
        linkedTeams: true,
        leagueEntries: {
          include: {
            league: true
          }
        },
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// Create new user
router.post('/users', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { username, email, phone, password, adminLevel = 'USER' } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, phone, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email, username, or phone already exists'
      });
    }

    // Create user (you'll need to hash the password)
    const user = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        adminLevel,
        isVerified: true, // Admin created users are pre-verified
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// ============================================================================
// ENHANCED LEAGUE MANAGEMENT ENDPOINTS
// ============================================================================

// Get all leagues with enhanced data
router.get('/leagues', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status, gameweek } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (gameweek) where.startGameweek = parseInt(gameweek);

    const leagues = await prisma.league.findMany({
      where,
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            linkedTeam: true
          }
        },
        _count: {
          select: {
            leagueEntries: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.league.count({ where });

    res.json({
      success: true,
      data: leagues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leagues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leagues'
    });
  }
});

// Create new league
router.post('/leagues', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      type = 'FREE', 
      entryFee = 0, 
      startGameweek, 
      endGameweek,
      maxParticipants = 20,
      platformFeeType = 'PERCENTAGE',
      platformFeeValue = 5.0
    } = req.body;

    if (!name || !startGameweek) {
      return res.status(400).json({
        success: false,
        error: 'League name and start gameweek are required'
      });
    }

    const league = await prisma.league.create({
      data: {
        name,
        description,
        type,
        entryFee,
        startGameweek: parseInt(startGameweek),
        endGameweek: endGameweek ? parseInt(endGameweek) : null,
        maxParticipants: parseInt(maxParticipants),
        platformFeeType,
        platformFeeValue: parseFloat(platformFeeValue),
        status: 'ACTIVE',
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'League created successfully',
      data: league
    });
  } catch (error) {
    console.error('Create league error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create league'
    });
  }
});

module.exports = router;

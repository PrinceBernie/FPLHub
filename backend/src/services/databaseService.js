// File: fpl-hub-backend/src/services/databaseService.js
// Database service layer for all database operations

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// OPTIMIZED: Prisma client with connection pooling and performance optimizations
const prisma = new PrismaClient({
  log: ['error', 'warn'], // Reduce logging overhead
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  },
  // Performance optimizations
  __internal: {
    engine: {
      // Enable connection pooling for better performance
      connectTimeout: 10000,
      queryTimeout: 30000,
    }
  }
});

// Utility function to remove sensitive fields from user objects
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const { 
    password, 
    otpCode, 
    otpExpires, 
    passwordResetToken, 
    passwordResetExpires, 
    twoFactorSecret, 
    ...safeUser 
  } = user;
  
  return safeUser;
};

class UserService {
  // Get user by ID (without sensitive fields) - OPTIMIZED: Minimal data for profile
  static async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        fplTeamId: true,
        isVerified: true,
        isActive: true,
        consentGiven: true,
        isAdmin: true,
        adminLevel: true,
        adminPermissions: true,
        twoFactorEnabled: true,
        lastAdminAction: true,
        isBanned: true,
        banReason: true,
        banExpires: true,
        banIssuedBy: true,
        userSettings: true,
        createdAt: true,
        updatedAt: true,
        // Only include counts, not full data
        _count: {
          select: {
            linkedTeams: true,
            leagueEntries: true
          }
        }
      }
    });

    // For admin users, return minimal data without FPL-related fields
    if (user && user.isAdmin) {
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        isVerified: user.isVerified,
        isActive: user.isActive,
        consentGiven: user.consentGiven,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        adminPermissions: user.adminPermissions,
        twoFactorEnabled: user.twoFactorEnabled,
        lastAdminAction: user.lastAdminAction,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        banIssuedBy: user.banIssuedBy,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
        // Note: No linkedTeams, fplTeamId, leagueEntries, or other user-specific fields
      };
    }

    return sanitizeUser(user);
  }

  // Get user by email (without sensitive fields)
  static async getUserByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        linkedTeams: true
      }
    });

    return sanitizeUser(user);
  }

  // Get user by username (without sensitive fields)
  static async getUserByUsername(username) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        linkedTeams: true
      }
    });

    return sanitizeUser(user);
  }

  // Create new user
  static async createUser(userData) {
    try {
      console.log('Creating user with data:', { 
        email: userData.email, 
        username: userData.username, 
        phone: userData.phone 
      });
      
      // Check for existing email
      const existingEmail = await this.getUserByEmail(userData.email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }
      
      // Check for existing username
      const existingUsername = await this.getUserByUsername(userData.username);
      if (existingUsername) {
        throw new Error('Username already exists');
      }
      
      // Check for existing phone number
      const existingPhone = await prisma.user.findUnique({
        where: { phone: userData.phone }
      });
      if (existingPhone) {
        throw new Error('Phone number already exists');
      }
      
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
    const user = await prisma.user.create({
      data: {
          email: userData.email,
          username: userData.username,
        password: hashedPassword,
          phone: userData.phone,
          consentGiven: userData.consentGiven || false,
          isVerified: false // Users start unverified
        }
      });
      
      console.log('User created successfully:', user.id);
    return user;
    } catch (error) {
      console.error('UserService.createUser error:', error);
      throw error;
    }
  }

  // Link FPL team to user
  static async linkFplTeam(userId, fplTeamId, teamName) {
    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Check if user already has 10 linked teams
      const existingTeams = await tx.linkedTeam.count({
        where: { userId, isActive: true }
      });

      if (existingTeams >= 10) {
        throw new Error('Maximum of 10 linked teams allowed per user');
      }

      // Check if FPL team is already linked to any user
      const existingLink = await tx.linkedTeam.findUnique({
        where: { fplTeamId }
      });

      if (existingLink) {
        throw new Error('This FPL team is already linked to another account');
      }

      // Create linked team
      const linkedTeam = await tx.linkedTeam.create({
        data: {
          userId,
          fplTeamId,
          teamName
        }
      });

      return linkedTeam;
    });
  }

  // Unlink FPL team from user
  static async unlinkFplTeam(userId, linkedTeamId) {
    return await prisma.$transaction(async (tx) => {
      const linkedTeam = await tx.linkedTeam.findFirst({
        where: { id: linkedTeamId, userId }
      });

      if (!linkedTeam) {
        throw new Error('Linked team not found');
      }

      // Check if the team has any league entries
      const leagueEntries = await tx.leagueEntry.findMany({
        where: { 
          linkedTeamId: linkedTeamId,
          isActive: true
        }
      });

      if (leagueEntries.length > 0) {
        throw new Error('Cannot unlink team that has active league entries. Please leave all leagues first.');
      }

      // Deactivate the linked team
      const unlinkedTeam = await tx.linkedTeam.update({
        where: { id: linkedTeamId },
        data: { isActive: false }
      });

      return unlinkedTeam;
    });
  }


  // Get user's linked teams
  static async getUserLinkedTeams(userId) {
    return await prisma.linkedTeam.findMany({
      where: { userId, isActive: true },
      include: {
        leagueEntries: {
          include: {
            league: true
          }
        }
      }
    });
  }

  // Get user's first FPL team (for backward compatibility)
  static async getUserFirstFplTeam(userId) {
    const linkedTeam = await prisma.linkedTeam.findFirst({
      where: { userId, isActive: true },
      orderBy: { linkedAt: 'asc' },
      include: {
        user: true
      }
    });

    if (!linkedTeam) return null;

    return {
      ...linkedTeam,
      user: sanitizeUser(linkedTeam.user)
    };
  }

  // Update user profile
  static async updateUser(userId, updateData) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return sanitizeUser(updatedUser);
  }

  // Change user password
  static async changePassword(userId, currentPassword, newPassword) {
    // Get user with password for verification
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid current password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });
    
    return sanitizeUser(updatedUser);
  }

  // Get linked team by ID
  static async getLinkedTeamById(linkedTeamId) {
    return await prisma.linkedTeam.findUnique({
      where: { id: linkedTeamId },
      include: {
        user: true,
        leagueEntries: {
          include: {
            league: true
          }
        }
      }
    });
  }
  
  // Login user
  static async loginUser(identifier, password) {
    // Determine if identifier is email or username
    const isEmail = identifier.includes('@');
    
    // Find user by email or username (with password for verification) - OPTIMIZED: No unnecessary includes
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier } : { username: identifier },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        password: true,
        isVerified: true,
        isActive: true,
        isAdmin: true,
        adminLevel: true,
        adminPermissions: true,
        twoFactorEnabled: true,
        lastAdminAction: true,
        consentGiven: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // For admin users, return minimal data without FPL-related fields
    if (user.isAdmin) {
      const adminUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        isVerified: user.isVerified,
        isActive: user.isActive,
        consentGiven: user.consentGiven,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        adminPermissions: user.adminPermissions,
        twoFactorEnabled: user.twoFactorEnabled,
        lastAdminAction: user.lastAdminAction,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        banIssuedBy: user.banIssuedBy,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
        // Note: No linkedTeams, fplTeamId, or other user-specific fields
      };
      
      return {
        token,
        user: adminUser
      };
    }

    // Return regular user data and token (sanitized)
    return {
      token,
      user: sanitizeUser(user)
    };
  }
}

class LeagueService {
  // Create weekly league
  static async createWeeklyLeague(leagueData) {
    return await prisma.league.create({
      data: {
        name: leagueData.name,
        type: leagueData.type,
        gameweek: leagueData.gameweek,
        season: leagueData.season,
        entryFee: leagueData.entryFee,
        maxTeams: leagueData.maxTeams,
        prizePool: leagueData.prizePool,
        startTime: leagueData.startTime,
        endTime: leagueData.endTime
      }
    });
  }

  // Get current gameweek leagues
  static async getCurrentGameweekLeagues(gameweek, season = 2024) {
    return await prisma.league.findMany({
      where: { gameweek, season },
      include: {
        entries: {
          include: {
            linkedTeam: true,
            user: true
          }
        }
      }
    });
  }

  // Join league
  static async joinLeague(userId, linkedTeamId, leagueId) {
    // Check if user is verified
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.isVerified) {
      throw new Error('Phone number must be verified before joining leagues');
    }

    // Check if team is already in this league
    const existingEntry = await prisma.leagueEntry.findUnique({
      where: {
        leagueId_linkedTeamId: {
          leagueId,
          linkedTeamId
        }
      }
    });

    if (existingEntry) {
      throw new Error('Team is already in this league');
    }

    // Check if league is full
    const entryCount = await prisma.leagueEntry.count({
      where: { leagueId, isActive: true }
    });

    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });
    
    if (!league) {
      throw new Error('League not found');
    }
    
    if (entryCount >= league.maxTeams) {
      throw new Error('League is full');
    }
    
    // Check if league is still open
    if (league.status !== 'OPEN') {
      throw new Error('League is not open for entries');
    }

    // Check if league is open for entry using proper gameweek lifecycle
    const gameweekLifecycleService = require('./gameweekLifecycleService');
    const isOpenForEntry = await gameweekLifecycleService.isLeagueOpenForEntry(leagueId);
    
    if (!isOpenForEntry) {
      throw new Error('League entry is closed. First match has already started.');
    }

    // Handle entry fee if league is paid
    if (league.entryFee > 0) {
      // Import services (dynamic import to avoid circular dependency)
      const bonusWalletService = require('./bonusWalletService');
      const streakTrackingService = require('./streakTrackingService');

      try {
        // Process payment using bonus wallet first, then main wallet
        const paymentResult = await bonusWalletService.processPayment(
          userId,
          league.entryFee,
          `Entry fee for ${league.name} - Gameweek ${league.startGameweek}`,
          `LEAGUE_ENTRY_${leagueId}_${Date.now()}`,
          leagueId
        );
        
        console.log(`Payment processed for user ${userId}: GHS ${paymentResult.bonusUsed} (bonus) + GHS ${paymentResult.mainUsed} (main)`);
        
      } catch (error) {
        throw new Error(`Payment failed: ${error.message}`);
      }
    }
    
    // Create league entry
    // RULE: Users can only leave FREE leagues, NEVER paid leagues
    const canLeave = league.entryType === 'FREE';
    
    const entry = await prisma.leagueEntry.create({
      data: {
        leagueId,
        linkedTeamId,
        userId,
        canLeave: canLeave
      },
      include: {
        league: true,
        linkedTeam: true,
        user: true
      }
    });

    // Initialize leaderboard after creating entry
    try {
      const LeaderboardService = require('./leaderboardService');
      await LeaderboardService.updateLeaderboardOnEntry(leagueId);
      console.log(`Leaderboard updated for league ${leagueId} after new entry`);
    } catch (error) {
      console.error('Error updating leaderboard after entry creation:', error);
      // Don't fail the entry creation if leaderboard update fails
    }
    
    // Track participation for streak rewards (only for Gameweek Champions leagues)
    if (league.name.includes('Gameweek') && league.name.includes('Champions')) {
      try {
        const streakTrackingService = require('./streakTrackingService');
        await streakTrackingService.trackParticipation(userId, league.startGameweek, leagueId);
        console.log(`Tracked participation for user ${userId} in gameweek ${league.startGameweek}`);
      } catch (error) {
        console.error('Error tracking participation:', error);
        // Don't fail the league entry if streak tracking fails
      }
    }
    
    return entry;
  }

  // Bulk join multiple teams to league (optimized for performance)
  static async bulkJoinLeague(userId, linkedTeamIds, leagueId) {
    try {
      // Check if user is verified
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isVerified) {
        throw new Error('Phone number must be verified before joining leagues');
      }

      // Get league details
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        throw new Error('League not found');
      }

      // Check if league is open for entries
      if (league.status !== 'OPEN') {
        throw new Error('League is not open for entries');
      }

      // Check if league is open for entry using proper gameweek lifecycle
      const gameweekLifecycleService = require('./gameweekLifecycleService');
      const isOpenForEntry = await gameweekLifecycleService.isLeagueOpenForEntry(leagueId);
      
      if (!isOpenForEntry) {
        throw new Error('League entry is closed. First match has already started.');
      }

      // Check current entry count
      const currentEntryCount = await prisma.leagueEntry.count({
        where: { leagueId, isActive: true }
      });

      // Validate all linked teams belong to user
      const linkedTeams = await prisma.linkedTeam.findMany({
        where: {
          id: { in: linkedTeamIds },
          userId,
          isActive: true
        }
      });

      if (linkedTeams.length !== linkedTeamIds.length) {
        throw new Error('One or more linked teams are invalid or don\'t belong to you');
      }

      // Check which teams are already in the league
      const existingEntries = await prisma.leagueEntry.findMany({
        where: {
          leagueId,
          linkedTeamId: { in: linkedTeamIds },
          isActive: true
        },
        select: { linkedTeamId: true }
      });

      const alreadyInLeague = existingEntries.map(entry => entry.linkedTeamId);
      const teamsToJoin = linkedTeamIds.filter(id => !alreadyInLeague.includes(id));

      // Check if league would be full after joining
      if (currentEntryCount + teamsToJoin.length > league.maxTeams && league.maxTeams < 100000) {
        throw new Error(`League would be full. Can only join ${league.maxTeams - currentEntryCount} more teams.`);
      }

      const results = {
        joined: [],
        alreadyInLeague: alreadyInLeague,
        failed: []
      };

      // Process payment if league is paid
      if (league.entryFee > 0 && teamsToJoin.length > 0) {
        const totalFee = league.entryFee * teamsToJoin.length;
        
        try {
          const bonusWalletService = require('./bonusWalletService');
          const paymentResult = await bonusWalletService.processPayment(
            userId,
            totalFee,
            `Entry fees for ${teamsToJoin.length} teams in ${league.name} - Gameweek ${league.startGameweek}`,
            `BULK_LEAGUE_ENTRY_${leagueId}_${Date.now()}`,
            leagueId
          );
          
          console.log(`Bulk payment processed for user ${userId}: GHS ${paymentResult.bonusUsed} (bonus) + GHS ${paymentResult.mainUsed} (main) for ${teamsToJoin.length} teams`);
        } catch (error) {
          throw new Error(`Payment failed: ${error.message}`);
        }
      }

      // Bulk create league entries
      if (teamsToJoin.length > 0) {
        const canLeave = league.entryType === 'FREE';
        
        const entriesToCreate = teamsToJoin.map(linkedTeamId => ({
          leagueId,
          linkedTeamId,
          userId,
          canLeave
        }));

        // Use createMany for bulk insert
        const createdEntries = await prisma.leagueEntry.createMany({
          data: entriesToCreate
        });

        // Get the created entries with full data
        const fullEntries = await prisma.leagueEntry.findMany({
          where: {
            leagueId,
            linkedTeamId: { in: teamsToJoin },
            userId,
            isActive: true
          },
          include: {
            league: true,
            linkedTeam: true,
            user: true
          }
        });

        results.joined = fullEntries;

        // Initialize leaderboard after bulk entry creation
        try {
          const LeaderboardService = require('./leaderboardService');
          await LeaderboardService.updateLeaderboardOnEntry(leagueId);
          console.log(`Leaderboard updated for league ${leagueId} after bulk entry creation`);
        } catch (error) {
          console.error('Error updating leaderboard after bulk entry creation:', error);
        }

        // Track participation for streak rewards (only for Gameweek Champions leagues)
        if (league.name.includes('Gameweek') && league.name.includes('Champions')) {
          try {
            const streakTrackingService = require('./streakTrackingService');
            for (const teamId of teamsToJoin) {
              await streakTrackingService.trackParticipation(userId, league.startGameweek, leagueId);
            }
            console.log(`Tracked participation for user ${userId} in gameweek ${league.startGameweek} for ${teamsToJoin.length} teams`);
          } catch (error) {
            console.error('Error tracking participation:', error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Bulk join league error:', error);
      throw error;
    }
  }

  // Update league rankings
  static async updateLeagueRankings(leagueId) {
    const entries = await prisma.leagueEntry.findMany({
      where: { leagueId, isActive: true },
      orderBy: [
        { gameweekPoints: 'desc' },
        { entryTime: 'asc' }
      ]
    });

    // Update rankings
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const newRank = i + 1;
      
      await prisma.leagueEntry.update({
        where: { id: entry.id },
      data: {
          previousRank: entry.rank,
          rank: newRank
        }
      });
    }

    return entries;
  }

  // Get league standings
  static async getLeagueStandings(leagueId) {
    return await prisma.leagueEntry.findMany({
      where: { leagueId, isActive: true },
      orderBy: [
        { gameweekPoints: 'desc' },
        { entryTime: 'asc' }
      ],
      include: {
        linkedTeam: true,
        user: true
      }
    });
  }
  
  // Get league by ID
  static async getLeagueById(leagueId) {
    return await prisma.league.findUnique({
        where: { id: leagueId },
      include: {
        entries: {
          include: {
            linkedTeam: true,
            user: true
          }
        }
      }
    });
  }

  // Get league by code (for invitational leagues)
  static async getLeagueByCode(leagueCode) {
    return await prisma.league.findUnique({
      where: { leagueCode: leagueCode },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            isVerified: true
          }
        },
        entries: {
          select: {
            id: true
          }
        }
      }
    });
  }
  
  // Leave league
  static async leaveLeague(leagueId, linkedTeamId) {
    const entry = await prisma.leagueEntry.findFirst({
      where: {
        leagueId,
        linkedTeamId
      },
      include: {
        league: true
      }
    });
    
    if (!entry) {
      throw new Error('Team not in this league');
    }
    
    // RULE: Users can ONLY leave FREE leagues, NEVER paid leagues
    if (entry.league.entryType === 'PAID') {
      throw new Error('Cannot leave paid leagues. No exit options available.');
    }
    
    // Additional check: ensure the entry was marked as leaveable
    if (!entry.canLeave) {
      throw new Error('This league entry does not allow leaving');
    }
    
    return await prisma.leagueEntry.update({
      where: { id: entry.id },
      data: { isActive: false }
    });
  }

  // Update entry points
  static async updateEntryPoints(leagueId, linkedTeamId, points) {
    return await prisma.leagueEntry.updateMany({
      where: {
        leagueId,
        linkedTeamId
      },
      data: {
        gameweekPoints: points
      }
    });
  }
}

class TransactionService {
  // Create transaction
  static async createTransaction(transactionData) {
    return await prisma.transaction.create({
      data: transactionData
    });
  }

  // Get user transactions
  static async getUserTransactions(userId) {
    return await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        league: true
      }
    });
  }
  
  // Update transaction status
  static async updateTransactionStatus(transactionId, status) {
    return await prisma.transaction.update({
      where: { id: transactionId },
      data: { status }
    });
  }
}

module.exports = {
  prisma,
  UserService,
  LeagueService,
  TransactionService
};
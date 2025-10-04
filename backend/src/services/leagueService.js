// File: fpl-hub-backend/src/services/leagueService.js
// Enhanced league service for weekly leagues with proper points calculation

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fplService = require('./fplService');

const prisma = new PrismaClient();

class LeagueService {
  // Create weekly leagues for specified gameweek
  static async createWeeklyLeagues(gameweek, season, platformFeeType = 'PERCENTAGE', platformFeeValue = 5.0) {
    try {
      // Use automatic league service for current season format
      const AutomaticLeagueService = require('./automaticLeagueService');
      const currentSeason = AutomaticLeagueService.getCurrentSeason();
      
      // Check if leagues already exist for this gameweek
      const existingLeagues = await prisma.league.findMany({
        where: { 
          startGameweek: gameweek, 
          season: currentSeason
        }
      });

      if (existingLeagues.length > 0) {
        console.log(`Leagues already exist for Gameweek ${gameweek}`);
        return existingLeagues;
      }

      // Get first match kickoff time for this gameweek
      let firstMatchKickoff = null;
      try {
        firstMatchKickoff = await fplService.getFirstMatchKickoff(gameweek);
        console.log(`🏈 First match kickoff for GW${gameweek}: ${firstMatchKickoff}`);
      } catch (error) {
        console.warn(`⚠️  Could not get first match kickoff for GW${gameweek}:`, error.message);
        // Fallback: use FPL deadline + 1 hour as startTime
        const gameweekData = await fplService.getGameweekById(gameweek);
        if (gameweekData && gameweekData.deadline_time) {
          firstMatchKickoff = new Date(new Date(gameweekData.deadline_time).getTime() + (60 * 60 * 1000)); // +1 hour
          console.log(`🔄 Using fallback startTime (deadline + 1h): ${firstMatchKickoff}`);
        }
      }

      // Get or create admin user for creating leagues
      let adminUser = await prisma.user.findFirst({
        where: { 
          OR: [
            { email: 'admin@fplhub.com' },
            { email: { contains: 'admin' } },
            { username: { contains: 'admin' } }
          ]
        }
      });

      // If no admin user found, create one
      if (!adminUser) {
        console.log('⚠️  No admin user found, creating default admin user...');
        adminUser = await prisma.user.create({
          data: {
            email: 'admin@fplhub.com',
            username: 'admin',
            password: await bcrypt.hash('admin123', 12),
            phone: '+233501234500',
            isVerified: true,
            isActive: true,
            consentGiven: true,
            isAdmin: true,
            adminLevel: 'SUPER_ADMIN',
            adminPermissions: JSON.stringify({
              canCreateLeagues: true,
              canManageUsers: true,
              canViewAnalytics: true,
              canManageSystem: true
            })
          }
        });
        console.log('✅ Created default admin user:', adminUser.email);
      }

      // Create Gameweek Champions (Paid League)
      const championsLeague = await prisma.league.create({
        data: {
          name: `Gameweek ${gameweek} Champions`,
          type: 'PAID',
          leagueFormat: 'CLASSIC',
          creatorId: adminUser.id,
          entryType: 'PAID',
          entryFee: 10.00, // GHS 10 entry fee
          maxTeams: 10000, // RULE: Max 10,000 entries for flagship leagues
          includeChipScores: false, // RULE: No chip scores for flagship leagues
          includeTransferCosts: false, // RULE: No transfer costs for flagship leagues
          season: currentSeason,
          startGameweek: gameweek,
          endGameweek: gameweek,
          startTime: firstMatchKickoff, // First match kickoff time for entry closure
          totalPrizePool: 0, // Will be calculated based on entries
          platformFee: 0.50, // 5% platform fee
          platformFeeType: platformFeeType,
          platformFeeValue: platformFeeValue,
          status: 'OPEN',
          isPrivate: false, // RULE: Admin can create public leagues
          isInvitational: false, // RULE: Admin can create public leagues
          leagueCode: this.generateLeagueCode(),
          description: `Weekly paid league for Gameweek ${gameweek} - Gameweek points only, no chips or transfer costs`
        }
      });

      // Create Free2Play League
      const freeLeague = await prisma.league.create({
        data: {
          name: `Gameweek ${gameweek} Free2Play`,
          type: 'FREE',
          leagueFormat: 'CLASSIC',
          creatorId: adminUser.id,
          entryType: 'FREE',
          entryFee: 0.00,
          maxTeams: 10000, // RULE: Max 10,000 entries for flagship leagues
          includeChipScores: false, // RULE: No chip scores for flagship leagues
          includeTransferCosts: false, // RULE: No transfer costs for flagship leagues
          season: currentSeason,
          startGameweek: gameweek,
          endGameweek: gameweek,
          startTime: firstMatchKickoff, // First match kickoff time for entry closure
          totalPrizePool: 0,
          platformFee: 0,
          platformFeeType: 'PERCENTAGE',
          platformFeeValue: 0.0,
          status: 'OPEN',
          isPrivate: false, // RULE: Admin can create public leagues
          isInvitational: false, // RULE: Admin can create public leagues
          leagueCode: this.generateLeagueCode(),
          description: `Weekly free league for Gameweek ${gameweek} - Gameweek points only, no chips or transfer costs`
        }
      });

      console.log(`✅ Created leagues for Gameweek ${gameweek}`);
      return [championsLeague, freeLeague];
    } catch (error) {
      console.error('Error creating weekly leagues:', error);
      throw error;
    }
  }

  // Calculate gameweek points excluding chips and transfer costs
  static async calculateGameweekPoints(fplTeamId, gameweekId) {
    try {
      // Get FPL team's gameweek data
      const gameweekData = await fplService.getTeamGameweekData(fplTeamId, gameweekId);
      
      if (!gameweekData) {
        return 0;
      }

      let totalPoints = 0;

      // Calculate points from each player
      gameweekData.picks.forEach(pick => {
        const player = gameweekData.elements.find(p => p.id === pick.element);
        if (player && player.event_points) {
          // Add base player points
          totalPoints += player.event_points;
        }
      });

      // IMPORTANT: Do NOT add chip points or subtract transfer costs
      // This ensures only pure gameweek performance is counted

      return totalPoints;
    } catch (error) {
      console.error('Error calculating gameweek points:', error);
      return 0;
    }
  }

  // Update all league entries with current gameweek points
  static async updateLeaguePoints(gameweekId) {
    try {
      // Get all active league entries for this gameweek
      const leagueEntries = await prisma.leagueEntry.findMany({
        where: {
          isActive: true,
          league: {
            startGameweek: gameweekId
          }
        },
        include: {
          linkedTeam: true,
          league: true
        }
      });

      console.log(`Updating points for ${leagueEntries.length} league entries`);

      // Update points for each entry
      for (const entry of leagueEntries) {
        const points = await this.calculateGameweekPoints(
          entry.linkedTeam.fplTeamId, 
          gameweekId
        );

        await prisma.leagueEntry.update({
          where: { id: entry.id },
          data: { gameweekPoints: points }
        });
      }

      // Update rankings for all leagues in this gameweek
      const leagues = await prisma.league.findMany({
        where: { startGameweek: gameweekId }
      });

      for (const league of leagues) {
        await this.updateLeagueRankings(league.id);
      }

      console.log(`✅ Updated points for Gameweek ${gameweekId}`);
    } catch (error) {
      console.error('Error updating league points:', error);
      throw error;
    }
  }

  // Get current gameweek leagues (only public leagues that users can join)
  static async getCurrentGameweekLeagues() {
    try {
      const currentGameweek = await fplService.getCurrentGameweek();
      
      return await prisma.league.findMany({
        where: { 
          startGameweek: currentGameweek.id,
          season: currentSeason,
          // Only show public leagues that users can join
          isPrivate: false,
          isInvitational: false,
          status: 'OPEN'
        },
        include: {
          entries: {
            where: { isActive: true },
            include: {
              linkedTeam: true,
              user: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error getting current gameweek leagues:', error);
      throw error;
    }
  }

  // Join league with validation
  static async joinLeague(userId, linkedTeamId, leagueId) {
    try {
      // Check if user is verified
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user.isVerified) {
        throw new Error('Phone number must be verified before joining leagues');
      }

      // Validate linked team belongs to user
      const linkedTeam = await prisma.linkedTeam.findFirst({
        where: { id: linkedTeamId, userId, isActive: true }
      });

      if (!linkedTeam) {
        throw new Error('Invalid linked team');
      }

      // Check if team is already in this league
      const existingEntry = await prisma.leagueEntry.findFirst({
        where: {
          leagueId,
          linkedTeamId,
          isActive: true
        }
      });

      if (existingEntry) {
        throw new Error('Team is already in this league');
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

      // Check if league has started (first match has begun)
      const now = new Date();
      if (now >= league.startTime) {
        throw new Error('League entry is closed. First match has already started.');
      }

      // Check if league is full (with unrealistically high cap)
      const entryCount = await prisma.leagueEntry.count({
        where: { leagueId, isActive: true }
      });

      // Only check if we're approaching the theoretical limit
      if (entryCount >= league.maxTeams && league.maxTeams < 100000) {
        throw new Error('League is full');
      }

      // Create league entry
      const entry = await prisma.leagueEntry.create({
        data: {
          leagueId,
          linkedTeamId,
          userId
        },
        include: {
          league: true,
          linkedTeam: true,
          user: true
        }
      });

      // Update prize pool for paid leagues
      if (league.type === 'PAID') {
        await prisma.league.update({
          where: { id: leagueId },
          data: {
            prizePool: { increment: league.entryFee }
          }
        });
      }

      return entry;
    } catch (error) {
      console.error('Error joining league:', error);
      throw error;
    }
  }

  // Update league rankings
  static async updateLeagueRankings(leagueId) {
    try {
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
    } catch (error) {
      console.error('Error updating league rankings:', error);
      throw error;
    }
  }

  // Get league standings
  static async getLeagueStandings(leagueId) {
    try {
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
    } catch (error) {
      console.error('Error getting league standings:', error);
      throw error;
    }
  }

  // Get enhanced league standings with live gameweek progress
  static async getEnhancedLeagueStandings(leagueId) {
    try {
      const entries = await prisma.leagueEntry.findMany({
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

      // Get current gameweek for live progress
      const currentGameweek = await fplService.getCurrentGameweek();
      
      // Enhance each entry with live gameweek progress
      const enhancedEntries = await Promise.all(
        entries.map(async (entry) => {
          try {
            // Get FPL team's current gameweek data
            const gameweekData = await fplService.getTeamGameweekData(
              entry.linkedTeam.fplTeamId, 
              currentGameweek.id
            );

            if (gameweekData) {
              // Calculate live progress
              const liveProgress = this.calculateLiveProgress(gameweekData);
              
              return {
                ...entry,
                liveProgress: {
                  captainStatus: liveProgress.captainStatus,
                  playersRemaining: liveProgress.playersRemaining,
                  totalPlayers: liveProgress.totalPlayers,
                  playersPlayed: liveProgress.playersPlayed,
                  gameweekProgress: liveProgress.gameweekProgress
                }
              };
            } else {
              // No gameweek data available
              return {
                ...entry,
                liveProgress: {
                  captainStatus: 'UNKNOWN',
                  playersRemaining: 0,
                  totalPlayers: 15,
                  playersPlayed: 0,
                  gameweekProgress: 0
                }
              };
            }
          } catch (error) {
            console.error(`Error enhancing entry ${entry.id}:`, error);
            // Return entry without live progress if there's an error
            return {
              ...entry,
              liveProgress: {
                captainStatus: 'ERROR',
                playersRemaining: 0,
                totalPlayers: 15,
                playersPlayed: 0,
                gameweekProgress: 0
              }
            };
          }
        })
      );

      return enhancedEntries;
    } catch (error) {
      console.error('Error getting enhanced league standings:', error);
      throw error;
    }
  }

  // Calculate live progress for a team in current gameweek
  static calculateLiveProgress(gameweekData) {
    try {
      const { picks, elements } = gameweekData;
      let playersPlayed = 0;
      let captainPlayed = false;
      let captainId = null;

      // Find captain (multiplier > 1)
      const captain = picks.find(pick => pick.multiplier > 1);
      if (captain) {
        captainId = captain.element;
      }

      // Count players who have played
      picks.forEach(pick => {
        const player = elements.find(p => p.id === pick.element);
        if (player && player.event_points !== null && player.event_points !== undefined) {
          playersPlayed++;
          
          // Check if captain has played
          if (pick.element === captainId) {
            captainPlayed = true;
          }
        }
      });

      const totalPlayers = picks.length;
      const playersRemaining = totalPlayers - playersPlayed;
      const gameweekProgress = Math.round((playersPlayed / totalPlayers) * 100);

      // Determine captain status
      let captainStatus = 'UNKNOWN';
      if (captainId) {
        if (captainPlayed) {
          captainStatus = 'PLAYED';
        } else {
          captainStatus = 'YET_TO_PLAY';
        }
      }

      return {
        captainStatus,
        playersRemaining,
        totalPlayers,
        playersPlayed,
        gameweekProgress
      };
    } catch (error) {
      console.error('Error calculating live progress:', error);
      return {
        captainStatus: 'ERROR',
        playersRemaining: 0,
        totalPlayers: 15,
        playersPlayed: 0,
        gameweekProgress: 0
      };
    }
  }

  // Get league by ID
  static async getLeagueById(leagueId) {
    try {
      return await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          entries: {
            where: { isActive: true },
            include: {
              linkedTeam: true,
              user: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error getting league by ID:', error);
      throw error;
    }
  }

  // Leave league
  static async leaveLeague(leagueId, linkedTeamId) {
    try {
      const entry = await prisma.leagueEntry.findFirst({
        where: {
          leagueId,
          linkedTeamId,
          isActive: true
        }
      });

      if (!entry) {
        throw new Error('Team not in this league');
      }

      return await prisma.leagueEntry.update({
        where: { id: entry.id },
        data: { isActive: false }
      });
    } catch (error) {
      console.error('Error leaving league:', error);
      throw error;
    }
  }

  // Get user's leagues
  static async getUserLeagues(userId) {
    try {
      const entries = await prisma.leagueEntry.findMany({
        where: {
          linkedTeam: {
            userId: userId
          },
          isActive: true
        },
        include: {
          league: true,
          linkedTeam: true
        }
      });

      return entries.map(entry => entry.league);
    } catch (error) {
      console.error('Error getting user leagues:', error);
      return [];
    }
  }

  // Get league entries
  static async getLeagueEntries(leagueId) {
    try {
      return await prisma.leagueEntry.findMany({
        where: { leagueId, isActive: true },
        include: {
          linkedTeam: true,
          user: true
        }
      });
    } catch (error) {
      console.error('Error getting league entries:', error);
      return [];
    }
  }

  // Get user by ID
  static async getUserById(userId) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        include: {
          linkedTeams: true
        }
      });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Get gameweek data for a league
  static async getGameweekData(leagueId, gameweekId) {
    try {
      const entries = await this.getLeagueEntries(leagueId);
      
      const gameweekData = [];
      
      for (const entry of entries) {
        try {
          const user = entry.user;
          const linkedTeam = entry.linkedTeam;
          
          if (linkedTeam && linkedTeam.fplTeamId) {
            const gameweekPoints = await fplService.calculateGameweekPoints(linkedTeam.fplTeamId, gameweekId);
            
            gameweekData.push({
              userId: user.id,
              username: user.username,
              fplTeamId: linkedTeam.fplTeamId,
              fplTeamName: linkedTeam.fplTeamName,
              gameweekPoints,
              totalPoints: entry.totalPoints
            });
          }
        } catch (error) {
          console.error(`Error getting gameweek data for user ${entry.userId}:`, error);
        }
      }
      
      return gameweekData;
    } catch (error) {
      console.error('Error getting gameweek data:', error);
      return [];
    }
  }

  // Generate unique league code
  static generateLeagueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = LeagueService;

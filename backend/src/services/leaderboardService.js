const { PrismaClient } = require('@prisma/client');
const fplService = require('./fplService');

const prisma = new PrismaClient();

// Import optimized caching from liveStandingsService
const LiveStandingsService = require('./liveStandingsService');

// Leaderboard-specific cache
const leaderboardCache = new Map();
const LEADERBOARD_CACHE_DURATION = 15 * 1000; // 15 seconds for leaderboard

class LeaderboardService {
  
  /**
   * Initialize leaderboard for a league when first entry is created
   * Sets default values: rank 1, points 0, payout 0
   */
  static async initializeLeaderboard(leagueId) {
    try {
      console.log(`Initializing leaderboard for league ${leagueId}`);
      
      // Get all active entries for this league
      const entries = await prisma.leagueEntry.findMany({
        where: { 
          leagueId, 
          isActive: true 
        },
        include: {
          linkedTeam: true,
          user: true,
          league: true
        }
      });

      if (entries.length === 0) {
        console.log('No entries found for leaderboard initialization');
        return [];
      }

      // Get current gameweek to check if league has started
      const currentGameweek = await fplService.getCurrentGameweek();
      const league = entries[0].league;
      const hasStarted = currentGameweek && currentGameweek.id >= league.startGameweek;

      console.log(`League ${leagueId} has started: ${hasStarted} (current: ${currentGameweek?.id}, start: ${league.startGameweek})`);

      if (hasStarted) {
        // League has started - calculate real points and rankings
        return await this.calculateLiveLeaderboard(leagueId);
      } else {
        // League hasn't started - return default leaderboard
        return await this.getDefaultLeaderboard(leagueId);
      }

    } catch (error) {
      console.error('Error initializing leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get default leaderboard (before gameweek starts)
   * All teams show rank 1, points 0, payout 0
   */
  static async getDefaultLeaderboard(leagueId) {
    try {
      const entries = await prisma.leagueEntry.findMany({
        where: { 
          leagueId, 
          isActive: true 
        },
        include: {
          linkedTeam: true,
          user: true,
          league: true
        },
        orderBy: {
          entryTime: 'asc' // Order by entry time for consistent display
        }
      });

      // Calculate estimated payout for each position
      const totalPrizePool = entries[0]?.league?.totalPrizePool || 0;
      const entryCount = entries.length;

      const leaderboard = entries.map((entry, index) => {
        const estimatedPayout = this.calculateEstimatedPayout(index + 1, entryCount, totalPrizePool);
        
        return {
          id: entry.id,
          userId: entry.userId,
          linkedTeamId: entry.linkedTeamId,
          teamName: entry.linkedTeam.teamName,
          fplTeamId: entry.linkedTeam.fplTeamId,
          fplUrl: `https://fantasy.premierleague.com/entry/${entry.linkedTeam.fplTeamId}`,
          username: entry.user.username,
          rank: 1, // All teams show rank 1 before gameweek starts
          totalPoints: 0, // Default points
          gameweekPoints: 0, // Default points
          estimatedPayout: estimatedPayout,
          entryTime: entry.entryTime,
          isDefault: true, // Flag to indicate this is default data
          leagueStatus: 'NOT_STARTED'
        };
      });

      console.log(`Generated default leaderboard for league ${leagueId} with ${leaderboard.length} entries`);
      return leaderboard;

    } catch (error) {
      console.error('Error getting default leaderboard:', error);
      throw error;
    }
  }

  /**
   * Calculate live leaderboard (after gameweek starts)
   * Fetches real FPL points and calculates actual rankings
   */
  static async calculateLiveLeaderboard(leagueId) {
    try {
      console.log(`Calculating live leaderboard for league ${leagueId}`);
      
      const entries = await prisma.leagueEntry.findMany({
        where: { 
          leagueId, 
          isActive: true 
        },
        include: {
          linkedTeam: true,
          user: true,
          league: true
        }
      });

      if (entries.length === 0) {
        return [];
      }

      const league = entries[0].league;
      const currentGameweek = await fplService.getCurrentGameweek();
      
      // Use database values (updated by live standings service)
      // BATCH OPTIMIZED: Process all teams with batch captain info fetching
      const leaderboardEntries = await this.batchProcessLeaderboardEntries(entries, league.startGameweek);

      // Sort by total points (descending) and assign ranks
      leaderboardEntries.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        // If points are equal, sort by entry time (earlier entry wins)
        return new Date(a.entryTime) - new Date(b.entryTime);
      });

      // Assign ranks and calculate payouts
      const totalPrizePool = league.totalPrizePool || 0;
      const entryCount = leaderboardEntries.length;

      leaderboardEntries.forEach((entry, index) => {
        const newRank = index + 1;
        
        // Update rank in database if it has changed
        if (entry.rank !== newRank) {
          prisma.leagueEntry.update({
            where: { id: entry.id },
            data: { 
              rank: newRank
            }
          }).catch(error => {
            console.error(`Error updating rank for entry ${entry.id}:`, error);
          });
        }
        
        entry.rank = newRank;
        entry.estimatedPayout = this.calculateEstimatedPayout(newRank, entryCount, totalPrizePool);
      });

      console.log(`Generated live leaderboard for league ${leagueId} with ${leaderboardEntries.length} entries`);
      return leaderboardEntries;

    } catch (error) {
      console.error('Error calculating live leaderboard:', error);
      throw error;
    }
  }

  // Cache for player data (refreshed every 5 minutes)
  static playerDataCache = null;
  static playerDataCacheTime = null;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached player data
   */
  static async getCachedPlayerData() {
    const now = Date.now();
    
    if (this.playerDataCache && this.playerDataCacheTime && (now - this.playerDataCacheTime) < this.CACHE_DURATION) {
      return this.playerDataCache;
    }

    try {
      const axios = require('axios');
      const playersResponse = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/', {
        timeout: 10000 // 10 second timeout
      });
      
      this.playerDataCache = playersResponse.data.elements;
      this.playerDataCacheTime = now;
      
      console.log('📦 Player data cache refreshed');
      return this.playerDataCache;
    } catch (error) {
      console.error('Error fetching player data:', error.message);
      return this.playerDataCache || []; // Return old cache if available
    }
  }

  /**
   * Batch process leaderboard entries with optimized captain info fetching
   * @param {Array} entries - League entries
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<Array>} Processed leaderboard entries
   */
  static async batchProcessLeaderboardEntries(entries, gameweekId) {
    const leaderboardEntries = [];
    const batchSize = 5; // Process 5 teams at a time
    
    console.log(`🔄 Batch processing ${entries.length} leaderboard entries...`);
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      console.log(`🔄 Processing leaderboard batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(entries.length/batchSize)}: ${batch.length} teams`);
      
      // Process batch with parallel captain info fetching
      const batchResults = await Promise.all(
        batch.map(async (entry) => {
          try {
            // Get captain info for this team
            const captainInfo = await this.getCaptainInfo(entry.linkedTeam.fplTeamId, gameweekId);
            
            return {
              id: entry.id,
              userId: entry.userId,
              linkedTeamId: entry.linkedTeamId,
              teamName: entry.linkedTeam.teamName,
              fplTeamId: entry.linkedTeam.fplTeamId,
              fplUrl: `https://fantasy.premierleague.com/entry/${entry.linkedTeam.fplTeamId}`,
              username: entry.user.username,
              totalPoints: entry.gameweekPoints || 0,
              gameweekPoints: entry.gameweekPoints || 0,
              captainName: captainInfo.name || '-',
              captainPoints: captainInfo.points || 0,
              remainingPlayers: captainInfo.remainingPlayers || 0,
              entryTime: entry.entryTime,
              rank: entry.rank || 0,
              isDefault: false,
              leagueStatus: 'LIVE'
            };
          } catch (error) {
            console.error(`Error processing team ${entry.linkedTeam.teamName}:`, error.message);
            // Return fallback data
            return {
              id: entry.id,
              userId: entry.userId,
              linkedTeamId: entry.linkedTeamId,
              teamName: entry.linkedTeam.teamName,
              fplTeamId: entry.linkedTeam.fplTeamId,
              fplUrl: `https://fantasy.premierleague.com/entry/${entry.linkedTeam.fplTeamId}`,
              username: entry.user.username,
              totalPoints: entry.gameweekPoints || 0,
              gameweekPoints: entry.gameweekPoints || 0,
              captainName: '-',
              captainPoints: 0,
              remainingPlayers: 0,
              entryTime: entry.entryTime,
              rank: entry.rank || 0,
              isDefault: false,
              leagueStatus: 'LIVE'
            };
          }
        })
      );
      
      leaderboardEntries.push(...batchResults);
      
      // Small delay between batches to be respectful to FPL API
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Batch processed ${leaderboardEntries.length} leaderboard entries`);
    return leaderboardEntries;
  }

  /**
   * Get captain information and remaining players for a team (ULTRA-OPTIMIZED with caching)
   */
  static async getCaptainInfo(fplTeamId, gameweekId) {
    try {
      // Check cache first
      const cacheKey = `captain_${fplTeamId}_${gameweekId}`;
      const cached = leaderboardCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < LEADERBOARD_CACHE_DURATION) {
        console.log(`⚡ Using cached captain info for team ${fplTeamId}`);
        return cached.data;
      }

      const axios = require('axios');
      
      // Get team's picks for this gameweek with shorter timeout
      const teamResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${fplTeamId}/event/${gameweekId}/picks/`, {
        timeout: 5000 // Reduced to 5 seconds
      });
      
      if (!teamResponse.data || !teamResponse.data.picks) {
        const result = { name: '-', points: 0, remainingPlayers: 0 };
        leaderboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      // Find captain
      const captain = teamResponse.data.picks.find(p => p.is_captain);
      let captainName = '-';
      
      if (captain) {
        // Get cached player data
        const players = await this.getCachedPlayerData();
        const player = players.find(p => p.id === captain.element);
        
        if (player) {
          captainName = `${player.first_name} ${player.second_name}`;
        }
      }

      // Calculate remaining players (starting 11 only - players who haven't played yet)
      const liveData = await fplService.getLiveGameweekData(gameweekId);
      let remainingPlayers = 0;
      
      if (liveData && liveData.elements) {
        // Count only starting 11 players who haven't played (minutes = 0)
        // Starting 11 are picks with position <= 11 (positions 1-11 are starting lineup)
        for (const pick of teamResponse.data.picks) {
          if (pick.position <= 11) { // Only starting 11
            const playerData = liveData.elements.find(p => p.id === pick.element);
            if (playerData && playerData.stats && playerData.stats.minutes === 0) {
              remainingPlayers++;
            }
          }
        }
      }

      const result = {
        name: captainName,
        points: 0, // Captain points would need live data
        remainingPlayers: remainingPlayers
      };

      // Cache the result
      leaderboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error(`Error getting captain info for team ${fplTeamId}:`, error.message);
      const result = { name: '-', points: 0, remainingPlayers: 0 };
      // Cache error result briefly to avoid repeated failures
      const cacheKey = `captain_${fplTeamId}_${gameweekId}`;
      leaderboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  }

  /**
   * Calculate estimated payout for a given rank
   */
  static calculateEstimatedPayout(rank, totalEntries, totalPrizePool) {
    if (totalPrizePool === 0 || totalEntries === 0) {
      return 0;
    }

    // Simple payout structure - can be customized
    if (totalEntries === 1) {
      return totalPrizePool; // Winner takes all if only one entry
    }

    // Top 3 get payouts, rest get 0
    if (rank === 1) {
      return Math.round(totalPrizePool * 0.6); // 60% to winner
    } else if (rank === 2) {
      return Math.round(totalPrizePool * 0.3); // 30% to second
    } else if (rank === 3) {
      return Math.round(totalPrizePool * 0.1); // 10% to third
    }

    return 0; // No payout for ranks 4+
  }

  /**
   * Get leaderboard for a specific league
   * Automatically determines if it should show default or live data
   */
  static async getLeagueLeaderboard(leagueId, fastMode = false) {
    try {
      // Check if league exists and has entries
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          entries: {
            where: { isActive: true }
          }
        }
      });

      if (!league) {
        throw new Error('League not found');
      }

      if (league.entries.length === 0) {
        return {
          leagueId,
          leagueName: league.name,
          totalEntries: 0,
          leaderboard: [],
          status: 'NO_ENTRIES'
        };
      }

      // Get current gameweek (with fallback)
      let currentGameweek;
      let hasStarted = false;
      
      try {
        currentGameweek = await fplService.getCurrentGameweek();
        hasStarted = currentGameweek && currentGameweek.id >= league.startGameweek;
      } catch (error) {
        console.warn('Could not get current gameweek, using fallback logic:', error.message);
        // Fallback: assume league has started if it's a past gameweek
        const now = new Date();
        const leagueStartDate = new Date(league.createdAt);
        hasStarted = now > leagueStartDate; // Simple fallback
      }

      let leaderboard;
      if (hasStarted) {
        if (fastMode) {
          // Fast mode: return basic leaderboard without captain info
          leaderboard = await this.getFastLeaderboard(leagueId);
        } else {
          leaderboard = await this.calculateLiveLeaderboard(leagueId);
        }
      } else {
        leaderboard = await this.getDefaultLeaderboard(leagueId);
      }

      return {
        leagueId,
        leagueName: league.name,
        totalEntries: leaderboard.length,
        leaderboard: leaderboard,
        status: hasStarted ? 'LIVE' : 'NOT_STARTED',
        currentGameweek: currentGameweek?.id,
        leagueStartGameweek: league.startGameweek
      };

    } catch (error) {
      console.error('Error getting league leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get fast leaderboard without captain info (fallback for slow API)
   */
  static async getFastLeaderboard(leagueId) {
    try {
      console.log('⚡ Getting fast leaderboard (no FPL API calls)...');
      
      const entries = await prisma.leagueEntry.findMany({
        where: { 
          leagueId, 
          isActive: true 
        },
        include: {
          linkedTeam: true,
          user: true,
          league: true
        }
      });

      if (entries.length === 0) {
        return [];
      }

      // Sort by points and assign ranks
      entries.sort((a, b) => {
        if (b.gameweekPoints !== a.gameweekPoints) {
          return b.gameweekPoints - a.gameweekPoints;
        }
        return new Date(a.entryTime) - new Date(b.entryTime);
      });

      // Prepare batch rank updates
      const rankUpdates = [];
      const leaderboardEntries = entries.map((entry, index) => {
        const newRank = index + 1;
        
        // Queue rank update if it has changed
        if (entry.rank !== newRank) {
          rankUpdates.push({
            where: { id: entry.id },
            data: { 
              previousRank: entry.rank,
              rank: newRank
            }
          });
        }
        
        return {
          id: entry.id,
          userId: entry.userId,
          linkedTeamId: entry.linkedTeamId,
          teamName: entry.linkedTeam.teamName,
          fplTeamId: entry.linkedTeam.fplTeamId,
          fplUrl: `https://fantasy.premierleague.com/entry/${entry.linkedTeam.fplTeamId}`,
          username: entry.user.username,
          totalPoints: entry.gameweekPoints || 0,
          gameweekPoints: entry.gameweekPoints || 0,
          captainName: '-', // Fast mode: no captain info
          captainPoints: 0,
          remainingPlayers: 0, // Fast mode: no remaining players count
          entryTime: entry.entryTime,
          rank: newRank,
          isDefault: false,
          leagueStatus: 'LIVE'
        };
      });

      // Execute batch rank updates in a single transaction
      if (rankUpdates.length > 0) {
        try {
          await prisma.$transaction(
            rankUpdates.map(update => 
              prisma.leagueEntry.update(update)
            )
          );
          console.log(`⚡ Batch updated ${rankUpdates.length} ranks in fast leaderboard`);
        } catch (error) {
          console.error(`❌ Error in batch rank update for fast leaderboard:`, error.message);
        }
      }

      console.log(`⚡ Fast leaderboard generated with ${leaderboardEntries.length} entries`);
      return leaderboardEntries;
    } catch (error) {
      console.error('Error getting fast leaderboard:', error);
      throw error;
    }
  }

  /**
   * Update leaderboard when new entry is added
   */
  static async updateLeaderboardOnEntry(leagueId) {
    try {
      console.log(`Updating leaderboard for league ${leagueId} after new entry`);
      
      // Get current leaderboard
      const leaderboardData = await this.getLeagueLeaderboard(leagueId);
      
      // If league hasn't started, just return the updated default leaderboard
      if (leaderboardData.status === 'NOT_STARTED') {
        return leaderboardData;
      }

      // If league has started, recalculate live leaderboard
      return await this.getLeagueLeaderboard(leagueId);

    } catch (error) {
      console.error('Error updating leaderboard on entry:', error);
      throw error;
    }
  }
}

module.exports = LeaderboardService;

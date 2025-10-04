// File: fpl-hub-backend/src/services/liveStandingsService.js
// Ultra-optimized live standings service with smart caching and change detection

const { PrismaClient } = require('@prisma/client');
const fplService = require('./fplService');
const socketService = require('./socketService');

const prisma = new PrismaClient();

// In-memory cache for optimization
const teamDataCache = new Map();
const lastUpdateCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

// Dynamic batch configuration
const DEFAULT_BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 20;
const DEFAULT_BATCH_DELAY = parseInt(process.env.BATCH_DELAY) || 200;

// Performance monitoring
const performanceMetrics = new Map();

// Cache cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, timestamp] of lastUpdateCache.entries()) {
    if (now - timestamp > CACHE_DURATION * 2) { // Clean up after 2x cache duration
      teamDataCache.delete(key);
      lastUpdateCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

class LiveStandingsService {
  /**
   * Calculate optimal batch size based on league size
   * @param {number} teamCount - Number of teams in the league
   * @returns {Object} Batch configuration with size and delay
   */
  static calculateOptimalBatchSize(teamCount) {
    let batchSize;
    let batchDelay = DEFAULT_BATCH_DELAY;
    
    if (teamCount < 100) {
      batchSize = 10;
    } else if (teamCount <= 1000) {
      batchSize = DEFAULT_BATCH_SIZE; // 20
    } else {
      batchSize = 50;
    }
    
    // Ensure batch size doesn't exceed team count
    batchSize = Math.min(batchSize, teamCount);
    
    return { batchSize, batchDelay };
  }

  /**
   * Record performance metrics for monitoring
   * @param {string} leagueId - League ID
   * @param {number} teamCount - Number of teams
   * @param {number} batchSize - Batch size used
   * @param {number} responseTime - Response time in ms
   * @param {number} totalBatches - Total number of batches
   */
  static recordPerformanceMetrics(leagueId, teamCount, batchSize, responseTime, totalBatches) {
    const key = `${leagueId}_${teamCount}`;
    const metrics = performanceMetrics.get(key) || {
      teamCount,
      batchSize,
      responseTimes: [],
      totalBatches: 0,
      lastUpdate: Date.now()
    };
    
    metrics.responseTimes.push(responseTime);
    metrics.totalBatches = totalBatches;
    metrics.lastUpdate = Date.now();
    
    // Keep only last 10 response times for rolling average
    if (metrics.responseTimes.length > 10) {
      metrics.responseTimes = metrics.responseTimes.slice(-10);
    }
    
    performanceMetrics.set(key, metrics);
  }

  /**
   * Get performance summary for a league
   * @param {string} leagueId - League ID
   * @param {number} teamCount - Number of teams
   * @returns {Object} Performance summary
   */
  static getPerformanceSummary(leagueId, teamCount) {
    const key = `${leagueId}_${teamCount}`;
    const metrics = performanceMetrics.get(key);
    
    if (!metrics || metrics.responseTimes.length === 0) {
      return { avgResponseTime: 0, mode: 'Unknown', batchSize: 0 };
    }
    
    const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    const mode = avgResponseTime < 1000 ? 'Stable' : avgResponseTime < 3000 ? 'Moderate' : 'Slow';
    
    return {
      avgResponseTime: Math.round(avgResponseTime),
      mode,
      batchSize: metrics.batchSize,
      totalBatches: metrics.totalBatches
    };
  }

  /**
   * Prepare for future auto-tuning: Analyze performance and suggest batch size adjustments
   * @param {string} leagueId - League ID
   * @param {number} teamCount - Number of teams
   * @returns {Object} Auto-tuning suggestions
   */
  static analyzePerformanceForAutoTuning(leagueId, teamCount) {
    const key = `${leagueId}_${teamCount}`;
    const metrics = performanceMetrics.get(key);
    
    if (!metrics || metrics.responseTimes.length < 5) {
      return { 
        suggestion: 'Insufficient data', 
        currentBatchSize: metrics?.batchSize || 0,
        recommendedBatchSize: 0,
        reason: 'Need at least 5 data points for analysis'
      };
    }
    
    const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    const currentBatchSize = metrics.batchSize;
    let recommendedBatchSize = currentBatchSize;
    let reason = '';
    
    // Auto-tuning logic: if response times degrade, shrink batch size; if stable, allow growth
    if (avgResponseTime > 5000) {
      // Very slow - reduce batch size significantly
      recommendedBatchSize = Math.max(5, Math.floor(currentBatchSize * 0.5));
      reason = 'Response time too slow (>5000ms) - reducing batch size';
    } else if (avgResponseTime > 3000) {
      // Slow - reduce batch size moderately
      recommendedBatchSize = Math.max(10, Math.floor(currentBatchSize * 0.75));
      reason = 'Response time slow (>3000ms) - reducing batch size';
    } else if (avgResponseTime < 1000 && currentBatchSize < 50) {
      // Fast and can grow - increase batch size
      recommendedBatchSize = Math.min(50, Math.floor(currentBatchSize * 1.25));
      reason = 'Response time fast (<1000ms) - increasing batch size';
    } else {
      // Stable - keep current size
      reason = 'Performance stable - maintaining current batch size';
    }
    
    return {
      suggestion: recommendedBatchSize !== currentBatchSize ? 'Adjust batch size' : 'Maintain current size',
      currentBatchSize,
      recommendedBatchSize,
      avgResponseTime: Math.round(avgResponseTime),
      reason,
      dataPoints: metrics.responseTimes.length
    };
  }

  /**
   * Broadcast live standings update via WebSocket
   * @param {Object} league - League object
   * @param {number} updatedCount - Number of entries updated
   * @param {number} batchSize - Batch size used
   * @param {number} totalBatches - Total number of batches
   * @param {number} responseTime - Response time in ms
   * @param {Object} perfSummary - Performance summary
   */
  static async broadcastLiveStandingsUpdate(league, updatedCount, batchSize, totalBatches, responseTime, perfSummary) {
    try {
      // Get updated entries for broadcasting
      const updatedEntries = await prisma.leagueEntry.findMany({
        where: { 
          leagueId: league.id,
          isActive: true 
        },
        include: {
          linkedTeam: true,
          user: true
        },
        orderBy: [
          { gameweekPoints: 'desc' },
          { entryTime: 'asc' }
        ]
      });

      // Prepare batch info for logging
      const batchInfo = {
        batchSize,
        totalBatches,
        responseTime,
        updatedCount,
        totalTeams: updatedEntries.length
      };

      // Prepare performance metrics
      const performanceMetrics = {
        avgResponseTime: perfSummary.avgResponseTime,
        mode: perfSummary.mode,
        batchSize: perfSummary.batchSize
      };

      // Broadcast via WebSocket
      await socketService.broadcastLiveStandings({
        leagueId: league.id,
        leagueName: league.name,
        updatedEntries: updatedEntries.slice(0, updatedCount), // Only send updated entries
        batchInfo,
        performanceMetrics,
        gameweekId: league.startGameweek
      });

      console.log(`📡 WebSocket broadcast sent for league ${league.name}: ${updatedCount} updates`);
    } catch (error) {
      console.error(`❌ Error broadcasting live standings for league ${league.id}:`, error.message);
    }
  }

  /**
   * Check if team data is cached and still valid
   * @param {number} fplTeamId - FPL team ID
   * @param {number} gameweekId - Gameweek ID
   * @returns {Object|null} Cached data or null if expired/missing
   */
  static getCachedTeamData(fplTeamId, gameweekId) {
    const cacheKey = `${fplTeamId}_${gameweekId}`;
    const cached = teamDataCache.get(cacheKey);
    const lastUpdate = lastUpdateCache.get(cacheKey);
    
    if (cached && lastUpdate && (Date.now() - lastUpdate) < CACHE_DURATION) {
      return cached;
    }
    return null;
  }

  /**
   * Cache team data with timestamp
   * @param {number} fplTeamId - FPL team ID
   * @param {number} gameweekId - Gameweek ID
   * @param {Object} data - Team data to cache
   */
  static setCachedTeamData(fplTeamId, gameweekId, data) {
    const cacheKey = `${fplTeamId}_${gameweekId}`;
    teamDataCache.set(cacheKey, data);
    lastUpdateCache.set(cacheKey, Date.now());
  }

  /**
   * Get teams that need updates (smart change detection)
   * @param {Array} entries - League entries
   * @param {number} gameweekId - Gameweek ID
   * @returns {Array} Teams that need updates
   */
  static async getTeamsNeedingUpdates(entries, gameweekId) {
    const teamsToUpdate = [];
    
    for (const entry of entries) {
      const cached = this.getCachedTeamData(entry.linkedTeam.fplTeamId, gameweekId);
      
      if (!cached) {
        // No cache, needs update
        teamsToUpdate.push(entry);
      } else {
        // Check if points might have changed (simple heuristic)
        const timeSinceLastUpdate = Date.now() - lastUpdateCache.get(`${entry.linkedTeam.fplTeamId}_${gameweekId}`);
        if (timeSinceLastUpdate > CACHE_DURATION) {
          teamsToUpdate.push(entry);
        }
      }
    }
    
    return teamsToUpdate;
  }

  /**
   * Update live standings for all active leagues in a gameweek (OPTIMIZED)
   * @param {number} gameweekId - The gameweek to update
   * @returns {Promise<Object>} Update result
   */
  static async updateLiveStandings(gameweekId) {
    try {
      console.log(`🚀 OPTIMIZED: Updating live standings for Gameweek ${gameweekId}...`);
      
      // Get all active leagues for this gameweek
      const leagues = await prisma.league.findMany({
        where: {
          startGameweek: gameweekId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        include: {
          entries: {
            where: { isActive: true },
            include: {
              linkedTeam: true
            }
          }
        }
      });

      if (leagues.length === 0) {
        console.log(`ℹ️  No active leagues found for Gameweek ${gameweekId}`);
        return { success: true, message: 'No leagues to update', updatedLeagues: 0 };
      }

      let totalUpdated = 0;
      let totalErrors = 0;
      let totalSkipped = 0;
      let totalCached = 0;

      // Process each league with smart optimization and dynamic batch sizing
      for (const league of leagues) {
        try {
          const teamCount = league.entries.length;
          console.log(`🔍 League: ${league.name} | Teams: ${teamCount}`);
          
          // Calculate optimal batch size based on league size
          const { batchSize, batchDelay } = this.calculateOptimalBatchSize(teamCount);
          const totalBatches = Math.ceil(teamCount / batchSize);
          
          console.log(`⚡ Batch size set to: ${batchSize} | Total batches: ${totalBatches}`);
          
          // Get teams that actually need updates
          const teamsToUpdate = await this.getTeamsNeedingUpdates(league.entries, gameweekId);
          const skippedCount = league.entries.length - teamsToUpdate.length;
          
          console.log(`📊 Smart filtering: ${teamsToUpdate.length} need updates, ${skippedCount} cached/skipped`);
          
          if (teamsToUpdate.length === 0) {
            console.log(`⚡ All teams cached - skipping league: ${league.name}`);
            totalSkipped += league.entries.length;
            continue;
          }

          // Record start time for performance monitoring
          const startTime = Date.now();
          
          // Update only teams that need it with dynamic batch size
          const updated = await this.updateLeagueStandingsOptimized(league, gameweekId, teamsToUpdate, batchSize, batchDelay);
          
          // Record performance metrics
          const responseTime = Date.now() - startTime;
          this.recordPerformanceMetrics(league.id, teamCount, batchSize, responseTime, totalBatches);
          
          // Get performance summary for logging
          const perfSummary = this.getPerformanceSummary(league.id, teamCount);
          console.log(`⏱ Avg response: ${perfSummary.avgResponseTime}ms | Mode: ${perfSummary.mode}`);
          
          // Broadcast live standings update via WebSocket
          if (updated > 0) {
            await this.broadcastLiveStandingsUpdate(league, updated, batchSize, totalBatches, responseTime, perfSummary);
          }
          
          totalUpdated += updated;
          totalSkipped += skippedCount;
          totalCached += skippedCount;
          
          console.log(`✅ League ${league.name}: ${updated} updated, ${skippedCount} cached`);
        } catch (error) {
          console.error(`❌ Error updating league ${league.name}:`, error.message);
          totalErrors++;
        }
      }

      console.log(`🎯 OPTIMIZED update complete: ${totalUpdated} updated, ${totalCached} cached, ${totalSkipped} skipped, ${totalErrors} errors`);
      
      return {
        success: true,
        message: `Updated ${totalUpdated} entries, cached ${totalCached}, skipped ${totalSkipped} across ${leagues.length} leagues`,
        updatedLeagues: leagues.length,
        updatedEntries: totalUpdated,
        cachedEntries: totalCached,
        skippedEntries: totalSkipped,
        errors: totalErrors
      };

    } catch (error) {
      console.error('❌ Error in updateLiveStandings:', error);
      throw error;
    }
  }

  /**
   * Update standings for a specific league (ULTRA-OPTIMIZED with dynamic batch fetching)
   * @param {Object} league - League object with entries
   * @param {number} gameweekId - The gameweek to update
   * @param {Array} teamsToUpdate - Teams that need updates
   * @param {number} batchSize - Dynamic batch size
   * @param {number} batchDelay - Delay between batches
   * @returns {Promise<number>} Number of entries updated
   */
  static async updateLeagueStandingsOptimized(league, gameweekId, teamsToUpdate, batchSize = DEFAULT_BATCH_SIZE, batchDelay = DEFAULT_BATCH_DELAY) {
    let updatedCount = 0;

    if (teamsToUpdate.length === 0) {
      return 0;
    }

    try {
      // BATCH FETCH: Get all team data in optimized batches with dynamic sizing
      const batchResults = await this.batchFetchTeamData(teamsToUpdate, gameweekId, batchSize, batchDelay);
      
      // BATCH UPDATE: Update all database entries in a single transaction
      const updateResults = await this.batchUpdateDatabaseEntries(batchResults);
      
      updatedCount = updateResults.updatedCount;
      
      console.log(`🔄 Batch processing complete: ${updatedCount}/${teamsToUpdate.length} updated`);
      
      // Update league rankings after points update
      if (updatedCount > 0) {
        await this.updateLeagueRankings(league.id);
      }

      return updatedCount;
    } catch (error) {
      console.error(`❌ Error in batch processing for league ${league.id}:`, error.message);
      // Fallback to individual processing if batch fails
      return await this.fallbackIndividualProcessing(teamsToUpdate, gameweekId);
    }
  }

  /**
   * Batch fetch team data from FPL API with dynamic batch sizing
   * @param {Array} teamsToUpdate - Teams that need updates
   * @param {number} gameweekId - Gameweek ID
   * @param {number} batchSize - Dynamic batch size
   * @param {number} batchDelay - Delay between batches
   * @returns {Promise<Array>} Batch results with team data
   */
  static async batchFetchTeamData(teamsToUpdate, gameweekId, batchSize = DEFAULT_BATCH_SIZE, batchDelay = DEFAULT_BATCH_DELAY) {
    const batchResults = [];
    const totalBatches = Math.ceil(teamsToUpdate.length / batchSize);
    
    // Group teams by dynamic batch size for optimal API usage
    for (let i = 0; i < teamsToUpdate.length; i += batchSize) {
      const batch = teamsToUpdate.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches}: ${batch.length} teams`);
      
      // Process batch with parallel API calls using Promise.allSettled for better error handling
      const batchPromises = batch.map(async (entry) => {
        try {
          // Check cache first
          const cached = this.getCachedTeamData(entry.linkedTeam.fplTeamId, gameweekId);
          if (cached) {
            console.log(`⚡ Using cached data for ${entry.linkedTeam.teamName}: ${cached.totalPoints} points`);
            return { entry, liveData: cached, updated: false, cached: true };
          }

          // Get live points from FPL API
          const liveData = await this.getLiveTeamPoints(entry.linkedTeam.fplTeamId, gameweekId);
          
          // Cache the data
          this.setCachedTeamData(entry.linkedTeam.fplTeamId, gameweekId, liveData);
          
          return { entry, liveData, updated: false, cached: false };
        } catch (error) {
          console.error(`❌ Error fetching data for team ${entry.linkedTeam.teamName}:`, error.message);
          return { entry, liveData: null, updated: false, error: error.message };
        }
      });

      // Wait for batch to complete with Promise.allSettled for better error handling
      const batchData = await Promise.allSettled(batchPromises);
      
      // Process results, handling both fulfilled and rejected promises
      const processedBatchData = batchData.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`❌ Batch promise rejected for team ${batch[index].linkedTeam.teamName}:`, result.reason);
          return { 
            entry: batch[index], 
            liveData: null, 
            updated: false, 
            error: result.reason?.message || 'Unknown error' 
          };
        }
      });
      
      batchResults.push(...processedBatchData);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < teamsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    return batchResults;
  }

  /**
   * Batch update database entries with optimized Prisma operations
   * @param {Array} batchResults - Results from batch fetch
   * @returns {Promise<Object>} Update results
   */
  static async batchUpdateDatabaseEntries(batchResults) {
    const updates = [];
    let updatedCount = 0;

    // Prepare batch updates
    for (const result of batchResults) {
      if (result.liveData && result.liveData.totalPoints !== result.entry.gameweekPoints) {
        updates.push({
          where: { id: result.entry.id },
          data: { gameweekPoints: result.liveData.totalPoints }
        });
        
        console.log(`📊 Queued update for ${result.entry.linkedTeam.teamName}: ${result.entry.gameweekPoints} → ${result.liveData.totalPoints} points`);
      } else if (result.liveData) {
        console.log(`📊 No change for ${result.entry.linkedTeam.teamName}: ${result.entry.gameweekPoints} points`);
      }
    }

    // Execute batch updates in a single transaction
    if (updates.length > 0) {
      try {
        await prisma.$transaction(
          updates.map(update => 
            prisma.leagueEntry.update(update)
          )
        );
        updatedCount = updates.length;
        console.log(`✅ Batch updated ${updatedCount} entries in single transaction`);
      } catch (error) {
        console.error(`❌ Error in batch database update:`, error.message);
        throw error;
      }
    }

    return { updatedCount, totalProcessed: batchResults.length };
  }

  /**
   * Fallback to individual processing if batch processing fails
   * @param {Array} teamsToUpdate - Teams that need updates
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<number>} Number of entries updated
   */
  static async fallbackIndividualProcessing(teamsToUpdate, gameweekId) {
    console.log(`🔄 Falling back to individual processing for ${teamsToUpdate.length} teams`);
    let updatedCount = 0;

    for (const entry of teamsToUpdate) {
      try {
        const liveData = await this.getLiveTeamPoints(entry.linkedTeam.fplTeamId, gameweekId);
        
        if (liveData.totalPoints !== entry.gameweekPoints) {
          await prisma.leagueEntry.update({
            where: { id: entry.id },
            data: { gameweekPoints: liveData.totalPoints }
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error in fallback processing for team ${entry.linkedTeam.teamName}:`, error.message);
      }
    }

    return updatedCount;
  }

  /**
   * Update standings for a specific league (LEGACY - kept for compatibility)
   * @param {Object} league - League object with entries
   * @param {number} gameweekId - The gameweek to update
   * @returns {Promise<number>} Number of entries updated
   */
  static async updateLeagueStandings(league, gameweekId) {
    // Use optimized version
    return await this.updateLeagueStandingsOptimized(league, gameweekId, league.entries);
  }

  /**
   * Get live points for a team from FPL API (always use team-specific endpoint)
   * @param {number} fplTeamId - FPL team ID
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<Object>} Live team data with points, captain info, etc.
   */
  static async getLiveTeamPoints(fplTeamId, gameweekId) {
    try {
      console.log(`🔄 Getting live data for Team ${fplTeamId} using team-specific endpoint...`);
      
      const axios = require('axios');
      
      // Get team's picks for this gameweek
      const teamResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${fplTeamId}/event/${gameweekId}/picks/`);
      
      if (!teamResponse.data || !teamResponse.data.picks) {
        console.warn(`⚠️  No picks data for team ${fplTeamId} in Gameweek ${gameweekId}`);
        return { totalPoints: 0, captainPoints: 0, captainId: null, viceCaptainId: null };
      }

      // Get live player data for this gameweek
      const livePlayerData = await fplService.getLiveGameweekData(gameweekId);
      
      if (!livePlayerData || !livePlayerData.elements) {
        console.warn(`⚠️  No live player data available for Gameweek ${gameweekId}`);
        return { totalPoints: 0, captainPoints: 0, captainId: null, viceCaptainId: null };
      }

      let totalPoints = 0;
      let captainPoints = 0;
      let captainId = null;
      let viceCaptainId = null;
      
      // Find captain and vice-captain
      const captain = teamResponse.data.picks.find(p => p.is_captain);
      const viceCaptain = teamResponse.data.picks.find(p => p.is_vice_captain);
      
      if (captain) captainId = captain.element;
      if (viceCaptain) viceCaptainId = viceCaptain.element;
      
      // Calculate points for each player in the team (ONLY starting 11, not bench)
      // FPL picks array: positions 1-11 are starting 11, positions 12-15 are bench
      const starting11Picks = teamResponse.data.picks.slice(0, 11);
      
      for (const pick of starting11Picks) {
        const playerData = livePlayerData.elements.find(p => p.id === pick.element);
        if (playerData && playerData.stats) {
          let playerPoints = playerData.stats.total_points || 0;
          let isCaptain = pick.is_captain;
          let isViceCaptain = pick.is_vice_captain;
          
          // Check if captain played, if not use vice-captain
          if (isCaptain && playerPoints === 0) {
            // Captain didn't play, check if vice-captain should be used
            const viceCaptainPick = teamResponse.data.picks.find(p => p.is_vice_captain);
            if (viceCaptainPick) {
              const viceCaptainData = livePlayerData.elements.find(p => p.id === viceCaptainPick.element);
              if (viceCaptainData && viceCaptainData.stats && viceCaptainData.stats.total_points > 0) {
                isCaptain = false;
                isViceCaptain = true;
                playerPoints = viceCaptainData.stats.total_points;
              }
            }
          }
          
          // Apply captain/vice-captain multiplier
          if (isCaptain) {
            playerPoints *= 2;
            captainPoints = playerPoints;
          } else if (isViceCaptain && !captain) {
            playerPoints *= 2;
            captainPoints = playerPoints;
          }
          
          totalPoints += playerPoints;
        }
      }
      
      console.log(`📊 Team ${fplTeamId} calculated: ${totalPoints} total points, ${captainPoints} captain points`);
      return { 
        totalPoints, 
        captainPoints, 
        captainId, 
        viceCaptainId 
      };
    } catch (error) {
      console.error(`❌ Error getting live points for team ${fplTeamId}:`, error.message);
      return { totalPoints: 0, captainPoints: 0, captainId: null, viceCaptainId: null };
    }
  }

  /**
   * Update league rankings based on current points (BATCH OPTIMIZED)
   * @param {string} leagueId - League ID
   * @returns {Promise<void>}
   */
  static async updateLeagueRankings(leagueId) {
    try {
      // Get all entries ordered by points (desc) and entry time (asc)
      const entries = await prisma.leagueEntry.findMany({
        where: { 
          leagueId, 
          isActive: true 
        },
        orderBy: [
          { gameweekPoints: 'desc' },
          { entryTime: 'asc' }
        ]
      });

      if (entries.length === 0) {
        console.log(`📈 No entries to rank for league ${leagueId}`);
        return;
      }

      // Prepare batch ranking updates
      const rankingUpdates = entries.map((entry, index) => ({
        where: { id: entry.id },
        data: {
          previousRank: entry.rank,
          rank: index + 1
        }
      }));

      // Execute all ranking updates in a single transaction
      await prisma.$transaction(
        rankingUpdates.map(update => 
          prisma.leagueEntry.update(update)
        )
      );

      console.log(`📈 Batch updated rankings for league ${leagueId}: ${entries.length} entries in single transaction`);
    } catch (error) {
      console.error(`❌ Error updating rankings for league ${leagueId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a gameweek is currently live (matches are in progress)
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<boolean>} True if gameweek is live
   */
  static async isGameweekLive(gameweekId) {
    try {
      // Get gameweek data
      const gameweek = await fplService.getGameweekById(gameweekId);
      
      if (!gameweek) {
        return false;
      }

      const now = new Date();
      const deadline = new Date(gameweek.deadline_time);
      
      // Gameweek is live if deadline has passed but gameweek hasn't finished
      // We'll consider it finished 3 days after deadline (same as current logic)
      const endTime = new Date(deadline.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      return now > deadline && now < endTime;
    } catch (error) {
      console.error('❌ Error checking if gameweek is live:', error.message);
      return false;
    }
  }

  /**
   * Get current live gameweek (if any)
   * @returns {Promise<number|null>} Current live gameweek ID or null
   */
  static async getCurrentLiveGameweek() {
    try {
      const currentGameweek = await fplService.getCurrentGameweek();
      
      if (await this.isGameweekLive(currentGameweek.id)) {
        return currentGameweek.id;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting current live gameweek:', error.message);
      return null;
    }
  }
}

module.exports = LiveStandingsService;

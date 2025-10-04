// File: fpl-hub-backend/src/services/optimizedLiveStandingsService.js
// Ultra-optimized live standings service with bulk operations, concurrency control, and incremental updates

const { PrismaClient } = require('@prisma/client');
const pLimit = require('p-limit').default;
const optimizedFplService = require('./optimizedFplService');
const socketService = require('./socketService');

const prisma = new PrismaClient();

class OptimizedLiveStandingsService {
  constructor() {
    // Concurrency control
    this.concurrencyLimit = pLimit(parseInt(process.env.STANDINGS_CONCURRENCY_LIMIT) || 5);
    
    // Performance tracking
    this.performanceMetrics = new Map();
    this.batchSizeHistory = new Map();
    
    // Cache for league configurations
    this.leagueConfigs = new Map();
    
    // Initialize batch size optimization
    this.initializeBatchSizeOptimization();
  }

  /**
   * Initialize batch size optimization from database
   */
  async initializeBatchSizeOptimization() {
    try {
      const configs = await prisma.leagueConfiguration.findMany({
        select: {
          leagueId: true,
          optimalBatchSize: true,
          lastOptimizedAt: true
        }
      });

      configs.forEach(config => {
        this.leagueConfigs.set(config.leagueId, {
          batchSize: config.optimalBatchSize || 20,
          lastOptimized: config.lastOptimizedAt
        });
      });

      console.log(`📊 Loaded batch configurations for ${configs.length} leagues`);
    } catch (error) {
      console.error('Failed to load league configurations:', error);
    }
  }

  /**
   * Get optimal batch size for a league
   */
  getOptimalBatchSize(leagueId, teamCount) {
    const config = this.leagueConfigs.get(leagueId);
    
    if (config && config.batchSize) {
      return config.batchSize;
    }

    // Calculate optimal batch size based on team count
    let batchSize;
    if (teamCount < 50) {
      batchSize = Math.min(teamCount, 10);
    } else if (teamCount < 200) {
      batchSize = Math.min(teamCount, 20);
    } else if (teamCount < 500) {
      batchSize = Math.min(teamCount, 30);
    } else {
      batchSize = Math.min(teamCount, 50);
    }

    return batchSize;
  }

  /**
   * Update optimal batch size for a league
   */
  async updateOptimalBatchSize(leagueId, batchSize, performance) {
    try {
      await prisma.leagueConfiguration.upsert({
        where: { leagueId },
        update: {
          optimalBatchSize: batchSize,
          lastOptimizedAt: new Date(),
          lastPerformance: performance
        },
        create: {
          leagueId,
          optimalBatchSize: batchSize,
          lastOptimizedAt: new Date(),
          lastPerformance: performance
        }
      });

      this.leagueConfigs.set(leagueId, {
        batchSize,
        lastOptimized: new Date()
      });

      console.log(`📈 Updated optimal batch size for league ${leagueId}: ${batchSize} (performance: ${performance}ms/team)`);
    } catch (error) {
      console.error('Failed to update batch size configuration:', error);
    }
  }

  /**
   * Update live standings for a league with optimized batch processing
   */
  async updateLiveStandings(leagueId) {
    const startTime = Date.now();
    const league = await this.getLeagueWithEntries(leagueId);
    
    if (!league || !league.entries || league.entries.length === 0) {
      console.log(`⚠️ No entries found for league ${leagueId}`);
      return { updated: 0, errors: 0 };
    }

    const teamCount = league.entries.length;
    const batchSize = this.getOptimalBatchSize(leagueId, teamCount);
    
    console.log(`🚀 Starting live standings update for league ${league.name} (${teamCount} teams, batch size: ${batchSize})`);

    try {
      // Get shared live player data
      const livePlayerData = await optimizedFplService.getSharedLivePlayerData(league.startGameweek);
      
      // Process teams in optimized batches
      const results = await this.processTeamsInBatches(
        league.entries,
        livePlayerData,
        batchSize,
        leagueId
      );

      // Calculate performance metrics
      const totalTime = Date.now() - startTime;
      const performancePerTeam = totalTime / teamCount;
      
      // Update batch size optimization if performance is poor
      if (performancePerTeam > 1000) { // More than 1 second per team
        const newBatchSize = Math.max(5, Math.floor(batchSize * 0.8));
        await this.updateOptimalBatchSize(leagueId, newBatchSize, performancePerTeam);
      } else if (performancePerTeam < 200 && batchSize < 50) { // Less than 200ms per team
        const newBatchSize = Math.min(50, Math.floor(batchSize * 1.2));
        await this.updateOptimalBatchSize(leagueId, newBatchSize, performancePerTeam);
      }

      // Log performance metrics
      this.logPerformanceMetrics(leagueId, {
        teamCount,
        batchSize,
        totalTime,
        performancePerTeam,
        updated: results.updated,
        errors: results.errors
      });

      // Broadcast incremental updates
      if (results.updated > 0) {
        await this.broadcastIncrementalUpdates(league, results.updates);
      }

      return results;
    } catch (error) {
      console.error(`❌ Failed to update live standings for league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Process teams in optimized batches with concurrency control
   */
  async processTeamsInBatches(entries, livePlayerData, batchSize, leagueId) {
    const updates = [];
    const errors = [];
    let updated = 0;

    // Group teams by batch
    const batches = [];
    for (let i = 0; i < entries.length; i += batchSize) {
      batches.push(entries.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches of up to ${batchSize} teams each`);

    // Process batches with concurrency control
    const batchPromises = batches.map(async (batch, batchIndex) => {
      return this.concurrencyLimit(async () => {
        const batchStartTime = Date.now();
        
        try {
          // Extract team IDs for batch fetch
          const teamIds = batch.map(entry => entry.linkedTeam.fplTeamId);
          
          // Batch fetch team data
          const { results: teamDataMap, errors: fetchErrors } = await optimizedFplService.batchFetchTeamData(
            teamIds,
            livePlayerData.gameweekId
          );

          // Process each team in the batch
          const batchUpdates = [];
          for (const entry of batch) {
            try {
              const teamData = teamDataMap.get(entry.linkedTeam.fplTeamId);
              if (!teamData) {
                errors.push({ teamId: entry.linkedTeam.fplTeamId, error: 'No team data fetched' });
                continue;
              }

              // Calculate points using shared live data
              const pointsData = optimizedFplService.calculateTeamPoints(teamData, livePlayerData);
              
              // Check if update is needed
              const currentPoints = entry.gameweekPoints || 0;
              const newPoints = pointsData.gameweekPoints;
              
              if (Math.abs(newPoints - currentPoints) > 0.1) { // Only update if significant change
                batchUpdates.push({
                  id: entry.id,
                  gameweekPoints: newPoints,
                  totalPoints: (entry.totalPoints || 0) + (newPoints - currentPoints)
                });
                updated++;
              }
            } catch (error) {
              console.error(`Error processing team ${entry.linkedTeam.fplTeamId}:`, error);
              errors.push({ teamId: entry.linkedTeam.fplTeamId, error: error.message });
            }
          }

          // Bulk update database
          if (batchUpdates.length > 0) {
            await this.bulkUpdateLeagueEntries(batchUpdates);
            updates.push(...batchUpdates);
          }

          const batchTime = Date.now() - batchStartTime;
          console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed: ${batchUpdates.length} updates in ${batchTime}ms`);

          return { updated: batchUpdates.length, errors: fetchErrors.length };
        } catch (error) {
          console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
          return { updated: 0, errors: batch.length };
        }
      });
    });

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Aggregate results
    const totalUpdated = batchResults.reduce((sum, result) => sum + result.updated, 0);
    const totalErrors = batchResults.reduce((sum, result) => sum + result.errors, 0);

    return { updated: totalUpdated, errors: totalErrors, updates };
  }

  /**
   * Bulk update league entries using raw SQL for maximum performance
   */
  async bulkUpdateLeagueEntries(updates) {
    if (updates.length === 0) return;

    try {
      // Use raw SQL for bulk updates
      const updatePromises = updates.map(update => 
        prisma.$executeRaw`
          UPDATE "LeagueEntry" 
          SET 
            "gameweekPoints" = ${update.gameweekPoints},
            "totalPoints" = ${update.totalPoints},
            "lastUpdated" = ${update.lastUpdated}
          WHERE "id" = ${update.id}
        `
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Bulk update failed, falling back to individual updates:', error);
      
      // Fallback to individual updates
      for (const update of updates) {
        try {
          await prisma.leagueEntry.update({
            where: { id: update.id },
            data: {
              gameweekPoints: update.gameweekPoints,
              totalPoints: update.totalPoints
            }
          });
        } catch (updateError) {
          console.error(`Failed to update entry ${update.id}:`, updateError);
        }
      }
    }
  }

  /**
   * Broadcast incremental updates via WebSocket
   */
  async broadcastIncrementalUpdates(league, updates) {
    try {
      // Get updated standings
      const updatedEntries = await this.getUpdatedLeagueEntries(league.id, updates.map(u => u.id));
      
      // Create incremental diff
      const diff = {
        leagueId: league.id,
        leagueName: league.name,
        gameweekId: league.startGameweek,
        updatedEntries: updatedEntries.map(entry => ({
          id: entry.id,
          teamName: entry.linkedTeam.teamName,
          gameweekPoints: entry.gameweekPoints,
          totalPoints: entry.totalPoints,
          rank: entry.rank,
          previousRank: entry.previousRank
        })),
        timestamp: new Date().toISOString()
      };

      // Broadcast to league-specific room
      socketService.broadcastToLeague(league.id, 'live-standings-update', diff);
      
      console.log(`📡 Broadcasted incremental update for league ${league.name}: ${updates.length} changes`);
    } catch (error) {
      console.error('Failed to broadcast incremental updates:', error);
    }
  }

  /**
   * Get updated league entries with rankings
   */
  async getUpdatedLeagueEntries(leagueId, entryIds) {
    const entries = await prisma.leagueEntry.findMany({
      where: {
        leagueId,
        id: { in: entryIds }
      },
      include: {
        linkedTeam: {
          select: {
            teamName: true,
            fplTeamId: true
          }
        }
      },
      orderBy: {
        totalPoints: 'desc'
      }
    });

    // Calculate rankings
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  /**
   * Get league with entries
   */
  async getLeagueWithEntries(leagueId) {
    return prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        entries: {
          include: {
            linkedTeam: {
              select: {
                fplTeamId: true,
                teamName: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(leagueId, metrics) {
    const logData = {
      leagueId,
      timestamp: new Date().toISOString(),
      ...metrics
    };

    console.log(`📊 Performance metrics for league ${leagueId}:`, {
      teams: metrics.teamCount,
      batchSize: metrics.batchSize,
      totalTime: `${metrics.totalTime}ms`,
      perTeam: `${metrics.performancePerTeam}ms`,
      updated: metrics.updated,
      errors: metrics.errors
    });

    // Store metrics for analysis
    this.performanceMetrics.set(`${leagueId}-${Date.now()}`, logData);
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(leagueId = null) {
    if (leagueId) {
      const leagueMetrics = Array.from(this.performanceMetrics.entries())
        .filter(([key]) => key.startsWith(leagueId))
        .map(([key, value]) => value);
      
      return leagueMetrics;
    }

    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Clean up old performance metrics
   */
  cleanupMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, value] of this.performanceMetrics.entries()) {
      if (value.timestamp && new Date(value.timestamp).getTime() < cutoff) {
        this.performanceMetrics.delete(key);
      }
    }
  }
}

module.exports = new OptimizedLiveStandingsService();

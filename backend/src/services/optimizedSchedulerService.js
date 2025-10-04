// File: fpl-hub-backend/src/services/optimizedSchedulerService.js
// Optimized scheduler service for coordinating all live services

const optimizedLiveStandingsService = require('./optimizedLiveStandingsService');
const optimizedLiveScoringService = require('./optimizedLiveScoringService');
const performanceMonitoringService = require('./performanceMonitoringService');
const gameweekLifecycleService = require('./gameweekLifecycleService');
const automaticLeagueService = require('./automaticLeagueService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class OptimizedSchedulerService {
  constructor() {
    this.isRunning = false;
    this.schedulerInterval = null;
    this.updateInterval = 30000; // 30 seconds
    this.lastUpdate = null;
    this.activeLeagues = new Set();
    this.leagueUpdateTimes = new Map();
    
    // Performance tracking
    this.schedulerMetrics = {
      totalCycles: 0,
      successfulCycles: 0,
      failedCycles: 0,
      avgCycleTime: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Start the optimized scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Optimized scheduler is already running');
      return;
    }

    try {
      console.log('🚀 Starting optimized scheduler service...');
      
      // Start live scoring service
      await optimizedLiveScoringService.start();
      
      // Start performance monitoring
      performanceMonitoringService.start();
      
      // Load active leagues
      await this.loadActiveLeagues();
      
      // Start scheduler
      this.isRunning = true;
      this.startScheduler();
      
      console.log('✅ Optimized scheduler service started');
    } catch (error) {
      console.error('❌ Failed to start optimized scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the optimized scheduler
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Optimized scheduler is not running');
      return;
    }

    console.log('🛑 Stopping optimized scheduler service...');
    
    this.isRunning = false;
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    // Stop live scoring service
    optimizedLiveScoringService.stop();
    
    // Stop performance monitoring
    performanceMonitoringService.stop();
    
    console.log('✅ Optimized scheduler service stopped');
  }

  /**
   * Load active leagues from database
   */
  async loadActiveLeagues() {
    try {
      const leagues = await prisma.league.findMany({
        where: {
          leagueState: {
            in: ['OPEN_FOR_ENTRY', 'IN_PROGRESS', 'WAITING_FOR_UPDATES']
          },
          startGameweek: {
            lte: await this.getCurrentGameweek()
          }
        },
        select: {
          id: true,
          name: true,
          startGameweek: true,
          _count: {
            select: {
              leagueEntries: true
            }
          }
        }
      });

      this.activeLeagues.clear();
      leagues.forEach(league => {
        this.activeLeagues.add(league.id);
        console.log(`📊 Loaded league: ${league.name} (${league._count.leagueEntries} teams)`);
      });

      console.log(`📊 Loaded ${leagues.length} active leagues`);
    } catch (error) {
      console.error('Failed to load active leagues:', error);
    }
  }

  /**
   * Get current gameweek
   */
  async getCurrentGameweek() {
    try {
      const optimizedFplService = require('./optimizedFplService');
      return await optimizedFplService.getCurrentGameweekId();
    } catch (error) {
      console.error('Failed to get current gameweek:', error);
      return null;
    }
  }

  /**
   * Start the scheduler
   */
  startScheduler() {
    // Start immediate update
    this.performScheduledUpdate();

    // Set up regular updates
    this.schedulerInterval = setInterval(() => {
      this.performScheduledUpdate();
    }, this.updateInterval);
  }

  /**
   * Perform scheduled update
   */
  async performScheduledUpdate() {
    const startTime = Date.now();
    
    try {
      this.schedulerMetrics.totalCycles++;
      
      console.log(`🔄 Starting scheduler cycle ${this.schedulerMetrics.totalCycles}`);
      
      // 1. Process automatic league management (gameweek transitions)
      try {
        await automaticLeagueService.processAutomaticLeagueManagement();
      } catch (error) {
        console.error('❌ Error in automatic league management:', error.message);
      }
      
      // 2. Update gameweek lifecycle states for all leagues
      try {
        await this.updateGameweekLifecycleStates();
      } catch (error) {
        console.error('❌ Error updating gameweek lifecycle states:', error.message);
      }
      
      // 3. Update live standings for all active leagues
      const updatePromises = Array.from(this.activeLeagues).map(leagueId => 
        this.updateLeagueStandings(leagueId)
      );

      // Wait for all league updates to complete
      const results = await Promise.allSettled(updatePromises);
      
      // Process results
      let successful = 0;
      let failed = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful++;
        } else {
          failed++;
          console.error(`League update failed:`, result.reason);
        }
      });

      // Update metrics
      const cycleTime = Date.now() - startTime;
      this.schedulerMetrics.avgCycleTime = (this.schedulerMetrics.avgCycleTime + cycleTime) / 2;
      
      if (failed === 0) {
        this.schedulerMetrics.successfulCycles++;
      } else {
        this.schedulerMetrics.failedCycles++;
      }

      this.lastUpdate = new Date();
      
      console.log(`✅ Scheduler cycle completed: ${successful} successful, ${failed} failed in ${cycleTime}ms`);
      
    } catch (error) {
      console.error('❌ Scheduler cycle failed:', error);
      this.schedulerMetrics.failedCycles++;
    }
  }

  /**
   * Update standings for a specific league
   */
  async updateLeagueStandings(leagueId) {
    try {
      // Check if league needs update (throttle updates)
      const lastUpdate = this.leagueUpdateTimes.get(leagueId);
      const now = Date.now();
      
      if (lastUpdate && (now - lastUpdate) < 15000) { // 15 second throttle
        return { leagueId, status: 'throttled' };
      }

      // Update league standings
      const result = await optimizedLiveStandingsService.updateLiveStandings(leagueId);
      
      // Update last update time
      this.leagueUpdateTimes.set(leagueId, now);
      
      return { leagueId, status: 'success', result };
    } catch (error) {
      console.error(`Failed to update league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Update gameweek lifecycle states for all leagues
   */
  async updateGameweekLifecycleStates() {
    try {
      console.log('🔄 Updating gameweek lifecycle states...');
      
      // Get all leagues that need state updates
      const leagues = await prisma.league.findMany({
        where: {
          leagueState: {
            in: ['OPEN_FOR_ENTRY', 'IN_PROGRESS', 'WAITING_FOR_UPDATES']
          }
        },
        select: {
          id: true,
          name: true,
          startGameweek: true,
          leagueState: true
        }
      });

      console.log(`📊 Found ${leagues.length} leagues to check for state updates`);

      // Update states for each league
      const updatePromises = leagues.map(async (league) => {
        try {
          const result = await gameweekLifecycleService.updateLeagueState(league.id);
          if (result.stateChanged) {
            console.log(`✅ League ${league.name} (GW${league.startGameweek}) state updated: ${result.currentState}`);
          }
          return result;
        } catch (error) {
          console.error(`❌ Failed to update state for league ${league.id}:`, error.message);
          return { leagueId: league.id, error: error.message };
        }
      });

      const results = await Promise.allSettled(updatePromises);
      
      let updated = 0;
      let errors = 0;
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.stateChanged) {
          updated++;
        } else if (result.status === 'rejected' || result.value.error) {
          errors++;
        }
      });

      console.log(`✅ Gameweek lifecycle update completed: ${updated} leagues updated, ${errors} errors`);
      
    } catch (error) {
      console.error('❌ Error updating gameweek lifecycle states:', error.message);
      throw error;
    }
  }

  /**
   * Add a league to active monitoring
   */
  async addLeague(leagueId) {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          name: true,
          leagueState: true,
          _count: {
            select: {
              leagueEntries: true
            }
          }
        }
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      if (!['OPEN_FOR_ENTRY', 'IN_PROGRESS', 'WAITING_FOR_UPDATES'].includes(league.leagueState)) {
        throw new Error(`League ${leagueId} is not active (state: ${league.leagueState})`);
      }

      this.activeLeagues.add(leagueId);
      console.log(`📊 Added league to monitoring: ${league.name} (${league._count.leagueEntries} teams)`);
      
      return { success: true, league };
    } catch (error) {
      console.error(`Failed to add league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a league from active monitoring
   */
  async removeLeague(leagueId) {
    try {
      this.activeLeagues.delete(leagueId);
      this.leagueUpdateTimes.delete(leagueId);
      
      console.log(`📊 Removed league from monitoring: ${leagueId}`);
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to remove league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeLeagues: Array.from(this.activeLeagues),
      lastUpdate: this.lastUpdate,
      updateInterval: this.updateInterval,
      metrics: this.schedulerMetrics
    };
  }

  /**
   * Get scheduler metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.schedulerMetrics.lastReset;
    const successRate = this.schedulerMetrics.totalCycles > 0 
      ? (this.schedulerMetrics.successfulCycles / this.schedulerMetrics.totalCycles) * 100 
      : 0;

    return {
      ...this.schedulerMetrics,
      uptime,
      successRate: Math.round(successRate * 100) / 100,
      activeLeagues: this.activeLeagues.size
    };
  }

  /**
   * Reset scheduler metrics
   */
  resetMetrics() {
    this.schedulerMetrics = {
      totalCycles: 0,
      successfulCycles: 0,
      failedCycles: 0,
      avgCycleTime: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Force update for a specific league
   */
  async forceUpdateLeague(leagueId) {
    try {
      console.log(`🔄 Force updating league ${leagueId}...`);
      
      const result = await optimizedLiveStandingsService.updateLiveStandings(leagueId);
      
      console.log(`✅ Force update completed for league ${leagueId}: ${result.updated} updates`);
      
      return result;
    } catch (error) {
      console.error(`Failed to force update league ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Get league update history
   */
  getLeagueUpdateHistory() {
    const history = [];
    
    for (const [leagueId, lastUpdate] of this.leagueUpdateTimes.entries()) {
      history.push({
        leagueId,
        lastUpdate: new Date(lastUpdate),
        timeSinceUpdate: Date.now() - lastUpdate
      });
    }
    
    return history.sort((a, b) => b.lastUpdate - a.lastUpdate);
  }
}

module.exports = new OptimizedSchedulerService();

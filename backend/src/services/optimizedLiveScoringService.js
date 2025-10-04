// File: fpl-hub-backend/src/services/optimizedLiveScoringService.js
// Ultra-optimized live scoring service with shared caching and efficient updates

const optimizedFplService = require('./optimizedFplService');
const socketService = require('./socketService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class OptimizedLiveScoringService {
  constructor() {
    this.isRunning = false;
    this.pollingInterval = null;
    this.currentGameweek = null;
    this.updateInterval = 30000; // 30 seconds
    this.lastLiveData = null;
    this.lastUpdateTime = null;
    
    // Performance tracking
    this.metrics = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      avgUpdateTime: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Start the optimized live scoring service
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Live scoring service is already running');
      return;
    }

    try {
      console.log('🚀 Starting optimized live scoring service...');
      
      // Get current gameweek
      this.currentGameweek = await optimizedFplService.getCurrentGameweekId();
      
      if (!this.currentGameweek) {
        console.log('📺 No current gameweek found. Service will monitor for live games.');
        this.isRunning = true;
        this.startMonitoring();
        return;
      }

      // Check for live fixtures
      const hasLiveFixtures = await this.checkForLiveFixtures();
      
      if (!hasLiveFixtures) {
        console.log('📺 No live fixtures found. Service will monitor for live games.');
        this.isRunning = true;
        this.startMonitoring();
        return;
      }

      // Start live scoring
      this.isRunning = true;
      this.startLiveScoring();
      
      // Update socket service status
      socketService.updateLiveStatus(true, this.currentGameweek);
      
      console.log(`🎯 Optimized live scoring started for Gameweek ${this.currentGameweek}`);
    } catch (error) {
      console.error('❌ Failed to start live scoring service:', error);
      throw error;
    }
  }

  /**
   * Stop the live scoring service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Live scoring service is not running');
      return;
    }

    console.log('🛑 Stopping live scoring service...');
    
    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Update socket service status
    socketService.updateLiveStatus(false, this.currentGameweek);
    
    console.log('✅ Live scoring service stopped');
  }

  /**
   * Check for live fixtures
   */
  async checkForLiveFixtures() {
    try {
      const fixtures = await optimizedFplService.getGameweekFixtures(this.currentGameweek);
      
      // Check if any fixtures are live
      const liveFixtures = fixtures.filter(fixture => 
        fixture.finished === false && 
        fixture.started === true
      );

      return liveFixtures.length > 0;
    } catch (error) {
      console.error('Error checking for live fixtures:', error);
      return false;
    }
  }

  /**
   * Start monitoring for live games
   */
  startMonitoring() {
    this.pollingInterval = setInterval(async () => {
      try {
        const hasLiveFixtures = await this.checkForLiveFixtures();
        
        if (hasLiveFixtures) {
          console.log('🎮 Live fixtures detected! Starting live scoring...');
          this.startLiveScoring();
        }
      } catch (error) {
        console.error('Error monitoring for live fixtures:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Start live scoring updates
   */
  startLiveScoring() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Start immediate update
    this.performLiveUpdate();

    // Set up regular updates
    this.pollingInterval = setInterval(() => {
      this.performLiveUpdate();
    }, this.updateInterval);
  }

  /**
   * Perform live scoring update
   */
  async performLiveUpdate() {
    const startTime = Date.now();
    
    try {
      this.metrics.totalUpdates++;
      
      // Get shared live player data
      const liveData = await optimizedFplService.getSharedLivePlayerData(this.currentGameweek);
      
      // Check if data has changed significantly
      if (this.hasSignificantChanges(liveData)) {
        console.log('🔄 Significant changes detected, updating live scores...');
        
        // Broadcast live scores to all connected clients
        await this.broadcastLiveScores(liveData);
        
        this.lastLiveData = liveData;
        this.lastUpdateTime = Date.now();
        this.metrics.successfulUpdates++;
      } else {
        console.log('📊 No significant changes detected, skipping update');
      }

      // Update metrics
      const updateTime = Date.now() - startTime;
      this.metrics.avgUpdateTime = (this.metrics.avgUpdateTime + updateTime) / 2;

    } catch (error) {
      console.error('❌ Live scoring update failed:', error);
      this.metrics.failedUpdates++;
    }
  }

  /**
   * Check if there are significant changes in live data
   */
  hasSignificantChanges(newData) {
    if (!this.lastLiveData) {
      return true; // First update
    }

    // Check if any player scores have changed significantly
    const significantChanges = newData.players.some(newPlayer => {
      const oldPlayer = this.lastLiveData.players.find(p => p.id === newPlayer.id);
      
      if (!oldPlayer) {
        return true; // New player
      }

      // Check for significant point changes
      const newPoints = newPlayer.stats?.total_points || 0;
      const oldPoints = oldPlayer.stats?.total_points || 0;
      
      return Math.abs(newPoints - oldPoints) > 0.1;
    });

    return significantChanges;
  }

  /**
   * Broadcast live scores to connected clients
   */
  async broadcastLiveScores(liveData) {
    try {
      // Prepare live scores data
      const liveScoresData = {
        gameweekId: this.currentGameweek,
        players: liveData.players.map(player => ({
          id: player.id,
          name: player.web_name,
          team: player.team,
          position: player.element_type,
          points: player.stats?.total_points || 0,
          minutes: player.stats?.minutes || 0,
          goals: player.stats?.goals_scored || 0,
          assists: player.stats?.assists || 0,
          cleanSheets: player.stats?.clean_sheets || 0,
          saves: player.stats?.saves || 0,
          bonus: player.stats?.bonus || 0
        })),
        fixtures: liveData.fixtures.map(fixture => ({
          id: fixture.id,
          homeTeam: fixture.team_h,
          awayTeam: fixture.team_a,
          homeScore: fixture.team_h_score,
          awayScore: fixture.team_a_score,
          started: fixture.started,
          finished: fixture.finished,
          kickoffTime: fixture.kickoff_time
        })),
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients
      socketService.broadcastLiveScores(liveScoresData);
      
      console.log(`📡 Broadcasted live scores for Gameweek ${this.currentGameweek}`);
    } catch (error) {
      console.error('Failed to broadcast live scores:', error);
    }
  }

  /**
   * Get live scoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentGameweek: this.currentGameweek,
      lastUpdate: this.lastUpdateTime,
      updateInterval: this.updateInterval,
      metrics: this.metrics
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.lastReset;
    const successRate = this.metrics.totalUpdates > 0 
      ? (this.metrics.successfulUpdates / this.metrics.totalUpdates) * 100 
      : 0;

    return {
      ...this.metrics,
      uptime,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      avgUpdateTime: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Update gameweek
   */
  async updateGameweek() {
    try {
      const newGameweek = await optimizedFplService.getCurrentGameweekId();
      
      if (newGameweek !== this.currentGameweek) {
        console.log(`📅 Gameweek changed from ${this.currentGameweek} to ${newGameweek}`);
        this.currentGameweek = newGameweek;
        
        // Reset live data cache
        this.lastLiveData = null;
        this.lastUpdateTime = null;
        
        // Check for live fixtures in new gameweek
        const hasLiveFixtures = await this.checkForLiveFixtures();
        
        if (hasLiveFixtures) {
          console.log('🎮 Live fixtures found in new gameweek, starting live scoring...');
          this.startLiveScoring();
        } else {
          console.log('📺 No live fixtures in new gameweek, monitoring for live games...');
          this.startMonitoring();
        }
      }
    } catch (error) {
      console.error('Failed to update gameweek:', error);
    }
  }
}

module.exports = new OptimizedLiveScoringService();

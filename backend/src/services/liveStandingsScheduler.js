// File: fpl-hub-backend/src/services/liveStandingsScheduler.js
// Scheduler for live standings updates during gameweeks

const cron = require('node-cron');
const LiveStandingsService = require('./liveStandingsService');

class LiveStandingsScheduler {
  constructor() {
    this.isRunning = false;
    this.updateInterval = null;
    this.lastUpdate = null;
  }

  /**
   * Start the live standings scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Live standings scheduler is already running');
      return;
    }

    console.log('🚀 Starting live standings scheduler...');
    this.isRunning = true;

    // Smart update interval - more frequent during live matches, less frequent otherwise
    this.updateInterval = setInterval(async () => {
      await this.performSmartLiveUpdate();
    }, 2 * 60 * 1000); // 2 minutes base interval

    // Also run immediately on start
    this.performLiveUpdate();

    console.log('✅ Live standings scheduler started - updates every 2 minutes');
  }

  /**
   * Stop the live standings scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Live standings scheduler is not running');
      return;
    }

    console.log('🛑 Stopping live standings scheduler...');
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('✅ Live standings scheduler stopped');
  }

  /**
   * Perform smart live standings update with intelligent scheduling
   */
  async performSmartLiveUpdate() {
    try {
      // Check if there's a current live gameweek
      const liveGameweek = await LiveStandingsService.getCurrentLiveGameweek();
      
      if (!liveGameweek) {
        // No live gameweek, skip update
        if (this.lastUpdate) {
          console.log('ℹ️  No live gameweek detected, skipping update');
        }
        return;
      }

      console.log(`🏈 Live gameweek detected: GW${liveGameweek}, updating standings...`);
      
      // Update live standings with optimization
      const result = await LiveStandingsService.updateLiveStandings(liveGameweek);
      
      this.lastUpdate = new Date();
      
      if (result.success) {
        console.log(`✅ OPTIMIZED update: ${result.updatedEntries} updated, ${result.cachedEntries} cached, ${result.skippedEntries} skipped across ${result.updatedLeagues} leagues`);
        
        // Adjust update frequency based on activity
        if (result.updatedEntries === 0 && result.cachedEntries > 0) {
          console.log('⚡ All data cached - next update in 5 minutes');
          // Could implement dynamic interval adjustment here
        }
      } else {
        console.error('❌ Live standings update failed:', result.message);
      }

    } catch (error) {
      console.error('❌ Error in live standings update:', error.message);
    }
  }

  /**
   * Perform live standings update (LEGACY - kept for compatibility)
   */
  async performLiveUpdate() {
    return await this.performSmartLiveUpdate();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.lastUpdate,
      updateInterval: this.updateInterval ? '2 minutes' : null
    };
  }

  /**
   * Force an immediate update (for testing)
   */
  async forceUpdate() {
    console.log('🔄 Forcing immediate live standings update...');
    await this.performLiveUpdate();
  }
}

// Create singleton instance
const liveStandingsScheduler = new LiveStandingsScheduler();

module.exports = liveStandingsScheduler;

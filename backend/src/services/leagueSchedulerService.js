// File: fpl-hub-backend/src/services/leagueSchedulerService.js
// League Scheduler Service for Automatic League Management

const cron = require('node-cron');
const AutomaticLeagueService = require('./automaticLeagueService');

class LeagueSchedulerService {
  constructor() {
    this.isRunning = false;
    this.scheduledJobs = [];
  }

  /**
   * Start the automatic league management scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  League scheduler is already running');
      return;
    }

    console.log('🚀 Starting League Scheduler Service...');

    // Run every hour to check for league management tasks
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Hourly league management check...');
      try {
        await AutomaticLeagueService.processAutomaticLeagueManagement();
      } catch (error) {
        console.error('❌ Error in hourly league management:', error);
      }
    }, {
      scheduled: false
    });

    // Run every 30 minutes during peak hours (8 AM - 10 PM UTC)
    const peakHoursJob = cron.schedule('*/30 8-22 * * *', async () => {
      console.log('⏰ Peak hours league management check...');
      try {
        await AutomaticLeagueService.processAutomaticLeagueManagement();
      } catch (error) {
        console.error('❌ Error in peak hours league management:', error);
      }
    }, {
      scheduled: false
    });

    // Run every 15 minutes during gameweek deadlines (Fridays 10 AM - 12 PM UTC)
    const deadlineJob = cron.schedule('*/15 10-12 * * 5', async () => {
      console.log('⏰ Gameweek deadline league management check...');
      try {
        await AutomaticLeagueService.processAutomaticLeagueManagement();
      } catch (error) {
        console.error('❌ Error in deadline league management:', error);
      }
    }, {
      scheduled: false
    });

    // Store job references
    this.scheduledJobs = [hourlyJob, peakHoursJob, deadlineJob];

    // Start all jobs
    this.scheduledJobs.forEach(job => job.start());

    this.isRunning = true;
    console.log('✅ League Scheduler Service started successfully');
    console.log('📅 Scheduled jobs:');
    console.log('   - Hourly checks: Every hour');
    console.log('   - Peak hours: Every 30 minutes (8 AM - 10 PM UTC)');
    console.log('   - Deadline days: Every 15 minutes (Fridays 10 AM - 12 PM UTC)');
  }

  /**
   * Stop the automatic league management scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  League scheduler is not running');
      return;
    }

    console.log('🛑 Stopping League Scheduler Service...');

    // Stop all jobs
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];

    this.isRunning = false;
    console.log('✅ League Scheduler Service stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.scheduledJobs.length,
      jobs: this.scheduledJobs.map((job, index) => ({
        id: index,
        running: job.running || false
      }))
    };
  }

  /**
   * Manually trigger league management (for testing)
   */
  async triggerManualCheck() {
    console.log('🔧 Manual league management trigger...');
    try {
      const result = await AutomaticLeagueService.processAutomaticLeagueManagement();
      console.log('✅ Manual check completed:', result.message);
      return result;
    } catch (error) {
      console.error('❌ Error in manual check:', error);
      throw error;
    }
  }
}

// Create singleton instance
const leagueScheduler = new LeagueSchedulerService();

module.exports = leagueScheduler;

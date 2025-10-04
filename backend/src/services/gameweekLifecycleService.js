// File: fpl-hub-backend/src/services/gameweekLifecycleService.js
// Proper Gameweek League Lifecycle Management

const { PrismaClient } = require('@prisma/client');
const fplService = require('./fplService');
const crypto = require('crypto');

const prisma = new PrismaClient();

class GameweekLifecycleService {
  constructor() {
    this.stabilityWindowMinutes = 15; // Reduced from 60 to 15 minutes for faster finalization
    this.pointsCheckInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.isRunning = false;
    this.activeChecks = new Map(); // Track active stability checks
  }

  /**
   * Get the current state of a league based on fixture analysis
   * @param {string} leagueId - League ID
   * @returns {Promise<Object>} League state analysis
   */
  async analyzeLeagueState(leagueId) {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          entries: {
            where: { isActive: true }
          }
        }
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      const gameweekId = league.startGameweek;
      const fixtureData = await fplService.getGameweekFixturesDetailed(gameweekId);
      const now = new Date();

      // Determine current state based on fixtures
      let currentState = 'OPEN_FOR_ENTRY';
      let stateReason = '';

      // Use two-step verification: last fixture finished + data checked
      const rawFixtures = await fplService.getFixtures(gameweekId);
      const bootstrap = await fplService.getBootstrapData();
      const currentEvent = bootstrap.events.find(event => event.id === gameweekId);
      
      // Step 1: Check if last fixture is finished
      let lastFixtureFinished = false;
      if (rawFixtures && rawFixtures.length > 0) {
        const lastFixture = rawFixtures.reduce((latest, fixture) => {
          const fixtureTime = new Date(fixture.kickoff_time);
          const latestTime = new Date(latest.kickoff_time);
          return fixtureTime > latestTime ? fixture : latest;
        });
        lastFixtureFinished = lastFixture.finished === true;
      }
      
      // Step 2: Check if data is checked (FPL has finalized all data)
      const dataChecked = currentEvent ? currentEvent.data_checked === true : false;
      
      // Gameweek is complete only when BOTH conditions are met
      const gameweekComplete = lastFixtureFinished && dataChecked;

      if (fixtureData.earliestKickoff && now >= fixtureData.earliestKickoff) {
        if (fixtureData.anyInProgress) {
          currentState = 'IN_PROGRESS';
          stateReason = 'Fixtures are currently in progress';
        } else if (gameweekComplete) {
          // Both last fixture finished AND data checked - gameweek is complete
          currentState = 'FINALIZED';
          stateReason = 'Gameweek complete: last fixture finished and FPL data checked';
        } else if (lastFixtureFinished && !dataChecked) {
          // Last fixture finished but FPL hasn't checked data yet
          currentState = 'WAITING_FOR_UPDATES';
          stateReason = 'Last fixture finished, waiting for FPL to check and finalize data';
        } else {
          currentState = 'IN_PROGRESS';
          stateReason = 'Some fixtures finished, others scheduled';
        }
      } else if (gameweekComplete) {
        // Handle case where FPL API hasn't updated current gameweek yet
        currentState = 'FINALIZED';
        stateReason = 'Gameweek complete: last fixture finished and FPL data checked (FPL API not updated yet)';
      } else {
        currentState = 'OPEN_FOR_ENTRY';
        stateReason = 'First fixture has not started yet';
      }

      return {
        leagueId,
        gameweekId,
        currentState,
        stateReason,
        fixtureData,
        league,
        analysis: {
          earliestKickoff: fixtureData.earliestKickoff,
          latestKickoff: fixtureData.latestKickoff,
          allFinished: fixtureData.allFinished,
          anyInProgress: fixtureData.anyInProgress,
          anyScheduled: fixtureData.anyScheduled,
          anyPostponed: fixtureData.anyPostponed,
          statusCounts: fixtureData.statusCounts
        }
      };
    } catch (error) {
      console.error(`❌ Error analyzing league state for ${leagueId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update league state based on current fixture analysis
   * @param {string} leagueId - League ID
   * @returns {Promise<Object>} Update result
   */
  async updateLeagueState(leagueId) {
    try {
      const analysis = await this.analyzeLeagueState(leagueId);
      const league = analysis.league;
      const currentState = analysis.currentState;
      const now = new Date();

      // Check if state change is needed
      if (league.leagueState === currentState) {
        return {
          leagueId,
          stateChanged: false,
          currentState,
          reason: 'No state change needed'
        };
      }

      console.log(`🔄 League ${leagueId} state change: ${league.leagueState} → ${currentState}`);

      // Prepare update data
      const updateData = {
        leagueState: currentState
      };

      // Set timestamps based on state
      if (currentState === 'WAITING_FOR_UPDATES' && !league.softFinalizedAt) {
        updateData.softFinalizedAt = now;
        console.log(`📅 League ${leagueId} soft finalized at ${now.toISOString()}`);
      }

      if (currentState === 'FINALIZED' && !league.finalizedAt) {
        updateData.finalizedAt = now;
        updateData.status = 'COMPLETED'; // Update legacy status field
        console.log(`✅ League ${leagueId} finalized at ${now.toISOString()}`);
        
        // Process payouts for paid leagues
        if (league.type === 'PAID' && league.totalPrizePool > 0) {
          try {
            await this.processLeaguePayouts(leagueId);
            console.log(`💰 Payouts processed for league ${leagueId}`);
          } catch (error) {
            console.error(`❌ Error processing payouts for league ${leagueId}:`, error.message);
            // Don't fail the state update if payout processing fails
          }
        }
      }

      // Update the league
      const updatedLeague = await prisma.league.update({
        where: { id: leagueId },
        data: updateData
      });

      // Log state change
      console.log(`✅ League ${leagueId} state updated: ${league.leagueState} → ${currentState}`);
      console.log(`   Reason: ${analysis.stateReason}`);

      return {
        leagueId,
        stateChanged: true,
        previousState: league.leagueState,
        currentState,
        reason: analysis.stateReason,
        timestamps: {
          softFinalizedAt: updatedLeague.softFinalizedAt,
          finalizedAt: updatedLeague.finalizedAt
        }
      };
    } catch (error) {
      console.error(`❌ Error updating league state for ${leagueId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if points are stable for a gameweek
   * @param {number} gameweekId - Gameweek ID
   * @param {Object} league - League object
   * @returns {Promise<boolean>} True if points are stable
   */
  async checkPointsStability(gameweekId, league) {
    try {
      // Get current live data
      const liveData = await fplService.getLiveGameweekData(gameweekId);
      
      if (!liveData || !liveData.elements) {
        return false;
      }

      // Create hash of current player points
      const pointsHash = this.createPointsHash(liveData.elements);
      const now = new Date();

      // If this is the first check, store the hash and timestamp
      if (!league.pointsStabilityHash) {
        await prisma.league.update({
          where: { id: league.id },
          data: {
            pointsStabilityHash: pointsHash,
            lastPointsCheck: now
          }
        });
        return false; // Not stable yet, just started checking
      }

      // If points haven't changed, check if enough time has passed
      if (league.pointsStabilityHash === pointsHash) {
        const timeSinceLastCheck = now.getTime() - league.lastPointsCheck.getTime();
        const stabilityWindowMs = (league.stabilityWindowMinutes || this.stabilityWindowMinutes) * 60 * 1000;
        
        if (timeSinceLastCheck >= stabilityWindowMs) {
          console.log(`✅ Points stable for ${stabilityWindowMs / 60000} minutes - league ready for finalization`);
          return true;
        } else {
          const remainingMs = stabilityWindowMs - timeSinceLastCheck;
          console.log(`⏳ Points stable, waiting ${Math.ceil(remainingMs / 60000)} more minutes for finalization`);
          return false;
        }
      } else {
        // Points changed, reset the stability check
        console.log(`🔄 Points changed detected, resetting stability check`);
        await prisma.league.update({
          where: { id: league.id },
          data: {
            pointsStabilityHash: pointsHash,
            lastPointsCheck: now
          }
        });
        return false;
      }
    } catch (error) {
      console.error(`❌ Error checking points stability:`, error.message);
      return false;
    }
  }

  /**
   * Create a hash of player points for stability checking
   * @param {Array} elements - FPL elements data
   * @returns {string} Hash of points data
   */
  createPointsHash(elements) {
    // Create a simplified representation of points data
    const pointsData = elements.map(element => ({
      id: element.id,
      stats: element.stats
    }));

    // Sort by player ID for consistent hashing
    pointsData.sort((a, b) => a.id - b.id);

    // Create hash
    const dataString = JSON.stringify(pointsData);
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  /**
   * Get entry deadline for a gameweek (first fixture kickoff)
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<Date>} Entry deadline
   */
  async getEntryDeadline(gameweekId) {
    try {
      const fixtureData = await fplService.getGameweekFixturesDetailed(gameweekId);
      return fixtureData.earliestKickoff;
    } catch (error) {
      console.error(`❌ Error getting entry deadline for gameweek ${gameweekId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a league is open for entry
   * @param {string} leagueId - League ID
   * @returns {Promise<boolean>} True if open for entry
   */
  async isLeagueOpenForEntry(leagueId) {
    try {
      const analysis = await this.analyzeLeagueState(leagueId);
      return analysis.currentState === 'OPEN_FOR_ENTRY';
    } catch (error) {
      console.error(`❌ Error checking if league open for entry:`, error.message);
      return false;
    }
  }

  /**
   * Update all leagues for a specific gameweek
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<Object>} Update results
   */
  async updateAllLeaguesForGameweek(gameweekId) {
    try {
      const leagues = await prisma.league.findMany({
        where: {
          startGameweek: gameweekId,
          leagueState: {
            not: 'FINALIZED'
          }
        }
      });

      console.log(`🔄 Updating ${leagues.length} leagues for gameweek ${gameweekId}`);

      const results = [];
      for (const league of leagues) {
        try {
          const result = await this.updateLeagueState(league.id);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error updating league ${league.id}:`, error.message);
          results.push({
            leagueId: league.id,
            stateChanged: false,
            error: error.message
          });
        }
      }

      const stateChanges = results.filter(r => r.stateChanged).length;
      console.log(`✅ Updated ${leagues.length} leagues, ${stateChanges} state changes`);

      return {
        gameweekId,
        totalLeagues: leagues.length,
        stateChanges,
        results
      };
    } catch (error) {
      console.error(`❌ Error updating leagues for gameweek ${gameweekId}:`, error.message);
      throw error;
    }
  }

  /**
   * Start monitoring for a specific league
   * @param {string} leagueId - League ID
   */
  async startMonitoring(leagueId) {
    if (this.activeChecks.has(leagueId)) {
      console.log(`⚠️ Already monitoring league ${leagueId}`);
      return;
    }

    console.log(`🔍 Starting monitoring for league ${leagueId}`);
    
    const intervalId = setInterval(async () => {
      try {
        await this.updateLeagueState(leagueId);
      } catch (error) {
        console.error(`❌ Error in monitoring loop for league ${leagueId}:`, error.message);
      }
    }, this.pointsCheckInterval);

    this.activeChecks.set(leagueId, intervalId);
  }

  /**
   * Stop monitoring for a specific league
   * @param {string} leagueId - League ID
   */
  async stopMonitoring(leagueId) {
    const intervalId = this.activeChecks.get(leagueId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeChecks.delete(leagueId);
      console.log(`🛑 Stopped monitoring for league ${leagueId}`);
    }
  }

  /**
   * Stop all monitoring
   */
  async stopAllMonitoring() {
    console.log(`🛑 Stopping all league monitoring (${this.activeChecks.size} active)`);
    
    for (const [leagueId, intervalId] of this.activeChecks) {
      clearInterval(intervalId);
    }
    
    this.activeChecks.clear();
  }

  /**
   * Handle postponed fixtures - reload fixtures and recalculate state
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<Object>} Recalculation result
   */
  async handlePostponedFixtures(gameweekId) {
    try {
      console.log(`🔄 Handling postponed fixtures for gameweek ${gameweekId}`);
      
      // Get updated fixture data
      const fixtureData = await fplService.getGameweekFixturesDetailed(gameweekId);
      
      if (fixtureData.anyPostponed) {
        console.log(`⚠️ Postponed fixtures detected in gameweek ${gameweekId}`);
        console.log(`   Status counts:`, fixtureData.statusCounts);
        
        // Update all leagues for this gameweek
        const result = await this.updateAllLeaguesForGameweek(gameweekId);
        
        return {
          gameweekId,
          postponedDetected: true,
          statusCounts: fixtureData.statusCounts,
          leagueUpdates: result
        };
      }
      
      return {
        gameweekId,
        postponedDetected: false,
        message: 'No postponed fixtures found'
      };
    } catch (error) {
      console.error(`❌ Error handling postponed fixtures for gameweek ${gameweekId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check for retroactive point changes after finalization
   * @param {string} leagueId - League ID
   * @returns {Promise<Object>} Retroactive change detection result
   */
  async checkForRetroactiveChanges(leagueId) {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league || league.leagueState !== 'FINALIZED') {
        return {
          leagueId,
          retroactiveChanges: false,
          reason: 'League not finalized'
        };
      }

      const gameweekId = league.startGameweek;
      const liveData = await fplService.getLiveGameweekData(gameweekId);
      
      if (!liveData || !liveData.elements) {
        return {
          leagueId,
          retroactiveChanges: false,
          reason: 'No live data available'
        };
      }

      // Create current points hash
      const currentHash = this.createPointsHash(liveData.elements);
      
      // Compare with stored hash
      if (league.pointsStabilityHash && league.pointsStabilityHash !== currentHash) {
        console.log(`🚨 RETROACTIVE POINT CHANGES DETECTED for league ${leagueId}`);
        console.log(`   Old hash: ${league.pointsStabilityHash}`);
        console.log(`   New hash: ${currentHash}`);
        
        // Log the correction
        console.log(`📝 Logging retroactive correction for league ${leagueId}`);
        
        // Update the hash and timestamp
        await prisma.league.update({
          where: { id: leagueId },
          data: {
            pointsStabilityHash: currentHash,
            lastPointsCheck: new Date()
          }
        });

        // TODO: Trigger leaderboard recalculation
        // This would require integration with the leaderboard service
        
        return {
          leagueId,
          retroactiveChanges: true,
          oldHash: league.pointsStabilityHash,
          newHash: currentHash,
          action: 'Hash updated, leaderboard recalculation needed'
        };
      }

      return {
        leagueId,
        retroactiveChanges: false,
        reason: 'No point changes detected'
      };
    } catch (error) {
      console.error(`❌ Error checking for retroactive changes in league ${leagueId}:`, error.message);
      throw error;
    }
  }

  /**
   * Process league payouts when a league is finalized
   * @param {string} leagueId - League ID
   * @returns {Promise<Object>} Payout processing result
   */
  async processLeaguePayouts(leagueId) {
    try {
      console.log(`💰 Processing payouts for league ${leagueId}`);
      
      // Get final leaderboard with rankings
      const LeaderboardService = require('./leaderboardService');
      const leaderboard = await LeaderboardService.calculateLiveLeaderboard(leagueId);
      
      if (!leaderboard || leaderboard.length === 0) {
        console.log(`No leaderboard entries found for league ${leagueId}`);
        return { processed: 0, totalAmount: 0 };
      }
      
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });
      
      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }
      
      const totalPrizePool = league.totalPrizePool || 0;
      if (totalPrizePool <= 0) {
        console.log(`No prize pool for league ${leagueId}`);
        return { processed: 0, totalAmount: 0 };
      }
      
      // Calculate payouts based on league configuration
      const payouts = this.calculatePayoutDistribution(leaderboard, totalPrizePool, league);
      
      // Process each payout
      const walletService = require('./walletService');
      let processedCount = 0;
      let totalDistributed = 0;
      
      for (const payout of payouts) {
        try {
          if (payout.amount > 0) {
            await walletService.addPrizeMoney(
              payout.userId,
              payout.amount,
              leagueId,
              `Prize for ${payout.rank}${this.getOrdinalSuffix(payout.rank)} place in ${league.name}`
            );
            
            processedCount++;
            totalDistributed += payout.amount;
            
            console.log(`💰 Paid GHS ${payout.amount} to user ${payout.userId} (Rank ${payout.rank})`);
          }
        } catch (error) {
          console.error(`❌ Error processing payout for user ${payout.userId}:`, error.message);
        }
      }
      
      console.log(`✅ Processed ${processedCount} payouts totaling GHS ${totalDistributed}`);
      
      return {
        processed: processedCount,
        totalAmount: totalDistributed,
        payouts
      };
      
    } catch (error) {
      console.error(`❌ Error processing league payouts for ${leagueId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Calculate payout distribution based on league configuration
   * @param {Array} leaderboard - Final leaderboard
   * @param {number} totalPrizePool - Total prize pool
   * @param {Object} league - League configuration
   * @returns {Array} Payout distribution
   */
  calculatePayoutDistribution(leaderboard, totalPrizePool, league) {
    const payouts = [];
    
    // Default payout structure: Top 3 get 50%, 30%, 20%
    const defaultPayouts = [
      { rank: 1, percentage: 0.50 },
      { rank: 2, percentage: 0.30 },
      { rank: 3, percentage: 0.20 }
    ];
    
    // Use league-specific distribution if available
    let payoutStructure = defaultPayouts;
    if (league.prizeDistribution) {
      try {
        const distribution = JSON.parse(league.prizeDistribution);
        if (distribution.type === 'TOP_3' && distribution.distribution) {
          payoutStructure = Object.entries(distribution.distribution).map(([rank, percentage]) => ({
            rank: parseInt(rank),
            percentage: percentage / 100
          }));
        }
      } catch (error) {
        console.warn(`Invalid prize distribution for league ${league.id}, using default`);
      }
    }
    
    // Calculate payouts for each rank
    payoutStructure.forEach(({ rank, percentage }) => {
      const leaderboardEntry = leaderboard.find(entry => entry.rank === rank);
      if (leaderboardEntry) {
        const amount = totalPrizePool * percentage;
        payouts.push({
          userId: leaderboardEntry.userId,
          rank: rank,
          amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
          percentage: percentage * 100
        });
      }
    });
    
    return payouts;
  }
  
  /**
   * Get ordinal suffix for rank (1st, 2nd, 3rd, etc.)
   * @param {number} rank - Rank number
   * @returns {string} Ordinal suffix
   */
  getOrdinalSuffix(rank) {
    const j = rank % 10;
    const k = rank % 100;
    
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  /**
   * Get league lifecycle status summary
   * @param {string} leagueId - League ID
   * @returns {Promise<Object>} Detailed status summary
   */
  async getLeagueStatusSummary(leagueId) {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      const analysis = await this.analyzeLeagueState(leagueId);
      const gameweekId = league.startGameweek;

      return {
        leagueId,
        leagueName: league.name,
        gameweekId,
        currentState: league.leagueState,
        analysisState: analysis.currentState,
        stateReason: analysis.stateReason,
        timestamps: {
          softFinalizedAt: league.softFinalizedAt,
          finalizedAt: league.finalizedAt,
          lastPointsCheck: league.lastPointsCheck
        },
        configuration: {
          stabilityWindowMinutes: league.stabilityWindowMinutes || this.stabilityWindowMinutes
        },
        fixtureAnalysis: analysis.analysis,
        pointsStability: {
          hash: league.pointsStabilityHash,
          isStable: league.pointsStabilityHash ? true : false
        },
        monitoring: {
          isActive: this.activeChecks.has(leagueId)
        }
      };
    } catch (error) {
      console.error(`❌ Error getting league status summary for ${leagueId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new GameweekLifecycleService();

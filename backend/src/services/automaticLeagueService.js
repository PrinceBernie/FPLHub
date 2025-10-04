// File: fpl-hub-backend/src/services/automaticLeagueService.js
// Automatic Weekly League Creation Service

const { PrismaClient } = require('@prisma/client');
const fplService = require('./fplService');

const prisma = new PrismaClient();

class AutomaticLeagueService {

  /**
   * Get current FPL season as integer (e.g., 2025 for 2025/26 season)
   * @returns {number} Current season year
   */
  static getCurrentSeason() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // FPL seasons typically start in August
    // If we're before August, we're still in the previous season
    if (currentMonth < 7) { // January-July
      return currentYear - 1;
    } else { // August-December
      return currentYear;
    }
  }

  /**
   * Get current FPL season in dual year format (e.g., "2024/25")
   * @returns {string} Current season in dual year format
   */
  static getCurrentSeasonFormatted() {
    const season = this.getCurrentSeason();
    return `${season}/${(season + 1).toString().slice(-2)}`;
  }

  /**
   * Get next gameweek for league creation
   * @returns {Promise<Object>} Next gameweek info
   */
  static async getNextGameweek() {
    try {
      const data = await fplService.getBootstrapData();
      
      // Find current gameweek
      const currentGW = data.events.find(event => event.is_current);
      
      if (!currentGW) {
        throw new Error('No current gameweek found');
      }

      // Find next gameweek
      const nextGW = data.events.find(event => event.id === currentGW.id + 1);
      
      if (!nextGW) {
        throw new Error('No next gameweek found');
      }

      return {
        id: nextGW.id,
        name: nextGW.name,
        deadline_time: nextGW.deadline_time,
        is_current: nextGW.is_current,
        is_next: nextGW.is_next
      };
    } catch (error) {
      console.error('Error getting next gameweek:', error);
      throw error;
    }
  }

  /**
   * Check if current gameweek has ended using two-step verification:
   * 1. Last fixture is_finished = true
   * 2. currentEvent.data_checked = true
   * @returns {Promise<boolean>} True if current gameweek has ended
   */
  static async hasCurrentGameweekEnded() {
    try {
      const currentGameweek = await fplService.getCurrentGameweek();
      const gameweekId = currentGameweek.id;
      
      // Step 1: Check if last fixture is finished
      const fixtures = await fplService.getFixtures(gameweekId);
      if (!fixtures || fixtures.length === 0) {
        console.log(`🔍 Gameweek ${gameweekId}: No fixtures found`);
        return false;
      }
      
      // Find the last fixture (latest kickoff time)
      const lastFixture = fixtures.reduce((latest, fixture) => {
        const fixtureTime = new Date(fixture.kickoff_time);
        const latestTime = new Date(latest.kickoff_time);
        return fixtureTime > latestTime ? fixture : latest;
      });
      
      const lastFixtureFinished = lastFixture.finished === true;
      console.log(`🔍 Gameweek ${gameweekId} - Last fixture finished: ${lastFixtureFinished}`);
      
      // Step 2: Check if data is checked (FPL has finalized all data)
      const bootstrap = await fplService.getBootstrapData();
      const currentEvent = bootstrap.events.find(event => event.id === gameweekId);
      const dataChecked = currentEvent ? currentEvent.data_checked === true : false;
      
      console.log(`🔍 Gameweek ${gameweekId} - Data checked: ${dataChecked}`);
      
      // Gameweek has ended only when BOTH conditions are met
      const gameweekEnded = lastFixtureFinished && dataChecked;
      
      console.log(`🔍 Gameweek ${gameweekId} has ended: ${gameweekEnded} (lastFixture: ${lastFixtureFinished}, dataChecked: ${dataChecked})`);
      
      return gameweekEnded;
    } catch (error) {
      console.error('Error checking if gameweek ended:', error);
      return false;
    }
  }

  /**
   * Automatically create leagues for next gameweek when current gameweek starts
   * This should be called when a new gameweek begins
   * @returns {Promise<Object>} Creation result
   */
  static async createNextGameweekLeagues() {
    try {
      console.log('🔄 Starting automatic league creation for next gameweek...');

      // Get next gameweek info
      const nextGameweek = await this.getNextGameweek();
      const currentSeason = this.getCurrentSeason();
      const seasonFormatted = this.getCurrentSeasonFormatted();

      console.log(`📅 Next gameweek: ${nextGameweek.name} (ID: ${nextGameweek.id})`);
      console.log(`🏆 Season: ${seasonFormatted} (${currentSeason})`);

      // Check if leagues already exist for next gameweek
      const existingLeagues = await prisma.league.findMany({
        where: { 
          startGameweek: nextGameweek.id, 
          season: currentSeason 
        }
      });

      if (existingLeagues.length > 0) {
        console.log(`✅ Leagues already exist for ${nextGameweek.name}`);
        return {
          success: true,
          message: `Leagues already exist for ${nextGameweek.name}`,
          data: existingLeagues
        };
      }

      // Get admin user for creating leagues
      const adminUser = await prisma.user.findFirst({
        where: { 
          isAdmin: true,
          adminLevel: 'SUPER_ADMIN'
        }
      });

      if (!adminUser) {
        throw new Error('No Super Admin found to create leagues');
      }

      // Get first match kickoff time for this gameweek using enhanced method
      let firstMatchKickoff = null;
      try {
        firstMatchKickoff = await fplService.getFirstFixtureKickoff(nextGameweek.id);
        console.log(`🏈 First match kickoff for ${nextGameweek.name}: ${firstMatchKickoff}`);
      } catch (error) {
        console.warn(`⚠️  Could not get first match kickoff for ${nextGameweek.name}:`, error.message);
        // Fallback: use FPL deadline + 1 hour as startTime
        if (nextGameweek.deadline_time) {
          firstMatchKickoff = new Date(new Date(nextGameweek.deadline_time).getTime() + (60 * 60 * 1000)); // +1 hour
          console.log(`🔄 Using fallback startTime (deadline + 1h): ${firstMatchKickoff}`);
        }
      }

      // Create Gameweek Champions (Paid League) - LOCKED FOR ENTRY
      const championsLeague = await prisma.league.create({
        data: {
          name: `${nextGameweek.name} Champions`,
          type: 'PAID',
          leagueFormat: 'CLASSIC',
          creatorId: adminUser.id,
          entryType: 'PAID',
          entryFee: 10.00,
          maxTeams: 10000,
          includeChipScores: false,
          includeTransferCosts: false,
          season: currentSeason,
          startGameweek: nextGameweek.id,
          endGameweek: nextGameweek.id,
          startTime: firstMatchKickoff, // First match kickoff time for entry closure
          totalPrizePool: 0,
          platformFee: 0.50,
          platformFeeType: 'PERCENTAGE',
          platformFeeValue: 5.0,
          status: 'OPEN', // Always open for entry
          isPrivate: false,
          isInvitational: false,
          leagueCode: this.generateLeagueCode(nextGameweek.id, 'CHAMP'),
          description: `Weekly paid league for ${nextGameweek.name} - Gameweek points only, no chips or transfer costs. Open for entry now!`
        }
      });

      // Create Free2Play League - LOCKED FOR ENTRY
      const freeLeague = await prisma.league.create({
        data: {
          name: `${nextGameweek.name} Free2Play`,
          type: 'FREE',
          leagueFormat: 'CLASSIC',
          creatorId: adminUser.id,
          entryType: 'FREE',
          entryFee: 0.00,
          maxTeams: 10000,
          includeChipScores: false,
          includeTransferCosts: false,
          season: currentSeason,
          startGameweek: nextGameweek.id,
          endGameweek: nextGameweek.id,
          startTime: firstMatchKickoff, // First match kickoff time for entry closure
          totalPrizePool: 0,
          platformFee: 0,
          platformFeeType: 'PERCENTAGE',
          platformFeeValue: 0.0,
          status: 'OPEN', // Always open for entry
          isPrivate: false,
          isInvitational: false,
          leagueCode: this.generateLeagueCode(nextGameweek.id, 'FREE'),
          description: `Weekly free league for ${nextGameweek.name} - Gameweek points only, no chips or transfer costs. Open for entry now!`
        }
      });

      console.log(`✅ Created leagues for ${nextGameweek.name}:`);
      console.log(`   🏆 Champions League: ${championsLeague.name} (OPEN)`);
      console.log(`   🆓 Free2Play League: ${freeLeague.name} (OPEN)`);

      return {
        success: true,
        message: `Leagues created for ${nextGameweek.name} (open for entry)`,
        data: [championsLeague, freeLeague]
      };

    } catch (error) {
      console.error('❌ Error creating next gameweek leagues:', error);
      throw error;
    }
  }

  /**
   * Unlock leagues for entry when current gameweek ends
   * This should be called when a gameweek ends
   * @param {boolean} forceUnlock - Force unlock even if gameweek hasn't ended (Super Admin only)
   * @returns {Promise<Object>} Unlock result
   */
  static async unlockLeaguesForEntry(forceUnlock = false) {
    try {
      console.log('🔓 Checking for leagues to unlock...');

      const currentSeason = this.getCurrentSeason();
      
      // Find locked leagues for next gameweek
      const lockedLeagues = await prisma.league.findMany({
        where: {
          season: currentSeason,
          status: 'LOCKED',
          isPrivate: false,
          isInvitational: false
        }
      });

      if (lockedLeagues.length === 0) {
        console.log('ℹ️  No locked leagues found to unlock');
        return {
          success: true,
          message: 'No locked leagues found to unlock',
          data: []
        };
      }

      // Check if gameweek has ended (unless force unlock)
      if (!forceUnlock) {
        const gameweekEnded = await this.hasCurrentGameweekEnded();
        if (!gameweekEnded) {
          console.log('⚠️  Current gameweek has not ended yet. Use force unlock for manual override.');
          return {
            success: false,
            message: 'Current gameweek has not ended yet. Use force unlock for manual override.',
            data: []
          };
        }
      } else {
        console.log('🔓 Force unlock requested - unlocking leagues regardless of gameweek status');
      }

      // Unlock the leagues
      const unlockedLeagues = [];
      for (const league of lockedLeagues) {
        const updatedLeague = await prisma.league.update({
          where: { id: league.id },
          data: { 
            status: 'OPEN',
            description: league.description.replace('Entry opens when current gameweek ends.', 'Now open for entry!')
          }
        });
        unlockedLeagues.push(updatedLeague);
      }

      console.log(`✅ Unlocked ${unlockedLeagues.length} leagues for entry:`);
      unlockedLeagues.forEach(league => {
        console.log(`   📢 ${league.name} - Now OPEN for entry`);
      });

      return {
        success: true,
        message: `Unlocked ${unlockedLeagues.length} leagues for entry`,
        data: unlockedLeagues
      };

    } catch (error) {
      console.error('❌ Error unlocking leagues:', error);
      throw error;
    }
  }

  /**
   * Manually unlock leagues for a specific gameweek (Super Admin only)
   * @param {number} gameweekId - Gameweek ID to unlock leagues for
   * @param {string} adminUserId - Super Admin user ID
   * @returns {Promise<Object>} Unlock result
   */
  static async manuallyUnlockGameweekLeagues(gameweekId, adminUserId) {
    try {
      console.log(`🔓 Manual unlock requested for Gameweek ${gameweekId} by Super Admin`);

      // Verify admin is Super Admin
      const RBACService = require('./rbacService');
      const adminRole = await RBACService.getUserRole(adminUserId);
      if (!adminRole || adminRole.role !== 'SUPER_ADMIN') {
        throw new Error('Only Super Admins can manually unlock leagues');
      }

      const currentSeason = this.getCurrentSeason();
      
      // Find locked leagues for specific gameweek
      const lockedLeagues = await prisma.league.findMany({
        where: {
          startGameweek: gameweekId,
          season: currentSeason,
          status: 'LOCKED',
          isPrivate: false,
          isInvitational: false
        }
      });

      if (lockedLeagues.length === 0) {
        return {
          success: true,
          message: `No locked leagues found for Gameweek ${gameweekId}`,
          data: []
        };
      }

      // Unlock the leagues
      const unlockedLeagues = [];
      for (const league of lockedLeagues) {
        const updatedLeague = await prisma.league.update({
          where: { id: league.id },
          data: { 
            status: 'OPEN',
            description: league.description.replace('Entry opens when current gameweek ends.', 'Manually unlocked by Super Admin.')
          }
        });
        unlockedLeagues.push(updatedLeague);
      }

      // Log admin action
      await AutomaticLeagueService.logAdminAction(adminUserId, 'MANUAL_UNLOCK_LEAGUES', gameweekId.toString(), 'GAMEWEEK', {
        gameweek: gameweekId,
        leaguesUnlocked: unlockedLeagues.length,
        leagueNames: unlockedLeagues.map(l => l.name)
      });

      console.log(`✅ Manually unlocked ${unlockedLeagues.length} leagues for Gameweek ${gameweekId}:`);
      unlockedLeagues.forEach(league => {
        console.log(`   📢 ${league.name} - Now OPEN for entry`);
      });

      return {
        success: true,
        message: `Manually unlocked ${unlockedLeagues.length} leagues for Gameweek ${gameweekId}`,
        data: unlockedLeagues
      };

    } catch (error) {
      console.error('❌ Error manually unlocking leagues:', error);
      throw error;
    }
  }

  /**
   * Check and process automatic league management
   * This is the main method that should be called regularly
   * @returns {Promise<Object>} Processing result
   */
  static async processAutomaticLeagueManagement() {
    try {
      console.log('🤖 Processing automatic league management...');

      const results = {
        leaguesCreated: false,
        currentGameweek: null,
        nextGameweek: null,
        season: this.getCurrentSeason()
      };

      // Get current gameweek info
      const currentGameweek = await fplService.getCurrentGameweek();
      results.currentGameweek = {
        id: currentGameweek.id,
        name: currentGameweek.name,
        deadline: currentGameweek.deadline_time
      };

      // Check if current gameweek has ended
      const gameweekEnded = await this.hasCurrentGameweekEnded();
      
      if (gameweekEnded) {
        console.log('⏰ Current gameweek has ended, processing league transitions...');
        
        // Finalize all leagues for the current gameweek
        await this.finalizeCurrentGameweekLeagues(currentGameweek.id);
        
        // Note: No need to unlock leagues - they're controlled by leagueState now
      }

      // Always try to create leagues for next gameweek (if they don't exist)
      try {
        const createResult = await this.createNextGameweekLeagues();
        results.leaguesCreated = createResult.success;
        
        // Get next gameweek info
        const nextGameweek = await this.getNextGameweek();
        results.nextGameweek = {
          id: nextGameweek.id,
          name: nextGameweek.name,
          deadline: nextGameweek.deadline_time
        };
      } catch (error) {
        console.log('ℹ️  Next gameweek leagues already exist or error occurred');
      }

      console.log('✅ Automatic league management completed');
      return {
        success: true,
        message: 'Automatic league management processed',
        data: results
      };

    } catch (error) {
      console.error('❌ Error in automatic league management:', error);
      throw error;
    }
  }

  /**
   * Finalize all leagues for the current gameweek
   * @param {number} gameweekId - Current gameweek ID
   * @returns {Promise<Object>} Finalization result
   */
  static async finalizeCurrentGameweekLeagues(gameweekId) {
    try {
      console.log(`🏁 Finalizing all leagues for Gameweek ${gameweekId}...`);
      
      const gameweekLifecycleService = require('./gameweekLifecycleService');
      
      // Get all leagues for this gameweek that need finalization
      const leagues = await prisma.league.findMany({
        where: {
          startGameweek: gameweekId,
          leagueState: {
            in: ['IN_PROGRESS', 'WAITING_FOR_UPDATES']
          }
        },
        select: {
          id: true,
          name: true,
          leagueState: true
        }
      });

      console.log(`📊 Found ${leagues.length} leagues to finalize for GW${gameweekId}`);

      // Finalize each league
      const finalizePromises = leagues.map(async (league) => {
        try {
          const result = await gameweekLifecycleService.updateLeagueState(league.id);
          if (result.stateChanged && result.currentState === 'FINALIZED') {
            console.log(`✅ League ${league.name} finalized successfully`);
            return { leagueId: league.id, success: true };
          }
          return { leagueId: league.id, success: false, reason: 'State not changed or not finalized' };
        } catch (error) {
          console.error(`❌ Failed to finalize league ${league.id}:`, error.message);
          return { leagueId: league.id, success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(finalizePromises);
      
      let finalized = 0;
      let errors = 0;
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          finalized++;
        } else {
          errors++;
        }
      });

      console.log(`✅ Gameweek ${gameweekId} finalization completed: ${finalized} leagues finalized, ${errors} errors`);
      
      return {
        success: true,
        finalized,
        errors,
        total: leagues.length
      };
      
    } catch (error) {
      console.error(`❌ Error finalizing leagues for gameweek ${gameweekId}:`, error);
      throw error;
    }
  }

  /**
   * Generate league code
   * @param {number} gameweekId - Gameweek ID
   * @param {string} type - League type (CHAMP, FREE)
   * @returns {string} League code
   */
  static generateLeagueCode(gameweekId, type) {
    const season = this.getCurrentSeason();
    return `GW${gameweekId}${type}${season}`;
  }

  /**
   * Get league status for a specific gameweek
   * @param {number} gameweekId - Gameweek ID
   * @returns {Promise<Object>} League status
   */
  static async getLeagueStatus(gameweekId) {
    try {
      const currentSeason = this.getCurrentSeason();
      
      const leagues = await prisma.league.findMany({
        where: {
          startGameweek: gameweekId,
          season: currentSeason,
          isPrivate: false,
          isInvitational: false
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          entryFee: true,
          maxTeams: true,
          entries: {
            where: { isActive: true },
            select: { id: true }
          }
        }
      });

      return {
        success: true,
        data: {
          gameweek: gameweekId,
          season: currentSeason,
          leagues: leagues.map(league => ({
            id: league.id,
            name: league.name,
            type: league.type,
            status: league.status,
            entryFee: league.entryFee,
            maxTeams: league.maxTeams,
            currentEntries: league.entries.length,
            availableSpots: league.maxTeams - league.entries.length
          }))
        }
      };

    } catch (error) {
      console.error('Error getting league status:', error);
      throw error;
    }
  }
}

module.exports = AutomaticLeagueService;

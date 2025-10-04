const fplService = require('./fplService');
const { LeagueService } = require('./databaseService');
const socketService = require('./socketService');

class LiveScoringService {
  constructor() {
    this.isRunning = false;
    this.pollingInterval = null;
    this.lastUpdate = null;
    this.currentGameweek = null;
    this.liveFixtures = new Map();
    this.playerScores = new Map();
    this.leagueUpdates = new Map();
    this.updateInterval = 30000; // 30 seconds
    this.fplApiDelay = 5000; // 5 seconds between FPL API calls
  }

  // Start live scoring service
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Live scoring service is already running');
      return;
    }

    try {
      console.log('🚀 Starting live scoring service...');
      
      // Get current gameweek
      this.currentGameweek = await fplService.getCurrentGameweekId();
      
      // Check if there are live fixtures
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
      
      console.log(`🎯 Live scoring started for Gameweek ${this.currentGameweek}`);
    } catch (error) {
      console.error('❌ Failed to start live scoring service:', error);
      throw error;
    }
  }

  // Stop live scoring service
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
    socketService.updateLiveStatus(false);
    
    console.log('✅ Live scoring service stopped');
  }

  // Check if there are live fixtures
  async checkForLiveFixtures() {
    try {
      const fixtures = await fplService.getGameweekFixtures(this.currentGameweek);
      
      if (!fixtures || fixtures.length === 0) {
        return false;
      }

      // Check if any fixtures are live (status: 'LIVE')
      const liveFixtures = fixtures.filter(fixture => 
        fixture.status === 'LIVE' || fixture.status === 'IN_PLAY'
      );

      return liveFixtures.length > 0;
    } catch (error) {
      console.error('Error checking for live fixtures:', error);
      return false;
    }
  }

  // Start monitoring for live fixtures
  startMonitoring() {
    this.pollingInterval = setInterval(async () => {
      try {
        const hasLiveFixtures = await this.checkForLiveFixtures();
        
        if (hasLiveFixtures && !this.isRunning) {
          console.log('🎯 Live fixtures detected! Starting live scoring...');
          this.startLiveScoring();
          socketService.updateLiveStatus(true, this.currentGameweek);
        }
      } catch (error) {
        console.error('Error in monitoring loop:', error);
      }
    }, 60000); // Check every minute
  }

  // Start live scoring updates
  startLiveScoring() {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.updateLiveScores();
      } catch (error) {
        console.error('Error in live scoring loop:', error);
      }
    }, this.updateInterval);
  }

  // Update live scores
  async updateLiveScores() {
    try {
      console.log('🔄 Updating live scores...');
      
      // Get current fixtures
      const fixtures = await fplService.getGameweekFixtures(this.currentGameweek);
      const liveFixtures = fixtures.filter(f => 
        f.status === 'LIVE' || f.status === 'IN_PLAY'
      );

      if (liveFixtures.length === 0) {
        console.log('📺 No live fixtures found. Stopping live scoring.');
        this.stop();
        return;
      }

      // Update fixture data
      await this.updateFixtureData(liveFixtures);

      // Update player scores
      await this.updatePlayerScores();

      // Update league standings
      await this.updateLeagueStandings();

      // Broadcast updates
      await this.broadcastUpdates();

      this.lastUpdate = new Date();
      console.log('✅ Live scores updated successfully');
    } catch (error) {
      console.error('❌ Error updating live scores:', error);
    }
  }

  // Update fixture data
  async updateFixtureData(fixtures) {
    try {
      for (const fixture of fixtures) {
        const fixtureKey = `${fixture.id}`;
        const previousData = this.liveFixtures.get(fixtureKey);
        
        // Check if fixture data has changed
        if (!previousData || this.hasFixtureChanged(previousData, fixture)) {
          this.liveFixtures.set(fixtureKey, {
            ...fixture,
            lastUpdated: new Date().toISOString()
          });
          
          console.log(`⚽ Fixture ${fixture.id} updated: ${fixture.home_team} ${fixture.home_score} - ${fixture.away_score} ${fixture.away_team}`);
        }
      }
    } catch (error) {
      console.error('Error updating fixture data:', error);
    }
  }

  // Check if fixture data has changed
  hasFixtureChanged(previous, current) {
    return (
      previous.home_score !== current.home_score ||
      previous.away_score !== current.away_score ||
      previous.status !== current.status ||
      previous.minutes !== current.minutes
    );
  }

  // Update player scores
  async updatePlayerScores() {
    try {
      const liveFixtures = Array.from(this.liveFixtures.values());
      
      for (const fixture of liveFixtures) {
        // Get detailed fixture data with player stats
        const fixtureDetails = await fplService.getFixtureDetails(fixture.id);
        
        if (fixtureDetails && fixtureDetails.elements) {
          for (const player of fixtureDetails.elements) {
            const playerKey = `${player.id}`;
            const previousScore = this.playerScores.get(playerKey);
            
            if (!previousScore || previousScore.total_points !== player.stats.total_points) {
              this.playerScores.set(playerKey, {
                ...player,
                lastUpdated: new Date().toISOString()
              });
              
              console.log(`👤 Player ${player.id} score updated: ${player.stats.total_points} points`);
            }
          }
        }
        
        // Respect FPL API rate limits
        await this.delay(this.fplApiDelay);
      }
    } catch (error) {
      console.error('Error updating player scores:', error);
    }
  }

  // Update league standings
  async updateLeagueStandings() {
    try {
      // Get all active leagues for current gameweek
      const activeLeagues = await LeagueService.getCurrentGameweekLeagues();
      
      for (const league of activeLeagues) {
        try {
          // Calculate updated points for all teams in league
          const updatedStandings = await this.calculateLeagueStandings(league.id);
          
          this.leagueUpdates.set(league.id, {
            standings: updatedStandings,
            lastUpdated: new Date().toISOString()
          });
          
          console.log(`🏆 League ${league.id} standings updated`);
        } catch (error) {
          console.error(`Error updating league ${league.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error updating league standings:', error);
    }
  }

  // Calculate updated league standings
  async calculateLeagueStandings(leagueId) {
    try {
      // Get current standings
      const currentStandings = await LeagueService.getLeagueStandings(leagueId);
      
      // Get league entries
      const entries = await LeagueService.getLeagueEntries(leagueId);
      
      const updatedStandings = [];
      
      for (const entry of entries) {
        try {
          // Get user's FPL team
          const user = await LeagueService.getUserById(entry.userId);
          if (!user || !user.fplTeamId) continue;
          
          // Calculate current gameweek points
          const gameweekPoints = await this.calculateUserGameweekPoints(user.fplTeamId, this.currentGameweek);
          
          // Update total points
          const totalPoints = entry.totalPoints + gameweekPoints - entry.lastGameweekPoints;
          
          updatedStandings.push({
            userId: entry.userId,
            username: user.username,
            fplTeamId: user.fplTeamId,
            fplTeamName: user.fplTeamName,
            totalPoints,
            gameweekPoints,
            rank: 0 // Will be calculated after sorting
          });
        } catch (error) {
          console.error(`Error calculating points for user ${entry.userId}:`, error);
        }
      }
      
      // Sort by total points (descending) and assign ranks
      updatedStandings.sort((a, b) => b.totalPoints - a.totalPoints);
      updatedStandings.forEach((standing, index) => {
        standing.rank = index + 1;
      });
      
      return updatedStandings;
    } catch (error) {
      console.error('Error calculating league standings:', error);
      return [];
    }
  }

  // Calculate user's gameweek points
  async calculateUserGameweekPoints(fplTeamId, gameweek) {
    try {
      // Get user's squad for the gameweek
      const squad = await fplService.getTeamGameweekData(fplTeamId, gameweek);
      
      if (!squad || !squad.picks) {
        return 0;
      }
      
      let totalPoints = 0;
      
      // Calculate points from each player in the squad
      for (const pick of squad.picks) {
        const player = squad.elements.find(p => p.id === pick.element);
        if (player && player.event_points) {
          totalPoints += player.event_points;
        }
      }
      
      return totalPoints;
    } catch (error) {
      console.error('Error calculating gameweek points:', error);
      return 0;
    }
  }

  // Broadcast updates to connected clients
  async broadcastUpdates() {
    try {
      const liveData = {
        fixtures: Array.from(this.liveFixtures.values()),
        playerScores: Array.from(this.playerScores.values()),
        leagueUpdates: Object.fromEntries(this.leagueUpdates),
        gameweek: this.currentGameweek,
        lastUpdate: this.lastUpdate?.toISOString()
      };
      
      // Broadcast via socket service
      await socketService.broadcastLiveScores(liveData);
      
      console.log('📡 Live updates broadcasted successfully');
    } catch (error) {
      console.error('Error broadcasting updates:', error);
    }
  }

  // Get current live data
  getCurrentLiveData() {
    return {
      fixtures: Array.from(this.liveFixtures.values()),
      playerScores: Array.from(this.playerScores.values()),
      leagueUpdates: Object.fromEntries(this.leagueUpdates),
      gameweek: this.currentGameweek,
      lastUpdate: this.lastUpdate?.toISOString(),
      isRunning: this.isRunning
    };
  }

  // Get live status
  getLiveStatus() {
    return {
      isRunning: this.isRunning,
      currentGameweek: this.currentGameweek,
      lastUpdate: this.lastUpdate?.toISOString(),
      connectedUsers: socketService.getConnectionStats().connectedUsers
    };
  }

  // Get gameweek scores
  async getGameweekScores(gameweekId) {
    try {
      // Get all league entries for this gameweek
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const entries = await prisma.leagueEntry.findMany({
        where: {
          league: {
            startGameweek: gameweekId
          },
          isActive: true
        },
        include: {
          linkedTeam: true,
          user: true,
          league: true
        }
      });

      // Calculate scores for each entry
      const scores = [];
      for (const entry of entries) {
        try {
          const gameweekPoints = await this.calculateUserGameweekPoints(
            entry.linkedTeam.fplTeamId, 
            gameweekId
          );
          
          scores.push({
            userId: entry.userId,
            username: entry.user.username,
            fplTeamId: entry.linkedTeam.fplTeamId,
            teamName: entry.linkedTeam.teamName,
            gameweekPoints,
            leagueName: entry.league.name,
            leagueType: entry.league.type
          });
        } catch (error) {
          console.error(`Error calculating score for entry ${entry.id}:`, error);
        }
      }

      // Sort by gameweek points (descending)
      scores.sort((a, b) => b.gameweekPoints - a.gameweekPoints);
      
      await prisma.$disconnect();
      return scores;
    } catch (error) {
      console.error('Error getting gameweek scores:', error);
      return [];
    }
  }

  // Get live league standings
  async getLeagueLiveStandings(leagueId) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
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
        orderBy: [
          { gameweekPoints: 'desc' },
          { entryTime: 'asc' }
        ]
      });

      // Calculate live standings
      const standings = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        standings.push({
          rank: i + 1,
          userId: entry.userId,
          username: entry.user.username,
          fplTeamId: entry.linkedTeam.fplTeamId,
          teamName: entry.linkedTeam.teamName,
          gameweekPoints: entry.gameweekPoints,
          totalPoints: entry.totalPoints,
          leagueName: entry.league.name
        });
      }
      
      await prisma.$disconnect();
      return standings;
    } catch (error) {
      console.error('Error getting live league standings:', error);
      return [];
    }
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const liveScoringService = new LiveScoringService();
module.exports = liveScoringService;

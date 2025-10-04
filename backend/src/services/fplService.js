// File: fpl-hub-backend/src/services/fplService.js
// This service handles all FPL API interactions

const axios = require('axios');

class FPLService {
  constructor() {
    this.baseURL = 'https://fantasy.premierleague.com/api';
    this.cache = {
      bootstrap: null,
      lastFetch: null,
      cacheTime: 5 * 60 * 1000 // 5 minutes cache
    };
  }

  // Get all FPL data (players, teams, gameweeks)
  async getBootstrapData() {
    try {
      // Check cache first
      if (this.cache.bootstrap && this.cache.lastFetch) {
        const now = Date.now();
        if (now - this.cache.lastFetch < this.cache.cacheTime) {
          console.log('📦 Returning cached FPL data');
          return this.cache.bootstrap;
        }
      }

      console.log('🔄 Fetching fresh FPL data...');
      const response = await axios.get(`${this.baseURL}/bootstrap-static/`, {
        timeout: 5000 // 5 second timeout
      });
      
      // Update cache
      this.cache.bootstrap = response.data;
      this.cache.lastFetch = Date.now();
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching FPL data:', error.message);
      throw error;
    }
  }

  // Get all players with formatted data
  async getPlayers() {
    try {
      const data = await this.getBootstrapData();
      
      // Format player data for easier use
      const players = data.elements.map(player => ({
        id: player.id,
        firstName: player.first_name,
        lastName: player.second_name,
        displayName: player.web_name,
        team: data.teams.find(t => t.id === player.team)?.name,
        teamId: player.team,
        position: this.getPositionName(player.element_type),
        positionId: player.element_type,
        price: player.now_cost / 10, // Convert to millions
        points: player.total_points,
        form: player.form,
        selectedBy: `${player.selected_by_percent}%`,
        news: player.news || '',
        status: player.status,
        photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`
      }));

      return players;
    } catch (error) {
      console.error('❌ Error getting players:', error.message);
      throw error;
    }
  }

  // Get players filtered by position
  async getPlayersByPosition(positionId) {
    const players = await this.getPlayers();
    return players.filter(p => p.positionId === positionId);
  }

  // Get players filtered by team
  async getPlayersByTeam(teamId) {
    const players = await this.getPlayers();
    return players.filter(p => p.teamId === teamId);
  }

  // Get players within budget
  async getPlayersByBudget(maxPrice) {
    const players = await this.getPlayers();
    return players.filter(p => p.price <= maxPrice);
  }

  // Get current gameweek
  async getCurrentGameweek() {
    try {
      const data = await this.getBootstrapData();
      const currentGW = data.events.find(event => event.is_current);
      
      if (!currentGW) {
        // If no current gameweek, get the next one
        const nextGW = data.events.find(event => event.is_next);
        return nextGW || data.events[0];
      }
      
      return currentGW;
    } catch (error) {
      console.error('❌ Error getting gameweek:', error.message);
      throw error;
    }
  }

  // Get specific gameweek by ID
  async getGameweekById(gameweekId) {
    try {
      const data = await this.getBootstrapData();
      const gameweek = data.events.find(event => event.id === gameweekId);
      
      if (!gameweek) {
        return null; // Gameweek not found
      }
      
      return gameweek;
    } catch (error) {
      console.error('❌ Error getting gameweek by ID:', error.message);
      throw error;
    }
  }

  // Get first match kickoff time for a gameweek
  async getFirstMatchKickoff(gameweekId) {
    try {
      const response = await axios.get(`${this.baseURL}/fixtures/?event=${gameweekId}`, {
        timeout: 5000
      });
      
      const fixtures = response.data;
      if (!fixtures || fixtures.length === 0) {
        throw new Error(`No fixtures found for gameweek ${gameweekId}`);
      }
      
      // Find the earliest kickoff time
      const firstFixture = fixtures.reduce((earliest, fixture) => {
        const fixtureTime = new Date(fixture.kickoff_time);
        const earliestTime = new Date(earliest.kickoff_time);
        return fixtureTime < earliestTime ? fixture : earliest;
      });
      
      console.log(`🏈 First match kickoff for GW${gameweekId}: ${firstFixture.kickoff_time}`);
      return new Date(firstFixture.kickoff_time);
    } catch (error) {
      console.error('Error getting first match kickoff:', error);
      throw error;
    }
  }

  // Get live match data for a gameweek
  async getLiveGameweekData(gameweekId) {
    try {
      const response = await axios.get(`${this.baseURL}/event/${gameweekId}/live/`, {
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting live gameweek data:', error);
      throw error;
    }
  }

  // Get all teams (Premier League clubs)
  async getTeams() {
    try {
      const data = await this.getBootstrapData();
      return data.teams.map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        strength: team.strength,
        code: team.code
      }));
    } catch (error) {
      console.error('❌ Error getting teams:', error.message);
      throw error;
    }
  }

  // Get FPL team by ID
  async getTeamById(teamId) {
    try {
      const response = await axios.get(`${this.baseURL}/entry/${teamId}/`);
      const teamData = response.data;
      
      return {
        id: teamData.id,
        name: teamData.name,
        playerFirstName: teamData.player_first_name,
        playerLastName: teamData.player_last_name,
        totalPoints: teamData.summary_overall_points,
        overallRank: teamData.summary_overall_rank,
        teamValue: teamData.summary_event_points,
        bank: teamData.last_deadline_bank / 10, // Convert to millions
        transfers: teamData.last_deadline_total_transfers,
        gameweek: teamData.current_event
      };
    } catch (error) {
      console.error('❌ Error getting FPL team:', error.message);
      if (error.response && error.response.status === 404) {
        return null; // Team not found
      }
      throw error;
    }
  }

  // Get FPL team squad
  async getTeamSquad(teamId) {
    try {
      const [teamResponse, picksResponse] = await Promise.all([
        axios.get(`${this.baseURL}/entry/${teamId}/`),
        axios.get(`${this.baseURL}/entry/${teamId}/event/${await this.getCurrentGameweekId()}/picks/`)
      ]);

      const teamData = teamResponse.data;
      const picksData = picksResponse.data;
      const bootstrapData = await this.getBootstrapData();

      // Get team info
      const team = {
        id: teamData.id,
        name: teamData.name,
        playerFirstName: teamData.player_first_name,
        playerLastName: teamData.player_last_name,
        totalPoints: teamData.summary_overall_points,
        overallRank: teamData.summary_overall_rank,
        teamValue: teamData.summary_event_points,
        bank: teamData.last_deadline_bank / 10,
        transfers: teamData.last_deadline_total_transfers,
        gameweek: teamData.current_event
      };

      // Format squad data
      const squad = {
        team: team,
        players: picksData.picks.map(pick => {
          const player = bootstrapData.elements.find(p => p.id === pick.element);
          const team = bootstrapData.teams.find(t => t.id === player.team);
          
          return {
            id: player.id,
            name: player.web_name,
            firstName: player.first_name,
            lastName: player.second_name,
            team: team.name,
            teamId: player.team,
            position: this.getPositionName(player.element_type),
            positionId: player.element_type,
            price: player.now_cost / 10,
            points: player.total_points,
            form: player.form,
            selectedBy: `${player.selected_by_percent}%`,
            status: player.status,
            photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`,
            isCaptain: pick.is_captain,
            isViceCaptain: pick.is_vice_captain,
            multiplier: pick.multiplier,
            squadPosition: pick.position
          };
        }),
        chips: picksData.chips || [],
        automaticSubs: picksData.automatic_subs || []
      };

      return squad;
    } catch (error) {
      console.error('❌ Error getting FPL squad:', error.message);
      if (error.response && error.response.status === 404) {
        return null; // Team not found
      }
      throw error;
    }
  }

  // Get current gameweek ID
  async getCurrentGameweekId() {
    try {
      const gameweek = await this.getCurrentGameweek();
      return gameweek.id;
    } catch (error) {
      console.error('❌ Error getting current gameweek ID:', error.message);
      return 1; // Default to gameweek 1
    }
  }

  // Get FPL team's gameweek data (for points calculation)
  async getTeamGameweekData(teamId, gameweekId) {
    try {
      const response = await axios.get(`${this.baseURL}/entry/${teamId}/event/${gameweekId}/picks/`);
      const bootstrapData = await this.getBootstrapData();
      
      return {
        picks: response.data.picks,
        elements: bootstrapData.elements,
        chips: response.data.chips || []
      };
    } catch (error) {
      console.error('❌ Error getting team gameweek data:', error.message);
      return null;
    }
  }

  // Get live gameweek data
  async getLiveGameweekData(gameweekId) {
    try {
      const response = await axios.get(`${this.baseURL}/event/${gameweekId}/live/`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting live data:', error.message);
      throw error;
    }
  }

  // Get fixtures
  async getFixtures(gameweekId = null) {
    try {
      let url = `${this.baseURL}/fixtures/`;
      if (gameweekId) {
        url += `?event=${gameweekId}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting fixtures:', error.message);
      throw error;
    }
  }

  // Get gameweek fixtures (alias for getFixtures)
  async getGameweekFixtures(gameweekId) {
    return this.getFixtures(gameweekId);
  }

  // Get gameweek fixtures with detailed status analysis
  async getGameweekFixturesDetailed(gameweekId) {
    try {
      const fixtures = await this.getFixtures(gameweekId);
      
      if (!fixtures || fixtures.length === 0) {
        return {
          fixtures: [],
          earliestKickoff: null,
          latestKickoff: null,
          allFinished: true,
          anyInProgress: false,
          anyScheduled: false,
          anyPostponed: false
        };
      }

      // Analyze fixture statuses
      const statuses = fixtures.map(f => f.status);
      const kickoffTimes = fixtures.map(f => new Date(f.kickoff_time));
      
      const earliestKickoff = new Date(Math.min(...kickoffTimes));
      const latestKickoff = new Date(Math.max(...kickoffTimes));
      
      const allFinished = statuses.every(status => 
        ['finished', 'awarded'].includes(status)
      );
      
      const anyInProgress = statuses.some(status => 
        ['in_progress'].includes(status)
      );
      
      const anyScheduled = statuses.some(status => 
        ['scheduled'].includes(status)
      );
      
      const anyPostponed = statuses.some(status => 
        ['postponed'].includes(status)
      );

      return {
        fixtures,
        earliestKickoff,
        latestKickoff,
        allFinished,
        anyInProgress,
        anyScheduled,
        anyPostponed,
        statusCounts: {
          finished: statuses.filter(s => s === 'finished').length,
          awarded: statuses.filter(s => s === 'awarded').length,
          in_progress: statuses.filter(s => s === 'in_progress').length,
          scheduled: statuses.filter(s => s === 'scheduled').length,
          postponed: statuses.filter(s => s === 'postponed').length
        }
      };
    } catch (error) {
      console.error('❌ Error getting detailed gameweek fixtures:', error.message);
      throw error;
    }
  }

  // Get first fixture kickoff time for a gameweek (enhanced)
  async getFirstFixtureKickoff(gameweekId) {
    try {
      const fixtureData = await this.getGameweekFixturesDetailed(gameweekId);
      return fixtureData.earliestKickoff;
    } catch (error) {
      console.error('❌ Error getting first fixture kickoff:', error.message);
      throw error;
    }
  }

  // Check if gameweek is live (has fixtures in progress)
  async isGameweekLive(gameweekId) {
    try {
      const fixtureData = await this.getGameweekFixturesDetailed(gameweekId);
      return fixtureData.anyInProgress;
    } catch (error) {
      console.error('❌ Error checking if gameweek is live:', error.message);
      return false;
    }
  }

  // Check if all fixtures in gameweek are finished
  async areAllFixturesFinished(gameweekId) {
    try {
      const fixtureData = await this.getGameweekFixturesDetailed(gameweekId);
      return fixtureData.allFinished;
    } catch (error) {
      console.error('❌ Error checking if all fixtures finished:', error.message);
      return false;
    }
  }

  // Get detailed fixture data with player stats
  async getFixtureDetails(fixtureId) {
    try {
      const response = await axios.get(`${this.baseURL}/fixtures/?ids=${fixtureId}`);
      return response.data[0];
    } catch (error) {
      console.error('❌ Error getting fixture details:', error.message);
      return null;
    }
  }

  // Calculate gameweek points for a team
  async calculateGameweekPoints(fplTeamId, gameweekId) {
    try {
      const gameweekData = await this.getTeamGameweekData(fplTeamId, gameweekId);
      
      if (!gameweekData || !gameweekData.picks) {
        return 0;
      }

      let totalPoints = 0;

      // Calculate points from each player
      gameweekData.picks.forEach(pick => {
        const player = gameweekData.elements.find(p => p.id === pick.element);
        if (player && player.event_points) {
          totalPoints += player.event_points;
        }
      });

      return totalPoints;
    } catch (error) {
      console.error('Error calculating gameweek points:', error);
      return 0;
    }
  }

  // Helper function to get position name
  getPositionName(positionId) {
    const positions = {
      1: 'GKP',
      2: 'DEF', 
      3: 'MID',
      4: 'FWD'
    };
    return positions[positionId] || 'Unknown';
  }


}

module.exports = new FPLService();
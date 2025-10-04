// File: fpl-hub-backend/src/models/leagueModel.js
// Simple in-memory storage for leagues

class LeagueModel {
  constructor() {
    this.leagues = [];
    this.nextId = 1;
  }

  // Create a new league
  createLeague(leagueData) {
    const league = {
      id: this.nextId++,
      name: leagueData.name || 'Unnamed League',
      type: leagueData.type || 'classic', // classic, head-to-head
      entryFee: leagueData.entryFee || 0,
      maxTeams: leagueData.maxTeams || 100,
      currentTeams: [],
      gameweek: leagueData.gameweek || 1,
      prizePool: 0,
      status: 'open', // open, in-progress, completed
      createdBy: leagueData.createdBy || 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.leagues.push(league);
    return league;
  }

  // Get all leagues
  getAllLeagues() {
    return this.leagues;
  }

  // Get open leagues
  getOpenLeagues() {
    return this.leagues.filter(league => 
      league.status === 'open' && 
      league.currentTeams.length < league.maxTeams
    );
  }

  // Get league by ID
  getLeagueById(id) {
    return this.leagues.find(league => league.id === parseInt(id));
  }

  // Join league
  joinLeague(leagueId, teamData) {
    const league = this.getLeagueById(leagueId);
    if (!league) return null;
    
    // Check if league is full
    if (league.currentTeams.length >= league.maxTeams) {
      throw new Error('League is full');
    }
    
    // Check if team already in league
    if (league.currentTeams.find(t => t.teamId === teamData.teamId)) {
      throw new Error('Team already in this league');
    }
    
    // Add team to league
    league.currentTeams.push({
      teamId: teamData.teamId,
      teamName: teamData.teamName,
      userId: teamData.userId,
      points: 0,
      rank: 0,
      joinedAt: new Date().toISOString()
    });
    
    // Update prize pool
    league.prizePool += league.entryFee;
    league.updatedAt = new Date().toISOString();
    
    // Check if league should start
    if (league.currentTeams.length >= league.maxTeams) {
      league.status = 'in-progress';
    }
    
    return league;
  }

  // Leave league
  leaveLeague(leagueId, teamId) {
    const league = this.getLeagueById(leagueId);
    if (!league) return null;
    
    const index = league.currentTeams.findIndex(t => t.teamId === parseInt(teamId));
    if (index === -1) return null;
    
    league.currentTeams.splice(index, 1);
    league.prizePool = Math.max(0, league.prizePool - league.entryFee);
    league.updatedAt = new Date().toISOString();
    
    return league;
  }

  // Update league standings
  updateStandings(leagueId, standings) {
    const league = this.getLeagueById(leagueId);
    if (!league) return null;
    
    // Update points and ranks
    standings.forEach(standing => {
      const team = league.currentTeams.find(t => t.teamId === standing.teamId);
      if (team) {
        team.points = standing.points;
        team.rank = standing.rank;
      }
    });
    
    league.updatedAt = new Date().toISOString();
    return league;
  }

  // Calculate prize distribution
  calculatePrizes(leagueId) {
    const league = this.getLeagueById(leagueId);
    if (!league) return null;
    
    const prizePool = league.prizePool;
    const platformFee = prizePool * 0.1; // 10% platform fee
    const distributionPool = prizePool - platformFee;
    
    // Prize distribution based on your document
    const distribution = {
      1: distributionPool * 0.20,  // 1st: 20%
      2: distributionPool * 0.08,  // 2nd-5th: 8% each
      3: distributionPool * 0.08,
      4: distributionPool * 0.08,
      5: distributionPool * 0.08,
      6: distributionPool * 0.04,  // 6th-10th: 4% each
      7: distributionPool * 0.04,
      8: distributionPool * 0.04,
      9: distributionPool * 0.04,
      10: distributionPool * 0.04,
      11: distributionPool * 0.02, // 11th-15th: 2% each
      12: distributionPool * 0.02,
      13: distributionPool * 0.02,
      14: distributionPool * 0.02,
      15: distributionPool * 0.02,
      16: distributionPool * 0.018, // 16th-25th: 1.8% each
      17: distributionPool * 0.018,
      18: distributionPool * 0.018,
      19: distributionPool * 0.018,
      20: distributionPool * 0.018,
      21: distributionPool * 0.018,
      22: distributionPool * 0.018,
      23: distributionPool * 0.018,
      24: distributionPool * 0.018,
      25: distributionPool * 0.018
    };
    
    return {
      prizePool,
      platformFee,
      distribution
    };
  }

  // Delete league
  deleteLeague(id) {
    const index = this.leagues.findIndex(league => league.id === parseInt(id));
    if (index === -1) return false;
    
    this.leagues.splice(index, 1);
    return true;
  }

  // Clear all leagues (for testing)
  clearAll() {
    this.leagues = [];
    this.nextId = 1;
  }
}

module.exports = new LeagueModel();
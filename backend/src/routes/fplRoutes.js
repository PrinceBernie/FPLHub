// File: fpl-hub-backend/src/routes/fplRoutes.js
// API routes for FPL data

const express = require('express');
const router = express.Router();
const fplService = require('../services/fplService');
const { authMiddleware } = require('../middleware/auth');
const { UserService } = require('../services/databaseService');

// Get all players
router.get('/players', async (req, res) => {
  try {
    const players = await fplService.getPlayers();
    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get players by position (1=GKP, 2=DEF, 3=MID, 4=FWD)
router.get('/players/position/:positionId', async (req, res) => {
  try {
    const positionId = parseInt(req.params.positionId);
    const players = await fplService.getPlayersByPosition(positionId);
    res.json({
      success: true,
      position: fplService.getPositionName(positionId),
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get players by team
router.get('/players/team/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const players = await fplService.getPlayersByTeam(teamId);
    res.json({
      success: true,
      teamId: teamId,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get players within budget
router.get('/players/budget/:maxPrice', async (req, res) => {
  try {
    const maxPrice = parseFloat(req.params.maxPrice);
    const players = await fplService.getPlayersByBudget(maxPrice);
    res.json({
      success: true,
      maxBudget: maxPrice,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all Premier League teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await fplService.getTeams();
    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current gameweek
router.get('/gameweek/current', async (req, res) => {
  try {
    const gameweek = await fplService.getCurrentGameweek();
    res.json({
      success: true,
      data: gameweek
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current gameweek (alternative route)
router.get('/gameweek', async (req, res) => {
  try {
    const gameweek = await fplService.getCurrentGameweek();
    res.json({
      success: true,
      data: gameweek
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get fixtures
router.get('/fixtures', async (req, res) => {
  try {
    const gameweekId = req.query.gameweek ? parseInt(req.query.gameweek) : null;
    const fixtures = await fplService.getFixtures(gameweekId);
    res.json({
      success: true,
      count: fixtures.length,
      data: fixtures
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



// Get bootstrap data (all FPL data)
router.get('/bootstrap', async (req, res) => {
  try {
    const data = await fplService.getBootstrapData();
    res.json({
      success: true,
      data: {
        players: data.elements.length,
        teams: data.teams.length,
        gameweeks: data.events.length,
        currentGameweek: data.events.find(e => e.is_current)?.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NEW: Get FPL team by ID (for validation)
router.get('/team/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (!teamId || teamId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const team = await fplService.getTeamById(teamId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'FPL team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Get FPL team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FPL team'
    });
  }
});

// NEW: Get FPL team squad by ID
router.get('/team/:teamId/squad', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    if (!teamId || teamId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const squad = await fplService.getTeamSquad(teamId);
    
    if (!squad) {
      return res.status(404).json({
        success: false,
        error: 'FPL team squad not found'
      });
    }

    res.json({
      success: true,
      data: squad
    });
  } catch (error) {
    console.error('Get FPL squad error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FPL squad'
    });
  }
});

// Get FPL events (gameweeks)
router.get('/events', async (req, res) => {
  try {
    const data = await fplService.getBootstrapData();
    
    res.json({
      success: true,
      data: data.events
    });
  } catch (error) {
    console.error('Get FPL events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FPL events'
    });
  }
});

// Get specific FPL event (gameweek)
router.get('/events/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (!eventId || eventId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    const event = await fplService.getGameweekById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'FPL event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get FPL event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FPL event'
    });
  }
});

// NEW: Get FPL team URL for redirecting to official FPL app
router.get('/team/:teamId/url', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const gameweekId = req.query.gameweek ? parseInt(req.query.gameweek) : null;
    
    if (!teamId || teamId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    // Validate that the FPL team exists
    const team = await fplService.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'FPL team not found'
      });
    }

    // Generate the official FPL team URL
    let fplUrl = `https://fantasy.premierleague.com/entry/${teamId}`;
    
    // If gameweek is specified, add it to the URL
    if (gameweekId && gameweekId > 0) {
      fplUrl += `/event/${gameweekId}`;
    }

    res.json({
      success: true,
      data: {
        fplTeamId: teamId,
        teamName: team.name,
        fplUrl: fplUrl,
        gameweek: gameweekId || 'current'
      }
    });
  } catch (error) {
    console.error('Get FPL team URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate FPL team URL'
    });
  }
});

module.exports = router;
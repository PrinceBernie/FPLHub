const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const LeagueCreationService = require('../services/leagueCreationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a new league
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const leagueData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'leagueFormat', 'entryType', 'startGameweek'];
    for (const field of requiredFields) {
      if (!leagueData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`
        });
      }
    }

    // Validate league name uniqueness
    if (leagueData.name.length < 3 || leagueData.name.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'League name must be between 3 and 50 characters'
      });
    }

    // Get user info to check if admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, adminLevel: true }
    });

    // Validate max teams based on user role
    if (leagueData.maxTeams) {
      const isAdmin = user?.isAdmin || user?.adminLevel === 'ADMIN' || user?.adminLevel === 'SUPER_ADMIN';
      const maxLimit = isAdmin ? 10000 : 400; // Admin can create up to 10,000, users up to 400
      
      if (leagueData.maxTeams < 2 || leagueData.maxTeams > maxLimit) {
        return res.status(400).json({
          success: false,
          error: `Maximum teams must be between 2 and ${maxLimit}${isAdmin ? ' (admin limit)' : ''}`
        });
      }
    }

    const result = await LeagueCreationService.createLeague(leagueData, userId);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('League creation route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get available gameweeks for league creation
router.get('/available-gameweeks', authMiddleware, async (req, res) => {
  try {
    const result = await LeagueCreationService.getAvailableGameweeks();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Available gameweeks route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user's created leagues
router.get('/my-leagues', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const season = parseInt(req.query.season) || 2024;

    const result = await LeagueCreationService.getUserLeagues(userId, season);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('My leagues route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get league details
router.get('/:leagueId', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const result = await LeagueCreationService.getLeagueDetails(leagueId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('League details route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get prize distribution templates
router.get('/prize-templates', authMiddleware, (req, res) => {
  try {
    const templates = LeagueCreationService.getPrizeDistributionTemplates();
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Prize templates route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Calculate prize distribution preview
router.post('/calculate-prize', authMiddleware, (req, res) => {
  try {
    const { entryFee, participantCount, distributionType, fixedPrizes } = req.body;

    if (!entryFee || !participantCount || !distributionType) {
      return res.status(400).json({
        success: false,
        error: 'Entry fee, participant count, and distribution type are required'
      });
    }

    const calculation = LeagueCreationService.calculatePrizeDistribution(
      entryFee, 
      participantCount, 
      distributionType,
      fixedPrizes
    );

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Prize calculation route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Validate knockout rounds for head-to-head
router.post('/validate-knockout', authMiddleware, (req, res) => {
  try {
    const { participantCount, requestedRounds } = req.body;

    if (!participantCount || !requestedRounds) {
      return res.status(400).json({
        success: false,
        error: 'Participant count and requested rounds are required'
      });
    }

    const validatedRounds = LeagueCreationService.validateKnockoutRounds(
      participantCount, 
      requestedRounds
    );

    res.json({
      success: true,
      data: {
        participantCount,
        requestedRounds,
        validatedRounds,
        adjusted: validatedRounds !== requestedRounds
      }
    });
  } catch (error) {
    console.error('Knockout validation route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

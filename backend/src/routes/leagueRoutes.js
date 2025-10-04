// File: fpl-hub-backend/src/routes/leagueRoutes.js
// League management routes for weekly leagues

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { UserService, TransactionService, LeagueService, prisma } = require('../services/databaseService');
const fplService = require('../services/fplService');

// Get current gameweek leagues
router.get('/current', async (req, res) => {
  try {
    let currentGameweek;
    let leagues = [];
    
    try {
      // Use our new two-step verification system to determine current gameweek
      const automaticLeagueService = require('../services/automaticLeagueService');
      const gameweekEnded = await automaticLeagueService.hasCurrentGameweekEnded();
      
      if (gameweekEnded) {
        // Current gameweek has ended, so the "current" is actually the next one
        const fplCurrent = await fplService.getCurrentGameweek();
        currentGameweek = {
          id: fplCurrent.id + 1,
          name: `Gameweek ${fplCurrent.id + 1}`,
          deadline_time: new Date().toISOString(),
          is_current: true,
          is_next: false
        };
      } else {
        // Current gameweek is still active
        currentGameweek = await fplService.getCurrentGameweek();
        console.log('Current FPL gameweek:', currentGameweek.id);
      }
      
      // Get leagues for the current gameweek
      leagues = await LeagueService.getCurrentGameweekLeagues();
      console.log('Found leagues:', leagues.length);
    } catch (fplError) {
      console.warn('FPL API timeout or error, using fallback:', fplError.message);
      
      // Fallback: use a default gameweek and get all active leagues
      currentGameweek = {
        id: 1,
        name: 'Gameweek 1',
        deadline_time: new Date().toISOString(),
        is_current: true
      };
      
      // Get all active leagues as fallback
      leagues = await prisma.league.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          entries: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('Using fallback data - found leagues:', leagues.length);
    }
    
    res.json({
      success: true,
      data: {
        currentGameweek: currentGameweek,
        leagues: leagues
      }
    });
  } catch (error) {
    console.error('Get current leagues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current leagues'
    });
  }
});

// Get leagues for a specific gameweek (public endpoint for users)
router.get('/gameweek/:gameweekId', async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweek = parseInt(gameweekId);
    
    if (isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gameweek. Must be between 1 and 38.'
      });
    }
    
    const currentSeason = new Date().getFullYear();
    const leagues = await prisma.league.findMany({
      where: { 
        startGameweek: gameweek,
        season: currentSeason,
        // Only show public leagues that users can join
        isPrivate: false,
        leagueState: 'OPEN_FOR_ENTRY'
      },
      select: {
        id: true,
        name: true,
        type: true,
        entryType: true,
        entryFee: true,
        maxTeams: true,
        startGameweek: true,
        status: true,
        leagueState: true,
        description: true
      },
      orderBy: { type: 'asc' } // FREE leagues first, then PAID
    });
    
    console.log(`Found ${leagues.length} leagues for Gameweek ${gameweek}`);
    
    res.json({
      success: true,
      data: leagues
    });
  } catch (error) {
    console.error('Get gameweek leagues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gameweek leagues'
    });
  }
});

// Get upcoming leagues (next gameweek)
router.get('/upcoming', async (req, res) => {
  try {
    let currentGameweek;
    let nextGameweek;
    let leagues = [];
    
    try {
      // Use our new two-step verification system to determine current gameweek
      const automaticLeagueService = require('../services/automaticLeagueService');
      const gameweekEnded = await automaticLeagueService.hasCurrentGameweekEnded();
      
      if (gameweekEnded) {
        // Current gameweek has ended, so the "current" is actually the next one
        const fplCurrent = await fplService.getCurrentGameweek();
        currentGameweek = {
          id: fplCurrent.id + 1,
          name: `Gameweek ${fplCurrent.id + 1}`,
          deadline_time: new Date().toISOString(),
          is_current: true,
          is_next: false
        };
        
        nextGameweek = {
          id: fplCurrent.id + 2,
          name: `Gameweek ${fplCurrent.id + 2}`,
          deadline_time: new Date().toISOString(),
          is_current: false,
          is_next: true
        };
      } else {
        // Current gameweek is still active
        currentGameweek = await fplService.getCurrentGameweek();
        console.log('Current FPL gameweek:', currentGameweek.id);
        
        // Calculate next gameweek
        nextGameweek = {
          id: currentGameweek.id + 1,
          name: `Gameweek ${currentGameweek.id + 1}`,
          deadline_time: new Date().toISOString(),
          is_current: false,
          is_next: true
        };
      }
      
      // Get leagues for the next gameweek
      const currentSeason = new Date().getFullYear();
      leagues = await prisma.league.findMany({
        where: { 
          startGameweek: nextGameweek.id,
          season: currentSeason,
          // Only show public leagues that users can join
          isPrivate: false,
          isInvitational: false
        },
        include: {
          entries: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('Found upcoming leagues:', leagues.length);
    } catch (fplError) {
      console.warn('FPL API timeout or error, using fallback:', fplError.message);
      
      // Fallback: use a default next gameweek and get all active leagues
      currentGameweek = {
        id: 1,
        name: 'Gameweek 1',
        deadline_time: new Date().toISOString(),
        is_current: true
      };
      
      nextGameweek = {
        id: 2,
        name: 'Gameweek 2',
        deadline_time: new Date().toISOString(),
        is_current: false,
        is_next: true
      };
      
      // Get all active leagues as fallback
      leagues = await prisma.league.findMany({
        where: {
          status: 'OPEN'
        },
        include: {
          entries: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('Using fallback data - found upcoming leagues:', leagues.length);
    }
    
    res.json({
      success: true,
      data: {
        currentGameweek: currentGameweek,
        nextGameweek: nextGameweek,
        leagues: leagues
      }
    });
  } catch (error) {
    console.error('Get upcoming leagues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upcoming leagues'
    });
  }
});

// Get league details by code (for invitational leagues)
router.get('/code/:leagueCode', async (req, res) => {
  try {
    const { leagueCode } = req.params;
    const league = await LeagueService.getLeagueByCode(leagueCode);
    
    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // For invitational leagues, only show basic info until joined
    const leagueInfo = {
      id: league.id,
      name: league.name,
      leagueFormat: league.leagueFormat,
      entryFee: league.entryFee,
      maxTeams: league.maxTeams,
      currentTeams: league.entries?.length || 0,
      season: league.season,
      startGameweek: league.startGameweek,
      description: league.description,
      isInvitational: league.isInvitational,
      creator: {
        username: league.creator?.username,
        isVerified: league.creator?.isVerified
      }
    };
    
    res.json({
      success: true,
      data: leagueInfo
    });
  } catch (error) {
    console.error('Get league by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get league details'
    });
  }
});

// Get league details
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const league = await LeagueService.getLeagueById(leagueId);
    
    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    const standings = await LeagueService.getLeagueStandings(leagueId);
    
    res.json({
      success: true,
      data: {
        league,
        standings
      }
    });
  } catch (error) {
    console.error('Get league error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get league details'
    });
  }
});

// Join league
router.post('/:leagueId/join', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { linkedTeamId, leagueCode } = req.body;
    const userId = req.userId;

    // Validate linked team belongs to user
    const linkedTeam = await UserService.getLinkedTeamById(linkedTeamId);
    if (!linkedTeam || linkedTeam.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Invalid linked team'
      });
    }

    // Get league details to check if it's invitational
    const league = await LeagueService.getLeagueById(leagueId);
    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Check if league is invitational and requires code
    if (league.isInvitational && league.leagueCode !== leagueCode) {
      return res.status(403).json({
        success: false,
        error: 'Invalid league code. Please check the code and try again.'
      });
    }

    // Join league
    const entry = await LeagueService.joinLeague(userId, linkedTeamId, leagueId);
    
    res.json({
      success: true,
      message: 'Successfully joined league',
      data: entry
    });
  } catch (error) {
    console.error('Join league error:', error);
    
    if (error.message.includes('already in this league')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('League is full')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to join league'
    });
  }
});

// Bulk join multiple teams to league (optimized for performance)
router.post('/:leagueId/bulk-join', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { linkedTeamIds, leagueCode } = req.body;
    const userId = req.userId;

    if (!Array.isArray(linkedTeamIds) || linkedTeamIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'linkedTeamIds must be a non-empty array'
      });
    }

    // Get league details to check if it's invitational
    const league = await LeagueService.getLeagueById(leagueId);
    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Check if league is invitational and requires code
    if (league.isInvitational && league.leagueCode !== leagueCode) {
      return res.status(403).json({
        success: false,
        error: 'Invalid league code. Please check the code and try again.'
      });
    }

    // Validate all linked teams belong to user
    const linkedTeams = await Promise.all(
      linkedTeamIds.map(id => UserService.getLinkedTeamById(id))
    );

    const invalidTeams = linkedTeams.filter((team, index) => 
      !team || team.userId !== userId
    );

    if (invalidTeams.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'One or more linked teams are invalid or don\'t belong to you'
      });
    }

    // Bulk join teams with optimized processing
    const results = await LeagueService.bulkJoinLeague(userId, linkedTeamIds, leagueId);
    
    res.json({
      success: true,
      message: `Successfully processed ${linkedTeamIds.length} team(s)`,
      data: {
        joined: results.joined,
        alreadyInLeague: results.alreadyInLeague,
        failed: results.failed,
        summary: {
          total: linkedTeamIds.length,
          joined: results.joined.length,
          alreadyInLeague: results.alreadyInLeague.length,
          failed: results.failed.length
        }
      }
    });
  } catch (error) {
    console.error('Bulk join league error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to bulk join league'
    });
  }
});

// Note: League exit functionality removed - no refunds allowed
// Users cannot leave leagues once joined to prevent refund complications

// Get league standings/leaderboard
router.get('/:leagueId/standings', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { enhanced = 'true' } = req.query; // Query parameter to enable enhanced standings
    
    // Import the leaderboard service
    const LeaderboardService = require('../services/leaderboardService');
    
    // Get leaderboard data (automatically handles default vs live)
    const leaderboardData = await LeaderboardService.getLeagueLeaderboard(leagueId);
    
    res.json({
      success: true,
      data: leaderboardData.leaderboard,
      leagueInfo: {
        leagueId: leaderboardData.leagueId,
        leagueName: leaderboardData.leagueName,
        totalEntries: leaderboardData.totalEntries,
        status: leaderboardData.status,
        currentGameweek: leaderboardData.currentGameweek,
        leagueStartGameweek: leaderboardData.leagueStartGameweek
      },
      enhanced: enhanced === 'true',
      liveProgress: leaderboardData.status === 'LIVE' ? 'enabled' : 'disabled'
    });
  } catch (error) {
    console.error('Get standings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get league standings'
    });
  }
});

// Get league leaderboard (dedicated endpoint)
router.get('/:leagueId/leaderboard', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { fast = 'false' } = req.query; // Query parameter for fast mode
    
    // Import the leaderboard service
    const LeaderboardService = require('../services/leaderboardService');
    
    // Get leaderboard data (automatically handles default vs live)
    const leaderboardData = await LeaderboardService.getLeagueLeaderboard(leagueId, fast === 'true');
    
    res.json({
      success: true,
      data: leaderboardData
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get league leaderboard'
    });
  }
});

// Update league points (for real-time updates)
router.post('/:leagueId/update-points', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { entries } = req.body; // Array of {linkedTeamId, points}
    
    // Update points for each entry
    for (const entry of entries) {
      await LeagueService.updateEntryPoints(leagueId, entry.linkedTeamId, entry.points);
    }
    
    // Update rankings
    await LeagueService.updateLeagueRankings(leagueId);
    
    res.json({
      success: true,
      message: 'League points updated successfully'
    });
  } catch (error) {
    console.error('Update points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update league points'
    });
  }
});

// Get user's league entries
router.get('/user/entries', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Debug: Log the user ID being used
    console.log(`League entries endpoint - Using User ID: ${userId}`);
    console.log(`League entries endpoint - User Email: ${req.userEmail}`);
    
    // Get user's league entries directly from the database
    const leagueEntries = await prisma.leagueEntry.findMany({
      where: { userId },
      include: {
        league: true,
        linkedTeam: true
      },
      orderBy: {
        entryTime: 'desc'
      }
    });
    
    console.log(`League entries endpoint - Found ${leagueEntries.length} entries for user ${userId}`);
    
    res.json({
      success: true,
      data: leagueEntries
    });
  } catch (error) {
    console.error('Get user entries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user league entries'
    });
  }
});

// Get user's joined leagues
router.get('/my-leagues', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const userLeagues = await LeagueService.getUserLeagues(userId);
    
    res.json({
      success: true,
      data: userLeagues
    });
  } catch (error) {
    console.error('Get user leagues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user leagues'
    });
  }
});

// Get league by code (for joining private leagues)
router.get('/by-code/:leagueCode', authMiddleware, async (req, res) => {
  try {
    const { leagueCode } = req.params;
    
    const league = await prisma.league.findFirst({
      where: { 
        leagueCode: leagueCode.toUpperCase(),
        isInvitational: true
      },
      include: {
        entries: {
          where: { isActive: true },
          include: {
            linkedTeam: true,
            user: true
          }
        }
      }
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found or invalid code'
      });
    }

    res.json({
      success: true,
      data: league
    });
  } catch (error) {
    console.error('Get league by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get league'
    });
  }
});

module.exports = router;
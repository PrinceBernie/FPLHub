// File: fpl-hub-backend/src/routes/automaticLeagueRoutes.js
// Automatic League Management Routes

const express = require('express');
const router = express.Router();
const { adminAuthMiddleware, isAdmin, isSuperAdmin } = require('../middleware/adminAuth');
const AutomaticLeagueService = require('../services/automaticLeagueService');
const leagueScheduler = require('../services/leagueSchedulerService');

// ============================================================================
// AUTOMATIC LEAGUE MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/leagues/auto/create-next
 * @desc    Manually trigger creation of next gameweek leagues
 * @access  Admin+
 */
router.post('/auto/create-next', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await AutomaticLeagueService.createNextGameweekLeagues();
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Create next gameweek leagues error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create next gameweek leagues'
    });
  }
});

/**
 * @route   POST /api/admin/leagues/auto/unlock
 * @desc    Manually trigger unlocking of leagues for entry
 * @access  Admin+
 */
router.post('/auto/unlock', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { forceUnlock = false } = req.body;
    const result = await AutomaticLeagueService.unlockLeaguesForEntry(forceUnlock);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Unlock leagues error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unlock leagues'
    });
  }
});

/**
 * @route   POST /api/admin/leagues/auto/unlock-gameweek/:gameweekId
 * @desc    Manually unlock leagues for a specific gameweek (Super Admin only)
 * @access  Super Admin
 */
router.post('/auto/unlock-gameweek/:gameweekId', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweek = parseInt(gameweekId);
    
    if (isNaN(gameweek)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gameweek ID'
      });
    }

    const result = await AutomaticLeagueService.manuallyUnlockGameweekLeagues(gameweek, req.userId);
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Manual unlock gameweek error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to manually unlock gameweek leagues'
    });
  }
});

/**
 * @route   POST /api/admin/leagues/auto/process
 * @desc    Manually trigger automatic league management process
 * @access  Admin+
 */
router.post('/auto/process', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await AutomaticLeagueService.processAutomaticLeagueManagement();
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Process automatic league management error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process automatic league management'
    });
  }
});

/**
 * @route   GET /api/admin/leagues/auto/status
 * @desc    Get automatic league management status
 * @access  Admin+
 */
router.get('/auto/status', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { gameweek } = req.query;
    
    if (gameweek) {
      // Get status for specific gameweek
      const result = await AutomaticLeagueService.getLeagueStatus(parseInt(gameweek));
      res.json(result);
    } else {
      // Get general status
      const currentSeason = AutomaticLeagueService.getCurrentSeason();
      const currentGameweek = await require('../services/fplService').getCurrentGameweek();
      const nextGameweek = await AutomaticLeagueService.getNextGameweek();
      const gameweekEnded = await AutomaticLeagueService.hasCurrentGameweekEnded();
      
      res.json({
        success: true,
        data: {
          currentSeason,
          currentGameweek: {
            id: currentGameweek.id,
            name: currentGameweek.name,
            deadline: currentGameweek.deadline_time,
            hasEnded: gameweekEnded
          },
          nextGameweek: {
            id: nextGameweek.id,
            name: nextGameweek.name,
            deadline: nextGameweek.deadline_time
          },
          scheduler: leagueScheduler.getStatus()
        }
      });
    }
  } catch (error) {
    console.error('Get automatic league status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get automatic league status'
    });
  }
});

// ============================================================================
// SCHEDULER MANAGEMENT ROUTES (Super Admin Only)
// ============================================================================

/**
 * @route   POST /api/admin/leagues/scheduler/start
 * @desc    Start the automatic league scheduler
 * @access  Super Admin
 */
router.post('/scheduler/start', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    leagueScheduler.start();
    
    res.json({
      success: true,
      message: 'League scheduler started successfully',
      data: leagueScheduler.getStatus()
    });
  } catch (error) {
    console.error('Start scheduler error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start scheduler'
    });
  }
});

/**
 * @route   POST /api/admin/leagues/scheduler/stop
 * @desc    Stop the automatic league scheduler
 * @access  Super Admin
 */
router.post('/scheduler/stop', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    leagueScheduler.stop();
    
    res.json({
      success: true,
      message: 'League scheduler stopped successfully',
      data: leagueScheduler.getStatus()
    });
  } catch (error) {
    console.error('Stop scheduler error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop scheduler'
    });
  }
});

/**
 * @route   GET /api/admin/leagues/scheduler/status
 * @desc    Get scheduler status
 * @access  Super Admin
 */
router.get('/scheduler/status', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const status = leagueScheduler.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scheduler status'
    });
  }
});

/**
 * @route   POST /api/admin/leagues/scheduler/trigger
 * @desc    Manually trigger scheduler check
 * @access  Super Admin
 */
router.post('/scheduler/trigger', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const result = await leagueScheduler.triggerManualCheck();
    
    res.json({
      success: true,
      message: 'Manual scheduler check completed',
      data: result
    });
  } catch (error) {
    console.error('Trigger scheduler error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger scheduler check'
    });
  }
});

module.exports = router;

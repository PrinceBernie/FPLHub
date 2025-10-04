// File: fpl-hub-backend/src/routes/gameweekLifecycleRoutes.js
// API routes for gameweek lifecycle management

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const gameweekLifecycleService = require('../services/gameweekLifecycleService');

// Get league status summary
router.get('/league/:leagueId/status', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const summary = await gameweekLifecycleService.getLeagueStatusSummary(leagueId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting league status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update league state
router.post('/league/:leagueId/update-state', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const result = await gameweekLifecycleService.updateLeagueState(leagueId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating league state:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update all leagues for a gameweek
router.post('/gameweek/:gameweekId/update-all', authMiddleware, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweekIdNum = parseInt(gameweekId);
    
    const result = await gameweekLifecycleService.updateAllLeaguesForGameweek(gameweekIdNum);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating leagues for gameweek:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start monitoring a league
router.post('/league/:leagueId/start-monitoring', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    await gameweekLifecycleService.startMonitoring(leagueId);
    
    res.json({
      success: true,
      message: `Started monitoring league ${leagueId}`
    });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop monitoring a league
router.post('/league/:leagueId/stop-monitoring', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    await gameweekLifecycleService.stopMonitoring(leagueId);
    
    res.json({
      success: true,
      message: `Stopped monitoring league ${leagueId}`
    });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle postponed fixtures
router.post('/gameweek/:gameweekId/handle-postponed', authMiddleware, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweekIdNum = parseInt(gameweekId);
    
    const result = await gameweekLifecycleService.handlePostponedFixtures(gameweekIdNum);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error handling postponed fixtures:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check for retroactive changes
router.post('/league/:leagueId/check-retroactive', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const result = await gameweekLifecycleService.checkForRetroactiveChanges(leagueId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking retroactive changes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get entry deadline for a gameweek
router.get('/gameweek/:gameweekId/entry-deadline', authMiddleware, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweekIdNum = parseInt(gameweekId);
    
    const deadline = await gameweekLifecycleService.getEntryDeadline(gameweekIdNum);
    
    res.json({
      success: true,
      data: {
        gameweekId: gameweekIdNum,
        entryDeadline: deadline,
        isOpenForEntry: deadline ? new Date() < deadline : false
      }
    });
  } catch (error) {
    console.error('Error getting entry deadline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if league is open for entry
router.get('/league/:leagueId/is-open-for-entry', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const isOpen = await gameweekLifecycleService.isLeagueOpenForEntry(leagueId);
    
    res.json({
      success: true,
      data: {
        leagueId,
        isOpenForEntry: isOpen
      }
    });
  } catch (error) {
    console.error('Error checking if league open for entry:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process league payouts (admin only)
router.post('/league/:leagueId/process-payouts', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const result = await gameweekLifecycleService.processLeaguePayouts(leagueId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing league payouts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

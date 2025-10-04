const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const liveScoringService = require('../services/liveScoringService');
const socketService = require('../services/socketService');

// Get live scoring status
router.get('/status', async (req, res) => {
  try {
    const status = liveScoringService.getLiveStatus();
    const socketStats = socketService.getConnectionStats();
    
    res.json({
      success: true,
      data: {
        ...status,
        socketStats
      }
    });
  } catch (error) {
    console.error('Error getting live scoring status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live scoring status'
    });
  }
});

// Get current live data
router.get('/data', async (req, res) => {
  try {
    const liveData = liveScoringService.getCurrentLiveData();
    
    res.json({
      success: true,
      data: liveData
    });
  } catch (error) {
    console.error('Error getting live data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live data'
    });
  }
});

// Get cached live scores
router.get('/cached', async (req, res) => {
  try {
    // For now, return null since Redis is not available
    // This will be replaced with actual caching when Redis is set up
    res.json({
      success: true,
      data: null,
      message: 'No cached data available (Redis not configured)'
    });
  } catch (error) {
    console.error('Error getting cached live scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cached live scores'
    });
  }
});

// Get current live scoring data
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const liveData = liveScoringService.getCurrentLiveData();
    
    res.json({
      success: true,
      data: liveData
    });
  } catch (error) {
    console.error('Error getting current live data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current live data'
    });
  }
});

// Get gameweek live scores
router.get('/gameweek/:gameweekId', authMiddleware, async (req, res) => {
  try {
    const { gameweekId } = req.params;
    const gameweekScores = await liveScoringService.getGameweekScores(parseInt(gameweekId));
    
    res.json({
      success: true,
      data: gameweekScores
    });
  } catch (error) {
    console.error('Error getting gameweek live scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gameweek live scores'
    });
  }
});

// Get live league standings
router.get('/league/:leagueId', authMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const leagueStandings = await liveScoringService.getLeagueLiveStandings(leagueId);
    
    res.json({
      success: true,
      data: leagueStandings
    });
  } catch (error) {
    console.error('Error getting live league standings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live league standings'
    });
  }
});

// Admin routes (require authentication)
router.use(authMiddleware);

// Start live scoring service (admin only)
router.post('/start', async (req, res) => {
  try {
    await liveScoringService.start();
    
    res.json({
      success: true,
      message: 'Live scoring service started successfully'
    });
  } catch (error) {
    console.error('Error starting live scoring service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start live scoring service'
    });
  }
});

// Stop live scoring service (admin only)
router.post('/stop', async (req, res) => {
  try {
    liveScoringService.stop();
    
    res.json({
      success: true,
      message: 'Live scoring service stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping live scoring service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop live scoring service'
    });
  }
});

// Force update live scores (admin only)
router.post('/update', async (req, res) => {
  try {
    // This would trigger an immediate update
    // For now, just return success
    res.json({
      success: true,
      message: 'Live scores update triggered'
    });
  } catch (error) {
    console.error('Error triggering live scores update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger live scores update'
    });
  }
});

// Get connection statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = socketService.getConnectionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting connection stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection stats'
    });
  }
});

module.exports = router;

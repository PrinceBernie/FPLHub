const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/auth');
const { adminAuthMiddleware, requireAdminLevel } = require('../middleware/adminAuth');
const bonusWalletService = require('../services/bonusWalletService');
const streakTrackingService = require('../services/streakTrackingService');
const rewardProcessingService = require('../services/rewardProcessingService');
const { body, validationResult } = require('express-validator');

// ============================================================================
// BONUS WALLET ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/rewards/bonus-wallet
 * @desc    Get user's bonus wallet information
 * @access  Private
 */
router.get('/bonus-wallet', auth, async (req, res) => {
  try {
    const bonusWallet = await bonusWalletService.getBonusWallet(req.userId);
    
    res.json({
      success: true,
      data: bonusWallet
    });
  } catch (error) {
    console.error('Error getting bonus wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bonus wallet information'
    });
  }
});

/**
 * @route   GET /api/rewards/bonus-wallet/balance
 * @desc    Get user's bonus wallet balance
 * @access  Private
 */
router.get('/bonus-wallet/balance', auth, async (req, res) => {
  try {
    const bonusWallet = await bonusWalletService.getBonusWallet(req.userId);
    
    res.json({
      success: true,
      message: 'Bonus wallet balance retrieved successfully',
      data: bonusWallet
    });
  } catch (error) {
    console.error('Error getting bonus balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bonus wallet balance'
    });
  }
});

/**
 * @route   GET /api/rewards/bonus-wallet/transactions
 * @desc    Get user's bonus wallet transactions
 * @access  Private
 */
router.get('/bonus-wallet/transactions', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const transactions = await bonusWalletService.getBonusTransactions(req.userId, limit, offset);
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit
      }
    });
  } catch (error) {
    console.error('Error getting bonus transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bonus wallet transactions'
    });
  }
});

/**
 * @route   GET /api/rewards/combined-wallet
 * @desc    Get combined wallet information (main + bonus)
 * @access  Private
 */
router.get('/combined-wallet', auth, async (req, res) => {
  try {
    const walletInfo = await bonusWalletService.getCombinedWalletInfo(req.userId);
    
    res.json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    console.error('Error getting combined wallet info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get combined wallet information'
    });
  }
});

// ============================================================================
// STREAK TRACKING ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/rewards/streak
 * @desc    Get user's streak information
 * @access  Private
 */
router.get('/streak', auth, async (req, res) => {
  try {
    const streakInfo = await streakTrackingService.getUserStreak(req.userId);
    
    res.json({
      success: true,
      data: streakInfo
    });
  } catch (error) {
    console.error('Error getting user streak:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streak information'
    });
  }
});

/**
 * @route   GET /api/rewards/streak/leaderboard
 * @desc    Get streak leaderboard
 * @access  Public
 */
router.get('/streak/leaderboard', async (req, res) => {
  try {
    const minStreak = parseInt(req.query.minStreak) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const usersWithStreaks = await streakTrackingService.getUsersWithStreaks(minStreak);
    
    // Limit results
    const limitedResults = usersWithStreaks.slice(0, limit);
    
    res.json({
      success: true,
      data: limitedResults.map(user => ({
        username: user.user.username,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalParticipations: user.totalParticipations
      }))
    });
  } catch (error) {
    console.error('Error getting streak leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streak leaderboard'
    });
  }
});

// ============================================================================
// REWARD PROCESSING ENDPOINTS (ADMIN)
// ============================================================================

/**
 * @route   POST /api/rewards/admin/process-pending
 * @desc    Process all pending streak rewards
 * @access  Admin
 */
router.post('/admin/process-pending', requireAdminLevel('ADMIN'), async (req, res) => {
  try {
    const result = await rewardProcessingService.processAllPendingRewards();
    
    res.json({
      success: true,
      message: 'Reward processing completed',
      data: result
    });
  } catch (error) {
    console.error('Error processing pending rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process pending rewards'
    });
  }
});

/**
 * @route   POST /api/rewards/admin/process-gameweek/:gameweek
 * @desc    Process rewards for a specific gameweek
 * @access  Admin
 */
router.post('/admin/process-gameweek/:gameweek', requireAdminLevel('ADMIN'), async (req, res) => {
  try {
    const gameweek = parseInt(req.params.gameweek);
    
    if (isNaN(gameweek) || gameweek < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gameweek number'
      });
    }
    
    const result = await rewardProcessingService.processGameweekRewards(gameweek);
    
    res.json({
      success: true,
      message: `Reward processing completed for gameweek ${gameweek}`,
      data: result
    });
  } catch (error) {
    console.error('Error processing gameweek rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process gameweek rewards'
    });
  }
});

/**
 * @route   POST /api/rewards/admin/process-user/:userId/:gameweek
 * @desc    Process reward for a specific user and gameweek
 * @access  Admin
 */
router.post('/admin/process-user/:userId/:gameweek', requireAdminLevel('ADMIN'), async (req, res) => {
  try {
    const { userId, gameweek } = req.params;
    const gameweekNum = parseInt(gameweek);
    
    if (isNaN(gameweekNum) || gameweekNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gameweek number'
      });
    }
    
    const result = await rewardProcessingService.processUserReward(userId, gameweekNum);
    
    res.json({
      success: true,
      message: `Reward processing completed for user ${userId} in gameweek ${gameweekNum}`,
      data: result
    });
  } catch (error) {
    console.error('Error processing user reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process user reward'
    });
  }
});

/**
 * @route   POST /api/rewards/admin/retry-failed
 * @desc    Retry failed rewards
 * @access  Admin
 */
router.post('/admin/retry-failed', requireAdminLevel('ADMIN'), async (req, res) => {
  try {
    const result = await rewardProcessingService.retryFailedRewards();
    
    res.json({
      success: true,
      message: 'Failed rewards retry completed',
      data: result
    });
  } catch (error) {
    console.error('Error retrying failed rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry failed rewards'
    });
  }
});

/**
 * @route   GET /api/rewards/admin/statistics
 * @desc    Get reward processing statistics
 * @access  Admin
 */
router.get('/admin/statistics', requireAdminLevel('ADMIN'), async (req, res) => {
  try {
    const [rewardStats, streakStats, bonusStats] = await Promise.all([
      rewardProcessingService.getRewardProcessingStatistics(),
      streakTrackingService.getStreakStatistics(),
      bonusWalletService.getBonusWalletStatistics()
    ]);
    
    res.json({
      success: true,
      data: {
        rewards: rewardStats,
        streaks: streakStats,
        bonusWallets: bonusStats
      }
    });
  } catch (error) {
    console.error('Error getting reward statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reward statistics'
    });
  }
});

// ============================================================================
// ADMIN BONUS WALLET MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/rewards/admin/add-bonus
 * @desc    Add bonus funds to user's bonus wallet
 * @access  Admin
 */
router.post('/admin/add-bonus', [
  requireAdminLevel('ADMIN'),
  body('userId').isUUID().withMessage('Valid user ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('type').isIn(['PROMOTIONAL_CREDIT', 'ADMIN_ADJUSTMENT']).withMessage('Invalid bonus type'),
  body('description').isString().isLength({ min: 1 }).withMessage('Description required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { userId, amount, type, description } = req.body;
    const reference = `ADMIN_BONUS_${Date.now()}`;
    
    const result = await bonusWalletService.addFunds(
      userId,
      amount,
      type,
      description,
      reference
    );
    
    res.json({
      success: true,
      message: 'Bonus funds added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding bonus funds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add bonus funds'
    });
  }
});

/**
 * @route   POST /api/rewards/admin/transfer-to-main
 * @desc    Transfer funds from bonus to main wallet
 * @access  Admin
 */
router.post('/admin/transfer-to-main', [
  requireAdminLevel('ADMIN'),
  body('userId').isUUID().withMessage('Valid user ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('reason').isString().isLength({ min: 1 }).withMessage('Reason required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { userId, amount, reason } = req.body;
    
    const result = await bonusWalletService.transferToMainWallet(userId, amount, reason);
    
    res.json({
      success: true,
      message: 'Funds transferred successfully',
      data: result
    });
  } catch (error) {
    console.error('Error transferring funds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer funds'
    });
  }
});

/**
 * @route   POST /api/rewards/admin/reset-streak
 * @desc    Reset user's streak (admin function)
 * @access  Admin
 */
router.post('/admin/reset-streak', [
  requireAdminLevel('ADMIN'),
  body('userId').isUUID().withMessage('Valid user ID required'),
  body('reason').isString().isLength({ min: 1 }).withMessage('Reason required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { userId, reason } = req.body;
    
    const result = await streakTrackingService.resetUserStreak(userId, reason);
    
    res.json({
      success: true,
      message: 'User streak reset successfully',
      data: result
    });
  } catch (error) {
    console.error('Error resetting user streak:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user streak'
    });
  }
});

module.exports = router;

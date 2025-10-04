// File: fpl-hub-backend/src/routes/adminWalletRoutes.js
// Admin wallet management routes

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const WalletService = require('../services/walletService');

// Get all wallets (admin dashboard)
router.get('/wallets', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const wallets = await WalletService.getAllWallets(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Get all wallets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallets'
    });
  }
});

// Get specific user wallet
router.get('/wallets/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await WalletService.getOrCreateWallet(userId);
    const stats = await WalletService.getWalletStats(userId);
    
    res.json({
      success: true,
      data: {
        wallet,
        stats
      }
    });
  } catch (error) {
    console.error('Get user wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user wallet'
    });
  }
});

// Adjust user balance (admin)
router.post('/wallets/:userId/adjust', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.userId;

    // Validate input
    if (!amount || amount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required for balance adjustment'
      });
    }

    const result = await WalletService.adjustBalance(userId, amount, reason, adminId);

    res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: {
        adjustment: result.payment,
        newBalance: result.newBalance
      }
    });
  } catch (error) {
    console.error('Adjust balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust balance'
    });
  }
});

// Get pending withdrawals
router.get('/withdrawals/pending', authMiddleware, async (req, res) => {
  try {
    const withdrawals = await WalletService.getPendingWithdrawals();
    
    res.json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending withdrawals'
    });
  }
});

// Process withdrawal (approve/reject)
router.put('/withdrawals/:withdrawalId/process', authMiddleware, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { status, reason } = req.body;

    // Validate status
    if (!['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be COMPLETED, REJECTED, or CANCELLED'
      });
    }

    const withdrawal = await WalletService.processWithdrawal(withdrawalId, status);

    res.json({
      success: true,
      message: `Withdrawal ${status.toLowerCase()} successfully`,
      data: withdrawal
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('not pending')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal'
    });
  }
});

// Reject withdrawal
router.put('/withdrawals/:withdrawalId/reject', authMiddleware, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const withdrawal = await WalletService.processWithdrawal(withdrawalId, 'REJECTED');

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully',
      data: withdrawal
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject withdrawal'
    });
  }
});

// Get admin dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Get total wallets
    const totalWallets = await prisma.wallet.count();

    // Get total balance across all wallets
    const totalBalance = await prisma.wallet.aggregate({
      _sum: { balance: true }
    });

    // Get total deposits
    const totalDeposits = await prisma.payment.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    // Get total withdrawals
    const totalWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    // Get pending withdrawals count
    const pendingWithdrawals = await prisma.withdrawal.count({
      where: { status: 'PENDING' }
    });

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPayments = await prisma.payment.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    const todayWithdrawals = await prisma.withdrawal.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalWallets,
        totalBalance: totalBalance._sum.balance || 0,
        totalDeposits: totalDeposits._sum.amount || 0,
        totalWithdrawals: totalWithdrawals._sum.amount || 0,
        pendingWithdrawals,
        todayTransactions: todayPayments + todayWithdrawals,
        todayPayments,
        todayWithdrawals
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin statistics'
    });
  }
});

// Get all payments (admin)
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, type } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        wallet: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments'
    });
  }
});

// Get all withdrawals (admin)
router.get('/withdrawals', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, status } = req.query;
    
    const where = {};
    if (status) where.status = status;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        wallet: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get withdrawals'
    });
  }
});

module.exports = router;

// File: fpl-hub-backend/src/routes/walletRoutes.js
// User-facing wallet management routes

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const WalletService = require('../services/walletService');
const { prisma } = require('../services/databaseService');

// Get wallet balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const balance = await WalletService.getWalletBalance(userId);
    
    res.json({
      success: true,
      data: {
        balance,
        currency: 'GHS'
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet balance'
    });
  }
});

// Get wallet statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const stats = await WalletService.getWalletStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet statistics'
    });
  }
});

// Deposit funds
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, paymentMethod, description } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Payment method is required'
      });
    }

    // Find the user's payment method by type and provider
    const userPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        userId,
        type: paymentMethod === 'MTN_MOBILE_MONEY' ? 'MOBILE_MONEY' : 
              paymentMethod === 'VODAFONE_CASH' ? 'MOBILE_MONEY' :
              paymentMethod === 'AIRTELTIGO_MONEY' ? 'MOBILE_MONEY' :
              paymentMethod === 'BANK_TRANSFER' ? 'BANK_ACCOUNT' :
              paymentMethod === 'CREDIT_CARD' ? 'CARD' :
              paymentMethod === 'DEBIT_CARD' ? 'CARD' : paymentMethod,
        provider: paymentMethod === 'MTN_MOBILE_MONEY' ? 'MTN' :
                 paymentMethod === 'VODAFONE_CASH' ? 'Vodafone' :
                 paymentMethod === 'AIRTELTIGO_MONEY' ? 'AirtelTigo' : null,
        isActive: true
      }
    });

    if (!userPaymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Payment method not found. Please add this payment method first.'
      });
    }

    // Process payment using stored payment method
    const result = await WalletService.processPayment(
      userId,
      amount,
      paymentMethod,
      userPaymentMethod.provider,
      description
    );

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: result.payment,
        newBalance: result.newBalance
      }
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    });
  }
});

// Request withdrawal
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      amount, 
      withdrawalMethod, 
      accountNumber, 
      accountName, 
      bankName, 
      description 
    } = req.body;

    // Validate input
    if (!amount || amount < 10) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least GHS 10'
      });
    }

    if (!withdrawalMethod || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal method, account number, and account name are required'
      });
    }

    // Request withdrawal
    const withdrawal = await WalletService.requestWithdrawal(
      userId,
      amount,
      withdrawalMethod,
      accountNumber,
      accountName,
      bankName,
      description
    );

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    
    if (error.message.includes('Insufficient funds')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit withdrawal request'
    });
  }
});

// Get payment history
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    const payments = await WalletService.getPaymentHistory(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
});

// Get withdrawal history
router.get('/withdrawals', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    const withdrawals = await WalletService.getWithdrawalHistory(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: withdrawals
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get withdrawal history'
    });
  }
});

// Get payment methods
router.get('/payment-methods', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const paymentMethods = await WalletService.getPaymentMethods(userId);

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

// Add payment method
router.post('/payment-methods', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { type, provider, accountNumber, accountName, bankName } = req.body;

    // Validate input
    if (!type || !provider || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        error: 'Type, provider, account number, and account name are required'
      });
    }

    const paymentMethod = await WalletService.addPaymentMethod(
      userId,
      type,
      provider,
      accountNumber,
      accountName,
      bankName
    );

    res.json({
      success: true,
      message: 'Payment method added successfully',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add payment method'
    });
  }
});

// Set default payment method
router.put('/payment-methods/:paymentMethodId/default', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentMethodId } = req.params;

    const paymentMethod = await WalletService.setDefaultPaymentMethod(
      userId,
      paymentMethodId
    );

    res.json({
      success: true,
      message: 'Default payment method updated',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default payment method'
    });
  }
});

// Remove payment method
router.delete('/payment-methods/:paymentMethodId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentMethodId } = req.params;

    await WalletService.removePaymentMethod(userId, paymentMethodId);

    res.json({
      success: true,
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    
    if (error.message.includes('Cannot remove default')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to remove payment method'
    });
  }
});

// Get combined transaction history (payments + withdrawals)
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    const [payments, withdrawals] = await Promise.all([
      WalletService.getPaymentHistory(userId, parseInt(limit), parseInt(offset)),
      WalletService.getWithdrawalHistory(userId, parseInt(limit), parseInt(offset))
    ]);

    // Combine and sort by date
    const transactions = [
      ...payments.map(p => ({ ...p, type: 'payment' })),
      ...withdrawals.map(w => ({ ...w, type: 'withdrawal' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

module.exports = router;

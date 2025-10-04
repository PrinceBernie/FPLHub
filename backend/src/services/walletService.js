// File: fpl-hub-backend/src/services/walletService.js
// Wallet and payment management service

const { prisma } = require('./databaseService');

class WalletService {
  // Get or create wallet for user
  static async getOrCreateWallet(userId) {
    try {
      let wallet = await prisma.wallet.findUnique({
        where: { userId }
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            userId,
            balance: 0,
            currency: 'GHS'
          }
        });
      }

      return wallet;
    } catch (error) {
      console.error('Error getting/creating wallet:', error);
      throw error;
    }
  }

  // Get wallet balance
  static async getWalletBalance(userId) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      return wallet.balance;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  // Add funds to wallet (deposit)
  static async addFunds(userId, amount, paymentMethod, provider, description = null) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'DEPOSIT',
          amount,
          paymentMethod,
          provider,
          description: description || `Deposit via ${provider}`,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

      // Update wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance + amount,
          lastUpdated: new Date()
        }
      });

      return {
        payment,
        newBalance: updatedWallet.balance
      };
    } catch (error) {
      console.error('Error adding funds:', error);
      throw error;
    }
  }

  // Process payment (simulated - would integrate with payment gateway)
  static async processPayment(userId, amount, paymentMethod, provider, description = null) {
    try {
      // Simulate payment processing
      const paymentRef = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const wallet = await this.getOrCreateWallet(userId);
      
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'DEPOSIT',
          amount,
          paymentMethod,
          reference: paymentRef,
          description: description || `Payment via ${provider}`,
          status: 'PENDING'
        }
      });

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update payment status to completed
      const completedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED'
        }
      });

      // Update wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance + amount
        }
      });

      return {
        payment: completedPayment,
        newBalance: updatedWallet.balance
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Deduct funds from wallet
  static async deductFunds(userId, amount, type, description, reference = null) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      if (wallet.balance < amount) {
        throw new Error('Insufficient funds');
      }

      // Create transaction record
      const payment = await prisma.payment.create({
        data: {
          walletId: wallet.id,
          userId,
          type,
          amount: -amount, // Negative amount for deductions
          paymentMethod: 'ADMIN_ADJUSTMENT',
          description,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

      // Update wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance - amount,
          lastUpdated: new Date()
        }
      });

      return {
        payment,
        newBalance: updatedWallet.balance
      };
    } catch (error) {
      console.error('Error deducting funds:', error);
      throw error;
    }
  }

  // Add prize money to wallet
  static async addPrizeMoney(userId, amount, leagueId, description = null) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'LEAGUE_PRIZE',
          amount,
          paymentMethod: 'ADMIN_ADJUSTMENT',
          description: description || `Prize money from league`,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

      // Update wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance + amount,
          lastUpdated: new Date()
        }
      });

      return {
        payment,
        newBalance: updatedWallet.balance
      };
    } catch (error) {
      console.error('Error adding prize money:', error);
      throw error;
    }
  }

  // Request withdrawal
  static async requestWithdrawal(userId, amount, withdrawalMethod, accountNumber, accountName, bankName = null, description = null) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      if (wallet.balance < amount) {
        throw new Error('Insufficient funds');
      }

      if (amount < 10) {
        throw new Error('Minimum withdrawal amount is GHS 10');
      }

      // Create withdrawal request
      const withdrawal = await prisma.withdrawal.create({
        data: {
          walletId: wallet.id,
          userId,
          amount,
          withdrawalMethod,
          accountNumber,
          accountName,
          bankName,
          description: description || `Withdrawal to ${accountNumber}`,
          status: 'PENDING'
        }
      });

      return withdrawal;
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      throw error;
    }
  }

  // Process withdrawal (simulated - would integrate with payment gateway)
  static async processWithdrawal(withdrawalId, status = 'COMPLETED') {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { wallet: true }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'PENDING') {
        throw new Error('Withdrawal is not pending');
      }

      // Update withdrawal status
      const updatedWithdrawal = await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status,
          processedAt: status === 'COMPLETED' ? new Date() : null
        }
      });

      // If completed, deduct from wallet
      if (status === 'COMPLETED') {
        await prisma.wallet.update({
          where: { id: withdrawal.walletId },
          data: {
            balance: withdrawal.wallet.balance - withdrawal.amount,
            lastUpdated: new Date()
          }
        });
      }

      return updatedWithdrawal;
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      throw error;
    }
  }

  // Get payment history
  static async getPaymentHistory(userId, limit = 50, offset = 0) {
    try {
      const payments = await prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          wallet: true
        }
      });

      return payments;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Get withdrawal history
  static async getWithdrawalHistory(userId, limit = 50, offset = 0) {
    try {
      const withdrawals = await prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          wallet: true
        }
      });

      return withdrawals;
    } catch (error) {
      console.error('Error getting withdrawal history:', error);
      throw error;
    }
  }

  // Add payment method
  static async addPaymentMethod(userId, type, provider, accountNumber, accountName, bankName = null) {
    try {
      // Map specific payment types to generic stored types
      const typeMapping = {
        'MTN_MOBILE_MONEY': 'MOBILE_MONEY',
        'VODAFONE_CASH': 'MOBILE_MONEY',
        'AIRTELTIGO_MONEY': 'MOBILE_MONEY',
        'BANK_TRANSFER': 'BANK_ACCOUNT',
        'CREDIT_CARD': 'CARD',
        'DEBIT_CARD': 'CARD'
      };

      const storedType = typeMapping[type] || type;

      // Check if payment method already exists
      const existing = await prisma.paymentMethod.findFirst({
        where: {
          userId,
          type: storedType,
          provider,
          accountNumber
        }
      });

      if (existing) {
        throw new Error('Payment method already exists');
      }

      // If this is the first payment method, make it default
      const existingMethods = await prisma.paymentMethod.count({
        where: { userId, isActive: true }
      });

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId,
          type: storedType,
          provider,
          accountNumber,
          accountName,
          bankName,
          isDefault: existingMethods === 0
        }
      });

      return paymentMethod;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  // Get user's payment methods
  static async getPaymentMethods(userId) {
    try {
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: { userId, isActive: true },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return paymentMethods;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  // Set default payment method
  static async setDefaultPaymentMethod(userId, paymentMethodId) {
    try {
      // Remove default from all user's payment methods
      await prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      // Set new default
      const paymentMethod = await prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true }
      });

      return paymentMethod;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  // Remove payment method
  static async removePaymentMethod(userId, paymentMethodId) {
    try {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId }
      });

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // If it's the default, we can't remove it
      if (paymentMethod.isDefault) {
        throw new Error('Cannot remove default payment method');
      }

      await prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isActive: false }
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  // Get wallet statistics
  static async getWalletStats(userId) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      const totalDeposits = await prisma.payment.aggregate({
        where: {
          userId,
          type: 'DEPOSIT',
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      });

      const totalWithdrawals = await prisma.withdrawal.aggregate({
        where: {
          userId,
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      });

      const totalSpent = await prisma.payment.aggregate({
        where: {
          userId,
          type: 'LEAGUE_ENTRY',
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      });

      const totalWon = await prisma.payment.aggregate({
        where: {
          userId,
          type: 'LEAGUE_PRIZE',
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      });

      return {
        currentBalance: wallet.balance,
        totalDeposits: totalDeposits._sum.amount || 0,
        totalWithdrawals: totalWithdrawals._sum.amount || 0,
        totalSpent: Math.abs(totalSpent._sum.amount || 0),
        totalWon: totalWon._sum.amount || 0,
        netProfit: (totalWon._sum.amount || 0) - Math.abs(totalSpent._sum.amount || 0)
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      throw error;
    }
  }

  // Admin: Adjust user balance
  static async adjustBalance(userId, amount, reason, adminId) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      // Create adjustment record
      const payment = await prisma.payment.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'ADMIN_ADJUSTMENT',
          amount,
          paymentMethod: 'ADMIN_ADJUSTMENT',
          description: `Admin adjustment: ${reason}`,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

      // Update wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance + amount,
          lastUpdated: new Date()
        }
      });

      return {
        payment,
        newBalance: updatedWallet.balance
      };
    } catch (error) {
      console.error('Error adjusting balance:', error);
      throw error;
    }
  }

  // Get all pending withdrawals (admin)
  static async getPendingWithdrawals() {
    try {
      const withdrawals = await prisma.withdrawal.findMany({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true
            }
          },
          wallet: true
        },
        orderBy: { createdAt: 'asc' }
      });

      return withdrawals;
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      throw error;
    }
  }

  // Get all wallets (admin)
  static async getAllWallets(limit = 100, offset = 0) {
    try {
      const wallets = await prisma.wallet.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true
            }
          },
          payments: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          withdrawals: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { balance: 'desc' },
        take: limit,
        skip: offset
      });

      return wallets;
    } catch (error) {
      console.error('Error getting all wallets:', error);
      throw error;
    }
  }
}

module.exports = WalletService;

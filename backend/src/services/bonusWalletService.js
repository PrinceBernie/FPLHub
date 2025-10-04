const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const WalletService = require('./walletService');

const prisma = new PrismaClient();

class BonusWalletService {
  
  /**
   * Get user's bonus wallet
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Bonus wallet information
   */
  async getBonusWallet(userId) {
    try {
      let bonusWallet = await prisma.bonusWallet.findUnique({
        where: { userId },
        include: {
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10 // Last 10 transactions
          }
        }
      });
      
      // Create bonus wallet if it doesn't exist
      if (!bonusWallet) {
        bonusWallet = await prisma.bonusWallet.create({
          data: {
            userId,
            balance: 0,
            currency: 'GHS',
            isActive: true
          },
          include: {
            transactions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 10
            }
          }
        });
      }
      
      return bonusWallet;
      
    } catch (error) {
      logger.error('Error getting bonus wallet:', error);
      throw error;
    }
  }
  
  /**
   * Get bonus wallet balance
   * @param {string} userId - User ID
   * @returns {Promise<number>} Bonus wallet balance
   */
  async getBonusBalance(userId) {
    try {
      const bonusWallet = await this.getBonusWallet(userId);
      return bonusWallet.balance;
      
    } catch (error) {
      logger.error('Error getting bonus balance:', error);
      throw error;
    }
  }
  
  /**
   * Add funds to bonus wallet
   * @param {string} userId - User ID
   * @param {number} amount - Amount to add
   * @param {string} type - Transaction type
   * @param {string} description - Transaction description
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} Transaction result
   */
  async addFunds(userId, amount, type, description, reference) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      
      // Get or create bonus wallet
      const bonusWallet = await this.getBonusWallet(userId);
      
      // Create transaction record
      const transaction = await prisma.bonusTransaction.create({
        data: {
          bonusWalletId: bonusWallet.id,
          userId,
          type,
          amount,
          currency: 'GHS',
          status: 'PENDING',
          reference,
          description
        }
      });
      
      // Update bonus wallet balance
      const updatedWallet = await prisma.bonusWallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount
          },
          lastUpdated: new Date()
        }
      });
      
      // Update transaction status
      await prisma.bonusTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED'
        }
      });
      
      logger.info(`Added GHS ${amount} to bonus wallet for user ${userId}: ${description}`);
      
      return {
        success: true,
        transaction,
        newBalance: updatedWallet.balance
      };
      
    } catch (error) {
      logger.error('Error adding funds to bonus wallet:', error);
      throw error;
    }
  }
  
  /**
   * Deduct funds from bonus wallet
   * @param {string} userId - User ID
   * @param {number} amount - Amount to deduct
   * @param {string} type - Transaction type
   * @param {string} description - Transaction description
   * @param {string} reference - Transaction reference
   * @param {string} relatedLeagueId - Related league ID (optional)
   * @returns {Promise<Object>} Transaction result
   */
  async deductFunds(userId, amount, type, description, reference, relatedLeagueId = null) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      
      const bonusWallet = await this.getBonusWallet(userId);
      
      if (bonusWallet.balance < amount) {
        throw new Error('Insufficient bonus wallet balance');
      }
      
      // Create transaction record
      const transaction = await prisma.bonusTransaction.create({
        data: {
          bonusWalletId: bonusWallet.id,
          userId,
          type,
          amount: -amount, // Negative amount for deduction
          currency: 'GHS',
          status: 'PENDING',
          reference,
          description,
          relatedLeagueId
        }
      });
      
      // Update bonus wallet balance
      const updatedWallet = await prisma.bonusWallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: amount
          },
          lastUpdated: new Date()
        }
      });
      
      // Update transaction status
      await prisma.bonusTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED'
        }
      });
      
      logger.info(`Deducted GHS ${amount} from bonus wallet for user ${userId}: ${description}`);
      
      return {
        success: true,
        transaction,
        newBalance: updatedWallet.balance
      };
      
    } catch (error) {
      logger.error('Error deducting funds from bonus wallet:', error);
      throw error;
    }
  }
  
  /**
   * Process payment using bonus wallet first, then main wallet
   * @param {string} userId - User ID
   * @param {number} totalAmount - Total amount to pay
   * @param {string} description - Payment description
   * @param {string} reference - Payment reference
   * @param {string} relatedLeagueId - Related league ID (optional)
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(userId, totalAmount, description, reference, relatedLeagueId = null) {
    try {
      if (totalAmount <= 0) {
        throw new Error('Amount must be positive');
      }
      
      const bonusWallet = await this.getBonusWallet(userId);
      const mainWallet = await WalletService.getOrCreateWallet(userId);
      
      const bonusBalance = bonusWallet.balance;
      const mainBalance = mainWallet.balance;
      const totalAvailable = bonusBalance + mainBalance;
      
      if (totalAvailable < totalAmount) {
        throw new Error('Insufficient funds');
      }
      
      let bonusUsed = 0;
      let mainUsed = 0;
      const transactions = [];
      
      // Use bonus wallet first
      if (bonusBalance > 0 && totalAmount > 0) {
        bonusUsed = Math.min(bonusBalance, totalAmount);
        
        const bonusTransaction = await this.deductFunds(
          userId,
          bonusUsed,
          'LEAGUE_ENTRY',
          `${description} (Bonus)`,
          `${reference}_BONUS`,
          relatedLeagueId
        );
        
        transactions.push(bonusTransaction.transaction);
        totalAmount -= bonusUsed;
      }
      
      // Use main wallet for remaining amount
      if (totalAmount > 0) {
        mainUsed = totalAmount;
        
        // Deduct from main wallet
        await prisma.wallet.update({
          where: { userId },
          data: {
            balance: {
              decrement: mainUsed
            },
            lastUpdated: new Date()
          }
        });
        
        // Create main wallet transaction
        const mainTransaction = await prisma.transaction.create({
          data: {
            userId,
            leagueId: relatedLeagueId,
            type: 'ENTRY_FEE',
            amount: -mainUsed,
            status: 'COMPLETED',
            reference: `${reference}_MAIN`,
            description: `${description} (Main)`
          }
        });
        
        transactions.push(mainTransaction);
      }
      
      logger.info(`Processed payment for user ${userId}: GHS ${bonusUsed} (bonus) + GHS ${mainUsed} (main) = GHS ${bonusUsed + mainUsed}`);
      
      return {
        success: true,
        totalPaid: bonusUsed + mainUsed,
        bonusUsed,
        mainUsed,
        transactions,
        remainingBonusBalance: bonusBalance - bonusUsed,
        remainingMainBalance: mainBalance - mainUsed
      };
      
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }
  
  /**
   * Get bonus wallet transactions
   * @param {string} userId - User ID
   * @param {number} limit - Number of transactions to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Bonus transactions
   */
  async getBonusTransactions(userId, limit = 20, offset = 0) {
    try {
      const bonusWallet = await this.getBonusWallet(userId);
      
      const transactions = await prisma.bonusTransaction.findMany({
        where: {
          bonusWalletId: bonusWallet.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });
      
      return transactions;
      
    } catch (error) {
      logger.error('Error getting bonus transactions:', error);
      throw error;
    }
  }
  
  /**
   * Get combined wallet information (main + bonus)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Combined wallet information
   */
  async getCombinedWalletInfo(userId) {
    try {
      const bonusWallet = await this.getBonusWallet(userId);
      const mainWallet = await WalletService.getOrCreateWallet(userId);
      
      const totalBalance = bonusWallet.balance + mainWallet.balance;
      
      return {
        mainWallet: {
          balance: mainWallet.balance,
          currency: mainWallet.currency,
          lastUpdated: mainWallet.lastUpdated
        },
        bonusWallet: {
          balance: bonusWallet.balance,
          currency: bonusWallet.currency,
          lastUpdated: bonusWallet.lastUpdated
        },
        totalBalance,
        currency: 'GHS'
      };
      
    } catch (error) {
      logger.error('Error getting combined wallet info:', error);
      throw error;
    }
  }
  
  /**
   * Transfer funds from bonus to main wallet (admin function)
   * @param {string} userId - User ID
   * @param {number} amount - Amount to transfer
   * @param {string} reason - Reason for transfer
   * @returns {Promise<Object>} Transfer result
   */
  async transferToMainWallet(userId, amount, reason = 'Admin transfer') {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      
      const bonusWallet = await this.getBonusWallet(userId);
      const mainWallet = await WalletService.getOrCreateWallet(userId);
      
      if (bonusWallet.balance < amount) {
        throw new Error('Insufficient bonus wallet balance');
      }
      
      // Deduct from bonus wallet
      await this.deductFunds(
        userId,
        amount,
        'ADMIN_ADJUSTMENT',
        `Transfer to main wallet: ${reason}`,
        `TRANSFER_${Date.now()}`
      );
      
      // Add to main wallet
      await prisma.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount
          },
          lastUpdated: new Date()
        }
      });
      
      // Create main wallet transaction
      await prisma.transaction.create({
        data: {
          userId,
          type: 'ADMIN_ADJUSTMENT',
          amount,
          status: 'COMPLETED',
          reference: `TRANSFER_${Date.now()}`,
          description: `Transfer from bonus wallet: ${reason}`
        }
      });
      
      logger.info(`Transferred GHS ${amount} from bonus to main wallet for user ${userId}: ${reason}`);
      
      return {
        success: true,
        transferredAmount: amount,
        newBonusBalance: bonusWallet.balance - amount,
        newMainBalance: mainWallet.balance + amount
      };
      
    } catch (error) {
      logger.error('Error transferring to main wallet:', error);
      throw error;
    }
  }
  
  /**
   * Get bonus wallet statistics
   * @returns {Promise<Object>} Bonus wallet statistics
   */
  async getBonusWalletStatistics() {
    try {
      const totalBonusWallets = await prisma.bonusWallet.count();
      const activeBonusWallets = await prisma.bonusWallet.count({
        where: {
          isActive: true
        }
      });
      
      const totalBonusBalance = await prisma.bonusWallet.aggregate({
        _sum: {
          balance: true
        }
      });
      
      const avgBonusBalance = await prisma.bonusWallet.aggregate({
        _avg: {
          balance: true
        }
      });
      
      const topBonusWallets = await prisma.bonusWallet.findMany({
        orderBy: {
          balance: 'desc'
        },
        take: 10,
        include: {
          user: {
            select: {
              username: true
            }
          }
        }
      });
      
      return {
        totalBonusWallets,
        activeBonusWallets,
        totalBonusBalance: totalBonusBalance._sum.balance || 0,
        averageBonusBalance: avgBonusBalance._avg.balance || 0,
        topBonusWallets: topBonusWallets.map(wallet => ({
          username: wallet.user.username,
          balance: wallet.balance
        }))
      };
      
    } catch (error) {
      logger.error('Error getting bonus wallet statistics:', error);
      throw error;
    }
  }
}

module.exports = new BonusWalletService();

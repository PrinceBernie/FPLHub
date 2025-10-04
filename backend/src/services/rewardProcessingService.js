const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const streakTrackingService = require('./streakTrackingService');
const bonusWalletService = require('./bonusWalletService');

const prisma = new PrismaClient();

class RewardProcessingService {
  
  /**
   * Process all pending streak rewards
   * @returns {Promise<Object>} Processing results
   */
  async processAllPendingRewards() {
    try {
      logger.info('Starting reward processing for all pending rewards...');
      
      const result = await streakTrackingService.processPendingRewards();
      
      logger.info(`Reward processing completed: ${result.processed} processed, ${result.failed} failed`);
      
      return result;
      
    } catch (error) {
      logger.error('Error processing all pending rewards:', error);
      throw error;
    }
  }
  
  /**
   * Process rewards for a specific gameweek
   * @param {number} gameweek - Gameweek number
   * @returns {Promise<Object>} Processing results
   */
  async processGameweekRewards(gameweek) {
    try {
      logger.info(`Processing rewards for gameweek ${gameweek}...`);
      
      // Get all users who participated in this gameweek
      const gameweekParticipants = await this.getGameweekParticipants(gameweek);
      
      let processedCount = 0;
      let failedCount = 0;
      
      for (const participant of gameweekParticipants) {
        try {
          // Track participation and check for rewards
          const result = await streakTrackingService.trackParticipation(
            participant.userId,
            gameweek,
            participant.leagueId
          );
          
          if (result.earnedReward) {
            // Process the reward immediately
            await this.processUserReward(participant.userId, gameweek);
            processedCount++;
          }
          
        } catch (error) {
          logger.error(`Failed to process reward for user ${participant.userId}:`, error);
          failedCount++;
        }
      }
      
      logger.info(`Gameweek ${gameweek} reward processing completed: ${processedCount} processed, ${failedCount} failed`);
      
      return {
        success: true,
        gameweek,
        processed: processedCount,
        failed: failedCount,
        totalParticipants: gameweekParticipants.length
      };
      
    } catch (error) {
      logger.error('Error processing gameweek rewards:', error);
      throw error;
    }
  }
  
  /**
   * Process reward for a specific user
   * @param {string} userId - User ID
   * @param {number} gameweek - Gameweek number
   * @returns {Promise<Object>} Processing result
   */
  async processUserReward(userId, gameweek) {
    try {
      logger.info(`Processing reward for user ${userId} in gameweek ${gameweek}...`);
      
      // Find the pending reward
      const reward = await prisma.streakReward.findUnique({
        where: {
          userId_gameweek: {
            userId,
            gameweek
          }
        },
        include: {
          user: {
            include: {
              bonusWallet: true
            }
          }
        }
      });
      
      if (!reward) {
        throw new Error(`No pending reward found for user ${userId} in gameweek ${gameweek}`);
      }
      
      if (reward.status !== 'PENDING') {
        logger.info(`Reward for user ${userId} in gameweek ${gameweek} already processed`);
        return {
          success: true,
          alreadyProcessed: true,
          reward
        };
      }
      
      // Ensure user has a bonus wallet
      if (!reward.user.bonusWallet) {
        await prisma.bonusWallet.create({
          data: {
            userId: reward.userId,
            balance: 0,
            currency: 'GHS',
            isActive: true
          }
        });
      }
      
      // Credit the reward to bonus wallet
      const creditResult = await bonusWalletService.addFunds(
        userId,
        reward.amount,
        'STREAK_REWARD',
        `GHS ${reward.amount} reward for ${reward.streakLength} consecutive gameweek participation`,
        `STREAK_REWARD_${reward.id}`
      );
      
      // Update reward status
      await prisma.streakReward.update({
        where: { id: reward.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date()
        }
      });
      
      logger.info(`Successfully processed reward for user ${userId}: GHS ${reward.amount}`);
      
      return {
        success: true,
        reward,
        creditResult,
        processedAt: new Date()
      };
      
    } catch (error) {
      logger.error(`Error processing reward for user ${userId}:`, error);
      
      // Mark reward as failed
      try {
        await prisma.streakReward.update({
          where: {
            userId_gameweek: {
              userId,
              gameweek
            }
          },
          data: {
            status: 'FAILED'
          }
        });
      } catch (updateError) {
        logger.error('Error updating reward status to failed:', updateError);
      }
      
      throw error;
    }
  }
  
  /**
   * Get users who participated in a specific gameweek
   * @param {number} gameweek - Gameweek number
   * @returns {Promise<Array>} Gameweek participants
   */
  async getGameweekParticipants(gameweek) {
    try {
      const participants = await prisma.leagueEntry.findMany({
        where: {
          league: {
            startGameweek: gameweek
          },
          isActive: true
        },
        select: {
          userId: true,
          leagueId: true,
          user: {
            select: {
              id: true,
              username: true
            }
          }
        },
        distinct: ['userId'] // Get unique users
      });
      
      return participants;
      
    } catch (error) {
      logger.error('Error getting gameweek participants:', error);
      throw error;
    }
  }
  
  /**
   * Get reward processing statistics
   * @returns {Promise<Object>} Processing statistics
   */
  async getRewardProcessingStatistics() {
    try {
      const totalRewards = await prisma.streakReward.count();
      const pendingRewards = await prisma.streakReward.count({
        where: {
          status: 'PENDING'
        }
      });
      const processedRewards = await prisma.streakReward.count({
        where: {
          status: 'PROCESSED'
        }
      });
      const failedRewards = await prisma.streakReward.count({
        where: {
          status: 'FAILED'
        }
      });
      
      const totalRewardAmount = await prisma.streakReward.aggregate({
        where: {
          status: 'PROCESSED'
        },
        _sum: {
          amount: true
        }
      });
      
      const pendingRewardAmount = await prisma.streakReward.aggregate({
        where: {
          status: 'PENDING'
        },
        _sum: {
          amount: true
        }
      });
      
      const recentRewards = await prisma.streakReward.findMany({
        where: {
          status: 'PROCESSED'
        },
        orderBy: {
          processedAt: 'desc'
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
        totalRewards,
        pendingRewards,
        processedRewards,
        failedRewards,
        totalRewardAmount: totalRewardAmount._sum.amount || 0,
        pendingRewardAmount: pendingRewardAmount._sum.amount || 0,
        recentRewards: recentRewards.map(reward => ({
          username: reward.user.username,
          amount: reward.amount,
          gameweek: reward.gameweek,
          streakLength: reward.streakLength,
          processedAt: reward.processedAt
        }))
      };
      
    } catch (error) {
      logger.error('Error getting reward processing statistics:', error);
      throw error;
    }
  }
  
  /**
   * Retry failed rewards
   * @returns {Promise<Object>} Retry results
   */
  async retryFailedRewards() {
    try {
      logger.info('Retrying failed rewards...');
      
      const failedRewards = await prisma.streakReward.findMany({
        where: {
          status: 'FAILED'
        },
        include: {
          user: {
            include: {
              bonusWallet: true
            }
          }
        }
      });
      
      let retrySuccessCount = 0;
      let retryFailedCount = 0;
      
      for (const reward of failedRewards) {
        try {
          // Reset status to pending
          await prisma.streakReward.update({
            where: { id: reward.id },
            data: {
              status: 'PENDING'
            }
          });
          
          // Process the reward
          await this.processUserReward(reward.userId, reward.gameweek);
          retrySuccessCount++;
          
        } catch (error) {
          logger.error(`Failed to retry reward ${reward.id}:`, error);
          retryFailedCount++;
        }
      }
      
      logger.info(`Retry completed: ${retrySuccessCount} successful, ${retryFailedCount} failed`);
      
      return {
        success: true,
        retrySuccessCount,
        retryFailedCount,
        totalRetried: failedRewards.length
      };
      
    } catch (error) {
      logger.error('Error retrying failed rewards:', error);
      throw error;
    }
  }
  
  /**
   * Schedule automatic reward processing (to be called by cron job)
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleAutomaticProcessing() {
    try {
      logger.info('Scheduling automatic reward processing...');
      
      // Get current gameweek (you might want to get this from FPL API)
      const currentGameweek = await this.getCurrentGameweek();
      
      // Process rewards for the previous gameweek
      const previousGameweek = currentGameweek - 1;
      
      if (previousGameweek > 0) {
        const result = await this.processGameweekRewards(previousGameweek);
        
        logger.info(`Automatic processing completed for gameweek ${previousGameweek}`);
        
        return {
          success: true,
          processedGameweek: previousGameweek,
          result
        };
      }
      
      return {
        success: true,
        message: 'No previous gameweek to process'
      };
      
    } catch (error) {
      logger.error('Error in automatic reward processing:', error);
      throw error;
    }
  }
  
  /**
   * Get current gameweek (placeholder - integrate with FPL API)
   * @returns {Promise<number>} Current gameweek
   */
  async getCurrentGameweek() {
    // This should integrate with your FPL API service
    // For now, return a placeholder
    return 1;
  }
  
  /**
   * Validate reward eligibility
   * @param {string} userId - User ID
   * @param {number} gameweek - Gameweek number
   * @returns {Promise<Object>} Validation result
   */
  async validateRewardEligibility(userId, gameweek) {
    try {
      const streakTracker = await prisma.streakTracker.findUnique({
        where: { userId }
      });
      
      if (!streakTracker) {
        return {
          eligible: false,
          reason: 'No streak tracker found'
        };
      }
      
      if (streakTracker.currentStreak < 10) {
        return {
          eligible: false,
          reason: `Current streak is ${streakTracker.currentStreak}, need 10`,
          currentStreak: streakTracker.currentStreak,
          requiredStreak: 10
        };
      }
      
      // Check if reward already exists for this gameweek
      const existingReward = await prisma.streakReward.findUnique({
        where: {
          userId_gameweek: {
            userId,
            gameweek
          }
        }
      });
      
      if (existingReward) {
        return {
          eligible: false,
          reason: 'Reward already exists for this gameweek',
          existingReward
        };
      }
      
      return {
        eligible: true,
        currentStreak: streakTracker.currentStreak,
        rewardAmount: 30.0
      };
      
    } catch (error) {
      logger.error('Error validating reward eligibility:', error);
      throw error;
    }
  }
}

module.exports = new RewardProcessingService();

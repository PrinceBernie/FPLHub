const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

class StreakTrackingService {
  
  /**
   * Track user participation in a gameweek
   * @param {string} userId - User ID
   * @param {number} gameweek - Gameweek number
   * @param {string} leagueId - League ID (optional)
   * @returns {Promise<Object>} Updated streak information
   */
  async trackParticipation(userId, gameweek, leagueId = null) {
    try {
      logger.info(`Tracking participation for user ${userId} in gameweek ${gameweek}`);
      
      // Get or create streak tracker
      let streakTracker = await prisma.streakTracker.findUnique({
        where: { userId }
      });
      
      if (!streakTracker) {
        streakTracker = await prisma.streakTracker.create({
          data: {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            totalParticipations: 0
          }
        });
      }
      
      // Check if this is a consecutive gameweek
      const isConsecutive = this.isConsecutiveGameweek(streakTracker.lastParticipatedGameweek, gameweek);
      
      let newCurrentStreak;
      let newLongestStreak;
      let streakStartDate;
      
      if (isConsecutive) {
        // Continue streak
        newCurrentStreak = streakTracker.currentStreak + 1;
        newLongestStreak = Math.max(streakTracker.longestStreak, newCurrentStreak);
        streakStartDate = streakTracker.streakStartDate || new Date();
      } else {
        // Reset streak
        newCurrentStreak = 1;
        newLongestStreak = Math.max(streakTracker.longestStreak, newCurrentStreak);
        streakStartDate = new Date();
      }
      
      // Update streak tracker
      const updatedTracker = await prisma.streakTracker.update({
        where: { userId },
        data: {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastParticipatedGameweek: gameweek,
          streakStartDate,
          totalParticipations: streakTracker.totalParticipations + 1
        }
      });
      
      // Check if user earned a reward (10 consecutive gameweeks)
      if (newCurrentStreak === 10) {
        await this.createStreakReward(userId, gameweek, newCurrentStreak);
      }
      
      logger.info(`Updated streak for user ${userId}: current=${newCurrentStreak}, longest=${newLongestStreak}`);
      
      return {
        success: true,
        streakTracker: updatedTracker,
        earnedReward: newCurrentStreak === 10
      };
      
    } catch (error) {
      logger.error('Error tracking participation:', error);
      throw error;
    }
  }
  
  /**
   * Check if a gameweek is consecutive to the last participated gameweek
   * @param {number|null} lastGameweek - Last participated gameweek
   * @param {number} currentGameweek - Current gameweek
   * @returns {boolean} True if consecutive
   */
  isConsecutiveGameweek(lastGameweek, currentGameweek) {
    if (!lastGameweek) {
      return true; // First participation
    }
    
    return currentGameweek === lastGameweek + 1;
  }
  
  /**
   * Create a streak reward for the user
   * @param {string} userId - User ID
   * @param {number} gameweek - Gameweek when reward was earned
   * @param {number} streakLength - Streak length
   * @returns {Promise<Object>} Created reward
   */
  async createStreakReward(userId, gameweek, streakLength) {
    try {
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
        logger.info(`Reward already exists for user ${userId} in gameweek ${gameweek}`);
        return existingReward;
      }
      
      const reward = await prisma.streakReward.create({
        data: {
          userId,
          gameweek,
          streakLength,
          amount: 30.0, // GHS 30 reward
          currency: 'GHS',
          status: 'PENDING'
        }
      });
      
      logger.info(`Created streak reward for user ${userId}: GHS 30 for ${streakLength} gameweek streak`);
      
      return reward;
      
    } catch (error) {
      logger.error('Error creating streak reward:', error);
      throw error;
    }
  }
  
  /**
   * Get user's streak information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Streak information
   */
  async getUserStreak(userId) {
    try {
      const streakTracker = await prisma.streakTracker.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });
      
      if (!streakTracker) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          totalParticipations: 0,
          lastParticipatedGameweek: null,
          streakStartDate: null,
          nextRewardIn: 10
        };
      }
      
      const nextRewardIn = Math.max(0, 10 - streakTracker.currentStreak);
      
      return {
        ...streakTracker,
        nextRewardIn
      };
      
    } catch (error) {
      logger.error('Error getting user streak:', error);
      throw error;
    }
  }
  
  /**
   * Get all users with active streaks
   * @param {number} minStreak - Minimum streak length
   * @returns {Promise<Array>} Users with streaks
   */
  async getUsersWithStreaks(minStreak = 1) {
    try {
      const streakTrackers = await prisma.streakTracker.findMany({
        where: {
          currentStreak: {
            gte: minStreak
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          currentStreak: 'desc'
        }
      });
      
      return streakTrackers;
      
    } catch (error) {
      logger.error('Error getting users with streaks:', error);
      throw error;
    }
  }
  
  /**
   * Process pending streak rewards
   * @returns {Promise<Object>} Processing results
   */
  async processPendingRewards() {
    try {
      logger.info('Processing pending streak rewards...');
      
      const pendingRewards = await prisma.streakReward.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          user: {
            include: {
              bonusWallet: true
            }
          }
        }
      });
      
      let processedCount = 0;
      let failedCount = 0;
      
      for (const reward of pendingRewards) {
        try {
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
          await prisma.bonusWallet.update({
            where: { userId: reward.userId },
            data: {
              balance: {
                increment: reward.amount
              },
              lastUpdated: new Date()
            }
          });
          
          // Create bonus transaction record
          await prisma.bonusTransaction.create({
            data: {
              bonusWalletId: reward.user.bonusWallet?.id || (await prisma.bonusWallet.findUnique({ where: { userId: reward.userId } })).id,
              userId: reward.userId,
              type: 'STREAK_REWARD',
              amount: reward.amount,
              currency: reward.currency,
              status: 'COMPLETED',
              reference: `STREAK_REWARD_${reward.id}`,
              description: `GHS ${reward.amount} reward for ${reward.streakLength} consecutive gameweek participation`
            }
          });
          
          // Update reward status
          await prisma.streakReward.update({
            where: { id: reward.id },
            data: {
              status: 'PROCESSED',
              processedAt: new Date()
            }
          });
          
          processedCount++;
          logger.info(`Processed reward for user ${reward.userId}: GHS ${reward.amount}`);
          
        } catch (error) {
          logger.error(`Failed to process reward ${reward.id}:`, error);
          
          await prisma.streakReward.update({
            where: { id: reward.id },
            data: {
              status: 'FAILED'
            }
          });
          
          failedCount++;
        }
      }
      
      logger.info(`Processed ${processedCount} rewards, ${failedCount} failed`);
      
      return {
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: pendingRewards.length
      };
      
    } catch (error) {
      logger.error('Error processing pending rewards:', error);
      throw error;
    }
  }
  
  /**
   * Reset user's streak (admin function)
   * @param {string} userId - User ID
   * @param {string} reason - Reason for reset
   * @returns {Promise<Object>} Reset result
   */
  async resetUserStreak(userId, reason = 'Admin reset') {
    try {
      const updatedTracker = await prisma.streakTracker.update({
        where: { userId },
        data: {
          currentStreak: 0,
          streakStartDate: null,
          lastParticipatedGameweek: null
        }
      });
      
      logger.info(`Reset streak for user ${userId}: ${reason}`);
      
      return {
        success: true,
        streakTracker: updatedTracker
      };
      
    } catch (error) {
      logger.error('Error resetting user streak:', error);
      throw error;
    }
  }
  
  /**
   * Get streak statistics
   * @returns {Promise<Object>} Streak statistics
   */
  async getStreakStatistics() {
    try {
      const totalUsers = await prisma.streakTracker.count();
      const activeStreaks = await prisma.streakTracker.count({
        where: {
          currentStreak: {
            gt: 0
          }
        }
      });
      
      const avgStreak = await prisma.streakTracker.aggregate({
        _avg: {
          currentStreak: true,
          longestStreak: true
        }
      });
      
      const longestStreak = await prisma.streakTracker.findFirst({
        orderBy: {
          longestStreak: 'desc'
        },
        include: {
          user: {
            select: {
              username: true
            }
          }
        }
      });
      
      const pendingRewards = await prisma.streakReward.count({
        where: {
          status: 'PENDING'
        }
      });
      
      return {
        totalUsers,
        activeStreaks,
        averageCurrentStreak: avgStreak._avg.currentStreak || 0,
        averageLongestStreak: avgStreak._avg.longestStreak || 0,
        longestStreak: longestStreak?.longestStreak || 0,
        longestStreakUser: longestStreak?.user?.username || null,
        pendingRewards
      };
      
    } catch (error) {
      logger.error('Error getting streak statistics:', error);
      throw error;
    }
  }
}

module.exports = new StreakTrackingService();

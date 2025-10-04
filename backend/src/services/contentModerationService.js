// File: fpl-hub-backend/src/services/contentModerationService.js
// Content moderation service for user banning and content management

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ContentModerationService {
  // User Banning
  static async banUser(userId, adminId, reason, duration = null, isPermanent = false) {
    try {
      // Check if user exists and is not already banned
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isBanned) {
        throw new Error('User is already banned');
      }

      // Calculate ban expiry
      let banExpires = null;
      if (!isPermanent && duration) {
        banExpires = new Date(Date.now() + duration);
      }

      // Create ban record
      const ban = await prisma.userBan.create({
        data: {
          userId,
          adminId,
          reason,
          isPermanent,
          expiresAt: banExpires
        }
      });

      // Update user ban status
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason,
          banExpires: banExpires,
          banIssuedBy: adminId
        }
      });

      // Log the action
      await this.logModerationAction('USER_BANNED', adminId, 'USER', {
        userId,
        reason,
        duration: duration ? `${duration / (1000 * 60 * 60 * 24)} days` : 'permanent',
        banId: ban.id
      });

      return {
        ban,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isBanned: true,
          banReason: reason,
          banExpires: banExpires
        }
      };
    } catch (error) {
      console.error('Ban user error:', error);
      throw error;
    }
  }

  static async unbanUser(userId, adminId, reason = 'Ban lifted by admin') {
    try {
      // Check if user exists and is banned
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isBanned) {
        throw new Error('User is not banned');
      }

      // Get active ban record
      const activeBan = await prisma.userBan.findFirst({
        where: {
          userId,
          isPermanent: false,
          expiresAt: {
            gte: new Date()
          }
        }
      });

      // Update user ban status
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          banExpires: null,
          banIssuedBy: null
        }
      });

      // Update ban record if exists
      if (activeBan) {
        await prisma.userBan.update({
          where: { id: activeBan.id },
          data: {
            expiresAt: new Date() // Set to now to mark as expired
          }
        });
      }

      // Log the action
      await this.logModerationAction('USER_UNBANNED', adminId, 'USER', {
        userId,
        reason,
        previousBan: {
          reason: user.banReason,
          expires: user.banExpires
        }
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isBanned: false,
          banReason: null,
          banExpires: null
        }
      };
    } catch (error) {
      console.error('Unban user error:', error);
      throw error;
    }
  }

  static async getUserBanStatus(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          isBanned: true,
          banReason: true,
          banExpires: true,
          banIssuedBy: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isBanned) {
        // Check if ban has expired
        if (user.banExpires && new Date() > new Date(user.banExpires)) {
          // Ban expired, update user status
          await prisma.user.update({
            where: { id: userId },
            data: {
              isBanned: false,
              banReason: null,
              banExpires: null,
              banIssuedBy: null
            }
          });

          user.isBanned = false;
          user.banReason = null;
          user.banExpires = null;
          user.banIssuedBy = null;
        }
      }

      return user;
    } catch (error) {
      console.error('Get user ban status error:', error);
      throw error;
    }
  }

  static async getBannedUsers(limit = 100, offset = 0) {
    try {
      const bannedUsers = await prisma.user.findMany({
        where: { isBanned: true },
        select: {
          id: true,
          email: true,
          username: true,
          banReason: true,
          banExpires: true,
          banIssuedBy: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return bannedUsers;
    } catch (error) {
      console.error('Get banned users error:', error);
      throw error;
    }
  }

  static async getBanHistory(userId) {
    try {
      const banHistory = await prisma.userBan.findMany({
        where: { userId },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return banHistory;
    } catch (error) {
      console.error('Get ban history error:', error);
      throw error;
    }
  }

  // Content Review
  static async reviewUserContent(userId, adminId, action, reason, details = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      let result = {};

      switch (action) {
        case 'WARN':
          result = await this.issueWarning(userId, adminId, reason, details);
          break;
        case 'SUSPEND':
          result = await this.suspendUser(userId, adminId, reason, details);
          break;
        case 'RESTRICT':
          result = await this.restrictUser(userId, adminId, reason, details);
          break;
        default:
          throw new Error('Invalid moderation action');
      }

      // Log the action
      await this.logModerationAction(`USER_${action.toUpperCase()}`, adminId, 'USER', {
        userId,
        reason,
        details,
        action
      });

      return result;
    } catch (error) {
      console.error('Review user content error:', error);
      throw error;
    }
  }

  // Helper methods
  static async issueWarning(userId, adminId, reason, details) {
    // In a real implementation, this would create a warning record
    // For now, we'll just log it
    return {
      action: 'WARNING_ISSUED',
      userId,
      reason,
      details
    };
  }

  static async suspendUser(userId, adminId, reason, details) {
    // Temporary suspension (24 hours)
    const suspensionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    return await this.banUser(userId, adminId, reason, suspensionDuration, false);
  }

  static async restrictUser(userId, adminId, reason, details) {
    // Restrict user from certain actions (e.g., creating leagues)
    // This would be implemented based on specific requirements
    return {
      action: 'RESTRICTION_APPLIED',
      userId,
      reason,
      details
    };
  }

  // Moderation Statistics
  static async getModerationStats() {
    try {
      const stats = {
        totalBans: await prisma.userBan.count(),
        activeBans: await prisma.user.count({ where: { isBanned: true } }),
        permanentBans: await prisma.userBan.count({ where: { isPermanent: true } }),
        temporaryBans: await prisma.userBan.count({ where: { isPermanent: false } }),
        bansThisMonth: await prisma.userBan.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        bansByReason: await this.getBansByReason()
      };

      return stats;
    } catch (error) {
      console.error('Get moderation stats error:', error);
      throw error;
    }
  }

  static async getBansByReason() {
    try {
      const bans = await prisma.userBan.groupBy({
        by: ['reason'],
        _count: {
          reason: true
        },
        orderBy: {
          _count: {
            reason: 'desc'
          }
        }
      });

      return bans.map(ban => ({
        reason: ban.reason,
        count: ban._count.reason
      }));
    } catch (error) {
      console.error('Get bans by reason error:', error);
      return [];
    }
  }

  // Logging
  static async logModerationAction(action, adminId, targetType, details) {
    try {
      // This would integrate with the system logging service
      console.log(`[MODERATION] ${action} by admin ${adminId} on ${targetType}:`, details);
    } catch (error) {
      console.error('Log moderation action error:', error);
    }
  }
}

module.exports = ContentModerationService;

// File: fpl-hub-backend/src/services/sessionService.js
// Session management service for device tracking and session limits

const { PrismaClient } = require('@prisma/client');

// OPTIMIZED: Reuse the same Prisma client instance for better connection pooling
const prisma = new PrismaClient({
  log: ['error', 'warn'], // Reduce logging overhead
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
});

class SessionService {
  // Create new session
  static async createSession(sessionData) {
    try {
      const session = await prisma.session.create({
        data: {
          userId: sessionData.userId,
          token: sessionData.token,
          deviceInfo: sessionData.deviceInfo,
          ipAddress: sessionData.ipAddress,
          rememberMe: sessionData.rememberMe,
          expiresAt: sessionData.expiresAt
        }
      });
      
      console.log(`Session created for user ${sessionData.userId} from ${sessionData.ipAddress}`);
      return session;
    } catch (error) {
      console.error('SessionService.createSession error:', error);
      throw error;
    }
  }

  // Get active sessions for a user
  static async getUserActiveSessions(userId) {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActive: 'desc' }
      });
      
      return sessions;
    } catch (error) {
      console.error('SessionService.getUserActiveSessions error:', error);
      throw error;
    }
  }

  // Check if user has reached session limit
  static async checkSessionLimit(userId, maxSessions = 5) {
    try {
      const activeSessions = await this.getUserActiveSessions(userId);
      return {
        canCreate: activeSessions.length < maxSessions,
        currentCount: activeSessions.length,
        maxAllowed: maxSessions
      };
    } catch (error) {
      console.error('SessionService.checkSessionLimit error:', error);
      throw error;
    }
  }

  // OPTIMIZED: Check and enforce session limit in a single operation
  static async checkAndEnforceSessionLimit(userId, maxSessions = 5) {
    try {
      // Single query to get active sessions count and enforce limit if needed
      const activeSessions = await prisma.session.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActive: 'desc' },
        select: { id: true, lastActive: true }
      });
      
      if (activeSessions.length >= maxSessions) {
        // Remove oldest sessions to make room for new one
        const sessionsToRemove = activeSessions.slice(maxSessions - 1);
        const sessionIdsToRemove = sessionsToRemove.map(s => s.id);
        
        await prisma.session.updateMany({
          where: { id: { in: sessionIdsToRemove } },
          data: { isActive: false }
        });
        
        console.log(`Enforced session limit for user ${userId}: removed ${sessionsToRemove.length} old sessions`);
      }
      
      return {
        canCreate: true,
        currentCount: Math.min(activeSessions.length, maxSessions - 1),
        maxAllowed: maxSessions
      };
    } catch (error) {
      console.error('SessionService.checkAndEnforceSessionLimit error:', error);
      throw error;
    }
  }

  // Enforce session limit by removing oldest sessions
  static async enforceSessionLimit(userId, maxSessions = 5) {
    try {
      const activeSessions = await this.getUserActiveSessions(userId);
      
      if (activeSessions.length >= maxSessions) {
        // Sort by last active and remove oldest sessions
        const sessionsToRemove = activeSessions
          .sort((a, b) => new Date(a.lastActive) - new Date(b.lastActive))
          .slice(0, activeSessions.length - maxSessions + 1);
        
        // Deactivate old sessions
        for (const session of sessionsToRemove) {
          await prisma.session.update({
            where: { id: session.id },
            data: { isActive: false }
          });
        }
        
        console.log(`Removed ${sessionsToRemove.length} old sessions for user ${userId}`);
        return sessionsToRemove;
      }
      
      return [];
    } catch (error) {
      console.error('SessionService.enforceSessionLimit error:', error);
      throw error;
    }
  }

  // Update session last active time
  static async updateSessionActivity(sessionId) {
    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { lastActive: new Date() }
      });
      
      return session;
    } catch (error) {
      console.error('SessionService.updateSessionActivity error:', error);
      throw error;
    }
  }

  // Deactivate a specific session
  static async deactivateSession(sessionId) {
    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
      
      console.log(`Session ${sessionId} deactivated`);
      return session;
    } catch (error) {
      console.error('SessionService.deactivateSession error:', error);
      throw error;
    }
  }

  // Deactivate all sessions for a user
  static async deactivateAllUserSessions(userId) {
    try {
      const result = await prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      });
      
      console.log(`Deactivated ${result.count} sessions for user ${userId}`);
      return result;
    } catch (error) {
      console.error('SessionService.deactivateAllUserSessions error:', error);
      throw error;
    }
  }

  // Get session by token
  static async getSessionByToken(token) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        select: {
          id: true,
          userId: true,
          token: true,
          deviceInfo: true,
          ipAddress: true,
          isActive: true,
          rememberMe: true,
          lastActive: true,
          expiresAt: true,
          createdAt: true,
          // Only include minimal user data needed for auth
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              isActive: true,
              isVerified: true,
              isAdmin: true,
              adminLevel: true
            }
          }
        }
      });
      
      return session;
    } catch (error) {
      console.error('SessionService.getSessionByToken error:', error);
      throw error;
    }
  }
  
  // Clean up expired sessions
  static async cleanupExpiredSessions() {
    try {
      const result = await prisma.session.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true
        },
        data: { isActive: false }
      });
      
      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired sessions`);
      }
      
      return result;
    } catch (error) {
      console.error('SessionService.cleanupExpiredSessions error:', error);
      throw error;
    }
  }

  // Get device summary for a user
  static async getUserDeviceSummary(userId) {
    try {
      const sessions = await prisma.session.findMany({
        where: { userId },
        orderBy: { lastActive: 'desc' },
        take: 10 // Last 10 sessions
      });
      
      // Group by device info and IP
      const deviceSummary = sessions.reduce((acc, session) => {
        const key = `${session.deviceInfo}|${session.ipAddress}`;
        if (!acc[key]) {
          acc[key] = {
            deviceInfo: session.deviceInfo,
            ipAddress: session.ipAddress,
            lastActive: session.lastActive,
            sessionCount: 0,
            isActive: false
          };
        }
        acc[key].sessionCount++;
        if (session.isActive) acc[key].isActive = true;
        return acc;
      }, {});
      
      return Object.values(deviceSummary);
    } catch (error) {
      console.error('SessionService.getUserDeviceSummary error:', error);
      throw error;
    }
  }
}

module.exports = SessionService;

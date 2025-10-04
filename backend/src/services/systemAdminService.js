// File: fpl-hub-backend/src/services/systemAdminService.js
// System administration service for maintenance, health monitoring, and system management

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();

class SystemAdminService {
  // System Maintenance
  static async enableMaintenanceMode(reason, adminId) {
    try {
      // Check if maintenance is already active
      const existingMaintenance = await prisma.systemMaintenance.findFirst({
        where: { isActive: true }
      });

      if (existingMaintenance) {
        throw new Error('Maintenance mode is already active');
      }

      const maintenance = await prisma.systemMaintenance.create({
        data: {
          isActive: true,
          reason,
          initiatedBy: adminId
        }
      });

      // Log the action
      await this.logSystemAction('MAINTENANCE_ENABLED', adminId, 'SYSTEM', {
        reason,
        maintenanceId: maintenance.id
      });

      return maintenance;
    } catch (error) {
      console.error('Enable maintenance mode error:', error);
      throw error;
    }
  }

  static async disableMaintenanceMode(adminId) {
    try {
      const maintenance = await prisma.systemMaintenance.findFirst({
        where: { isActive: true }
      });

      if (!maintenance) {
        throw new Error('No active maintenance mode found');
      }

      const updatedMaintenance = await prisma.systemMaintenance.update({
        where: { id: maintenance.id },
        data: {
          isActive: false,
          endTime: new Date()
        }
      });

      // Log the action
      await this.logSystemAction('MAINTENANCE_DISABLED', adminId, 'SYSTEM', {
        maintenanceId: maintenance.id,
        duration: new Date() - new Date(maintenance.startTime)
      });

      return updatedMaintenance;
    } catch (error) {
      console.error('Disable maintenance mode error:', error);
      throw error;
    }
  }

  static async getMaintenanceStatus() {
    try {
      const maintenance = await prisma.systemMaintenance.findFirst({
        where: { isActive: true }
      });

      return {
        isActive: !!maintenance,
        maintenance: maintenance
      };
    } catch (error) {
      console.error('Get maintenance status error:', error);
      throw error;
    }
  }

  // System Health Monitoring
  static async checkSystemHealth() {
    try {
      const health = {
        status: 'HEALTHY',
        database: 'HEALTHY',
        api: 'HEALTHY',
        external: 'HEALTHY',
        timestamp: new Date(),
        details: {}
      };

      // Check database health
      try {
        const startTime = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbResponseTime = Date.now() - startTime;
        
        health.database = dbResponseTime < 100 ? 'HEALTHY' : 'WARNING';
        health.details.databaseResponseTime = dbResponseTime;
      } catch (error) {
        health.database = 'CRITICAL';
        health.details.databaseError = error.message;
      }

      // Check API performance
      try {
        const startTime = Date.now();
        await prisma.user.count();
        const apiResponseTime = Date.now() - startTime;
        
        health.api = apiResponseTime < 200 ? 'HEALTHY' : 'WARNING';
        health.details.apiResponseTime = apiResponseTime;
      } catch (error) {
        health.api = 'CRITICAL';
        health.details.apiError = error.message;
      }

      // Check external services (FPL API)
      try {
        const startTime = Date.now();
        // This would be a real FPL API check in production
        await new Promise(resolve => setTimeout(resolve, 50));
        const externalResponseTime = Date.now() - startTime;
        
        health.external = externalResponseTime < 1000 ? 'HEALTHY' : 'WARNING';
        health.details.externalResponseTime = externalResponseTime;
      } catch (error) {
        health.external = 'CRITICAL';
        health.details.externalError = error.message;
      }

      // Determine overall status
      if (health.database === 'CRITICAL' || health.api === 'CRITICAL' || health.external === 'CRITICAL') {
        health.status = 'CRITICAL';
      } else if (health.database === 'WARNING' || health.api === 'WARNING' || health.external === 'WARNING') {
        health.status = 'WARNING';
      }

      // Store health check
      await prisma.systemHealth.create({
        data: {
          status: health.status,
          database: health.database,
          api: health.api,
          external: health.external,
          details: JSON.stringify(health.details)
        }
      });

      return health;
    } catch (error) {
      console.error('System health check error:', error);
      throw error;
    }
  }

  static async getSystemHealthHistory(limit = 100) {
    try {
      const healthHistory = await prisma.systemHealth.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return healthHistory;
    } catch (error) {
      console.error('Get system health history error:', error);
      throw error;
    }
  }

  // Database Backup Management
  static async createDatabaseBackup(backupType = 'FULL') {
    try {
      const backup = await prisma.databaseBackup.create({
        data: {
          filename: `backup_${Date.now()}.db`,
          size: 0,
          status: 'PENDING',
          backupType
        }
      });

      // In a real implementation, this would trigger an actual backup process
      // For now, we'll simulate it
      setTimeout(async () => {
        try {
          await prisma.databaseBackup.update({
            where: { id: backup.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              size: 1024 * 1024 // 1MB simulated size
            }
          });
        } catch (error) {
          console.error('Backup completion update error:', error);
        }
      }, 5000);

      return backup;
    } catch (error) {
      console.error('Create database backup error:', error);
      throw error;
    }
  }

  static async getBackupHistory() {
    try {
      const backups = await prisma.databaseBackup.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return backups;
    } catch (error) {
      console.error('Get backup history error:', error);
      throw error;
    }
  }

  // System Logging
  static async logSystemAction(level, category, message, details = null, userId = null, ipAddress = null) {
    try {
      const log = await prisma.systemLog.create({
        data: {
          level,
          category,
          message,
          details: details ? JSON.stringify(details) : null,
          userId,
          ipAddress
        }
      });

      // Also log to console for development
      console.log(`[${level}] [${category}] ${message}`, details || '');

      return log;
    } catch (error) {
      console.error('Log system action error:', error);
      // Don't throw error for logging failures
    }
  }

  static async getSystemLogs(level = null, category = null, limit = 100, offset = 0) {
    try {
      const where = {};
      if (level) where.level = level;
      if (category) where.category = category;

      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      return logs;
    } catch (error) {
      console.error('Get system logs error:', error);
      throw error;
    }
  }

  // System Statistics
  static async getSystemStats() {
    try {
      const stats = {
        users: {
          total: await prisma.user.count(),
          active: await prisma.user.count({ where: { isActive: true } }),
          banned: await prisma.user.count({ where: { isBanned: true } }),
          admins: await prisma.user.count({ where: { isAdmin: true } })
        },
        leagues: {
          total: await prisma.league.count(),
          active: await prisma.league.count({ where: { status: 'OPEN' } }),
          completed: await prisma.league.count({ where: { status: 'COMPLETED' } })
        },
        financial: {
          totalTransactions: await prisma.transaction.count(),
          pendingWithdrawals: await prisma.withdrawal.count({ where: { status: 'PENDING' } }),
          totalPlatformFees: await this.calculateTotalPlatformFees()
        },
        system: {
          maintenanceActive: await this.getMaintenanceStatus().then(s => s.isActive),
          lastHealthCheck: await this.getLastHealthCheck(),
          totalLogs: await prisma.systemLog.count()
        }
      };

      return stats;
    } catch (error) {
      console.error('Get system stats error:', error);
      throw error;
    }
  }

  // Helper methods
  static async calculateTotalPlatformFees() {
    try {
      const result = await prisma.transaction.aggregate({
        where: {
          type: 'ENTRY_FEE',
          status: 'COMPLETED'
        },
        _sum: {
          amount: true
        }
      });

      return result._sum.amount || 0;
    } catch (error) {
      console.error('Calculate total platform fees error:', error);
      return 0;
    }
  }

  static async getLastHealthCheck() {
    try {
      const lastHealth = await prisma.systemHealth.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      return lastHealth?.timestamp || null;
    } catch (error) {
      console.error('Get last health check error:', error);
      return null;
    }
  }

  // System Information
  static async getSystemInfo() {
    try {
      const info = {
        platform: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime()
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        },
        cpu: {
          cores: os.cpus().length,
          loadAverage: os.loadavg()
        },
        database: {
          provider: 'SQLite',
          url: process.env.DATABASE_URL || 'file:./dev.db'
        }
      };

      return info;
    } catch (error) {
      console.error('Get system info error:', error);
      throw error;
    }
  }
}

module.exports = SystemAdminService;

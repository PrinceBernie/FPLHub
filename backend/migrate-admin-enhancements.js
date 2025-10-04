// File: fpl-hub-backend/migrate-admin-enhancements.js
// Migration script to add admin enhancement fields and models

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function migrateAdminEnhancements() {
  try {
    console.log('Starting admin enhancements migration...');

    // Add new columns to User table
    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN isAdmin BOOLEAN DEFAULT 0`;
      console.log('✓ Added isAdmin column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ isAdmin column already exists');
      } else {
        console.log('✗ Error adding isAdmin column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN adminLevel TEXT DEFAULT 'USER'`;
      console.log('✓ Added adminLevel column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ adminLevel column already exists');
      } else {
        console.log('✗ Error adding adminLevel column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN adminPermissions TEXT`;
      console.log('✓ Added adminPermissions column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ adminPermissions column already exists');
      } else {
        console.log('✗ Error adding adminPermissions column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN twoFactorSecret TEXT`;
      console.log('✓ Added twoFactorSecret column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ twoFactorSecret column already exists');
      } else {
        console.log('✗ Error adding twoFactorSecret column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN twoFactorEnabled BOOLEAN DEFAULT 0`;
      console.log('✓ Added twoFactorEnabled column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ twoFactorEnabled column already exists');
      } else {
        console.log('✗ Error adding twoFactorEnabled column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN lastAdminAction DATETIME`;
      console.log('✓ Added lastAdminAction column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ lastAdminAction column already exists');
      } else {
        console.log('✗ Error adding lastAdminAction column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN isBanned BOOLEAN DEFAULT 0`;
      console.log('✓ Added isBanned column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ isBanned column already exists');
      } else {
        console.log('✗ Error adding isBanned column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN banReason TEXT`;
      console.log('✓ Added banReason column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ banReason column already exists');
      } else {
        console.log('✗ Error adding banReason column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN banExpires DATETIME`;
      console.log('✓ Added banExpires column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ banExpires column already exists');
      } else {
        console.log('✗ Error adding banExpires column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN banIssuedBy TEXT`;
      console.log('✓ Added banIssuedBy column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ banIssuedBy column already exists');
      } else {
        console.log('✗ Error adding banIssuedBy column:', error.message);
      }
    }

    // Create new tables
    console.log('Creating new admin tables...');

    // SystemMaintenance table
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS SystemMaintenance (
        id TEXT PRIMARY KEY,
        isActive BOOLEAN DEFAULT 0,
        reason TEXT,
        startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        endTime DATETIME,
        initiatedBy TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;
      console.log('✓ Created SystemMaintenance table');
    } catch (error) {
      console.log('✗ Error creating SystemMaintenance table:', error.message);
    }

    // SystemHealth table
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS SystemHealth (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        database TEXT NOT NULL,
        api TEXT NOT NULL,
        external TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )`;
      console.log('✓ Created SystemHealth table');
    } catch (error) {
      console.log('✗ Error creating SystemHealth table:', error.message);
    }

    // AdminAction table
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS AdminAction (
        id TEXT PRIMARY KEY,
        adminId TEXT NOT NULL,
        action TEXT NOT NULL,
        targetId TEXT,
        targetType TEXT,
        details TEXT,
        ipAddress TEXT NOT NULL,
        userAgent TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (adminId) REFERENCES User(id) ON DELETE CASCADE
      )`;
      console.log('✓ Created AdminAction table');
    } catch (error) {
      console.log('✗ Error creating AdminAction table:', error.message);
    }

    // UserBan table
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS UserBan (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        adminId TEXT NOT NULL,
        reason TEXT NOT NULL,
        isPermanent BOOLEAN DEFAULT 0,
        expiresAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (adminId) REFERENCES User(id) ON DELETE CASCADE
      )`;
      console.log('✓ Created UserBan table');
    } catch (error) {
      console.log('✗ Error creating UserBan table:', error.message);
    }

    // SystemLog table
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS SystemLog (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        ipAddress TEXT,
        userId TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;
      console.log('✓ Created SystemLog table');
    } catch (error) {
      console.log('✗ Error creating SystemLog table:', error.message);
    }

    // DatabaseBackup table
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS DatabaseBackup (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size INTEGER NOT NULL,
        status TEXT NOT NULL,
        backupType TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME,
        error TEXT
      )`;
      console.log('✓ Created DatabaseBackup table');
    } catch (error) {
      console.log('✗ Error creating DatabaseBackup table:', error.message);
    }

    // Create indexes
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_systemlog_level_category_timestamp ON SystemLog(level, category, timestamp)`;
      console.log('✓ Created SystemLog indexes');
    } catch (error) {
      console.log('✗ Error creating SystemLog indexes:', error.message);
    }

    // Update existing admin user to have proper admin level
    console.log('Updating existing admin user...');
    try {
      await prisma.user.updateMany({
        where: {
          OR: [
            { email: 'admin@fplhub.com' },
            { email: { contains: 'admin' } },
            { username: { contains: 'admin' } }
          ]
        },
        data: {
          isAdmin: true,
          adminLevel: 'SUPER_ADMIN',
          adminPermissions: JSON.stringify([
            'USER_MANAGEMENT',
            'LEAGUE_MANAGEMENT',
            'FINANCIAL_MANAGEMENT',
            'SYSTEM_ADMINISTRATION',
            'CONTENT_MODERATION'
          ])
        }
      });
      console.log('✓ Updated existing admin users');
    } catch (error) {
      console.log('✗ Error updating admin users:', error.message);
    }

    console.log('\n🎉 Admin enhancements migration completed successfully!');
    console.log('\nNew features added:');
    console.log('- Admin role system with levels (USER, MODERATOR, ADMIN, SUPER_ADMIN)');
    console.log('- Two-factor authentication support');
    console.log('- User banning system');
    console.log('- System maintenance mode');
    console.log('- System health monitoring');
    console.log('- Admin action logging');
    console.log('- System logging');
    console.log('- Database backup tracking');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateAdminEnhancements();

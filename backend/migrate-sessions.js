// File: fpl-hub-backend/migrate-sessions.js
// Migration script to add sessions table

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateSessions() {
  try {
    console.log('Starting sessions table migration...');
    
    // Create sessions table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "deviceInfo" TEXT NOT NULL,
        "ipAddress" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "rememberMe" BOOLEAN NOT NULL DEFAULT false,
        "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("id")
      )
    `;
    
    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Session_userId_isActive_idx" ON "Session"("userId", "isActive")
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token")
    `;
    
    // Add foreign key constraint
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session_new" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "deviceInfo" TEXT NOT NULL,
        "ipAddress" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "rememberMe" BOOLEAN NOT NULL DEFAULT false,
        "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("id"),
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )
    `;
    
    console.log('Sessions table migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateSessions();
}

module.exports = migrateSessions;

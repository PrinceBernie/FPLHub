// File: fpl-hub-backend/migrate-new-fields.js
// Migration script to add new fields for consent and password reset

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateNewFields() {
  try {
    console.log('Starting new fields migration...');
    
    // Add consentGiven field (SQLite doesn't support IF NOT EXISTS)
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "consentGiven" BOOLEAN NOT NULL DEFAULT 0`;
      console.log('✅ Added consentGiven field');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  consentGiven field already exists');
      } else {
        throw error;
      }
    }
    
    // Add passwordResetToken field
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT`;
      console.log('✅ Added passwordResetToken field');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  passwordResetToken field already exists');
      } else {
        throw error;
      }
    }
    
    // Add passwordResetExpires field
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "passwordResetExpires" DATETIME`;
      console.log('✅ Added passwordResetExpires field');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  passwordResetExpires field already exists');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 New fields migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateNewFields();
}

module.exports = migrateNewFields;

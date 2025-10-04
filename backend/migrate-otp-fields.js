// File: fpl-hub-backend/migrate-otp-fields.js
// Migration script to add OTP fields for phone verification

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateOTPFields() {
  try {
    console.log('Starting OTP fields migration...');
    
    // Add otpCode field
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "otpCode" TEXT`;
      console.log('✅ Added otpCode field');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  otpCode field already exists');
      } else {
        throw error;
      }
    }
    
    // Add otpExpires field
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "otpExpires" DATETIME`;
      console.log('✅ Added otpExpires field');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  otpExpires field already exists');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 OTP fields migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateOTPFields();
}

module.exports = migrateOTPFields;

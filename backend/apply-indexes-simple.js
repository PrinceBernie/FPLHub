#!/usr/bin/env node

/**
 * Simple Performance Index Application Script
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyIndexes() {
  console.log('🚀 Applying critical performance indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")',
    'CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone")',
    'CREATE INDEX IF NOT EXISTS "Session_userId_isActive_idx" ON "Session"("userId", "isActive")',
    'CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt")',
    'CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token")',
    'CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive")',
    'CREATE INDEX IF NOT EXISTS "User_isVerified_idx" ON "User"("isVerified")',
    'CREATE INDEX IF NOT EXISTS "LinkedTeam_userId_idx" ON "LinkedTeam"("userId")',
    'CREATE INDEX IF NOT EXISTS "LeagueEntry_userId_idx" ON "LeagueEntry"("userId")',
    'CREATE INDEX IF NOT EXISTS "League_startGameweek_type_idx" ON "League"("startGameweek", "type")',
    'CREATE INDEX IF NOT EXISTS "League_status_idx" ON "League"("status")',
    'CREATE INDEX IF NOT EXISTS "League_isPrivate_idx" ON "League"("isPrivate")',
    'CREATE INDEX IF NOT EXISTS "User_adminLevel_idx" ON "User"("adminLevel")',
    'CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt")',
    'CREATE INDEX IF NOT EXISTS "Session_createdAt_idx" ON "Session"("createdAt")',
    'CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId")',
    'CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId")',
    'CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId")',
    'CREATE INDEX IF NOT EXISTS "User_otpExpires_idx" ON "User"("otpExpires")',
    'CREATE INDEX IF NOT EXISTS "User_passwordResetToken_idx" ON "User"("passwordResetToken")',
    'CREATE INDEX IF NOT EXISTS "User_passwordResetExpires_idx" ON "User"("passwordResetExpires")'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const indexSQL of indexes) {
    try {
      await prisma.$executeRawUnsafe(indexSQL);
      const indexName = indexSQL.match(/"([^"]+)"/)[1];
      console.log(`✅ Applied: ${indexName}`);
      successCount++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        const indexName = indexSQL.match(/"([^"]+)"/)[1];
        console.log(`ℹ️  Already exists: ${indexName}`);
        successCount++;
      } else {
        const indexName = indexSQL.match(/"([^"]+)"/)[1];
        console.error(`❌ Failed: ${indexName}`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log(`\n📈 Performance Index Summary:`);
  console.log(`   ✅ Successfully applied: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📊 Total: ${indexes.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All performance indexes applied successfully!');
    console.log('🚀 Login performance should be dramatically improved.');
  }
  
  await prisma.$disconnect();
}

applyIndexes().catch(console.error);

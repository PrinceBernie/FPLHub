#!/usr/bin/env node

/**
 * Migration script for Reward System (Bonus Wallet & Streak Tracking)
 * 
 * This script adds:
 * - BonusWallet model for promotional credits
 * - StreakTracker model for consecutive gameweek participation
 * - StreakReward model for tracking earned rewards
 * - BonusTransaction model for bonus wallet transactions
 * - New enums for bonus transactions and reward status
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function migrateRewardSystem() {
  console.log('🚀 Starting Reward System Migration...');
  
  try {
    // 1. Create bonus wallets for all existing users
    console.log('📦 Creating bonus wallets for existing users...');
    
    const users = await prisma.user.findMany({
      where: { bonusWallet: null }
    });
    
    for (const user of users) {
      await prisma.bonusWallet.create({
        data: {
          userId: user.id,
          balance: 0,
          currency: 'GHS',
          isActive: true
        }
      });
    }
    
    console.log(`✅ Created ${users.length} bonus wallets`);
    
    // 2. Create streak trackers for all existing users
    console.log('🏃 Creating streak trackers for existing users...');
    
    for (const user of users) {
      await prisma.streakTracker.create({
        data: {
          userId: user.id,
          currentStreak: 0,
          longestStreak: 0,
          totalParticipations: 0
        }
      });
    }
    
    console.log(`✅ Created ${users.length} streak trackers`);
    
    // 3. Initialize streak data based on existing league entries
    console.log('📊 Initializing streak data from existing league entries...');
    
    const leagueEntries = await prisma.leagueEntry.findMany({
      include: {
        league: true,
        user: true
      },
      orderBy: {
        entryTime: 'asc'
      }
    });
    
    // Group entries by user and gameweek
    const userGameweekParticipation = {};
    
    for (const entry of leagueEntries) {
      const userId = entry.userId;
      const gameweek = entry.league.startGameweek;
      
      if (!userGameweekParticipation[userId]) {
        userGameweekParticipation[userId] = new Set();
      }
      
      userGameweekParticipation[userId].add(gameweek);
    }
    
    // Update streak trackers with historical data
    for (const [userId, gameweeks] of Object.entries(userGameweekParticipation)) {
      const sortedGameweeks = Array.from(gameweeks).sort((a, b) => a - b);
      
      // Calculate current streak (consecutive gameweeks from the end)
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastGameweek = null;
      
      for (const gameweek of sortedGameweeks) {
        if (lastGameweek === null || gameweek === lastGameweek + 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
        lastGameweek = gameweek;
      }
      
      // Current streak is the streak from the most recent gameweek
      currentStreak = tempStreak;
      
      await prisma.streakTracker.update({
        where: { userId },
        data: {
          currentStreak,
          longestStreak,
          totalParticipations: sortedGameweeks.length,
          lastParticipatedGameweek: sortedGameweeks.length > 0 ? sortedGameweeks[sortedGameweeks.length - 1] : null
        }
      });
    }
    
    console.log(`✅ Updated streak data for ${Object.keys(userGameweekParticipation).length} users`);
    
    // 4. Create sample streak rewards for users who would have earned them
    console.log('🎁 Creating historical streak rewards...');
    
    const eligibleUsers = await prisma.streakTracker.findMany({
      where: {
        currentStreak: {
          gte: 10
        }
      },
      include: {
        user: true
      }
    });
    
    for (const tracker of eligibleUsers) {
      // Check if user already has a reward for this streak
      const existingReward = await prisma.streakReward.findFirst({
        where: {
          userId: tracker.userId,
          streakLength: 10
        }
      });
      
      if (!existingReward) {
        await prisma.streakReward.create({
          data: {
            userId: tracker.userId,
            gameweek: tracker.lastParticipatedGameweek || 1,
            streakLength: 10,
            amount: 30.0,
            currency: 'GHS',
            status: 'PENDING'
          }
        });
      }
    }
    
    console.log(`✅ Created ${eligibleUsers.length} historical streak rewards`);
    
    console.log('🎉 Reward System Migration Completed Successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Created ${users.length} bonus wallets`);
    console.log(`   - Created ${users.length} streak trackers`);
    console.log(`   - Updated streak data for ${Object.keys(userGameweekParticipation).length} users`);
    console.log(`   - Created ${eligibleUsers.length} historical streak rewards`);
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('   1. Run the reward processing service to credit pending rewards');
    console.log('   2. Test the bonus wallet payment system');
    console.log('   3. Verify streak tracking is working correctly');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateRewardSystem()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRewardSystem };

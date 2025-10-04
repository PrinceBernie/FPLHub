// File: fpl-hub-backend/migrate-league-enhancements.js
// Migration script to add new league enhancement fields

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function migrateLeagueEnhancements() {
  try {
    console.log('Starting league enhancements migration...');

    // Add new columns to League table
    try {
      await prisma.$executeRaw`ALTER TABLE League ADD COLUMN platformFeeType TEXT DEFAULT 'PERCENTAGE'`;
      console.log('✓ Added platformFeeType column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ platformFeeType column already exists');
      } else {
        console.log('✗ Error adding platformFeeType column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE League ADD COLUMN platformFeeValue REAL DEFAULT 5.0`;
      console.log('✓ Added platformFeeValue column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ platformFeeValue column already exists');
      } else {
        console.log('✗ Error adding platformFeeValue column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE League ADD COLUMN isInvitational BOOLEAN DEFAULT 1`;
      console.log('✓ Added isInvitational column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ isInvitational column already exists');
      } else {
        console.log('✗ Error adding isInvitational column:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE League ADD COLUMN leagueCode TEXT`;
      console.log('✓ Added leagueCode column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ leagueCode column already exists');
      } else {
        console.log('✗ Error adding leagueCode column:', error.message);
      }
    }

    // Add new column to LeagueEntry table
    try {
      await prisma.$executeRaw`ALTER TABLE LeagueEntry ADD COLUMN canLeave BOOLEAN DEFAULT 0`;
      console.log('✓ Added canLeave column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ canLeave column already exists');
      } else {
        console.log('✗ Error adding canLeave column:', error.message);
      }
    }

    // Update existing leagues to have league codes
    console.log('Generating league codes for existing leagues...');
    const existingLeagues = await prisma.league.findMany({
      where: {
        leagueCode: null
      }
    });

    for (const league of existingLeagues) {
      const leagueCode = generateLeagueCode();
      await prisma.league.update({
        where: { id: league.id },
        data: { leagueCode }
      });
      console.log(`✓ Generated code ${leagueCode} for league: ${league.name}`);
    }

    // Update maxTeams for existing leagues to 400 if they exceed it
    await prisma.league.updateMany({
      where: {
        maxTeams: {
          gt: 400
        }
      },
      data: {
        maxTeams: 400
      }
    });
    console.log('✓ Updated maxTeams to 400 for leagues exceeding limit');

    // Set all existing leagues to private and invitational
    await prisma.league.updateMany({
      data: {
        isPrivate: true,
        isInvitational: true
      }
    });
    console.log('✓ Set all existing leagues to private and invitational');

    // Set all existing league entries to cannot leave
    await prisma.leagueEntry.updateMany({
      data: {
        canLeave: false
      }
    });
    console.log('✓ Set all existing league entries to cannot leave');

    console.log('\n🎉 League enhancements migration completed successfully!');
    console.log('\nNew features added:');
    console.log('- Platform fee configuration (percentage/fixed)');
    console.log('- Invitational league system with codes');
    console.log('- Private league enforcement');
    console.log('- Participant limit of 400');
    console.log('- No-leave policy for paid leagues');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateLeagueCode() {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Run migration
migrateLeagueEnhancements();

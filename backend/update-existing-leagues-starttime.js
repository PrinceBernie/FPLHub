// File: fpl-hub-backend/update-existing-leagues-starttime.js
// Script to update existing leagues with startTime field

const { PrismaClient } = require('@prisma/client');
const fplService = require('./src/services/fplService');

const prisma = new PrismaClient();

async function updateExistingLeaguesWithStartTime() {
  console.log('🔄 Updating existing leagues with startTime field...');

  try {
    // Get all leagues that don't have startTime set
    const leaguesWithoutStartTime = await prisma.league.findMany({
      where: {
        startTime: null,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      orderBy: { startGameweek: 'asc' }
    });

    console.log(`Found ${leaguesWithoutStartTime.length} leagues without startTime`);

    if (leaguesWithoutStartTime.length === 0) {
      console.log('✅ All leagues already have startTime set');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const league of leaguesWithoutStartTime) {
      try {
        console.log(`\n📝 Processing league: ${league.name} (GW${league.startGameweek})`);
        
        // Get first match kickoff time for this gameweek
        let firstMatchKickoff = null;
        
        try {
          firstMatchKickoff = await fplService.getFirstMatchKickoff(league.startGameweek);
          console.log(`🏈 First match kickoff: ${firstMatchKickoff}`);
        } catch (error) {
          console.warn(`⚠️  Could not get first match kickoff for GW${league.startGameweek}:`, error.message);
          
          // Fallback: use FPL deadline + 1 hour as startTime
          try {
            const gameweekData = await fplService.getGameweekById(league.startGameweek);
            if (gameweekData && gameweekData.deadline_time) {
              firstMatchKickoff = new Date(new Date(gameweekData.deadline_time).getTime() + (60 * 60 * 1000)); // +1 hour
              console.log(`🔄 Using fallback startTime (deadline + 1h): ${firstMatchKickoff}`);
            }
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed for GW${league.startGameweek}:`, fallbackError.message);
            errorCount++;
            continue;
          }
        }

        if (firstMatchKickoff) {
          // Update the league with startTime
          await prisma.league.update({
            where: { id: league.id },
            data: { startTime: firstMatchKickoff }
          });
          
          console.log(`✅ Updated ${league.name} with startTime: ${firstMatchKickoff}`);
          updatedCount++;
        } else {
          console.error(`❌ Could not determine startTime for ${league.name}`);
          errorCount++;
        }

        // Add a small delay to avoid overwhelming the FPL API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error updating league ${league.name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Successfully updated: ${updatedCount} leagues`);
    console.log(`   ❌ Errors: ${errorCount} leagues`);
    console.log(`   📈 Total processed: ${leaguesWithoutStartTime.length} leagues`);

    if (updatedCount > 0) {
      console.log('\n🎉 League startTime update completed successfully!');
      console.log('🏈 Leagues now use first match kickoff time for entry closure');
    }

  } catch (error) {
    console.error('❌ Error in updateExistingLeaguesWithStartTime:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateExistingLeaguesWithStartTime()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

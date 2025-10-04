// File: fpl-hub-backend/update-team-to-real-id.js
// Quick script to update one dummy team ID to a real one for testing

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTeamToRealId() {
  console.log('🔄 Updating one team to real FPL ID for testing...');

  try {
    // Find a linked team with a dummy ID
    const dummyTeam = await prisma.linkedTeam.findFirst({
      where: {
        fplTeamId: { in: [100001, 100002, 100003, 100004, 100005] }
      }
    });

    if (!dummyTeam) {
      console.log('❌ No dummy teams found to update');
      return;
    }

    console.log(`📝 Found dummy team: ${dummyTeam.teamName} (ID: ${dummyTeam.fplTeamId})`);

    // Update to a real team ID that has points (Team 681 has 5 points)
    const updatedTeam = await prisma.linkedTeam.update({
      where: { id: dummyTeam.id },
      data: { 
        fplTeamId: 681,
        teamName: `Real FPL Team 681 (${dummyTeam.teamName})`
      }
    });

    console.log(`✅ Updated team to real FPL ID: ${updatedTeam.fplTeamId}`);
    console.log(`   Team name: ${updatedTeam.teamName}`);

    // Now test live standings
    console.log('\n🧪 Testing live standings with real team...');
    const LiveStandingsService = require('./src/services/liveStandingsService');
    const result = await LiveStandingsService.updateLiveStandings(6);
    
    console.log(`\n📈 Live standings result:`);
    console.log(`   Updated entries: ${result.updatedEntries}`);
    
    if (result.updatedEntries > 0) {
      console.log('🎉 SUCCESS! Live standings are now working!');
    }

  } catch (error) {
    console.error('❌ Error updating team:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateTeamToRealId()
  .then(() => {
    console.log('\n✨ Update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Update failed:', error);
    process.exit(1);
  });

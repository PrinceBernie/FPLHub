// File: fpl-hub-backend/simulate-rank-change.js
// Simulate a rank change to test positional arrows

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simulateRankChange() {
  console.log('🧪 Simulating rank change to test positional arrows...');

  try {
    // Get the GW6 Free2Play league
    const league = await prisma.league.findFirst({
      where: {
        startGameweek: 6,
        type: 'FREE',
        status: 'OPEN'
      }
    });

    if (!league) {
      console.log('❌ No GW6 Free2Play league found');
      return;
    }

    console.log(`📊 Testing league: ${league.name} (${league.id})`);

    // Get current entries
    const entries = await prisma.leagueEntry.findMany({
      where: {
        leagueId: league.id,
        isActive: true
      },
      include: {
        linkedTeam: true
      },
      orderBy: {
        gameweekPoints: 'desc'
      }
    });

    console.log('\n📊 Current Rankings:');
    entries.slice(0, 5).forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.linkedTeam.teamName}: ${entry.gameweekPoints} points (Rank: ${entry.rank})`);
    });

    // Simulate a rank change by updating points
    console.log('\n🔄 Simulating rank change...');
    
    // Find "Bowen Arrow" and give it more points to move up
    const bowenArrow = entries.find(e => e.linkedTeam.teamName === 'Bowen Arrow');
    if (bowenArrow) {
      console.log(`   Updating ${bowenArrow.linkedTeam.teamName} from ${bowenArrow.gameweekPoints} to 3 points`);
      
      await prisma.leagueEntry.update({
        where: { id: bowenArrow.id },
        data: { gameweekPoints: 3 }
      });
    }

    // Now run the leaderboard service to see the rank change
    console.log('\n🔄 Running leaderboard service...');
    const LeaderboardService = require('./src/services/leaderboardService');
    const leaderboardData = await LeaderboardService.getLeagueLeaderboard(league.id);
    
    console.log('\n📈 Updated Leaderboard with Positional Changes:');
    if (leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0) {
      leaderboardData.leaderboard.slice(0, 5).forEach((entry, index) => {
        const changeIcon = entry.previousRank ? 
          (entry.rank < entry.previousRank ? '🔺' : 
           entry.rank > entry.previousRank ? '🔻' : '➖') : '➖';
        
        console.log(`   ${index + 1}. ${entry.teamName}: ${entry.totalPoints} points`);
        console.log(`      Current Rank: ${entry.rank}, Previous: ${entry.previousRank || 'N/A'} ${changeIcon}`);
      });
    }

    // Reset the points back
    console.log('\n🔄 Resetting points...');
    if (bowenArrow) {
      await prisma.leagueEntry.update({
        where: { id: bowenArrow.id },
        data: { gameweekPoints: 1 }
      });
      console.log(`   Reset ${bowenArrow.linkedTeam.teamName} back to 1 point`);
    }

  } catch (error) {
    console.error('❌ Error simulating rank change:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulateRankChange()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

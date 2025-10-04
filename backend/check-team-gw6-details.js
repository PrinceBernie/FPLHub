// File: fpl-hub-backend/check-team-gw6-details.js
// Check detailed GW6 info for your teams

const axios = require('axios');

async function checkTeamGW6Details() {
  console.log('🔍 Checking detailed GW6 info for your teams...');

  try {
    // Your actual team IDs
    const yourTeamIds = [1245789, 200001, 100003];
    
    for (const teamId of yourTeamIds) {
      console.log(`\n📊 Team ${teamId} GW6 Details:`);
      
      try {
        // Get team's GW6 picks
        const picksResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/6/picks/`);
        console.log(`   ✅ GW6 picks retrieved`);
        console.log(`   Picks count: ${picksResponse.data.picks.length}`);
        console.log(`   Captain: ${picksResponse.data.picks.find(p => p.is_captain)?.element || 'Not set'}`);
        console.log(`   Vice captain: ${picksResponse.data.picks.find(p => p.is_vice_captain)?.element || 'Not set'}`);
        console.log(`   Bench: ${picksResponse.data.picks.filter(p => p.position > 11).length} players`);
        
        // Check if team has any transfers for GW6
        const transfersResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/transfers/`);
        const gw6Transfers = transfersResponse.data.filter(t => t.event === 6);
        console.log(`   GW6 transfers: ${gw6Transfers.length}`);
        
        // Check team's current points
        const historyResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`);
        const gw6History = historyResponse.data.current.find(h => h.event === 6);
        if (gw6History) {
          console.log(`   GW6 points: ${gw6History.points}`);
          console.log(`   GW6 rank: ${gw6History.rank}`);
          console.log(`   GW6 overall rank: ${gw6History.overall_rank}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error getting GW6 details: ${error.response?.status || error.message}`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check what the live data actually contains
    console.log(`\n📡 Live Data Analysis:`);
    const liveResponse = await axios.get('https://fantasy.premierleague.com/api/event/6/live/');
    const liveData = liveResponse.data.elements;
    
    // Find teams with points > 0
    const teamsWithPoints = liveData.filter(team => team.stats && team.stats.total_points > 0);
    console.log(`   Teams with points > 0: ${teamsWithPoints.length}`);
    
    if (teamsWithPoints.length > 0) {
      console.log(`   Sample teams with points:`);
      teamsWithPoints.slice(0, 5).forEach(team => {
        console.log(`     Team ${team.id}: ${team.stats.total_points} points`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking team details:', error.message);
  }
}

checkTeamGW6Details()
  .then(() => {
    console.log('\n✨ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });

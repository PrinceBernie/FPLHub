// File: fpl-hub-backend/debug-captain-points.js
// Debug why captain points are 0

const axios = require('axios');

async function debugCaptainPoints() {
  console.log('🔍 Debugging captain points for Team 111477 (Bowen Arrow)...');

  try {
    const teamId = 111477; // Bowen Arrow
    const gameweekId = 6;
    
    // Get team's picks
    const teamResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${gameweekId}/picks/`);
    
    console.log('📊 Team picks data:');
    console.log(`   Total picks: ${teamResponse.data.picks.length}`);
    
    // Find captain and vice-captain
    const captain = teamResponse.data.picks.find(p => p.is_captain);
    const viceCaptain = teamResponse.data.picks.find(p => p.is_vice_captain);
    
    console.log(`   Captain: Player ${captain?.element || 'Not set'}`);
    console.log(`   Vice Captain: Player ${viceCaptain?.element || 'Not set'}`);
    
    // Get live player data
    const liveResponse = await axios.get(`https://fantasy.premierleague.com/api/event/${gameweekId}/live/`);
    const liveData = liveResponse.data.elements;
    
    if (captain) {
      const captainData = liveData.find(p => p.id === captain.element);
      if (captainData) {
        console.log(`\n📊 Captain (Player ${captain.element}) data:`);
        console.log(`   Points: ${captainData.stats?.total_points || 0}`);
        console.log(`   Minutes: ${captainData.stats?.minutes || 0}`);
        console.log(`   Goals: ${captainData.stats?.goals_scored || 0}`);
        console.log(`   Assists: ${captainData.stats?.assists || 0}`);
        console.log(`   Clean Sheet: ${captainData.stats?.clean_sheets || 0}`);
      } else {
        console.log(`❌ Captain player ${captain.element} not found in live data`);
      }
    }
    
    if (viceCaptain) {
      const viceCaptainData = liveData.find(p => p.id === viceCaptain.element);
      if (viceCaptainData) {
        console.log(`\n📊 Vice Captain (Player ${viceCaptain.element}) data:`);
        console.log(`   Points: ${viceCaptainData.stats?.total_points || 0}`);
        console.log(`   Minutes: ${viceCaptainData.stats?.minutes || 0}`);
        console.log(`   Goals: ${viceCaptainData.stats?.goals_scored || 0}`);
        console.log(`   Assists: ${viceCaptainData.stats?.assists || 0}`);
        console.log(`   Clean Sheet: ${viceCaptainData.stats?.clean_sheets || 0}`);
      } else {
        console.log(`❌ Vice Captain player ${viceCaptain.element} not found in live data`);
      }
    }
    
    // Check a few players with points
    console.log(`\n📊 Sample players with points:`);
    const playersWithPoints = liveData.filter(p => p.stats && p.stats.total_points > 0).slice(0, 5);
    playersWithPoints.forEach(player => {
      console.log(`   Player ${player.id}: ${player.stats.total_points} points`);
    });

  } catch (error) {
    console.error('❌ Error debugging captain points:', error.message);
  }
}

debugCaptainPoints()
  .then(() => {
    console.log('\n✨ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error);
    process.exit(1);
  });

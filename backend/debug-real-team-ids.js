// File: fpl-hub-backend/debug-real-team-ids.js
// Debug script to check why real FPL team IDs aren't getting live data

const axios = require('axios');

async function debugRealTeamIds() {
  console.log('🔍 Debugging real FPL team IDs from your system...');

  try {
    // Your actual team IDs from the system
    const yourTeamIds = [1245789, 200001, 100003, 1147863, 100005, 100004, 100001, 100009, 417303, 1245886, 100002, 225889, 111477, 7653676];
    
    console.log(`📊 Checking ${yourTeamIds.length} real team IDs...`);

    // Get live data for GW6
    const liveResponse = await axios.get('https://fantasy.premierleague.com/api/event/6/live/');
    const liveData = liveResponse.data.elements;
    
    console.log(`📡 Total teams in FPL live data: ${liveData.length}`);
    console.log(`📡 FPL team ID range: ${Math.min(...liveData.map(t => t.id))} - ${Math.max(...liveData.map(t => t.id))}`);

    // Check each of your team IDs
    console.log('\n🔍 Checking your team IDs:');
    let foundCount = 0;
    let notFoundCount = 0;

    for (const teamId of yourTeamIds) {
      const teamData = liveData.find(team => team.id === teamId);
      
      if (teamData) {
        foundCount++;
        console.log(`✅ Team ${teamId}: Found in live data`);
        console.log(`   Points: ${teamData.stats ? teamData.stats.total_points : 'No stats'}`);
        console.log(`   Minutes: ${teamData.stats ? teamData.stats.minutes : 'No stats'}`);
      } else {
        notFoundCount++;
        console.log(`❌ Team ${teamId}: NOT found in live data`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Found: ${foundCount} teams`);
    console.log(`   Not found: ${notFoundCount} teams`);

    if (notFoundCount > 0) {
      console.log(`\n🤔 Analysis:`);
      console.log(`   Your team IDs seem to be outside the normal FPL range`);
      console.log(`   Normal FPL team IDs are typically 1-10,000,000`);
      console.log(`   Some of your IDs (like 7653676) are very high`);
      console.log(`   This might indicate they're from a different season or test data`);
    }

    // Check what the actual current FPL team ID range is
    console.log(`\n📊 Current FPL team ID analysis:`);
    const teamIds = liveData.map(t => t.id).sort((a, b) => a - b);
    console.log(`   Lowest ID: ${teamIds[0]}`);
    console.log(`   Highest ID: ${teamIds[teamIds.length - 1]}`);
    console.log(`   Sample IDs: ${teamIds.slice(0, 10).join(', ')}`);
    console.log(`   Sample high IDs: ${teamIds.slice(-10).join(', ')}`);

  } catch (error) {
    console.error('❌ Error debugging team IDs:', error.message);
  }
}

debugRealTeamIds()
  .then(() => {
    console.log('\n✨ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error);
    process.exit(1);
  });

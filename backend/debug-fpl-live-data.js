// File: fpl-hub-backend/debug-fpl-live-data.js
// Debug script to check FPL live data

const fplService = require('./src/services/fplService');

async function debugFPLData() {
  console.log('🔍 Debugging FPL live data...');

  try {
    // Check current gameweek
    console.log('\n📊 Current Gameweek Info:');
    const currentGW = await fplService.getCurrentGameweek();
    console.log(`   ID: ${currentGW.id}`);
    console.log(`   Name: ${currentGW.name}`);
    console.log(`   Deadline: ${currentGW.deadline_time}`);
    console.log(`   Is Current: ${currentGW.is_current}`);
    console.log(`   Is Next: ${currentGW.is_next}`);

    // Check if GW6 is live
    console.log('\n🏈 Gameweek 6 Status:');
    const gw6 = await fplService.getGameweekById(6);
    if (gw6) {
      console.log(`   ID: ${gw6.id}`);
      console.log(`   Name: ${gw6.name}`);
      console.log(`   Deadline: ${gw6.deadline_time}`);
      console.log(`   Is Current: ${gw6.is_current}`);
      console.log(`   Is Next: ${gw6.is_next}`);
      
      const now = new Date();
      const deadline = new Date(gw6.deadline_time);
      const isLive = now > deadline;
      console.log(`   Now: ${now.toISOString()}`);
      console.log(`   Deadline: ${deadline.toISOString()}`);
      console.log(`   Is Live: ${isLive}`);
    } else {
      console.log('   ❌ Gameweek 6 not found');
    }

    // Try to get live data for GW6
    console.log('\n📡 Live Data for GW6:');
    try {
      const liveData = await fplService.getLiveGameweekData(6);
      console.log(`   Live data received: ${!!liveData}`);
      if (liveData) {
        console.log(`   Elements count: ${liveData.elements ? liveData.elements.length : 0}`);
        if (liveData.elements && liveData.elements.length > 0) {
          console.log(`   First few team IDs: ${liveData.elements.slice(0, 5).map(e => e.id).join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error getting live data: ${error.message}`);
    }

    // Check first match kickoff
    console.log('\n⏰ First Match Kickoff for GW6:');
    try {
      const kickoff = await fplService.getFirstMatchKickoff(6);
      console.log(`   First match kickoff: ${kickoff}`);
    } catch (error) {
      console.log(`   ❌ Error getting kickoff: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error.message);
  }
}

debugFPLData()
  .then(() => {
    console.log('\n✨ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error);
    process.exit(1);
  });

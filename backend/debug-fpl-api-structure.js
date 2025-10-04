// File: fpl-hub-backend/debug-fpl-api-structure.js
// Debug script to check FPL API structure and endpoints

const axios = require('axios');

async function debugFPLAPI() {
  console.log('🔍 Debugging FPL API structure...');

  try {
    const baseURL = 'https://fantasy.premierleague.com/api';
    
    // Check current gameweek
    console.log('\n📊 Current Gameweek:');
    const bootstrapResponse = await axios.get(`${baseURL}/bootstrap-static/`);
    const currentGW = bootstrapResponse.data.events.find(gw => gw.is_current);
    console.log(`   Current GW: ${currentGW.id} - ${currentGW.name}`);
    console.log(`   Deadline: ${currentGW.deadline_time}`);
    console.log(`   Is Current: ${currentGW.is_current}`);
    console.log(`   Is Next: ${currentGW.is_next}`);
    console.log(`   Is Previous: ${currentGW.is_previous}`);

    // Check if GW6 is actually current
    const gw6 = bootstrapResponse.data.events.find(gw => gw.id === 6);
    if (gw6) {
      console.log(`\n🏈 Gameweek 6 Status:`);
      console.log(`   ID: ${gw6.id}`);
      console.log(`   Name: ${gw6.name}`);
      console.log(`   Deadline: ${gw6.deadline_time}`);
      console.log(`   Is Current: ${gw6.is_current}`);
      console.log(`   Is Next: ${gw6.is_next}`);
      console.log(`   Is Previous: ${gw6.is_previous}`);
    }

    // Check live data for current gameweek
    console.log(`\n📡 Live Data for Current GW (${currentGW.id}):`);
    try {
      const liveResponse = await axios.get(`${baseURL}/event/${currentGW.id}/live/`);
      console.log(`   Live data received: ${!!liveResponse.data}`);
      console.log(`   Data keys: ${Object.keys(liveResponse.data).join(', ')}`);
      
      if (liveResponse.data.elements) {
        console.log(`   Elements count: ${liveResponse.data.elements.length}`);
        
        // Check first few elements
        const sampleElements = liveResponse.data.elements.slice(0, 3);
        sampleElements.forEach((element, index) => {
          console.log(`\n   Element ${index + 1} (ID: ${element.id}):`);
          console.log(`     Keys: ${Object.keys(element).join(', ')}`);
          if (element.stats) {
            console.log(`     Total Points: ${element.stats.total_points}`);
            console.log(`     Minutes: ${element.stats.minutes}`);
          }
        });
      }
    } catch (error) {
      console.log(`   ❌ Error getting live data: ${error.message}`);
    }

    // Check live data for GW6 specifically
    console.log(`\n📡 Live Data for GW6 specifically:`);
    try {
      const liveResponse6 = await axios.get(`${baseURL}/event/6/live/`);
      console.log(`   Live data received: ${!!liveResponse6.data}`);
      console.log(`   Data keys: ${Object.keys(liveResponse6.data).join(', ')}`);
      
      if (liveResponse6.data.elements) {
        console.log(`   Elements count: ${liveResponse6.data.elements.length}`);
        
        // Check if any teams have non-zero points
        const teamsWithPoints = liveResponse6.data.elements.filter(team => 
          team.stats && team.stats.total_points > 0
        );
        console.log(`   Teams with points > 0: ${teamsWithPoints.length}`);
        
        if (teamsWithPoints.length > 0) {
          console.log(`   Sample teams with points:`);
          teamsWithPoints.slice(0, 3).forEach(team => {
            console.log(`     Team ${team.id}: ${team.stats.total_points} points`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Error getting GW6 live data: ${error.message}`);
    }

    // Check fixtures for GW6
    console.log(`\n⚽ Fixtures for GW6:`);
    try {
      const fixturesResponse = await axios.get(`${baseURL}/fixtures/?event=6`);
      console.log(`   Fixtures count: ${fixturesResponse.data.length}`);
      
      if (fixturesResponse.data.length > 0) {
        const firstFixture = fixturesResponse.data[0];
        console.log(`   First fixture:`);
        console.log(`     Kickoff: ${firstFixture.kickoff_time}`);
        console.log(`     Started: ${firstFixture.started}`);
        console.log(`     Finished: ${firstFixture.finished}`);
        console.log(`     Home: ${firstFixture.team_h} vs Away: ${firstFixture.team_a}`);
      }
    } catch (error) {
      console.log(`   ❌ Error getting fixtures: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error.message);
  }
}

debugFPLAPI()
  .then(() => {
    console.log('\n✨ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error);
    process.exit(1);
  });

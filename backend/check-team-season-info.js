// File: fpl-hub-backend/check-team-season-info.js
// Check what season/gameweek your team IDs are from

const axios = require('axios');

async function checkTeamSeasonInfo() {
  console.log('🔍 Checking season/gameweek info for your team IDs...');

  try {
    // Your actual team IDs
    const yourTeamIds = [1245789, 200001, 100003, 1147863, 100005, 100004, 100001, 100009, 417303, 1245886, 100002, 225889, 111477, 7653676];
    
    // Check a few of your team IDs
    const testIds = yourTeamIds.slice(0, 3);
    
    for (const teamId of testIds) {
      console.log(`\n📊 Checking Team ${teamId}:`);
      
      try {
        // Try to get team info from FPL API
        const teamResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/`);
        console.log(`   ✅ Team found in FPL API`);
        console.log(`   Name: ${teamResponse.data.name}`);
        console.log(`   Player first name: ${teamResponse.data.player_first_name}`);
        console.log(`   Player last name: ${teamResponse.data.player_last_name}`);
        console.log(`   Region: ${teamResponse.data.player_region_name}`);
        console.log(`   Started: ${teamResponse.data.started_event}`);
        console.log(`   Current event: ${teamResponse.data.current_event}`);
        
        // Check if team has any history
        try {
          const historyResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`);
          console.log(`   History entries: ${historyResponse.data.current.length}`);
          if (historyResponse.data.current.length > 0) {
            const latest = historyResponse.data.current[historyResponse.data.current.length - 1];
            console.log(`   Latest event: ${latest.event}`);
            console.log(`   Latest points: ${latest.points}`);
          }
        } catch (historyError) {
          console.log(`   ❌ No history available`);
        }
        
      } catch (error) {
        console.log(`   ❌ Team not found in FPL API: ${error.response?.status || error.message}`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check what the current FPL season structure looks like
    console.log(`\n📊 Current FPL Season Info:`);
    const bootstrapResponse = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    console.log(`   Current season: ${bootstrapResponse.data.game_settings.season_name}`);
    console.log(`   Current gameweek: ${bootstrapResponse.data.events.find(e => e.is_current)?.id}`);
    console.log(`   Total events: ${bootstrapResponse.data.events.length}`);

  } catch (error) {
    console.error('❌ Error checking team info:', error.message);
  }
}

checkTeamSeasonInfo()
  .then(() => {
    console.log('\n✨ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });

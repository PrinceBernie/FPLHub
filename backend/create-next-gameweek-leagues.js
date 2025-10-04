// Manually create leagues for next gameweek
const AutomaticLeagueService = require('./src/services/automaticLeagueService');

async function createNextGameweekLeagues() {
  try {
    console.log('🚀 Manually creating leagues for next gameweek...');
    
    const result = await AutomaticLeagueService.createNextGameweekLeagues();
    
    console.log('✅ Result:', result);
    
    if (result.success) {
      console.log('🎉 Successfully created leagues for next gameweek!');
      console.log(`📊 Created ${result.data.length} leagues:`);
      result.data.forEach((league, index) => {
        console.log(`   ${index + 1}. ${league.name} (${league.type}) - Status: ${league.status}`);
      });
    } else {
      console.log('⚠️  League creation result:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error creating next gameweek leagues:', error);
  }
}

createNextGameweekLeagues();

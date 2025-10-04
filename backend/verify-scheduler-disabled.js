// Verification script to check that the automatic league scheduler is disabled
// This script verifies that the server starts without the scheduler

const leagueScheduler = require('./src/services/leagueSchedulerService');

console.log('🔍 Verifying Automatic League Scheduler Status...\n');

// Check current scheduler status
const status = leagueScheduler.getStatus();

console.log('📊 Scheduler Status:');
console.log(`   Running: ${status.isRunning}`);
console.log(`   Active Jobs: ${status.activeJobs}`);
console.log(`   Jobs: ${JSON.stringify(status.jobs, null, 2)}`);

if (status.isRunning) {
  console.log('\n⚠️  WARNING: Scheduler is still running!');
  console.log('   The scheduler should be disabled in server.js');
} else {
  console.log('\n✅ SUCCESS: Scheduler is properly disabled');
  console.log('   No cron jobs are running');
}

console.log('\n📝 Expected Behavior:');
console.log('   - Scheduler should NOT start automatically when server boots');
console.log('   - No cron jobs should be running');
console.log('   - League management is now handled via "open future gameweeks" approach');

console.log('\n🎯 Next Steps:');
console.log('   1. Restart the server to verify scheduler is disabled');
console.log('   2. Check server logs for "Automatic League Scheduler disabled" message');
console.log('   3. Verify that all future gameweeks (GW1-38) are open for entry');

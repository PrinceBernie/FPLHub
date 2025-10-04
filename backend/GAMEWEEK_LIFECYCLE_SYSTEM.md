# 🎯 **Gameweek League Lifecycle System**

> **Revolutionary replacement for the diabolical `deadline_time + 3 days` logic!**

## 🚀 **Overview**

The Gameweek League Lifecycle System implements **proper gameweek management** based on real FPL fixture data and official updates, replacing the arbitrary and inaccurate deadline-based logic.

## 🎮 **League Lifecycle States**

### **1. OPEN_FOR_ENTRY** 
- **Condition:** League stays open until the kickoff of the first fixture of that gameweek
- **Implementation:** Fetches fixtures from FPL API (`/fixtures?event={gw}`) and identifies the earliest `kickoff_time`
- **Entry Deadline:** `min(fixture.kickoff_time)`
- **After this time:** No new teams can join that week's league

### **2. IN_PROGRESS**
- **Condition:** Starts from the first kickoff until the last fixture ends
- **Implementation:** Polls FPL fixtures. If any fixture has status in `['in_progress','scheduled','postponed']`, the league remains in progress
- **Real-time Updates:** Live standings and scoring updates

### **3. WAITING_FOR_UPDATES**
- **Condition:** All fixtures in the gameweek are in a terminal state (`finished`/`awarded`), but FPL hasn't yet finalized player scores
- **Why needed:** After matches end, FPL usually takes 1–3 hours to process:
  - Bonus points allocation
  - Automatic substitutions  
  - Captaincy rules (including VC if C doesn't play)
- **Implementation:** After last fixture ends → enter `WAITING_FOR_UPDATES`

### **4. FINALIZED**
- **Condition:** 
  - No fixture remains unplayed in that event
  - Player points have stabilized for a configurable window (`stability_window`, default 60 minutes)
- **Implementation:** Mark league as finalized → payouts/standings locked
- **Safeguard:** If FPL retroactively adjusts points next day, log a correction + recalc

## 🏗️ **System Architecture**

### **Core Services:**

1. **`GameweekLifecycleService`** - Main lifecycle management
2. **`FPLService`** (Enhanced) - FPL API integration with fixture analysis
3. **Database Schema** - New league state fields and indexes

### **Key Features:**

- ✅ **Real Fixture-Based Logic** - Uses actual FPL fixture data
- ✅ **Points Stability Detection** - Monitors for FPL point changes
- ✅ **Configurable Stability Window** - Default 60 minutes, customizable per league
- ✅ **Postponed Fixture Handling** - Automatically handles fixture postponements
- ✅ **Retroactive Change Detection** - Monitors for late FPL point adjustments
- ✅ **Comprehensive Monitoring** - Real-time state tracking and updates

## 📊 **Database Schema Changes**

### **New League Fields:**
```sql
-- League state in the gameweek lifecycle
leagueState TEXT DEFAULT 'OPEN_FOR_ENTRY' CHECK (leagueState IN ('OPEN_FOR_ENTRY', 'IN_PROGRESS', 'WAITING_FOR_UPDATES', 'FINALIZED'))

-- When all fixtures finished (before points stabilization)  
softFinalizedAt DATETIME

-- When points stabilized and league was finalized
finalizedAt DATETIME

-- How long to wait for points stability (default 60 minutes)
stabilityWindowMinutes INTEGER DEFAULT 60

-- Last time we checked for points changes
lastPointsCheck DATETIME

-- Hash of player points to detect changes
pointsStabilityHash TEXT
```

### **Performance Indexes:**
```sql
CREATE INDEX "League_leagueState_idx" ON "League"("leagueState");
CREATE INDEX "League_startGameweek_leagueState_idx" ON "League"("startGameweek", "leagueState");
```

## 🔧 **API Endpoints**

### **League Status Management:**
```http
GET /api/gameweek-lifecycle/league/:leagueId/status
POST /api/gameweek-lifecycle/league/:leagueId/update-state
POST /api/gameweek-lifecycle/league/:leagueId/start-monitoring
POST /api/gameweek-lifecycle/league/:leagueId/stop-monitoring
```

### **Gameweek Management:**
```http
POST /api/gameweek-lifecycle/gameweek/:gameweekId/update-all
POST /api/gameweek-lifecycle/gameweek/:gameweekId/handle-postponed
GET /api/gameweek-lifecycle/gameweek/:gameweekId/entry-deadline
```

### **Entry Validation:**
```http
GET /api/gameweek-lifecycle/league/:leagueId/is-open-for-entry
POST /api/gameweek-lifecycle/league/:leagueId/check-retroactive
```

## 🎯 **Implementation Details**

### **State Transition Logic:**
```javascript
// 1. Check fixture statuses
const fixtureData = await fplService.getGameweekFixturesDetailed(gameweekId);

// 2. Determine state based on fixtures
if (now < fixtureData.earliestKickoff) {
  state = 'OPEN_FOR_ENTRY';
} else if (fixtureData.anyInProgress) {
  state = 'IN_PROGRESS';
} else if (fixtureData.allFinished) {
  // Check points stability
  const pointsStable = await checkPointsStability(gameweekId, league);
  state = pointsStable ? 'FINALIZED' : 'WAITING_FOR_UPDATES';
}
```

### **Points Stability Detection:**
```javascript
// 1. Get current live data
const liveData = await fplService.getLiveGameweekData(gameweekId);

// 2. Create hash of player points
const pointsHash = createPointsHash(liveData.elements);

// 3. Compare with stored hash
if (league.pointsStabilityHash === pointsHash) {
  // Check if enough time has passed
  const timeSinceLastCheck = now - league.lastPointsCheck;
  if (timeSinceLastCheck >= stabilityWindowMs) {
    return true; // Points are stable
  }
} else {
  // Points changed, reset stability check
  await updatePointsHash(leagueId, pointsHash);
}
```

## 🛡️ **Safeguards & Edge Cases**

### **Postponed Fixtures:**
- Automatically detects postponed fixtures
- Reloads fixture data and recalculates states
- Updates all affected leagues

### **Retroactive Point Changes:**
- Monitors finalized leagues for point changes
- Logs corrections when changes detected
- Triggers leaderboard recalculation

### **Error Handling:**
- Graceful fallbacks for FPL API failures
- Comprehensive error logging
- State consistency validation

## 🧪 **Testing**

### **Unit Tests Cover:**
- ✅ State transition logic
- ✅ Points stability detection
- ✅ Postponed fixture handling
- ✅ Retroactive change detection
- ✅ Edge cases and error scenarios

### **Test File:** `src/tests/gameweekLifecycle.test.js`

## 🚀 **Usage Examples**

### **Check if League is Open for Entry:**
```javascript
const gameweekLifecycleService = require('./services/gameweekLifecycleService');

const isOpen = await gameweekLifecycleService.isLeagueOpenForEntry(leagueId);
if (isOpen) {
  // Allow user to join league
} else {
  // Show "Entry closed" message
}
```

### **Update League State:**
```javascript
const result = await gameweekLifecycleService.updateLeagueState(leagueId);
console.log(`League state: ${result.currentState}`);
console.log(`Reason: ${result.stateReason}`);
```

### **Monitor Points Stability:**
```javascript
// Start monitoring for a league
await gameweekLifecycleService.startMonitoring(leagueId);

// Check for retroactive changes
const changes = await gameweekLifecycleService.checkForRetroactiveChanges(leagueId);
if (changes.retroactiveChanges) {
  console.log('Points changed after finalization!');
}
```

## 📈 **Performance Benefits**

### **Before (Diabolical Logic):**
- ❌ Arbitrary `deadline_time + 3 days`
- ❌ No real fixture awareness
- ❌ No points stability monitoring
- ❌ No postponed fixture handling

### **After (Proper Lifecycle):**
- ✅ Real fixture-based entry deadlines
- ✅ Accurate state transitions
- ✅ Points stability monitoring
- ✅ Comprehensive edge case handling
- ✅ Configurable stability windows
- ✅ Retroactive change detection

## 🔄 **Migration from Old System**

The system automatically migrates existing leagues:
```sql
UPDATE "League" 
SET "leagueState" = CASE 
  WHEN "status" = 'OPEN' THEN 'OPEN_FOR_ENTRY'
  WHEN "status" = 'IN_PROGRESS' THEN 'IN_PROGRESS'  
  WHEN "status" = 'COMPLETED' THEN 'FINALIZED'
  ELSE 'OPEN_FOR_ENTRY'
END;
```

## 🎉 **Result**

**No more diabolical logic!** The system now properly manages gameweek lifecycles based on real FPL data, ensuring accurate entry deadlines, proper state transitions, and comprehensive monitoring of the entire gameweek lifecycle.

---

*"Finally, a system that makes sense!"* 🎯

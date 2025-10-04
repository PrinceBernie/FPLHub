# 🎯 **Complete Gameweek Lifecycle Flow**

> **From Entry to Payout - The Complete Journey**

## 🚀 **Overview**

This document explains the complete flow from when a user joins a league to when they receive their payout, including all the state transitions and wallet updates.

## 📋 **Complete Flow Breakdown**

### **1. League Entry Phase** 
**State: `OPEN_FOR_ENTRY`**

- ✅ **Entry Deadline**: Based on first fixture kickoff time (not arbitrary deadline + 3 days)
- ✅ **User Joins**: Payment processed via bonus wallet → main wallet
- ✅ **League Entry Created**: User appears in "My Entries" tab
- ✅ **Leaderboard Initialized**: All teams show rank 1, points 0

### **2. League Active Phase**
**State: `IN_PROGRESS`**

- ✅ **First Fixture Starts**: League automatically transitions to `IN_PROGRESS`
- ✅ **Live Updates**: Real-time standings updates via WebSocket
- ✅ **Points Calculation**: Live FPL points fetched and calculated
- ✅ **Rankings Updated**: Leaderboard updates in real-time

### **3. Waiting for Finalization**
**State: `WAITING_FOR_UPDATES`**

- ✅ **All Fixtures Finished**: League transitions to `WAITING_FOR_UPDATES`
- ✅ **Points Stability Check**: Monitors FPL for final point adjustments
- ✅ **Stability Window**: Waits 60 minutes (configurable) for points to stabilize
- ✅ **Bonus Points Processing**: FPL processes bonus points, auto-subs, captaincy

### **4. League Finalization**
**State: `FINALIZED`**

- ✅ **Points Stabilized**: No changes detected for stability window
- ✅ **League Status Updated**: `status` field set to `'COMPLETED'`
- ✅ **Final Leaderboard**: Final rankings calculated and stored
- ✅ **Automatic Payouts**: Prize money distributed to winners' wallets

### **5. Post-Finalization**
**State: `FINALIZED` (Persistent)**

- ✅ **UI Transition**: League moves from "My Entries" to "Finished Games"
- ✅ **Leaderboard Available**: Standings remain accessible for viewing
- ✅ **Wallet Updated**: Winners receive prize money in real-time
- ✅ **Current Flag**: Moves to next gameweek leagues

## 💰 **Payout Processing**

### **Automatic Payout Distribution:**

```javascript
// When league reaches FINALIZED state:
if (league.type === 'PAID' && league.totalPrizePool > 0) {
  await this.processLeaguePayouts(leagueId);
}
```

### **Payout Structure (Default):**
- 🥇 **1st Place**: 50% of prize pool
- 🥈 **2nd Place**: 30% of prize pool  
- 🥉 **3rd Place**: 20% of prize pool

### **Wallet Updates:**
```javascript
await walletService.addPrizeMoney(
  userId,
  amount,
  leagueId,
  `Prize for ${rank}${ordinal} place in ${league.name}`
);
```

## 🎮 **Frontend UI Flow**

### **"My Entries" Tab:**
- Shows leagues with `status === 'active'`
- Real-time standings updates
- Live points and rankings
- Entry deadline countdown

### **"Finished Games" Tab:**
- Shows leagues with `status === 'COMPLETED'`
- Final standings and rankings
- Prize money received
- Historical performance

### **Collapse/Expand Layout:**
- ✅ **Current Leagues**: Expandable with live data
- ✅ **Ended Leagues**: Expandable with final results
- ✅ **Same Layout**: Consistent UI experience

## 🔄 **State Transition Timeline**

```
User Joins League
       ↓
OPEN_FOR_ENTRY (Entry open until first fixture)
       ↓
First Fixture Kicks Off
       ↓
IN_PROGRESS (Live updates, real-time standings)
       ↓
All Fixtures Finished
       ↓
WAITING_FOR_UPDATES (Points stabilization)
       ↓
Points Stable for 60 minutes
       ↓
FINALIZED (Payouts processed, status = COMPLETED)
       ↓
UI: "My Entries" → "Finished Games"
```

## 🛡️ **Safeguards & Edge Cases**

### **Postponed Fixtures:**
- ✅ Automatically detected and handled
- ✅ League state recalculated
- ✅ Entry deadlines adjusted

### **Retroactive Point Changes:**
- ✅ Monitored after finalization
- ✅ Leaderboard recalculated if needed
- ✅ Payouts adjusted if necessary

### **Payment Failures:**
- ✅ Individual payout failures don't stop others
- ✅ Comprehensive error logging
- ✅ Manual payout processing available

## 📊 **Real-time Updates**

### **WebSocket Broadcasting:**
- ✅ Live standings updates during `IN_PROGRESS`
- ✅ State change notifications
- ✅ Wallet balance updates
- ✅ Payout notifications

### **API Endpoints:**
```http
GET  /api/gameweek-lifecycle/league/:leagueId/status
POST /api/gameweek-lifecycle/league/:leagueId/update-state
POST /api/gameweek-lifecycle/league/:leagueId/process-payouts
```

## 🎯 **Key Benefits**

### **Before (Diabolical Logic):**
- ❌ Arbitrary `deadline_time + 3 days`
- ❌ No automatic payouts
- ❌ Manual league management
- ❌ Inaccurate entry deadlines

### **After (Proper Lifecycle):**
- ✅ **Real fixture-based deadlines**
- ✅ **Automatic payout processing**
- ✅ **Real-time wallet updates**
- ✅ **Proper state management**
- ✅ **Comprehensive monitoring**
- ✅ **Seamless UI transitions**

## 🚀 **Result**

**Perfect Gameweek Lifecycle Management!** 🎉

1. ✅ **Users join leagues** until first fixture kicks off
2. ✅ **Live updates** during gameweek progression  
3. ✅ **Automatic finalization** when points stabilize
4. ✅ **Real-time payouts** to winners' wallets
5. ✅ **Seamless UI transition** from "My Entries" to "Finished Games"
6. ✅ **Persistent leaderboards** for historical viewing
7. ✅ **Current flag** moves to next gameweek

The system now provides a **complete, automated, and accurate** gameweek lifecycle from entry to payout! 🎯

---

*"From chaos to perfection!"* ✨

# 🤖 Automatic League Management System

> **⚠️ DEPRECATED:** This automatic league management system has been **DISABLED** and replaced with the **"Open All Future Gameweeks"** approach. All gameweeks (GW1-38) are now created and open for entry immediately, providing a better user experience.

## Overview

~~The FPL Hub now features a fully automated league management system that creates **Gameweek Champions** and **Free2Play** leagues for the next gameweek immediately when the current gameweek starts, but locks them for entry until the current gameweek ends.~~

**NEW APPROACH:** All future gameweeks (GW1-38) are created and open for entry, allowing users to join any gameweek league at any time.

## 🎯 Business Logic

### **Automatic Creation Timing:**
- **When:** As soon as a new gameweek starts (e.g., GW4 starts at 11:30am)
- **What:** Creates leagues for the **next** gameweek (e.g., GW5 leagues)
- **Status:** Leagues are created in **LOCKED** status

### **Entry Unlocking:**
- **When:** When the current gameweek ends (3 days after deadline)
- **What:** Changes league status from **LOCKED** to **OPEN**
- **Result:** Users can now join the leagues

### **Example Timeline:**
```
GW4 starts (11:30am) → GW5 leagues created (LOCKED)
GW4 ends (3 days later) → GW5 leagues unlocked (OPEN)
```

## 🏗️ System Architecture

### **Core Services:**

1. **`AutomaticLeagueService`** - Main logic for league management
2. **`LeagueSchedulerService`** - Automated scheduling and monitoring
3. **`FPLService`** - FPL API integration for gameweek data

### **Key Features:**

- ✅ **Automatic Detection** - Monitors FPL API for gameweek changes
- ✅ **Smart Creation** - Creates leagues for next gameweek only
- ✅ **Entry Locking** - Prevents premature entries until current GW ends
- ✅ **Season Management** - Uses proper dual-year format (2025/26)
- ✅ **Duplicate Prevention** - Won't create leagues that already exist
- ✅ **Admin Integration** - Uses Super Admin for league creation

## 📅 Season Format

### **Current Implementation:**
- **Database Storage:** Integer format (e.g., `2025`)
- **Display Format:** Dual-year format (e.g., `2025/26`)
- **Logic:** August-December = current year, January-July = previous year

### **Examples:**
```javascript
// September 2025
getCurrentSeason() // Returns: 2025
getCurrentSeasonFormatted() // Returns: "2025/26"

// February 2025  
getCurrentSeason() // Returns: 2024
getCurrentSeasonFormatted() // Returns: "2024/25"
```

## 🔄 Automatic Scheduler

### **Scheduling Patterns:**

1. **Hourly Checks** - Every hour for general monitoring
2. **Peak Hours** - Every 30 minutes (8 AM - 10 PM UTC)
3. **Deadline Days** - Every 15 minutes on Fridays (10 AM - 12 PM UTC)

### **Scheduler Status:**
```http
GET /api/admin/leagues/scheduler/status
Authorization: Bearer <super_admin_token>
```

## 🎮 League Creation Process

### **What Gets Created:**

#### **Gameweek Champions (Paid League):**
```json
{
  "name": "Gameweek 5 Champions",
  "type": "PAID",
  "entryType": "PAID", 
  "entryFee": 10.00,
  "maxTeams": 10000,
  "status": "LOCKED",
  "platformFee": 0.50,
  "platformFeeType": "PERCENTAGE",
  "platformFeeValue": 5.0,
  "leagueCode": "GW5CHAMP2025"
}
```

#### **Free2Play League:**
```json
{
  "name": "Gameweek 5 Free2Play",
  "type": "FREE",
  "entryType": "FREE",
  "entryFee": 0.00,
  "maxTeams": 10000,
  "status": "LOCKED", 
  "platformFee": 0,
  "platformFeeType": "PERCENTAGE",
  "platformFeeValue": 0.0,
  "leagueCode": "GW5FREE2025"
}
```

## 🔧 API Endpoints

### **Automatic League Management:**

#### **Create Next Gameweek Leagues:**
```http
POST /api/admin/leagues/auto/create-next
Authorization: Bearer <admin_token>
```

#### **Unlock Leagues for Entry:**
```http
POST /api/admin/leagues/auto/unlock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "forceUnlock": false
}
```

#### **Manually Unlock Specific Gameweek (Super Admin Only):**
```http
POST /api/admin/leagues/auto/unlock-gameweek/4
Authorization: Bearer <super_admin_token>
```

#### **Process Automatic Management:**
```http
POST /api/admin/leagues/auto/process
Authorization: Bearer <admin_token>
```

#### **Get League Status:**
```http
GET /api/admin/leagues/auto/status?gameweek=5
Authorization: Bearer <admin_token>
```

### **Scheduler Management (Super Admin Only):**

#### **Start Scheduler:**
```http
POST /api/admin/leagues/scheduler/start
Authorization: Bearer <super_admin_token>
```

#### **Stop Scheduler:**
```http
POST /api/admin/leagues/scheduler/stop
Authorization: Bearer <super_admin_token>
```

#### **Get Scheduler Status:**
```http
GET /api/admin/leagues/scheduler/status
Authorization: Bearer <super_admin_token>
```

#### **Manual Trigger:**
```http
POST /api/admin/leagues/scheduler/trigger
Authorization: Bearer <super_admin_token>
```

## 🚀 Server Integration

### **Automatic Startup:**
The scheduler automatically starts when the server boots:

```javascript
// In server.js
const leagueScheduler = require('./src/services/leagueSchedulerService');
leagueScheduler.start();
console.log('🤖 Automatic League Scheduler started');
```

### **Server Logs:**
```
🚀 FPL Hub API Server Started Successfully!
🤖 Automatic League Scheduler started
📅 Scheduled jobs:
   - Hourly checks: Every hour
   - Peak hours: Every 30 minutes (8 AM - 10 PM UTC)
   - Deadline days: Every 15 minutes (Fridays 10 AM - 12 PM UTC)
```

## 📊 Monitoring & Status

### **League Status Response:**
```json
{
  "success": true,
  "data": {
    "gameweek": 5,
    "season": 2025,
    "leagues": [
      {
        "id": "league-uuid",
        "name": "Gameweek 5 Champions",
        "type": "PAID",
        "status": "LOCKED",
        "entryFee": 10.00,
        "maxTeams": 10000,
        "currentEntries": 0,
        "availableSpots": 10000
      }
    ]
  }
}
```

### **Scheduler Status Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "activeJobs": 3,
    "jobs": [
      {"id": 0, "running": true},
      {"id": 1, "running": true},
      {"id": 2, "running": true}
    ]
  }
}
```

## 🔍 Troubleshooting

### **Common Issues:**

#### **"No Super Admin found to create leagues"**
- **Cause:** No Super Admin user exists
- **Solution:** Run `node create-super-admin.js`

#### **"Leagues already exist for Gameweek X"**
- **Cause:** Leagues already created for that gameweek
- **Solution:** Check existing leagues or wait for next gameweek

#### **"No locked leagues found to unlock"**
- **Cause:** No leagues in LOCKED status
- **Solution:** Normal behavior if no leagues need unlocking

#### **"Failed to get current gameweek"**
- **Cause:** FPL API connection issue
- **Solution:** Check network connectivity and FPL API status

### **Manual Override:**
If automatic system fails, admins can manually:
1. Create leagues: `POST /api/admin/leagues/auto/create-next`
2. Unlock leagues: `POST /api/admin/leagues/auto/unlock`
3. Trigger process: `POST /api/admin/leagues/auto/process`

### **Super Admin Override:**
Super Admins have additional privileges:
1. **Force unlock any gameweek:** `POST /api/admin/leagues/auto/unlock-gameweek/{gameweekId}`
2. **Force unlock with override:** `POST /api/admin/leagues/auto/unlock` with `{"forceUnlock": true}`
3. **Bypass automatic timing:** Can unlock leagues even before current gameweek ends

## 🎯 Business Benefits

### **For Users:**
- ✅ **Predictable Schedule** - Leagues always available for next gameweek
- ✅ **Fair Entry** - No early bird advantage, everyone enters after current GW ends
- ✅ **Consistent Experience** - Same process every gameweek

### **For Admins:**
- ✅ **Zero Manual Work** - Fully automated league creation
- ✅ **Reliable Timing** - Leagues created exactly when needed
- ✅ **Proper Status Management** - Automatic locking/unlocking
- ✅ **Season Management** - Correct season format handling

### **For Super Admins:**
- ✅ **Emergency Override** - Can unlock leagues before automatic timing
- ✅ **Flexible Control** - Manual unlock for specific gameweeks
- ✅ **Audit Trail** - All manual actions are logged
- ✅ **Business Continuity** - Can handle unexpected situations

### **For System:**
- ✅ **Scalable** - Handles any number of gameweeks
- ✅ **Robust** - Duplicate prevention and error handling
- ✅ **Monitorable** - Full status and logging capabilities
- ✅ **Flexible** - Manual override options available

## 🚀 Production Deployment

### **Prerequisites:**
1. ✅ Super Admin user created
2. ✅ Database schema updated (LOCKED status added)
3. ✅ node-cron dependency installed
4. ✅ Server configured with automatic startup

### **Verification Steps:**
1. Check scheduler status: `GET /api/admin/leagues/scheduler/status`
2. Test manual creation: `POST /api/admin/leagues/auto/create-next`
3. Monitor server logs for automatic activity
4. Verify league status: `GET /api/admin/leagues/auto/status`

---

**The Automatic League Management System is now fully operational and ready for production!** 🎉

**Key Achievement:** Gameweek Champions and Free2Play leagues are automatically created for the next gameweek when the current gameweek starts, but remain locked for entry until the current gameweek ends - exactly as requested!

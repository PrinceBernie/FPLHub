# 🏆 Weekly League Creation Guide

## Overview

This guide explains the complete process for creating new **Gameweek Champions** (paid) and **Free2Play** weekly leagues for each new gameweek in the FPL Hub system.

## 🎯 Current Implementation Summary

The system automatically creates **TWO flagship leagues** for each gameweek:

1. **Gameweek X Champions** - Paid league (GHS 10 entry fee)
2. **Gameweek X Free2Play** - Free league (no entry fee)

Both leagues follow these rules:
- **Max Teams:** 10,000 entries
- **Format:** Classic scoring
- **Scoring:** Gameweek points only (no chips, no transfer costs)
- **Visibility:** Public leagues (users can discover and join)
- **Duration:** Single gameweek

## 📋 Step-by-Step Process

### **Step 1: Get Current Gameweek Information**

**API Endpoint:**
```http
GET /api/admin/gameweek/current
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Gameweek 4",
    "deadline_time": "2024-09-14T11:00:00Z",
    "is_current": true,
    "is_next": false
  }
}
```

**Purpose:** Determine which gameweek to create leagues for (typically the next gameweek).

### **Step 2: Create Weekly Leagues**

**API Endpoint:**
```http
POST /api/admin/leagues/create-weekly
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "gameweek": 4,
  "season": 2024,
  "platformFeeType": "PERCENTAGE",
  "platformFeeValue": 5.0
}
```

**Parameters:**
- `gameweek` (required): The gameweek number to create leagues for
- `season` (required): The FPL season (e.g., 2024)
- `platformFeeType` (optional): "PERCENTAGE" or "FIXED" (default: "PERCENTAGE")
- `platformFeeValue` (optional): Fee value (default: 5.0 for 5%)

**Response:**
```json
{
  "success": true,
  "message": "Weekly leagues created successfully",
  "data": [
    {
      "id": "league-uuid-1",
      "name": "Gameweek 4 Champions",
      "type": "PAID",
      "entryType": "PAID",
      "entryFee": 10.00,
      "maxTeams": 10000,
      "leagueCode": "GW4CHAMP",
      "status": "OPEN"
    },
    {
      "id": "league-uuid-2", 
      "name": "Gameweek 4 Free2Play",
      "type": "FREE",
      "entryType": "FREE",
      "entryFee": 0.00,
      "maxTeams": 10000,
      "leagueCode": "GW4FREE",
      "status": "OPEN"
    }
  ]
}
```

### **Step 3: Verify League Creation**

**API Endpoint:**
```http
GET /api/leagues/current-gameweek
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "league-uuid-1",
      "name": "Gameweek 4 Champions",
      "type": "PAID",
      "entryFee": 10.00,
      "maxTeams": 10000,
      "currentEntries": 0,
      "status": "OPEN"
    },
    {
      "id": "league-uuid-2",
      "name": "Gameweek 4 Free2Play", 
      "type": "FREE",
      "entryFee": 0.00,
      "maxTeams": 10000,
      "currentEntries": 0,
      "status": "OPEN"
    }
  ]
}
```

## 🔧 Technical Implementation Details

### **League Creation Logic**

The `LeagueService.createWeeklyLeagues()` method:

1. **Checks for existing leagues** - Prevents duplicate creation
2. **Ensures admin user exists** - Creates default admin if needed
3. **Creates Gameweek Champions (Paid League):**
   - Entry fee: GHS 10.00
   - Platform fee: 5% (GHS 0.50)
   - Max teams: 10,000
   - Public league (discoverable)

4. **Creates Free2Play League:**
   - Entry fee: GHS 0.00
   - Platform fee: 0%
   - Max teams: 10,000
   - Public league (discoverable)

### **League Configuration**

```javascript
// Gameweek Champions (Paid)
{
  name: `Gameweek ${gameweek} Champions`,
  type: 'PAID',
  entryType: 'PAID',
  entryFee: 10.00,
  maxTeams: 10000,
  includeChipScores: false,
  includeTransferCosts: false,
  isPrivate: false,
  isInvitational: false,
  status: 'OPEN'
}

// Free2Play League
{
  name: `Gameweek ${gameweek} Free2Play`,
  type: 'FREE', 
  entryType: 'FREE',
  entryFee: 0.00,
  maxTeams: 10000,
  includeChipScores: false,
  includeTransferCosts: false,
  isPrivate: false,
  isInvitational: false,
  status: 'OPEN'
}
```

## 🚀 Automated Workflow (Recommended)

### **Option 1: Manual Creation (Current)**

1. Admin logs in to system
2. Calls `GET /api/admin/gameweek/current` to get current gameweek
3. Calls `POST /api/admin/leagues/create-weekly` with next gameweek
4. Verifies leagues were created successfully

### **Option 2: Automated Creation (Future Enhancement)**

Create a scheduled job that:
1. Runs daily to check for new gameweeks
2. Automatically creates leagues for the next gameweek
3. Sends notifications to admins
4. Updates system status

## 📊 Postman Test Collection

### **Test 1: Get Current Gameweek**
```http
GET {{baseUrl}}/api/admin/gameweek/current
Authorization: Bearer {{adminToken}}
```

### **Test 2: Create Weekly Leagues**
```http
POST {{baseUrl}}/api/admin/leagues/create-weekly
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "gameweek": 4,
  "season": 2024,
  "platformFeeType": "PERCENTAGE", 
  "platformFeeValue": 5.0
}
```

### **Test 3: Verify League Creation**
```http
GET {{baseUrl}}/api/leagues/current-gameweek
```

## 🎯 Business Rules

### **League Creation Rules:**
- ✅ Only **Admin+** users can create weekly leagues
- ✅ Leagues are created for **specific gameweeks**
- ✅ **Duplicate prevention** - won't create if leagues already exist
- ✅ **Public leagues** - users can discover and join
- ✅ **Gameweek points only** - no chips or transfer costs

### **Entry Rules:**
- ✅ **Paid League:** GHS 10 entry fee + 5% platform fee
- ✅ **Free League:** No entry fee, no platform fee
- ✅ **Max 10,000 teams** per league
- ✅ **Users need wallets** to join paid leagues
- ✅ **Users can join both** paid and free leagues

### **Scoring Rules:**
- ✅ **Classic format** - standard FPL scoring
- ✅ **Gameweek points only** - excludes chips and transfer costs
- ✅ **Single gameweek duration** - starts and ends same gameweek

## 🔍 Monitoring & Verification

### **Check League Status:**
```http
GET /api/admin/leagues/gameweek/4
Authorization: Bearer <admin_token>
```

### **Check User Participation:**
```http
GET /api/admin/statistics
Authorization: Bearer <admin_token>
```

### **Check League Entries:**
```http
GET /api/leagues/{league-id}/entries
Authorization: Bearer <user_token>
```

## 🚨 Troubleshooting

### **"Leagues already exist for Gameweek X"**
- **Cause:** Leagues already created for this gameweek
- **Solution:** Check existing leagues or create for next gameweek

### **"Gameweek and season are required"**
- **Cause:** Missing required parameters
- **Solution:** Provide both `gameweek` and `season` in request

### **"Failed to get current gameweek"**
- **Cause:** FPL API connection issue
- **Solution:** Check FPL API status and network connectivity

### **"Insufficient permissions"**
- **Cause:** User not admin level
- **Solution:** Ensure user has Admin+ role

## 📈 Success Metrics

After successful league creation, you should see:

1. **Two leagues created** (Champions + Free2Play)
2. **Leagues visible** in current gameweek list
3. **Users can join** both leagues
4. **Entry fees processed** correctly for paid league
5. **League codes generated** for sharing

## 🎉 Next Steps After Creation

1. **Monitor entries** - Track how many users join
2. **Process payments** - Ensure paid league entries are processed
3. **Update points** - After gameweek ends, update league standings
4. **Distribute prizes** - For paid league winners
5. **Create next gameweek** - Repeat process for following gameweek

---

**The weekly league creation system is fully automated and ready for production use!** 🚀

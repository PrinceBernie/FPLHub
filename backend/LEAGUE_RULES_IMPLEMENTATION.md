# 🏆 League Rules Implementation

## 📋 Overview

This document outlines the comprehensive league rules that have been implemented in the FPL Hub system based on the specified requirements.

## 🎯 Implemented Rules

### **1. League Join/Leave Restrictions**

#### **Paid Leagues:**
- ✅ **Join Only** - Users can join paid leagues
- ❌ **No Leave Option** - Users CANNOT leave paid leagues once joined
- 🔒 **No Exit Options** - Absolutely no way to exit paid leagues

#### **Free Leagues:**
- ✅ **Join** - Users can join free leagues
- ✅ **Leave** - Users can leave free leagues
- 🔄 **Full Control** - Users have complete control over their participation

### **2. League Privacy & Visibility Rules**

#### **User-Created Leagues:**
- 🔒 **Must be Private** - All user-created leagues are private
- 🔒 **Must be Invitational** - All user-created leagues require league codes
- 🚫 **No Public Option** - Users cannot create public leagues

#### **Admin-Created Leagues:**
- 🌐 **Can be Public** - Admins can create public leagues
- 🔒 **Can be Private** - Admins can create private leagues
- 🎛️ **Full Control** - Admins have complete control over league visibility

### **3. Flagship League Settings**

#### **Gameweek Champions & Free2Play:**
- 📊 **Scoring System** - Pure gameweek points only
- 🚫 **No Chip Scores** - Chip points do not apply
- 🚫 **No Transfer Costs** - Transfer costs do not apply
- 👥 **Max Entries** - 10,000 teams maximum
- 🏆 **Admin Created** - Only admins can create flagship leagues

### **4. League Size Limits**

#### **User-Created Leagues:**
- 👥 **Max Teams** - 2 to 400 teams
- 💰 **Entry Fee** - GHS 10 to GHS 50
- 🔒 **Always Paid** - User leagues must be paid leagues

#### **Admin-Created Leagues:**
- 👥 **Max Teams** - 2 to 10,000 teams
- 💰 **Entry Fee** - Any amount (including free)
- 🎛️ **Full Control** - Admins can create any type of league

## 🛠️ Technical Implementation

### **Database Changes**

#### **League Entry Model:**
```prisma
model LeagueEntry {
  id        String   @id @default(uuid())
  leagueId  String
  linkedTeamId String
  userId    String
  canLeave  Boolean  @default(false)  // NEW: Controls leave ability
  isActive  Boolean  @default(true)
  // ... other fields
}
```

#### **League Model:**
```prisma
model League {
  id                   String        @id @default(uuid())
  name                 String
  type                 LeagueType    // PAID or FREE
  leagueFormat         LeagueFormat  // CLASSIC, HEAD_TO_HEAD
  creatorId            String
  entryType            EntryType     // FREE or PAID
  entryFee             Float         @default(0)
  maxTeams             Int           @default(400)
  includeChipScores    Boolean       @default(false)
  includeTransferCosts Boolean       @default(false)
  isPrivate            Boolean       @default(true)
  isInvitational       Boolean       @default(true)
  // ... other fields
}
```

### **Business Logic Implementation**

#### **1. Join League Logic:**
```javascript
// RULE: Users can only leave FREE leagues, NEVER paid leagues
const canLeave = league.entryType === 'FREE';

const entry = await prisma.leagueEntry.create({
  data: {
    leagueId,
    linkedTeamId,
    userId,
    canLeave: canLeave  // Set based on league type
  }
});
```

#### **2. Leave League Logic:**
```javascript
// RULE: Users can ONLY leave FREE leagues, NEVER paid leagues
if (entry.league.entryType === 'PAID') {
  throw new Error('Cannot leave paid leagues. No exit options available.');
}

// Additional check: ensure the entry was marked as leaveable
if (!entry.canLeave) {
  throw new Error('This league entry does not allow leaving');
}
```

#### **3. League Creation Validation:**
```javascript
// Check if user is admin
const isAdmin = user?.isAdmin || user?.adminLevel === 'ADMIN' || user?.adminLevel === 'SUPER_ADMIN';

// RULE: Non-admin users can only create private/invitational leagues
if (!isAdmin && (leagueData.isPrivate === false || leagueData.isInvitational === false)) {
  throw new Error('User-created leagues must be private and invitational. Only admins can create public leagues.');
}

// Validate max teams based on user role
const maxLimit = isAdmin ? 10000 : 400; // Admin can create up to 10,000, users up to 400
```

#### **4. Flagship League Creation:**
```javascript
// Create Gameweek Champions (Paid League)
const championsLeague = await prisma.league.create({
  data: {
    name: `Gameweek ${gameweek} Champions`,
    type: 'PAID',
    entryType: 'PAID',
    entryFee: 10.00,
    maxTeams: 10000, // RULE: Max 10,000 entries for flagship leagues
    includeChipScores: false, // RULE: No chip scores for flagship leagues
    includeTransferCosts: false, // RULE: No transfer costs for flagship leagues
    isPrivate: false, // RULE: Admin can create public leagues
    isInvitational: false, // RULE: Admin can create public leagues
    description: `Weekly paid league for Gameweek ${gameweek} - Gameweek points only, no chips or transfer costs`
  }
});
```

## 🧪 Testing

### **Test Coverage:**
- ✅ Paid leagues: Join only, no leave option
- ✅ Free leagues: Can join and leave
- ✅ User-created leagues: Must be private/invitational
- ✅ Admin-created leagues: Can be public
- ✅ Flagship leagues: Max 10,000 entries, gameweek points only
- ✅ User league limits: Max 400 teams
- ✅ Admin league limits: Max 10,000 teams

### **Run Tests:**
```bash
cd fpl-hub-backend
node test-league-rules.js
```

## 📊 League Categories

### **1. Flagship Leagues (Admin Only)**
- **Gameweek Champions** - Paid, public, 10,000 max, gameweek points only
- **Free2Play** - Free, public, 10,000 max, gameweek points only

### **2. User-Created Leagues**
- **Private Invitational** - Paid, private, 2-400 max, requires league code
- **Standard Rules** - Users can set standard scoring rules (chips, transfers)

### **3. Admin-Created Leagues**
- **Public Leagues** - Can be public or private, any size, any rules
- **Flagship Leagues** - Admin can create flagship leagues

## 🔒 Security & Validation

### **User Role Validation:**
- **Regular Users** - Limited to private leagues, 400 max teams
- **Admin Users** - Full control, can create public leagues, 10,000 max teams
- **Super Admin** - Complete system control

### **League Code System:**
- **Unique Codes** - Each league gets a unique join code
- **Invitational Only** - Private leagues require codes to join
- **Public Access** - Public leagues don't require codes

### **Payment Integration:**
- **Smart Payment** - Uses bonus wallet first, then main wallet
- **No Refunds** - Paid league entries are non-refundable
- **Transaction Tracking** - Complete audit trail for all payments

## 🎯 Business Impact

### **User Experience:**
- **Clear Rules** - Users understand league restrictions upfront
- **No Surprises** - Paid leagues clearly marked as non-leaveable
- **Flexible Options** - Users can create private leagues with friends

### **Revenue Protection:**
- **No Exit Scams** - Users cannot leave paid leagues after joining
- **Guaranteed Participation** - All paid league entries are committed
- **Platform Fees** - Consistent revenue from paid leagues

### **Scalability:**
- **Large Flagship Leagues** - Support for 10,000 participants
- **Efficient Management** - Clear rules reduce support requests
- **Admin Control** - Admins can create leagues as needed

## 📈 Future Enhancements

### **Potential Additions:**
- **League Templates** - Pre-configured league types
- **Bulk League Creation** - Admin tools for mass league creation
- **League Analytics** - Performance metrics and insights
- **Standard Scoring** - Standard scoring rule configurations

---

**✅ All league rules have been successfully implemented and tested!**

The system now enforces all specified requirements:
1. **Paid leagues: Join only, no leave option**
2. **User-created leagues: Must be private/invitational**
3. **Flagship leagues: Gameweek points only, max 10,000 entries**
4. **Admin privileges: Can create public leagues**
5. **Size limits: Users 400 max, Admins 10,000 max**

# FPL Hub API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "confirmPassword": "password123",
  "phone": "501234567", // 9 digits only (will be formatted as +233501234567)
  "consentGiven": true // Must be true to agree to Terms & Conditions
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your phone number with OTP to complete registration.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "phone": "+233501234567",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "requiresVerification": true,
    "message": "Check your phone for OTP to complete registration"
  }
}
```

**Note:** After registration, users must verify their phone number with OTP before they can log in.

### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": false // Optional: true for 30-day session, false for 24-hour session
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "phone": "+233501234567",
      "isVerified": true
    },
    "sessionInfo": {
      "currentSessions": 2,
      "maxSessions": 5,
      "rememberMe": false
    }
  }
}
```

**Response (Phone Not Verified):**
```json
{
  "success": false,
  "error": "Phone number not verified. Please verify your phone number with OTP before logging in.",
  "requiresVerification": true,
  "userId": "uuid"
}
```

**Note:** Users cannot log in until their phone number is verified with OTP.

### Get Current User
```http
GET /auth/me
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "phone": "+233123456789",
    "fplTeamId": 123456,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "teams": []
  }
}
```

### Verify OTP
```http
POST /auth/verify-otp
```

**Request Body:**
```json
{
  "phone": "+233501234567",
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number verified successfully! You can now log in to your account.",
  "data": {
    "verified": true,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "phone": "+233501234567",
      "isVerified": true
    }
  }
}
```

### Send OTP
```http
POST /auth/send-otp
```

**Request Body:**
```json
{
  "phone": "+233501234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": { 
    "phone": "+233501234567",
    "expiresIn": "5 minutes"
  }
}
```

### Resend OTP (by User ID)
```http
POST /auth/resend-otp
```

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": { 
    "phone": "+233501234567",
    "expiresIn": "5 minutes"
  }
}
```

### Check Verification Status
```http
GET /auth/verification-status/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isVerified": false,
    "email": "user@example.com",
    "message": "User is not verified"
  }
}
```

### Forgot Password
```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent",
  "data": {
    "email": "user@example.com",
    "message": "Password reset email sent successfully"
  }
}
```

### Reset Password
```http
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "userId": "uuid"
  }
}
```

### Verify Token
```http
GET /auth/verify
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": "uuid",
    "email": "user@example.com"
  }
}
```

### Get User Sessions
```http
GET /auth/sessions
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "ipAddress": "192.168.1.100",
      "lastActive": "2024-01-01T12:00:00.000Z",
      "rememberMe": false,
      "expiresAt": "2024-01-02T12:00:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Get User Devices
```http
GET /auth/devices
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "ipAddress": "192.168.1.100",
      "lastActive": "2024-01-01T12:00:00.000Z",
      "sessionCount": 2,
      "isActive": true
    }
  ]
}
```

### Deactivate Specific Session
```http
DELETE /auth/sessions/{sessionId}
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "message": "Session deactivated successfully"
}
```

### Logout from All Devices
```http
DELETE /auth/sessions
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

### Logout Current Session
```http
POST /auth/logout
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👤 User Management Endpoints

### Link FPL Team
```http
POST /user/link-fpl-team
```
*Requires authentication*

**Request Body:**
```json
{
  "fplTeamId": 123456
}
```

**Response:**
```json
{
  "success": true,
  "message": "FPL team linked successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "fplTeamId": 123456
    },
    "fplTeam": {
      "id": 123456,
      "name": "Dream Team FC",
      "playerFirstName": "John",
      "playerLastName": "Doe",
      "totalPoints": 1247,
      "overallRank": 12543,
      "teamValue": 102.5,
      "bank": 1.5,
      "transfers": 2,
      "gameweek": 3
    }
  }
}
```

### Unlink FPL Team
```http
DELETE /user/unlink-fpl-team
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "message": "FPL team unlinked successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "fplTeamId": null
  }
}
```

### Get User's FPL Team
```http
GET /user/fpl-team
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "fplTeamId": 123456
    },
    "fplTeam": {
      "id": 123456,
      "name": "Dream Team FC",
      "playerFirstName": "John",
      "playerLastName": "Doe",
      "totalPoints": 1247,
      "overallRank": 12543,
      "teamValue": 102.5,
      "bank": 1.5,
      "transfers": 2,
      "gameweek": 3
    }
  }
}
```

### Get User's FPL Squad
```http
GET /user/fpl-squad/{teamId}
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": 123456,
      "name": "Dream Team FC",
      "playerFirstName": "John",
      "playerLastName": "Doe",
      "totalPoints": 1247,
      "overallRank": 12543,
      "teamValue": 102.5,
      "bank": 1.5,
      "transfers": 2,
      "gameweek": 3
    },
    "players": [
      {
        "id": 1,
        "name": "Alisson",
        "firstName": "Alisson",
        "lastName": "Becker",
        "team": "Liverpool",
        "teamId": 10,
        "position": "GKP",
        "positionId": 1,
        "price": 5.5,
        "points": 89,
        "form": "5.0",
        "selectedBy": "15.2%",
        "status": "a",
        "photo": "https://resources.premierleague.com/premierleague/photos/players/110x140/p1.png",
        "isCaptain": false,
        "isViceCaptain": false,
        "multiplier": 1,
        "position": 1
      }
    ],
    "chips": [],
    "automaticSubs": []
  }
}
```

### Get User Profile
```http
GET /user/profile
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "phone": "+233123456789",
    "fplTeamId": 123456,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update User Profile
```http
PUT /user/profile
```
*Requires authentication*

**Request Body:**
```json
{
  "username": "newusername", // optional
  "phone": "+233987654321"   // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "newusername",
    "phone": "+233987654321",
    "fplTeamId": 123456,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Change Password
```http
PUT /user/change-password
```
*Requires authentication*

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## ⚽ FPL Data Endpoints

### Get All Players
```http
GET /fpl/players
```

**Response:**
```json
{
  "success": true,
  "count": 600,
  "data": [
    {
      "id": 1,
      "firstName": "Alisson",
      "lastName": "Becker",
      "displayName": "Alisson",
      "team": "Liverpool",
      "teamId": 10,
      "position": "GKP",
      "positionId": 1,
      "price": 5.5,
      "points": 89,
      "form": "5.0",
      "selectedBy": "15.2%",
      "news": "",
      "status": "a",
      "photo": "https://resources.premierleague.com/premierleague/photos/players/110x140/p1.png"
    }
  ]
}
```

### Get Players by Position
```http
GET /fpl/players/position/{positionId}
```
*positionId: 1=GKP, 2=DEF, 3=MID, 4=FWD*

### Get Players by Team
```http
GET /fpl/players/team/{teamId}
```

### Get Players by Budget
```http
GET /fpl/players/budget/{maxPrice}
```

### Get All Teams
```http
GET /fpl/teams
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "id": 1,
      "name": "Arsenal",
      "shortName": "ARS",
      "strength": 4,
      "code": 3
    }
  ]
}
```

### Get Current Gameweek
```http
GET /fpl/gameweek/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Gameweek 3",
    "deadline_time": "2024-01-01T11:30:00Z",
    "average_entry_score": 45,
    "finished": false,
    "data_checked": false,
    "highest_scoring_entry": 123456,
    "is_previous": false,
    "is_current": true,
    "is_next": false
  }
}
```

### Get Fixtures
```http
GET /fpl/fixtures?gameweek=3
```

### Get FPL Team by ID
```http
GET /fpl/team/{teamId}
```

### Get FPL Team Squad
```http
GET /fpl/team/{teamId}/squad
```

### Get FPL Team URL (for redirecting to official FPL app)
```http
GET /fpl/team/{teamId}/url?gameweek={gameweekId}
```

**Query Parameters:**
- `gameweek` (optional): Specific gameweek to view team for

**Response:**
```json
{
  "success": true,
  "data": {
    "fplTeamId": 123456,
    "teamName": "Dream Team FC",
    "fplUrl": "https://fantasy.premierleague.com/entry/123456/event/3",
    "gameweek": 3
  }
}
```

**Note:** This endpoint generates the official FPL team URL that can be used to redirect users to the official FPL app when they click on team names in league standings.

### Validate Team
```http
POST /fpl/validate-team
```

**Request Body:**
```json
{
  "players": [
    {
      "id": 1,
      "positionId": 1,
      "teamId": 10,
      "price": 5.5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "teamCount": {},
    "positionCount": { "1": 2, "2": 5, "3": 5, "4": 3 },
    "totalCost": 98.5,
    "playerCount": 15
  }
}
```

### Get Bootstrap Data
```http
GET /fpl/bootstrap
```

---

## 🏆 League Management Endpoints

### User League Creation

#### Create New League
```http
POST /league-creation/create
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "My Classic League",
  "leagueFormat": "CLASSIC",
  "entryType": "PAID",
  "entryFee": 20,
  "maxTeams": 100,
  "includeChipScores": false,
  "includeTransferCosts": false,
  "season": 2024,
  "startGameweek": 3,
  "prizeDistribution": {
    "type": "TOP_3",
    "distribution": { "1": 60, "2": 30, "3": 10 }
  },
  "isPrivate": false,
  "description": "A classic league for serious players"
}
```

**Response:**
```json
{
  "success": true,
  "message": "League created successfully",
  "data": {
    "id": "uuid",
    "name": "My Classic League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 20,
    "maxTeams": 100,
    "status": "DRAFT",
    "creatorId": "user-uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Available Gameweeks
```http
GET /league-creation/available-gameweeks
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Gameweek 3",
      "deadline_time": "2024-08-30T17:30:00Z",
      "is_current": false,
      "is_next": true
    }
  ]
}
```

#### Get User's Created Leagues
```http
GET /league-creation/my-leagues?season=2024
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Classic League",
      "leagueFormat": "CLASSIC",
      "entryType": "PAID",
      "entryFee": 20,
      "maxTeams": 100,
      "status": "DRAFT",
      "entries": []
    }
  ]
}
```

#### Get League Details
```http
GET /league-creation/{leagueId}
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Classic League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 20,
    "maxTeams": 100,
    "status": "DRAFT",
    "creator": {
      "id": "user-uuid",
      "username": "creator"
    },
    "entries": [],
    "h2hMatchups": []
  }
}
```

#### Get Prize Distribution Templates
```http
GET /league-creation/prize-templates
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "WINNER_TAKES_ALL",
      "name": "Winner Takes All",
      "description": "100% of prize pool to 1st place",
      "distribution": { "1": 100 }
    },
    {
      "id": "TOP_3",
      "name": "Top 3",
      "description": "60% / 30% / 10% to 1st, 2nd, 3rd",
      "distribution": { "1": 60, "2": 30, "3": 10 }
    }
  ]
}
```

#### Calculate Prize Distribution Preview
```http
POST /league-creation/calculate-prize
```
*Requires authentication*

**Request Body:**
```json
{
  "entryFee": 20,
  "participantCount": 50,
  "distributionType": "TOP_3"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPrizePool": 1000,
    "platformFee": 50,
    "platformFee": 50,
    "distributableAmount": 950,
    "distribution": {
      "1": 570,
      "2": 285,
      "3": 95
    }
  }
}
```

#### Validate Knockout Rounds
```http
POST /league-creation/validate-knockout
```
*Requires authentication*

**Request Body:**
```json
{
  "participantCount": 8,
  "requestedRounds": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "participantCount": 8,
    "requestedRounds": 3,
    "validatedRounds": 3,
    "adjusted": false
  }
}
```

---

### Get Current Gameweek Leagues
```http
GET /leagues/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameweek": {
      "id": 2,
      "name": "Gameweek 2",
      "deadline_time": "2025-08-22T17:30:00Z",
      "is_current": true
    },
    "leagues": [
      {
        "id": "uuid",
        "name": "Gameweek 2 Champions",
        "type": "PAID",
        "entryFee": 5.00,
        "maxTeams": 80000,
        "prizePool": 0,
        "status": "OPEN",
        "entries": []
      },
      {
        "id": "uuid",
        "name": "Gameweek 2 Free2Play",
        "type": "FREE",
        "entryFee": 0.00,
        "maxTeams": 80000,
        "prizePool": 0,
        "status": "OPEN",
        "entries": []
      }
    ]
  }
}
```

### Join League
```http
POST /leagues/{leagueId}/join
```
*Requires authentication*

**Request Body:**
```json
{
  "linkedTeamId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined league",
  "data": {
    "id": "uuid",
    "leagueId": "uuid",
    "linkedTeamId": "uuid",
    "userId": "uuid",
    "gameweekPoints": 0,
    "rank": null,
    "entryTime": "2024-01-01T00:00:00.000Z"
  }
}
```

### Leave League
```http
DELETE /leagues/{leagueId}/leave
```
*Requires authentication*

**Request Body:**
```json
{
  "linkedTeamId": "uuid"
}
```

### Get League Standings
```http
GET /leagues/{leagueId}/standings?enhanced=true
```

**Query Parameters:**
- `enhanced` (optional): Set to `true` to enable live gameweek progress (default: `true`)

**Response (Enhanced Standings):**
```json
{
  "success": true,
  "enhanced": true,
  "liveProgress": "enabled",
  "data": [
    {
      "id": "uuid",
      "gameweekPoints": 85,
      "rank": 1,
      "previousRank": 3,
      "linkedTeam": {
        "id": "uuid",
        "teamName": "Tokern FC",
        "fplTeamId": 123456,
        "fplUrl": "https://fantasy.premierleague.com/entry/123456"
      },
      "user": {
        "id": "uuid",
        "username": "nanaba"
      },
      "liveProgress": {
        "captainStatus": "PLAYED",
        "playersRemaining": 3,
        "totalPlayers": 15,
        "playersPlayed": 12,
        "gameweekProgress": 80
      }
    }
  ]
}
```

**Response (Basic Standings):**
```http
GET /leagues/{leagueId}/standings?enhanced=false
```

```json
{
  "success": true,
  "enhanced": false,
  "liveProgress": "disabled",
  "data": [
    {
      "id": "uuid",
      "gameweekPoints": 85,
      "rank": 1,
      "previousRank": 3,
      "linkedTeam": {
        "id": "uuid",
        "teamName": "Tokern FC",
        "fplTeamId": 123456,
        "fplUrl": "https://fantasy.premierleague.com/entry/123456"
      },
      "user": {
        "id": "uuid",
        "username": "nanaba"
      }
    }
  ]
}
```

**Live Progress Fields:**
- **`captainStatus`**: Status of captain - `"PLAYED"`, `"YET_TO_PLAY"`, `"UNKNOWN"`, or `"ERROR"`
- **`playersRemaining`**: Number of players yet to play in current gameweek
- **`totalPlayers`**: Total players in squad (usually 15)
- **`playersPlayed`**: Number of players who have already played
- **`gameweekProgress`**: Percentage of gameweek completed (0-100)

**Note:** The `fplUrl` field in `linkedTeam` contains the official FPL team URL that can be used to redirect users to the official FPL app when they click on team names. Enhanced standings provide real-time gameweek progress during live matches.

### Get User's League Entries
```http
GET /leagues/user/entries
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "league": {
        "name": "Gameweek 2 Champions",
        "type": "PAID"
      },
      "linkedTeam": {
        "teamName": "Tokern FC"
      },
      "gameweekPoints": 85,
      "rank": 1
    }
  ]
}
```

---

## 🔧 Admin Endpoints

### Create Weekly Leagues
```http
POST /admin/leagues/create-weekly
```

**Response:**
```json
{
  "success": true,
  "message": "Weekly leagues created successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Gameweek 2 Champions",
      "type": "PAID",
      "entryFee": 5.00,
      "maxTeams": 80000
    },
    {
      "id": "uuid", 
      "name": "Gameweek 2 Free2Play",
      "type": "FREE",
      "entryFee": 0.00,
      "maxTeams": 80000
    }
  ]
}
```

### Update League Points
```http
POST /admin/leagues/update-points/{gameweekId}
```

**Response:**
```json
{
  "success": true,
  "message": "League points updated for Gameweek 2"
}
```

### Get Current Gameweek Info
```http
GET /admin/gameweek/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Gameweek 2",
    "deadline_time": "2025-08-22T17:30:00Z",
    "is_current": true
  }
}
```



## 📊 Transaction Endpoints

### Get User Transactions
```http
GET /transactions
```
*Requires authentication*

### Create Transaction
```http
POST /transactions
```
*Requires authentication*

**Request Body:**
```json
{
  "type": "entry_fee",
  "amount": 50,
  "leagueId": "uuid",
  "paymentMethod": "mtn"
}
```

---

## 🔧 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## 🚀 Getting Started

1. **Start the server:**
   ```bash
   cd fpl-hub-backend
   npm install
   npm run dev
   ```

2. **Set up environment variables:**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/fpl_hub"
   JWT_SECRET="your-secret-key"
   PORT=5000
   ```

3. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

4. **Test the API:**
   ```bash
   # Register a user
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","username":"testuser","password":"password123"}'
   
   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Prices are in millions (e.g., 5.5 = £5.5M)
- FPL team IDs are the official Fantasy Premier League team IDs
- JWT tokens expire after 7 days
- The API includes rate limiting and caching for FPL data


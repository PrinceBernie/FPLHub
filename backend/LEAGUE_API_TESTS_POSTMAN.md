e to tell when the # 🧪 FPL Hub League API Tests - Postman Collection

## 📋 Environment Setup

### **Environment Variables**
Create a new environment called "FPL Hub League Tests" with these variables:

```json
{
  "base_url": "http://localhost:3000",
  "admin_email": "admin@fplhub.com",
  "admin_password": "admin123",
  "user_email": "testuser@example.com",
  "user_password": "Test_12!",
  "user_phone": "501234567",
  "admin_token": "",
  "user_token": "",
  "league_id": "",
  "linked_team_id": "",
  "wallet_id": "",
  "otp_code": "123456"
}
```

## 🚀 Test Collection: "FPL Hub League Features"

### **1. User Registration & Authentication**

#### **1.1 User Registration**
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/register`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "email": "{{user_email}}",
    "username": "testuser",
    "password": "{{user_password}}",
    "phone": "{{user_phone}}",
    "consentGiven": true
  }
  ```
- **Tests:**
  ```javascript
  pm.test("User registration successful", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

#### **1.2 Send OTP**
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/send-otp`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "phone": "{{user_phone}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("OTP sent successfully", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

#### **1.3 Verify OTP**
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/verify-otp`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "phone": "{{user_phone}}",
    "otpCode": "{{otp_code}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("OTP verification successful", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.token).to.exist;
      pm.environment.set("user_token", response.data.token);
  });
  ```

#### **1.4 Admin Login**
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/login`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "email": "{{admin_email}}",
    "password": "{{admin_password}}",
    "rememberMe": false
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Admin login successful", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.token).to.exist;
      pm.environment.set("admin_token", response.data.token);
  });
  ```

### **2. Wallet Management**

#### **2.1 Check Wallet Balance**
- **Method:** `GET`
- **URL:** `{{base_url}}/wallet/balance`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Wallet balance retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.balance).to.exist;
  });
  ```

#### **2.2 Add Payment Method**
- **Method:** `POST`
- **URL:** `{{base_url}}/wallet/payment-methods`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "type": "MTN_MOBILE_MONEY",
    "details": {
      "phoneNumber": "{{user_phone}}",
      "accountName": "Test User"
    },
    "isDefault": true
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Payment method added", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

#### **2.3 Deposit Funds**
- **Method:** `POST`
- **URL:** `{{base_url}}/wallet/deposit`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "amount": 100.00,
    "paymentMethod": "MTN_MOBILE_MONEY",
    "phoneNumber": "{{user_phone}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Deposit successful", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

### **3. FPL Team Management**

#### **3.1 Link FPL Team**
- **Method:** `POST`
- **URL:** `{{base_url}}/user/link-fpl-team`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "fplTeamId": 123456,
    "teamName": "Test Team"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("FPL team linked", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.linkedTeam.id).to.exist;
      pm.environment.set("linked_team_id", response.data.linkedTeam.id);
  });
  ```

#### **3.2 Get Linked Teams**
- **Method:** `GET`
- **URL:** `{{base_url}}/user/linked-teams`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Linked teams retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
  });
  ```

### **4. Admin League Management**

#### **4.1 Create Weekly Leagues (Admin)**
- **Method:** `POST`
- **URL:** `{{base_url}}/admin/leagues/create-weekly`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{admin_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "gameweek": 1,
    "season": 2024,
    "platformFeeType": "PERCENTAGE",
    "platformFeeValue": 5.0
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Weekly leagues created", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
      pm.expect(response.data.length).to.be.at.least(2);
      
      // Store league IDs for testing
      const championsLeague = response.data.find(league => league.name.includes('Champions'));
      const freeLeague = response.data.find(league => league.name.includes('Free2Play'));
      
      if (championsLeague) {
          pm.environment.set("champions_league_id", championsLeague.id);
      }
      if (freeLeague) {
          pm.environment.set("free_league_id", freeLeague.id);
      }
  });
  ```

#### **4.2 Get Current Gameweek Leagues**
- **Method:** `GET`
- **URL:** `{{base_url}}/leagues/current`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Current leagues retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.leagues).to.be.an('array');
      pm.expect(response.data.currentGameweek).to.exist;
  });
  ```

### **5. League Participation**

#### **5.1 Join Free League**
- **Method:** `POST`
- **URL:** `{{base_url}}/leagues/{{free_league_id}}/join`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "linkedTeamId": "{{linked_team_id}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Joined free league", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.canLeave).to.be.true;
  });
  ```

#### **5.2 Try to Join Paid League (Should Fail - No Balance)**
- **Method:** `POST`
- **URL:** `{{base_url}}/leagues/{{champions_league_id}}/join`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "linkedTeamId": "{{linked_team_id}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Paid league join failed - insufficient balance", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
      pm.expect(response.error).to.include("Payment failed");
  });
  ```

#### **5.3 Deposit More Funds**
- **Method:** `POST`
- **URL:** `{{base_url}}/wallet/deposit`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "amount": 50.00,
    "paymentMethod": "MTN_MOBILE_MONEY",
    "phoneNumber": "{{user_phone}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Additional deposit successful", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

#### **5.4 Join Paid League (Should Succeed)**
- **Method:** `POST`
- **URL:** `{{base_url}}/leagues/{{champions_league_id}}/join`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "linkedTeamId": "{{linked_team_id}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Joined paid league", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.canLeave).to.be.false;
  });
  ```

#### **5.5 Try to Leave Free League (Should Succeed)**
- **Method:** `DELETE`
- **URL:** `{{base_url}}/leagues/{{free_league_id}}/leave`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "linkedTeamId": "{{linked_team_id}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Left free league", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

#### **5.6 Try to Leave Paid League (Should Fail)**
- **Method:** `DELETE`
- **URL:** `{{base_url}}/leagues/{{champions_league_id}}/leave`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "linkedTeamId": "{{linked_team_id}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Cannot leave paid league", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
      pm.expect(response.error).to.include("Cannot leave paid leagues");
  });
  ```

### **6. User League Creation**

#### **6.1 Create Private League (User)**
- **Method:** `POST`
- **URL:** `{{base_url}}/league-creation/create`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "name": "My Private League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 15.00,
    "maxTeams": 50,
    "season": 2024,
    "startGameweek": 2,
    "endGameweek": 2,
    "description": "A private league for testing"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Private league created", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.isPrivate).to.be.true;
      pm.expect(response.data.isInvitational).to.be.true;
      pm.environment.set("user_league_id", response.data.id);
  });
  ```

#### **6.2 Try to Create Public League (User - Should Fail)**
- **Method:** `POST`
- **URL:** `{{base_url}}/league-creation/create`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "name": "My Public League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 15.00,
    "maxTeams": 50,
    "season": 2024,
    "startGameweek": 3,
    "endGameweek": 3,
    "isPrivate": false,
    "isInvitational": false,
    "description": "A public league for testing"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Cannot create public league as user", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
      pm.expect(response.error).to.include("private and invitational");
  });
  ```

#### **6.3 Try to Create League with Too Many Teams (User - Should Fail)**
- **Method:** `POST`
- **URL:** `{{base_url}}/league-creation/create`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "name": "Large League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 15.00,
    "maxTeams": 500,
    "season": 2024,
    "startGameweek": 4,
    "endGameweek": 4,
    "description": "A large league for testing"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Cannot create league with too many teams", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
      pm.expect(response.error).to.include("400");
  });
  ```

### **7. Admin League Creation**

#### **7.1 Create Public League (Admin)**
- **Method:** `POST`
- **URL:** `{{base_url}}/league-creation/create`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{admin_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "name": "Admin Public League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 20.00,
    "maxTeams": 1000,
    "season": 2024,
    "startGameweek": 5,
    "endGameweek": 5,
    "isPrivate": false,
    "isInvitational": false,
    "description": "An admin-created public league"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Admin created public league", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.isPrivate).to.be.false;
      pm.expect(response.data.isInvitational).to.be.false;
  });
  ```

#### **7.2 Create Large League (Admin)**
- **Method:** `POST`
- **URL:** `{{base_url}}/league-creation/create`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{admin_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "name": "Admin Large League",
    "leagueFormat": "CLASSIC",
    "entryType": "PAID",
    "entryFee": 10.00,
    "maxTeams": 5000,
    "season": 2024,
    "startGameweek": 6,
    "endGameweek": 6,
    "description": "An admin-created large league"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Admin created large league", function () {
      pm.response.to.have.status(201);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.maxTeams).to.equal(5000);
  });
  ```

### **8. League Management**

#### **8.1 Get League Details**
- **Method:** `GET`
- **URL:** `{{base_url}}/leagues/{{champions_league_id}}`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("League details retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.league).to.exist;
      pm.expect(response.data.standings).to.exist;
  });
  ```

#### **8.2 Get User's Leagues**
- **Method:** `GET`
- **URL:** `{{base_url}}/league-creation/my-leagues?season=2024`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("User leagues retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
  });
  ```

### **9. Bonus Wallet & Streak Testing**

#### **9.1 Check Bonus Wallet**
- **Method:** `GET`
- **URL:** `{{base_url}}/wallet/bonus-balance`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Bonus wallet balance retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.balance).to.exist;
  });
  ```

#### **9.2 Get Streak Information**
- **Method:** `GET`
- **URL:** `{{base_url}}/user/streak-info`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Streak info retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.exist;
  });
  ```

### **10. Error Handling Tests**

#### **10.1 Join League Without FPL Team**
- **Method:** `POST`
- **URL:** `{{base_url}}/leagues/{{free_league_id}}/join`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "linkedTeamId": "invalid-team-id"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Join league without valid FPL team fails", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
  });
  ```

#### **10.2 Access Admin Endpoint as User**
- **Method:** `POST`
- **URL:** `{{base_url}}/admin/leagues/create-weekly`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Body:**
  ```json
  {
    "gameweek": 1,
    "season": 2024
  }
  ```
- **Tests:**
  ```javascript
  pm.test("User cannot access admin endpoints", function () {
      pm.response.to.have.status(403);
  });
  ```

## 🎯 Test Execution Order

1. **Setup Phase:**
   - User Registration → Send OTP → Verify OTP
   - Admin Login
   - Link FPL Team

2. **Wallet Phase:**
   - Check Balance → Add Payment Method → Deposit Funds

3. **Admin Phase:**
   - Create Weekly Leagues
   - Create Public/Large Leagues

4. **League Participation:**
   - Join Free League → Leave Free League
   - Try Join Paid League (Fail) → Deposit More → Join Paid League (Success)
   - Try Leave Paid League (Fail)

5. **User League Creation:**
   - Create Private League (Success)
   - Try Create Public League (Fail)
   - Try Create Large League (Fail)

6. **Verification Phase:**
   - Check League Details
   - Verify Bonus Wallet
   - Check Streak Info

## 📊 Expected Results

- ✅ **User Registration & Authentication** - All successful
- ✅ **Wallet Operations** - All successful
- ✅ **FPL Team Linking** - Successful
- ✅ **Admin League Creation** - All successful
- ✅ **Free League Participation** - Join/Leave successful
- ❌ **Paid League Join (No Balance)** - Should fail
- ✅ **Paid League Join (With Balance)** - Should succeed
- ❌ **Paid League Leave** - Should fail
- ✅ **User Private League Creation** - Should succeed
- ❌ **User Public League Creation** - Should fail
- ❌ **User Large League Creation** - Should fail
- ✅ **Admin Public League Creation** - Should succeed
- ✅ **Admin Large League Creation** - Should succeed

## 🔧 Troubleshooting

### **Common Issues:**
1. **OTP Code** - Use `123456` for testing
2. **Admin User** - Ensure admin user exists in database
3. **FPL Team ID** - Use valid FPL team ID (123456)
4. **Token Expiry** - Re-run login if tokens expire
5. **Database State** - Clean up test data between runs

### **Environment Reset:**
```javascript
// Add this to Pre-request Script for cleanup
pm.environment.unset("user_token");
pm.environment.unset("admin_token");
pm.environment.unset("league_id");
pm.environment.unset("linked_team_id");
```

---

**🚀 Ready to test all league features! Import this collection into Postman and run the tests in order.**

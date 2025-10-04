# 🧪 FPL Hub Postman Test Scenarios

## 📋 Environment Setup

### **Environment Variables**
Create environment: "FPL Hub Tests"

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
  "otp_code": "123456"
}
```

---

## 🚀 PHASE 1: AUTHENTICATION & SETUP

### **1.1 User Registration**
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

### **1.2 Send OTP**
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

### **1.3 Verify OTP**
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

### **1.4 Admin Login**
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

### **1.5 Get Current User**
- **Method:** `GET`
- **URL:** `{{base_url}}/auth/me`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Current user retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.user.isVerified).to.be.true;
  });
  ```

---

## 💰 PHASE 2: WALLET MANAGEMENT

### **2.1 Check Wallet Balance**
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
      console.log("Current balance:", response.data.balance);
  });
  ```

### **2.2 Add Payment Method**
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

### **2.3 Get Payment Methods**
- **Method:** `GET`
- **URL:** `{{base_url}}/wallet/payment-methods`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Payment methods retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
  });
  ```

### **2.4 Deposit Funds (Initial)**
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
    "amount": 25.00,
    "paymentMethod": "MTN_MOBILE_MONEY",
    "phoneNumber": "{{user_phone}}"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Initial deposit successful", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
  });
  ```

### **2.5 Check Bonus Wallet**
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
      console.log("Bonus balance:", response.data.balance);
  });
  ```

---

## ⚽ PHASE 3: FPL TEAM MANAGEMENT

### **3.1 Link FPL Team**
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

### **3.2 Get Linked Teams**
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
      pm.expect(response.data.length).to.be.at.least(1);
  });
  ```

### **3.3 Get FPL Team Info**
- **Method:** `GET`
- **URL:** `{{base_url}}/user/fpl-team`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("FPL team info retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.linkedTeam).to.exist;
  });
  ```

---

## 🏆 PHASE 4: ADMIN LEAGUE CREATION

### **4.1 Create Weekly Leagues (Admin)**
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
          pm.expect(championsLeague.maxTeams).to.equal(10000);
          pm.expect(championsLeague.includeChipScores).to.be.false;
          pm.expect(championsLeague.includeTransferCosts).to.be.false;
      }
      if (freeLeague) {
          pm.environment.set("free_league_id", freeLeague.id);
          pm.expect(freeLeague.maxTeams).to.equal(10000);
          pm.expect(freeLeague.includeChipScores).to.be.false;
          pm.expect(freeLeague.includeTransferCosts).to.be.false;
      }
  });
  ```

### **4.2 Get Current Gameweek Leagues**
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
      console.log("Available leagues:", response.data.leagues.length);
  });
  ```

### **4.3 Create Public League (Admin)**
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
    "startGameweek": 2,
    "endGameweek": 2,
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
      pm.environment.set("admin_public_league_id", response.data.id);
  });
  ```

### **4.4 Create Large League (Admin)**
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
    "startGameweek": 3,
    "endGameweek": 3,
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
      pm.environment.set("admin_large_league_id", response.data.id);
  });
  ```

---

## 🎯 PHASE 5: LEAGUE PARTICIPATION

### **5.1 Join Free League**
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
      pm.environment.set("free_league_entry_id", response.data.id);
  });
  ```

### **5.2 Try to Join Paid League (Should Fail - Insufficient Balance)**
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

### **5.3 Deposit More Funds**
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

### **5.4 Join Paid League (Should Succeed)**
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
      pm.environment.set("paid_league_entry_id", response.data.id);
  });
  ```

### **5.5 Try to Leave Free League (Should Succeed)**
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

### **5.6 Try to Leave Paid League (Should Fail)**
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

---

## 👤 PHASE 6: USER LEAGUE CREATION

### **6.1 Create Private League (User - Should Succeed)**
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
    "startGameweek": 4,
    "endGameweek": 4,
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

### **6.2 Try to Create Public League (User - Should Fail)**
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
    "startGameweek": 5,
    "endGameweek": 5,
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

### **6.3 Try to Create League with Too Many Teams (User - Should Fail)**
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
    "startGameweek": 6,
    "endGameweek": 6,
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

### **6.4 Try to Create Free League (User - Should Fail)**
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
    "name": "Free League",
    "leagueFormat": "CLASSIC",
    "entryType": "FREE",
    "entryFee": 0.00,
    "maxTeams": 50,
    "season": 2024,
    "startGameweek": 7,
    "endGameweek": 7,
    "description": "A free league for testing"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Cannot create free league as user", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
      pm.expect(response.error).to.include("paid leagues only");
  });
  ```

---

## 🔍 PHASE 7: LEAGUE MANAGEMENT & VERIFICATION

### **7.1 Get League Details**
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
      
      // Verify flagship league settings
      const league = response.data.league;
      pm.expect(league.maxTeams).to.equal(10000);
      pm.expect(league.includeChipScores).to.be.false;
      pm.expect(league.includeTransferCosts).to.be.false;
      pm.expect(league.isPrivate).to.be.false;
      pm.expect(league.isInvitational).to.be.false;
  });
  ```

### **7.2 Get User's Created Leagues**
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
      
      // Verify all user leagues are private
      response.data.forEach(league => {
          pm.expect(league.isPrivate).to.be.true;
          pm.expect(league.isInvitational).to.be.true;
          pm.expect(league.maxTeams).to.be.at.most(400);
      });
  });
  ```

### **7.3 Get League by Code**
- **Method:** `GET`
- **URL:** `{{base_url}}/leagues/code/{{user_league_code}}`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("League by code retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data.isInvitational).to.be.true;
  });
  ```

---

## 🎁 PHASE 8: BONUS WALLET & STREAK TESTING

### **8.1 Get Streak Information**
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
      console.log("Streak info:", response.data);
  });
  ```

### **8.2 Get Wallet Transactions**
- **Method:** `GET`
- **URL:** `{{base_url}}/wallet/transactions`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Wallet transactions retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
  });
  ```

### **8.3 Get Bonus Wallet Transactions**
- **Method:** `GET`
- **URL:** `{{base_url}}/wallet/bonus-transactions`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Bonus wallet transactions retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
  });
  ```

---

## ❌ PHASE 9: ERROR HANDLING TESTS

### **9.1 Join League Without FPL Team**
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

### **9.2 Access Admin Endpoint as User**
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

### **9.3 Join League Without Authentication**
- **Method:** `POST`
- **URL:** `{{base_url}}/leagues/{{free_league_id}}/join`
- **Headers:**
  ```json
  {
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
  pm.test("Cannot join league without authentication", function () {
      pm.response.to.have.status(401);
  });
  ```

### **9.4 Create League with Invalid Data**
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
    "name": "A",
    "leagueFormat": "INVALID",
    "entryType": "PAID",
    "entryFee": -10,
    "maxTeams": 1,
    "season": 2024,
    "startGameweek": 1,
    "endGameweek": 1
  }
  ```
- **Tests:**
  ```javascript
  pm.test("Cannot create league with invalid data", function () {
      pm.response.to.have.status(400);
      const response = pm.response.json();
      pm.expect(response.success).to.be.false;
  });
  ```

---

## 📊 PHASE 10: FINAL VERIFICATION

### **10.1 Final Wallet Balance Check**
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
  pm.test("Final wallet balance check", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      console.log("Final balance:", response.data.balance);
      console.log("Currency:", response.data.currency);
  });
  ```

### **10.2 Final Bonus Wallet Check**
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
  pm.test("Final bonus wallet check", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      console.log("Final bonus balance:", response.data.balance);
  });
  ```

### **10.3 Get All User Leagues**
- **Method:** `GET`
- **URL:** `{{base_url}}/user/leagues`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer {{user_token}}",
    "Content-Type": "application/json"
  }
  ```
- **Tests:**
  ```javascript
  pm.test("All user leagues retrieved", function () {
      pm.response.to.have.status(200);
      const response = pm.response.json();
      pm.expect(response.success).to.be.true;
      pm.expect(response.data).to.be.an('array');
      
      // Verify league participation rules
      response.data.forEach(league => {
          if (league.entryType === 'PAID') {
              pm.expect(league.canLeave).to.be.false;
          } else {
              pm.expect(league.canLeave).to.be.true;
          }
      });
  });
  ```

---

## 🎯 EXECUTION ORDER

**Run these phases in sequence:**

1. **Phase 1:** Authentication & Setup (1.1 → 1.5)
2. **Phase 2:** Wallet Management (2.1 → 2.5)
3. **Phase 3:** FPL Team Management (3.1 → 3.3)
4. **Phase 4:** Admin League Creation (4.1 → 4.4)
5. **Phase 5:** League Participation (5.1 → 5.6)
6. **Phase 6:** User League Creation (6.1 → 6.4)
7. **Phase 7:** League Management & Verification (7.1 → 7.3)
8. **Phase 8:** Bonus Wallet & Streak Testing (8.1 → 8.3)
9. **Phase 9:** Error Handling Tests (9.1 → 9.4)
10. **Phase 10:** Final Verification (10.1 → 10.3)

---

## ✅ EXPECTED RESULTS SUMMARY

### **Success Cases:**
- ✅ User registration, OTP verification, login
- ✅ Wallet operations (deposit, balance, payment methods)
- ✅ FPL team linking and management
- ✅ Admin league creation (public, large, flagship)
- ✅ Free league join/leave
- ✅ Paid league join (with sufficient balance)
- ✅ User private league creation
- ✅ League details and management

### **Failure Cases:**
- ❌ Paid league join without sufficient balance
- ❌ Paid league leave attempts
- ❌ User creating public leagues
- ❌ User creating leagues with >400 teams
- ❌ User creating free leagues
- ❌ User accessing admin endpoints
- ❌ Invalid data submissions
- ❌ Unauthenticated requests

---

**🚀 Ready to test! Import these requests into Postman and run them in the specified order.**

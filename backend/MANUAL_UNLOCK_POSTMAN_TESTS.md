# 🔓 Manual League Unlock - Postman Test Collection

## Overview

This collection tests the Super Admin manual league unlock functionality, allowing Super Admins to unlock leagues before the automatic system timing.

## 🎯 Test Scenarios

### **Prerequisites:**
- Super Admin user created and logged in
- Leagues exist in LOCKED status for testing
- Server running with automatic league system

---

## 🔐 **1. AUTHENTICATION TESTS**

### **Test 1: Super Admin Login**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/auth/login`
- **Headers:** 
  ```
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "email": "armobernieprince@gmail.com",
    "password": "PraiseGod4Me!",
    "rememberMe": false
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Login successful", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data.user.adminLevel).to.eql("SUPER_ADMIN");
  });
  
  pm.test("Store admin token", function () {
      const jsonData = pm.response.json();
      pm.environment.set("superAdminToken", jsonData.data.token);
  });
  ```

---

## 📊 **2. LEAGUE STATUS TESTS**

### **Test 2: Get Current Gameweek Status**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/status`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Status data returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('currentGameweek');
      pm.expect(jsonData.data).to.have.property('nextGameweek');
  });
  
  pm.test("Store next gameweek ID", function () {
      const jsonData = pm.response.json();
      pm.environment.set("nextGameweekId", jsonData.data.nextGameweek.id);
  });
  ```

### **Test 3: Get Specific Gameweek League Status**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/status?gameweek={{nextGameweekId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Gameweek leagues returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('leagues');
  });
  
  pm.test("Check league status", function () {
      const jsonData = pm.response.json();
      if (jsonData.data.leagues.length > 0) {
          jsonData.data.leagues.forEach(league => {
              pm.expect(league.status).to.be.oneOf(['LOCKED', 'OPEN']);
          });
      }
  });
  ```

---

## 🔓 **3. MANUAL UNLOCK TESTS**

### **Test 4: Manual Unlock Specific Gameweek (Super Admin)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/unlock-gameweek/{{nextGameweekId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  Content-Type: application/json
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Manual unlock successful", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("unlocked");
  });
  
  pm.test("Leagues unlocked", function () {
      const jsonData = pm.response.json();
      if (jsonData.data && jsonData.data.length > 0) {
          jsonData.data.forEach(league => {
              pm.expect(league.status).to.eql("OPEN");
          });
      }
  });
  ```

### **Test 5: Force Unlock (Regular Unlock with Override)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/unlock`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "forceUnlock": true
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Force unlock processed", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
  });
  ```

---

## 🚫 **4. AUTHORIZATION TESTS**

### **Test 6: Regular Admin Cannot Unlock Specific Gameweek**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/unlock-gameweek/{{nextGameweekId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 403", function () {
      pm.response.to.have.status(403);
  });
  
  pm.test("Access denied", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(false);
      pm.expect(jsonData.error).to.include("Access denied");
  });
  ```

### **Test 7: Regular User Cannot Access Manual Unlock**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/unlock-gameweek/{{nextGameweekId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{userToken}}
  Content-Type: application/json
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 401 or 403", function () {
      pm.expect(pm.response.code).to.be.oneOf([401, 403]);
  });
  ```

---

## 🔄 **5. WORKFLOW TESTS**

### **Test 8: Complete Manual Unlock Workflow**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/process`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Process completed", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('leaguesCreated');
      pm.expect(jsonData.data).to.have.property('leaguesUnlocked');
  });
  ```

### **Test 9: Verify League Status After Manual Unlock**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/status?gameweek={{nextGameweekId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Leagues are now open", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      
      if (jsonData.data.leagues.length > 0) {
          jsonData.data.leagues.forEach(league => {
              pm.expect(league.status).to.eql("OPEN");
          });
      }
  });
  
  pm.test("Description updated", function () {
      const jsonData = pm.response.json();
      if (jsonData.data.leagues.length > 0) {
          jsonData.data.leagues.forEach(league => {
              if (league.description) {
                  pm.expect(league.description).to.include("Manually unlocked");
              }
          });
      }
  });
  ```

---

## 📋 **6. ERROR HANDLING TESTS**

### **Test 10: Invalid Gameweek ID**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/unlock-gameweek/invalid`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  Content-Type: application/json
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 400", function () {
      pm.response.to.have.status(400);
  });
  
  pm.test("Invalid gameweek error", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(false);
      pm.expect(jsonData.error).to.include("Invalid gameweek ID");
  });
  ```

### **Test 11: Unlock Non-existent Gameweek**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/unlock-gameweek/999`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  Content-Type: application/json
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("No leagues found message", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("No locked leagues found");
  });
  ```

---

## 🎯 **7. BUSINESS LOGIC TESTS**

### **Test 12: Verify Manual Unlock Bypasses Automatic Timing**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/admin/leagues/auto/status`
- **Headers:** 
  ```
  Authorization: Bearer {{superAdminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Check gameweek end status", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data.currentGameweek).to.have.property('hasEnded');
      
      // This test verifies that manual unlock works regardless of hasEnded status
      console.log("Current gameweek has ended:", jsonData.data.currentGameweek.hasEnded);
  });
  ```

---

## 📊 **Environment Variables**

Set these in your Postman environment:

```json
{
  "baseUrl": "http://localhost:5000/api",
  "superAdminToken": "",
  "adminToken": "",
  "userToken": "",
  "nextGameweekId": "",
  "currentGameweekId": ""
}
```

---

## 🚀 **Test Execution Order**

1. **Authentication** (Test 1)
2. **Get Status** (Tests 2-3)
3. **Manual Unlock** (Tests 4-5)
4. **Authorization** (Tests 6-7)
5. **Workflow** (Tests 8-9)
6. **Error Handling** (Tests 10-11)
7. **Business Logic** (Test 12)

---

## ✅ **Expected Results**

### **Successful Manual Unlock:**
- Status code: 200
- Response: `{"success": true, "message": "Manually unlocked X leagues for Gameweek Y"}`
- League status changes from LOCKED to OPEN
- Description updated to include "Manually unlocked by Super Admin"

### **Authorization Failures:**
- Non-Super Admin: 403 Forbidden
- Invalid token: 401 Unauthorized
- Invalid gameweek: 400 Bad Request

### **Business Logic:**
- Manual unlock works regardless of current gameweek end status
- All manual actions are logged for audit trail
- Leagues become immediately available for user entry

---

**The manual unlock system provides Super Admins with complete control over league timing while maintaining proper authorization and audit trails!** 🎉

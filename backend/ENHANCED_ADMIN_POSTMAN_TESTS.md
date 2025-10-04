# 🚀 Enhanced Admin Features - Postman Test Collection

## 📋 **Setup Instructions**

### **1. Environment Variables**
Create a new Postman environment called **"FPL Hub Enhanced Admin"** with these variables:

```
baseUrl: http://localhost:5000/api
authToken: (leave empty - will be set by tests)
adminToken: (leave empty - will be set by tests)
userId: (leave empty - will be set by tests)
adminId: (leave empty - will be set by tests)
```

### **2. Prerequisites**
1. **Run the migration**: `node migrate-admin-enhancements.js`
2. **Update Prisma**: `npx prisma generate`
3. **Restart server** to apply all changes

---

## 🔐 **1. ADMIN AUTHENTICATION TESTS**

### **Test 1: Admin Login (Create Admin User First)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/login`
- **Headers:** 
  ```
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "email": "admin@fplhub.com",
    "password": "admin123"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Admin login successful", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data.user.isAdmin).to.eql(true);
  });
  
  // Store admin token
  if (pm.response.json().data.token) {
      pm.environment.set("adminToken", pm.response.json().data.token);
      pm.environment.set("adminId", pm.response.json().data.user.id);
  }
  ```

---

## 🔧 **2. SYSTEM ADMINISTRATION TESTS**

### **Test 2: Get System Maintenance Status**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/system/maintenance`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Maintenance status returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('isActive');
  });
  ```

### **Test 3: Enable Maintenance Mode (SUPER_ADMIN)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/system/maintenance/enable`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "reason": "System upgrade and maintenance"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Maintenance mode enabled", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("enabled successfully");
  });
  ```

### **Test 4: Check System Health**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/system/health`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("System health data returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('status');
      pm.expect(jsonData.data).to.have.property('database');
      pm.expect(jsonData.data).to.have.property('api');
  });
  ```

### **Test 5: Get System Information**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/system/info`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("System info returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('platform');
      pm.expect(jsonData.data).to.have.property('memory');
      pm.expect(jsonData.data).to.have.property('cpu');
  });
  ```

### **Test 6: Create Database Backup (SUPER_ADMIN)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/system/backup`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "backupType": "FULL"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Backup initiated", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("initiated successfully");
  });
  ```

---

## 🛡️ **3. CONTENT MODERATION TESTS**

### **Test 7: Ban User (MODERATOR+)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/moderation/ban/{{userId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "reason": "Violation of community guidelines",
    "duration": 7,
    "isPermanent": false
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("User banned successfully", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("banned successfully");
  });
  ```

### **Test 8: Get User Ban Status**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/moderation/user/{{userId}}/ban-status`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Ban status returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('isBanned');
      pm.expect(jsonData.data.isBanned).to.eql(true);
  });
  ```

### **Test 9: Get Banned Users List**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/moderation/banned-users`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Banned users list returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.be.an('array');
  });
  ```

### **Test 10: Unban User (MODERATOR+)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/moderation/unban/{{userId}}`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "reason": "Ban lifted after review"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("User unbanned successfully", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("unbanned successfully");
  });
  ```

---

## 📊 **4. ENHANCED ANALYTICS TESTS**

### **Test 11: Get System Statistics**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/analytics/system-stats`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("System stats returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('users');
      pm.expect(jsonData.data).to.have.property('leagues');
      pm.expect(jsonData.data).to.have.property('financial');
  });
  ```

### **Test 12: Get Performance Metrics**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/analytics/performance?days=7`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Performance metrics returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('database');
      pm.expect(jsonData.data).to.have.property('api');
      pm.expect(jsonData.data).to.have.property('external');
  });
  ```

### **Test 13: Get Revenue Analytics**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/analytics/revenue?period=month`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Revenue analytics returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('totalRevenue');
      pm.expect(jsonData.data).to.have.property('platformFees');
      pm.expect(jsonData.data).to.have.property('netRevenue');
  });
  ```

---

## 🎮 **5. GAME MANAGEMENT TESTS**

### **Test 14: Start New FPL Season (SUPER_ADMIN)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/game/season/start`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "season": 2025,
    "startDate": "2025-08-01",
    "description": "FPL Season 2025/26"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Season started successfully", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("started successfully");
  });
  ```

### **Test 15: Get Current Gameweek**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/game/gameweek/current`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Gameweek info returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('id');
      pm.expect(jsonData.data).to.have.property('name');
  });
  ```

---

## 🔄 **6. EXISTING FEATURES (Enhanced) TESTS**

### **Test 16: Create Weekly Leagues (Enhanced)**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/leagues/create-weekly`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "gameweek": 4,
    "season": 2024,
    "platformFeeType": "PERCENTAGE",
    "platformFeeValue": 5.0
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Weekly leagues created", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.message).to.include("created successfully");
  });
  ```

### **Test 17: Get Enhanced System Statistics**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/statistics`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}}
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Enhanced stats returned", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(true);
      pm.expect(jsonData.data).to.have.property('adminUsers');
      pm.expect(jsonData.data).to.have.property('bannedUsers');
  });
  ```

---

## 🚨 **7. ERROR HANDLING TESTS**

### **Test 18: Unauthorized Access (Non-Admin)**
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/enhanced/system/health`
- **Headers:** 
  ```
  Authorization: Bearer {{authToken}} // Regular user token
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 403", function () {
      pm.response.to.have.status(403);
  });
  
  pm.test("Access denied", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(false);
      pm.expect(jsonData.error).to.include("Admin access required");
  });
  ```

### **Test 19: Insufficient Admin Level**
- **Method:** `POST`
- **URL:** `{{baseUrl}}/admin/enhanced/system/maintenance/enable`
- **Headers:** 
  ```
  Authorization: Bearer {{adminToken}} // MODERATOR level
  ```
- **Body (JSON):**
  ```json
  {
    "reason": "Test maintenance"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Status code is 403", function () {
      pm.response.to.have.status(403);
  });
  
  pm.test("Insufficient level", function () {
      const jsonData = pm.response.json();
      pm.expect(jsonData.success).to.eql(false);
      pm.expect(jsonData.error).to.include("SUPER_ADMIN level required");
  });
  ```

---

## 📝 **8. TEST EXECUTION ORDER**

### **Phase 1: Setup & Authentication**
1. **Test 1**: Admin Login (Create admin user first)

### **Phase 2: System Administration**
2. **Test 2**: Get Maintenance Status
3. **Test 3**: Enable Maintenance Mode
4. **Test 4**: Check System Health
5. **Test 5**: Get System Info
6. **Test 6**: Create Database Backup

### **Phase 3: Content Moderation**
7. **Test 7**: Ban User
8. **Test 8**: Get Ban Status
9. **Test 9**: Get Banned Users
10. **Test 10**: Unban User

### **Phase 4: Analytics & Management**
11. **Test 11**: Get System Stats
12. **Test 12**: Get Performance Metrics
13. **Test 13**: Get Revenue Analytics
14. **Test 14**: Start New Season
15. **Test 15**: Get Current Gameweek

### **Phase 5: Enhanced Features**
16. **Test 16**: Create Weekly Leagues (Enhanced)
17. **Test 17**: Get Enhanced Statistics

### **Phase 6: Error Handling**
18. **Test 18**: Unauthorized Access
19. **Test 19**: Insufficient Admin Level

---

## 🎯 **Expected Results**

- ✅ **All tests should pass** if the server is running correctly
- ✅ **Admin authentication** will be enforced on all routes
- ✅ **Role-based access** will restrict certain operations
- ✅ **Action logging** will track all admin activities
- ✅ **Enhanced features** will provide comprehensive system management

---

## 🔧 **Troubleshooting**

### **Common Issues:**
1. **Migration not run**: Ensure `migrate-admin-enhancements.js` has been executed
2. **Prisma not updated**: Run `npx prisma generate` after migration
3. **Admin user not created**: Check if admin user exists with proper permissions
4. **Token expired**: Re-run admin login test to get fresh token

### **Database Issues:**
- **Tables not created**: Check migration script execution
- **Foreign key errors**: Ensure all referenced tables exist
- **Permission errors**: Verify admin user has correct role and permissions

---

## 🚀 **Ready to Test!**

This comprehensive test suite covers all the new enhanced admin features. Run the tests in order to verify everything works correctly! 🎉

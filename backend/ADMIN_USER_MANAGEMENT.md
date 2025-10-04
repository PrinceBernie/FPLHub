# 🔐 Admin User Management Guide

## Overview

This guide explains how to create and manage admin users (Super Admins, Admins, and Moderators) in the FPL Hub system.

## 🎯 Admin User Creation Methods

### 1. **Initial Super Admin Creation** (System Setup)

**When to use:** First time system setup, when no Super Admin exists.

**Method:** Use the interactive script

```bash
node create-super-admin.js
```

**What it does:**
- Creates the first Super Admin user
- Initializes wallets for the Super Admin
- Sets up proper permissions
- Can only be run once (prevents multiple Super Admins)

**Example:**
```bash
$ node create-super-admin.js

🔐 FPL Hub - Create Initial Super Admin

📧 Super Admin Email: admin@fplhub.com
👤 Username: admin
📱 Phone Number: +233501234567
🔒 Password (min 8 characters): ********
🔒 Confirm Password: ********

✅ Create this Super Admin user? (yes/no): yes

🎉 Super Admin created successfully!
```

### 2. **Create New Admin User** (Super Admin Only)

**When to use:** Creating brand new admin users with specific roles.

**Method:** API endpoint

```http
POST /api/admin/users/create-admin
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "email": "moderator@fplhub.com",
  "username": "moderator1",
  "password": "securepassword123",
  "phone": "+233501234568",
  "role": "MODERATOR"
}
```

**Available Roles:**
- `MODERATOR` - Support staff with read-only access
- `ADMIN` - Core operators with management permissions
- `SUPER_ADMIN` - Highest authority with full system access

### 3. **Promote Existing User** (Super Admin Only)

**When to use:** Promoting existing regular users to admin roles.

**Method:** API endpoint

```http
POST /api/admin/users/promote
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "targetUserId": "user-uuid-here",
  "newRole": "ADMIN"
}
```

**Prerequisites:**
- Target user must be verified (completed OTP verification)
- Target user must exist in the system

### 4. **Demote Admin User** (Super Admin Only)

**When to use:** Removing admin privileges from admin users.

**Method:** API endpoint

```http
POST /api/admin/users/demote
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "targetUserId": "admin-user-uuid-here"
}
```

**Note:** Super Admins cannot demote themselves.

## 📋 Admin User Management API Endpoints

### **Create Admin User**
```http
POST /api/admin/users/create-admin
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "email": "admin@example.com",
  "username": "adminuser",
  "password": "password123",
  "phone": "+233501234567",
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ADMIN user created successfully",
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "username": "adminuser",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### **Promote User to Admin**
```http
POST /api/admin/users/promote
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "targetUserId": "user-uuid",
  "newRole": "MODERATOR"
}
```

### **Demote Admin to User**
```http
POST /api/admin/users/demote
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "targetUserId": "admin-uuid"
}
```

### **List All Admin Users**
```http
GET /api/admin/users/admins
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "admin@example.com",
      "username": "adminuser",
      "role": "ADMIN",
      "isActive": true,
      "isBanned": false,
      "lastAdminAction": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 🔄 Typical Admin User Creation Workflow

### **Scenario 1: New System Setup**
1. Run `node create-super-admin.js` to create initial Super Admin
2. Login as Super Admin
3. Create additional admin users via API or promote existing users

### **Scenario 2: Adding Support Staff**
1. Super Admin creates new Moderator user:
   ```bash
   curl -X POST http://localhost:5000/api/admin/users/create-admin \
     -H "Authorization: Bearer <super_admin_token>" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "support@fplhub.com",
       "username": "support1",
       "password": "supportpass123",
       "phone": "+233501234569",
       "role": "MODERATOR"
     }'
   ```

### **Scenario 3: Promoting Existing User**
1. Find user ID from user list
2. Promote user to admin role:
   ```bash
   curl -X POST http://localhost:5000/api/admin/users/promote \
     -H "Authorization: Bearer <super_admin_token>" \
     -H "Content-Type: application/json" \
     -d '{
       "targetUserId": "user-uuid-here",
       "newRole": "ADMIN"
     }'
   ```

## 🛡️ Security Considerations

### **Password Requirements**
- Minimum 8 characters
- Should include letters, numbers, and special characters
- Never use default passwords in production

### **Role Hierarchy**
- **Super Admin**: Can create, promote, and demote all admin users
- **Admin**: Can view admin users but cannot modify roles
- **Moderator**: Read-only access to user data
- **User**: No admin access

### **Access Control**
- All admin user management requires Super Admin authentication
- Admin actions are logged for audit purposes
- Users must be verified before promotion to admin roles

## 🚨 Important Notes

1. **Only one Super Admin can be created** using the initial script
2. **Super Admins cannot demote themselves** (safety measure)
3. **Users must be verified** (completed OTP) before promotion
4. **All admin actions are logged** for security auditing
5. **Admin users get wallets initialized** automatically upon creation

## 🔧 Troubleshooting

### **"Super Admin already exists" Error**
- Use the API endpoints to create additional admin users
- Or promote existing users to admin roles

### **"User must be verified" Error**
- Ensure the target user has completed OTP verification
- Check user's `isVerified` status in the database

### **"Only Super Admins can create admin users" Error**
- Ensure you're logged in as a Super Admin
- Check your token and admin level

### **"Invalid admin role" Error**
- Use only: `MODERATOR`, `ADMIN`, or `SUPER_ADMIN`
- Case-sensitive role names

## 📞 Support

For issues with admin user management:
1. Check server logs for detailed error messages
2. Verify user permissions and authentication
3. Ensure all required fields are provided
4. Check database connectivity and user existence


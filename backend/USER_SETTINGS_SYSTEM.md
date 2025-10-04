# 🎯 User Settings System - Basic Implementation

## 📋 Overview

A minimal, clean user settings system that provides essential configuration options for users without overwhelming complexity.

## 🏗️ System Components

### **1. Database Schema**
- Added `userSettings String?` field to User model
- Stores JSON configuration for user preferences
- Default settings applied when user has no saved settings

### **2. API Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/user/settings` | Get user settings and profile | ✅ |
| `PUT` | `/api/user/settings` | Update user settings | ✅ |
| `PUT` | `/api/user/profile` | Update profile (email, phone) | ✅ |
| `PUT` | `/api/user/password` | Change password | ✅ |

### **3. Settings Structure**

```json
{
  "notifications": {
    "email": true,
    "sms": true
  }
}
```

## 🔧 Implementation Details

### **UserSettingsService Methods**

- `getUserSettings(userId)` - Retrieve user settings with defaults
- `updateUserSettings(userId, settingsData)` - Update user preferences
- `updateProfile(userId, profileData)` - Update email/phone
- `changePassword(userId, currentPassword, newPassword)` - Secure password change
- `getDefaultSettings()` - Return default settings
- `validateSettings(settingsData)` - Validate and sanitize settings

### **Default Settings**
```json
{
  "notifications": {
    "email": true,
    "sms": true
  }
}
```

## 📱 Frontend Components

### **Settings Page Structure**
```jsx
const SettingsPage = () => {
  return (
    <div className="settings-page">
      {/* Profile Info Section */}
      <div className="profile-section">
        <h3>Profile Info</h3>
        <input value={profile.username} readOnly />
        <input value={profile.email} onChange={handleEmailChange} />
        <input value={profile.phone} onChange={handlePhoneChange} />
        <button onClick={saveProfile}>Save Changes</button>
      </div>

      {/* Change Password Section */}
      <div className="password-section">
        <h3>Change Password</h3>
        <input type="password" placeholder="Current Password" />
        <input type="password" placeholder="New Password" />
        <input type="password" placeholder="Confirm New Password" />
        <button onClick={updatePassword}>Update Password</button>
      </div>

      {/* Notifications Section */}
      <div className="notifications-section">
        <h3>Notifications</h3>
        <label>
          <input type="checkbox" checked={settings.notifications.email} />
          Email notifications
        </label>
        <label>
          <input type="checkbox" checked={settings.notifications.sms} />
          SMS notifications
        </label>
      </div>


      {/* Logout Button */}
      <button onClick={logout} className="logout-btn">Logout</button>
    </div>
  );
};
```

## 🧪 API Testing Examples

### **Get User Settings**
```http
GET /api/user/settings
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "phone": "+233123456789"
    },
    "settings": {
      "notifications": {
        "email": true,
        "sms": true
      }
    }
  }
}
```

### **Update Settings**
```http
PUT /api/user/settings
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "notifications": {
    "email": false,
    "sms": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": {
      "notifications": {
        "email": false,
        "sms": true
      }
    }
  }
}
```

### **Update Profile**
```http
PUT /api/user/profile
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "phone": "+233987654321"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "newemail@example.com",
      "username": "username",
      "phone": "+233987654321"
    }
  }
}
```

### **Change Password**
```http
PUT /api/user/password
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
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

## 🔒 Security Features

- **Authentication Required** - All endpoints require valid JWT token
- **Password Validation** - Current password verification before change
- **Input Validation** - Settings data validation and sanitization
- **Unique Constraints** - Email and phone uniqueness checks
- **Password Hashing** - Bcrypt with salt rounds for password security

## 🎨 Frontend Integration

### **State Management**
```javascript
const [settings, setSettings] = useState({
  notifications: { email: true, sms: true }
});

const [profile, setProfile] = useState({
  username: '',
  email: '',
  phone: ''
});
```

### **API Calls**
```javascript
// Get settings
const fetchSettings = async () => {
  const response = await fetch('/api/user/settings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  setSettings(data.data.settings);
  setProfile(data.data.user);
};

// Update settings
const updateSettings = async (newSettings) => {
  const response = await fetch('/api/user/settings', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newSettings)
  });
  return response.json();
};
```

## ✅ Features Implemented

- ✅ **Profile Info** - Display and edit email/phone
- ✅ **Change Password** - Secure password update
- ✅ **Notifications** - Simple email/SMS toggles
- ✅ **Logout Button** - Simple logout functionality
- ✅ **Database Integration** - JSON settings storage
- ✅ **API Endpoints** - RESTful user settings API
- ✅ **Security** - Authentication and validation
- ✅ **Default Settings** - Fallback configuration

## 🚀 Next Steps

1. **Frontend Implementation** - Create React components
2. **Notification System** - Implement email/SMS notification logic
3. **Additional Settings** - Add more user preferences as needed
4. **Settings Import/Export** - Allow users to backup/restore settings

## 📝 Notes

- Settings are stored as JSON in the database for flexibility
- Default settings are applied when user has no saved preferences
- All settings updates are validated before saving
- Profile updates check for email/phone uniqueness
- Password changes require current password verification
- System is designed to be minimal and user-friendly

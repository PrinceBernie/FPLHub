const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

class UserSettingsService {
  // Get user settings
  static async getUserSettings(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        userSettings: true
      }
    });

    if (!user) throw new Error('User not found');

    const settings = user.userSettings ? JSON.parse(user.userSettings) : this.getDefaultSettings();

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          phone: user.phone
        },
        settings: settings
      }
    };
  }

  // Update user settings
  static async updateUserSettings(userId, settingsData) {
    const validatedSettings = this.validateSettings(settingsData);
    
    await prisma.user.update({
      where: { id: userId },
      data: { userSettings: JSON.stringify(validatedSettings) }
    });

    return {
      success: true,
      message: 'Settings updated successfully',
      data: { settings: validatedSettings }
    };
  }

  // Update profile (email only - phone requires OTP verification)
  static async updateProfile(userId, profileData) {
    const updateData = {};
    
    if (profileData.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email: profileData.email, id: { not: userId } }
      });
      if (existingUser) throw new Error('Email already taken');
      updateData.email = profileData.email;
    }
    
    // Phone changes require OTP verification - use initiatePhoneChange instead
    if (profileData.phone) {
      throw new Error('Phone number changes require OTP verification. Use the phone change endpoint.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, username: true, phone: true }
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    };
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) throw new Error('Current password is incorrect');

    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  // Get default settings
  static getDefaultSettings() {
    return {
      notifications: {
        email: true,
        sms: true
      }
    };
  }

  // Validate settings
  static validateSettings(settingsData) {
    const validated = {};
    
    if (settingsData.notifications) {
      validated.notifications = {};
      if (typeof settingsData.notifications.email === 'boolean') {
        validated.notifications.email = settingsData.notifications.email;
      }
      if (typeof settingsData.notifications.sms === 'boolean') {
        validated.notifications.sms = settingsData.notifications.sms;
      }
    }
    
    return validated;
  }

  // Initiate phone number change with OTP
  static async initiatePhoneChange(userId, newPhoneNumber) {
    try {
      // Validate phone number format
      if (!newPhoneNumber || !/^\+233[235679][0-9]{8}$/.test(newPhoneNumber)) {
        throw new Error('Invalid phone number format. Must be a valid Ghana number starting with +233');
      }

      // Check if phone number is already taken
      const existingUser = await prisma.user.findFirst({
        where: { phone: newPhoneNumber, id: { not: userId } }
      });
      if (existingUser) {
        throw new Error('Phone number is already in use by another account');
      }

      // Check if user is trying to change to the same number
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
      });
      if (currentUser.phone === newPhoneNumber) {
        throw new Error('New phone number must be different from current number');
      }

      // Generate OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP and new phone number
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneChangeOtp: otpCode,
          phoneChangeOtpExpires: otpExpires,
          newPhoneNumber: newPhoneNumber
        }
      });

      // TODO: Send OTP via SMS to new phone number
      // This would integrate with your SMS service
      console.log(`Phone change OTP for ${newPhoneNumber}: ${otpCode}`);

      return {
        success: true,
        message: 'OTP sent to new phone number',
        data: {
          newPhoneNumber: newPhoneNumber,
          expiresIn: 10 // minutes
        }
      };
    } catch (error) {
      console.error('Phone change initiation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify phone change OTP and update phone number
  static async verifyPhoneChangeOtp(userId, otpCode) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          phoneChangeOtp: true,
          phoneChangeOtpExpires: true,
          newPhoneNumber: true,
          phone: true
        }
      });

      if (!user.phoneChangeOtp || !user.newPhoneNumber) {
        throw new Error('No pending phone change request found');
      }

      if (user.phoneChangeOtpExpires < new Date()) {
        // Clear expired OTP
        await prisma.user.update({
          where: { id: userId },
          data: {
            phoneChangeOtp: null,
            phoneChangeOtpExpires: null,
            newPhoneNumber: null
          }
        });
        throw new Error('OTP has expired. Please request a new one');
      }

      if (user.phoneChangeOtp !== otpCode) {
        throw new Error('Invalid OTP code');
      }

      // Update phone number and clear OTP data
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phone: user.newPhoneNumber,
          phoneChangeOtp: null,
          phoneChangeOtpExpires: null,
          newPhoneNumber: null
        },
        select: { id: true, email: true, username: true, phone: true }
      });

      return {
        success: true,
        message: 'Phone number updated successfully',
        data: { user: updatedUser }
      };
    } catch (error) {
      console.error('Phone change verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cancel pending phone change
  static async cancelPhoneChange(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneChangeOtp: null,
          phoneChangeOtpExpires: null,
          newPhoneNumber: null
        }
      });

      return {
        success: true,
        message: 'Phone change request cancelled'
      };
    } catch (error) {
      console.error('Phone change cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get pending phone change status
  static async getPhoneChangeStatus(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          phoneChangeOtp: true,
          phoneChangeOtpExpires: true,
          newPhoneNumber: true
        }
      });

      const hasPendingChange = !!(user.phoneChangeOtp && user.newPhoneNumber);
      const isExpired = hasPendingChange && user.phoneChangeOtpExpires < new Date();

      return {
        success: true,
        data: {
          hasPendingChange,
          isExpired,
          newPhoneNumber: hasPendingChange ? user.newPhoneNumber : null,
          expiresAt: hasPendingChange ? user.phoneChangeOtpExpires : null
        }
      };
    } catch (error) {
      console.error('Phone change status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = UserSettingsService;

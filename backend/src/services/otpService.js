// File: fpl-hub-backend/src/services/otpService.js
// OTP service for phone verification

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

class OTPService {
  // Generate OTP code
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }

  // Send OTP to user's phone
  static async sendOTP(phone, userId) {
    try {
      const otpCode = this.generateOTP();
      const otpExpires = new Date(Date.now() + 300000); // 5 minutes expiry

      // Update user with OTP
      await prisma.user.update({
        where: { id: userId },
        data: {
          otpCode,
          otpExpires
        }
      });

      // TODO: Integrate with SMS service (Twilio, Africa's Talking, etc.)
      // await sendSMS(phone, `Your FPL Hub verification code is: ${otpCode}. Valid for 5 minutes.`);
      
      // Development mode: Log OTP to console for testing
      console.log('\n' + '='.repeat(60));
      console.log('🔐 DEVELOPMENT MODE - OTP FOR TESTING');
      console.log('='.repeat(60));
      console.log(`📱 Phone: ${phone}`);
      console.log(`🔑 OTP Code: ${otpCode}`);
      console.log(`⏰ Expires: ${otpExpires.toLocaleString()}`);
      console.log('='.repeat(60));
      console.log('💡 Use this OTP code to verify the user in the frontend');
      console.log('='.repeat(60) + '\n');

      return {
        success: true,
        message: 'OTP sent successfully',
        phone: phone,
        expiresIn: '5 minutes'
      };
    } catch (error) {
      console.error('OTPService.sendOTP error:', error);
      throw error;
    }
  }

  // Verify OTP code
  static async verifyOTP(phone, otpCode) {
    try {
      // Convert phone format if needed (frontend sends 9 digits, DB stores with +233 prefix)
      let formattedPhone = phone;
      if (phone.length === 9 && !phone.startsWith('+233')) {
        formattedPhone = `+233${phone}`;
      }
      
      const user = await prisma.user.findFirst({
        where: {
          phone: formattedPhone,
          otpCode,
          otpExpires: { gt: new Date() }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired OTP code');
      }

      // Mark user as verified and clear OTP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          otpCode: null,
          otpExpires: null
        }
      });

      // Initialize wallets for verified user
      const WalletService = require('./walletService');
      const bonusWalletService = require('./bonusWalletService');
      
      // Create main wallet
      await WalletService.getOrCreateWallet(user.id);
      
      // Create bonus wallet proactively for better UX
      await bonusWalletService.getBonusWallet(user.id);

      // Generate JWT token for automatic authentication
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      // Create session record for the token
      const SessionService = require('./sessionService');
      const sessionData = {
        userId: user.id,
        token: token,
        deviceInfo: 'Web Browser', // Default device info for OTP verification
        ipAddress: '127.0.0.1', // Default IP for OTP verification
        rememberMe: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };
      
      await SessionService.createSession(sessionData);

      return {
        success: true,
        message: 'Phone number verified successfully',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            phone: user.phone,
            isVerified: true,
            role: user.isAdmin ? (user.adminLevel || 'ADMIN') : 'USER'
          }
        }
      };
    } catch (error) {
      console.error('OTPService.verifyOTP error:', error);
      throw error;
    }
  }

  // Resend OTP
  static async resendOTP(phone) {
    try {
      const user = await prisma.user.findUnique({
        where: { phone }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isVerified) {
        throw new Error('User is already verified');
      }

      console.log(`\n🔄 Resending OTP for user: ${user.email || user.username} (${phone})`);
      return await this.sendOTP(phone, user.id);
    } catch (error) {
      console.error('OTPService.resendOTP error:', error);
      throw error;
    }
  }

  // Clean up expired OTPs
  static async cleanupExpiredOTPs() {
    try {
      const result = await prisma.user.updateMany({
        where: {
          otpExpires: { lt: new Date() },
          otpCode: { not: null }
        },
        data: {
          otpCode: null,
          otpExpires: null
        }
      });

      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired OTPs`);
      }

      return result;
    } catch (error) {
      console.error('OTPService.cleanupExpiredOTPs error:', error);
      throw error;
    }
  }

  // Check if user has valid OTP
  static async hasValidOTP(phone) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          phone,
          otpCode: { not: null },
          otpExpires: { gt: new Date() }
        }
      });

      return !!user;
    } catch (error) {
      console.error('OTPService.hasValidOTP error:', error);
      return false;
    }
  }
}

module.exports = OTPService;

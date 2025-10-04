// File: fpl-hub-backend/src/services/passwordResetService.js
// Password reset service for forgot password functionality

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

class PasswordResetService {
  // Generate password reset token
  static async generateResetToken(email) {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour expiry

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        }
      });

      // TODO: Integrate with email service (SendGrid, Nodemailer, etc.)
      // await sendPasswordResetEmail(email, resetToken, user.username);
      console.log(`🔑 Password reset email for ${email}: http://localhost:3000/reset-password?token=${resetToken}`);

      return {
        success: true,
        message: 'Password reset email sent successfully',
        email: email
      };
    } catch (error) {
      console.error('PasswordResetService.generateResetToken error:', error);
      throw error;
    }
  }

  // Validate reset token
  static async validateResetToken(token) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      return user;
    } catch (error) {
      console.error('PasswordResetService.validateResetToken error:', error);
      throw error;
    }
  }

  // Reset password with token
  static async resetPassword(token, newPassword) {
    try {
      // Validate token
      const user = await this.validateResetToken(token);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      // Deactivate all existing sessions for security
      await prisma.session.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false }
      });

      return {
        success: true,
        message: 'Password reset successfully',
        userId: user.id
      };
    } catch (error) {
      console.error('PasswordResetService.resetPassword error:', error);
      throw error;
    }
  }

  // Clean up expired reset tokens
  static async cleanupExpiredTokens() {
    try {
      const result = await prisma.user.updateMany({
        where: {
          passwordResetExpires: { lt: new Date() },
          passwordResetToken: { not: null }
        },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired password reset tokens`);
      }

      return result;
    } catch (error) {
      console.error('PasswordResetService.cleanupExpiredTokens error:', error);
      throw error;
    }
  }
}

module.exports = PasswordResetService;

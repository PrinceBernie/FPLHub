// File: fpl-hub-backend/src/routes/authRoutes.js
// Authentication routes for register and login

const express = require('express');
const router = express.Router();
const { UserService } = require('../services/databaseService');
const { authMiddleware } = require('../middleware/auth');
const SessionService = require('../services/sessionService');
const PasswordResetService = require('../services/passwordResetService');
const OTPService = require('../services/otpService');
const jwt = require('jsonwebtoken');

// Import validation middleware
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateOTPVerification 
} = require('../middleware/validation');

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { email, username, password, confirmPassword, phone, consentGiven } = req.body;
    
    // Validate input
    if (!email || !username || !password || !confirmPassword || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, password, confirm password, and phone number are required'
      });
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password and confirm password do not match'
      });
    }

    // Consent validation
    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the Terms & Conditions and confirm you are at least 18 years old'
      });
    }
    
    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
                 // Ghanaian phone number validation - expect 9 digits only
             const phoneRegex = /^[235679][0-9]{8}$/;
             if (!phoneRegex.test(phone)) {
               return res.status(400).json({
                 success: false,
                 error: 'Invalid phone number. Must be 9 digits starting with 2, 3, 5, 6, 7, or 9'
               });
             }
             
             // Format phone number with +233 prefix
             const formattedPhone = `+233${phone}`;
             console.log('Phone validation:', { original: phone, formatted: formattedPhone, isValid: phoneRegex.test(phone) });
    
    // Username validation (alphanumeric, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-30 characters, alphanumeric and underscores only'
      });
    }
    
    // Create user
    try {
      const user = await UserService.createUser({
        email,
        username,
        password,
          phone: formattedPhone,
          consentGiven
      });
        
        // Send OTP to phone number
        const otpResult = await OTPService.sendOTP(formattedPhone, user.id);
      
      res.status(201).json({
        success: true,
          message: 'User registered successfully. Please verify your phone number with OTP to complete registration.',
          data: { 
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              phone: user.phone,
              isVerified: user.isVerified,
              isActive: user.isActive,
              consentGiven: user.consentGiven,
              isAdmin: user.isAdmin,
              adminLevel: user.adminLevel,
              adminPermissions: user.adminPermissions,
              twoFactorEnabled: user.twoFactorEnabled,
              lastAdminAction: user.lastAdminAction,
              isBanned: user.isBanned,
              banReason: user.banReason,
              banExpires: user.banExpires,
              banIssuedBy: user.banIssuedBy,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            },
            requiresVerification: true,
            message: 'Check your phone for OTP to complete registration',
            otpInfo: {
              phone: formattedPhone,
              expiresIn: '5 minutes'
            }
          }
      });
    } catch (createError) {
      console.error('User creation error:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('Registration error:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

// Login user
router.post('/login', validateUserLogin, async (req, res) => {
  const startTime = Date.now();
  try {
    const { email, username, password } = req.body;
    
    // Get identifier (either email or username)
    const identifier = email || username;
    
    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/username and password are required'
      });
    }
    
    // Login user
    const result = await UserService.loginUser(identifier, password);
    
    // Check if user's phone is verified
    if (!result.user.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Phone number not verified. Please verify your phone number with OTP before logging in.',
        requiresVerification: true,
        userId: result.user.id,
        userData: {
          email: result.user.email,
          username: result.user.username,
          phone: result.user.phone
        }
      });
    }
    
    // Check session limits and enforce if necessary - OPTIMIZED: Single query
    const sessionLimit = await SessionService.checkAndEnforceSessionLimit(result.user.id);
    
    // Generate JWT token with appropriate expiry
    const rememberMe = req.body.rememberMe === true;
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const token = jwt.sign(
      { userId: result.user.id, email: result.user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: tokenExpiry }
    );
    
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));
    
    // Create session record
    const sessionData = {
      userId: result.user.id,
      token,
      deviceInfo: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown IP',
      rememberMe,
      expiresAt
    };
    
    await SessionService.createSession(sessionData);
    
    const endTime = Date.now();
    const loginTime = endTime - startTime;
    
    console.log(`🚀 Login completed in ${loginTime}ms for user: ${identifier}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          ...result.user,
          sessionInfo: {
            currentSessions: sessionLimit.currentCount + 1,
            maxSessions: sessionLimit.maxAllowed,
            rememberMe
          }
        }
      }
    });
  } catch (error) {
    const endTime = Date.now();
    const loginTime = endTime - startTime;
    console.error(`❌ Login failed after ${loginTime}ms:`, error.message);
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Login failed',
      detail: error && error.message ? error.message : 'Unknown error'
    });
  }
});

// Get current user (protected route)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserService.getUserById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Verify token
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      userId: req.userId,
      email: req.userEmail
    }
  });
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Convert phone format if needed (frontend sends 9 digits, DB stores with +233 prefix)
    let formattedPhone = phone;
    if (phone.length === 9 && !phone.startsWith('+233')) {
      formattedPhone = `+233${phone}`;
    }
    
    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'User is already verified'
      });
    }
    
    // Send OTP
    const result = await OTPService.sendOTP(phone, user.id);
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

// Verify OTP (no auth required - for new registrations)
router.post('/verify-otp', validateOTPVerification, async (req, res) => {
  try {
    const { phone, otpCode } = req.body;
    
    if (!phone || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP code are required'
      });
    }

// Verify OTP
    const result = await OTPService.verifyOTP(phone, otpCode);
    
    res.json({
      success: true,
      message: 'Phone number verified successfully! You can now log in to your account.',
      data: result.data // Return the inner data object directly
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code. Please request a new OTP.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

// Resend OTP for unverified users
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Get user and verify they exist and are unverified
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'User is already verified'
      });
    }
    
    // Resend OTP
    const result = await OTPService.resendOTP(user.phone);
    
    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: result
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  }
});

// Check verification status
router.get('/verification-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        isVerified: user.isVerified,
        email: user.email,
        message: user.isVerified ? 'User is verified' : 'User is not verified'
      }
    });
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check verification status'
    });
  }
});

// Get user's active sessions
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const sessions = await SessionService.getUserActiveSessions(userId);
    
    res.json({
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        lastActive: session.lastActive,
        rememberMe: session.rememberMe,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
});

// Get user's device summary
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const deviceSummary = await SessionService.getUserDeviceSummary(userId);
    
    res.json({
      success: true,
      data: deviceSummary
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get device summary'
    });
  }
});

// Deactivate a specific session
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionId } = req.params;
    
    // Verify the session belongs to the user
    const session = await SessionService.getSessionByToken(req.headers.authorization?.split(' ')[1]);
    if (!session || session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await SessionService.deactivateSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate session'
    });
  }
});

// Deactivate all sessions (logout from all devices)
router.delete('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    await SessionService.deactivateAllUserSessions(userId);
    
    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices'
    });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const result = await PasswordResetService.generateResetToken(email);
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
      data: result
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Don't reveal if user exists or not for security
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, new password, and confirm password are required'
      });
    }

    // Confirm password validation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password and confirm password do not match'
      });
    }

    // Password strength check
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const result = await PasswordResetService.resetPassword(token, newPassword);
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      data: result
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Logout current session
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await SessionService.deactivateSession(token);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const UserSettingsService = require('../services/userSettingsService');

// Get user settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const result = await UserSettingsService.getUserSettings(req.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const result = await UserSettingsService.updateUserSettings(req.userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await UserSettingsService.updateProfile(req.userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await UserSettingsService.changePassword(req.userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initiate phone number change with OTP
router.post('/phone/change', authMiddleware, async (req, res) => {
  try {
    const { newPhoneNumber } = req.body;
    
    if (!newPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'New phone number is required'
      });
    }

    const result = await UserSettingsService.initiatePhoneChange(req.userId, newPhoneNumber);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify phone change OTP
router.post('/phone/verify', authMiddleware, async (req, res) => {
  try {
    const { otpCode } = req.body;
    
    if (!otpCode) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required'
      });
    }

    const result = await UserSettingsService.verifyPhoneChangeOtp(req.userId, otpCode);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel pending phone change
router.delete('/phone/change', authMiddleware, async (req, res) => {
  try {
    const result = await UserSettingsService.cancelPhoneChange(req.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get phone change status
router.get('/phone/status', authMiddleware, async (req, res) => {
  try {
    const result = await UserSettingsService.getPhoneChangeStatus(req.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

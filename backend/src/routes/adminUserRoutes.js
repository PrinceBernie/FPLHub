// File: fpl-hub-backend/src/routes/adminUserRoutes.js
// Admin User Management Routes

const express = require('express');
const router = express.Router();
const { adminAuthMiddleware, isSuperAdmin, isAdmin } = require('../middleware/adminAuth');
const AdminUserService = require('../services/adminUserService');

// ============================================================================
// ADMIN USER CREATION ROUTES (Super Admin Only)
// ============================================================================

/**
 * @route   POST /api/admin/users/create-admin
 * @desc    Create a new admin user
 * @access  Super Admin
 */
router.post('/create-admin', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { email, username, password, phone, role } = req.body;

    // Validate required fields
    if (!email || !username || !password || !phone || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, password, phone, and role are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const result = await AdminUserService.createAdminUser({
      email,
      username,
      password,
      phone,
      role
    }, req.userId);

    res.status(201).json(result);
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create admin user'
    });
  }
});

/**
 * @route   POST /api/admin/users/promote
 * @desc    Promote existing user to admin role
 * @access  Super Admin
 */
router.post('/promote', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;

    if (!targetUserId || !newRole) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID and new role are required'
      });
    }

    const result = await AdminUserService.promoteUserToAdmin(targetUserId, newRole, req.userId);
    
    res.json(result);
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to promote user'
    });
  }
});

/**
 * @route   POST /api/admin/users/demote
 * @desc    Demote admin user to regular user
 * @access  Super Admin
 */
router.post('/demote', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }

    const result = await AdminUserService.demoteAdminToUser(targetUserId, req.userId);
    
    res.json(result);
  } catch (error) {
    console.error('Demote user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to demote user'
    });
  }
});

// ============================================================================
// ADMIN USER LISTING ROUTES (Admin+ Only)
// ============================================================================

/**
 * @route   GET /api/admin/users/admins
 * @desc    Get all admin users
 * @access  Admin+
 */
router.get('/admins', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const adminUsers = await AdminUserService.getAllAdminUsers(req.userId);
    
    res.json({
      success: true,
      data: adminUsers
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get admin users'
    });
  }
});

module.exports = router;


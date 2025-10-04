// File: fpl-hub-backend/src/routes/adminRbacRoutes.js
// Admin RBAC management routes

const express = require('express');
const router = express.Router();
const { adminAuthMiddleware, isSuperAdmin, isAdmin, isModerator } = require('../middleware/adminAuth');
const RBACService = require('../services/rbacService');

// ============================================================================
// ROLE MANAGEMENT ROUTES (Super Admin Only)
// ============================================================================

/**
 * @route   GET /api/admin/rbac/roles
 * @desc    Get role hierarchy and permissions
 * @access  Super Admin
 */
router.get('/roles', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const hierarchy = RBACService.getRoleHierarchy();
    
    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get role hierarchy'
    });
  }
});

/**
 * @route   GET /api/admin/rbac/users
 * @desc    Get all users with their roles
 * @access  Moderator+
 */
router.get('/users', adminAuthMiddleware, isModerator, async (req, res) => {
  try {
    const users = await RBACService.getAllUsersWithRoles(req.userId);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users with roles error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users'
    });
  }
});

/**
 * @route   POST /api/admin/rbac/assign-role
 * @desc    Assign role to user
 * @access  Super Admin
 */
router.post('/assign-role', adminAuthMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;

    if (!targetUserId || !newRole) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID and new role are required'
      });
    }

    const result = await RBACService.assignRole(req.userId, targetUserId, newRole);
    
    res.json(result);
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign role'
    });
  }
});

/**
 * @route   GET /api/admin/rbac/user/:userId/role
 * @desc    Get specific user's role information
 * @access  Moderator+
 */
router.get('/user/:userId/role', adminAuthMiddleware, isModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = await RBACService.getUserRole(userId);
    
    if (!userRole) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: userRole
    });
  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user role'
    });
  }
});

/**
 * @route   POST /api/admin/rbac/check-permission
 * @desc    Check if user has specific permission
 * @access  Admin+
 */
router.post('/check-permission', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId, permission } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({
        success: false,
        error: 'User ID and permission are required'
      });
    }

    const hasPermission = await RBACService.hasPermission(userId, permission);
    
    res.json({
      success: true,
      data: {
        userId,
        permission,
        hasPermission
      }
    });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check permission'
    });
  }
});

/**
 * @route   POST /api/admin/rbac/check-role-level
 * @desc    Check if user meets minimum role level
 * @access  Admin+
 */
router.post('/check-role-level', adminAuthMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId, requiredRole } = req.body;

    if (!userId || !requiredRole) {
      return res.status(400).json({
        success: false,
        error: 'User ID and required role are required'
      });
    }

    const hasRoleLevel = await RBACService.hasRoleLevel(userId, requiredRole);
    
    res.json({
      success: true,
      data: {
        userId,
        requiredRole,
        hasRoleLevel
      }
    });
  } catch (error) {
    console.error('Check role level error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check role level'
    });
  }
});

module.exports = router;

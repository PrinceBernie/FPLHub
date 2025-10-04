// File: fpl-hub-backend/src/services/rbacService.js
// Role-Based Access Control Service

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RBACService {
  
  // Role hierarchy levels
  static ROLE_LEVELS = {
    'USER': 0,
    'MODERATOR': 1,
    'ADMIN': 2,
    'SUPER_ADMIN': 3
  };

  // Permission definitions by role
  static ROLE_PERMISSIONS = {
    'USER': [
      'register',
      'login',
      'link_fpl_teams',
      'join_flagship_leagues',
      'create_leagues',
      'manage_personal_wallet',
      'view_personal_data',
      'update_profile'
    ],
    'MODERATOR': [
      // All USER permissions
      'register',
      'login',
      'link_fpl_teams',
      'join_flagship_leagues',
      'create_leagues',
      'manage_personal_wallet',
      'view_personal_data',
      'update_profile',
      // Moderator specific permissions
      'view_all_users',
      'view_all_leagues',
      'view_transaction_logs',
      'view_suspicious_activity',
      'respond_support_tickets',
      'flag_content'
    ],
    'ADMIN': [
      // All MODERATOR permissions
      'register',
      'login',
      'link_fpl_teams',
      'join_flagship_leagues',
      'create_leagues',
      'manage_personal_wallet',
      'view_personal_data',
      'update_profile',
      'view_all_users',
      'view_all_leagues',
      'view_transaction_logs',
      'view_suspicious_activity',
      'respond_support_tickets',
      'flag_content',
      // Admin specific permissions
      'manage_all_leagues',
      'create_official_leagues',
      'approve_reject_leagues',
      'ban_unban_users',
      'reset_user_access',
      'approve_withdrawals',
      'approve_refunds',
      'view_analytics',
      'view_revenue_dashboards'
    ],
    'SUPER_ADMIN': [
      // All ADMIN permissions
      'register',
      'login',
      'link_fpl_teams',
      'join_flagship_leagues',
      'create_leagues',
      'manage_personal_wallet',
      'view_personal_data',
      'update_profile',
      'view_all_users',
      'view_all_leagues',
      'view_transaction_logs',
      'view_suspicious_activity',
      'respond_support_tickets',
      'flag_content',
      'manage_all_leagues',
      'create_official_leagues',
      'approve_reject_leagues',
      'ban_unban_users',
      'reset_user_access',
      'approve_withdrawals',
      'approve_refunds',
      'view_analytics',
      'view_revenue_dashboards',
      // Super Admin specific permissions
      'assign_revoke_roles',
      'configure_payment_gateway',
      'configure_api_keys',
      'configure_feature_toggles',
      'view_audit_logs',
      'emergency_overrides',
      'force_payouts',
      'disable_leagues',
      'freeze_wallets'
    ]
  };

  /**
   * Get user's role level
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User role information
   */
  static async getUserRole(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          adminLevel: true,
          adminPermissions: true,
          isActive: true,
          isBanned: true
        }
      });

      if (!user) {
        return null;
      }

      const role = user.isAdmin ? user.adminLevel : 'USER';
      const permissions = this.getRolePermissions(role);

      return {
        userId: user.id,
        email: user.email,
        role: role,
        level: this.ROLE_LEVELS[role] || 0,
        permissions: permissions,
        isActive: user.isActive,
        isBanned: user.isBanned
      };
    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;
    }
  }

  /**
   * Get permissions for a specific role
   * @param {string} role - Role name
   * @returns {Array} Array of permissions
   */
  static getRolePermissions(role) {
    return this.ROLE_PERMISSIONS[role] || this.ROLE_PERMISSIONS['USER'];
  }

  /**
   * Check if user has specific permission
   * @param {string} userId - User ID
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} True if user has permission
   */
  static async hasPermission(userId, permission) {
    try {
      const userRole = await this.getUserRole(userId);
      if (!userRole || userRole.isBanned || !userRole.isActive) {
        return false;
      }

      return userRole.permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has minimum role level
   * @param {string} userId - User ID
   * @param {string} requiredRole - Required role level
   * @returns {Promise<boolean>} True if user meets role requirement
   */
  static async hasRoleLevel(userId, requiredRole) {
    try {
      const userRole = await this.getUserRole(userId);
      if (!userRole || userRole.isBanned || !userRole.isActive) {
        return false;
      }

      const userLevel = userRole.level;
      const requiredLevel = this.ROLE_LEVELS[requiredRole] || 0;

      return userLevel >= requiredLevel;
    } catch (error) {
      console.error('Error checking role level:', error);
      return false;
    }
  }

  /**
   * Assign role to user (Super Admin only)
   * @param {string} adminUserId - Admin user ID (must be Super Admin)
   * @param {string} targetUserId - Target user ID
   * @param {string} newRole - New role to assign
   * @returns {Promise<Object>} Result of role assignment
   */
  static async assignRole(adminUserId, targetUserId, newRole) {
    try {
      // Check if admin is Super Admin
      const adminRole = await this.getUserRole(adminUserId);
      if (!adminRole || adminRole.role !== 'SUPER_ADMIN') {
        throw new Error('Only Super Admins can assign roles');
      }

      // Validate role
      if (!this.ROLE_LEVELS[newRole]) {
        throw new Error('Invalid role specified');
      }

      // Update user role
      const isAdmin = newRole !== 'USER';
      const adminLevel = isAdmin ? newRole : 'USER';
      const adminPermissions = isAdmin ? JSON.stringify(this.getRolePermissions(newRole)) : null;

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isAdmin: isAdmin,
          adminLevel: adminLevel,
          adminPermissions: adminPermissions
        }
      });

      return {
        success: true,
        message: `Role assigned successfully: ${newRole}`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: newRole,
          isAdmin: isAdmin
        }
      };
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Get all users with their roles (Admin+ only)
   * @param {string} requesterUserId - User requesting the list
   * @returns {Promise<Array>} Array of users with roles
   */
  static async getAllUsersWithRoles(requesterUserId) {
    try {
      // Check if requester has permission
      const hasPermission = await this.hasRoleLevel(requesterUserId, 'MODERATOR');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view user roles');
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          isAdmin: true,
          adminLevel: true,
          isActive: true,
          isBanned: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.isAdmin ? user.adminLevel : 'USER',
        isActive: user.isActive,
        isBanned: user.isBanned,
        createdAt: user.createdAt
      }));
    } catch (error) {
      console.error('Error getting users with roles:', error);
      throw error;
    }
  }

  /**
   * Get role hierarchy information
   * @returns {Object} Role hierarchy and permissions
   */
  static getRoleHierarchy() {
    return {
      levels: this.ROLE_LEVELS,
      permissions: this.ROLE_PERMISSIONS
    };
  }
}

module.exports = RBACService;

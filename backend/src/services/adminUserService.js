// File: fpl-hub-backend/src/services/adminUserService.js
// Admin User Management Service

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const RBACService = require('./rbacService');

const prisma = new PrismaClient();

class AdminUserService {

  /**
   * Create a new admin user (Super Admin only)
   * @param {Object} adminData - Admin user data
   * @param {string} adminData.email - Admin email
   * @param {string} adminData.username - Admin username
   * @param {string} adminData.password - Admin password
   * @param {string} adminData.phone - Admin phone number
   * @param {string} adminData.role - Admin role (MODERATOR, ADMIN, SUPER_ADMIN)
   * @param {string} creatorUserId - ID of the Super Admin creating this user
   * @returns {Promise<Object>} Created admin user
   */
  static async createAdminUser(adminData, creatorUserId) {
    try {
      // Verify creator is Super Admin
      const creatorRole = await RBACService.getUserRole(creatorUserId);
      if (!creatorRole || creatorRole.role !== 'SUPER_ADMIN') {
        throw new Error('Only Super Admins can create admin users');
      }

      // Validate role
      const validRoles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
      if (!validRoles.includes(adminData.role)) {
        throw new Error('Invalid admin role. Must be MODERATOR, ADMIN, or SUPER_ADMIN');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: adminData.email },
            { username: adminData.username },
            { phone: adminData.phone }
          ]
        }
      });

      if (existingUser) {
        throw new Error('User with this email, username, or phone already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 12);

      // Get permissions for the role
      const permissions = RBACService.getRolePermissions(adminData.role);

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: adminData.email,
          username: adminData.username,
          password: hashedPassword,
          phone: adminData.phone,
          isVerified: true, // Admin users are pre-verified
          isActive: true,
          consentGiven: true,
          isAdmin: true,
          adminLevel: adminData.role,
          adminPermissions: JSON.stringify(permissions)
        }
      });

      // Initialize wallets for admin user
      const WalletService = require('./walletService');
      const bonusWalletService = require('./bonusWalletService');
      
      await WalletService.getOrCreateWallet(adminUser.id);
      await bonusWalletService.getBonusWallet(adminUser.id);

      // Log admin action
      await this.logAdminAction(creatorUserId, 'CREATE_ADMIN_USER', adminUser.id, 'USER', {
        createdRole: adminData.role,
        createdEmail: adminData.email
      });

      return {
        success: true,
        message: `${adminData.role} user created successfully`,
        data: {
          id: adminUser.id,
          email: adminUser.email,
          username: adminUser.username,
          role: adminData.role,
          isActive: adminUser.isActive,
          createdAt: adminUser.createdAt
        }
      };

    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Promote existing user to admin role (Super Admin only)
   * @param {string} targetUserId - User ID to promote
   * @param {string} newRole - New admin role
   * @param {string} promoterUserId - ID of the Super Admin promoting
   * @returns {Promise<Object>} Promotion result
   */
  static async promoteUserToAdmin(targetUserId, newRole, promoterUserId) {
    try {
      // Verify promoter is Super Admin
      const promoterRole = await RBACService.getUserRole(promoterUserId);
      if (!promoterRole || promoterRole.role !== 'SUPER_ADMIN') {
        throw new Error('Only Super Admins can promote users to admin roles');
      }

      // Validate role
      const validRoles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Invalid admin role. Must be MODERATOR, ADMIN, or SUPER_ADMIN');
      }

      // Get target user
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser) {
        throw new Error('Target user not found');
      }

      if (!targetUser.isVerified) {
        throw new Error('User must be verified before promotion to admin');
      }

      // Get permissions for the role
      const permissions = RBACService.getRolePermissions(newRole);

      // Update user to admin
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isAdmin: true,
          adminLevel: newRole,
          adminPermissions: JSON.stringify(permissions)
        }
      });

      // Log admin action
      await this.logAdminAction(promoterUserId, 'PROMOTE_TO_ADMIN', targetUserId, 'USER', {
        newRole: newRole,
        previousRole: targetUser.isAdmin ? targetUser.adminLevel : 'USER'
      });

      return {
        success: true,
        message: `User promoted to ${newRole} successfully`,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          role: newRole,
          isActive: updatedUser.isActive
        }
      };

    } catch (error) {
      console.error('Error promoting user to admin:', error);
      throw error;
    }
  }

  /**
   * Demote admin user to regular user (Super Admin only)
   * @param {string} targetUserId - Admin user ID to demote
   * @param {string} demoterUserId - ID of the Super Admin demoting
   * @returns {Promise<Object>} Demotion result
   */
  static async demoteAdminToUser(targetUserId, demoterUserId) {
    try {
      // Verify demoter is Super Admin
      const demoterRole = await RBACService.getUserRole(demoterUserId);
      if (!demoterRole || demoterRole.role !== 'SUPER_ADMIN') {
        throw new Error('Only Super Admins can demote admin users');
      }

      // Prevent self-demotion
      if (targetUserId === demoterUserId) {
        throw new Error('Cannot demote yourself');
      }

      // Get target user
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser) {
        throw new Error('Target user not found');
      }

      if (!targetUser.isAdmin) {
        throw new Error('User is not an admin');
      }

      // Update user to regular user
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isAdmin: false,
          adminLevel: 'USER',
          adminPermissions: null
        }
      });

      // Log admin action
      await this.logAdminAction(demoterUserId, 'DEMOTE_FROM_ADMIN', targetUserId, 'USER', {
        previousRole: targetUser.adminLevel,
        newRole: 'USER'
      });

      return {
        success: true,
        message: 'User demoted to regular user successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          role: 'USER',
          isActive: updatedUser.isActive
        }
      };

    } catch (error) {
      console.error('Error demoting admin user:', error);
      throw error;
    }
  }

  /**
   * Get all admin users (Admin+ only)
   * @param {string} requesterUserId - User requesting the list
   * @returns {Promise<Array>} List of admin users
   */
  static async getAllAdminUsers(requesterUserId) {
    try {
      // Check if requester has permission
      const hasPermission = await RBACService.hasRoleLevel(requesterUserId, 'ADMIN');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view admin users');
      }

      const adminUsers = await prisma.user.findMany({
        where: { isAdmin: true },
        select: {
          id: true,
          email: true,
          username: true,
          adminLevel: true,
          isActive: true,
          isBanned: true,
          lastAdminAction: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return adminUsers.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.adminLevel,
        isActive: user.isActive,
        isBanned: user.isBanned,
        lastAdminAction: user.lastAdminAction,
        createdAt: user.createdAt
      }));

    } catch (error) {
      console.error('Error getting admin users:', error);
      throw error;
    }
  }

  /**
   * Create initial Super Admin user (system initialization)
   * @param {Object} superAdminData - Super Admin data
   * @returns {Promise<Object>} Created Super Admin
   */
  static async createInitialSuperAdmin(superAdminData) {
    try {
      // Check if any Super Admin already exists
      const existingSuperAdmin = await prisma.user.findFirst({
        where: { 
          isAdmin: true,
          adminLevel: 'SUPER_ADMIN'
        }
      });

      if (existingSuperAdmin) {
        throw new Error('Super Admin already exists. Use promoteUserToAdmin instead.');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(superAdminData.password, 12);

      // Get Super Admin permissions
      const permissions = RBACService.getRolePermissions('SUPER_ADMIN');

      // Create Super Admin user
      const superAdmin = await prisma.user.create({
        data: {
          email: superAdminData.email,
          username: superAdminData.username,
          password: hashedPassword,
          phone: superAdminData.phone,
          isVerified: true,
          isActive: true,
          consentGiven: true,
          isAdmin: true,
          adminLevel: 'SUPER_ADMIN',
          adminPermissions: JSON.stringify(permissions)
        }
      });

      // Initialize wallets
      const WalletService = require('./walletService');
      const bonusWalletService = require('./bonusWalletService');
      
      await WalletService.getOrCreateWallet(superAdmin.id);
      await bonusWalletService.getBonusWallet(superAdmin.id);

      console.log('✅ Initial Super Admin created successfully!');
      console.log(`Email: ${superAdmin.email}`);
      console.log(`User ID: ${superAdmin.id}`);

      return {
        success: true,
        message: 'Initial Super Admin created successfully',
        data: {
          id: superAdmin.id,
          email: superAdmin.email,
          username: superAdmin.username,
          role: 'SUPER_ADMIN'
        }
      };

    } catch (error) {
      console.error('Error creating initial Super Admin:', error);
      throw error;
    }
  }

  /**
   * Log admin action
   * @param {string} adminUserId - Admin user ID
   * @param {string} action - Action performed
   * @param {string} targetId - Target ID
   * @param {string} targetType - Target type
   * @param {Object} details - Additional details
   */
  static async logAdminAction(adminUserId, action, targetId, targetType, details = null) {
    try {
      await prisma.adminAction.create({
        data: {
          adminUserId,
          action,
          targetId,
          targetType,
          details: details ? JSON.stringify(details) : null,
          timestamp: new Date()
        }
      });

      // Update last admin action timestamp
      await prisma.user.update({
        where: { id: adminUserId },
        data: { lastAdminAction: new Date() }
      });

    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw error for logging failures
    }
  }
}

module.exports = AdminUserService;


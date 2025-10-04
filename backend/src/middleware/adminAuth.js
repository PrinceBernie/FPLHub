// File: fpl-hub-backend/src/middleware/adminAuth.js
// Admin authentication middleware with role-based access control

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Admin authentication middleware
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Admin access token required'
      });
    }

    // Verify JWT token
    console.log('Admin auth - Token:', token.substring(0, 30) + '...');
    console.log('Admin auth - JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('Admin auth - Using fallback secret:', !process.env.JWT_SECRET);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.userId;
    console.log('Admin auth - Decoded userId:', userId);

    // Get user with admin details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        adminLevel: true,
        adminPermissions: true,
        isActive: true,
        isBanned: true,
        banExpires: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin token'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin account is deactivated'
      });
    }

    if (user.isBanned) {
      if (user.banExpires && new Date() < new Date(user.banExpires)) {
        return res.status(403).json({
          success: false,
          error: 'Admin account is temporarily banned',
          banExpires: user.banExpires
        });
      } else {
        // Ban expired, reactivate account
        await prisma.user.update({
          where: { id: userId },
          data: { isBanned: false, banReason: null, banExpires: null }
        });
      }
    }

    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Add admin info to request
    req.adminId = user.id;
    req.adminEmail = user.email;
    req.adminUsername = user.username;
    req.adminLevel = user.adminLevel;
    req.adminPermissions = user.adminPermissions ? JSON.parse(user.adminPermissions) : [];

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid admin token'
    });
  }
};

// Role-based access control middleware
const requireAdminLevel = (requiredLevel) => {
  const levelHierarchy = {
    'USER': 0,
    'MODERATOR': 1,
    'ADMIN': 2,
    'SUPER_ADMIN': 3
  };

  return (req, res, next) => {
    const userLevel = req.adminLevel || 'USER';
    const userLevelNum = levelHierarchy[userLevel] || 0;
    const requiredLevelNum = levelHierarchy[requiredLevel] || 0;

    if (userLevelNum < requiredLevelNum) {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${requiredLevel} level required.`
      });
    }

    next();
  };
};

// Permission-based access control middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    const permissions = req.adminPermissions || [];
    
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${permission} permission required.`
      });
    }

    next();
  };
};

// Convenience middleware functions for specific roles
const isUser = (req, res, next) => {
  const userLevel = req.adminLevel || 'USER';
  if (userLevel === 'USER') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied. User role required.'
  });
};

const isModerator = (req, res, next) => {
  const userLevel = req.adminLevel || 'USER';
  const levelHierarchy = { 'USER': 0, 'MODERATOR': 1, 'ADMIN': 2, 'SUPER_ADMIN': 3 };
  const userLevelNum = levelHierarchy[userLevel] || 0;
  
  if (userLevelNum >= 1) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied. Moderator level or higher required.'
  });
};

const isAdmin = (req, res, next) => {
  const userLevel = req.adminLevel || 'USER';
  const levelHierarchy = { 'USER': 0, 'MODERATOR': 1, 'ADMIN': 2, 'SUPER_ADMIN': 3 };
  const userLevelNum = levelHierarchy[userLevel] || 0;
  
  if (userLevelNum >= 2) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied. Admin level or higher required.'
  });
};

const isSuperAdmin = (req, res, next) => {
  const userLevel = req.adminLevel || 'USER';
  
  if (userLevel === 'SUPER_ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied. Super Admin level required.'
  });
};

// Log admin action middleware
const logAdminAction = (action, targetId = null, targetType = null, details = null) => {
  return (req, res, next) => {
    const originalSend = res.json;
    
    // Try to get targetId from request params if not provided
    let finalTargetId = targetId;
    if (!finalTargetId && req.params) {
      if (req.params.userId) finalTargetId = req.params.userId;
      else if (req.params.gameweekId) finalTargetId = req.params.gameweekId;
      else if (req.params.leagueId) finalTargetId = req.params.leagueId;
    }
    
    res.json = function(data) {
      // Log the admin action after response is sent
      setTimeout(async () => {
        try {
          await prisma.adminAction.create({
            data: {
              adminId: req.adminId,
              action,
              targetId: finalTargetId,
              targetType,
              details: details ? JSON.stringify(details) : null,
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown'
            }
          });
        } catch (error) {
          console.error('Failed to log admin action:', error);
        }
      }, 100);

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  adminAuthMiddleware,
  requireAdminLevel,
  requirePermission,
  logAdminAction,
  // Convenience role middleware
  isUser,
  isModerator,
  isAdmin,
  isSuperAdmin
};

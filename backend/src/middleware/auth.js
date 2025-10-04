// File: fpl-hub-backend/src/middleware/auth.js
// JWT Authentication middleware

const jwt = require('jsonwebtoken');
const SessionService = require('../services/sessionService');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    // Check if it's a Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
    const token = parts[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Debug: Log token and decoded info (reduced logging for performance)
    // console.log(`Auth middleware - Token: ${token.substring(0, 30)}...`);
    // console.log(`Auth middleware - Decoded User ID: ${decoded.userId}`);
    // console.log(`Auth middleware - Decoded Email: ${decoded.email}`);
    
    // Check if session exists and is active
    const session = await SessionService.getSessionByToken(token);
    if (!session || !session.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid'
      });
    }
    
    // Debug: Log session info (reduced logging for performance)
    // console.log(`Auth middleware - Session User ID: ${session.userId}`);
    // console.log(`Auth middleware - Session User Email: ${session.user.email}`);
    
    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await SessionService.deactivateSession(session.id);
      return res.status(401).json({
        success: false,
        error: 'Session expired'
      });
    }
    
    // Update session activity
    await SessionService.updateSessionActivity(session.id);
    
    // Add user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.sessionId = session.id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth
};
// File: fpl-hub-backend/src/middleware/validation.js
// Input validation and sanitization middleware

const { body, param, query, validationResult } = require('express-validator');
const { sanitizeBody, sanitizeParam, sanitizeQuery } = require('express-sanitizer');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  body('phone')
    .isLength({ min: 9, max: 9 })
    .matches(/^[235679][0-9]{8}$/)
    .withMessage('Phone number must be 9 digits starting with 2, 3, 5, 6, 7, or 9'),
  body('consentGiven')
    .isBoolean()
    .custom(value => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  // Custom validation to ensure either email or username is provided
  (req, res, next) => {
    const { email, username } = req.body;
    if (!email && !username) {
      return res.status(400).json({
        success: false,
        error: 'Either email or username is required'
      });
    }
    next();
  },
  handleValidationErrors
];

// OTP verification validation
const validateOTPVerification = [
  body('phone')
    .isLength({ min: 9, max: 9 })
    .matches(/^[235679][0-9]{8}$/)
    .withMessage('Phone number must be 9 digits starting with 2, 3, 5, 6, 7, or 9'),
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .matches(/^\d+$/)
    .withMessage('OTP code must be exactly 6 digits'),
  handleValidationErrors
];

// FPL team linking validation
const validateFPLTeamLinking = [
  body('fplTeamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('FPL Team ID must be a positive integer'),
  body('fplUrl')
    .optional()
    .isURL()
    .withMessage('FPL URL must be a valid URL'),
  body()
    .custom((value) => {
      // At least one of fplTeamId or fplUrl must be provided
      if (!value.fplTeamId && !value.fplUrl) {
        throw new Error('Either FPL Team ID or FPL URL must be provided');
      }
      return true;
    }),
  handleValidationErrors
];

// League creation validation
const validateLeagueCreation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .trim()
    .escape()
    .withMessage('League name must be between 3 and 100 characters'),
  body('leagueFormat')
    .isIn(['CLASSIC', 'HEAD_TO_HEAD'])
    .withMessage('League format must be CLASSIC or HEAD_TO_HEAD'),
  body('entryType')
    .isIn(['FREE', 'PAID'])
    .withMessage('Entry type must be FREE or PAID'),
  body('entryFee')
    .if(body('entryType').equals('PAID'))
    .isInt({ min: 0 })
    .withMessage('Entry fee must be a non-negative integer'),
  body('maxTeams')
    .isInt({ min: 2, max: 400 })
    .withMessage('Maximum teams must be between 2 and 400'),
  body('startGameweek')
    .isInt({ min: 1, max: 38 })
    .withMessage('Start gameweek must be between 1 and 38'),
  body('endGameweek')
    .optional()
    .isInt({ min: 1, max: 38 })
    .withMessage('End gameweek must be between 1 and 38'),
  body('prizeDistribution.type')
    .isIn(['TOP_3', 'TOP_5', 'TOP_10', 'PERCENTAGE', 'FIXED_POSITIONS'])
    .withMessage('Invalid prize distribution type'),
  body('prizeDistribution.distribution')
    .custom((value, { req }) => {
      if (req.body.prizeDistribution.type === 'PERCENTAGE') {
        return true; // Skip validation for percentage type
      }
      
      if (req.body.prizeDistribution.type === 'FIXED_POSITIONS') {
        if (!value || typeof value !== 'object') {
          throw new Error('Fixed position prizes must be an object');
        }
        // Validate that all values are positive numbers
        for (const [position, amount] of Object.entries(value)) {
          if (isNaN(amount) || Number(amount) <= 0) {
            throw new Error(`Position ${position} must have a positive amount`);
          }
        }
        return true;
      }
      
      if (!value || typeof value !== 'object') {
        throw new Error('Prize distribution must be an object');
      }
      
      const total = Object.values(value).reduce((sum, val) => sum + Number(val), 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new Error('Prize distribution percentages must sum to 100');
      }
      
      return true;
    }),
  handleValidationErrors
];

// Admin action validation
const validateAdminAction = [
  body('action')
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('Action must be between 1 and 100 characters'),
  body('targetId')
    .optional()
    .isUUID()
    .withMessage('Target ID must be a valid UUID'),
  body('targetType')
    .optional()
    .isIn(['USER', 'LEAGUE', 'SYSTEM', 'GAME'])
    .withMessage('Invalid target type'),
  body('details')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Details must be a string with maximum 1000 characters'),
  handleValidationErrors
];

// Query parameter validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be either asc or desc'),
  handleValidationErrors
];

// UUID parameter validation
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid UUID format'),
  handleValidationErrors
];

// Sanitization middleware
const sanitizeInputs = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.sanitize(req.body[key]);
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.sanitize(req.query[key]);
      }
    });
  }
  
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateOTPVerification,
  validateFPLTeamLinking,
  validateLeagueCreation,
  validateAdminAction,
  validatePagination,
  validateUUID,
  sanitizeInputs,
  handleValidationErrors
};

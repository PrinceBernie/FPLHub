// File: fpl-hub-backend/src/routes/userRoutes.js
// User-specific routes for FPL team linking and profile management

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { UserService } = require('../services/databaseService');
const fplService = require('../services/fplService');
const FPLUrlParser = require('../utils/fplUrlParser');

// Link FPL team to user account
router.post('/link-fpl-team', authMiddleware, async (req, res) => {
  try {
    const { fplTeamId, fplUrl } = req.body;
    const userId = req.userId;

    // Determine input source - prioritize fplTeamId if both are provided
    const input = fplTeamId || fplUrl;

    // Validate input
    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'FPL team ID or FPL URL is required'
      });
    }

    // Extract team ID from input (handles both numeric IDs and URLs)
    const extractedTeamId = FPLUrlParser.extractTeamId(input);
    
    if (!extractedTeamId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FPL team ID or URL format. Please provide a valid team ID or FPL URL (e.g., https://fantasy.premierleague.com/entry/417303/event/3)'
      });
    }

    // Validate FPL team exists
    const fplTeam = await fplService.getTeamById(extractedTeamId);
    if (!fplTeam) {
      return res.status(404).json({
        success: false,
        error: 'FPL team not found. Please check the team ID or URL.'
      });
    }

    // Link the FPL team to user
    const linkedTeam = await UserService.linkFplTeam(userId, extractedTeamId, fplTeam.name);

    // Generate the FPL URL for the linked team
    const fplTeamUrl = FPLUrlParser.getTeamUrl(extractedTeamId);

    res.json({
      success: true,
      message: 'FPL team linked successfully',
      data: {
        linkedTeam: {
          id: linkedTeam.id,
          userId: linkedTeam.userId,
          fplTeamId: linkedTeam.fplTeamId,
          teamName: linkedTeam.teamName,
          isActive: linkedTeam.isActive,
          linkedAt: linkedTeam.linkedAt,
          lastSync: linkedTeam.lastSync,
          fplUrl: fplTeamUrl
        },
        fplTeam: fplTeam,
        extractedFrom: fplUrl ? 'url' : 'id'
      }
    });
  } catch (error) {
    console.error('Link FPL team error:', error);
    
    if (error.message.includes('Maximum of 10 linked teams')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('already linked to another account')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to link FPL team'
    });
  }
});

// Get user's linked teams
router.get('/linked-teams', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const linkedTeams = await UserService.getUserLinkedTeams(userId);

    // Add FPL URLs to each linked team
    const enhancedLinkedTeams = linkedTeams.map(team => ({
      ...team,
      fplUrl: FPLUrlParser.getTeamUrl(team.fplTeamId)
    }));

    res.json({
      success: true,
      data: enhancedLinkedTeams
    });
  } catch (error) {
    console.error('Get linked teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get linked teams'
    });
  }
});

// Unlink FPL team from user account
router.delete('/unlink-fpl-team/:linkedTeamId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { linkedTeamId } = req.params;

    // Unlink the FPL team
    const unlinkedTeam = await UserService.unlinkFplTeam(userId, linkedTeamId);

    res.json({
      success: true,
      message: 'FPL team unlinked successfully',
      data: unlinkedTeam
    });
  } catch (error) {
    console.error('Unlink FPL team error:', error);
    
    if (error.message.includes('Linked team not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Cannot unlink team that has active league entries')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to unlink FPL team'
    });
  }
});


// Get user's first FPL team (for backward compatibility)
router.get('/fpl-team', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's first linked FPL team
    const linkedTeam = await UserService.getUserFirstFplTeam(userId);
    
    if (!linkedTeam) {
      return res.status(404).json({
        success: false,
        error: 'No FPL team linked to this account'
      });
    }

    // Get FPL team details
    const fplTeam = await fplService.getTeamById(linkedTeam.fplTeamId);
    
    if (!fplTeam) {
      return res.status(404).json({
        success: false,
        error: 'Linked FPL team not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: linkedTeam.user.id,
          email: linkedTeam.user.email,
          username: linkedTeam.user.username
        },
        fplTeam: fplTeam
      }
    });
  } catch (error) {
    console.error('Get FPL team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get FPL team'
    });
  }
});

// Get user's FPL squad data (no team ID needed)
router.get('/fpl-squad', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's linked teams
    const linkedTeams = await UserService.getUserLinkedTeams(userId);
    
    if (!linkedTeams || linkedTeams.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No FPL team linked to this account'
      });
    }

    // Use the first linked team (you can modify this logic if needed)
    const firstLinkedTeam = linkedTeams[0];
    
    // Get squad data
    const squad = await fplService.getTeamSquad(firstLinkedTeam.fplTeamId);
    
    if (!squad) {
      return res.status(404).json({
        success: false,
        error: 'FPL squad not found'
      });
    }

    res.json({
      success: true,
      data: squad
    });
  } catch (error) {
    console.error('Get FPL squad error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get FPL squad'
    });
  }
});

// Get user's FPL squad data (with team ID parameter - for backward compatibility)
router.get('/fpl-squad/:teamId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const teamId = parseInt(req.params.teamId);

    // Validate team ID
    if (!teamId || teamId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    // Check if user owns this team or has it linked
    const user = await UserService.getUserById(userId);
    if (user.fplTeamId !== teamId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own FPL squad.'
      });
    }

    // Get squad data
    const squad = await fplService.getTeamSquad(teamId);
    
    if (!squad) {
      return res.status(404).json({
        success: false,
        error: 'FPL squad not found'
      });
    }

    res.json({
      success: true,
      data: squad
    });
  } catch (error) {
    console.error('Get FPL squad error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get FPL squad'
    });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.userId;
    const user = await UserService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const endTime = Date.now();
    const profileTime = endTime - startTime;
    console.log(`🚀 Profile loaded in ${profileTime}ms for user: ${userId}`);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    const endTime = Date.now();
    const profileTime = endTime - startTime;
    console.error(`❌ Profile failed after ${profileTime}ms:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { username, phone } = req.body;

    // Validate input
    const updateData = {};
    if (username) updateData.username = username;
    if (phone) {
      // Phone number validation - expect 9 digits only
      const phoneRegex = /^[235679][0-9]{8}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number. Must be 9 digits starting with 2, 3, 5, 6, 7, or 9'
        });
      }
      // Format phone number with +233 prefix
      updateData.phone = `+233${phone}`;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const updatedUser = await UserService.updateUser(userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    await UserService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.message === 'Invalid current password') {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

module.exports = router;

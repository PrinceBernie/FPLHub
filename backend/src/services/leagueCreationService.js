const { prisma } = require('./databaseService');
const fplService = require('./fplService');

class LeagueCreationService {
  // Create a new user league
  static async createLeague(leagueData, userId) {
    try {
      // Set current season automatically (2025/26)
      const currentSeason = 2025;
      leagueData.season = currentSeason;

      // Validate user can create more leagues (max 5)
      const userLeagueCount = await prisma.league.count({
        where: { creatorId: userId, season: currentSeason }
      });

      if (userLeagueCount >= 5) {
        throw new Error('Maximum of 5 leagues per user per season allowed');
      }

      // RESTRICTION: Only paid leagues allowed for user creation
      if (leagueData.entryType !== 'PAID') {
        throw new Error('User-created leagues must be paid leagues only');
      }

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true, adminLevel: true }
      });

      const isAdmin = user?.isAdmin || user?.adminLevel === 'ADMIN' || user?.adminLevel === 'SUPER_ADMIN';

      // RULE: Non-admin users can only create private/invitational leagues
      if (!isAdmin && (leagueData.isPrivate === false || leagueData.isInvitational === false)) {
        throw new Error('User-created leagues must be private and invitational. Only admins can create public leagues.');
      }

      // Validate entry fee (GHS 10-50)
      if (leagueData.entryFee < 10 || leagueData.entryFee > 50) {
        throw new Error('Entry fee must be between GHS 10 and GHS 50');
      }

      // Validate max teams (2-400 for user leagues)
      if (leagueData.maxTeams < 2 || leagueData.maxTeams > 400) {
        throw new Error('Maximum teams must be between 2 and 400');
      }

      // Validate gameweeks - must be future gameweeks
      const currentGameweek = await fplService.getCurrentGameweekId();
      if (leagueData.startGameweek <= currentGameweek) {
        throw new Error('Start gameweek must be in the future');
      }
      
      // Validate end gameweek if provided
      if (leagueData.endGameweek) {
        if (leagueData.endGameweek <= leagueData.startGameweek) {
          throw new Error('End gameweek must be after start gameweek');
        }
        if (leagueData.endGameweek > 38) {
          throw new Error('End gameweek cannot exceed 38');
        }
      }

      // Validate head-to-head knockout rounds
      if (leagueData.leagueFormat === 'HEAD_TO_HEAD') {
        if (![1, 2, 3].includes(leagueData.knockoutRounds)) {
          throw new Error('Knockout rounds must be 1, 2, or 3');
        }
      }

      // Generate unique league code
      const leagueCode = this.generateLeagueCode();

      // Create the league
      const league = await prisma.league.create({
        data: {
          name: leagueData.name,
          type: 'PAID', // User leagues are always paid
          leagueFormat: leagueData.leagueFormat,
          creatorId: userId,
          entryType: 'PAID',
          entryFee: leagueData.entryFee,
          maxTeams: leagueData.maxTeams,
          includeChipScores: leagueData.includeChipScores || false,
          includeTransferCosts: leagueData.includeTransferCosts || false,
          season: leagueData.season,
          startGameweek: leagueData.startGameweek,
          endGameweek: leagueData.endGameweek,
          knockoutRounds: leagueData.knockoutRounds,
          prizeDistribution: JSON.stringify(leagueData.prizeDistribution),
          isPrivate: isAdmin ? (leagueData.isPrivate !== false) : true, // Admin can create public, users always private
          isInvitational: isAdmin ? (leagueData.isInvitational !== false) : true, // Admin can create public, users always invitational
          leagueCode: leagueCode,
          platformFeeType: 'PERCENTAGE',
          platformFeeValue: 0.0, // 0% platform fee
          status: 'DRAFT'
        }
      });

      return {
        success: true,
        message: 'League created successfully',
        data: league
      };

    } catch (error) {
      console.error('League creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available gameweeks for league creation
  static async getAvailableGameweeks() {
    try {
      const currentGameweek = await fplService.getCurrentGameweekId();
      const gameweeks = await fplService.getGameweeks();
      
      // Filter for future gameweeks only
      const availableGameweeks = gameweeks.filter(gw => gw.id > currentGameweek);
      
      return {
        success: true,
        data: availableGameweeks
      };
    } catch (error) {
      console.error('Error getting available gameweeks:', error);
      return {
        success: false,
        error: 'Failed to get available gameweeks'
      };
    }
  }

  // Get user's created leagues
  static async getUserLeagues(userId, season) {
    try {
      const leagues = await prisma.league.findMany({
        where: {
          creatorId: userId,
          season: season
        },
        include: {
          entries: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              },
              linkedTeam: {
                select: {
                  teamName: true,
                  fplTeamId: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        success: true,
        data: leagues
      };
    } catch (error) {
      console.error('Error getting user leagues:', error);
      return {
        success: false,
        error: 'Failed to get user leagues'
      };
    }
  }

  // Get league details
  static async getLeagueDetails(leagueId) {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          },
          entries: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              },
              linkedTeam: {
                select: {
                  teamName: true,
                  fplTeamId: true
                }
              }
            },
            orderBy: {
              totalPoints: 'desc'
            }
          },
          h2hMatchups: {
            include: {
              team1: {
                include: {
                  user: { select: { username: true } },
                  linkedTeam: { select: { teamName: true } }
                }
              },
              team2: {
                include: {
                  user: { select: { username: true } },
                  linkedTeam: { select: { teamName: true } }
                }
              }
            },
            orderBy: [
              { round: 'asc' },
              { gameweek: 'asc' }
            ]
          }
        }
      });

      if (!league) {
        return {
          success: false,
          error: 'League not found'
        };
      }

      return {
        success: true,
        data: league
      };
    } catch (error) {
      console.error('Error getting league details:', error);
      return {
        success: false,
        error: 'Failed to get league details'
      };
    }
  }

  // Calculate prize distribution
  static calculatePrizeDistribution(entryFee, participantCount, distributionType, fixedPrizes = null) {
    const totalPrizePool = entryFee * participantCount;
    const platformFee = 0; // 0% platform fee
    const distributableAmount = totalPrizePool - platformFee;

    let distribution = {};

    // Handle fixed position prizes
    if (distributionType === 'FIXED_POSITIONS' && fixedPrizes) {
      distribution = fixedPrizes;
    } else {
      switch (distributionType) {
        case 'WINNER_TAKES_ALL':
          distribution = {
            1: distributableAmount
          };
          break;
        
        case 'TOP_3':
          distribution = {
            1: distributableAmount * 0.6, // 60%
            2: distributableAmount * 0.3, // 30%
            3: distributableAmount * 0.1  // 10%
          };
          break;
        
        case 'TOP_5':
          distribution = {
            1: distributableAmount * 0.5, // 50%
            2: distributableAmount * 0.25, // 25%
            3: distributableAmount * 0.15, // 15%
            4: distributableAmount * 0.07, // 7%
            5: distributableAmount * 0.03  // 3%
          };
          break;
        
        default:
          distribution = {
            1: distributableAmount
          };
      }
    }

    return {
      totalPrizePool,
      platformFee,
      distributableAmount,
      distribution
    };
  }

  // Validate head-to-head knockout rounds based on participant count
  static validateKnockoutRounds(participantCount, requestedRounds) {
    let maxRounds = 1;
    
    if (participantCount >= 8) {
      maxRounds = 3;
    } else if (participantCount >= 4) {
      maxRounds = 2;
    } else if (participantCount >= 2) {
      maxRounds = 1;
    }

    return Math.min(requestedRounds, maxRounds);
  }

  // Get prize distribution templates
  static getPrizeDistributionTemplates() {
    return [
      {
        id: 'WINNER_TAKES_ALL',
        name: 'Winner Takes All',
        description: '100% of prize pool to 1st place',
        distribution: { 1: 100 }
      },
      {
        id: 'TOP_3',
        name: 'Top 3',
        description: '60% / 30% / 10% to 1st, 2nd, 3rd',
        distribution: { 1: 60, 2: 30, 3: 10 }
      },
      {
        id: 'TOP_5',
        name: 'Top 5',
        description: '50% / 25% / 15% / 7% / 3%',
        distribution: { 1: 50, 2: 25, 3: 15, 4: 7, 5: 3 }
      },
      {
        id: 'FIXED_POSITIONS',
        name: 'Fixed Position Prizes',
        description: 'Set fixed amounts for each position',
        distribution: null // User will configure this
      }
    ];
  }

  // Generate unique league code
  static generateLeagueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = LeagueCreationService;

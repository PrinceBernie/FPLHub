const { Server } = require('socket.io');
const Redis = require('redis');
const fplService = require('./fplService');

class SocketService {
  constructor() {
    this.io = null;
    this.redis = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userLeagues = new Map(); // userId -> [leagueIds]
    this.liveGameweek = null;
    this.isLive = false;
  }

  initialize(server) {
    // Initialize Socket.io
    this.io = new Server(server, {
      cors: {
        origin: [
          "http://localhost:3000",
          "http://localhost:3001", 
          "http://192.168.21.30:3000",
          "http://192.168.21.30:3001",
          "http://192.168.21.30:5000",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:5000"
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Initialize Redis for caching
    this.initializeRedis();

    // Setup Socket.io event handlers
    this.setupEventHandlers();

    console.log('🔌 Socket.io server initialized');
  }

  async initializeRedis() {
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: false // Disable automatic reconnection
        }
      });

      this.redis.on('error', (err) => {
        console.error('Redis Client Error:', err);
        // Set redis to null on error to use fallback
        this.redis = null;
      });

      await this.redis.connect();
      console.log('📦 Redis connected for live scoring cache');
    } catch (error) {
      console.error('Redis connection failed:', error);
      // Fallback to in-memory storage
      this.redis = null;
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 User connected: ${socket.id}`);

      // Authenticate user
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          if (!token) {
            socket.emit('error', { message: 'Authentication token required' });
            return;
          }

          // Verify JWT token (you'll need to implement this)
          const user = await this.verifyToken(token);
          if (!user) {
            socket.emit('error', { message: 'Invalid authentication token' });
            return;
          }

          // Store user connection
          this.connectedUsers.set(user.id, socket.id);
          socket.userId = user.id;
          socket.user = user;

          // Join user to their leagues
          await this.joinUserToLeagues(socket, user.id);

          socket.emit('authenticated', { 
            userId: user.id, 
            isLive: this.isLive,
            currentGameweek: this.liveGameweek 
          });

          console.log(`✅ User ${user.id} authenticated and connected`);
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // Join specific league room
      socket.on('join-league', async (data) => {
        try {
          const { leagueId } = data;
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          // Verify user is in this league
          const isInLeague = await this.verifyUserInLeague(socket.userId, leagueId);
          if (!isInLeague) {
            socket.emit('error', { message: 'Not a member of this league' });
            return;
          }

          socket.join(`league-${leagueId}`);
          socket.emit('joined-league', { leagueId });

          // Send current league data
          const leagueData = await this.getLeagueLiveData(leagueId);
          socket.emit('league-data', leagueData);

          console.log(`🏆 User ${socket.userId} joined league ${leagueId}`);
        } catch (error) {
          console.error('Join league error:', error);
          socket.emit('error', { message: 'Failed to join league' });
        }
      });

      // Leave league room
      socket.on('leave-league', (data) => {
        const { leagueId } = data;
        socket.leave(`league-${leagueId}`);
        socket.emit('left-league', { leagueId });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`🔌 User ${socket.userId} disconnected`);
        }
      });
    });
  }

  async verifyToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      // Get user from database
      const { UserService } = require('./databaseService');
      const user = await UserService.getUserById(decoded.userId);
      
      return user;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  async joinUserToLeagues(socket, userId) {
    try {
      const { LeagueService } = require('./databaseService');
      const userLeagues = await LeagueService.getUserLeagues(userId);
      
      this.userLeagues.set(userId, userLeagues.map(l => l.id));
      
      // Join user to all their league rooms
      userLeagues.forEach(league => {
        socket.join(`league-${league.id}`);
      });

      console.log(`🏆 User ${userId} joined ${userLeagues.length} leagues`);
    } catch (error) {
      console.error('Error joining user to leagues:', error);
    }
  }

  async verifyUserInLeague(userId, leagueId) {
    try {
      const { LeagueService } = require('./databaseService');
      const userLeagues = await LeagueService.getUserLeagues(userId);
      return userLeagues.some(league => league.id === leagueId);
    } catch (error) {
      console.error('Error verifying user in league:', error);
      return false;
    }
  }

  async getLeagueLiveData(leagueId) {
    try {
      const { LeagueService } = require('./databaseService');
      
      // Get league standings
      const standings = await LeagueService.getLeagueStandings(leagueId);
      
      // Get current gameweek data
      const currentGameweek = await fplService.getCurrentGameweekId();
      const gameweekData = await LeagueService.getGameweekData(leagueId, currentGameweek);
      
      return {
        leagueId,
        standings,
        gameweekData,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting league live data:', error);
      return null;
    }
  }

  // Broadcast live standings updates to connected users
  async broadcastLiveStandings(standingsData) {
    try {
      const { leagueId, updatedEntries, batchInfo, performanceMetrics } = standingsData;
      
      // Update Redis cache
      if (this.redis) {
        await this.redis.set(`live-standings-${leagueId}`, JSON.stringify(standingsData), 'EX', 300); // 5 min expiry
      }

      // Broadcast to specific league room
      this.io.to(`league-${leagueId}`).emit('live-standings-update', {
        leagueId,
        updatedEntries,
        batchInfo,
        performanceMetrics,
        timestamp: new Date().toISOString()
      });

      // Broadcast to all connected users for global updates
      this.io.emit('global-standings-update', {
        leagueId,
        updatedCount: updatedEntries.length,
        batchInfo,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 Live standings broadcasted for league ${leagueId} to ${this.io.sockets.adapter.rooms.get(`league-${leagueId}`)?.size || 0} users`);
    } catch (error) {
      console.error('Error broadcasting live standings:', error);
    }
  }

  // Broadcast live score updates to all connected users (LEGACY)
  async broadcastLiveScores(liveData) {
    try {
      const { leagueUpdates, gameweekUpdates } = liveData;
      
      // Update Redis cache
      if (this.redis) {
        await this.redis.set('live-scores', JSON.stringify(liveData), 'EX', 300); // 5 min expiry
      }

      // Broadcast to all connected users
      this.io.emit('live-scores-update', {
        ...liveData,
        timestamp: new Date().toISOString()
      });

      // Broadcast specific league updates to league members
      if (leagueUpdates) {
        Object.keys(leagueUpdates).forEach(leagueId => {
          this.io.to(`league-${leagueId}`).emit('league-update', {
            leagueId,
            data: leagueUpdates[leagueId],
            timestamp: new Date().toISOString()
          });
        });
      }

      console.log('📡 Live scores broadcasted to all connected users');
    } catch (error) {
      console.error('Error broadcasting live scores:', error);
    }
  }

  // Get cached live standings for a specific league
  async getCachedLiveStandings(leagueId) {
    try {
      if (this.redis) {
        const cached = await this.redis.get(`live-standings-${leagueId}`);
        return cached ? JSON.parse(cached) : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached live standings:', error);
      return null;
    }
  }

  // Get cached live scores (LEGACY)
  async getCachedLiveScores() {
    try {
      if (this.redis) {
        const cached = await this.redis.get('live-scores');
        return cached ? JSON.parse(cached) : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached live scores:', error);
      return null;
    }
  }

  // Update live status
  updateLiveStatus(isLive, gameweek = null) {
    this.isLive = isLive;
    this.liveGameweek = gameweek;
    
    this.io.emit('live-status-update', {
      isLive,
      gameweek,
      timestamp: new Date().toISOString()
    });
  }

  // Get connection stats
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.io.engine.clientsCount,
      isLive: this.isLive,
      liveGameweek: this.liveGameweek
    };
  }
}

// Export singleton instance
const socketService = new SocketService();
module.exports = socketService;

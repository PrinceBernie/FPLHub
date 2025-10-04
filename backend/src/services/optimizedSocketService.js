// File: fpl-hub-backend/src/services/optimizedSocketService.js
// Optimized Socket.io service with incremental diffs, room-based broadcasting, and Redis Pub/Sub

const { Server } = require('socket.io');
const Redis = require('ioredis');

class OptimizedSocketService {
  constructor() {
    this.io = null;
    this.redis = null;
    this.publisher = null;
    this.subscriber = null;
    
    // Connection tracking
    this.connectedUsers = new Map(); // userId -> socketId
    this.userLeagues = new Map(); // userId -> Set of leagueIds
    this.leagueRooms = new Map(); // leagueId -> Set of socketIds
    
    // Performance metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      totalBroadcasts: 0,
      roomBroadcasts: 0,
      globalBroadcasts: 0,
      lastReset: Date.now()
    };

    // Cache for incremental diffs
    this.lastStandings = new Map(); // leagueId -> last standings data
    this.lastLiveScores = null;
  }

  /**
   * Initialize the optimized socket service
   */
  initialize(server) {
    // Initialize Socket.io with optimized settings
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
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    // Initialize Redis for Pub/Sub
    this.initializeRedis();

    // Setup event handlers
    this.setupEventHandlers();

    console.log('🔌 Optimized Socket.io server initialized');
  }

  /**
   * Initialize Redis for Pub/Sub messaging
   */
  async initializeRedis() {
    try {
      // Create Redis clients for pub/sub
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.publisher = this.redis.duplicate();
      this.subscriber = this.redis.duplicate();

      // Connect to Redis
      await Promise.all([
        this.redis.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      // Subscribe to league-specific channels
      await this.subscriber.subscribe('league-updates', 'live-scores', 'global-updates');

      // Handle incoming messages
      this.subscriber.on('message', (channel, message) => {
        this.handleRedisMessage(channel, message);
      });

      console.log('✅ Redis Pub/Sub initialized for Socket.io');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, using local broadcasting only:', error.message);
      this.redis = null;
      this.publisher = null;
      this.subscriber = null;
    }
  }

  /**
   * Handle Redis Pub/Sub messages
   */
  handleRedisMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'league-updates':
          this.broadcastToLeagueLocal(data.leagueId, 'live-standings-update', data.payload);
          break;
        case 'live-scores':
          this.broadcastLiveScoresLocal(data.payload);
          break;
        case 'global-updates':
          this.broadcastGlobalUpdateLocal(data.payload);
          break;
      }
    } catch (error) {
      console.error('Error handling Redis message:', error);
    }
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    console.log(`🔌 New connection: ${socket.id}`);

    // Handle user authentication
    socket.on('authenticate', (data) => {
      this.handleAuthentication(socket, data);
    });

    // Handle league subscription
    socket.on('subscribe-league', (data) => {
      this.handleLeagueSubscription(socket, data);
    });

    // Handle league unsubscription
    socket.on('unsubscribe-league', (data) => {
      this.handleLeagueUnsubscription(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Handle user authentication
   */
  handleAuthentication(socket, data) {
    const { userId, leagues } = data;
    
    if (!userId) {
      socket.emit('error', { message: 'User ID required for authentication' });
      return;
    }

    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    socket.userId = userId;

    // Store user's leagues
    if (leagues && Array.isArray(leagues)) {
      this.userLeagues.set(userId, new Set(leagues));
      
      // Join league rooms
      leagues.forEach(leagueId => {
        this.joinLeagueRoom(socket, leagueId);
      });
    }

    console.log(`✅ User ${userId} authenticated and joined ${leagues?.length || 0} leagues`);
    socket.emit('authenticated', { success: true, leagues });
  }

  /**
   * Handle league subscription
   */
  handleLeagueSubscription(socket, data) {
    const { leagueId } = data;
    
    if (!leagueId || !socket.userId) {
      socket.emit('error', { message: 'League ID and authentication required' });
      return;
    }

    this.joinLeagueRoom(socket, leagueId);
    
    // Update user's leagues
    if (!this.userLeagues.has(socket.userId)) {
      this.userLeagues.set(socket.userId, new Set());
    }
    this.userLeagues.get(socket.userId).add(leagueId);

    console.log(`📡 User ${socket.userId} subscribed to league ${leagueId}`);
    socket.emit('league-subscribed', { leagueId, success: true });
  }

  /**
   * Handle league unsubscription
   */
  handleLeagueUnsubscription(socket, data) {
    const { leagueId } = data;
    
    if (!leagueId || !socket.userId) {
      return;
    }

    this.leaveLeagueRoom(socket, leagueId);
    
    // Update user's leagues
    if (this.userLeagues.has(socket.userId)) {
      this.userLeagues.get(socket.userId).delete(leagueId);
    }

    console.log(`📡 User ${socket.userId} unsubscribed from league ${leagueId}`);
    socket.emit('league-unsubscribed', { leagueId, success: true });
  }

  /**
   * Join a league room
   */
  joinLeagueRoom(socket, leagueId) {
    const roomName = `league-${leagueId}`;
    socket.join(roomName);
    
    // Track room membership
    if (!this.leagueRooms.has(leagueId)) {
      this.leagueRooms.set(leagueId, new Set());
    }
    this.leagueRooms.get(leagueId).add(socket.id);
  }

  /**
   * Leave a league room
   */
  leaveLeagueRoom(socket, leagueId) {
    const roomName = `league-${leagueId}`;
    socket.leave(roomName);
    
    // Update room tracking
    if (this.leagueRooms.has(leagueId)) {
      this.leagueRooms.get(leagueId).delete(socket.id);
      
      // Clean up empty rooms
      if (this.leagueRooms.get(leagueId).size === 0) {
        this.leagueRooms.delete(leagueId);
      }
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    this.metrics.activeConnections--;
    
    if (socket.userId) {
      // Remove user from all league rooms
      const userLeagues = this.userLeagues.get(socket.userId);
      if (userLeagues) {
        userLeagues.forEach(leagueId => {
          this.leaveLeagueRoom(socket, leagueId);
        });
      }
      
      // Clean up user data
      this.connectedUsers.delete(socket.userId);
      this.userLeagues.delete(socket.userId);
    }

    console.log(`🔌 Connection closed: ${socket.id}`);
  }

  /**
   * Broadcast incremental standings update to a specific league
   */
  async broadcastToLeague(leagueId, event, data) {
    try {
      // Create incremental diff
      const diff = this.createStandingsDiff(leagueId, data);
      
      if (!diff || diff.updatedEntries.length === 0) {
        console.log(`📊 No significant changes for league ${leagueId}, skipping broadcast`);
        return;
      }

      // Publish to Redis for distributed broadcasting
      if (this.publisher) {
        await this.publisher.publish('league-updates', JSON.stringify({
          leagueId,
          payload: diff
        }));
      } else {
        // Fallback to local broadcasting
        this.broadcastToLeagueLocal(leagueId, event, diff);
      }

      this.metrics.totalBroadcasts++;
      this.metrics.roomBroadcasts++;
      
      console.log(`📡 Broadcasted incremental update to league ${leagueId}: ${diff.updatedEntries.length} changes`);
    } catch (error) {
      console.error(`Failed to broadcast to league ${leagueId}:`, error);
    }
  }

  /**
   * Local league broadcasting (fallback)
   */
  broadcastToLeagueLocal(leagueId, event, data) {
    const roomName = `league-${leagueId}`;
    this.io.to(roomName).emit(event, data);
  }

  /**
   * Create incremental diff for standings
   */
  createStandingsDiff(leagueId, newData) {
    const lastData = this.lastStandings.get(leagueId);
    
    if (!lastData) {
      // First update - store full data
      this.lastStandings.set(leagueId, newData);
      return newData;
    }

    // Find changed entries
    const updatedEntries = [];
    const newEntries = newData.updatedEntries || [];
    
    newEntries.forEach(newEntry => {
      const lastEntry = lastData.updatedEntries?.find(e => e.id === newEntry.id);
      
      if (!lastEntry || 
          Math.abs(newEntry.gameweekPoints - lastEntry.gameweekPoints) > 0.1 ||
          Math.abs(newEntry.totalPoints - lastEntry.totalPoints) > 0.1 ||
          newEntry.rank !== lastEntry.rank) {
        updatedEntries.push({
          ...newEntry,
          previousRank: lastEntry?.rank,
          previousPoints: lastEntry?.totalPoints
        });
      }
    });

    if (updatedEntries.length === 0) {
      return null; // No changes
    }

    // Update stored data
    this.lastStandings.set(leagueId, newData);

    return {
      leagueId: newData.leagueId,
      leagueName: newData.leagueName,
      gameweekId: newData.gameweekId,
      updatedEntries,
      timestamp: new Date().toISOString(),
      changeCount: updatedEntries.length
    };
  }

  /**
   * Broadcast live scores to all connected clients
   */
  async broadcastLiveScores(data) {
    try {
      // Create incremental diff for live scores
      const diff = this.createLiveScoresDiff(data);
      
      if (!diff) {
        console.log('📊 No significant changes in live scores, skipping broadcast');
        return;
      }

      // Publish to Redis for distributed broadcasting
      if (this.publisher) {
        await this.publisher.publish('live-scores', JSON.stringify({
          payload: diff
        }));
      } else {
        // Fallback to local broadcasting
        this.broadcastLiveScoresLocal(diff);
      }

      this.metrics.totalBroadcasts++;
      this.metrics.globalBroadcasts++;
      
      console.log(`📡 Broadcasted live scores update: ${diff.changedPlayers?.length || 0} player changes`);
    } catch (error) {
      console.error('Failed to broadcast live scores:', error);
    }
  }

  /**
   * Local live scores broadcasting (fallback)
   */
  broadcastLiveScoresLocal(data) {
    this.io.emit('live-scores-update', data);
  }

  /**
   * Create incremental diff for live scores
   */
  createLiveScoresDiff(newData) {
    if (!this.lastLiveScores) {
      // First update
      this.lastLiveScores = newData;
      return newData;
    }

    // Find changed players
    const changedPlayers = [];
    const newPlayers = newData.players || [];
    
    newPlayers.forEach(newPlayer => {
      const lastPlayer = this.lastLiveScores.players?.find(p => p.id === newPlayer.id);
      
      if (!lastPlayer || 
          Math.abs(newPlayer.points - lastPlayer.points) > 0.1 ||
          newPlayer.minutes !== lastPlayer.minutes ||
          newPlayer.goals !== lastPlayer.goals ||
          newPlayer.assists !== lastPlayer.assists) {
        changedPlayers.push({
          ...newPlayer,
          previousPoints: lastPlayer?.points,
          pointsChange: newPlayer.points - (lastPlayer?.points || 0)
        });
      }
    });

    if (changedPlayers.length === 0) {
      return null; // No changes
    }

    // Update stored data
    this.lastLiveScores = newData;

    return {
      gameweekId: newData.gameweekId,
      changedPlayers,
      fixtures: newData.fixtures,
      timestamp: new Date().toISOString(),
      changeCount: changedPlayers.length
    };
  }

  /**
   * Broadcast global update
   */
  async broadcastGlobalUpdate(data) {
    try {
      if (this.publisher) {
        await this.publisher.publish('global-updates', JSON.stringify({
          payload: data
        }));
      } else {
        this.broadcastGlobalUpdateLocal(data);
      }

      this.metrics.totalBroadcasts++;
      this.metrics.globalBroadcasts++;
    } catch (error) {
      console.error('Failed to broadcast global update:', error);
    }
  }

  /**
   * Local global broadcasting (fallback)
   */
  broadcastGlobalUpdateLocal(data) {
    this.io.emit('global-update', data);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.metrics.totalConnections,
      activeConnections: this.metrics.activeConnections,
      connectedUsers: this.connectedUsers.size,
      leagueRooms: this.leagueRooms.size,
      totalBroadcasts: this.metrics.totalBroadcasts,
      roomBroadcasts: this.metrics.roomBroadcasts,
      globalBroadcasts: this.metrics.globalBroadcasts,
      redisConnected: this.redis ? this.redis.status === 'ready' : false
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.lastReset;
    
    return {
      ...this.metrics,
      uptime,
      broadcastsPerMinute: this.metrics.totalBroadcasts / (uptime / 60000),
      avgConnectionsPerMinute: this.metrics.totalConnections / (uptime / 60000)
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      totalBroadcasts: 0,
      roomBroadcasts: 0,
      globalBroadcasts: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down optimized socket service...');
    
    if (this.redis) {
      await this.redis.disconnect();
    }
    if (this.publisher) {
      await this.publisher.disconnect();
    }
    if (this.subscriber) {
      await this.subscriber.disconnect();
    }
    
    if (this.io) {
      this.io.close();
    }
    
    console.log('✅ Optimized socket service shutdown complete');
  }
}

module.exports = new OptimizedSocketService();

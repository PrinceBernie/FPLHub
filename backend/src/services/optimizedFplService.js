// File: fpl-hub-backend/src/services/optimizedFplService.js
// Centralized FPL service with advanced caching, concurrency control, and performance optimization

const axios = require('axios');
// Simple concurrency limiter to replace p-limit
const createConcurrencyLimiter = (limit) => {
  let running = 0;
  const queue = [];
  
  return async (fn) => {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      process();
    });
  };
  
  function process() {
    if (running >= limit || queue.length === 0) return;
    running++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve).catch(reject).finally(() => {
      running--;
      process();
    });
  }
};

const pLimit = createConcurrencyLimiter(5);
const Redis = require('ioredis');

class OptimizedFPLService {
  constructor() {
    this.baseURL = 'https://fantasy.premierleague.com/api';
    
    // Redis connection for distributed caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // In-memory cache for ultra-fast access
    this.memoryCache = new Map();
    this.cacheTimestamps = new Map();
    
    // Concurrency control
    this.concurrencyLimit = pLimit(parseInt(process.env.FPL_CONCURRENCY_LIMIT) || 10);
    this.requestQueue = [];
    
    // Cache durations (in milliseconds)
    this.CACHE_DURATIONS = {
      BOOTSTRAP: 5 * 60 * 1000,        // 5 minutes
      LIVE_PLAYERS: 30 * 1000,          // 30 seconds
      FIXTURES: 2 * 60 * 1000,          // 2 minutes
      TEAM_DETAILS: 10 * 60 * 1000,     // 10 minutes
      GAMEWEEK_INFO: 15 * 60 * 1000     // 15 minutes
    };

    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      avgResponseTime: 0,
      lastReset: Date.now()
    };

    // Initialize Redis connection
    this.initializeRedis();
    
    // Start cache cleanup
    this.startCacheCleanup();
  }

  async initializeRedis() {
    try {
      await this.redis.connect();
      console.log('✅ Redis connected for FPL service caching');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, using memory cache only:', error.message);
      this.redis = null;
    }
  }

  /**
   * Get cached data from memory or Redis
   */
  async getCachedData(key, type = 'default') {
    const cacheKey = `fpl:${type}:${key}`;
    
    // Try memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const { data, timestamp } = this.memoryCache.get(cacheKey);
      const cacheDuration = this.CACHE_DURATIONS[type] || this.CACHE_DURATIONS.BOOTSTRAP;
      
      if (Date.now() - timestamp < cacheDuration) {
        this.metrics.cacheHits++;
        return data;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const cacheDuration = this.CACHE_DURATIONS[type] || this.CACHE_DURATIONS.BOOTSTRAP;
          
          if (Date.now() - timestamp < cacheDuration) {
            // Store in memory cache for faster access
            this.memoryCache.set(cacheKey, { data, timestamp });
            this.metrics.cacheHits++;
            return data;
          }
        }
      } catch (error) {
        console.warn('Redis cache read error:', error.message);
      }
    }

    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Set cached data in both memory and Redis
   */
  async setCachedData(key, data, type = 'default') {
    const cacheKey = `fpl:${type}:${key}`;
    const timestamp = Date.now();
    const cacheData = { data, timestamp };

    // Store in memory cache
    this.memoryCache.set(cacheKey, cacheData);

    // Store in Redis cache
    if (this.redis) {
      try {
        const cacheDuration = this.CACHE_DURATIONS[type] || this.CACHE_DURATIONS.BOOTSTRAP;
        await this.redis.setex(cacheKey, Math.ceil(cacheDuration / 1000), JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Redis cache write error:', error.message);
      }
    }
  }

  /**
   * Make HTTP request with concurrency control and caching
   */
  async makeRequest(url, cacheKey, cacheType = 'default', options = {}) {
    const startTime = Date.now();
    
    return this.concurrencyLimit(async () => {
      try {
        // Check cache first
        const cached = await this.getCachedData(cacheKey, cacheType);
        if (cached) {
          return cached;
        }

        // Make request
        const response = await axios.get(url, {
          timeout: options.timeout || 10000,
          headers: {
            'User-Agent': 'FPL-Hub/1.0',
            ...options.headers
          }
        });

        // Cache the response
        await this.setCachedData(cacheKey, response.data, cacheType);
        
        // Update metrics
        this.metrics.totalRequests++;
        const responseTime = Date.now() - startTime;
        this.metrics.avgResponseTime = (this.metrics.avgResponseTime + responseTime) / 2;

        return response.data;
      } catch (error) {
        this.metrics.errors++;
        console.error(`❌ FPL API request failed for ${url}:`, error.message);
        throw error;
      }
    });
  }

  /**
   * Get bootstrap data (players, teams, gameweeks)
   */
  async getBootstrapData() {
    return this.makeRequest(
      `${this.baseURL}/bootstrap-static/`,
      'bootstrap',
      'BOOTSTRAP'
    );
  }

  /**
   * Get live player data for current gameweek
   */
  async getLivePlayerData(gameweekId) {
    return this.makeRequest(
      `${this.baseURL}/event/${gameweekId}/live/`,
      `live-players-${gameweekId}`,
      'LIVE_PLAYERS'
    );
  }

  /**
   * Get fixtures for a specific gameweek
   */
  async getGameweekFixtures(gameweekId) {
    return this.makeRequest(
      `${this.baseURL}/fixtures/?event=${gameweekId}`,
      `fixtures-${gameweekId}`,
      'FIXTURES'
    );
  }

  /**
   * Get team details by ID
   */
  async getTeamDetails(teamId) {
    return this.makeRequest(
      `${this.baseURL}/entry/${teamId}/`,
      `team-${teamId}`,
      'TEAM_DETAILS'
    );
  }

  /**
   * Get team's current gameweek data
   */
  async getTeamGameweekData(teamId, gameweekId) {
    return this.makeRequest(
      `${this.baseURL}/entry/${teamId}/event/${gameweekId}/picks/`,
      `team-${teamId}-gw-${gameweekId}`,
      'LIVE_PLAYERS'
    );
  }

  /**
   * Get current gameweek ID
   */
  async getCurrentGameweekId() {
    const data = await this.getBootstrapData();
    const currentEvent = data.events.find(event => event.is_current);
    return currentEvent ? currentEvent.id : null;
  }

  /**
   * Batch fetch team data with concurrency control
   */
  async batchFetchTeamData(teamIds, gameweekId) {
    const batchSize = parseInt(process.env.TEAM_BATCH_SIZE) || 20;
    const results = new Map();
    const errors = [];

    // Process teams in batches
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = teamIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (teamId) => {
        try {
          const [teamDetails, gameweekData] = await Promise.all([
            this.getTeamDetails(teamId),
            this.getTeamGameweekData(teamId, gameweekId)
          ]);
          
          results.set(teamId, {
            teamDetails,
            gameweekData,
            fetchedAt: Date.now()
          });
        } catch (error) {
          console.error(`Failed to fetch data for team ${teamId}:`, error.message);
          errors.push({ teamId, error: error.message });
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < teamIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { results, errors };
  }

  /**
   * Get shared live player data for all teams
   */
  async getSharedLivePlayerData(gameweekId) {
    const cacheKey = `shared-live-players-${gameweekId}`;
    
    // Check if we have recent data
    const cached = await this.getCachedData(cacheKey, 'LIVE_PLAYERS');
    if (cached) {
      return cached;
    }

    // Fetch fresh data
    const liveData = await this.getLivePlayerData(gameweekId);
    
    // Process and cache the data
    const processedData = {
      gameweekId,
      players: liveData.elements,
      fixtures: liveData.fixtures,
      fetchedAt: Date.now()
    };

    await this.setCachedData(cacheKey, processedData, 'LIVE_PLAYERS');
    return processedData;
  }

  /**
   * Calculate team points using shared live player data
   */
  calculateTeamPoints(teamData, livePlayerData) {
    if (!teamData.gameweekData || !livePlayerData) {
      return { totalPoints: 0, gameweekPoints: 0, players: [] };
    }

    const picks = teamData.gameweekData.picks || [];
    let totalPoints = 0;
    let gameweekPoints = 0;
    const playerPoints = [];
    
    // Find captain and vice-captain
    const captainPick = picks.find(pick => pick.is_captain);
    const viceCaptainPick = picks.find(pick => pick.is_vice_captain);
    
    // Check if captain played (has points > 0)
    let captainPlayed = false;
    if (captainPick) {
      const captainPlayer = livePlayerData.players.find(p => p.id === captainPick.element);
      captainPlayed = captainPlayer && (captainPlayer.stats?.total_points || 0) > 0;
    }

    picks.forEach(pick => {
      const player = livePlayerData.players.find(p => p.id === pick.element);
      if (player) {
        const points = player.stats?.total_points || 0;
        let multiplier = 1;
        
        // Apply captain/vice-captain multiplier
        if (pick.is_captain) {
          multiplier = 2;
        } else if (pick.is_vice_captain && !captainPlayed) {
          // Vice-captain gets double points only if captain didn't play
          multiplier = 2;
        }
        
        const finalPoints = points * multiplier;
        
        totalPoints += finalPoints;
        gameweekPoints += finalPoints;
        
        playerPoints.push({
          playerId: player.id,
          playerName: player.web_name,
          points: finalPoints,
          isCaptain: pick.is_captain,
          isViceCaptain: pick.is_vice_captain,
          multiplier: multiplier
        });
      }
    });

    return {
      totalPoints,
      gameweekPoints,
      players: playerPoints
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.lastReset;
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
      : 0;

    return {
      ...this.metrics,
      uptime,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redis ? this.redis.status === 'ready' : false
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      avgResponseTime: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Start cache cleanup process
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, { timestamp }] of this.memoryCache.entries()) {
        const cacheType = key.split(':')[1];
        const cacheDuration = this.CACHE_DURATIONS[cacheType] || this.CACHE_DURATIONS.BOOTSTRAP;
        
        if (now - timestamp > cacheDuration * 2) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 FPL Service cache cleanup: removed ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.redis) {
      await this.redis.disconnect();
    }
    console.log('🛑 Optimized FPL Service shutdown complete');
  }
}

// Export singleton instance
module.exports = new OptimizedFPLService();

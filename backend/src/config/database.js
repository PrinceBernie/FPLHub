// File: fpl-hub-backend/src/config/database.js
// Database configuration for production deployment

const { Pool } = require('pg');

// Database configuration based on environment
const dbConfig = {
  development: {
    provider: 'sqlite',
    url: process.env.DATABASE_URL || 'file:./dev.db',
    options: {
      logging: process.env.DB_LOGGING === 'true',
      pool: {
        min: 1,
        max: 1
      }
    }
  },
  
  production: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
    options: {
      logging: process.env.DB_LOGGING === 'true',
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY
      } : false,
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 5,
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
        destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
        createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200
      },
      dialectOptions: {
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
        idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TRANSACTION_TIMEOUT) || 60000
      }
    }
  },
  
  test: {
    provider: 'sqlite',
    url: 'file:./test.db',
    options: {
      logging: false,
      pool: {
        min: 1,
        max: 1
      }
    }
  }
};

// PostgreSQL connection pool for production
let postgresPool = null;

// Function to create PostgreSQL pool
const createPostgresPool = (config) => {
  if (postgresPool) {
    return postgresPool;
  }
  
  const poolConfig = {
    connectionString: config.url,
    ssl: config.options.ssl,
    max: config.options.pool.max,
    min: config.options.pool.min,
    acquireTimeoutMillis: config.options.pool.acquireTimeoutMillis,
    createTimeoutMillis: config.options.pool.createTimeoutMillis,
    destroyTimeoutMillis: config.options.pool.destroyTimeoutMillis,
    idleTimeoutMillis: config.options.pool.idleTimeoutMillis,
    reapIntervalMillis: config.options.pool.reapIntervalMillis,
    createRetryIntervalMillis: config.options.pool.createRetryIntervalMillis,
    // Connection validation
    connectionTimeoutMillis: 10000,
    query_timeout: config.options.dialectOptions.statement_timeout,
    statement_timeout: config.options.dialectOptions.statement_timeout,
    idle_in_transaction_session_timeout: config.options.dialectOptions.idle_in_transaction_session_timeout
  };
  
  postgresPool = new Pool(poolConfig);
  
  // Pool event handlers
  postgresPool.on('connect', (client) => {
    console.log('✅ New PostgreSQL client connected');
  });
  
  postgresPool.on('error', (err, client) => {
    console.error('❌ PostgreSQL pool error:', err);
  });
  
  postgresPool.on('remove', (client) => {
    console.log('ℹ️ PostgreSQL client removed from pool');
  });
  
  return postgresPool;
};

// Function to get database configuration
const getDatabaseConfig = (env = process.env.NODE_ENV) => {
  const config = dbConfig[env] || dbConfig.development;
  
  if (config.provider === 'postgresql' && !config.url) {
    throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
  }
  
  return config;
};

// Function to validate database connection
const validateDatabaseConnection = async (config) => {
  if (config.provider === 'postgresql') {
    try {
      const pool = createPostgresPool(config);
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ PostgreSQL connection validated successfully');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL connection validation failed:', error.message);
      throw error;
    }
  } else if (config.provider === 'sqlite') {
    try {
      // For SQLite, we'll validate when Prisma connects
      console.log('✅ SQLite configuration validated');
      return true;
    } catch (error) {
      console.error('❌ SQLite configuration validation failed:', error.message);
      throw error;
    }
  }
  
  return false;
};

// Function to close database connections
const closeDatabaseConnections = async () => {
  if (postgresPool) {
    console.log('🔄 Closing PostgreSQL connection pool...');
    await postgresPool.end();
    postgresPool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
};

// Function to get database health status
const getDatabaseHealth = async () => {
  try {
    const config = getDatabaseConfig();
    
    if (config.provider === 'postgresql') {
      const pool = createPostgresPool(config);
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      
      return {
        status: 'healthy',
        provider: 'postgresql',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].version,
        poolSize: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
    } else {
      return {
        status: 'healthy',
        provider: 'sqlite',
        timestamp: new Date().toISOString(),
        version: 'SQLite'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Function to run database migrations
const runMigrations = async () => {
  try {
    const { execSync } = require('child_process');
    console.log('🔄 Running database migrations...');
    
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database migrations completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    throw error;
  }
};

// Function to seed database
const seedDatabase = async () => {
  try {
    const { execSync } = require('child_process');
    console.log('🔄 Seeding database...');
    
    execSync('npx prisma db seed', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('✅ Database seeding completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    // Don't throw error for seeding as it's optional
    return false;
  }
};

module.exports = {
  dbConfig,
  getDatabaseConfig,
  validateDatabaseConnection,
  createPostgresPool,
  closeDatabaseConnections,
  getDatabaseHealth,
  runMigrations,
  seedDatabase
};

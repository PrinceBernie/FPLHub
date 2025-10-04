// File: fpl-hub-backend/src/config/loadBalancer.js
// Load balancer configuration for production deployment

const cluster = require('cluster');
const os = require('os');

// Load balancer configuration
const loadBalancerConfig = {
  // Cluster configuration
  cluster: {
    enabled: process.env.CLUSTER_ENABLED === 'true',
    workers: parseInt(process.env.CLUSTER_WORKERS) || os.cpus().length,
    strategy: process.env.CLUSTER_STRATEGY || 'round-robin', // round-robin, least-connections, ip-hash
    healthCheck: {
      enabled: process.env.CLUSTER_HEALTH_CHECK === 'true',
      interval: parseInt(process.env.CLUSTER_HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
      timeout: parseInt(process.env.CLUSTER_HEALTH_CHECK_TIMEOUT) || 5000, // 5 seconds
      unhealthyThreshold: parseInt(process.env.CLUSTER_UNHEALTHY_THRESHOLD) || 3,
      healthyThreshold: parseInt(process.env.CLUSTER_HEALTHY_THRESHOLD) || 2
    }
  },
  
  // Nginx configuration (if using Nginx as reverse proxy)
  nginx: {
    enabled: process.env.NGINX_ENABLED === 'true',
    upstream: {
      name: process.env.NGINX_UPSTREAM_NAME || 'fpl_hub_backend',
      strategy: process.env.NGINX_LOAD_BALANCING_STRATEGY || 'least_conn', // least_conn, ip_hash, round_robin
      keepalive: parseInt(process.env.NGINX_KEEPALIVE) || 32,
      maxFails: parseInt(process.env.NGINX_MAX_FAILS) || 3,
      failTimeout: parseInt(process.env.NGINX_FAIL_TIMEOUT) || 30
    },
    ssl: {
      enabled: process.env.NGINX_SSL_ENABLED === 'true',
      certPath: process.env.NGINX_SSL_CERT_PATH,
      keyPath: process.env.NGINX_SSL_KEY_PATH,
      dhparamPath: process.env.NGINX_SSL_DHPARAM_PATH
    },
    rateLimiting: {
      enabled: process.env.NGINX_RATE_LIMITING === 'true',
      zone: process.env.NGINX_RATE_LIMIT_ZONE || 'api',
      rate: process.env.NGINX_RATE_LIMIT_RATE || '10r/s',
      burst: process.env.NGINX_RATE_LIMIT_BURST || '20'
    }
  },
  
  // HAProxy configuration (alternative to Nginx)
  haproxy: {
    enabled: process.env.HAPROXY_ENABLED === 'true',
    stats: {
      enabled: process.env.HAPROXY_STATS_ENABLED === 'true',
      port: parseInt(process.env.HAPROXY_STATS_PORT) || 8404,
      username: process.env.HAPROXY_STATS_USERNAME || 'admin',
      password: process.env.HAPROXY_STATS_PASSWORD
    },
    healthCheck: {
      method: process.env.HAPROXY_HEALTH_CHECK_METHOD || 'httpchk',
      uri: process.env.HAPROXY_HEALTH_CHECK_URI || '/health',
      interval: parseInt(process.env.HAPROXY_HEALTH_CHECK_INTERVAL) || 2000,
      timeout: parseInt(process.env.HAPROXY_HEALTH_CHECK_TIMEOUT) || 1000
    }
  },
  
  // Application-level load balancing
  application: {
    stickySessions: process.env.STICKY_SESSIONS === 'true',
    sessionAffinity: process.env.SESSION_AFFINITY || 'ip', // ip, user, none
    healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
    circuitBreaker: {
      enabled: process.env.CIRCUIT_BREAKER_ENABLED === 'true',
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) || 5,
      recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT) || 60000,
      monitoringPeriod: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_PERIOD) || 60000
    }
  }
};

// Function to create cluster workers
const createClusterWorkers = (config) => {
  if (!config.cluster.enabled) {
    return;
  }
  
  console.log(`🔄 Creating ${config.cluster.workers} worker processes...`);
  
  for (let i = 0; i < config.cluster.workers; i++) {
    const worker = cluster.fork();
    
    worker.on('message', (message) => {
      if (message.type === 'health') {
        console.log(`✅ Worker ${worker.process.pid} health check: ${message.status}`);
      }
    });
    
    worker.on('exit', (code, signal) => {
      console.log(`⚠️ Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
      cluster.fork();
    });
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
  });
  
  console.log(`✅ Cluster created with ${config.cluster.workers} workers`);
};

// Function to generate Nginx configuration
const generateNginxConfig = (config) => {
  if (!config.nginx.enabled) {
    return null;
  }
  
  const nginxConfig = `
# Nginx configuration for FPL Hub Backend
# Generated automatically - DO NOT EDIT MANUALLY

upstream ${config.nginx.upstream.name} {
    ${config.nginx.upstream.strategy === 'least_conn' ? 'least_conn;' : ''}
    ${config.nginx.upstream.strategy === 'ip_hash' ? 'ip_hash;' : ''}
    ${config.nginx.upstream.strategy === 'round_robin' ? '# round_robin (default);' : ''}
    
    # Backend servers
    server 127.0.0.1:5000 max_fails=${config.nginx.upstream.maxFails} fail_timeout=${config.nginx.upstream.failTimeout}s;
    server 127.0.0.1:5001 max_fails=${config.nginx.upstream.maxFails} fail_timeout=${config.nginx.upstream.failTimeout}s;
    server 127.0.0.1:5002 max_fails=${config.nginx.upstream.maxFails} fail_timeout=${config.nginx.upstream.failTimeout}s;
    
    keepalive ${config.nginx.upstream.keepalive};
}

${config.nginx.rateLimiting.enabled ? `
# Rate limiting
limit_req_zone $binary_remote_addr zone=${config.nginx.rateLimiting.zone}:10m rate=${config.nginx.rateLimiting.rate};
` : ''}

server {
    listen 80;
    server_name ${process.env.DOMAIN_NAME || 'localhost'};
    
    ${config.nginx.ssl.enabled ? `
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
    ` : `
    # Proxy to backend
    location / {
        limit_req zone=${config.nginx.rateLimiting.zone} burst=${config.nginx.rateLimiting.burst} nodelay;
        
        proxy_pass http://${config.nginx.upstream.name};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    `}
}

${config.nginx.ssl.enabled ? `
server {
    listen 443 ssl http2;
    server_name ${process.env.DOMAIN_NAME || 'localhost'};
    
    # SSL configuration
    ssl_certificate ${config.nginx.ssl.certPath};
    ssl_certificate_key ${config.nginx.ssl.keyPath};
    ${config.nginx.ssl.dhparamPath ? `ssl_dhparam ${config.nginx.ssl.dhparamPath};` : ''}
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to backend
    location / {
        limit_req zone=${config.nginx.rateLimiting.zone} burst=${config.nginx.rateLimiting.burst} nodelay;
        
        proxy_pass http://${config.nginx.upstream.name};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
` : ''}
`;
  
  return nginxConfig;
};

// Function to generate HAProxy configuration
const generateHAProxyConfig = (config) => {
  if (!config.haproxy.enabled) {
    return null;
  }
  
  const haproxyConfig = `
# HAProxy configuration for FPL Hub Backend
# Generated automatically - DO NOT EDIT MANUALLY

global
    daemon
    maxconn 4096
    log 127.0.0.1 local0
    log 127.0.0.1 local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 50000
    timeout server 50000

${config.haproxy.stats.enabled ? `
# Stats interface
listen stats
    bind *:${config.haproxy.stats.port}
    mode http
    stats enable
    stats uri /stats
    stats refresh 30s
    stats auth ${config.haproxy.stats.username}:${config.haproxy.stats.password}
` : ''}

# Frontend
frontend fpl_hub_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/fpl_hub.pem
    redirect scheme https if !{ ssl_fc }
    
    # ACLs for routing
    acl is_health path /health
    acl is_api path_beg /api
    
    # Route health checks to specific backend
    use_backend health_check if is_health
    
    # Route API requests to backend
    use_backend fpl_hub_backend if is_api
    
    # Default backend
    default_backend fpl_hub_backend

# Health check backend
backend health_check
    mode http
    option httpchk GET /health
    http-check expect status 200
    server health_check 127.0.0.1:5000 check inter ${config.haproxy.healthCheck.interval}ms rise ${config.haproxy.healthCheck.healthyThreshold} fall ${config.haproxy.healthCheck.unhealthyThreshold}

# Main backend
backend fpl_hub_backend
    mode http
    balance roundrobin
    option httpchk GET ${config.haproxy.healthCheck.uri}
    http-check expect status 200
    cookie SERVERID insert indirect nocache
    
    server server1 127.0.0.1:5000 check inter ${config.haproxy.healthCheck.interval}ms rise ${config.haproxy.healthCheck.healthyThreshold} fall ${config.haproxy.healthCheck.unhealthyThreshold} cookie server1
    server server2 127.0.0.1:5001 check inter ${config.haproxy.healthCheck.interval}ms rise ${config.haproxy.healthCheck.healthyThreshold} fall ${config.haproxy.healthCheck.unhealthyThreshold} cookie server2
    server server3 127.0.0.1:5002 check inter ${config.haproxy.healthCheck.interval}ms rise ${config.haproxy.healthCheck.healthyThreshold} fall ${config.haproxy.healthCheck.unhealthyThreshold} cookie server3
`;
  
  return haproxyConfig;
};

// Function to validate load balancer configuration
const validateLoadBalancerConfig = (config) => {
  const errors = [];
  
  if (config.nginx.enabled) {
    if (config.nginx.ssl.enabled) {
      if (!config.nginx.ssl.certPath || !config.nginx.ssl.keyPath) {
        errors.push('Nginx SSL requires certPath and keyPath');
      }
    }
  }
  
  if (config.haproxy.enabled) {
    if (config.haproxy.stats.enabled && !config.haproxy.stats.password) {
      errors.push('HAProxy stats require password');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Load balancer configuration errors: ${errors.join(', ')}`);
  }
  
  return true;
};

// Function to get load balancer health status
const getLoadBalancerHealth = (config) => {
  const health = {
    cluster: {
      enabled: config.cluster.enabled,
      workers: config.cluster.enabled ? Object.keys(cluster.workers).length : 0,
      totalWorkers: config.cluster.workers
    },
    nginx: {
      enabled: config.nginx.enabled,
      status: 'unknown'
    },
    haproxy: {
      enabled: config.haproxy.enabled,
      status: 'unknown'
    }
  };
  
  return health;
};

module.exports = {
  loadBalancerConfig,
  createClusterWorkers,
  generateNginxConfig,
  generateHAProxyConfig,
  validateLoadBalancerConfig,
  getLoadBalancerHealth
};

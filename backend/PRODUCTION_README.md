# 🚀 FPL Hub Backend - Production Deployment Guide

This guide covers the complete production deployment of the FPL Hub Backend with enterprise-grade infrastructure, security best practices, monitoring, and maintenance.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Features](#infrastructure-features)
3. [Security Features](#security-features)
4. [Environment Configuration](#environment-configuration)
5. [Deployment](#deployment)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Security Hardening](#security-hardening)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## 🔧 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: Version 18.0.0 or higher
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 10GB free space
- **CPU**: 2+ cores recommended

### Software Dependencies
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install nginx (for reverse proxy and load balancing)
sudo apt-get install nginx

# Install HAProxy (alternative to nginx)
sudo apt-get install haproxy

# Install Redis (for session storage and caching)
sudo apt-get install redis-server

# Install PostgreSQL (recommended for production)
sudo apt-get install postgresql postgresql-contrib

# Install OpenSSL (for SSL certificate management)
sudo apt-get install openssl

# Install fail2ban (for security)
sudo apt-get install fail2ban
```

## 🏗️ Infrastructure Features

### 1. **SSL/HTTPS Configuration**
- **Let's Encrypt Integration**: Automatic SSL certificate generation and renewal
- **Manual SSL Support**: Custom certificate installation
- **Self-Signed Certificates**: Development and testing support
- **TLS 1.2+ Support**: Modern encryption protocols
- **Certificate Validation**: Automatic certificate health checks

### 2. **Production Database Setup**
- **PostgreSQL Support**: Full production database with connection pooling
- **SQLite Fallback**: Development and testing support
- **Connection Pooling**: Configurable pool sizes and timeouts
- **SSL Database Connections**: Encrypted database communication
- **Health Monitoring**: Real-time database status tracking
- **Migration Management**: Automated schema updates

### 3. **Load Balancer Configuration**
- **Node.js Clustering**: Multi-process load balancing
- **Nginx Integration**: Reverse proxy with load balancing
- **HAProxy Support**: Alternative load balancing solution
- **Health Checks**: Automatic backend health monitoring
- **Failover Support**: Automatic server failover
- **Session Affinity**: Sticky session support
- **Circuit Breaker**: Application-level fault tolerance

### 4. **CDN Integration**
- **AWS CloudFront**: Full AWS CDN integration
- **Cloudflare Support**: Cloudflare CDN configuration
- **Azure CDN**: Microsoft Azure CDN support
- **Google Cloud CDN**: Google Cloud CDN integration
- **Asset Optimization**: Automatic compression and minification
- **Cache Invalidation**: Intelligent cache management
- **Performance Monitoring**: CDN health and performance tracking

### 5. **Backup Automation System**
- **Database Backups**: Automated PostgreSQL/SQLite backups
- **File Backups**: Complete file system backup
- **Cloud Storage**: AWS S3, Google Cloud, Azure Blob support
- **Encryption**: Backup encryption for security
- **Compression**: Automatic backup compression
- **Retention Policies**: Configurable backup retention
- **Automated Scheduling**: Cron-based backup automation
- **Recovery Tools**: One-click database restoration

## 🛡️ Security Features

### Implemented Security Measures

#### 1. **Rate Limiting**
- **Global**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **OTP**: 3 attempts per hour per IP
- **Admin**: 50 requests per 15 minutes per IP

#### 2. **Security Headers (Helmet.js)**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)

#### 3. **Input Validation & Sanitization**
- Express-validator for request validation
- Express-sanitizer for input sanitization
- HTTP Parameter Pollution (HPP) protection
- SQL injection protection via Prisma ORM

#### 4. **Authentication & Authorization**
- JWT tokens with configurable expiry
- Role-based access control (RBAC)
- Permission-based access control (PBAC)
- Session management with device tracking

#### 5. **CORS Configuration**
- Configurable allowed origins
- Credential support
- Method restrictions
- Header restrictions

## ⚙️ Environment Configuration

### Production Environment File

Copy `env.production.example` to `.env` and configure:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security (CHANGE THESE!)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
SESSION_SECRET=your-session-secret

# Database
DATABASE_URL=file:./production.db

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=50
AUTH_RATE_LIMIT_MAX=3
OTP_RATE_LIMIT_MAX=2

# Logging
LOG_LEVEL=warn
LOG_FILE_PATH=./logs

# SSL/TLS (if using HTTPS)
SSL_ENABLED=true
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
```

### Critical Security Variables

```bash
# MUST CHANGE IN PRODUCTION
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
SESSION_SECRET=your-session-secret

# Generate secure secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For SESSION_SECRET
```

## 🚀 Deployment

### Quick Deployment

```bash
# 1. Clone repository
git clone <your-repo-url>
cd fpl-hub-backend

# 2. Make deployment script executable
chmod +x scripts/deploy-production.sh

# 3. Run deployment script
./scripts/deploy-production.sh
```

### Manual Deployment

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Setup environment
cp env.production.example .env
# Edit .env with your configuration

# 3. Setup database
npx prisma generate
npx prisma migrate deploy

# 4. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker Deployment (Alternative)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t fpl-hub-backend .
docker run -d -p 5000:5000 --name fpl-hub fpl-hub-backend
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# Basic health check
GET /health

# Detailed health check
GET /health/detailed

# Database health
GET /health/database

# Memory usage
GET /health/memory

# Performance metrics
GET /health/performance

# Kubernetes probes
GET /health/ready
GET /health/live
```

### Health Check Response Example

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-09-03T18:40:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "memory": {
      "status": "healthy",
      "rss": "45MB",
      "usagePercent": 23
    }
  }
}
```

### Monitoring with PM2

```bash
# View application status
pm2 status

# View logs
pm2 logs fpl-hub

# Monitor resources
pm2 monit

# Restart application
pm2 restart fpl-hub

# Stop application
pm2 stop fpl-hub
```

## 🔒 Security Hardening

### Firewall Configuration

```bash
# UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp  # Only if not using nginx
sudo ufw enable
```

### SSL/TLS Configuration

```bash
# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout private.key -out certificate.crt

# For production, use Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/fpl-hub
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 💾 Backup & Recovery

### Database Backup

```bash
# Manual backup
cp production.db backup-$(date +%Y%m%d).db

# Automated backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/fpl-hub"
DATE=$(date +%Y%m%d-%H%M%S)
cp production.db $BACKUP_DIR/backup-$DATE.db

# Keep only last 30 backups
ls -t $BACKUP_DIR/backup-*.db | tail -n +31 | xargs rm -f
```

### Application Backup

```bash
# Backup entire application
tar -czf fpl-hub-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=*.db \
  .
```

### Recovery Process

```bash
# 1. Stop application
pm2 stop fpl-hub

# 2. Restore database
cp backup-20250903.db production.db

# 3. Restore application (if needed)
tar -xzf fpl-hub-backup-20250903.tar.gz

# 4. Restart application
pm2 start fpl-hub
```

## 🔍 Troubleshooting

### Common Issues

#### 1. **Application Won't Start**
```bash
# Check logs
pm2 logs fpl-hub
tail -f /var/log/fpl-hub/error.log

# Check environment
cat .env | grep -v "^#" | grep -v "^$"

# Check database
npx prisma db push
```

#### 2. **Rate Limiting Issues**
```bash
# Check rate limit headers
curl -I http://localhost:5000/api/auth/login

# Response headers should include:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: 1756927000
```

#### 3. **Database Connection Issues**
```bash
# Test database connection
npx prisma db push --preview-feature

# Check database file permissions
ls -la *.db

# Verify database integrity
sqlite3 production.db "PRAGMA integrity_check;"
```

#### 4. **Memory Issues**
```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart fpl-hub --max-memory-restart 1G

# Check system memory
free -h
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
pm2 restart fpl-hub

# View detailed logs
pm2 logs fpl-hub --lines 100
```

## 🛠️ Maintenance

### Regular Maintenance Tasks

#### Daily
- Check application logs for errors
- Monitor health check endpoints
- Verify database connectivity

#### Weekly
- Review rate limiting statistics
- Check disk space usage
- Review security logs

#### Monthly
- Update dependencies
- Review and rotate logs
- Performance analysis
- Security audit

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update major versions (carefully)
npx npm-check-updates -u
npm install

# Test application
npm test
pm2 restart fpl-hub
```

### Log Management

```bash
# Log rotation is configured automatically
# Manual log cleanup
sudo logrotate -f /etc/logrotate.d/fpl-hub

# Archive old logs
find /var/log/fpl-hub -name "*.log.*" -mtime +30 -delete
```

## 📚 Additional Resources

### Security References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practices-security.html)

### Monitoring Tools
- [PM2 Monitoring](https://pm2.keymetrics.io/docs/usage/monitoring/)
- [Winston Logging](https://github.com/winstonjs/winston)
- [Health Check Standards](https://microservices.io/patterns/observability/health-check-api.html)

### Production Best Practices
- [12 Factor App](https://12factor.net/)
- [Node.js Production Best Practices](https://expressjs.com/en/advanced/best-practices-performance.html)
- [Database Security](https://www.prisma.io/docs/guides/security)

## 🆘 Support

### Getting Help
1. Check the logs: `pm2 logs fpl-hub`
2. Review this documentation
3. Check health endpoints: `/health`
4. Review environment configuration
5. Contact development team

### Emergency Contacts
- **System Administrator**: [Contact Info]
- **Development Team**: [Contact Info]
- **Security Team**: [Contact Info]

---

**⚠️ Security Notice**: This application handles sensitive user data. Ensure all security measures are properly configured before going live. Regularly review and update security configurations.

#!/bin/bash

# Production Deployment Script for FPL Hub Backend
# This script sets up the production environment with security best practices

set -e  # Exit on any error

echo "🚀 Starting FPL Hub Backend Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="fpl-hub-backend"
PRODUCTION_DIR="/opt/fpl-hub"
SERVICE_NAME="fpl-hub"
BACKUP_DIR="/opt/backups/fpl-hub"
LOG_DIR="/var/log/fpl-hub"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required (current: $(node --version))"
        exit 1
    fi
    
    print_success "Node.js version: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "npm version: $(npm --version)"
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
    
    print_success "PM2 version: $(pm2 --version)"
}

# Function to create production directories
create_directories() {
    print_status "Creating production directories..."
    
    sudo mkdir -p $PRODUCTION_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p $LOG_DIR
    sudo mkdir -p $PRODUCTION_DIR/logs
    
    # Set ownership
    sudo chown -R $USER:$USER $PRODUCTION_DIR
    sudo chown -R $USER:$USER $BACKUP_DIR
    sudo chown -R $USER:$USER $LOG_DIR
    
    print_success "Production directories created"
}

# Function to backup existing installation
backup_existing() {
    if [ -d "$PRODUCTION_DIR" ] && [ "$(ls -A $PRODUCTION_DIR)" ]; then
        print_status "Backing up existing installation..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        sudo cp -r $PRODUCTION_DIR $BACKUP_DIR/$BACKUP_NAME
        
        print_success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    fi
}

# Function to copy application files
copy_application() {
    print_status "Copying application files..."
    
    # Copy application files
    cp -r . $PRODUCTION_DIR/
    
    # Remove development files
    cd $PRODUCTION_DIR
    rm -rf .git .github node_modules package-lock.json
    
    print_success "Application files copied"
}

# Function to setup production environment
setup_environment() {
    print_status "Setting up production environment..."
    
    cd $PRODUCTION_DIR
    
    # Copy production environment file
    if [ -f "env.production.example" ]; then
        cp env.production.example .env
        print_warning "Please edit .env file with your production configuration"
        print_warning "Especially update JWT_SECRET and other sensitive values"
    else
        print_error "Production environment file not found"
        exit 1
    fi
    
    # Install production dependencies
    print_status "Installing production dependencies..."
    npm ci --only=production
    
    print_success "Production environment setup complete"
}

# Function to setup database
setup_database() {
    print_status "Setting up production database..."
    
    cd $PRODUCTION_DIR
    
    # Generate Prisma client
    npx prisma generate
    
    # Run database migrations
    npx prisma migrate deploy
    
    print_success "Database setup complete"
}

# Function to create systemd service
create_service() {
    print_status "Creating systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    
    sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=FPL Hub Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PRODUCTION_DIR
Environment=NODE_ENV=production
Environment=PATH=$PRODUCTION_DIR/node_modules/.bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/app.log
StandardError=append:$LOG_DIR/error.log

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable service
    sudo systemctl enable $SERVICE_NAME
    
    print_success "Systemd service created and enabled"
}

# Function to setup PM2 ecosystem
setup_pm2() {
    print_status "Setting up PM2 ecosystem..."
    
    cd $PRODUCTION_DIR
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'server.js',
    cwd: '$PRODUCTION_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '$LOG_DIR/pm2-error.log',
    out_file: '$LOG_DIR/pm2-out.log',
    log_file: '$LOG_DIR/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    
    print_success "PM2 ecosystem file created"
}

# Function to setup nginx (optional)
setup_nginx() {
    read -p "Do you want to setup nginx as reverse proxy? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Setting up nginx configuration..."
        
        NGINX_CONF="/etc/nginx/sites-available/$SERVICE_NAME"
        
        sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # Replace with your domain
    
    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000;
        access_log off;
    }
}
EOF
        
        # Enable site
        sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
        sudo nginx -t
        sudo systemctl reload nginx
        
        print_success "Nginx configuration created and enabled"
        print_warning "Please update the domain and SSL certificate paths in the nginx config"
    fi
}

# Function to setup firewall
setup_firewall() {
    print_status "Setting up firewall rules..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        sudo ufw allow 22/tcp    # SSH
        sudo ufw allow 80/tcp    # HTTP
        sudo ufw allow 443/tcp   # HTTPS
        sudo ufw allow 5000/tcp  # Node.js app (if not using nginx)
        
        print_success "Firewall rules configured"
    else
        print_warning "ufw not available, please configure firewall manually"
    fi
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    cd $PRODUCTION_DIR
    
    # Create log rotation config
    sudo tee /etc/logrotate.d/$SERVICE_NAME > /dev/null <<EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF
    
    print_success "Log rotation configured"
}

# Function to start application
start_application() {
    print_status "Starting application..."
    
    cd $PRODUCTION_DIR
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    pm2 startup
    
    print_success "Application started with PM2"
    
    # Show status
    pm2 status
}

# Function to run security checks
security_checks() {
    print_status "Running security checks..."
    
    cd $PRODUCTION_DIR
    
    # Check for common security issues
    if grep -q "password\|secret\|key" .env; then
        print_warning "Found sensitive information in .env file"
        print_warning "Ensure .env file has restricted permissions (600)"
    fi
    
    # Check file permissions
    chmod 600 .env
    chmod 755 .
    
    print_success "Security checks completed"
}

# Function to display deployment summary
deployment_summary() {
    echo
    echo "🎉 FPL Hub Backend Production Deployment Complete!"
    echo
    echo "📁 Installation Directory: $PRODUCTION_DIR"
    echo "📊 Logs Directory: $LOG_DIR"
    echo "🔄 Service Name: $SERVICE_NAME"
    echo "🌐 Health Check: http://localhost:5000/health"
    echo
    echo "📋 Next Steps:"
    echo "1. Edit $PRODUCTION_DIR/.env with your production configuration"
    echo "2. Update JWT_SECRET and other sensitive values"
    echo "3. Configure SSL certificates if using HTTPS"
    echo "4. Update nginx configuration with your domain"
    echo "5. Test the application: curl http://localhost:5000/health"
    echo
    echo "🔧 Useful Commands:"
    echo "  PM2 Status: pm2 status"
    echo "  PM2 Logs: pm2 logs $SERVICE_NAME"
    echo "  Restart: pm2 restart $SERVICE_NAME"
    echo "  Stop: pm2 stop $SERVICE_NAME"
    echo
    echo "📚 Documentation: Check the README.md for more information"
}

# Main deployment process
main() {
    echo "🚀 FPL Hub Backend Production Deployment"
    echo "=========================================="
    echo
    
    check_prerequisites
    create_directories
    backup_existing
    copy_application
    setup_environment
    setup_database
    create_service
    setup_pm2
    setup_nginx
    setup_firewall
    setup_monitoring
    start_application
    security_checks
    deployment_summary
}

# Run main function
main "$@"

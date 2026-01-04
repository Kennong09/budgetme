#!/bin/bash

##############################################################################
# AWS EC2 Deployment Script for BudgetMe Prophet API
# This script sets up and deploys the Facebook Prophet prediction service
# on an AWS EC2 instance (Ubuntu 22.04 LTS)
##############################################################################

set -e  # Exit on error

echo "🚀 BudgetMe Prophet API - AWS EC2 Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Starting deployment process..."

# Update system packages
print_status "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install required system packages
print_status "Installing system dependencies..."
apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    nginx \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    curl \
    wget

# Install certbot for SSL (optional)
print_status "Installing Certbot for SSL..."
apt-get install -y certbot python3-certbot-nginx

# Create application user
print_status "Creating application user..."
if ! id -u budgetme > /dev/null 2>&1; then
    useradd -m -s /bin/bash budgetme
    print_status "User 'budgetme' created"
else
    print_warning "User 'budgetme' already exists"
fi

# Create application directory
APP_DIR="/home/budgetme/prediction_api"
print_status "Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR
chown -R budgetme:budgetme /home/budgetme

# Copy application files (assumes you're in the prediction_api directory)
print_status "Copying application files..."
if [ -f "main.py" ]; then
    cp -r . $APP_DIR/
    chown -R budgetme:budgetme $APP_DIR
    print_status "Application files copied"
else
    print_error "main.py not found. Please run this script from the prediction_api directory"
    exit 1
fi

# Set up Python virtual environment
print_status "Setting up Python virtual environment..."
cd $APP_DIR
sudo -u budgetme python3.11 -m venv venv
print_status "Virtual environment created"

# Install Python dependencies
print_status "Installing Python dependencies (this may take 5-10 minutes)..."
sudo -u budgetme $APP_DIR/venv/bin/pip install --upgrade pip
sudo -u budgetme $APP_DIR/venv/bin/pip install -r $APP_DIR/requirements-production.txt
print_status "Python dependencies installed"

# Create environment file
print_status "Creating environment configuration..."
cat > $APP_DIR/.env << EOF
# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL:-your_supabase_url_here}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-your_anon_key_here}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-your_service_key_here}

# OpenRouter AI Configuration (optional)
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}

# Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=False
LOG_LEVEL=INFO

# CORS Configuration
CORS_ORIGINS=https://budgetme.site,http://localhost:3000

# Prophet Configuration
PROPHET_SEASONALITY_MODE=additive
PROPHET_YEARLY_SEASONALITY=True
PROPHET_WEEKLY_SEASONALITY=False
PROPHET_DAILY_SEASONALITY=False

# Usage Limits
MAX_PREDICTIONS_PER_MONTH=5
PREDICTION_CACHE_TTL_HOURS=24
EOF

chown budgetme:budgetme $APP_DIR/.env
chmod 600 $APP_DIR/.env
print_warning "Please edit $APP_DIR/.env with your actual configuration values"

# Create systemd service file
print_status "Creating systemd service..."
cat > /etc/systemd/system/budgetme-prophet.service << EOF
[Unit]
Description=BudgetMe Prophet Prediction API
After=network.target

[Service]
Type=simple
User=budgetme
Group=budgetme
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2

# Restart policy
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/predictions $APP_DIR/logs

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=budgetme-prophet

[Install]
WantedBy=multi-user.target
EOF

print_status "Systemd service created"

# Create log directories
print_status "Creating log directories..."
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/predictions/cache_index
mkdir -p $APP_DIR/predictions/user_predictions
chown -R budgetme:budgetme $APP_DIR/logs $APP_DIR/predictions
print_status "Log directories created"

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/budgetme-prophet << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain or EC2 public IP

    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/budgetme-prophet-access.log;
    error_log /var/log/nginx/budgetme-prophet-error.log;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts (Prophet can take time)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/budgetme-prophet /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

print_status "Nginx configured"

# Enable and start services
print_status "Enabling and starting services..."
systemctl daemon-reload
systemctl enable budgetme-prophet
systemctl start budgetme-prophet
systemctl restart nginx

print_status "Services started"

# Wait for service to start
sleep 5

# Check service status
if systemctl is-active --quiet budgetme-prophet; then
    print_status "Prophet API service is running"
else
    print_error "Prophet API service failed to start. Check logs with: journalctl -u budgetme-prophet -n 50"
    exit 1
fi

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "📋 Service Information:"
echo "  - Status: $(systemctl is-active budgetme-prophet)"
echo "  - API URL: http://$PUBLIC_IP"
echo "  - Health Check: http://$PUBLIC_IP/health"
echo "  - API Docs: http://$PUBLIC_IP/docs"
echo ""
echo "🔧 Useful Commands:"
echo "  - Check status: sudo systemctl status budgetme-prophet"
echo "  - View logs: sudo journalctl -u budgetme-prophet -f"
echo "  - Restart service: sudo systemctl restart budgetme-prophet"
echo "  - Edit config: sudo nano $APP_DIR/.env"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "  1. Edit $APP_DIR/.env with your actual configuration"
echo "  2. Restart service: sudo systemctl restart budgetme-prophet"
echo "  3. Configure EC2 Security Group to allow HTTP (port 80)"
echo "  4. (Optional) Set up SSL with: sudo certbot --nginx"
echo "  5. Update your frontend to use: http://$PUBLIC_IP"
echo ""
echo "🧪 Test the API:"
echo "  curl http://$PUBLIC_IP/health"
echo ""

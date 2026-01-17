# RxDx Deployment Guide

This guide covers deploying RxDx to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [SSL/TLS Configuration](#ssltls-configuration)
4. [Production Deployment](#production-deployment)
5. [Staging Deployment](#staging-deployment)
6. [Post-Deployment](#post-deployment)
7. [Monitoring](#monitoring)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 22.04 LTS or similar Linux distribution
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB minimum, SSD recommended
- **Network**: Static IP address, open ports 80 and 443

### Software Requirements

- Docker Engine 24.0+
- Docker Compose v2
- Git
- OpenSSL (for SSL certificates)

### Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose v2
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Environment Setup

### 1. Clone Repository

```bash
# Clone to production directory
cd /opt
sudo git clone <repository-url> rxdx
cd rxdx
sudo chown -R $USER:$USER .
```

### 2. Configure Environment

```bash
# Copy production environment template
cp .env.production .env

# Edit configuration
nano .env
```

**Critical settings to update:**

```env
# Strong passwords
POSTGRES_PASSWORD=<generate-strong-password>
SECRET_KEY=<generate-strong-secret>

# Your domain
VITE_API_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com

# Email configuration
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@your-domain.com
```

**Generate strong secrets:**

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate POSTGRES_PASSWORD
openssl rand -base64 32
```

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl

# Set up auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet && docker compose restart nginx
```

### Option 2: Self-Signed Certificate (Development/Testing)

```bash
# Generate self-signed certificate
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### Option 3: Commercial Certificate

```bash
# Copy your commercial certificates
mkdir -p nginx/ssl
cp /path/to/your/certificate.crt nginx/ssl/cert.pem
cp /path/to/your/private.key nginx/ssl/key.pem
chmod 600 nginx/ssl/key.pem
```

## Production Deployment

### 1. Build Images

```bash
# Build all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Verify images
docker images | grep rxdx
```

### 2. Start Services

```bash
# Start in detached mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 3. Initialize Database

```bash
# Wait for PostgreSQL to be ready (about 30 seconds)
docker compose exec postgres pg_isready -U rxdx_prod

# Initialize database schema
docker compose exec backend uv run python -m app.db.init_schema
```

### 4. Verify Deployment

```bash
# Check health endpoints
curl https://your-domain.com/health
curl https://your-domain.com/api/health

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# View all logs
docker compose logs --tail=100
```

## Staging Deployment

Staging environment mirrors production for testing:

```bash
# Use staging configuration
cp .env.staging .env

# Deploy to staging
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Initialize database
docker compose exec backend uv run python -m app.db.init_schema
```

## Post-Deployment

### 1. Create Admin User

```bash
# Access backend container
docker compose exec backend bash

# Create admin user (implement this script)
uv run python -m app.scripts.create_admin_user \
  --email admin@your-domain.com \
  --password <secure-password> \
  --full-name "Admin User"
```

### 2. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 3. Set Up Log Rotation

```bash
# Create log rotation config
sudo nano /etc/logrotate.d/rxdx
```

Add:

```
/opt/rxdx/nginx/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker compose -f /opt/rxdx/docker-compose.yml exec nginx nginx -s reload
    endscript
}
```

### 4. Configure Automatic Backups

```bash
# Create backup script
sudo nano /opt/rxdx/scripts/backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/opt/rxdx/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U rxdx_prod rxdx_prod > $BACKUP_DIR/db_$DATE.sql

# Backup volumes
docker run --rm -v rxdx_postgres_data_prod:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/volumes_$DATE.tar.gz /data

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

```bash
# Make executable
chmod +x /opt/rxdx/scripts/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/rxdx/scripts/backup.sh
```

## Monitoring

### Health Checks

```bash
# Create monitoring script
nano /opt/rxdx/scripts/health_check.sh
```

Add:

```bash
#!/bin/bash
HEALTH_URL="https://your-domain.com/health"
ALERT_EMAIL="admin@your-domain.com"

if ! curl -f -s $HEALTH_URL > /dev/null; then
    echo "RxDx health check failed at $(date)" | mail -s "RxDx Alert" $ALERT_EMAIL
    docker compose -f /opt/rxdx/docker-compose.yml restart
fi
```

### Log Monitoring

```bash
# View real-time logs
docker compose logs -f

# View specific service
docker compose logs -f backend

# Search logs
docker compose logs | grep ERROR

# Export logs
docker compose logs > logs_$(date +%Y%m%d).txt
```

### Resource Monitoring

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Backup and Recovery

### Manual Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U rxdx_prod rxdx_prod > backup_$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v rxdx_postgres_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/volumes_$(date +%Y%m%d).tar.gz /data

# Backup configuration
tar czf config_$(date +%Y%m%d).tar.gz .env nginx/ssl/
```

### Restore from Backup

```bash
# Stop services
docker compose down

# Restore database
docker compose up postgres -d
sleep 10
docker compose exec -T postgres psql -U rxdx_prod rxdx_prod < backup_20240117.sql

# Restore volumes
docker run --rm -v rxdx_postgres_data_prod:/data -v $(pwd):/backup alpine tar xzf /backup/volumes_20240117.tar.gz -C /

# Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check memory
free -h

# Restart services
docker compose restart
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U rxdx_prod -d rxdx_prod -c "SELECT 1;"

# Reset database
docker compose down -v
docker compose up postgres -d
docker compose exec backend uv run python -m app.db.init_schema
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal

# Copy new certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Restart nginx
docker compose restart nginx
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase backend workers
# Edit docker-compose.prod.yml: --workers 8

# Optimize PostgreSQL
docker compose exec postgres psql -U rxdx_prod -d rxdx_prod
# Run: VACUUM ANALYZE;

# Clear nginx cache
docker compose exec nginx rm -rf /var/cache/nginx/*
docker compose restart nginx
```

## Rollback Procedure

```bash
# Stop current deployment
docker compose down

# Restore previous version
git checkout <previous-tag>

# Restore database backup
docker compose up postgres -d
docker compose exec -T postgres psql -U rxdx_prod rxdx_prod < backup_before_update.sql

# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] Security headers enabled in nginx
- [ ] Rate limiting configured
- [ ] Database access restricted
- [ ] Environment variables secured
- [ ] Regular security updates applied

## Maintenance

### Regular Tasks

**Daily:**
- Check health endpoints
- Review error logs
- Monitor disk space

**Weekly:**
- Review backup integrity
- Check for security updates
- Review access logs

**Monthly:**
- Update dependencies
- Review and rotate logs
- Performance optimization
- Security audit

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Backup before update
./scripts/backup.sh

# Apply updates
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations (if any)
docker compose exec backend uv run alembic upgrade head

# Verify
curl https://your-domain.com/health
```

## Support

For deployment issues:
- Check logs: `docker compose logs`
- Review documentation: [README.md](README.md)
- Contact support: support@rxdx.example.com

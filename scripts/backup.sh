#!/bin/bash
# RxDx Backup Script

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RxDx Backup Script${NC}"
echo -e "${GREEN}Date: $(date)${NC}"
echo -e "${GREEN}========================================${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
echo -e "${GREEN}Backing up PostgreSQL database...${NC}"
docker compose exec -T postgres pg_dump -U ${POSTGRES_USER:-rxdx} ${POSTGRES_DB:-rxdx} > "$BACKUP_DIR/db_$DATE.sql"
gzip "$BACKUP_DIR/db_$DATE.sql"
echo -e "${GREEN}✓ Database backup: db_$DATE.sql.gz${NC}"

# Backup Docker volumes
echo -e "${GREEN}Backing up Docker volumes...${NC}"
docker run --rm \
    -v rxdx_postgres_data:/data \
    -v "$(pwd)/$BACKUP_DIR":/backup \
    alpine tar czf "/backup/volumes_$DATE.tar.gz" /data
echo -e "${GREEN}✓ Volumes backup: volumes_$DATE.tar.gz${NC}"

# Backup configuration files
echo -e "${GREEN}Backing up configuration...${NC}"
tar czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    .env \
    nginx/nginx.conf \
    nginx/nginx.prod.conf \
    docker-compose.yml \
    docker-compose.prod.yml \
    2>/dev/null || true
echo -e "${GREEN}✓ Config backup: config_$DATE.tar.gz${NC}"

# Calculate backup sizes
DB_SIZE=$(du -h "$BACKUP_DIR/db_$DATE.sql.gz" | cut -f1)
VOL_SIZE=$(du -h "$BACKUP_DIR/volumes_$DATE.tar.gz" | cut -f1)
CONF_SIZE=$(du -h "$BACKUP_DIR/config_$DATE.tar.gz" | cut -f1)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Database: $DB_SIZE"
echo "Volumes: $VOL_SIZE"
echo "Config: $CONF_SIZE"
echo "Location: $BACKUP_DIR"

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ Cleanup complete${NC}"

# List recent backups
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Recent Backups${NC}"
echo -e "${GREEN}========================================${NC}"
ls -lh "$BACKUP_DIR" | tail -10

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

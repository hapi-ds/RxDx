#!/bin/bash
# RxDx Restore Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <backup_date>${NC}"
    echo "Example: $0 20240117_143000"
    echo ""
    echo "Available backups:"
    ls -1 backups/db_*.sql.gz 2>/dev/null | sed 's/backups\/db_//;s/.sql.gz//' || echo "No backups found"
    exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="${BACKUP_DIR:-./backups}"

echo -e "${RED}========================================${NC}"
echo -e "${RED}RxDx Restore Script${NC}"
echo -e "${RED}WARNING: This will overwrite current data!${NC}"
echo -e "${RED}========================================${NC}"

# Check if backup files exist
if [ ! -f "$BACKUP_DIR/db_$BACKUP_DATE.sql.gz" ]; then
    echo -e "${RED}Error: Database backup not found: $BACKUP_DIR/db_$BACKUP_DATE.sql.gz${NC}"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/volumes_$BACKUP_DATE.tar.gz" ]; then
    echo -e "${YELLOW}Warning: Volumes backup not found: $BACKUP_DIR/volumes_$BACKUP_DATE.tar.gz${NC}"
fi

# Confirm restore
echo "Backup date: $BACKUP_DATE"
echo "Database backup: $BACKUP_DIR/db_$BACKUP_DATE.sql.gz"
echo "Volumes backup: $BACKUP_DIR/volumes_$BACKUP_DATE.tar.gz"
echo ""
read -p "Are you sure you want to restore? (type 'yes' to confirm): " -r
if [ "$REPLY" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop services
echo -e "${GREEN}Stopping services...${NC}"
docker compose down

# Restore volumes (if exists)
if [ -f "$BACKUP_DIR/volumes_$BACKUP_DATE.tar.gz" ]; then
    echo -e "${GREEN}Restoring Docker volumes...${NC}"
    docker run --rm \
        -v rxdx_postgres_data:/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/volumes_$BACKUP_DATE.tar.gz -C /"
    echo -e "${GREEN}✓ Volumes restored${NC}"
fi

# Start PostgreSQL
echo -e "${GREEN}Starting PostgreSQL...${NC}"
docker compose up postgres -d

# Wait for PostgreSQL
echo -e "${GREEN}Waiting for PostgreSQL...${NC}"
sleep 10
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-rxdx} > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Restore database
echo -e "${GREEN}Restoring database...${NC}"
gunzip -c "$BACKUP_DIR/db_$BACKUP_DATE.sql.gz" | \
    docker compose exec -T postgres psql -U ${POSTGRES_USER:-rxdx} ${POSTGRES_DB:-rxdx}
echo -e "${GREEN}✓ Database restored${NC}"

# Start all services
echo -e "${GREEN}Starting all services...${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait and check health
echo -e "${GREEN}Checking application health...${NC}"
sleep 10

if curl -f -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Restore Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
docker compose ps

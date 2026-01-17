#!/bin/bash
# RxDx Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RxDx Deployment Script${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please copy .env.$ENVIRONMENT to .env and configure it"
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo -e "${YELLOW}Warning: SSL certificates not found${NC}"
    echo "Deployment will continue, but HTTPS will not work"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest code
echo -e "${GREEN}Pulling latest code...${NC}"
git pull origin main

# Build images
echo -e "${GREEN}Building Docker images...${NC}"
docker compose $COMPOSE_FILES build

# Stop existing containers
echo -e "${GREEN}Stopping existing containers...${NC}"
docker compose down

# Start services
echo -e "${GREEN}Starting services...${NC}"
docker compose $COMPOSE_FILES up -d

# Wait for services to be healthy
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
sleep 10

# Check if PostgreSQL is ready
echo -e "${GREEN}Checking PostgreSQL...${NC}"
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-rxdx_prod} > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

# Initialize database (only if needed)
read -p "Initialize database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Initializing database...${NC}"
    docker compose exec backend uv run python -m app.db.init_schema
fi

# Check health
echo -e "${GREEN}Checking application health...${NC}"
sleep 5

if curl -f -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

# Show status
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Status${NC}"
echo -e "${GREEN}========================================${NC}"
docker compose ps

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Access the application at:"
echo "  - Frontend: http://localhost"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/api/docs"
echo ""
echo "View logs with: docker compose logs -f"

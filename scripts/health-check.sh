#!/bin/bash
# RxDx Health Check Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RxDx Health Check${NC}"
echo -e "${GREEN}Date: $(date)${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check service
check_service() {
    local name=$1
    local url=$2
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✓ $name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $name is unhealthy${NC}"
        return 1
    fi
}

# Check Docker services
echo -e "${GREEN}Checking Docker services...${NC}"
SERVICES_STATUS=$(docker compose ps --format json 2>/dev/null || echo "[]")

if [ "$SERVICES_STATUS" = "[]" ]; then
    echo -e "${RED}✗ No services running${NC}"
    exit 1
fi

# Check individual services
FAILED=0

echo ""
echo -e "${GREEN}Service Status:${NC}"
docker compose ps

echo ""
echo -e "${GREEN}Health Checks:${NC}"

# Backend health
if ! check_service "Backend" "$BACKEND_URL/health"; then
    FAILED=$((FAILED + 1))
fi

# Frontend health (if accessible)
if ! check_service "Frontend" "$FRONTEND_URL"; then
    FAILED=$((FAILED + 1))
fi

# Database health
echo -n "Database: "
if docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-rxdx} > /dev/null 2>&1; then
    echo -e "${GREEN}✓ healthy${NC}"
else
    echo -e "${RED}✗ unhealthy${NC}"
    FAILED=$((FAILED + 1))
fi

# Check disk space
echo ""
echo -e "${GREEN}Disk Usage:${NC}"
df -h / | tail -1

DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠ Warning: Disk usage is above 80%${NC}"
fi

# Check memory
echo ""
echo -e "${GREEN}Memory Usage:${NC}"
free -h | grep Mem

# Check Docker resources
echo ""
echo -e "${GREEN}Docker Resources:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILED check(s) failed${NC}"
    
    # Send alert email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "RxDx health check failed at $(date)" | \
            mail -s "RxDx Health Alert" "$ALERT_EMAIL"
    fi
    
    exit 1
fi

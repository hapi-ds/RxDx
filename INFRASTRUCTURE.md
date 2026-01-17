# RxDx Infrastructure Documentation

This document describes the infrastructure setup, Docker configuration, and deployment architecture for RxDx.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Docker Configuration](#docker-configuration)
3. [Environment Management](#environment-management)
4. [Networking](#networking)
5. [Storage and Volumes](#storage-and-volumes)
6. [Security](#security)
7. [Scaling](#scaling)
8. [Monitoring](#monitoring)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (nginx)                 │
│                    Port 80/443 (HTTPS)                   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌───────▼────────┐
│   Frontend     │       │    Backend     │
│   React + TS   │       │  FastAPI + uv  │
│   Port 3000    │       │   Port 8000    │
└────────────────┘       └───────┬────────┘
                                 │
                         ┌───────▼────────┐
                         │   PostgreSQL   │
                         │  + Apache AGE  │
                         │   Port 5432    │
                         └────────────────┘
```

### Service Dependencies

- **nginx** → frontend, backend
- **frontend** → backend
- **backend** → postgres
- **postgres** → (standalone)

## Docker Configuration

### Multi-Stage Builds

#### Backend Dockerfile

The backend uses a multi-stage build with uv for fast dependency installation:

**Stage 1: Builder**
- Installs uv package manager
- Installs Python dependencies
- Creates virtual environment

**Stage 2: Runtime**
- Minimal Python runtime
- Copies virtual environment from builder
- Runs as non-root user (rxdx)
- Exposes port 8000

**Benefits:**
- Smaller final image size
- Faster builds with layer caching
- Improved security (non-root user)

#### Frontend Dockerfile

The frontend has three build targets:

**Stage 1: Builder**
- Installs Node.js dependencies
- Builds production assets with Vite

**Stage 2: Development**
- Full development environment
- Hot module replacement
- Source maps enabled

**Stage 3: Production**
- nginx-alpine base
- Serves static files
- Optimized for performance

### Docker Compose Files

#### docker-compose.yml (Base)

Defines all services with development defaults:
- Volume mounts for hot reload
- Debug logging enabled
- Permissive CORS
- Development ports exposed

#### docker-compose.prod.yml (Production Overrides)

Production-specific configuration:
- No volume mounts (immutable containers)
- Multiple backend workers
- Optimized PostgreSQL settings
- Restart policies
- Production nginx config

**Usage:**
```bash
# Development
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Environment Management

### Environment Files

| File | Purpose | Usage |
|------|---------|-------|
| `.env.example` | Template with all variables | Copy to create .env |
| `.env.development` | Development defaults | Local development |
| `.env.staging` | Staging configuration | Pre-production testing |
| `.env.production` | Production settings | Production deployment |

### Environment Variables

#### Critical Variables

**Security:**
- `SECRET_KEY` - JWT signing key (generate with `openssl rand -hex 32`)
- `POSTGRES_PASSWORD` - Database password (strong, unique)

**Database:**
- `POSTGRES_USER` - Database username
- `POSTGRES_DB` - Database name
- `DATABASE_URL` - Full connection string (auto-generated)

**Application:**
- `ENVIRONMENT` - development/staging/production
- `DEBUG` - Enable debug mode (false in production)
- `CORS_ORIGINS` - Allowed origins (restrictive in production)

#### Optional Variables

**LLM Integration:**
- `LLM_ENABLED` - Enable local LLM features
- `LLM_STUDIO_URL` - LM-Studio API endpoint
- `LLM_MODEL_NAME` - Model identifier

**Email:**
- `SMTP_HOST`, `SMTP_PORT` - Email server
- `SMTP_USER`, `SMTP_PASSWORD` - Credentials
- `EMAIL_FROM` - Sender address

### Configuration Precedence

1. Environment variables (highest priority)
2. `.env` file
3. Default values in code (lowest priority)

## Networking

### Network Architecture

All services run in a custom bridge network (`rxdx-network`):

**Benefits:**
- Service discovery by name
- Isolated from other Docker networks
- Controlled communication

### Port Mapping

| Service | Internal Port | External Port | Purpose |
|---------|--------------|---------------|---------|
| nginx | 80, 443 | 80, 443 | HTTP/HTTPS |
| backend | 8000 | 8000 | API (dev only) |
| frontend | 3000 | 3000 | Dev server (dev only) |
| postgres | 5432 | 5432 | Database (dev only) |

**Production:** Only ports 80 and 443 are exposed externally.

### Service Communication

**Internal URLs:**
- Backend: `http://backend:8000`
- Frontend: `http://frontend:3000` (dev) or `http://frontend:80` (prod)
- Database: `postgresql://postgres:5432`

**External URLs:**
- Frontend: `https://your-domain.com`
- Backend API: `https://your-domain.com/api`
- API Docs: `https://your-domain.com/api/docs`

## Storage and Volumes

### Volume Types

#### Named Volumes

**postgres_data** (development):
- Stores PostgreSQL data
- Persists across container restarts
- Managed by Docker

**postgres_data_prod** (production):
- Separate production data
- Isolated from development
- Backed up regularly

#### Bind Mounts (Development Only)

**Backend:**
- `./backend:/app` - Source code hot reload
- `./backend/db/init:/docker-entrypoint-initdb.d` - DB init scripts

**Frontend:**
- `./frontend:/app` - Source code hot reload
- `/app/node_modules` - Anonymous volume for dependencies

**Nginx:**
- `./nginx/nginx.conf:/etc/nginx/nginx.conf:ro` - Configuration
- `./nginx/ssl:/etc/nginx/ssl:ro` - SSL certificates

### Volume Management

**List volumes:**
```bash
docker volume ls
```

**Inspect volume:**
```bash
docker volume inspect rxdx_postgres_data
```

**Backup volume:**
```bash
docker run --rm -v rxdx_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

**Restore volume:**
```bash
docker run --rm -v rxdx_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

**Remove volumes:**
```bash
docker compose down -v  # WARNING: Deletes all data
```

## Security

### Container Security

**Non-root Users:**
- Backend runs as user `rxdx` (UID 1000)
- Frontend production runs as `nginx` user
- PostgreSQL runs as `postgres` user

**Read-only Filesystems:**
- Configuration files mounted as read-only (`:ro`)
- SSL certificates read-only

**Resource Limits:**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Network Security

**nginx Security Headers:**
- `Strict-Transport-Security` - Force HTTPS
- `X-Frame-Options` - Prevent clickjacking
- `X-Content-Type-Options` - Prevent MIME sniffing
- `Content-Security-Policy` - XSS protection

**Rate Limiting:**
- API endpoints: 10 requests/second
- Auth endpoints: 5 requests/minute
- Configurable per endpoint

**SSL/TLS:**
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled

### Secrets Management

**DO NOT:**
- Commit secrets to Git
- Use default passwords in production
- Share `.env` files

**DO:**
- Use strong, unique passwords
- Rotate secrets regularly
- Use environment variables
- Consider secrets management tools (Vault, AWS Secrets Manager)

## Scaling

### Horizontal Scaling

**Backend:**
```yaml
services:
  backend:
    deploy:
      replicas: 4
```

Or with docker compose:
```bash
docker compose up --scale backend=4
```

**Load Balancing:**
nginx automatically load balances across backend replicas using `least_conn` algorithm.

### Vertical Scaling

**Increase Resources:**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
```

**PostgreSQL Tuning:**
```yaml
services:
  postgres:
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=512MB
      -c effective_cache_size=2GB
      -c maintenance_work_mem=128MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
```

### Database Scaling

**Read Replicas:**
- Set up PostgreSQL streaming replication
- Route read queries to replicas
- Keep writes on primary

**Connection Pooling:**
- Backend uses SQLAlchemy connection pool
- Configure pool size based on load
- Monitor connection usage

## Monitoring

### Health Checks

**Docker Health Checks:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Check Status:**
```bash
docker compose ps
```

### Logging

**View Logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100

# Since timestamp
docker compose logs --since 2024-01-17T10:00:00
```

**Log Drivers:**
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Metrics

**Container Stats:**
```bash
docker stats
```

**Resource Usage:**
```bash
docker system df
```

**Prometheus Integration (Optional):**
- Add Prometheus exporter to backend
- Configure nginx metrics
- Set up Grafana dashboards

### Alerting

**Health Check Script:**
```bash
# Run periodically via cron
./scripts/health-check.sh
```

**Email Alerts:**
Configure `ALERT_EMAIL` in health-check.sh to receive notifications.

## Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check ports
netstat -tulpn | grep -E '80|443|3000|5432|8000'
```

**Database connection failed:**
```bash
# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U rxdx -d rxdx -c "SELECT 1;"
```

**Out of disk space:**
```bash
# Clean up unused resources
docker system prune -a

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Performance Issues

**High CPU:**
- Check container stats: `docker stats`
- Review application logs for errors
- Consider scaling horizontally

**High Memory:**
- Check for memory leaks
- Adjust container memory limits
- Optimize database queries

**Slow Responses:**
- Check nginx logs for slow requests
- Review database query performance
- Enable caching

## Best Practices

1. **Always use docker-compose.prod.yml for production**
2. **Never expose database ports in production**
3. **Use strong, unique passwords**
4. **Enable SSL/TLS in production**
5. **Set up regular backups**
6. **Monitor resource usage**
7. **Keep images updated**
8. **Use health checks**
9. **Implement log rotation**
10. **Test disaster recovery procedures**

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Apache AGE Documentation](https://age.apache.org/)

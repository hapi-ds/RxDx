# RxDx Quick Start Guide

This guide will help you get RxDx up and running in minutes.

## Prerequisites

- Docker and Docker Compose v2 installed
- At least 4GB of available RAM
- Ports 80, 3000, 5432, and 8000 available

## Step 1: Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd RxDx

# Copy environment file
cp .env.example .env

# (Optional) Edit .env if you want to change default settings
nano .env
```

## Step 2: Start the Services

```bash
# Start all services (PostgreSQL, Backend, Frontend, Nginx)
docker compose up -d

# Wait for services to be healthy (about 30 seconds)
docker compose ps
```

You should see all services with status "Up" and "healthy".

## Step 3: Initialize the Database

```bash
# Initialize PostgreSQL tables and Apache AGE graph
docker compose exec backend uv run python -m app.db.init_schema
```

Expected output:
```
Starting database initialization...

1. Initializing PostgreSQL tables...
PostgreSQL tables initialized successfully

2. Initializing Apache AGE graph schema...
Initializing Apache AGE graph schema...
Supported node types: WorkItem, Requirement, Task, Test, Risk, Failure, Document, Entity, User
Supported relationship types: TESTED_BY, MITIGATES, DEPENDS_ON, IMPLEMENTS, LEADS_TO, RELATES_TO, MENTIONED_IN, REFERENCES, NEXT_VERSION, CREATED_BY, ASSIGNED_TO
Graph initialized successfully. Current node count: 0

✓ Database initialization complete!
```

## Step 4: Access the Application

Open your browser and navigate to:

- **Main Application**: http://localhost
- **Backend API Docs**: http://localhost:8000/api/docs
- **Backend Health**: http://localhost:8000/health
- **Frontend Direct**: http://localhost:3000

## Step 5: Verify Everything Works

### Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"healthy"}`

### Check Database Connection

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U rxdx -d rxdx

# Inside psql, verify AGE extension
\dx age

# Check graph exists
SELECT * FROM ag_graph;

# Exit psql
\q
```

### View Logs

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

## Common Issues

### Port Already in Use

If you see "port is already allocated":

```bash
# Check what's using the port
lsof -i :8000  # or :3000, :5432, :80

# Either stop the conflicting service or change ports in .env
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres
```

### Backend Won't Start

```bash
# Check backend logs
docker compose logs backend

# Common fix: rebuild the backend
docker compose up backend --build
```

## Next Steps

1. **Create Your First User**: Use the API docs at http://localhost:8000/api/docs
2. **Explore the Graph**: Navigate to the graph explorer in the frontend
3. **Read the Documentation**: Check out [README.md](README.md) for detailed information
4. **Development Setup**: See [Backend README](backend/README.md) and [Frontend README](frontend/README.md)

## Stopping the Application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes all data)
docker compose down -v
```

## Development Mode

For local development without Docker:

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database Only

```bash
# Start only PostgreSQL
docker compose up postgres -d
```

## Getting Help

- Check [README.md](README.md) for detailed documentation
- View [Database Setup Guide](backend/db/README.md)
- Open an issue on GitHub
- Contact support@rxdx.example.com

## Success Checklist

- [ ] All services show "Up (healthy)" in `docker compose ps`
- [ ] Backend health check returns `{"status":"healthy"}`
- [ ] Frontend loads at http://localhost
- [ ] API docs accessible at http://localhost:8000/api/docs
- [ ] Database initialized successfully
- [ ] Apache AGE graph created

If all items are checked, you're ready to start using RxDx! 🎉

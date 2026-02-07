# RxDx - Requirement Management System
 
**(R)equirements *(x)* … and much more TO (D)ocuments *(x)* ... and much more**


**RxDx** is a tool for structured engineering work across the full lifecycle of requirements and related artifacts. It supports the creation, refinement, linking, and traceability of content ranging from informal notes to formal requirements, specifications, tests, tasks, and risk items.

Artifacts can be incrementally refined without losing their relationships or history.

Combined with project management - both in parallel **classic (plan-driven)** as well as **agile**.

The system is intended as an entry point for SPEC Driven Development. Open source, easy to start with Docker, all results can be exported as simple documents (docx, xlsx, pdf) for use in a paper-based quality management system. Or you can stay in the system and enjoy all the benefits of paperless working.

## Scope and Characteristics
- Management of content, requirements, specifications, tests, tasks, and risks 
- End-to-end traceability across artifacts (Tracability-Matrix) 
- Agile working/project management, and classic project management management presentations (both in parallel)
- Project-Knowledge-Base and project journaling
- Basis for verification, validation, and impact analysis
- Design Review and Risk Management integrated
- Document exports for downstream QM and compliance processes
- AI assisted
- Different frontends
    - Standard Web frontend for "normal" work (Graph view, Kanban, Gantt, ...)
    - WebXR frontend for a more immersive remote Team-Work (3d Graph-View)
    - Email for communicating upcoming tasks (outgoing) as well as documentation of project progress (incoming emails) and documentation of additional project-related emails (todo lists, minutes, ...)
    - Mobile timesheet-app for tracking working times
    - Documents (Design Documents, FMEA Sheets, Invoices, ... )

# Why / what was the idea?

The original idea was driven by the desire to be able to implement everything in mind maps: requirement management, project management, risk management. There are already approaches for everything, but I haven't seen any that are truly unified (and the way I imagine them).

The second wish was to be able to use this system in VR as well—with the goal of being able to work really well remotely and in a distributed manner. The vision is to be able to discuss and plan requirements, results, and projects in virtual rooms using an immersive graph representation (based on some sci-fi films) of the “minds” (nodes). 

With the use of AI and coding agents, and seeing how well they write specifications, it became clear that this is a must-have in RxDx (formulating requirements was sometimes the most difficult part for my employees). However, in small chunks that can be further developed (refined), are understandable and therefore implementable, and can be supplemented with risks and tasks for implementation.

Further requests: Project progress should not be laboriously recorded in meetings—I think Task-Juggler's approach of recording this using an email system is very good. I think this approach, alongside a time tracking app for cell phones and a ticket system—which can be used as alternatives—is a good addition.
The same goes for the option of work in an agile manner—I have actually always implemented this in my projects—I broke down the next steps for my employees until they were able to implement the challenge at hand, and in this way we achieved the goals we had set. However, I only realized how powerful and systematizable (with a definition of ready and done) this approach is when I implemented projects in an agile manner using requirements management software.

Ultimately, other requests arose, such as: let's create an automated LIMS so that important records relating to defined acceptance criteria are immediately available in a database for further evaluation (complete traceability from requirements to work instructions with acceptance criteria and data collected in production) – or – let's use the recorded data to generate invoices straight away ...

# Current status

Mock / early preview  

The current version represents an early stage of development and is intended to demonstrate structure, concepts, and workflows rather than feature completeness.


## Features

- **User Authentication & Authorization**: Role-based access control with digital signatures
- **Requirements Management**: Versioned requirements with complete audit trails
- **Knowledge Graph**: Apache AGE-powered graph database for relationships
- **Risk Management**: Risk analysis with failure chain visualization and FMEA export
- **Test Management**: Verification and validation tracking
- **Document Generation**: Automated PDF, Excel, and Word document generation
- **Dual Interface**: Standard web UI and immersive 3D/VR interface (WebXR)
- **Local LLM Integration**: Privacy-first AI assistance with LM-Studio
- **Mobile Time Tracking**: React Native app for time recording

## Technology Stack

### Backend
- Python 3.11+ with FastAPI
- PostgreSQL 17 with Apache AGE extension
- SQLAlchemy async ORM
- Pydantic for validation
- uv for package management

### Frontend
- React 18+ with TypeScript
- Zustand for state management
- react-flow for 2D graph visualization
- React Three Fiber (R3F) for 3D/VR
- Vite for build tooling

### Infrastructure
- Docker & docker-compose v2
- nginx reverse proxy
- PostgreSQL with Apache AGE

## Quick Start

### Prerequisites

- Docker and Docker Compose v2
- Python 3.11+ (for local development)
- Node.js 20+ (for local development)
- uv (Python package manager)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd RxDx

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start with Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Nginx: http://localhost:80

### 3. Initialize Database

```bash
# Initialize database schema
docker compose exec backend uv run python -m app.db.init_schema
```

### 4. Access the Application

Open your browser to http://localhost

## Development Setup

### Backend Development

```bash
cd backend

# Install dependencies
uv sync

# Run development server
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov=app
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Database Management

```bash
# Start only PostgreSQL
docker compose up postgres -d

# Connect to database
docker compose exec postgres psql -U rxdx -d rxdx

# View Apache AGE graphs
docker compose exec postgres psql -U rxdx -d rxdx -c "SELECT * FROM ag_graph;"

# Reset database
docker compose down -v
docker compose up postgres -d
docker compose exec backend uv run python -m app.db.init_schema
```

## Project Structure

```
RxDx/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── tests/              # Backend tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API clients
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── nginx/                  # Nginx configuration
├── docker-compose.yml      # Docker orchestration
└── .env.example           # Environment template
```

## Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Database
POSTGRES_USER=rxdx
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=rxdx

# Backend
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# LLM (Optional)
LLM_ENABLED=false
LLM_STUDIO_URL=http://localhost:1234/v1
```

See `.env.example` for all available options.

## Logging and Monitoring

RxDx includes comprehensive logging and monitoring capabilities for debugging and system health tracking.

### Log Configuration

Configure logging via environment variables:

```env
# Backend Logging
LOG_LEVEL=INFO                    # DEBUG, INFO, WARN, ERROR, CRITICAL
LOG_DIR=logs                      # Log directory path
LOG_MAX_BYTES=104857600          # Max log file size (100MB)
LOG_BACKUP_COUNT=14              # Number of backup files to keep

# Frontend Logging
VITE_LOG_LEVEL=INFO              # DEBUG, INFO, WARN, ERROR
```

### Log Files

**Backend logs:** `backend/logs/app.log`
- Structured JSON format in production
- Pretty console format in development
- Automatic rotation at 100MB
- Keeps 14 backup files (~7 days)

**Frontend logs:** Console output (browser environment)
- Structured logging with session tracking
- Request ID tracing for API calls

### Request Tracing

All API requests include a unique `X-Request-ID` header for end-to-end tracing:

```typescript
// Frontend automatically adds request ID
logger.info('API request', { requestId: 'abc-123' });

// Backend logs include the same request ID
logger.info('request_completed', request_id='abc-123', duration_ms=45.2);
```

### Health Check Endpoints

Monitor system health:

```bash
# Basic health check
curl http://localhost:8000/health

# Comprehensive readiness check (includes database status)
curl http://localhost:8000/api/v1/health/ready
```

Response includes:
- Database connectivity status
- Graph database connectivity status
- Response time for each check

### Log Cleanup

Automatically clean old log files:

```bash
# Run cleanup script (removes logs older than 7 days)
./scripts/cleanup-logs.sh

# Add to crontab for daily cleanup at 2 AM
0 2 * * * /path/to/rxdx/scripts/cleanup-logs.sh
```

### Viewing Logs

```bash
# View backend logs
tail -f backend/logs/app.log

# View logs in Docker
docker compose logs -f backend

# Search logs for specific request
grep "request_id=abc-123" backend/logs/app.log
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test file
uv run pytest tests/test_auth.py

# Run property-based tests
uv run pytest -k "property"
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- WorkItem.test.tsx
```

## Deployment

### Production Build

```bash
# Build all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### SSL/TLS Configuration

1. Place SSL certificates in `nginx/ssl/`
2. Update `nginx/nginx.conf` with SSL configuration
3. Restart nginx: `docker compose restart nginx`

## Documentation

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Database Setup](backend/db/README.md)
- [API Documentation](http://localhost:8000/api/docs) (when running)

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres pg_isready -U rxdx
```

### Apache AGE Issues

```bash
# Verify AGE extension
docker compose exec postgres psql -U rxdx -d rxdx -c "\dx age"

# Check graph exists
docker compose exec postgres psql -U rxdx -d rxdx -c "SELECT * FROM ag_graph;"
```

### Backend Issues

```bash
# View backend logs
docker compose logs backend

# Restart backend
docker compose restart backend

# Check health
curl http://localhost:8000/health
```

### Frontend Issues

```bash
# View frontend logs
docker compose logs frontend

# Restart frontend
docker compose restart frontend

# Rebuild
docker compose up frontend --build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

Apache License 2.0

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [documentation-url]

# RxDx - Requirement Management System
 
**(R)equirements *(x)* … and much more → (D)ocuments *(x)* ... and much more**


## RxDx – (R)equirements × … and more → (D)ocuments and more

**RxDx** is a tool for structured engineering work across the full lifecycle of requirements and related artifacts. It supports the creation, refinement, linking, and traceability of content ranging from informal notes to formal requirements, specifications, tests, tasks, and risk items.

The system is designed to be methodology-agnostic. It can be used in **classic (plan-driven)** as well as **agile** project environments and allows both approaches to coexist within the same project. Artifacts can be incrementally refined without losing their relationships or history.

RxDx provides consistent **traceability** between all artifact types. Requirements can be linked to specifications, tests, risks, and tasks, enabling impact analysis, coverage checks, and verification tracking. This makes RxDx suitable not only for project management, but also for **risk management and quality-related activities**.

All maintained content can be exported to common formats (DOCX, PDF, XLSX), allowing integration with external processes and organizations that still rely on document-based or paper-based quality management systems.

### Scope and Characteristics
- Management of content, requirements, specifications, tests, tasks, and risks  
- End-to-end traceability across artifacts  
- Agile working/project management, and classic project management management presentations (both in parallel)
- Basis for verification, validation, and impact analysis
- Design Review and Risk Management integrated
- Document exports for downstream QM and compliance processes 

**Current status:** Mock / early preview  
The current version represents an early stage of development and is intended to demonstrate structure, concepts, and workflows rather than feature completeness.



## Features

- **User Authentication & Authorization**: Role-based access control with digital signatures
- **Requirements Management**: Versioned requirements with complete audit trails
- **Knowledge Graph**: Apache AGE-powered graph database for project relationships
- **Risk Management**: FMEA analysis with failure chain visualization
- **Test Management**: Verification and validation tracking
- **Document Generation**: Automated PDF, Excel, and Word document generation
- **Offline Support**: Work without connectivity and sync when online
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

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [documentation-url]
- Email: support@rxdx.example.com

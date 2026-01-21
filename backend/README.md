# RxDx Backend

Project Management System for Regulated Industries - Backend API

## Technology Stack

- **Python**: 3.11+
- **Framework**: FastAPI
- **Database**: PostgreSQL 17 with Apache AGE extension
- **Package Manager**: uv
- **Testing**: pytest with hypothesis

## Quick Start with Docker

The easiest way to run the application is using Docker Compose:

```bash
# From the project root directory
docker compose up -d

# Initialize database and seed users
docker compose exec backend uv run python -m app.db.init_schema

# View logs
docker compose logs -f backend
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/api/docs
- Frontend: http://localhost:3000

### Default Login Credentials

After running the initialization script, the following users are available:

| Email | Password | Role |
|-------|----------|------|
| test@example.com | AdminPassword123! | user |
| admin@example.com | AdminPassword123! | admin |
| validator@example.com | AdminPassword123! | validator |
| auditor@example.com | AdminPassword123! | auditor |
| pm@example.com | AdminPassword123! | project_manager |

> ⚠️ **Security Note**: Change these passwords in production environments!

## Local Development Setup

### Prerequisites

- Python 3.11 or higher
- uv package manager ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- PostgreSQL 17 with Apache AGE extension

### Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies using uv:
```bash
uv sync
```

3. Copy the environment configuration:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration (especially SECRET_KEY and database credentials)

### Database Initialization

Initialize the database tables and seed default users:

```bash
# With user seeding (recommended for development)
uv run python -m app.db.init_schema

# Without user seeding (for production)
uv run python -m app.db.init_schema --no-seed
```

This script will:
1. Create all PostgreSQL tables (users, audit_logs, digital_signatures)
2. Seed default development users (unless `--no-seed` is passed)
3. Initialize the Apache AGE graph schema

### Running the Application

Development server with auto-reload:
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Development

### Running Tests

Run all tests:
```bash
uv run pytest
```

Run tests with coverage:
```bash
uv run pytest --cov=app --cov-report=html
```

Run specific test file:
```bash
uv run pytest tests/test_auth.py
```

Run tests quietly (recommended for CI):
```bash
uv run pytest -q --tb=short
```

#### WorkItem Schema Tests

The WorkItem schemas are critical to the system and have comprehensive test coverage. You can run them specifically:

```bash
# Run all WorkItem schema tests
uv run pytest tests/test_workitem_schemas.py -v

# Run only the comprehensive validation tests
uv run pytest tests/test_workitem_schemas.py::TestComprehensiveWorkItemValidation -v

# Use the custom test runner script
uv run python scripts/test_workitem_schemas.py
```

The comprehensive test suite includes:
- ✅ Field validation (status, type, priority, etc.)
- ✅ Case normalization (DRAFT → draft)
- ✅ All specialized schemas (Requirement, Task, Test, Risk, Document)
- ✅ Create, Update, and Response schema validation
- ✅ Edge cases and error conditions
- ✅ Integration testing across all schema types

These tests run automatically on every change to WorkItem-related files via pre-commit hooks and CI/CD.

### Code Quality

Format code with Black:
```bash
uv run black app tests
```

Lint with Ruff:
```bash
uv run ruff check app tests
```

Type checking with mypy:
```bash
uv run mypy app
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/                 # API endpoints
│   │   └── v1/              # API version 1 routes
│   ├── core/                # Core configuration
│   │   ├── config.py        # Pydantic Settings
│   │   └── security.py      # Authentication utilities
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic
│   ├── db/                  # Database connection
│   │   ├── session.py       # SQLAlchemy session
│   │   ├── graph.py         # Apache AGE graph service
│   │   └── init_schema.py   # Database initialization
│   └── utils/               # Utilities
├── scripts/                 # Utility scripts
├── tests/                   # Test files
├── pyproject.toml           # Project configuration
├── .env.example             # Environment template
└── README.md
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (invalidate session) |
| GET | `/api/v1/auth/me` | Get current user info |

### WorkItems

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workitems` | List all workitems |
| POST | `/api/v1/workitems` | Create a workitem |
| GET | `/api/v1/workitems/{id}` | Get workitem by ID |
| PATCH | `/api/v1/workitems/{id}` | Update workitem |
| DELETE | `/api/v1/workitems/{id}` | Delete workitem |
| GET | `/api/v1/workitems/{id}/history` | Get version history |

For complete API documentation, visit http://localhost:8000/api/docs when the server is running.

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `SECRET_KEY`: JWT secret key (change in production!)
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_*`: Database connection parameters
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration (default: 30)
- `MAX_LOGIN_ATTEMPTS`: Failed login attempts before lockout (default: 3)
- `ACCOUNT_LOCK_DURATION_HOURS`: Account lockout duration (default: 1)
- `LLM_ENABLED`: Enable local LLM integration
- `SMTP_*`: Email server configuration

## Troubleshooting

### Database Connection Issues

If you see "relation does not exist" errors:
```bash
# Re-run the initialization script
docker compose exec backend uv run python -m app.db.init_schema
```

### Login Not Working

1. Ensure the database is initialized with users:
```bash
docker compose exec backend uv run python -m app.db.init_schema
```

2. Check the backend logs for errors:
```bash
docker compose logs backend
```

3. Verify the API is responding:
```bash
curl http://localhost:8000/health
```

### Reset Database

To completely reset the database:
```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Restart services
docker compose exec backend uv run python -m app.db.init_schema
```

## License

Proprietary - All rights reserved

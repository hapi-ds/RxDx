# RxDx Backend

Project Management System for Regulated Industries - Backend API

## Technology Stack

- **Python**: 3.11+
- **Framework**: FastAPI
- **Database**: PostgreSQL 15+ with Apache AGE extension
- **Package Manager**: uv
- **Testing**: pytest with hypothesis

## Setup

### Prerequisites

- Python 3.11 or higher
- uv package manager ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- PostgreSQL 15+ with Apache AGE extension

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
│   ├── core/                # Core configuration
│   │   └── config.py        # Pydantic Settings
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic
│   ├── db/                  # Database connection
│   └── utils/               # Utilities
├── tests/                   # Test files
├── pyproject.toml           # Project configuration
├── .env.example             # Environment template
└── README.md
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `SECRET_KEY`: JWT secret key (change in production!)
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_*`: Database connection parameters
- `LLM_ENABLED`: Enable local LLM integration
- `SMTP_*`: Email server configuration

## License

Proprietary - All rights reserved

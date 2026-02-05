# RxDx Definition of Done

This document defines the quality gates and validation steps that MUST be completed before any work is considered "done" in the RxDx project. Following these standards ensures code quality, reliability, and maintainability.

## Overview

Work is NOT complete until ALL applicable checks pass:

1. **Code Quality** - Linting and formatting
2. **Type Safety** - Type checking
3. **Testing** - Unit, integration, and property-based tests
4. **Build Verification** - Local and Docker builds
5. **Documentation** - Code comments and user docs
6. **Security** - Vulnerability scanning
7. **Integration** - End-to-end validation

---

## Backend Definition of Done

### 1. Code Quality Checks

#### 1.1 Ruff Linting and Formatting

**Run ruff to check and fix code quality issues:**

```bash
# Check for linting issues
uvx ruff check backend/

# Auto-fix issues where possible
uvx ruff check --fix backend/

# Check formatting
uvx ruff format --check backend/

# Apply formatting
uvx ruff format backend/
```

**What ruff checks**:
- Code style (PEP 8 compliance)
- Import sorting
- Unused imports and variables
- Code complexity
- Security issues (bandit rules)
- Best practices violations

**Required**: All ruff checks must pass with zero errors and warnings.

#### 1.2 Type Checking with ty

**Run ty to verify type annotations:**

```bash
# Check types in backend
cd backend
uvx ty check

# Check specific files
uvx ty check app/services/workitem_service.py

# Check with verbose output
uvx ty check --verbose
```

**What ty checks**:
- Type annotation correctness
- Type consistency across function calls
- Return type accuracy
- Optional/None handling
- Generic type usage

**Required**: All type checks must pass with zero errors.

### 2. Testing

#### 2.1 Unit Tests

**Run pytest for unit tests:**

```bash
# Run all tests
cd backend
uvx pytest

# Run with coverage report
uvx pytest --cov=app --cov-report=term-missing

# Run specific test file
uvx pytest tests/test_workitem_service.py

# Run tests matching pattern
uvx pytest -k "test_create"

# Run with minimal output (for CI/CD)
uvx pytest -q --tb=short
```

**Coverage requirements**:
- Minimum 80% code coverage
- All new code must have tests
- Critical paths must have 100% coverage

#### 2.2 Property-Based Tests

**Run property-based tests with Hypothesis:**

```bash
# Run PBT tests
uvx pytest tests/test_*_properties.py

# Run with more examples
uvx pytest tests/test_*_properties.py --hypothesis-show-statistics

# Run specific property test
uvx pytest tests/test_auth_properties.py::test_password_hashing_property
```

**PBT requirements**:
- All core business logic must have property tests
- Properties must validate invariants
- Tests must handle edge cases

#### 2.3 Integration Tests

**Run integration tests:**

```bash
# Run integration tests
uvx pytest tests/integration/

# Run with database setup
uvx pytest tests/integration/ --setup-show
```

**Integration test requirements**:
- API endpoints tested end-to-end
- Database operations verified
- External service mocks validated

### 3. Build Verification

#### 3.1 Local Build

**Verify Python package builds:**

```bash
# Sync dependencies
cd backend
rm -rf .venv && uv sync

# Verify imports work
uv run python -c "from app.main import app; print('✓ Imports successful')"

# Check for missing dependencies
uv run python -m pip check
```

#### 3.2 Docker Build

**Build and test Docker image:**

```bash
# Build backend Docker image
docker compose build backend

# Run backend container
docker compose up -d backend

# Check backend health
curl http://localhost:8000/health

# View logs
docker compose logs backend

# Stop containers
docker compose down
```

**Docker build requirements**:
- Image builds without errors
- Container starts successfully
- Health check endpoint responds
- No critical errors in logs

### 4. Database Migrations

**If database schema changed:**

```bash
# Create migration
cd backend
uv run alembic revision --autogenerate -m "Description of changes"

# Review migration file
cat alembic/versions/[revision_id]_description.py

# Apply migration
uv run alembic upgrade head

# Test rollback
uv run alembic downgrade -1
uv run alembic upgrade head
```

**Migration requirements**:
- Migration script reviewed and tested
- Both upgrade and downgrade work
- No data loss in migrations
- Migration documented

### 5. Security Checks

**Run security scans:**

```bash
# Check for known vulnerabilities
cd backend
uv run pip-audit

# Check for security issues in code (via ruff)
uvx ruff check --select S backend/

# Check for secrets in code
uv run detect-secrets scan backend/
```

**Security requirements**:
- No known vulnerabilities in dependencies
- No hardcoded secrets
- No SQL injection vulnerabilities
- No XSS vulnerabilities

### 6. Documentation

**Verify documentation:**

- [ ] All public functions have docstrings
- [ ] Complex logic has inline comments
- [ ] API endpoints documented with OpenAPI
- [ ] README updated if needed
- [ ] CHANGELOG updated

**Check docstring coverage:**

```bash
# Check for missing docstrings
uv run interrogate backend/app/ --verbose
```

---

## Frontend Definition of Done

### 1. Code Quality Checks

#### 1.1 ESLint

**Run ESLint to check code quality:**

```bash
cd frontend

# Check for linting issues
npm run lint

# Auto-fix issues where possible
npm run lint -- --fix

# Check specific files
npm run lint -- src/components/workitems/WorkItemForm.tsx
```

**What ESLint checks**:
- Code style consistency
- React best practices
- TypeScript usage
- Accessibility issues
- Security vulnerabilities
- Unused variables and imports

**Required**: All ESLint checks must pass with zero errors. Warnings should be minimized.

#### 1.2 Prettier Formatting

**Check and apply code formatting:**

```bash
cd frontend

# Check formatting
npm run format:check

# Apply formatting
npm run format

# Format specific files
npx prettier --write src/components/workitems/
```

**Required**: All code must be formatted consistently.

### 2. Type Checking

#### 2.1 TypeScript Compilation

**Verify TypeScript types:**

```bash
cd frontend

# Type check all files
npm run type-check

# Type check with watch mode (during development)
npm run type-check -- --watch

# Build to verify types
npm run build
```

**What TypeScript checks**:
- Type correctness
- Interface compliance
- Null/undefined handling
- Generic type usage
- Import/export consistency

**Required**: Zero TypeScript errors. Build must succeed.

### 3. Testing

#### 3.1 Unit Tests

**Run Vitest unit tests:**

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- WorkItemForm.test.tsx

# Run tests matching pattern
npm test -- --grep "validation"

# Run in watch mode (development)
npm test -- --watch

# Run with minimal output (CI/CD)
npm test -- --silent --run
```

**Coverage requirements**:
- Minimum 80% code coverage
- All components have tests
- All utility functions tested
- Critical user flows covered

#### 3.2 Component Tests

**Test React components:**

```bash
# Run component tests
npm test -- src/components/

# Test specific component
npm test -- WorkItemForm.test.tsx

# Run with UI (for debugging)
npm test -- --ui
```

**Component test requirements**:
- Rendering tests
- User interaction tests
- Error state tests
- Loading state tests
- Accessibility tests

#### 3.3 Integration Tests

**Run integration tests:**

```bash
# Run integration tests
npm test -- src/test/integration/

# Run E2E tests (if applicable)
npm run test:e2e
```

### 4. Build Verification

#### 4.1 Development Build

**Verify development build:**

```bash
cd frontend

# Start dev server
npm run dev

# Verify in browser: http://localhost:5173
# Check console for errors
# Test key user flows
```

#### 4.2 Production Build

**Build for production:**

```bash
cd frontend

# Create production build
npm run build

# Preview production build
npm run preview

# Check build output
ls -lh dist/

# Verify bundle size
npm run build -- --report
```

**Build requirements**:
- Build completes without errors
- No console errors in preview
- Bundle size is reasonable (<500KB gzipped for main bundle)
- All assets load correctly

#### 4.3 Docker Build

**Build and test Docker image:**

```bash
# Build frontend Docker image
docker compose build frontend

# Run frontend container
docker compose up -d frontend

# Check frontend accessibility
curl http://localhost:80

# View logs
docker compose logs frontend

# Stop containers
docker compose down
```

**Docker build requirements**:
- Image builds without errors
- Container starts successfully
- Static files served correctly
- No errors in nginx logs

### 5. Accessibility Checks

**Verify accessibility:**

```bash
cd frontend

# Run accessibility tests
npm run test:a11y

# Check with axe-core (in tests)
npm test -- --grep "accessibility"
```

**Accessibility requirements**:
- No critical accessibility violations
- Keyboard navigation works
- Screen reader compatible
- ARIA labels present
- Color contrast meets WCAG AA

### 6. Performance Checks

**Verify performance:**

```bash
# Build and analyze bundle
npm run build -- --analyze

# Check bundle size
npm run build
ls -lh dist/assets/

# Run Lighthouse (manual)
# Open Chrome DevTools > Lighthouse > Run audit
```

**Performance requirements**:
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- No memory leaks
- Smooth 60fps animations

### 7. Documentation

**Verify documentation:**

- [ ] Components have JSDoc comments
- [ ] Complex logic has inline comments
- [ ] README updated if needed
- [ ] Storybook stories created (if applicable)
- [ ] CHANGELOG updated

---

## Full Stack Integration

### 1. End-to-End Testing

**Run full stack tests:**

```bash
# Start all services
docker compose up -d

# Wait for services to be ready
sleep 10

# Run E2E tests
cd frontend
npm run test:e2e

# Or run backend integration tests
cd backend
uv run pytest tests/integration/

# Check all services are healthy
curl http://localhost:8000/health  # Backend
curl http://localhost:80           # Frontend
curl http://localhost:7474         # Neo4j Browser
```

**E2E requirements**:
- All services start successfully
- Database connections work
- API endpoints respond correctly
- Frontend can communicate with backend
- Authentication flows work
- Critical user journeys complete

### 2. Docker Compose Full Build

**Build and test entire stack:**

```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# Check service status
docker compose ps

# View logs for all services
docker compose logs

# Check specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs neo4j

# Test backend API
curl http://localhost:8000/api/v1/health

# Test frontend
curl http://localhost:80

# Run smoke tests
./scripts/smoke-test.sh

# Stop all services
docker compose down

# Clean up volumes (if needed)
docker compose down -v
```

**Full stack requirements**:
- All containers build successfully
- All containers start without errors
- Services can communicate with each other
- Database migrations applied
- Seed data loaded (if applicable)
- Health checks pass

### 3. Environment Configuration

**Verify environment setup:**

```bash
# Check environment files exist
ls -la .env*
ls -la backend/.env*
ls -la frontend/.env*

# Validate environment variables
docker compose config

# Check for missing variables
docker compose config | grep -i "warning"
```

**Environment requirements**:
- All required environment variables set
- No sensitive data in version control
- Environment-specific configs correct
- Secrets properly managed

---

## Pre-Commit Checklist

Before committing code, verify:

### Backend
- [ ] `uv run ruff check backend/` passes
- [ ] `uv run ruff format backend/` applied
- [ ] `uvx ty check` passes (from backend directory)
- [ ] `uv run pytest` passes with >80% coverage
- [ ] `docker compose build backend` succeeds
- [ ] No hardcoded secrets or credentials
- [ ] Docstrings added for new functions
- [ ] Type hints added for new functions

### Frontend
- [ ] `npm run lint` passes
- [ ] `npm run format` applied
- [ ] `npm run type-check` passes
- [ ] `npm test` passes with >80% coverage
- [ ] `npm run build` succeeds
- [ ] `docker compose build frontend` succeeds
- [ ] No console errors in browser
- [ ] Accessibility checks pass
- [ ] JSDoc comments added for new components

### Integration
- [ ] `docker compose build` succeeds for all services
- [ ] `docker compose up` starts all services
- [ ] Health checks pass for all services
- [ ] E2E tests pass (if applicable)
- [ ] No breaking changes to API contracts
- [ ] Database migrations tested

### Documentation
- [ ] Code comments added for complex logic
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] CHANGELOG updated
- [ ] Commit message follows conventions

---

## Pre-Release Checklist

Before creating a release, additionally verify:

### Code Quality
- [ ] All tests pass in CI/CD pipeline
- [ ] Code coverage meets requirements (>80%)
- [ ] No critical security vulnerabilities
- [ ] No high-priority bugs
- [ ] Performance benchmarks met

### Documentation
- [ ] User documentation updated
- [ ] API documentation complete
- [ ] Migration guide written (if needed)
- [ ] Release notes prepared
- [ ] CHANGELOG updated with version

### Testing
- [ ] Manual testing completed
- [ ] Regression testing passed
- [ ] Performance testing passed
- [ ] Security testing passed
- [ ] Accessibility testing passed

### Deployment
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Backup procedures verified
- [ ] Deployment runbook updated

---

## Automated Quality Gates

### GitHub Actions / CI/CD Pipeline

The following checks run automatically on every push:

#### Backend Pipeline
```yaml
- Ruff linting
- Type checking with ty
- Unit tests with pytest
- Coverage report (must be >80%)
- Docker build
- Security scan
```

#### Frontend Pipeline
```yaml
- ESLint linting
- TypeScript compilation
- Unit tests with Vitest
- Coverage report (must be >80%)
- Production build
- Docker build
- Bundle size check
```

#### Integration Pipeline
```yaml
- Docker compose build
- Service health checks
- E2E tests
- API contract tests
- Performance tests
```

**Required**: All pipeline checks must pass before merging to main branch.

---

## Quick Reference Commands

### Backend Quick Check
```bash
cd backend
uvx ruff check --fix backend/
uvx ruff format backend/
uvx ty check
uvx pytest -q
docker compose build backend
```

### Frontend Quick Check
```bash
cd frontend
npm run lint -- --fix
npm run format
npm run type-check
npm test -- --run --silent
npm run build
docker compose build frontend
```

### Full Stack Quick Check
```bash
# From project root
docker compose build
docker compose up -d
sleep 10
curl http://localhost:8000/health
curl http://localhost:80
docker compose down
```

---

## Troubleshooting

### Common Issues

#### Ruff Errors
```bash
# Fix most issues automatically
uvx ruff check --fix backend/

# If issues persist, check specific file
uvx ruff check backend/app/services/workitem_service.py --verbose
```

#### Type Errors
```bash
# Check specific file with verbose output
uvx ty check app/services/workitem_service.py --verbose

# Common fixes:
# - Add type hints: def func(x: str) -> int:
# - Use Optional: from typing import Optional
# - Use Union: str | None
```

#### Test Failures
```bash
# Run specific test with verbose output
uvx pytest tests/test_workitem_service.py -v

# Run with debugger
uvx pytest tests/test_workitem_service.py --pdb

# Check test coverage
uvx pytest --cov=app --cov-report=html
open htmlcov/index.html
```

#### Docker Build Failures
```bash
# Check Docker logs
docker compose logs backend

# Rebuild without cache
docker compose build --no-cache backend

# Check for port conflicts
docker compose ps
lsof -i :8000
```

#### Frontend Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist .vite

# Check for TypeScript errors
npm run type-check
```

---

## Best Practices

### During Development
- ✅ Run linters frequently (on save if possible)
- ✅ Run tests before committing
- ✅ Fix warnings, don't ignore them
- ✅ Keep test coverage high
- ✅ Write tests for bug fixes
- ✅ Update documentation as you code

### Before Committing
- ✅ Run full test suite
- ✅ Check Docker builds
- ✅ Review your own changes
- ✅ Update CHANGELOG
- ✅ Write descriptive commit messages

### Before Merging
- ✅ Ensure CI/CD passes
- ✅ Get code review approval
- ✅ Resolve all comments
- ✅ Rebase on main branch
- ✅ Verify no merge conflicts

### Before Releasing
- ✅ Run full integration tests
- ✅ Test in staging environment
- ✅ Verify database migrations
- ✅ Update all documentation
- ✅ Prepare rollback plan

---

## Continuous Improvement

This Definition of Done should evolve with the project. Consider:

- Adding new quality gates as needed
- Removing redundant checks
- Automating manual steps
- Improving test coverage
- Enhancing documentation
- Streamlining workflows

**Remember**: Quality is not negotiable. If a check fails, fix it before proceeding. Taking shortcuts leads to technical debt and production issues.

---

## Summary

Work is DONE when:

1. ✅ All code quality checks pass (ruff, ESLint)
2. ✅ All type checks pass (ty, TypeScript)
3. ✅ All tests pass with adequate coverage
4. ✅ Docker builds succeed
5. ✅ Documentation is updated
6. ✅ Security scans pass
7. ✅ Integration tests pass
8. ✅ Code is reviewed and approved

**No exceptions. No shortcuts. Quality first.**

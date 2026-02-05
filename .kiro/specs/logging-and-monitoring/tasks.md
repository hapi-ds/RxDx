# Tasks: Logging and Monitoring

## Overview

This task list implements structured logging, request tracing, and health monitoring for the RxDx project. The implementation enhances existing logging infrastructure without breaking changes.

**Key Integration Points:**
- Wraps existing Python `logging.getLogger()` with structlog
- Extends existing axios interceptors with request tracing
- Adds middleware alongside existing CORS middleware
- Creates comprehensive health checks alongside simple endpoint

---

## Phase 1: Backend Logging Infrastructure

### Task 1: Setup Structured Logging Configuration

**Description:** Create the core logging configuration using structlog that wraps existing Python logging.

**Dependencies:** None

**Acceptance Criteria:**
- [x] Add `structlog` to `backend/pyproject.toml` dependencies
- [x] Create `backend/app/core/logging.py` with `configure_logging()` function
- [x] Implement log processors for JSON output and console rendering
- [x] Configure `RotatingFileHandler` with 100MB max size and 14 backup files
- [x] Create `backend/logs/` directory automatically if it doesn't exist
- [x] Support different log levels per environment (DEBUG for dev, INFO for prod)
- [x] Ensure compatibility with existing `logging.getLogger(__name__)` usage

**Files to Create:**
- `backend/app/core/logging.py`

**Files to Modify:**
- `backend/pyproject.toml` (add structlog dependency)

**Testing:**
- Verify structlog is installed: `uv run python -c "import structlog; print(structlog.__version__)"`
- Verify logs directory is created
- Verify log file is created at `backend/logs/app.log`
- Verify existing log statements in services produce JSON output

**Property-Based Test:** Property 1 - Log Format Consistency

---

### Task 2: Implement Request Logging Middleware

**Description:** Create middleware to log all HTTP requests with request ID tracing.

**Dependencies:** Task 1

**Acceptance Criteria:**
- [x] Create `backend/app/middleware/` directory
- [x] Create `backend/app/middleware/__init__.py`
- [x] Create `backend/app/middleware/logging.py` with `LoggingMiddleware` class
- [x] Extract or generate `X-Request-ID` from request headers
- [x] Store request_id in contextvars for thread-safe access
- [x] Log request start with method, path, and request_id
- [x] Log request completion with status_code and duration_ms
- [x] Log request failures with error details and stack trace
- [x] Add request_id to response headers

**Files to Create:**
- `backend/app/middleware/__init__.py`
- `backend/app/middleware/logging.py`

**Testing:**
- Test middleware extracts existing X-Request-ID header
- Test middleware generates request_id if header missing
- Test request_id appears in all logs during request
- Test request_id is added to response headers
- Test error logging includes request_id and stack trace

**Property-Based Test:** Property 2 - Request ID Propagation

---

### Task 3: Integrate Logging into Application Startup

**Description:** Configure logging and middleware in the FastAPI application.

**Dependencies:** Task 1, Task 2

**Acceptance Criteria:**
- [x] Call `configure_logging()` at the top of `backend/app/main.py` before other imports
- [x] Add `LoggingMiddleware` to app after existing CORS middleware
- [x] Verify existing `/health` endpoint remains unchanged
- [x] Verify application starts without errors
- [x] Verify logs are written to `backend/logs/app.log`
- [x] Verify existing services continue to log correctly

**Files to Modify:**
- `backend/app/main.py`

**Testing:**
- Start backend: `cd backend && uv run uvicorn app.main:app --reload`
- Verify no startup errors
- Make API request and verify logs are written
- Verify existing `/health` endpoint still works
- Verify CORS middleware still works

---

### Task 4: Test Log Rotation

**Description:** Verify log rotation works correctly with size and time limits.

**Dependencies:** Task 1, Task 3

**Acceptance Criteria:**
- [x] Write unit test that simulates log file reaching 100MB
- [x] Verify new log file is created when size limit reached
- [x] Verify rotated files are named with timestamp
- [x] Verify old log files beyond backup count are deleted
- [x] Test log rotation doesn't lose log entries
- [x] Test log rotation doesn't impact application performance

**Files to Create:**
- `backend/tests/test_log_rotation.py`

**Testing:**
- Run test: `cd backend && uv run pytest tests/test_log_rotation.py -v`
- Verify all rotation tests pass

**Property-Based Test:** Property 3 - Log Rotation Behavior

---

## Phase 2: Health Check Endpoints

### Task 5: Implement Comprehensive Health Checks

**Description:** Create health check endpoints that verify all system dependencies.

**Dependencies:** Task 1

**Acceptance Criteria:**
- [x] Create `backend/app/api/v1/health.py` with health check router
- [x] Implement `/health` endpoint that returns 200 when service is running
- [x] Implement `/health/ready` endpoint that checks all dependencies
- [x] Check database connectivity with 2-second timeout
- [x] Check graph database connectivity with 2-second timeout
- [x] Return 503 if any dependency is unhealthy
- [x] Include check results and duration in response
- [x] Complete health checks within 5 seconds total
- [x] Do not require authentication for health endpoints

**Files to Create:**
- `backend/app/api/v1/health.py`

**Testing:**
- Test `/api/v1/health` returns 200
- Test `/api/v1/health/ready` returns 200 when all dependencies healthy
- Test `/api/v1/health/ready` returns 503 when database unreachable
- Test `/api/v1/health/ready` returns 503 when graph DB unreachable
- Test health check completes within 5 seconds

**Property-Based Test:** Property 4 - Health Check Response Time

---

### Task 6: Integrate Health Check Router

**Description:** Add health check router to API v1 routes.

**Dependencies:** Task 5

**Acceptance Criteria:**
- [x] Import health router in `backend/app/api/v1/__init__.py`
- [x] Include health router in api_router with "health" tag
- [x] Verify existing `/health` endpoint in main.py still works
- [x] Verify new `/api/v1/health` endpoint works
- [x] Verify new `/api/v1/health/ready` endpoint works
- [x] Verify health endpoints appear in OpenAPI docs

**Files to Modify:**
- `backend/app/api/v1/__init__.py`

**Testing:**
- Start backend and verify both health endpoints work:
  - `curl http://localhost:8000/health`
  - `curl http://localhost:8000/api/v1/health`
  - `curl http://localhost:8000/api/v1/health/ready`
- Check OpenAPI docs at `/api/docs` for health endpoints

---

## Phase 3: Frontend Logging Service

### Task 7: Implement Frontend Logger Service

**Description:** Create centralized logging service for frontend with structured output.

**Dependencies:** None

**Acceptance Criteria:**
- [x] Create `frontend/src/services/logger.ts` with `LoggerService` class
- [x] Implement log levels: DEBUG, INFO, WARN, ERROR
- [x] Generate unique session_id on service initialization
- [x] Implement methods: debug(), info(), warn(), error()
- [x] Include timestamp, level, message, sessionId in all logs
- [x] Support optional context object with componentName, requestId, error
- [x] Write logs to console in development mode
- [x] Respect log level configuration from environment
- [x] Export singleton logger instance

**Files to Create:**
- `frontend/src/services/logger.ts`
- `frontend/src/types/logging.ts` (type definitions)

**Testing:**
- Test logger methods write to console
- Test log level filtering works
- Test session_id is generated and included
- Test error logging includes stack trace
- Test context is included in log entries

---

### Task 8: Add Request Tracing to Axios Interceptors

**Description:** Extend existing axios interceptors to add request ID and logging.

**Dependencies:** Task 7

**Acceptance Criteria:**
- [x] Modify `frontend/src/services/api.ts` to import logger
- [x] Generate unique request_id for each API request
- [x] Add `X-Request-ID` header to all requests
- [x] Store request_id and start_time in request config
- [x] Log request start with method, url, and request_id
- [x] Log request completion with status, duration_ms, and request_id
- [x] Log request failure with error details and request_id
- [x] Ensure existing auth token refresh logic still works
- [x] Do not break existing interceptor functionality

**Files to Modify:**
- `frontend/src/services/api.ts`

**Testing:**
- Test request_id is added to request headers
- Test request start is logged
- Test successful response is logged with duration
- Test failed response is logged with error
- Test existing auth interceptor still works
- Test token refresh still works

**Property-Based Test:** Property 2 - Request ID Propagation (frontend side)

---

### Task 9: Initialize Logger in Application Entry Point

**Description:** Setup logger and interceptors when application starts.

**Dependencies:** Task 7, Task 8

**Acceptance Criteria:**
- [x] Import logger in `frontend/src/main.tsx`
- [x] Log application start with version and environment
- [x] Verify interceptors are setup before React render
- [x] Verify existing application functionality works
- [x] Verify no console errors on startup

**Files to Modify:**
- `frontend/src/main.tsx`

**Testing:**
- Start frontend: `cd frontend && npm run dev`
- Verify application start log appears in console
- Verify no errors in console
- Make API request and verify request/response logs appear
- Verify request_id appears in logs

---

## Phase 4: Integration Testing

### Task 10: Test End-to-End Request Tracing

**Description:** Verify request ID propagates from frontend through backend and back.

**Dependencies:** Task 3, Task 9

**Acceptance Criteria:**
- [ ] Create integration test that makes API request from frontend
- [ ] Verify frontend generates request_id
- [ ] Verify request_id is sent in X-Request-ID header
- [ ] Verify backend extracts request_id from header
- [ ] Verify backend logs include request_id
- [ ] Verify backend returns request_id in response header
- [ ] Verify frontend logs include request_id from response

**Files to Create:**
- `backend/tests/integration/test_request_tracing.py`
- `frontend/src/test/integration/requestTracing.test.ts`

**Testing:**
- Run backend integration test: `cd backend && uv run pytest tests/integration/test_request_tracing.py -v`
- Run frontend integration test: `cd frontend && npm test -- requestTracing.test.ts`
- Verify request_id matches across frontend and backend logs

**Property-Based Test:** Property 2 - Request ID Propagation (end-to-end)

---

### Task 11: Test Error Logging Across Stack

**Description:** Verify errors are logged with complete context in both frontend and backend.

**Dependencies:** Task 3, Task 9

**Acceptance Criteria:**
- [ ] Test backend unhandled exception is logged with stack trace
- [ ] Test frontend error is logged with component context
- [ ] Test error logs include timestamp, error_type, error_message, stack_trace
- [ ] Test error logs include request_id when available
- [ ] Test error logs use ERROR or CRITICAL level
- [ ] Verify error logs are written to log files

**Files to Create:**
- `backend/tests/test_error_logging.py`
- `frontend/src/test/errorLogging.test.ts`

**Testing:**
- Run backend test: `cd backend && uv run pytest tests/test_error_logging.py -v`
- Run frontend test: `cd frontend && npm test -- errorLogging.test.ts`
- Verify error logs contain all required fields

**Property-Based Test:** Property 5 - Error Logging Completeness

---

### Task 12: Test Health Check Integration

**Description:** Verify health checks work with real database connections.

**Dependencies:** Task 6

**Acceptance Criteria:**
- [ ] Test `/api/v1/health/ready` with healthy database
- [ ] Test `/api/v1/health/ready` with unhealthy database
- [ ] Test `/api/v1/health/ready` with healthy graph database
- [ ] Test `/api/v1/health/ready` with unhealthy graph database
- [ ] Verify response includes check results for each dependency
- [ ] Verify response includes duration
- [ ] Verify 503 status when any dependency unhealthy
- [ ] Verify health check completes within 5 seconds

**Files to Create:**
- `backend/tests/integration/test_health_checks.py`

**Testing:**
- Run test with all services running: `cd backend && uv run pytest tests/integration/test_health_checks.py -v`
- Stop database and verify health check returns 503
- Stop graph DB and verify health check returns 503

**Property-Based Test:** Property 4 - Health Check Response Time

---

## Phase 5: Documentation and Deployment

### Task 13: Update Configuration Files

**Description:** Add logging configuration to environment files and Docker setup.

**Dependencies:** All previous tasks

**Acceptance Criteria:**
- [x] Add LOG_LEVEL, LOG_DIR, LOG_MAX_BYTES, LOG_BACKUP_COUNT to `backend/app/core/config.py`
- [x] Add logging environment variables to `backend/.env.example`
- [x] Add VITE_LOG_LEVEL to `frontend/.env.example`
- [x] Update `docker-compose.yml` with log volume mounts
- [x] Update `docker-compose.yml` with logging environment variables
- [x] Create `.gitignore` entries for log files

**Files to Modify:**
- `backend/app/core/config.py`
- `backend/.env.example`
- `frontend/.env.example`
- `docker-compose.yml`
- `.gitignore`

**Testing:**
- Verify Docker build succeeds: `docker compose build`
- Verify Docker containers start: `docker compose up -d`
- Verify logs are written to mounted volumes
- Verify environment variables are loaded correctly

---

### Task 14: Create Log Cleanup Script

**Description:** Create automated script to clean up old log files.

**Dependencies:** None

**Acceptance Criteria:**
- [x] Create `scripts/cleanup-logs.sh` script
- [x] Script finds log files older than 7 days
- [x] Script deletes old log files from backend/logs
- [x] Script deletes old log files from frontend/logs (if applicable)
- [x] Script logs cleanup actions
- [x] Script is executable: `chmod +x scripts/cleanup-logs.sh`
- [x] Document crontab setup in script comments

**Files to Create:**
- `scripts/cleanup-logs.sh`

**Testing:**
- Run script manually: `./scripts/cleanup-logs.sh`
- Verify old log files are deleted
- Verify current log files are not deleted
- Verify script output is clear

---

### Task 15: Update Documentation

**Description:** Document logging configuration, usage, and maintenance procedures.

**Dependencies:** All previous tasks

**Acceptance Criteria:**
- [x] Update README.md with logging section
- [x] Document log file locations (backend/logs/, frontend/logs/)
- [x] Document log rotation policy (100MB, 7 days)
- [x] Document log levels and configuration
- [x] Document request tracing usage
- [x] Document health check endpoints
- [x] Create runbook for log analysis
- [x] Document how to use logger service in new code
- [x] Document migration strategy for existing console.log calls

**Files to Modify:**
- `README.md`

**Files to Create:**
- `docs/logging-runbook.md` (optional)

**Testing:**
- Review documentation for completeness
- Verify all examples work as documented
- Have team member review documentation

---

## Phase 6: Property-Based Testing

### Task 16: Write Property-Based Test for Log Format

**Description:** Implement property-based test to verify log format consistency.

**Dependencies:** Task 1, Task 3

**Acceptance Criteria:**
- [ ] Create property test that generates random log messages and levels
- [ ] Verify all logs are valid JSON
- [ ] Verify all logs include required fields: timestamp, level, message, service
- [ ] Verify timestamp is valid ISO 8601 format
- [ ] Verify level is one of: DEBUG, INFO, WARN, ERROR, CRITICAL
- [ ] Test with various message types: strings, unicode, special characters
- [ ] Use Hypothesis library for property-based testing

**Files to Create:**
- `backend/tests/test_logging_properties.py`

**Testing:**
- Run property test: `cd backend && uv run pytest tests/test_logging_properties.py -v --hypothesis-show-statistics`
- Verify test passes with 100+ examples
- Verify test catches format violations

**Validates:** Property 1 - Log Format Consistency

---

### Task 17: Write Property-Based Test for Request ID Propagation

**Description:** Implement property-based test to verify request ID propagation.

**Dependencies:** Task 3, Task 9, Task 10

**Acceptance Criteria:**
- [ ] Create property test that generates random request patterns
- [ ] Verify request_id is present in all backend logs for each request
- [ ] Verify request_id is returned in response headers
- [ ] Verify request_id format is consistent (timestamp-random)
- [ ] Test with concurrent requests
- [ ] Test with various request types (GET, POST, PUT, DELETE)
- [ ] Use Hypothesis library for property-based testing

**Files to Create:**
- `backend/tests/test_request_tracing_properties.py`

**Testing:**
- Run property test: `cd backend && uv run pytest tests/test_request_tracing_properties.py -v --hypothesis-show-statistics`
- Verify test passes with 100+ examples
- Verify test catches missing request_ids

**Validates:** Property 2 - Request ID Propagation

---

### Task 18: Write Property-Based Test for Log Rotation

**Description:** Implement property-based test to verify log rotation behavior.

**Dependencies:** Task 1, Task 4

**Acceptance Criteria:**
- [ ] Create property test that generates random log write patterns
- [ ] Verify new log file is created when size exceeds 100MB
- [ ] Verify old files are deleted when backup count exceeded
- [ ] Verify no log entries are lost during rotation
- [ ] Test with various write sizes and frequencies
- [ ] Test rotation doesn't impact application performance
- [ ] Use Hypothesis library for property-based testing

**Files to Create:**
- `backend/tests/test_log_rotation_properties.py`

**Testing:**
- Run property test: `cd backend && uv run pytest tests/test_log_rotation_properties.py -v --hypothesis-show-statistics`
- Verify test passes with 100+ examples
- Verify test catches rotation failures

**Validates:** Property 3 - Log Rotation Behavior

---

### Task 19: Write Property-Based Test for Health Check Timeout

**Description:** Implement property-based test to verify health check response time.

**Dependencies:** Task 5, Task 6

**Acceptance Criteria:**
- [ ] Create property test that generates random health check scenarios
- [ ] Verify health check completes within 5 seconds
- [ ] Test with various database response times
- [ ] Test with various graph DB response times
- [ ] Test with concurrent health check requests
- [ ] Verify timeout handling works correctly
- [ ] Use Hypothesis library for property-based testing

**Files to Create:**
- `backend/tests/test_health_check_properties.py`

**Testing:**
- Run property test: `cd backend && uv run pytest tests/test_health_check_properties.py -v --hypothesis-show-statistics`
- Verify test passes with 100+ examples
- Verify test catches timeout violations

**Validates:** Property 4 - Health Check Response Time

---

### Task 20: Write Property-Based Test for Error Logging

**Description:** Implement property-based test to verify error logging completeness.

**Dependencies:** Task 3, Task 9, Task 11

**Acceptance Criteria:**
- [ ] Create property test that generates random error scenarios
- [ ] Verify all error logs include timestamp, error_type, error_message
- [ ] Verify error logs include stack_trace when available
- [ ] Test with various error types (ValueError, TypeError, HTTPException, etc.)
- [ ] Test with various error messages (unicode, special characters, long messages)
- [ ] Verify error logs use ERROR or CRITICAL level
- [ ] Use Hypothesis library for property-based testing

**Files to Create:**
- `backend/tests/test_error_logging_properties.py`

**Testing:**
- Run property test: `cd backend && uv run pytest tests/test_error_logging_properties.py -v --hypothesis-show-statistics`
- Verify test passes with 100+ examples
- Verify test catches incomplete error logs

**Validates:** Property 5 - Error Logging Completeness

---

## Phase 7: User Documentation

### Task 21: Create User Guide for Logging and Monitoring

**Description:** Create comprehensive user guide documenting how to use the logging and monitoring system.

**Dependencies:** All previous tasks

**Acceptance Criteria:**
- [x] Create `LOGGING_GUIDE.md` in root directory
- [x] Document how to use backend structured logging in services
- [x] Document how to use frontend logger service in components
- [x] Provide code examples for common logging scenarios
- [x] Document log levels and when to use each
- [x] Document request tracing and how to follow requests across services
- [x] Document health check endpoints and their responses
- [x] Document log file locations and rotation policy
- [x] Document how to analyze logs for debugging
- [x] Document how to configure log levels per environment
- [x] Include troubleshooting section for common issues
- [x] Include best practices for logging in RxDx
- [x] Provide examples of good vs bad logging practices

**Files to Create:**
- `LOGGING_GUIDE.md`

**Content Sections:**
1. **Introduction** - Overview of logging and monitoring system
2. **Backend Logging** - How to use structlog in services
3. **Frontend Logging** - How to use logger service in components
4. **Request Tracing** - How to trace requests across frontend and backend
5. **Health Checks** - How to use and interpret health check endpoints
6. **Log Analysis** - How to find and analyze logs for debugging
7. **Configuration** - How to configure log levels and settings
8. **Best Practices** - Guidelines for effective logging
9. **Troubleshooting** - Common issues and solutions
10. **Examples** - Real-world code examples

**Testing:**
- Review guide for completeness and accuracy
- Verify all code examples are correct and runnable
- Have team members review for clarity
- Test examples in actual codebase

---

## Summary

**Total Tasks:** 21

**Phases:**
1. Backend Logging Infrastructure (Tasks 1-4)
2. Health Check Endpoints (Tasks 5-6)
3. Frontend Logging Service (Tasks 7-9)
4. Integration Testing (Tasks 10-12)
5. Documentation and Deployment (Tasks 13-15)
6. Property-Based Testing (Tasks 16-20)
7. User Documentation (Task 21)

**Key Deliverables:**
- Structured JSON logging with log rotation
- Request tracing across frontend and backend
- Comprehensive health check endpoints
- Centralized frontend logger service
- Complete test coverage including property-based tests
- Documentation and deployment scripts
- Comprehensive user guide (LOGGING_GUIDE.md)

**Integration Strategy:**
- All changes are additive and backward compatible
- Existing code continues to work without modifications
- New infrastructure wraps and enhances existing systems
- No breaking changes to APIs or interfaces

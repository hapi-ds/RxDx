# Requirements Document: Logging and Monitoring

## Introduction

The RxDx project management system needs basic logging and monitoring capabilities to support debugging and system health checks. This specification focuses on simple, file-based structured logging with log rotation, request tracing, and health check endpoints. The solution avoids external dependencies and keeps logs local to each service.

## Current Implementation Status

**Existing Capabilities:**
- ✅ Basic Python logging using `logging.getLogger(__name__)` in services (template_service, scheduler_service, email_service)
- ✅ Simple health check endpoint at `/health` in main.py
- ✅ Axios interceptors for authentication in frontend (api.ts)
- ✅ Console logging in frontend (scattered across components)
- ✅ CORS middleware configured in main.py

**Missing Capabilities:**
- ❌ No structured logging (JSON format)
- ❌ No centralized logging configuration
- ❌ No log rotation
- ❌ No request ID tracing
- ❌ No logging middleware
- ❌ No comprehensive health checks (database, graph DB)
- ❌ No centralized frontend logger service
- ❌ No request/response logging interceptors

**Integration Strategy:**
This spec will **enhance** existing logging rather than replace it. We will:
1. Add structlog configuration that wraps existing Python logging
2. Add logging middleware alongside existing CORS middleware
3. Extend existing axios interceptors with logging capability
4. Create comprehensive health check endpoints alongside existing simple one
5. Centralize scattered console.log calls into a logger service

## Glossary

- **Structured_Logging**: Logging format that outputs machine-readable JSON with consistent fields
- **Log_Level**: Severity classification (DEBUG, INFO, WARN, ERROR, CRITICAL)
- **Log_Rotation**: Automatic archival and deletion of old log files based on size and age
- **Request_ID**: Unique identifier that follows a request from frontend through backend
- **Health_Check**: Endpoint that reports system status and dependency availability

## Requirements

### Requirement 1: Backend Structured Logging

**User Story:** As a developer, I want structured JSON logging in the backend, so that logs can be easily parsed and analyzed.

**Integration Note:** This will wrap existing `logging.getLogger(__name__)` calls used in template_service.py, scheduler_service.py, and email_service.py. Existing log statements will automatically benefit from structured format.

#### Acceptance Criteria

1. THE backend SHALL use Python's `structlog` library for structured logging
2. WHEN a log entry is created, THE log SHALL include: timestamp, level, message, service_name, request_id
3. WHEN an error is logged, THE log SHALL include: error_type, error_message, stack_trace
4. WHEN an API request is logged, THE log SHALL include: method, path, status_code, duration_ms
5. THE logging SHALL output to JSON files in `backend/logs/` directory
6. THE logging configuration SHALL support different log levels per environment (DEBUG for dev, INFO for prod)
7. THE logging SHALL be compatible with existing `logging.getLogger(__name__)` usage

### Requirement 2: Frontend Logging Service

**User Story:** As a developer, I want centralized logging in the frontend, so that client-side errors and events are captured consistently.

**Integration Note:** This will centralize scattered console.log/error/warn calls found in graphService.ts, useVoiceCommands.ts, and other components. Existing console calls can remain during migration.

#### Acceptance Criteria

1. THE frontend SHALL implement a `LoggerService` with methods: debug(), info(), warn(), error()
2. WHEN a log is created, THE log SHALL include: timestamp, level, message, component_name, session_id
3. WHEN an error is logged, THE log SHALL include: error_type, error_message, stack_trace
4. THE LoggerService SHALL write logs to console (browser environment - no file system access)
5. THE LoggerService SHALL respect log levels and only log at configured level or above
6. THE LoggerService SHALL output to console in development mode
7. THE LoggerService SHALL be backward compatible with existing console.log usage

### Requirement 3: Log Rotation

**User Story:** As a system administrator, I want automatic log rotation, so that log files don't consume excessive disk space.

#### Acceptance Criteria

1. WHEN a log file reaches 100MB, THE system SHALL rotate to a new file
2. THE system SHALL keep log files for the last 7 days
3. WHEN log files are older than 7 days, THE system SHALL delete them automatically
4. THE rotated log files SHALL be named with timestamp: `app-YYYY-MM-DD-HH-MM-SS.log`
5. THE system SHALL maintain a current log file named `app.log`

### Requirement 4: Request Tracing

**User Story:** As a developer, I want to trace requests across frontend and backend, so that I can debug issues that span multiple services.

**Integration Note:** This will extend existing axios interceptors in api.ts (which currently handle authentication). The request interceptor will add X-Request-ID header, and backend middleware will extract it.

#### Acceptance Criteria

1. WHEN a frontend makes an API request, THE request SHALL include a unique `X-Request-ID` header
2. WHEN the backend receives a request, THE backend SHALL extract or generate a request_id
3. WHEN the backend logs any message related to a request, THE log SHALL include the request_id
4. WHEN an error occurs, THE error response SHALL include the request_id in headers
5. THE frontend SHALL log the request_id for all API calls
6. THE implementation SHALL extend existing axios interceptors in api.ts without breaking authentication

### Requirement 5: Health Check Endpoints

**User Story:** As a DevOps engineer, I want health check endpoints, so that I can monitor system health and dependencies.

**Integration Note:** A basic `/health` endpoint already exists in main.py. This requirement adds a comprehensive `/health/ready` endpoint alongside it. The existing endpoint will remain unchanged.

#### Acceptance Criteria

1. THE backend SHALL keep the existing `/health` endpoint that returns 200 when healthy
2. THE backend SHALL provide a NEW `/health/ready` endpoint that checks all dependencies
3. WHEN the database is unreachable, THE `/health/ready` endpoint SHALL return 503
4. WHEN the graph database is unreachable, THE `/health/ready` endpoint SHALL return 503
5. THE health check SHALL include: database_status, graph_db_status
6. THE health check SHALL complete within 5 seconds
7. THE health check SHALL not require authentication
8. THE implementation SHALL not modify or remove the existing `/health` endpoint

### Requirement 6: Error Logging

**User Story:** As a developer, I want comprehensive error logging, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. WHEN an unhandled exception occurs in the backend, THE exception SHALL be logged with full stack trace
2. WHEN an error occurs in the frontend, THE error SHALL be logged with component context
3. THE error logs SHALL include: timestamp, error_type, error_message, stack_trace, request_id
4. THE error logs SHALL be written to the same log files as other logs
5. THE error logs SHALL use ERROR or CRITICAL log level

## Non-Functional Requirements

### Performance
- Log writes SHALL not block application threads
- Log rotation SHALL not impact application performance
- Health checks SHALL complete within 5 seconds

### Storage
- Log files SHALL be stored in service-specific directories
- Backend logs: `backend/logs/`
- Frontend logs: `frontend/logs/`
- Log directories SHALL be created automatically if they don't exist

### Reliability
- The logging system SHALL handle write failures gracefully
- Log rotation SHALL not lose log entries
- Health checks SHALL not fail due to transient network issues

## Dependencies

- Backend: Python `structlog` library (NEW - needs to be added to pyproject.toml)
- Frontend: Custom LoggerService (no external dependencies)
- No external log aggregation services required
- No external error tracking services required

## Integration with Existing Code

### Backend Integration Points
1. **Existing logging**: Services already use `logging.getLogger(__name__)` - structlog will wrap this
2. **Existing health check**: `/health` endpoint exists in main.py - will add `/health/ready` alongside it
3. **Existing middleware**: CORS middleware exists - will add LoggingMiddleware after it
4. **No conflicts**: structlog is compatible with existing Python logging

### Frontend Integration Points
1. **Existing interceptors**: api.ts has auth interceptors - will extend with logging in same file
2. **Existing console logs**: Scattered console.log/error/warn calls - will gradually migrate to logger service
3. **No conflicts**: Logger service is additive, doesn't break existing code

### Migration Strategy
- **Phase 1**: Add new logging infrastructure alongside existing code
- **Phase 2**: Gradually migrate existing log statements to use new system
- **Phase 3**: Remove old console.log statements (optional, low priority)

## Success Metrics

- All errors are logged with full context
- Log files are automatically rotated and cleaned up
- Request tracing works across frontend and backend
- Health checks accurately reflect system status
- Log files remain under 100MB each
- Logs are retained for 7 days

# RxDx Logging and Monitoring Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Backend Logging](#backend-logging)
3. [Frontend Logging](#frontend-logging)
4. [Request Tracing](#request-tracing)
5. [Health Checks](#health-checks)
6. [Log Analysis](#log-analysis)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Examples](#examples)

## Introduction

RxDx includes a comprehensive logging and monitoring system designed to help developers debug issues, track system health, and trace requests across the full stack. The system provides:

- **Structured JSON logging** in production for easy parsing
- **Pretty console output** in development for readability
- **Request ID tracing** from frontend through backend
- **Automatic log rotation** to manage disk space
- **Health check endpoints** for monitoring system dependencies
- **Session tracking** for frontend user sessions

All logging is designed to be backward compatible with existing code while providing enhanced capabilities for new development.

## Backend Logging

### Using Structured Logging

The backend uses `structlog` for structured logging. Always use `structlog.get_logger()` for new code:

```python
import structlog

logger = structlog.get_logger(__name__)

# Log with context
logger.info(
    "User created",
    user_id=str(user.id),
    email=user.email,
    role=user.role
)

# Log errors with exception info
try:
    result = perform_operation()
except Exception as e:
    logger.error(
        "Operation failed",
        operation="perform_operation",
        error=str(e),
        exc_info=True  # Includes stack trace
    )
```

### Log Levels

Use appropriate log levels:

- **DEBUG**: Detailed diagnostic information (disabled in production)
  ```python
  logger.debug("Entering function", params={"user_id": user_id})
  ```

- **INFO**: General informational messages about application flow
  ```python
  logger.info("Schedule calculated", task_count=len(tasks), duration_ms=elapsed)
  ```

- **WARN**: Warning messages for potentially harmful situations
  ```python
  logger.warning("Slow query detected", query_time_ms=2500, threshold_ms=1000)
  ```

- **ERROR**: Error messages for failures that don't stop the application
  ```python
  logger.error("Failed to send email", recipient=email, error=str(e))
  ```

- **CRITICAL**: Critical messages for failures that may stop the application
  ```python
  logger.critical("Database connection lost", error=str(e))
  ```

### Backward Compatibility

Existing code using Python's standard `logging` module continues to work:

```python
import logging

logger = logging.getLogger(__name__)
logger.info("This still works")  # Will be captured by structlog
```

However, standard logging produces minimal JSON output. For full structured logging with context fields, use `structlog.get_logger()`.

### Log Output Formats

**Development mode** (DEBUG=true):
```
2026-02-05T10:30:15.123456Z [info     ] User created               [app.services.user] email=user@example.com role=admin user_id=123
```

**Production mode** (DEBUG=false):
```json
{"timestamp": "2026-02-05T10:30:15.123456Z", "level": "info", "event": "User created", "logger": "app.services.user", "email": "user@example.com", "role": "admin", "user_id": "123", "service": "rxdx-backend", "environment": "production"}
```

## Frontend Logging

### Using the Logger Service

The frontend provides a centralized `LoggerService` for structured logging:

```typescript
import { logger } from '@/services/logger';

// Basic logging
logger.info('Component mounted');
logger.debug('State updated', { oldValue, newValue });
logger.warn('Deprecated API used', { api: 'oldMethod' });
logger.error('API call failed', { error, url });

// Logging with context
logger.info('User action', {
  componentName: 'WorkItemForm',
  action: 'create',
  workitemType: 'requirement',
  userId: currentUser.id,
});

// Logging errors with full context
try {
  await createWorkItem(data);
} catch (error) {
  logger.error('Failed to create workitem', {
    componentName: 'WorkItemForm',
    error,  // Automatically extracts type, message, stack
    data,
  });
}
```

### Log Levels

Frontend log levels work the same as backend:

```typescript
import { LogLevel } from '@/types/logging';

// Change log level at runtime (useful for debugging)
logger.setLogLevel(LogLevel.DEBUG);
```

### Session Tracking

The logger automatically generates a unique session ID when the application starts:

```typescript
const sessionId = logger.getSessionId();
// Use in analytics or debugging
```

All logs include the session ID automatically, making it easy to trace all actions within a user session.

## Request Tracing

### How It Works

Every API request gets a unique `X-Request-ID` header that flows through the entire stack:

1. **Frontend** generates a request ID
2. **Frontend** adds it to the request header
3. **Backend** extracts it from the header
4. **Backend** includes it in all logs for that request
5. **Backend** returns it in the response header
6. **Frontend** logs it with the response

### Tracing a Request

**Frontend (automatic):**
```typescript
// Request ID is automatically generated and logged
const response = await apiClient.get('/workitems/123');
// Console: [DEBUG] API request started { requestId: 'abc-123', method: 'GET', url: '/workitems/123' }
// Console: [DEBUG] API request completed { requestId: 'abc-123', status: 200, duration_ms: 45 }
```

**Backend (automatic):**
```json
{"event": "request_started", "request_id": "abc-123", "method": "GET", "path": "/api/v1/workitems/123"}
{"event": "request_completed", "request_id": "abc-123", "status_code": 200, "duration_ms": 45.2}
```

### Finding Related Logs

Search logs by request ID to see the complete request flow:

```bash
# Backend logs
grep "request_id=abc-123" backend/logs/app.log

# Or with jq for JSON logs
cat backend/logs/app.log | jq 'select(.request_id=="abc-123")'
```

### Manual Request ID

You can also provide your own request ID:

```typescript
const response = await apiClient.get('/workitems/123', {
  headers: { 'X-Request-ID': 'my-custom-id' }
});
```

## Health Checks

### Available Endpoints

**Basic health check:**
```bash
curl http://localhost:8000/health
# Response: {"status": "healthy"}
```

**Comprehensive readiness check:**
```bash
curl http://localhost:8000/api/v1/health/ready
```

Response includes detailed status:
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy"},
    "graph_database": {"status": "healthy"}
  },
  "duration_seconds": 0.123
}
```

### Unhealthy Response

When a dependency is unavailable, the endpoint returns 503:

```json
{
  "status": "unhealthy",
  "checks": {
    "database": {"status": "healthy"},
    "graph_database": {
      "status": "unhealthy",
      "error": "Connection timeout"
    }
  },
  "duration_seconds": 2.001
}
```

### Using in Monitoring

Health checks are designed for monitoring tools:

```bash
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

# Kubernetes readiness probe
readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Log Analysis

### Viewing Logs

**Real-time monitoring:**
```bash
# Backend logs
tail -f backend/logs/app.log

# Docker logs
docker compose logs -f backend
docker compose logs -f frontend
```

**Searching logs:**
```bash
# Find all errors
grep '"level":"error"' backend/logs/app.log

# Find logs for specific user
grep 'user_id=123' backend/logs/app.log

# Find slow requests (>1000ms)
grep 'duration_ms' backend/logs/app.log | grep -E 'duration_ms":[0-9]{4,}'
```

### Using jq for JSON Logs

```bash
# Pretty print JSON logs
cat backend/logs/app.log | jq '.'

# Filter by log level
cat backend/logs/app.log | jq 'select(.level=="error")'

# Extract specific fields
cat backend/logs/app.log | jq '{timestamp, event, request_id, duration_ms}'

# Find requests slower than 1 second
cat backend/logs/app.log | jq 'select(.duration_ms > 1000)'

# Group errors by type
cat backend/logs/app.log | jq 'select(.level=="error") | .error_type' | sort | uniq -c
```

### Log Rotation

Logs automatically rotate when they reach 100MB:

```bash
# Current log
backend/logs/app.log

# Rotated logs (numbered, most recent = .1)
backend/logs/app.log.1
backend/logs/app.log.2
...
backend/logs/app.log.14
```

Old logs beyond 14 backups are automatically deleted.

### Cleanup

Run the cleanup script to remove logs older than 7 days:

```bash
./scripts/cleanup-logs.sh
```

Add to crontab for automatic cleanup:
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * /path/to/rxdx/scripts/cleanup-logs.sh
```

## Configuration

### Backend Configuration

Set via environment variables in `.env`:

```env
# Log level: DEBUG, INFO, WARN, ERROR, CRITICAL
LOG_LEVEL=INFO

# Log directory (relative to backend/)
LOG_DIR=logs

# Max log file size in bytes (100MB default)
LOG_MAX_BYTES=104857600

# Number of backup files to keep (14 default, ~7 days)
LOG_BACKUP_COUNT=14

# Environment affects log format
ENVIRONMENT=production  # JSON logs
DEBUG=false            # Disables console output
```

### Frontend Configuration

Set via environment variables in `.env.local`:

```env
# Log level: DEBUG, INFO, WARN, ERROR
VITE_LOG_LEVEL=INFO

# Application version (included in logs)
VITE_APP_VERSION=0.1.0
```

### Docker Configuration

Logs are persisted in Docker volumes:

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - backend_logs:/app/logs
    environment:
      - LOG_LEVEL=INFO
      - LOG_DIR=logs
```

Access logs from Docker:
```bash
# View logs
docker compose exec backend ls -lh /app/logs

# Copy logs to host
docker compose cp backend:/app/logs ./backend-logs
```

## Best Practices

### What to Log

**✅ DO log:**
- Important business events (user created, order placed)
- API requests and responses (with duration)
- Errors and exceptions (with full context)
- Performance metrics (slow queries, long operations)
- Security events (login attempts, permission denials)
- State changes (status updates, workflow transitions)

**❌ DON'T log:**
- Passwords or secrets
- Personal identifiable information (PII) in production
- Credit card numbers or payment details
- Large payloads or binary data
- Every single function call (too verbose)

### Logging Patterns

**Good logging:**
```python
# ✅ Structured with context
logger.info(
    "Workitem created",
    workitem_id=str(workitem.id),
    type=workitem.type,
    created_by=str(user.id),
    duration_ms=elapsed
)

# ✅ Error with context
logger.error(
    "Failed to create workitem",
    type=data.type,
    user_id=str(user.id),
    error=str(e),
    exc_info=True
)
```

**Bad logging:**
```python
# ❌ No context
logger.info("Created workitem")

# ❌ String formatting (not structured)
logger.info(f"Created workitem {workitem.id} by {user.id}")

# ❌ Too verbose
logger.debug(f"Entering function with params: {params}")
logger.debug(f"Calling database")
logger.debug(f"Got result: {result}")
logger.debug(f"Exiting function")
```

### Performance Considerations

- Use DEBUG level for verbose logging (disabled in production)
- Avoid logging in tight loops
- Don't log large objects (log IDs instead)
- Use lazy evaluation for expensive operations:

```python
# ✅ Good - only evaluated if DEBUG enabled
logger.debug("Complex data", data=expensive_calculation() if logger.isEnabledFor(logging.DEBUG) else None)

# ❌ Bad - always evaluated
logger.debug("Complex data", data=expensive_calculation())
```

## Troubleshooting

### Common Issues

**Issue: Logs not appearing**

Check log level configuration:
```bash
# Backend
echo $LOG_LEVEL  # Should be DEBUG or INFO

# Frontend
echo $VITE_LOG_LEVEL  # Should be DEBUG or INFO
```

Verify log directory exists:
```bash
ls -la backend/logs/
```

**Issue: Log file too large**

Check rotation settings:
```bash
# Should rotate at 100MB
grep LOG_MAX_BYTES .env
```

Manually rotate:
```bash
mv backend/logs/app.log backend/logs/app.log.backup
# Application will create new log file
```

**Issue: Request ID not in logs**

Verify middleware is installed:
```python
# In backend/app/main.py
app.add_middleware(LoggingMiddleware)
```

Check interceptor setup:
```typescript
// In frontend/src/main.tsx
import { logger } from './services/logger';
// Logger should be imported before React render
```

**Issue: Health check returns 503**

Check individual dependency status:
```bash
curl http://localhost:8000/api/v1/health/ready | jq '.checks'
```

Test database connection:
```bash
docker compose exec postgres psql -U rxdx -d rxdx -c "SELECT 1"
```

Test graph database:
```bash
docker compose exec postgres psql -U rxdx -d rxdx -c "SELECT * FROM ag_catalog.ag_graph"
```

### Debug Mode

Enable debug logging temporarily:

**Backend:**
```bash
# Set in .env
LOG_LEVEL=DEBUG
DEBUG=true

# Restart
docker compose restart backend
```

**Frontend:**
```bash
# Set in .env.local
VITE_LOG_LEVEL=DEBUG

# Restart
npm run dev
```

## Examples

### Example 1: Service Method Logging

```python
import structlog
from uuid import UUID

logger = structlog.get_logger(__name__)

class WorkItemService:
    async def create_workitem(self, data: WorkItemCreate, user: User) -> WorkItem:
        """Create a new workitem with comprehensive logging"""
        
        logger.info(
            "Creating workitem",
            type=data.type,
            title=data.title,
            user_id=str(user.id),
        )
        
        try:
            # Create workitem
            workitem = await self.db.create(data)
            
            logger.info(
                "Workitem created successfully",
                workitem_id=str(workitem.id),
                type=workitem.type,
                user_id=str(user.id),
            )
            
            return workitem
            
        except ValidationError as e:
            logger.warning(
                "Workitem validation failed",
                type=data.type,
                user_id=str(user.id),
                errors=e.errors(),
            )
            raise
            
        except Exception as e:
            logger.error(
                "Failed to create workitem",
                type=data.type,
                user_id=str(user.id),
                error=str(e),
                error_type=type(e).__name__,
                exc_info=True,
            )
            raise
```

### Example 2: Frontend Component Logging

```typescript
import { logger } from '@/services/logger';
import { workitemService } from '@/services/workitemService';

export function WorkItemForm() {
  const handleSubmit = async (data: WorkItemCreate) => {
    logger.info('Submitting workitem form', {
      componentName: 'WorkItemForm',
      type: data.type,
      hasTitle: !!data.title,
    });
    
    try {
      const workitem = await workitemService.create(data);
      
      logger.info('Workitem created successfully', {
        componentName: 'WorkItemForm',
        workitemId: workitem.id,
        type: workitem.type,
      });
      
      onSuccess(workitem);
      
    } catch (error) {
      logger.error('Failed to create workitem', {
        componentName: 'WorkItemForm',
        error,
        data,
      });
      
      showError('Failed to create workitem');
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Example 3: Debugging with Request Tracing

**Scenario:** User reports slow page load

1. **Get request ID from browser console:**
   ```
   [DEBUG] API request started { requestId: 'abc-123', url: '/workitems' }
   [DEBUG] API request completed { requestId: 'abc-123', duration_ms: 2500 }
   ```

2. **Search backend logs:**
   ```bash
   grep "request_id=abc-123" backend/logs/app.log
   ```

3. **Analyze the flow:**
   ```json
   {"event": "request_started", "request_id": "abc-123", "path": "/api/v1/workitems"}
   {"event": "Database query", "request_id": "abc-123", "query_time_ms": 2300}
   {"event": "request_completed", "request_id": "abc-123", "duration_ms": 2450}
   ```

4. **Identify the issue:** Slow database query (2.3 seconds)

5. **Fix:** Add database index or optimize query

---

## Summary

The RxDx logging system provides:

- ✅ Structured logging for easy parsing and analysis
- ✅ Request tracing across frontend and backend
- ✅ Automatic log rotation and cleanup
- ✅ Health check endpoints for monitoring
- ✅ Backward compatibility with existing code
- ✅ Development and production modes

For questions or issues, refer to the [README](README.md) or check the [troubleshooting section](#troubleshooting).

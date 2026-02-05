# Design Document: Logging and Monitoring

## Overview

This design document describes a simple, file-based logging and monitoring solution for the RxDx project management system. The solution provides structured JSON logging with automatic rotation, request tracing across frontend and backend, and basic health check endpoints. All logs are stored locally in service-specific directories with no external dependencies.

**Integration Approach:** This design enhances existing logging infrastructure rather than replacing it. The implementation will:
- Wrap existing Python `logging.getLogger()` calls with structlog
- Add logging middleware alongside existing CORS middleware
- Extend existing axios interceptors with request tracing
- Add comprehensive health checks alongside existing simple endpoint
- Centralize scattered console.log calls into a logger service

**No Breaking Changes:** All existing code will continue to work. The new logging system is additive and backward compatible.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ LoggerService│  │ ErrorBoundary│                            │
│  └──────┬───────┘  └──────┬───────┘                            │
│         │                  │                                     │
│         └──────────────────┘                                     │
│                │                                                 │
│         frontend/logs/                                          │
│         └── app.log (JSON)                                      │
└────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │  (Request ID)   │
                    └────────┬────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────┐
│                    Backend (FastAPI)                              │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Structlog  │  │ Health Check │                            │
│  │   Logging    │  │   Endpoints  │                            │
│  └──────┬───────┘  └──────────────┘                            │
│         │                                                        │
│    backend/logs/                                                │
│    └── app.log (JSON)                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- `structlog` - Structured logging with JSON output (NEW - to be added)
- `logging.handlers.RotatingFileHandler` - Log rotation (Python stdlib)
- `contextvars` - Request context propagation (Python stdlib)
- Existing: `logging` module already used in template_service, scheduler_service, email_service

**Frontend:**
- Custom `LoggerService` - Centralized logging (NEW)
- Existing: `axios` interceptors in api.ts (will be extended)
- Existing: Scattered console.log/error/warn calls (will be migrated)

## Component Design

### 1. Backend Structured Logging

#### 1.1 Logging Configuration

**File:** `backend/app/core/logging.py` (NEW FILE)

**Integration Notes:**
- This wraps existing Python logging, so services using `logging.getLogger(__name__)` will automatically get structured output
- Existing log statements in template_service.py, scheduler_service.py, email_service.py will work without changes
- The configuration must be called early in main.py before any logging occurs

```python
"""Structured logging configuration using structlog"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Any

import structlog
from structlog.types import EventDict, Processor

from app.core.config import settings


def add_app_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add application context to all log entries"""
    event_dict["service"] = "rxdx-backend"
    event_dict["environment"] = settings.ENVIRONMENT
    return event_dict


def configure_logging() -> None:
    """Configure structured logging for the application"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Determine log level based on environment
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Configure processors
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        add_app_context,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]
    
    if settings.ENVIRONMENT == "development":
        # Pretty console output for development
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        # JSON output for production
        processors.extend([
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ])
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging with rotation
    # Max 100MB per file, keep last 7 days (assuming ~14 files at 100MB each)
    file_handler = RotatingFileHandler(
        filename=log_dir / "app.log",
        maxBytes=100 * 1024 * 1024,  # 100MB
        backupCount=14,  # Keep ~7 days worth
        encoding="utf-8",
    )
    
    # Console handler for development
    console_handler = logging.StreamHandler(sys.stdout)
    
    # Configure root logger
    logging.basicConfig(
        format="%(message)s",
        level=log_level,
        handlers=[file_handler, console_handler] if settings.DEBUG else [file_handler],
    )
```

#### 1.2 Request Context Middleware

**File:** `backend/app/middleware/logging.py` (NEW FILE - create middleware directory)

**Integration Notes:**
- This will be added to main.py after the existing CORS middleware
- Does not interfere with existing middleware
- Adds request_id to all log statements automatically via contextvars

```python
"""Middleware for request logging and tracing"""

import time
import uuid
from contextvars import ContextVar
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)

# Context variable for request tracing
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and add request context"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(request_id)
        
        # Bind request context to logger
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        
        # Log request
        start_time = time.time()
        logger.info(
            "request_started",
            method=request.method,
            path=request.url.path,
        )
        
        # Process request
        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            logger.info(
                "request_completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "request_failed",
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=round(duration_ms, 2),
                exc_info=True,
            )
            raise
```

### 2. Frontend Logging Service

#### 2.1 Logger Service Implementation

**File:** `frontend/src/services/logger.ts` (NEW FILE)

**Integration Notes:**
- This is a new service that doesn't conflict with existing code
- Existing console.log calls can remain and be migrated gradually
- Browser environment means logs go to console, not files
- Can be imported and used immediately without breaking changes

```typescript
/**
 * Centralized logging service for frontend
 * Provides structured logging with file output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  componentName?: string;
  sessionId?: string;
  requestId?: string;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

class LoggerService {
  private sessionId: string;
  private currentLogLevel: LogLevel;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.currentLogLevel = this.getLogLevelFromEnv();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevelFromEnv(): LogLevel {
    const env = import.meta.env.MODE;
    return env === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private createLogEntry(
    level: string,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
    };

    if (context) {
      entry.context = context;
      entry.componentName = context.componentName;
      entry.requestId = context.requestId;
      
      if (context.error) {
        entry.error = {
          type: context.error.constructor?.name || 'Error',
          message: context.error.message,
          stack: context.error.stack,
        };
      }
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    // Always log to console in development
    if (import.meta.env.MODE === 'development') {
      const consoleMethod = entry.level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
      console[consoleMethod](`[${entry.level}]`, entry.message, entry.context || '');
    }
    
    // In production, logs would be written to file
    // This would require a backend endpoint or Node.js environment
    // For browser-only apps, console logging is sufficient
  }

  public debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry('DEBUG', message, context);
    this.writeLog(entry);
  }

  public info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry('INFO', message, context);
    this.writeLog(entry);
  }

  public warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry('WARN', message, context);
    this.writeLog(entry);
  }

  public error(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry('ERROR', message, context);
    this.writeLog(entry);
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }
}

// Export singleton instance
export const logger = new LoggerService();
```

#### 2.2 Axios Interceptors for Request Tracing

**File:** `frontend/src/services/api/interceptors.ts` (NEW FILE) OR extend `frontend/src/services/api.ts`

**Integration Notes:**
- Option 1: Create new interceptors.ts file and import/call setup functions from api.ts
- Option 2: Add logging directly to existing setupRequestInterceptor/setupResponseInterceptor in api.ts
- Recommendation: Extend existing api.ts to keep interceptors together
- Must not interfere with existing auth token refresh logic

**Implementation Strategy:**
Add logging to existing interceptor methods in api.ts:

```typescript
// In api.ts, modify existing setupRequestInterceptor():
private setupRequestInterceptor(): void {
  this.client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Existing auth logic
      const token = this.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // NEW: Add request ID and logging
      const requestId = generateRequestId();
      config.headers['X-Request-ID'] = requestId;
      (config as any).requestId = requestId;
      (config as any).startTime = Date.now();
      
      logger.debug('API request started', {
        requestId,
        method: config.method?.toUpperCase(),
        url: config.url,
      });
      
      return config;
    },
    (error: AxiosError) => {
      logger.error('API request setup failed', { error, message: error.message });
      return Promise.reject(error);
    }
  );
}
```

Alternative standalone file:

```typescript
/**
 * Axios interceptors for request/response logging and tracing
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../logger';

// Generate unique request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Request interceptor
export function setupRequestInterceptor(): void {
  axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add request ID header
      const requestId = generateRequestId();
      config.headers['X-Request-ID'] = requestId;
      
      // Store request ID for response correlation
      (config as any).requestId = requestId;
      (config as any).startTime = Date.now();
      
      // Log request
      logger.debug('API request started', {
        requestId,
        method: config.method?.toUpperCase(),
        url: config.url,
      });
      
      return config;
    },
    (error: AxiosError) => {
      logger.error('API request setup failed', {
        error,
        message: error.message,
      });
      return Promise.reject(error);
    }
  );
}

// Response interceptor
export function setupResponseInterceptor(): void {
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as any;
      const duration = Date.now() - (config.startTime || 0);
      
      // Log successful response
      logger.debug('API request completed', {
        requestId: config.requestId,
        method: config.method?.toUpperCase(),
        url: config.url,
        status: response.status,
        duration_ms: duration,
      });
      
      return response;
    },
    (error: AxiosError) => {
      const config = error.config as any;
      const duration = config ? Date.now() - (config.startTime || 0) : 0;
      
      // Log error response
      logger.error('API request failed', {
        requestId: config?.requestId,
        method: config?.method?.toUpperCase(),
        url: config?.url,
        status: error.response?.status,
        duration_ms: duration,
        error: error.message,
      });
      
      return Promise.reject(error);
    }
  );
}
```

### 3. Health Check Endpoints

#### 3.1 Health Check Implementation

**File:** `backend/app/api/v1/health.py` (NEW FILE)

**Integration Notes:**
- The existing `/health` endpoint in main.py will remain unchanged
- This creates a new router with comprehensive health checks
- Will be included in api_router in __init__.py
- The simple `/health` in main.py can coexist with `/api/v1/health/ready`

```python
"""Health check endpoints"""

import asyncio
import time
from typing import Any

import structlog
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.graph_service import GraphService

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict[str, str]:
    """Basic health check - always returns 200 if service is running"""
    return {"status": "healthy"}


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check(
    db: AsyncSession = Depends(get_db),
    graph_service: GraphService = Depends()
) -> dict[str, Any]:
    """
    Comprehensive readiness check
    Returns 200 if all dependencies are healthy, 503 otherwise
    """
    start_time = time.time()
    checks = {}
    all_healthy = True
    
    # Check database
    try:
        await asyncio.wait_for(
            db.execute(text("SELECT 1")),
            timeout=2.0
        )
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False
        logger.error("Database health check failed", error=str(e))
    
    # Check graph database
    try:
        await asyncio.wait_for(
            graph_service.execute_query("RETURN 1"),
            timeout=2.0
        )
        checks["graph_database"] = {"status": "healthy"}
    except Exception as e:
        checks["graph_database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False
        logger.error("Graph database health check failed", error=str(e))
    
    duration = time.time() - start_time
    
    response_data = {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks,
        "duration_seconds": round(duration, 3)
    }
    
    if not all_healthy:
        return Response(
            content=str(response_data),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )
    
    return response_data
```

## Data Models

### Frontend Types

**File:** `frontend/src/types/logging.ts`

```typescript
/**
 * Type definitions for logging
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  componentName?: string;
  sessionId?: string;
  requestId?: string;
  error?: ErrorInfo;
}

export interface ErrorInfo {
  type: string;
  message: string;
  stack?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: Record<string, CheckResult>;
  duration_seconds: number;
}

export interface CheckResult {
  status: 'healthy' | 'unhealthy';
  error?: string;
}
```

## Configuration

### Backend Configuration

**File:** `backend/app/core/config.py` (additions)

```python
"""Configuration additions for logging"""

class Settings(BaseSettings):
    # ... existing settings ...
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Log level")
    LOG_DIR: str = Field(default="logs", description="Log directory path")
    LOG_MAX_BYTES: int = Field(default=100 * 1024 * 1024, description="Max log file size (100MB)")
    LOG_BACKUP_COUNT: int = Field(default=14, description="Number of backup log files to keep")
```

### Frontend Configuration

**File:** `frontend/.env.example` (additions)

```bash
# Logging
VITE_LOG_LEVEL=INFO
```

## Integration Points

### Application Startup

**File:** `backend/app/main.py` (MODIFY EXISTING)

**Integration Notes:**
- Add logging configuration at the very top, before any other imports that might log
- Add LoggingMiddleware after existing CORS middleware
- Keep existing health check endpoint
- Include new health router from api/v1/health.py

```python
"""FastAPI application entry point for RxDx"""

# NEW: Configure logging first, before other imports
from app.core.logging import configure_logging
configure_logging()

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# NEW: Import logging middleware
from app.middleware.logging import LoggingMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.db import graph_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    print(f"Starting RxDx Backend v{settings.VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")

    # ... existing startup code ...

    yield

    # ... existing shutdown code ...


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Project Management System for Regulated Industries",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS (EXISTING)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NEW: Add logging middleware
app.add_middleware(LoggingMiddleware)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint"""
    return {
        "message": "RxDx API",
        "version": settings.VERSION,
        "docs": "/api/docs",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint (EXISTING - keep as is)"""
    return {"status": "healthy"}


# Include API v1 router (EXISTING)
app.include_router(api_router, prefix="/api/v1")
```

**File:** `backend/app/api/v1/__init__.py` (MODIFY EXISTING)

Add health router to existing imports:

```python
"""API v1 router"""

from fastapi import APIRouter

from app.api.v1 import (
    audit,
    auth,
    documents,
    email,
    graph,
    health,  # NEW
    llm,
    requirements,
    risks,
    schedule,
    signatures,
    templates,
    tests,
    time_entries,
    workitems,
)

api_router = APIRouter()

# NEW: Include health check routes
api_router.include_router(health.router, tags=["health"])

# ... existing router includes ...
```

**File:** `frontend/src/main.tsx` (MODIFY EXISTING)

**Integration Notes:**
- Import and setup logger and interceptors
- Existing code remains unchanged
- Add logging setup before React render

```typescript
/**
 * Application entry point with logging
 */

import { setupRequestInterceptor, setupResponseInterceptor } from './services/api/interceptors';
import { logger } from './services/logger';

// Setup API interceptors
setupRequestInterceptor();
setupResponseInterceptor();

// Log application start
logger.info('Application started', {
  version: import.meta.env.VITE_APP_VERSION,
  environment: import.meta.env.MODE,
});
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Log Format Consistency

*For any* log message and log level, the logged output must be valid JSON with required fields (timestamp, level, message, service).

**Validates: Requirements 1.1, 1.2**

### Property 2: Request ID Propagation

*For any* API request, the request ID must be present in all backend logs related to that request and in the response headers.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 3: Log Rotation Behavior

*For any* sequence of log writes, when the log file size exceeds 100MB, a new log file must be created and old files beyond 7 days must be deleted.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Health Check Response Time

*For any* health check request, the response must be returned within 5 seconds.

**Validates: Requirements 5.6**

### Property 5: Error Logging Completeness

*For any* unhandled exception, the error log must include timestamp, error type, error message, and stack trace.

**Validates: Requirements 6.1, 6.2, 6.3**

## Testing Strategy

### Unit Tests
- Test log formatting and structure
- Test request ID generation and propagation
- Test health check logic for each dependency
- Test log rotation configuration

### Integration Tests
- Test end-to-end request tracing from frontend to backend
- Test health check endpoints with real database connections
- Test log file creation and rotation
- Test error logging across the stack

### Property-Based Tests
- Test log format consistency across all inputs
- Test request ID propagation with random request patterns
- Test log rotation with various file sizes and write patterns
- Test health check timeout behavior

## Deployment Considerations

### Log Directory Setup

Ensure log directories exist and have proper permissions:

```bash
# Backend
mkdir -p backend/logs
chmod 755 backend/logs

# Frontend (if using Node.js for SSR)
mkdir -p frontend/logs
chmod 755 frontend/logs
```

### Docker Configuration

**File:** `docker-compose.yml` (additions)

```yaml
services:
  backend:
    environment:
      - LOG_LEVEL=INFO
      - LOG_DIR=/app/logs
    volumes:
      - ./backend/logs:/app/logs

  frontend:
    environment:
      - VITE_LOG_LEVEL=INFO
    volumes:
      - ./frontend/logs:/app/logs
```

### Log Cleanup Script

**File:** `scripts/cleanup-logs.sh`

```bash
#!/bin/bash
# Clean up log files older than 7 days

find backend/logs -name "*.log.*" -mtime +7 -delete
find frontend/logs -name "*.log.*" -mtime +7 -delete

echo "Log cleanup completed"
```

Add to crontab for daily execution:
```bash
0 2 * * * /path/to/scripts/cleanup-logs.sh
```

## Migration Plan

### Phase 1: Backend Logging Infrastructure (Week 1)
1. Add structlog to pyproject.toml dependencies: `uv add structlog`
2. Create `backend/app/core/logging.py` with configuration
3. Create `backend/app/middleware/` directory
4. Create `backend/app/middleware/__init__.py`
5. Create `backend/app/middleware/logging.py` with LoggingMiddleware
6. Modify `backend/app/main.py` to configure logging and add middleware
7. Test that existing log statements in services work with new format
8. Verify log files are created in `backend/logs/`
9. Test log rotation

### Phase 2: Health Check Endpoints (Week 1)
1. Create `backend/app/api/v1/health.py` with comprehensive checks
2. Modify `backend/app/api/v1/__init__.py` to include health router
3. Test `/api/v1/health/ready` endpoint
4. Verify database and graph DB checks work
5. Verify existing `/health` endpoint still works

### Phase 3: Frontend Logging (Week 2)
1. Create `frontend/src/services/logger.ts` with LoggerService
2. Modify `frontend/src/services/api.ts` to add request ID and logging to existing interceptors
3. Modify `frontend/src/main.tsx` to initialize logger
4. Test request tracing end-to-end
5. Gradually migrate console.log calls to logger (optional, ongoing)

### Phase 4: Testing and Validation (Week 2)
1. Test request ID propagation from frontend to backend
2. Verify structured logs include all required fields
3. Test error logging with stack traces
4. Verify health checks return correct status codes
5. Test log rotation behavior
6. Performance testing to ensure logging doesn't impact response times

### Phase 5: Documentation and Rollout (Week 3)
1. Update README with logging configuration
2. Document log file locations and rotation policy
3. Create runbook for log analysis
4. Deploy to staging environment
5. Monitor for issues
6. Deploy to production

## Backward Compatibility

### Existing Code That Will Continue to Work:
- ✅ All existing `logging.getLogger(__name__)` calls in services
- ✅ All existing `logger.info()`, `logger.error()`, etc. statements
- ✅ Existing `/health` endpoint in main.py
- ✅ Existing axios interceptors for authentication
- ✅ Existing console.log/error/warn calls in frontend
- ✅ Existing CORS middleware

### No Breaking Changes:
- structlog wraps Python logging, doesn't replace it
- New middleware is additive
- New health endpoints are additional routes
- Frontend logger is a new service, doesn't modify existing code
- Request ID header is added, doesn't remove existing headers

## Success Metrics

- All errors are logged with full context
- Log files are automatically rotated at 100MB
- Logs are retained for 7 days
- Request tracing works across frontend and backend
- Health checks accurately reflect system status
- Log writes don't block application threads

## Maintenance

### Daily Tasks
- Monitor log file sizes
- Check for disk space issues

### Weekly Tasks
- Review error logs
- Verify log rotation is working
- Check health check status

### Monthly Tasks
- Review log retention policy
- Update log levels if needed
- Archive important logs if necessary

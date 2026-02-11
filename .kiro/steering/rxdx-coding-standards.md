# RxDx Project Coding Standards

This document defines coding standards specific to the RxDx project management system. These standards complement the general best practices and focus on patterns used throughout this codebase.

## Critical Principle: Avoid Duplicate Implementations

**BEFORE implementing any new feature, service, or infrastructure:**

1. ✅ **CHECK EXISTING CODE**: Search the codebase for similar functionality
2. ✅ **CHECK SPECS**: Review `.kiro/specs/` for planned implementations
3. ✅ **EXTEND, DON'T DUPLICATE**: Enhance existing code rather than creating parallel systems
4. ✅ **ASK IF UNSURE**: When in doubt, ask before implementing

**Examples of what to check:**
- Logging infrastructure → Check `specs/logging-and-monitoring/`
- Authentication → Check existing auth service and middleware
- API clients → Check existing axios setup in `services/api.ts`
- Health checks → Check existing `/health` endpoint
- Middleware → Check what's already in `main.py`

**Red Flags (Stop and Check):**
- 🚫 Creating a second logger service
- 🚫 Adding duplicate middleware
- 🚫 Creating parallel health check systems
- 🚫 Implementing a second request tracing mechanism
- 🚫 Adding another error tracking service

**When You Find Existing Code:**
- ✅ Extend it with new features
- ✅ Enhance it with better capabilities
- ✅ Refactor it if needed
- ❌ Don't create a competing implementation

## Error Handling Standards

### Frontend Error Handling

#### React Error Boundaries

All page-level components MUST be wrapped in error boundaries:

```typescript
// ✅ GOOD: Page wrapped in error boundary
<Route
  path="/schedule"
  element={
    <AppLayout>
      <ProtectedRoute>
        <PageErrorBoundary>
          <SchedulePage />
        </PageErrorBoundary>
      </ProtectedRoute>
    </AppLayout>
  }
/>

// ❌ BAD: No error boundary
<Route path="/schedule" element={<SchedulePage />} />
```

#### API Error Handling Pattern

All API service methods MUST follow this error handling pattern:

```typescript
// ✅ GOOD: Consistent error handling
async function getSchedule(id: string): Promise<Schedule> {
  try {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || error.message;
      
      // Use logger service if available, otherwise console.error
      if (typeof logger !== 'undefined') {
        logger.error('Failed to fetch schedule', {
          scheduleId: id,
          status: error.response?.status,
          message,
        });
      } else {
        console.error('Failed to fetch schedule:', { scheduleId: id, message });
      }
      
      throw new ApiError(message, error.response?.status);
    }
    
    // Use logger service if available, otherwise console.error
    if (typeof logger !== 'undefined') {
      logger.error('Unexpected error fetching schedule', { scheduleId: id, error });
    } else {
      console.error('Unexpected error fetching schedule:', { scheduleId: id, error });
    }
    
    throw error;
  }
}

// ❌ BAD: Silent failure
async function getSchedule(id: string): Promise<Schedule | null> {
  try {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  } catch (error) {
    return null; // Don't hide errors!
  }
}
```

#### Component Error Handling

Components MUST handle loading and error states:

```typescript
// ✅ GOOD: All states handled
function ScheduleList(): React.ReactElement {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchedules() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await scheduleService.getSchedules();
        setSchedules(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedules');
      } finally {
        setIsLoading(false);
      }
    }
    loadSchedules();
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadSchedules} />;
  if (schedules.length === 0) return <EmptyState />;

  return <ScheduleTable schedules={schedules} />;
}

// ❌ BAD: No error handling
function ScheduleList(): React.ReactElement {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    scheduleService.getSchedules().then(setSchedules);
  }, []);

  return <ScheduleTable schedules={schedules} />;
}
```

### Backend Error Handling

#### FastAPI Exception Handling

Use FastAPI's HTTPException for expected errors:

```python
# ✅ GOOD: Proper exception handling
from fastapi import HTTPException, status

async def get_schedule(schedule_id: UUID) -> Schedule:
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found"
        )
    return schedule

# ❌ BAD: Returning None
async def get_schedule(schedule_id: UUID) -> Schedule | None:
    return await db.get(Schedule, schedule_id)
```

#### Service Layer Error Handling

Service methods MUST log errors and raise specific exceptions:

```python
# ✅ GOOD: Logged and specific exception
class ScheduleService:
    async def calculate_schedule(self, project_id: UUID) -> ScheduleResult:
        try:
            tasks = await self.get_tasks(project_id)
            if not tasks:
                raise ValueError("No tasks found for project")
            
            result = self.solver.solve(tasks)
            logger.info(
                "Schedule calculated",
                project_id=str(project_id),
                task_count=len(tasks),
                duration=result.duration
            )
            return result
        except ValueError as e:
            logger.error(
                "Schedule calculation failed",
                project_id=str(project_id),
                error=str(e)
            )
            raise
        except Exception as e:
            logger.exception(
                "Unexpected error in schedule calculation",
                project_id=str(project_id)
            )
            raise ScheduleCalculationError(f"Failed to calculate schedule: {e}")

# ❌ BAD: Silent failure
class ScheduleService:
    async def calculate_schedule(self, project_id: UUID) -> ScheduleResult | None:
        try:
            tasks = await self.get_tasks(project_id)
            return self.solver.solve(tasks)
        except Exception:
            return None
```

## Logging Standards

**IMPORTANT**: The RxDx project uses a standardized logging infrastructure defined in `.kiro/specs/logging-and-monitoring/`. DO NOT create alternative logging systems.

### Current Logging Infrastructure

**Backend (Existing):**
- Basic Python logging via `logging.getLogger(__name__)` in services
- Used in: `template_service.py`, `scheduler_service.py`, `email_service.py`

**Backend (Planned - See spec):**
- `structlog` for structured JSON logging (wraps existing logging)
- `LoggingMiddleware` for request tracing
- Log rotation with `RotatingFileHandler`
- Logs stored in `backend/logs/`

**Frontend (Existing):**
- Scattered `console.log`, `console.error`, `console.warn` calls

**Frontend (Planned - See spec):**
- Centralized `LoggerService` in `services/logger.ts`
- Request tracing via axios interceptors
- Structured log format with context

### Frontend Logging

**Current State**: Use console methods directly (temporary)

```typescript
// ✅ ACCEPTABLE (until LoggerService is implemented):
console.log('Schedule updated:', schedule);
console.error('Failed to fetch schedule:', error);
```

**Future State**: Use centralized logger service (after implementation)

```typescript
// ✅ GOOD: Structured logging with centralized service
import { logger } from '@/services/logger';

function handleScheduleUpdate(schedule: Schedule) {
  logger.info('Schedule updated', {
    scheduleId: schedule.id,
    userId: currentUser.id,
    changes: schedule.changes,
  });
}

// ❌ BAD: Direct console.log (after logger service exists)
function handleScheduleUpdate(schedule: Schedule) {
  console.log('Updated schedule:', schedule);
}
```

**Migration Strategy:**
1. LoggerService will be implemented per spec
2. Existing console.log calls can remain during transition
3. New code should use logger service once available
4. Gradual migration of old console.log calls (low priority)

### Backend Logging

**Current State**: Use `logging.getLogger(__name__)`

```python
# ✅ GOOD: Current standard (compatible with future structlog)
import logging

logger = logging.getLogger(__name__)

async def create_schedule(data: ScheduleCreate, user_id: UUID) -> Schedule:
    logger.info(f"Creating schedule for user {user_id}")
    schedule = await self.db.create(Schedule, data)
    logger.info(f"Created schedule {schedule.id}")
    return schedule
```

**Future State**: Structured logging with context (after structlog implementation)

```python
# ✅ GOOD: Structured logging with context (after structlog setup)
import structlog

logger = structlog.get_logger(__name__)

async def create_schedule(data: ScheduleCreate, user_id: UUID) -> Schedule:
    logger.info(
        "Creating schedule",
        user_id=str(user_id),
        project_id=str(data.project_id),
        task_count=len(data.tasks)
    )
    
    schedule = await self.db.create(Schedule, data)
    
    logger.info(
        "Schedule created",
        schedule_id=str(schedule.id),
        user_id=str(user_id)
    )
    return schedule

# ❌ BAD: Print statements (never use)
async def create_schedule(data: ScheduleCreate, user_id: UUID) -> Schedule:
    print(f"Creating schedule for user {user_id}")
    schedule = await self.db.create(Schedule, data)
    print(f"Created schedule {schedule.id}")
    return schedule
```

**Compatibility Note**: 
- Existing `logging.getLogger(__name__)` will work with structlog
- structlog wraps Python logging, doesn't replace it
- No code changes needed when structlog is added
- Existing log statements will automatically get structured format

### Log Levels

Use appropriate log levels:

- **DEBUG**: Detailed information for diagnosing problems (disabled in production)
- **INFO**: General informational messages about application flow
- **WARN**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for failures that don't stop the application
- **CRITICAL**: Critical messages for failures that may stop the application

```python
# ✅ GOOD: Appropriate log levels
logger.debug("Entering schedule calculation", task_count=len(tasks))
logger.info("Schedule calculation completed", duration_ms=elapsed)
logger.warning("Schedule calculation slow", duration_ms=elapsed, threshold_ms=2000)
logger.error("Schedule calculation failed", error=str(e))
logger.critical("Database connection lost", error=str(e))

# ❌ BAD: Everything is INFO
logger.info("Entering schedule calculation")
logger.info("Schedule calculation failed")
logger.info("Database connection lost")
```

### Request Tracing

**Planned Feature** (see `specs/logging-and-monitoring/`):
- Frontend adds `X-Request-ID` header to all API calls
- Backend extracts request ID via middleware
- All logs include request_id for tracing

**DO NOT implement alternative request tracing systems**

## State Management Standards

### Zustand Store Pattern

All stores MUST follow this pattern:

```typescript
// ✅ GOOD: Complete store with error handling
interface ScheduleStore {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  fetchSchedules: () => Promise<void>;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  fetchSchedules: async () => {
    set({ isLoading: true, error: null });
    try {
      const schedules = await scheduleService.getSchedules();
      set({ schedules, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch schedules';
      set({ error: message, isLoading: false });
      
      // Use logger service if available, otherwise console.error
      if (typeof logger !== 'undefined') {
        logger.error('Failed to fetch schedules', { error });
      } else {
        console.error('Failed to fetch schedules:', error);
      }
    }
  },

  clearError: () => set({ error: null }),
}));

// ❌ BAD: No error handling
export const useScheduleStore = create<ScheduleStore>((set) => ({
  schedules: [],
  
  fetchSchedules: async () => {
    const schedules = await scheduleService.getSchedules();
    set({ schedules });
  },
}));
```

## Data Validation Standards

### Frontend Validation

Validate all data before rendering:

```typescript
// ✅ GOOD: Validated data
function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const title = schedule?.title || 'Untitled Schedule';
  const tasks = Array.isArray(schedule?.tasks) ? schedule.tasks : [];
  const startDate = schedule?.startDate ? new Date(schedule.startDate) : null;

  return (
    <div>
      <h3>{title}</h3>
      <p>{tasks.length} tasks</p>
      {startDate && <p>Starts: {startDate.toLocaleDateString()}</p>}
    </div>
  );
}

// ❌ BAD: No validation
function ScheduleCard({ schedule }: { schedule: Schedule }) {
  return (
    <div>
      <h3>{schedule.title}</h3>
      <p>{schedule.tasks.length} tasks</p>
      <p>Starts: {new Date(schedule.startDate).toLocaleDateString()}</p>
    </div>
  );
}
```

### Backend Validation

Use Pydantic models for validation:

```python
# ✅ GOOD: Pydantic validation
from pydantic import BaseModel, Field, field_validator

class ScheduleCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    project_id: UUID
    tasks: list[TaskCreate] = Field(..., min_length=1)
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        if v.strip() != v:
            raise ValueError('Title cannot have leading/trailing whitespace')
        return v

# ❌ BAD: Manual validation
def create_schedule(data: dict) -> Schedule:
    if not data.get('title'):
        raise ValueError('Title is required')
    if len(data['title']) < 3:
        raise ValueError('Title too short')
    # ... more manual checks
```

## Testing Standards

### Test Commands

**Frontend:**
```bash
# Run tests once (default - exits automatically)
npm test

# Run tests in watch mode (stays running, watches for changes)
npm run test:watch

# Run specific test file
npm test -- BarnesHutQuadtree.test.ts

# Run tests with UI
npm run test:ui

# Run tests silently (minimal output)
npm test -- --silent
```

**Backend:**
```bash
# Run all tests
cd backend
uvx pytest

# Run with minimal output
uvx pytest -q

# Run specific test file
uvx pytest tests/test_workitem_service.py

# Run with coverage
uvx pytest --cov=app --cov-report=term-missing
```

### Frontend Testing

Test error scenarios:

```typescript
// ✅ GOOD: Tests error handling
describe('ScheduleList', () => {
  it('displays error message when fetch fails', async () => {
    vi.spyOn(scheduleService, 'getSchedules').mockRejectedValue(
      new Error('Network error')
    );

    render(<ScheduleList />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    vi.spyOn(scheduleService, 'getSchedules').mockRejectedValue(
      new Error('Network error')
    );

    render(<ScheduleList />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

### Backend Testing

Test error cases:

```python
# ✅ GOOD: Tests error handling
@pytest.mark.asyncio
async def test_get_schedule_not_found():
    service = ScheduleService(db)
    
    with pytest.raises(HTTPException) as exc_info:
        await service.get_schedule(uuid4())
    
    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()

@pytest.mark.asyncio
async def test_create_schedule_invalid_data():
    service = ScheduleService(db)
    
    with pytest.raises(ValueError, match="No tasks"):
        await service.create_schedule(ScheduleCreate(
            title="Test",
            project_id=uuid4(),
            tasks=[]
        ))
```

## Performance Standards

### Frontend Performance

- Components MUST NOT re-render unnecessarily
- Use `useMemo` and `useCallback` for expensive computations
- Lazy load large components
- Debounce user input handlers

```typescript
// ✅ GOOD: Optimized component
function ScheduleList({ schedules }: { schedules: Schedule[] }) {
  const sortedSchedules = useMemo(
    () => schedules.sort((a, b) => a.title.localeCompare(b.title)),
    [schedules]
  );

  const handleSearch = useCallback(
    debounce((query: string) => {
      // Search logic
    }, 300),
    []
  );

  return (
    <div>
      <SearchInput onChange={handleSearch} />
      {sortedSchedules.map(schedule => (
        <ScheduleCard key={schedule.id} schedule={schedule} />
      ))}
    </div>
  );
}
```

### Backend Performance

- Use database indexes for frequently queried fields
- Implement pagination for list endpoints
- Use async/await for I/O operations
- Cache expensive computations

```python
# ✅ GOOD: Paginated endpoint
@router.get("/schedules")
async def list_schedules(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse[Schedule]:
    total = await db.scalar(select(func.count(Schedule.id)))
    schedules = await db.scalars(
        select(Schedule)
        .offset(skip)
        .limit(limit)
        .order_by(Schedule.created_at.desc())
    )
    
    return PaginatedResponse(
        items=schedules.all(),
        total=total,
        skip=skip,
        limit=limit
    )
```

## Security Standards

### Input Sanitization

- NEVER trust user input
- Validate and sanitize all inputs
- Use parameterized queries
- Escape HTML in user-generated content

```python
# ✅ GOOD: Parameterized query
async def get_schedules_by_title(title: str) -> list[Schedule]:
    result = await db.execute(
        select(Schedule).where(Schedule.title.ilike(f"%{title}%"))
    )
    return result.scalars().all()

# ❌ BAD: SQL injection risk
async def get_schedules_by_title(title: str) -> list[Schedule]:
    query = f"SELECT * FROM schedules WHERE title LIKE '%{title}%'"
    result = await db.execute(text(query))
    return result.fetchall()
```

### Authentication

- ALWAYS check authentication on protected endpoints
- Use dependency injection for auth checks
- Log authentication failures

```python
# ✅ GOOD: Protected endpoint
@router.get("/schedules/{schedule_id}")
async def get_schedule(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Schedule:
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Check authorization
    if schedule.project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return schedule
```

## Documentation Standards

### Code Comments

- Document WHY, not WHAT
- Use JSDoc/docstrings for public APIs
- Keep comments up to date

```typescript
// ✅ GOOD: Explains why
/**
 * Calculates schedule using constraint programming.
 * We use OR-Tools instead of simple sorting because it handles
 * complex dependencies and resource constraints that would be
 * difficult to implement manually.
 */
function calculateSchedule(tasks: Task[]): Schedule {
  // Implementation
}

// ❌ BAD: States the obvious
/**
 * Calculates schedule
 */
function calculateSchedule(tasks: Task[]): Schedule {
  // Loop through tasks
  for (const task of tasks) {
    // Process task
  }
}
```

### API Documentation

- Document all endpoints with OpenAPI/Swagger
- Include request/response examples
- Document error responses

```python
# ✅ GOOD: Well-documented endpoint
@router.post(
    "/schedules",
    response_model=Schedule,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Invalid input"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
    }
)
async def create_schedule(
    data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Schedule:
    """
    Create a new schedule.
    
    Args:
        data: Schedule creation data including title, project_id, and tasks
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Created schedule with calculated dates
    
    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 403 if user doesn't own the project
    """
    # Implementation
```

## File Organization

### Frontend Structure

```
src/
├── components/
│   ├── common/          # Shared components
│   ├── schedule/        # Feature-specific components
│   └── [feature]/
├── pages/               # Page components
├── services/            # API services
├── stores/              # Zustand stores
├── types/               # TypeScript types
├── utils/               # Utility functions
└── hooks/               # Custom React hooks
```

### Backend Structure

```
app/
├── api/
│   └── v1/              # API endpoints
├── core/                # Core configuration
├── db/                  # Database setup
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── services/            # Business logic
└── utils/               # Utility functions
```

## Commit Standards

- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Keep commits focused and atomic
- Write descriptive commit messages
- Reference issue numbers

```bash
# ✅ GOOD
git commit -m "feat(schedule): add constraint-based scheduling algorithm

Implements OR-Tools solver for schedule calculation with support for
task dependencies and resource constraints.

Closes #123"

# ❌ BAD
git commit -m "fixed stuff"
```

## Review Checklist

Before submitting code for review, ensure:

- [ ] **No duplicate implementations** - Checked existing code and specs
- [ ] All tests pass
- [ ] Error handling is implemented
- [ ] Logging is added for important operations (using current standard)
- [ ] Input validation is in place
- [ ] Documentation is updated
- [ ] No print() statements in Python (use logging)
- [ ] Console.log is acceptable until logger service exists
- [ ] No hardcoded values (use config)
- [ ] TypeScript/Python types are correct
- [ ] Performance is acceptable
- [ ] Security best practices followed
- [ ] Existing infrastructure extended, not duplicated

## Infrastructure Integration Checklist

When adding new infrastructure (middleware, services, interceptors, etc.):

- [ ] **Searched codebase** for existing similar functionality
- [ ] **Checked specs** in `.kiro/specs/` for planned implementations
- [ ] **Reviewed this file** for current standards
- [ ] **Extended existing code** rather than creating parallel systems
- [ ] **Documented integration** with existing infrastructure
- [ ] **Tested compatibility** with existing features
- [ ] **No breaking changes** to existing functionality

## Common Integration Points

### Backend
- **Middleware**: Add to `main.py` after existing middleware (CORS)
- **Logging**: Use `logging.getLogger(__name__)` (compatible with future structlog)
- **Health checks**: Extend existing `/health` endpoint or add to `/api/v1/health/`
- **API routes**: Add to `api/v1/__init__.py` router includes
- **Services**: Create in `services/` directory, follow existing patterns

### Frontend
- **API client**: Extend `services/api.ts`, don't create new axios instances
- **Interceptors**: Add to existing interceptor setup in `api.ts`
- **Logging**: Use console methods until `services/logger.ts` is implemented
- **Stores**: Follow Zustand pattern in `stores/` directory
- **Services**: Create in `services/` directory, use existing `apiClient`

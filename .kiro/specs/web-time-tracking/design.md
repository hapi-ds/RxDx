# Design Document: Web Time Tracking

## Overview

The Web Time Tracking feature adds comprehensive time tracking capabilities to the RxDx web application. This feature enables users to track time spent on tasks through a desktop-optimized interface that integrates seamlessly with the existing React + TypeScript web application.

The design follows established patterns in the RxDx web frontend:
- **State Management**: Zustand stores for centralized state
- **API Communication**: Axios-based API client with JWT authentication
- **Routing**: React Router with protected routes
- **Component Structure**: Page components, feature components, and common components
- **Error Handling**: Error boundaries and user-friendly error messages
- **State Persistence**: localStorage for active tracking recovery on page refresh

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React App)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TimeTracking │  │   TaskList   │  │ TimeEntries  │      │
│  │     Page     │  │  Component   │  │  Component   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│  ┌────────────────────────┴────────────────────────┐        │
│  │      useTimeTrackingStore (Zustand)             │        │
│  │  - tasks, activeTracking, entries, filters      │        │
│  │  - fetchTasks, startTracking, stopTracking      │        │
│  └────────────────────┬────────────────────────────┘        │
│                       │                                     │
│  ┌────────────────────┴────────────────────────┐            │
│  │      timeTrackingService                    │            │
│  │  - getTasks(), startTracking()              │            │
│  │  - stopTracking(), getEntries()             │            │
│  └────────────────────┬────────────────────────┘            │
│                       │                                     │
│  ┌────────────────────┴────────────────────────┐            │
│  │      apiClient (Axios)                      │            │
│  │  - JWT token handling                       │            │
│  │  - Request/response interceptors            │            │
│  └────────────────────┬────────────────────────┘            │
│                       │                                     │
│  ┌────────────────────┴────────────────────────┐            │
│  │      localStorage                           │            │
│  │  - Active tracking state persistence        │            │
│  │  - Session state (search, selected task)    │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ HTTPS/REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   RxDx Backend API                           │
│  /api/v1/time-tracking/tasks                                │
│  /api/v1/time-tracking/start                                │
│  /api/v1/time-tracking/stop                                 │
│  /api/v1/time-tracking/active                               │
│  /api/v1/time-tracking/entries                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
└── AppLayout
    └── ProtectedRoute
        └── PageErrorBoundary
            └── TimeTrackingPage
                ├── TaskListPanel
                │   ├── SearchBar
                │   ├── TaskCard (multiple)
                │   └── TaskListEmpty
                ├── TimerPanel
                │   ├── TaskHeader
                │   ├── Timer
                │   ├── DescriptionInput
                │   └── StartStopButton
                └── TimeEntriesPanel
                    ├── TimeEntryGroup (by date)
                    │   └── TimeEntryCard (multiple)
                    └── LoadMoreButton
```

## Components and Interfaces

### 1. TimeTrackingPage Component

**Location**: `frontend/src/pages/TimeTrackingPage.tsx`

**Purpose**: Main page component that orchestrates the time tracking UI

**Props**: None (uses stores and services)

**State Management**: Uses `useTimeTrackingStore` for all state

**Layout**:
- Desktop (≥1024px): Two-column layout (task list | timer + entries)
- Tablet (<1024px): Single-column stacked layout

**Responsibilities**:
- Initialize data on mount (fetch tasks, check active tracking)
- Handle keyboard shortcuts (Ctrl+Space, Ctrl+F, Escape)
- Coordinate between child components
- Display error messages and notifications

**Key Methods**:
```typescript
useEffect(() => {
  // On mount: fetch tasks and check for active tracking
  fetchTasks();
  checkActiveTracking();
  
  // Set up keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      toggleTracking();
    }
    // ... other shortcuts
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 2. TaskListPanel Component

**Location**: `frontend/src/components/timetracking/TaskListPanel.tsx`

**Purpose**: Displays searchable, sortable list of tasks

**Props**:
```typescript
interface TaskListPanelProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
  isLoading: boolean;
}
```

**Features**:
- Search input with 300ms debounce
- Task sorting (active tracking → scheduled → others)
- Visual indicator for tasks with active tracking
- Scrollable list with fixed height
- Empty state when no tasks found

**Task Card Display**:
- Task title (bold)
- Description (truncated to 100 chars)
- Worked sum (formatted as "Xh Ym")
- Timer icon if actively tracking

### 3. TimerPanel Component

**Location**: `frontend/src/components/timetracking/TimerPanel.tsx`

**Purpose**: Displays timer controls and description input

**Props**:
```typescript
interface TimerPanelProps {
  selectedTask: Task | null;
  activeTracking: ActiveTracking | null;
  onStart: (taskId: string, description: string) => Promise<void>;
  onStop: (description: string) => Promise<void>;
  isStarting: boolean;
  isStopping: boolean;
}
```

**Features**:
- Task header with title and description
- Real-time timer display (HH:MM:SS format)
- Description textarea (500 char limit with counter)
- Start/Stop button with loading states
- Disabled state when no task selected

**Timer Logic**:
```typescript
useEffect(() => {
  if (!activeTracking) return;
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - new Date(activeTracking.startTime).getTime();
    setElapsedTime(elapsed);
  }, 1000);
  
  return () => clearInterval(interval);
}, [activeTracking]);
```

### 4. TimeEntriesPanel Component

**Location**: `frontend/src/components/timetracking/TimeEntriesPanel.tsx`

**Purpose**: Displays recent time entries grouped by date

**Props**:
```typescript
interface TimeEntriesPanelProps {
  entries: TimeEntry[];
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
}
```

**Features**:
- Group entries by date (most recent first)
- Display date headers (e.g., "Today", "Yesterday", "Jan 15, 2024")
- Show task title, times, duration, description
- Load more button for pagination
- Empty state when no entries

**Entry Display Format**:
```
[Date Header: Today]
  Task: Implement authentication
  09:30 - 11:45 (2h 15m)
  Description: Added JWT token handling...
  
  Task: Fix bug in scheduler
  14:00 - 15:30 (1h 30m)
  Description: Resolved constraint conflict...
```

### 5. OfflineIndicator Component

**REMOVED** - Offline functionality not needed for web app

## Data Models

### Task Interface

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority: number;
  estimated_hours: number;
  worked_sum: number; // Total hours worked (all users)
  assigned_to?: string;
  scheduled_start?: string; // ISO date
  scheduled_end?: string; // ISO date
  has_active_tracking: boolean; // True if any user is tracking
  user_is_tracking: boolean; // True if current user is tracking
}
```

### ActiveTracking Interface

```typescript
interface ActiveTracking {
  id: string;
  task_id: string;
  task_title: string;
  start_time: string; // ISO datetime
  description: string;
}
```

### TimeEntry Interface

```typescript
interface TimeEntry {
  id: string;
  task_id: string;
  task_title: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  duration_hours: number;
  description: string;
  created_at: string; // ISO datetime
}
```

### TimeTrackingStore State

```typescript
interface TimeTrackingState {
  // Data
  tasks: Task[];
  activeTracking: ActiveTracking | null;
  entries: TimeEntry[];
  
  // UI State
  selectedTaskId: string | null;
  searchQuery: string;
  
  // Pagination
  entriesPage: number;
  entriesHasMore: boolean;
  
  // Loading States
  isLoadingTasks: boolean;
  isLoadingEntries: boolean;
  isStarting: boolean;
  isStopping: boolean;
  
  // Error State
  error: string | null;
}
```

### QueuedOperation Interface

**REMOVED** - Offline functionality not needed for web app

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Task List Sorting Consistency

*For any* fetched task list, tasks with `user_is_tracking === true` should appear before tasks with `scheduled_start` dates, which should appear before all other tasks.

**Validates: Requirements 3.2**

### Property 2: Timer Accuracy

*For any* active tracking session, the displayed elapsed time should equal the difference between the current time and the `start_time` within a 1-second tolerance.

**Validates: Requirements 8.2, 8.3**

### Property 3: Description Length Validation

*For any* description input, if the length exceeds 500 characters, the start/stop action should be prevented and an error should be displayed.

**Validates: Requirements 6.3**

### Property 4: Single Active Tracking Enforcement

*For any* user, attempting to start tracking when `activeTracking !== null` should be prevented with an error message.

**Validates: Requirements 5.11**

### Property 5: Description Length Validation

*For any* description input, if the length exceeds 500 characters, the start/stop action should be prevented and an error should be displayed.

**Validates: Requirements 6.3**

### Property 6: Search Filter Correctness

*For any* search query, all displayed tasks should have either `title` or `description` containing the query string (case-insensitive).

**Validates: Requirements 4.2**

### Property 7: Time Entry Grouping

*For any* list of time entries, entries with the same date (YYYY-MM-DD) should be grouped together and sorted by date descending.

**Validates: Requirements 7.4**

### Property 8: Worked Sum Format

*For any* task with `worked_sum` value, the displayed format should match the pattern "Xh Ym" where X and Y are non-negative integers.

**Validates: Requirements 3.5, 7.7**

### Property 9: Keyboard Shortcut Isolation

*For any* keyboard shortcut event, if the event target is an input or textarea element (except for Ctrl+Space), the shortcut should not trigger.

**Validates: Requirements 10.1, 10.2**

### Property 10: Timer Cleanup on Unmount

*For any* timer interval, when the component unmounts or tracking stops, the interval should be cleared to prevent memory leaks.

**Validates: Requirements 8.4, 8.5**

### Property 11: Timezone Handling

*For any* timestamp received from the backend (ISO format with timezone), the displayed time should be converted to the user's local timezone.

**Validates: Requirements 8.6**

### Property 12: localStorage Validation

*For any* data retrieved from localStorage, if the data is corrupted or invalid JSON, the application should handle it gracefully without crashing.

**Validates: Requirements 15.7**

### Property 13: Optimistic UI Update Rollback

*For any* optimistic update (start/stop tracking), if the API call fails, the UI state should revert to the previous state.

**Validates: Requirements 14.7**

### Property 14: Task Selection Persistence

*For any* selected task, if the user navigates away and returns to the page, the same task should remain selected (using sessionStorage).

**Validates: Requirements 4.8**

## Error Handling

### API Error Handling

**Pattern**: All API errors are caught in the service layer and re-thrown with user-friendly messages.

```typescript
// In timeTrackingService.ts
async startTracking(taskId: string, description: string): Promise<ActiveTracking> {
  try {
    const response = await apiClient.post('/api/v1/time-tracking/start', {
      task_id: taskId,
      description,
    });
    return response.data;
  } catch (error) {
    if (isApiError(error)) {
      const message = error.response?.data?.detail || 'Failed to start tracking';
      logger.error('Start tracking failed', {
        taskId,
        status: error.response?.status,
        message,
      });
      throw new Error(message);
    }
    logger.error('Unexpected error starting tracking', { taskId, error });
    throw new Error('An unexpected error occurred');
  }
}
```

### Store Error Handling

**Pattern**: Errors are caught in store actions, set in error state, and displayed to users via notifications.

```typescript
// In useTimeTrackingStore
startTracking: async (taskId: string, description: string) => {
  const { activeTracking, tasks } = get();
  
  // Validation
  if (activeTracking) {
    set({ error: 'You already have an active tracking session' });
    return;
  }
  
  set({ isStarting: true, error: null });
  
  try {
    const result = await timeTrackingService.startTracking(taskId, description);
    set({
      activeTracking: result,
      isStarting: false,
    });
    
    // Persist to localStorage for recovery
    localStorage.setItem('activeTracking', JSON.stringify(result));
    
    // Show success notification
    showNotification('success', 'Time tracking started');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start tracking';
    set({ error: message, isStarting: false });
    showNotification('error', message);
  }
}
```

### Component Error Handling

**Pattern**: Components display error states and provide retry options.

```typescript
// In TimeTrackingPage
{error && (
  <div className="error-banner" role="alert">
    <span className="error-icon">⚠️</span>
    <span className="error-message">{error}</span>
    <button onClick={clearError} className="error-dismiss">
      ✕
    </button>
  </div>
)}
```

### Offline Error Handling

**REMOVED** - Offline functionality not needed for web app

Network errors are handled through standard error handling patterns with retry options.

## Testing Strategy

### Unit Tests

**Focus**: Individual components, utility functions, and store actions

**Tools**: Vitest + React Testing Library

**Coverage Areas**:
1. **Component Rendering**
   - TaskListPanel renders tasks correctly
   - TimerPanel displays timer in correct format
   - TimeEntriesPanel groups entries by date
   - OfflineIndicator shows correct status

2. **User Interactions**
   - Task selection updates selected state
   - Start/stop buttons trigger correct actions
   - Search input filters tasks
   - Load more button fetches additional entries

3. **Utility Functions**
   - `formatDuration(hours)` returns "Xh Ym" format
   - `formatTime(isoString)` returns "HH:MM" format
   - `groupEntriesByDate(entries)` groups correctly
   - `sortTasks(tasks)` sorts by priority rules

4. **Store Actions**
   - `fetchTasks()` updates tasks state
   - `startTracking()` creates active tracking
   - `stopTracking()` clears active tracking
   - `addToQueue()` persists to localStorage

**Example Unit Test**:
```typescript
describe('TaskListPanel', () => {
  it('displays tasks with worked sum formatted correctly', () => {
    const tasks = [
      { id: '1', title: 'Task 1', worked_sum: 2.5, /* ... */ },
      { id: '2', title: 'Task 2', worked_sum: 0, /* ... */ },
    ];
    
    render(<TaskListPanel tasks={tasks} onTaskSelect={vi.fn()} />);
    
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
    expect(screen.getByText('0h 0m')).toBeInTheDocument();
  });
  
  it('filters tasks by search query', () => {
    const tasks = [
      { id: '1', title: 'Authentication', /* ... */ },
      { id: '2', title: 'Database', /* ... */ },
    ];
    
    render(<TaskListPanel tasks={tasks} onTaskSelect={vi.fn()} />);
    
    const searchInput = screen.getByPlaceholderText('Search tasks...');
    fireEvent.change(searchInput, { target: { value: 'auth' } });
    
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.queryByText('Database')).not.toBeInTheDocument();
  });
});
```

### Property-Based Tests

**Focus**: Universal properties that should hold for all inputs

**Tools**: fast-check (JavaScript property-based testing library)

**Configuration**: Minimum 100 iterations per test

**Test Examples**:

```typescript
import fc from 'fast-check';

describe('Time Tracking Properties', () => {
  it('Property 1: Task sorting maintains priority order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          title: fc.string(),
          user_is_tracking: fc.boolean(),
          scheduled_start: fc.option(fc.date().map(d => d.toISOString())),
        })),
        (tasks) => {
          const sorted = sortTasks(tasks);
          
          // Find indices of first task in each category
          const firstTracking = sorted.findIndex(t => t.user_is_tracking);
          const firstScheduled = sorted.findIndex(t => !t.user_is_tracking && t.scheduled_start);
          const firstOther = sorted.findIndex(t => !t.user_is_tracking && !t.scheduled_start);
          
          // Verify order: tracking < scheduled < other
          if (firstTracking !== -1 && firstScheduled !== -1) {
            expect(firstTracking).toBeLessThan(firstScheduled);
          }
          if (firstScheduled !== -1 && firstOther !== -1) {
            expect(firstScheduled).toBeLessThan(firstOther);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 2: Timer elapsed time is accurate', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date() }),
        (startTime) => {
          const now = Date.now();
          const elapsed = calculateElapsedTime(startTime.toISOString(), now);
          const expected = now - startTime.getTime();
          
          // Allow 1 second tolerance
          expect(Math.abs(elapsed - expected)).toBeLessThanOrEqual(1000);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 5: Description validation prevents overflow', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 1000 }),
        (description) => {
          const result = validateDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('500 characters');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 6: Search filter correctness', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          title: fc.string(),
          description: fc.string(),
        })),
        fc.string(),
        (tasks, query) => {
          const filtered = filterTasks(tasks, query);
          
          // All filtered tasks should match the query
          filtered.forEach(task => {
            const matchesTitle = task.title.toLowerCase().includes(query.toLowerCase());
            const matchesDesc = task.description.toLowerCase().includes(query.toLowerCase());
            expect(matchesTitle || matchesDesc).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 8: Worked sum format validation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000 }),
        (hours) => {
          const formatted = formatWorkedSum(hours);
          
          // Should match pattern "Xh Ym"
          expect(formatted).toMatch(/^\d+h \d+m$/);
          
          // Parse back and verify
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          if (match) {
            const h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const reconstructed = h + m / 60;
            
            // Should be close to original (within 1 minute)
            expect(Math.abs(reconstructed - hours)).toBeLessThanOrEqual(1/60);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Tags**:
Each property test includes a comment tag:
```typescript
// Feature: web-time-tracking, Property 1: Task sorting maintains priority order
```

### Integration Tests

**Focus**: End-to-end flows and component interactions

**Tools**: Vitest + React Testing Library + MSW (Mock Service Worker)

**Test Scenarios**:

1. **Complete Tracking Flow**
   - User selects task
   - User starts tracking
   - Timer updates in real-time
   - User adds description
   - User stops tracking
   - Entry appears in history

2. **Error Recovery Flow**
   - API returns error
   - Error message displays
   - User clicks retry
   - Operation succeeds

3. **Search and Filter Flow**
   - User types in search
   - Task list filters
   - User clears search
   - All tasks reappear

4. **Error Recovery Flow**
   - API returns error
   - Error message displays
   - User clicks retry
   - Operation succeeds

**Example Integration Test**:
```typescript
describe('Time Tracking Integration', () => {
  it('completes full tracking cycle', async () => {
    // Mock API responses
    server.use(
      rest.get('/api/v1/time-tracking/tasks', (req, res, ctx) => {
        return res(ctx.json({ tasks: mockTasks }));
      }),
      rest.post('/api/v1/time-tracking/start', (req, res, ctx) => {
        return res(ctx.json({ id: '123', task_id: '1', start_time: new Date().toISOString() }));
      }),
      rest.post('/api/v1/time-tracking/stop', (req, res, ctx) => {
        return res(ctx.json({ success: true }));
      })
    );
    
    render(<TimeTrackingPage />);
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    // Select task
    fireEvent.click(screen.getByText('Task 1'));
    
    // Start tracking
    fireEvent.click(screen.getByText('Start Tracking'));
    
    // Verify timer appears
    await waitFor(() => {
      expect(screen.getByText(/00:00:\d{2}/)).toBeInTheDocument();
    });
    
    // Add description
    const descInput = screen.getByPlaceholderText('What are you working on?');
    fireEvent.change(descInput, { target: { value: 'Implementing feature' } });
    
    // Stop tracking
    fireEvent.click(screen.getByText('Stop Tracking'));
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Time tracking stopped')).toBeInTheDocument();
    });
  });
});
```

### Test Coverage Goals

- **Overall Coverage**: Minimum 80%
- **Critical Paths**: 100% coverage
  - Start/stop tracking flow
  - Offline queue management
  - Timer calculation
  - Task sorting
- **Property Tests**: All 15 correctness properties
- **Integration Tests**: All major user flows

### Testing Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run property tests only
npm test -- --grep "Property"

# Run integration tests only
npm test -- src/test/integration/

# Run in watch mode (development)
npm test -- --watch

# Run with minimal output (CI/CD)
npm test -- --silent --run
```

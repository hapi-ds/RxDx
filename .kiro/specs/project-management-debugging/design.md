# Design Document: Schedule Page Debugging

## Overview

This design document provides a comprehensive debugging and verification approach for the Schedule page implementation from Phase 24 of the RxDx project. The Schedule page is already implemented but requires systematic verification to ensure it meets all requirements and works correctly with the backend API.

**Current State:**
- Schedule page exists at `frontend/src/pages/SchedulePage.tsx` (1034 lines)
- Schedule service exists at `frontend/src/services/scheduleService.ts`
- Backend workitems endpoint exists at `backend/app/api/v1/workitems.py`
- Page includes loading states, error handling, pagination, and statistics
- Several components are placeholders (Gantt chart, task forms, etc.)

**Goal:**
Systematically verify and debug the Schedule page to ensure it:
1. Correctly loads task data from the backend
2. Displays data without errors
3. Handles edge cases gracefully
4. Follows RxDx coding standards
5. Is production-ready

## Architecture

### Component Hierarchy

```
SchedulePage
├── Statistics Dashboard (displays task metrics)
├── Filters Section (status, assigned_to filters)
├── Task List (table view with pagination)
├── Detail View (placeholder - task details)
├── Create Form (placeholder - new task)
├── Edit Form (placeholder - edit task)
├── Gantt View (placeholder - timeline visualization)
└── Calculate Result (schedule calculation results)
```

### Data Flow

```
User Action → SchedulePage → scheduleService → API Client → Backend
                    ↓
              State Updates
                    ↓
              UI Re-render
```

**Key Data Flows:**
1. **Initial Load**: Page loads → `loadTasks()` + `loadStatistics()` → API calls → State updates → Render
2. **Filter Change**: User changes filter → `handleFilterChange()` → `useEffect` triggers → `loadTasks()` → Render
3. **Pagination**: User clicks page → `handlePageChange()` → Filter update → `loadTasks()` → Render
4. **Statistics**: `loadStatistics()` → `getTasks()` with size=1000 → Calculate metrics → Update state

### API Integration

**Current Implementation:**
- `scheduleService.getTasks()` calls `/api/v1/workitems?type=task`
- Backend endpoint returns `list[WorkItemResponse]`
- Frontend constructs pagination metadata from response

**Issue Identified:**
The backend `/workitems` endpoint does NOT return pagination metadata (total count, pages). The frontend service attempts to construct this from the response, but this is incorrect.

## Components and Interfaces

### SchedulePage Component

**State Management:**
```typescript
// View state
viewMode: 'list' | 'detail' | 'create' | 'edit' | 'gantt' | 'calculate'
selectedTaskId: string | null

// Data state
tasks: Task[]
statistics: ScheduleStatistics | null
scheduleResult: ScheduleResult | null

// UI state
isLoading: boolean
isCalculating: boolean
error: string | null

// Delete confirmation
showDeleteConfirm: boolean
taskToDelete: Task | null
isDeleting: boolean

// Filters and pagination
filters: ScheduleFilters
totalTasks: number
totalPages: number
```

**Key Methods:**
- `loadTasks()`: Fetches tasks with current filters
- `loadStatistics()`: Calculates statistics from all tasks
- `handleCalculateSchedule()`: Triggers schedule calculation
- `handleTaskClick()`: Navigates to task detail view
- `handleCreateClick()`: Navigates to create form
- `handleEditClick()`: Navigates to edit form
- `handleDeleteClick()`: Shows delete confirmation
- `handleFilterChange()`: Updates filters and reloads
- `handlePageChange()`: Changes page and reloads

### ScheduleService

**Interface:**
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  estimated_hours: number;
  start_date?: string;
  end_date?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority?: number;
  assigned_to?: string;
  dependencies?: string[];
  required_resources?: string[];
  resource_demand?: Record<string, number>;
}

interface ScheduleFilters {
  project_id?: string;
  status?: Task['status'];
  assigned_to?: string;
  page?: number;
  size?: number;
}

interface ScheduleStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  total_estimated_hours: number;
  completion_percentage: number;
  critical_path_tasks?: string[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

**Key Methods:**
- `getTasks(filters?)`: Fetches tasks with pagination
- `getTask(taskId)`: Fetches single task (NOT IMPLEMENTED - calls non-existent endpoint)
- `createTask(task)`: Creates new task (NOT IMPLEMENTED - calls non-existent endpoint)
- `updateTask(taskId, updates)`: Updates task (NOT IMPLEMENTED - calls non-existent endpoint)
- `deleteTask(taskId)`: Deletes task (NOT IMPLEMENTED - calls non-existent endpoint)
- `getStatistics()`: Calculates statistics from tasks
- `calculateSchedule(projectId, constraints)`: Triggers schedule calculation (NOT IMPLEMENTED - calls non-existent endpoint)

### Backend WorkItems Endpoint

**Endpoint:** `GET /api/v1/workitems`

**Query Parameters:**
- `search`: Text search in title and description
- `type`: Filter by WorkItem type (requirement, task, test, risk, document)
- `status`: Filter by status (draft, active, completed, archived)
- `assigned_to`: UUID of assigned user
- `created_by`: UUID of creator
- `priority`: Priority level (1-5)
- `limit`: Maximum number of results (default: 100, max: 1000)
- `offset`: Number of results to skip (default: 0)

**Response:** `list[WorkItemResponse]`

**Note:** The endpoint does NOT return pagination metadata. It only returns the array of items.

## Data Models

### Task Model (Frontend)

```typescript
interface Task {
  id: string;                    // UUID
  title: string;                 // Required
  description?: string;          // Optional
  estimated_hours: number;       // Required for scheduling
  start_date?: string;           // ISO date string
  end_date?: string;             // ISO date string
  status: TaskStatus;            // Enum
  priority?: number;             // 1-5
  assigned_to?: string;          // User ID
  dependencies?: string[];       // Task IDs
  required_resources?: string[]; // Resource IDs
  resource_demand?: Record<string, number>; // Resource requirements
}

type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
```

### WorkItemResponse Model (Backend)

```python
class WorkItemResponse(BaseModel):
    id: UUID
    type: str  # "task", "requirement", "test", "risk", "document"
    title: str
    description: str | None
    status: str  # "draft", "active", "completed", "archived"
    priority: int | None
    assigned_to: UUID | None
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool
    
    # Task-specific fields
    estimated_hours: float | None
    start_date: datetime | None
    end_date: datetime | None
    dependencies: list[UUID] | None
    required_resources: list[str] | None
    resource_demand: dict[str, float] | None
```

### Status Mapping Issue

**Frontend expects:** `'not_started' | 'in_progress' | 'completed' | 'blocked'`
**Backend returns:** `'draft' | 'active' | 'completed' | 'archived'`

**This is a mismatch that needs to be addressed.**

## Debugging Approach

### Phase 1: API Connection Verification

**Objective:** Verify the Schedule page correctly calls the backend API and receives data.

**Steps:**
1. Open browser DevTools Network tab
2. Navigate to Schedule page
3. Verify API call to `/api/v1/workitems?type=task&limit=20&offset=0`
4. Check response status (should be 200)
5. Inspect response body (should be array of WorkItem objects)
6. Verify no console errors

**Expected Issues:**
- Status field mismatch (frontend expects 'not_started', backend returns 'draft')
- Pagination metadata missing (backend doesn't return total count)
- Task-specific fields may be null for some workitems

### Phase 2: Data Display Verification

**Objective:** Verify tasks display correctly in the UI.

**Steps:**
1. Check if tasks appear in the table
2. Verify task titles are displayed
3. Verify status badges show correct colors
4. Verify dates format correctly
5. Verify missing fields show "-" or are handled gracefully
6. Check if at least 3 tasks from medical-device template appear

**Expected Issues:**
- Status badge may show incorrect status due to mapping issue
- Dates may not format correctly if null
- Priority may show "undefined" if null

### Phase 3: Statistics Verification

**Objective:** Verify statistics calculate correctly.

**Steps:**
1. Check if statistics dashboard displays
2. Verify total task count matches number of tasks
3. Verify completed/in-progress/blocked counts
4. Verify completion percentage calculation
5. Check if statistics update when filters change

**Expected Issues:**
- Status counts may be incorrect due to status mapping issue
- Statistics may not update when filters change (they shouldn't - they show all tasks)

### Phase 4: Pagination Verification

**Objective:** Verify pagination works correctly.

**Steps:**
1. Check if pagination controls appear
2. Verify "Previous" button is disabled on page 1
3. Click "Next" button and verify new data loads
4. Verify page number updates
5. Verify "Next" button disables on last page

**Expected Issues:**
- Total pages calculation is incorrect (backend doesn't return total count)
- Pagination may not work correctly due to missing metadata

### Phase 5: Filter Verification

**Objective:** Verify filters work correctly.

**Steps:**
1. Select a status filter
2. Verify API call includes status parameter
3. Verify filtered results display
4. Clear filter and verify all tasks return
5. Test assigned_to filter

**Expected Issues:**
- Status filter may not work due to status mapping issue
- Filters may not reset page to 1

### Phase 6: Error Handling Verification

**Objective:** Verify error states display correctly.

**Steps:**
1. Simulate network error (disconnect network)
2. Verify error message displays
3. Verify retry button appears
4. Click retry and verify it attempts to reload
5. Simulate 404 error (invalid endpoint)
6. Verify appropriate error message

**Expected Issues:**
- Error messages may be too generic
- Retry may not work correctly

### Phase 7: Loading States Verification

**Objective:** Verify loading indicators work correctly.

**Steps:**
1. Throttle network to slow 3G
2. Navigate to Schedule page
3. Verify loading indicator appears
4. Wait for data to load
5. Verify loading indicator disappears
6. Verify data displays

**Expected Issues:**
- Loading indicator may not show
- Loading indicator may not hide after error

### Phase 8: Console Error Verification

**Objective:** Verify no console errors occur.

**Steps:**
1. Open browser console
2. Clear console
3. Navigate to Schedule page
4. Interact with page (filters, pagination, etc.)
5. Verify no errors in console
6. Check for warnings

**Expected Issues:**
- Type errors due to status mismatch
- Null reference errors for missing fields
- React warnings for missing keys or props

## Issues Identified

### Critical Issues

#### 1. Status Field Mismatch

**Problem:** Frontend expects task status values that don't match backend values.

**Frontend:** `'not_started' | 'in_progress' | 'completed' | 'blocked'`
**Backend:** `'draft' | 'active' | 'completed' | 'archived'`

**Impact:**
- Status filter won't work correctly
- Status badges may show wrong colors
- Statistics calculations may be incorrect

**Solution:**
Create a status mapping function in the service layer:

```typescript
function mapBackendStatus(backendStatus: string): Task['status'] {
  const statusMap: Record<string, Task['status']> = {
    'draft': 'not_started',
    'active': 'in_progress',
    'completed': 'completed',
    'archived': 'completed',
  };
  return statusMap[backendStatus] || 'not_started';
}

function mapFrontendStatus(frontendStatus: Task['status']): string {
  const statusMap: Record<Task['status'], string> = {
    'not_started': 'draft',
    'in_progress': 'active',
    'completed': 'completed',
    'blocked': 'active', // Map blocked to active for now
  };
  return statusMap[frontendStatus];
}
```

#### 2. Missing Pagination Metadata

**Problem:** Backend `/workitems` endpoint doesn't return pagination metadata (total count, total pages).

**Current Implementation:**
```typescript
return {
  items,
  total: items.length, // WRONG - this is count of returned items, not total
  page: filters?.page || 1,
  size: filters?.size || 20,
  pages: Math.ceil(items.length / (filters?.size || 20)), // WRONG
};
```

**Impact:**
- Pagination controls show incorrect information
- "Next" button may not disable correctly
- Total count is wrong

**Solution:**
Since backend doesn't provide total count, we have two options:

**Option A:** Remove pagination (show all tasks)
```typescript
async getTasks(filters?: ScheduleFilters): Promise<PaginatedResponse<Task>> {
  const params = new URLSearchParams();
  params.append('type', 'task');
  params.append('limit', '1000'); // Get all tasks
  
  if (filters?.status) {
    params.append('status', mapFrontendStatus(filters.status));
  }
  if (filters?.assigned_to) {
    params.append('assigned_to', filters.assigned_to);
  }

  const response = await apiClient.get<WorkItemResponse[]>(`/workitems?${params.toString()}`);
  const items = response.data.map(mapWorkItemToTask);
  
  return {
    items,
    total: items.length,
    page: 1,
    size: items.length,
    pages: 1,
  };
}
```

**Option B:** Implement client-side pagination
```typescript
async getTasks(filters?: ScheduleFilters): Promise<PaginatedResponse<Task>> {
  // Fetch all tasks
  const params = new URLSearchParams();
  params.append('type', 'task');
  params.append('limit', '1000');
  
  if (filters?.status) {
    params.append('status', mapFrontendStatus(filters.status));
  }
  if (filters?.assigned_to) {
    params.append('assigned_to', filters.assigned_to);
  }

  const response = await apiClient.get<WorkItemResponse[]>(`/workitems?${params.toString()}`);
  const allItems = response.data.map(mapWorkItemToTask);
  
  // Apply client-side pagination
  const page = filters?.page || 1;
  const size = filters?.size || 20;
  const start = (page - 1) * size;
  const end = start + size;
  const items = allItems.slice(start, end);
  
  return {
    items,
    total: allItems.length,
    page,
    size,
    pages: Math.ceil(allItems.length / size),
  };
}
```

**Recommendation:** Use Option B (client-side pagination) for now, since the number of tasks is likely small.

#### 3. Non-Existent Endpoints

**Problem:** Several service methods call endpoints that don't exist:

- `getTask(taskId)` → `/schedule/tasks/${taskId}` (doesn't exist)
- `createTask(task)` → `/schedule/tasks` (doesn't exist)
- `updateTask(taskId, updates)` → `/schedule/tasks/${taskId}` (doesn't exist)
- `deleteTask(taskId)` → `/schedule/tasks/${taskId}` (doesn't exist)
- `calculateSchedule(...)` → `/schedule/calculate` (doesn't exist)
- `getSchedule(projectId)` → `/schedule/${projectId}` (doesn't exist)
- `getGanttData(projectId)` → `/schedule/${projectId}/gantt` (doesn't exist)

**Impact:**
- These methods will fail with 404 errors
- Features that use these methods won't work

**Solution:**
Update service methods to use correct endpoints:

```typescript
// Use workitems endpoints instead
async getTask(taskId: string): Promise<Task> {
  const response = await apiClient.get<WorkItemResponse>(`/workitems/${taskId}`);
  return mapWorkItemToTask(response.data);
}

async createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const workitemData: WorkItemCreate = {
    type: 'task',
    title: task.title,
    description: task.description,
    status: mapFrontendStatus(task.status),
    priority: task.priority,
    assigned_to: task.assigned_to,
    estimated_hours: task.estimated_hours,
    start_date: task.start_date,
    end_date: task.end_date,
    dependencies: task.dependencies,
    required_resources: task.required_resources,
    resource_demand: task.resource_demand,
  };
  const response = await apiClient.post<WorkItemResponse>('/workitems', workitemData);
  return mapWorkItemToTask(response.data);
}

async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const workitemUpdates: WorkItemUpdate = {
    title: updates.title,
    description: updates.description,
    status: updates.status ? mapFrontendStatus(updates.status) : undefined,
    priority: updates.priority,
    assigned_to: updates.assigned_to,
    estimated_hours: updates.estimated_hours,
    start_date: updates.start_date,
    end_date: updates.end_date,
    dependencies: updates.dependencies,
    required_resources: updates.required_resources,
    resource_demand: updates.resource_demand,
  };
  const response = await apiClient.patch<WorkItemResponse>(
    `/workitems/${taskId}?change_description=Task updated`,
    workitemUpdates
  );
  return mapWorkItemToTask(response.data);
}

async deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/workitems/${taskId}`);
}
```

**Note:** Schedule calculation endpoints don't exist yet. These features should be marked as "coming soon" or removed until backend implementation is complete.

### Minor Issues

#### 4. Type Mismatches

**Problem:** Backend returns `WorkItemResponse` but frontend expects `Task`.

**Fields that may not match:**
- `assigned_to`: Backend returns `UUID | None`, frontend expects `string | undefined`
- `dependencies`: Backend returns `list[UUID] | None`, frontend expects `string[] | undefined`
- `estimated_hours`: Backend returns `float | None`, frontend expects `number`

**Solution:**
Create a mapping function:

```typescript
function mapWorkItemToTask(workitem: WorkItemResponse): Task {
  return {
    id: workitem.id,
    title: workitem.title,
    description: workitem.description || undefined,
    estimated_hours: workitem.estimated_hours || 0,
    start_date: workitem.start_date || undefined,
    end_date: workitem.end_date || undefined,
    status: mapBackendStatus(workitem.status),
    priority: workitem.priority || undefined,
    assigned_to: workitem.assigned_to || undefined,
    dependencies: workitem.dependencies?.map(String) || undefined,
    required_resources: workitem.required_resources || undefined,
    resource_demand: workitem.resource_demand || undefined,
  };
}
```

#### 5. Statistics Calculation Issue

**Problem:** `getStatistics()` fetches all tasks with `size: 1000`, which may not get all tasks if there are more than 1000.

**Solution:**
Either:
- Increase limit to backend maximum (1000)
- Make multiple requests if needed
- Add a dedicated statistics endpoint in backend

For now, using `limit: 1000` is acceptable since we're unlikely to have more than 1000 tasks.

#### 6. Missing Error Context

**Problem:** Error messages are generic ("Failed to load tasks") without details.

**Solution:**
Improve error handling to include more context:

```typescript
const loadTasks = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await scheduleService.getTasks(filters);
    setTasks(response.items || []);
    setTotalTasks(response.total || 0);
    setTotalPages(response.pages || 0);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(`Failed to load tasks: ${errorMessage}`);
    setTasks([]);
    console.error('Error loading tasks:', err);
  } finally {
    setIsLoading(false);
  }
}, [filters]);
```

## Correctness Properties

Before writing the correctness properties, I need to analyze the acceptance criteria to determine which are testable as properties, examples, or edge cases.


### Property Reflection

After analyzing the acceptance criteria, I've identified several areas where properties can be combined or simplified:

**Statistics Calculations (2.2-2.4):**
- Properties 2.2, 2.3, and 2.4 all test counting tasks by status
- These can be combined into a single property: "For any array of tasks, counting by status should return correct counts"

**Task Display (3.1-3.5):**
- Properties 3.1-3.5 all test that task fields are displayed
- These can be combined into a single property: "For any task, all fields should be rendered in the output"

**Pagination Button States (4.3-4.4):**
- Properties 4.3 and 4.4 both test button disabled states
- These can be combined into a single property: "For any pagination state, buttons should be disabled appropriately"

**Component Rendering (7.1-7.7):**
- Properties 7.1-7.7 all test that placeholder components render without errors
- These can be combined into a single property: "For any view mode, the page should render without errors"

**Redundant Properties:**
- 2.5 is covered by 2.2-2.4 (status field is implicit)
- 2.6 is a React integration test, not a unit test property
- 5.2 is redundant with 5.1
- 8.1-8.5 are manual testing criteria, not unit test properties

### Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

#### Property 1: Status Mapping Consistency

*For any* backend status value, mapping to frontend status and back should preserve the semantic meaning (draft→not_started→draft, active→in_progress→active, completed→completed→completed).

**Validates: Requirements 1.1, 1.2**

**Rationale:** The status field mismatch between backend and frontend is a critical issue. This property ensures the mapping functions are bidirectional and consistent.

#### Property 2: Task Data Rendering

*For any* valid task object, rendering the task in the UI should display all non-null fields without throwing errors.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

**Rationale:** Tasks have many optional fields. This property ensures the UI handles all combinations of present/absent fields gracefully.

#### Property 3: Statistics Calculation Accuracy

*For any* array of tasks, the calculated statistics should match the actual counts: total_tasks equals array length, completed_tasks equals count of tasks with status='completed', in_progress_tasks equals count with status='in_progress', and blocked_tasks equals count with status='blocked'.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

**Rationale:** Statistics are calculated client-side from task data. This property ensures the calculations are always correct regardless of the input data.

#### Property 4: Pagination State Correctness

*For any* pagination state (current page, total pages), the "Previous" button should be disabled when page=1, and the "Next" button should be disabled when page=totalPages.

**Validates: Requirements 4.3, 4.4**

**Rationale:** Pagination controls must reflect the current state correctly to prevent invalid navigation.

#### Property 5: Pagination Info Display

*For any* pagination state, the displayed pagination info should show the current page number, total pages, and total item count.

**Validates: Requirements 4.5**

**Rationale:** Users need to know where they are in the paginated data.

#### Property 6: Error Message Presence

*For any* error state, the UI should display an error message and a retry button.

**Validates: Requirements 6.1, 6.5**

**Rationale:** Error states must always provide feedback and recovery options to users.

#### Property 7: Empty Data Handling

*For any* component, rendering with empty data (empty array, null values) should not throw errors and should display appropriate empty states.

**Validates: Requirements 7.8**

**Rationale:** Components must handle edge cases gracefully without crashing.

#### Property 8: API Call Parameters

*For any* filter state, the API call should include the correct query parameters (type=task, status, assigned_to, limit, offset).

**Validates: Requirements 1.1, 4.1, 4.2**

**Rationale:** The service layer must correctly translate filter state into API parameters.

## Error Handling

### Error Categories

#### 1. Network Errors

**Scenarios:**
- No internet connection
- DNS resolution failure
- Connection timeout
- Connection refused

**Handling:**
```typescript
try {
  const response = await apiClient.get('/workitems');
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      // Network error (no response received)
      throw new Error('Network error: Please check your internet connection');
    }
  }
  throw error;
}
```

**UI Display:**
- Show error message: "Unable to connect. Please check your internet connection."
- Show retry button
- Log error to console for debugging

#### 2. HTTP Errors

**Scenarios:**
- 400 Bad Request (invalid parameters)
- 401 Unauthorized (not authenticated)
- 403 Forbidden (insufficient permissions)
- 404 Not Found (resource doesn't exist)
- 500 Internal Server Error (backend error)
- 503 Service Unavailable (backend down)

**Handling:**
```typescript
try {
  const response = await apiClient.get('/workitems');
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail || error.message;
    
    switch (status) {
      case 400:
        throw new Error(`Invalid request: ${detail}`);
      case 401:
        throw new Error('Authentication required. Please log in.');
      case 403:
        throw new Error('You do not have permission to view tasks.');
      case 404:
        throw new Error('Tasks not found.');
      case 500:
        throw new Error('Server error. Please try again later.');
      case 503:
        throw new Error('Service temporarily unavailable. Please try again later.');
      default:
        throw new Error(`Error ${status}: ${detail}`);
    }
  }
  throw error;
}
```

**UI Display:**
- Show specific error message based on status code
- Show retry button (except for 401/403 which should redirect to login)
- Log error details to console

#### 3. Data Validation Errors

**Scenarios:**
- Backend returns data in unexpected format
- Required fields are missing
- Data types don't match expectations

**Handling:**
```typescript
function validateTask(data: any): Task {
  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Invalid task: missing or invalid id');
  }
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Invalid task: missing or invalid title');
  }
  if (typeof data.estimated_hours !== 'number') {
    throw new Error('Invalid task: missing or invalid estimated_hours');
  }
  
  return {
    id: data.id,
    title: data.title,
    description: data.description || undefined,
    estimated_hours: data.estimated_hours,
    start_date: data.start_date || undefined,
    end_date: data.end_date || undefined,
    status: mapBackendStatus(data.status),
    priority: data.priority || undefined,
    assigned_to: data.assigned_to || undefined,
    dependencies: data.dependencies || undefined,
    required_resources: data.required_resources || undefined,
    resource_demand: data.resource_demand || undefined,
  };
}
```

**UI Display:**
- Show error message: "Invalid data received from server"
- Show retry button
- Log validation error details to console

#### 4. Component Errors

**Scenarios:**
- React component throws error during render
- Event handler throws error
- State update causes error

**Handling:**
```typescript
// Use Error Boundary component (already exists in RxDx)
<PageErrorBoundary>
  <SchedulePage />
</PageErrorBoundary>
```

**UI Display:**
- Error boundary catches error and displays fallback UI
- Show error message with details
- Provide button to reload page
- Log error to console and error tracking service

### Error Recovery

#### Retry Strategy

**Automatic Retry:**
- Not implemented (could be added for transient errors)

**Manual Retry:**
- User clicks "Retry" button
- Clears error state
- Re-attempts the failed operation
- Shows loading indicator during retry

**Implementation:**
```typescript
const handleRetry = useCallback(() => {
  setError(null);
  loadTasks();
}, [loadTasks]);

// In error UI
{error && (
  <div className="error-state" role="alert">
    <p>{error}</p>
    <Button variant="secondary" onClick={handleRetry}>
      Retry
    </Button>
  </div>
)}
```

#### Graceful Degradation

**When API fails:**
- Show error message
- Keep previous data visible (if any)
- Disable actions that require API
- Allow user to retry

**When component fails:**
- Error boundary catches error
- Show fallback UI
- Provide way to recover (reload page)

### Logging Standards

Following RxDx coding standards, all errors should be logged:

**Frontend Logging:**
```typescript
// Current: Use console.error (acceptable until logger service exists)
console.error('Failed to load tasks:', error);

// Future: Use centralized logger service
logger.error('Failed to load tasks', {
  error: error.message,
  filters: filters,
  timestamp: new Date().toISOString(),
});
```

**Backend Logging:**
```python
# Already implemented in workitems endpoint
logger.error(
    "Error retrieving WorkItems",
    error=str(e),
    user_id=str(current_user.id)
)
```

## Testing Strategy

### Dual Testing Approach

The testing strategy follows RxDx standards with both unit tests and property-based tests:

**Unit Tests:**
- Test specific examples and edge cases
- Test error conditions
- Test component integration
- Test user interactions

**Property-Based Tests:**
- Test universal properties across all inputs
- Test data transformations
- Test calculations
- Test state management

### Unit Testing

#### Service Layer Tests

**File:** `frontend/src/services/scheduleService.test.ts`

**Test Cases:**
1. `getTasks()` calls correct endpoint with correct parameters
2. `getTasks()` maps backend status to frontend status
3. `getTasks()` handles empty response
4. `getTasks()` handles API errors
5. `getStatistics()` calculates correct counts
6. `getStatistics()` handles empty task list
7. Status mapping functions are bidirectional
8. WorkItem to Task mapping handles all fields
9. WorkItem to Task mapping handles missing optional fields

**Example:**
```typescript
describe('scheduleService', () => {
  describe('getTasks', () => {
    it('should call /workitems endpoint with type=task', async () => {
      const mockGet = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: [],
      });

      await scheduleService.getTasks();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/workitems?type=task')
      );
    });

    it('should map backend status to frontend status', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: [
          {
            id: '123',
            type: 'task',
            title: 'Test Task',
            status: 'draft', // Backend status
            estimated_hours: 8,
            version: '1.0',
            created_by: '456',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
          },
        ],
      });

      const result = await scheduleService.getTasks();

      expect(result.items[0].status).toBe('not_started'); // Frontend status
    });
  });

  describe('getStatistics', () => {
    it('should calculate correct task counts', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: [
          { id: '1', status: 'draft', estimated_hours: 8, /* ... */ },
          { id: '2', status: 'active', estimated_hours: 4, /* ... */ },
          { id: '3', status: 'completed', estimated_hours: 2, /* ... */ },
        ],
      });

      const stats = await scheduleService.getStatistics();

      expect(stats.total_tasks).toBe(3);
      expect(stats.completed_tasks).toBe(1);
      expect(stats.in_progress_tasks).toBe(1);
      expect(stats.total_estimated_hours).toBe(14);
    });
  });
});
```

#### Component Tests

**File:** `frontend/src/pages/SchedulePage.test.tsx`

**Test Cases:**
1. Renders loading state initially
2. Renders task list after loading
3. Renders empty state when no tasks
4. Renders error state on API failure
5. Retry button calls loadTasks again
6. Filter changes trigger API call
7. Pagination controls work correctly
8. Previous button disabled on first page
9. Next button disabled on last page
10. Task click navigates to detail view
11. Create button navigates to create form
12. Statistics display correct values
13. Status badges show correct colors
14. Missing fields show "-" or are hidden

**Example:**
```typescript
describe('SchedulePage', () => {
  it('should display loading state initially', () => {
    vi.spyOn(scheduleService, 'getTasks').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SchedulePage />);

    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
  });

  it('should display tasks after loading', async () => {
    vi.spyOn(scheduleService, 'getTasks').mockResolvedValue({
      items: [
        {
          id: '1',
          title: 'Test Task',
          status: 'not_started',
          estimated_hours: 8,
        },
      ],
      total: 1,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  it('should display error state on API failure', async () => {
    vi.spyOn(scheduleService, 'getTasks').mockRejectedValue(
      new Error('Network error')
    );

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('should disable previous button on first page', async () => {
    vi.spyOn(scheduleService, 'getTasks').mockResolvedValue({
      items: [],
      total: 100,
      page: 1,
      size: 20,
      pages: 5,
    });

    render(<SchedulePage />);

    await waitFor(() => {
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });
  });
});
```

### Property-Based Testing

Property-based tests use a PBT library (e.g., fast-check for TypeScript) to generate random inputs and verify properties hold for all inputs.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tests reference design document properties

#### Property Test Examples

**File:** `frontend/src/services/scheduleService.properties.test.ts`

**Property 1: Status Mapping Consistency**
```typescript
import fc from 'fast-check';

describe('Property Tests: scheduleService', () => {
  /**
   * Feature: project-management-debugging, Property 1
   * For any backend status value, mapping to frontend status and back
   * should preserve the semantic meaning
   */
  it('status mapping should be consistent', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('draft', 'active', 'completed', 'archived'),
        (backendStatus) => {
          const frontendStatus = mapBackendStatus(backendStatus);
          const backToBackend = mapFrontendStatus(frontendStatus);
          
          // Verify semantic consistency
          if (backendStatus === 'draft') {
            expect(frontendStatus).toBe('not_started');
            expect(backToBackend).toBe('draft');
          } else if (backendStatus === 'active') {
            expect(frontendStatus).toBe('in_progress');
            expect(backToBackend).toBe('active');
          } else if (backendStatus === 'completed') {
            expect(frontendStatus).toBe('completed');
            expect(backToBackend).toBe('completed');
          } else if (backendStatus === 'archived') {
            expect(frontendStatus).toBe('completed');
            // archived maps to completed, which maps back to completed
            expect(backToBackend).toBe('completed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: project-management-debugging, Property 3
   * For any array of tasks, the calculated statistics should match
   * the actual counts
   */
  it('statistics calculation should be accurate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1 }),
            status: fc.constantFrom('not_started', 'in_progress', 'completed', 'blocked'),
            estimated_hours: fc.nat({ max: 100 }),
          })
        ),
        (tasks) => {
          const stats = calculateStatistics(tasks);
          
          expect(stats.total_tasks).toBe(tasks.length);
          expect(stats.completed_tasks).toBe(
            tasks.filter(t => t.status === 'completed').length
          );
          expect(stats.in_progress_tasks).toBe(
            tasks.filter(t => t.status === 'in_progress').length
          );
          expect(stats.blocked_tasks).toBe(
            tasks.filter(t => t.status === 'blocked').length
          );
          expect(stats.total_estimated_hours).toBe(
            tasks.reduce((sum, t) => sum + t.estimated_hours, 0)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: project-management-debugging, Property 7
   * For any component, rendering with empty data should not throw errors
   */
  it('should handle empty data gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom([], null, undefined),
        (emptyData) => {
          expect(() => {
            const result = mapWorkItemsToTasks(emptyData);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**File:** `frontend/src/pages/SchedulePage.properties.test.tsx`

**Property 2: Task Data Rendering**
```typescript
import fc from 'fast-check';
import { render } from '@testing-library/react';

describe('Property Tests: SchedulePage', () => {
  /**
   * Feature: project-management-debugging, Property 2
   * For any valid task object, rendering the task in the UI should
   * display all non-null fields without throwing errors
   */
  it('should render any valid task without errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.option(fc.string()),
          estimated_hours: fc.nat({ max: 1000 }),
          start_date: fc.option(fc.date().map(d => d.toISOString())),
          end_date: fc.option(fc.date().map(d => d.toISOString())),
          status: fc.constantFrom('not_started', 'in_progress', 'completed', 'blocked'),
          priority: fc.option(fc.integer({ min: 1, max: 5 })),
          assigned_to: fc.option(fc.uuid()),
        }),
        (task) => {
          vi.spyOn(scheduleService, 'getTasks').mockResolvedValue({
            items: [task],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
          });

          expect(() => {
            const { container } = render(<SchedulePage />);
            
            // Verify task title is rendered
            expect(container.textContent).toContain(task.title);
            
            // Verify status is rendered
            expect(container.textContent).toContain(
              getStatusLabel(task.status)
            );
            
            // Verify no errors thrown
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: project-management-debugging, Property 4
   * For any pagination state, buttons should be disabled appropriately
   */
  it('pagination buttons should have correct disabled state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // current page
        fc.integer({ min: 1, max: 100 }), // total pages
        (currentPage, totalPages) => {
          vi.spyOn(scheduleService, 'getTasks').mockResolvedValue({
            items: [],
            total: totalPages * 20,
            page: currentPage,
            size: 20,
            pages: totalPages,
          });

          const { getByRole } = render(<SchedulePage />);

          const prevButton = getByRole('button', { name: /previous/i });
          const nextButton = getByRole('button', { name: /next/i });

          // Previous button should be disabled on first page
          if (currentPage === 1) {
            expect(prevButton).toBeDisabled();
          } else {
            expect(prevButton).not.toBeDisabled();
          }

          // Next button should be disabled on last page
          if (currentPage === totalPages) {
            expect(nextButton).toBeDisabled();
          } else {
            expect(nextButton).not.toBeDisabled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

Integration tests verify the complete flow from UI to backend:

**Test Scenarios:**
1. Load Schedule page → Verify API call → Verify data displays
2. Change filter → Verify API call with filter → Verify filtered data displays
3. Change page → Verify API call with offset → Verify new data displays
4. Click task → Verify navigation to detail view
5. API returns error → Verify error message → Click retry → Verify API called again

**Note:** Integration tests require running backend or using mock server.

### Manual Testing Checklist

Following the debugging approach outlined earlier:

**Phase 1: API Connection**
- [ ] Open DevTools Network tab
- [ ] Navigate to Schedule page
- [ ] Verify `/api/v1/workitems?type=task` call
- [ ] Check response status 200
- [ ] Inspect response body
- [ ] Verify no console errors

**Phase 2: Data Display**
- [ ] Verify tasks appear in table
- [ ] Verify task titles displayed
- [ ] Verify status badges correct
- [ ] Verify dates format correctly
- [ ] Verify missing fields handled
- [ ] Verify at least 3 tasks visible

**Phase 3: Statistics**
- [ ] Verify statistics dashboard displays
- [ ] Verify total count matches
- [ ] Verify status counts correct
- [ ] Verify completion percentage correct

**Phase 4: Pagination**
- [ ] Verify pagination controls appear
- [ ] Verify Previous disabled on page 1
- [ ] Click Next and verify new data
- [ ] Verify page number updates
- [ ] Verify Next disabled on last page

**Phase 5: Filters**
- [ ] Select status filter
- [ ] Verify API call includes status
- [ ] Verify filtered results
- [ ] Clear filter and verify all tasks
- [ ] Test assigned_to filter

**Phase 6: Error Handling**
- [ ] Simulate network error
- [ ] Verify error message
- [ ] Verify retry button
- [ ] Click retry and verify reload
- [ ] Test with 404 error

**Phase 7: Loading States**
- [ ] Throttle network to slow 3G
- [ ] Navigate to Schedule page
- [ ] Verify loading indicator
- [ ] Wait for data load
- [ ] Verify loading indicator disappears

**Phase 8: Console Verification**
- [ ] Open browser console
- [ ] Clear console
- [ ] Navigate to Schedule page
- [ ] Interact with page
- [ ] Verify no errors
- [ ] Check for warnings

### Test Coverage Goals

Following RxDx standards:

**Minimum Coverage:** 80%
**Target Coverage:** >90%

**Critical Paths:** 100% coverage required for:
- API service methods
- Status mapping functions
- Statistics calculations
- Error handling logic
- Data transformation functions

**Lower Priority:** <80% acceptable for:
- UI styling code
- Placeholder components
- Development-only code

## Implementation Notes

### Development Workflow

1. **Fix Critical Issues First:**
   - Status mapping (Issue #1)
   - Pagination metadata (Issue #2)
   - Non-existent endpoints (Issue #3)

2. **Add Tests:**
   - Write unit tests for service layer
   - Write property tests for calculations
   - Write component tests for UI

3. **Manual Verification:**
   - Follow debugging checklist
   - Test with real backend
   - Verify with seeded data

4. **Documentation:**
   - Update service documentation
   - Add inline comments for complex logic
   - Update README if needed

### Code Quality Standards

Following RxDx coding standards:

**Error Handling:**
- ✅ Use try-catch blocks
- ✅ Provide user-friendly error messages
- ✅ Include retry buttons
- ✅ Log errors to console
- ✅ Use PageErrorBoundary for component errors

**Logging:**
- ✅ Use console.error for errors (current standard)
- ✅ Include context in log messages
- ✅ Log API failures with details
- ✅ Future: Migrate to logger service when available

**Type Safety:**
- ✅ Use TypeScript strict mode
- ✅ Define interfaces for all data structures
- ✅ Avoid `any` type
- ✅ Use type guards for runtime validation

**Performance:**
- ✅ Use useCallback for event handlers
- ✅ Use useMemo for expensive calculations
- ✅ Avoid unnecessary re-renders
- ✅ Debounce user input handlers

**Accessibility:**
- ✅ Use semantic HTML
- ✅ Add ARIA labels
- ✅ Support keyboard navigation
- ✅ Provide loading/error announcements

### Dependencies

**No new dependencies required.** All fixes can be implemented with existing dependencies:
- React
- TypeScript
- Axios (via apiClient)
- Vitest (for testing)
- fast-check (for property-based testing - may need to add)

### Deployment Considerations

**No deployment changes required.** This is a debugging/verification effort, not a new feature deployment.

**Rollback Plan:**
If issues are found during verification, the current implementation can remain as-is while fixes are developed.

**Monitoring:**
After fixes are deployed:
- Monitor error rates in browser console
- Monitor API error rates
- Monitor user feedback
- Track page load times

## Summary

This design document provides a comprehensive approach to debugging and verifying the Schedule page implementation. The key issues identified are:

1. **Status field mismatch** between frontend and backend
2. **Missing pagination metadata** from backend API
3. **Non-existent endpoints** called by service methods

The debugging approach follows a systematic phase-by-phase verification process, and the testing strategy includes both unit tests and property-based tests to ensure correctness.

The correctness properties defined in this document provide a formal specification of what the Schedule page should do, enabling automated verification through property-based testing.

Following this design will result in a production-ready Schedule page that correctly integrates with the backend, handles errors gracefully, and provides a good user experience.

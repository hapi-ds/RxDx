# Tasks: Schedule Page Debugging

## Overview

This task list provides a systematic approach to debugging and fixing the Schedule page implementation. The tasks are organized by priority and dependency, focusing on critical issues first before moving to enhancements and testing.

## Task Categories

- **Phase 1**: Critical Fixes (Status mapping, API endpoints, pagination)
- **Phase 2**: Service Layer Improvements (Error handling, type mapping)
- **Phase 3**: Component Enhancements (Error states, loading states)
- **Phase 4**: Testing (Unit tests, property-based tests)
- **Phase 5**: Verification (Manual testing, console error check)

---

## Phase 1: Critical Fixes

### Task 1: Fix Status Field Mapping

**Priority**: Critical  
**Estimated Time**: 2 hours  
**Dependencies**: None

#### Subtasks:

- [x] 1.1 Create status mapping functions in scheduleService.ts
  - Add `mapBackendStatus()` function to convert backend status to frontend
  - Add `mapFrontendStatus()` function to convert frontend status to backend
  - Handle all status values: draft→not_started, active→in_progress, completed→completed, archived→completed
  - Handle blocked status (map to active for backend)

- [x] 1.2 Update getTasks() to use status mapping
  - Apply `mapBackendStatus()` to each task's status field
  - Update status filter to use `mapFrontendStatus()` when sending to API
  - Ensure all returned tasks have correctly mapped status

- [x] 1.3 Create WorkItemResponse interface
  - Define TypeScript interface matching backend WorkItemResponse model
  - Include all fields: id, type, title, description, status, priority, assigned_to, version, created_by, created_at, updated_at, is_signed
  - Include task-specific fields: estimated_hours, start_date, end_date, dependencies, required_resources, resource_demand

- [x] 1.4 Create mapWorkItemToTask() function
  - Convert WorkItemResponse to Task interface
  - Apply status mapping
  - Handle null/undefined fields gracefully
  - Convert UUID arrays to string arrays for dependencies

**Acceptance Criteria**:
- Status badges display correct colors for all tasks
- Status filter works correctly with backend API
- Statistics calculate correctly based on mapped status values
- No type errors related to status field

---

### Task 2: Fix API Endpoint Usage

**Priority**: Critical  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1 (status mapping)

#### Subtasks:

- [x] 2.1 Update getTask() method
  - Change endpoint from `/schedule/tasks/${taskId}` to `/workitems/${taskId}`
  - Apply `mapWorkItemToTask()` to response
  - Add proper error handling
  - Add console.error logging for failures

- [x] 2.2 Update createTask() method
  - Change endpoint from `/schedule/tasks` to `/workitems`
  - Create WorkItemCreate payload with type='task'
  - Apply `mapFrontendStatus()` to status field
  - Apply `mapWorkItemToTask()` to response
  - Add proper error handling

- [x] 2.3 Update updateTask() method
  - Change endpoint from `/schedule/tasks/${taskId}` to `/workitems/${taskId}`
  - Create WorkItemUpdate payload
  - Add change_description query parameter
  - Apply `mapFrontendStatus()` to status field if present
  - Apply `mapWorkItemToTask()` to response
  - Add proper error handling

- [x] 2.4 Update deleteTask() method
  - Change endpoint from `/schedule/tasks/${taskId}` to `/workitems/${taskId}`
  - Add proper error handling
  - Add console.error logging for failures

- [x] 2.5 Mark unimplemented methods as coming soon
  - Add comments to calculateSchedule() indicating backend not implemented
  - Add comments to getSchedule() indicating backend not implemented
  - Add comments to getGanttData() indicating backend not implemented
  - Consider throwing NotImplementedError or returning mock data

**Acceptance Criteria**:
- All CRUD operations use correct `/workitems` endpoints
- Create, update, and delete operations work without 404 errors
- Task data is correctly transformed between backend and frontend formats
- Unimplemented features are clearly marked

---

### Task 3: Fix Pagination Implementation

**Priority**: Critical  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1 (status mapping)

#### Subtasks:

- [x] 3.1 Implement client-side pagination in getTasks()
  - Fetch all tasks with limit=1000
  - Store all tasks in memory
  - Apply client-side slicing based on page and size
  - Calculate correct total, pages from all tasks
  - Apply filters before pagination

- [x] 3.2 Update pagination metadata calculation
  - Set total to allItems.length (not items.length)
  - Calculate pages as Math.ceil(allItems.length / size)
  - Ensure page number is within valid range

- [x] 3.3 Add pagination state validation
  - Ensure page >= 1
  - Ensure page <= totalPages
  - Reset to page 1 when filters change
  - Handle edge case of 0 tasks

**Acceptance Criteria**:
- Pagination displays correct total count
- "Next" button disables on last page
- "Previous" button disables on first page
- Page info shows correct "Page X of Y (Z total)"
- Pagination works correctly with filters

---

## Phase 2: Service Layer Improvements

### Task 4: Enhance Error Handling

**Priority**: High  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2 (API endpoints)

#### Subtasks:

- [x] 4.1 Add detailed error messages in getTasks()
  - Catch axios errors and extract status code
  - Provide specific messages for 400, 401, 403, 404, 500, 503
  - Include error details from backend response
  - Log full error object to console

- [x] 4.2 Add network error detection
  - Check for !error.response to detect network errors
  - Provide user-friendly message: "Network error: Please check your internet connection"
  - Log network errors to console

- [x] 4.3 Add error handling to all service methods
  - Apply consistent error handling pattern to getTask(), createTask(), updateTask(), deleteTask()
  - Include method name in error logs
  - Preserve error stack traces

- [x] 4.4 Add data validation in mapWorkItemToTask()
  - Validate required fields (id, title, estimated_hours)
  - Throw descriptive errors for invalid data
  - Log validation errors to console
  - Handle missing optional fields gracefully

**Acceptance Criteria**:
- Error messages are specific and user-friendly
- Network errors are detected and reported correctly
- All service methods have consistent error handling
- Invalid data from backend is caught and reported
- All errors are logged to console for debugging

---

### Task 5: Improve Type Safety

**Priority**: Medium  
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 1 (status mapping)

#### Subtasks:

- [x] 5.1 Add type guards for WorkItemResponse
  - Create isWorkItemResponse() type guard function
  - Validate response structure before mapping
  - Use in getTasks() and other methods

- [x] 5.2 Add strict null checks
  - Ensure all optional fields use `| undefined` not `| null`
  - Add null coalescing operators (??) where appropriate
  - Use optional chaining (?.) for nested properties

- [x] 5.3 Add JSDoc comments to service methods
  - Document parameters and return types
  - Document error conditions
  - Add usage examples for complex methods

**Acceptance Criteria**:
- TypeScript compilation succeeds with no errors
- Type guards prevent runtime type errors
- All service methods have JSDoc documentation
- Optional fields are handled consistently

---

## Phase 3: Component Enhancements

### Task 6: Improve Error State Display

**Priority**: Medium  
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 4 (error handling)

#### Subtasks:

- [x] 6.1 Update error message display in SchedulePage
  - Show full error message from service layer
  - Include error icon or styling
  - Ensure error is accessible (role="alert")

- [x] 6.2 Enhance retry functionality
  - Clear error state before retry
  - Show loading indicator during retry
  - Handle retry failures gracefully
  - Log retry attempts to console

- [x] 6.3 Add error state for statistics
  - Handle statistics loading failures separately
  - Don't block task list if statistics fail
  - Show partial data when possible

**Acceptance Criteria**:
- Error messages are clear and actionable
- Retry button works correctly
- Statistics failures don't break the page
- Error states are accessible

---

### Task 7: Enhance Loading States

**Priority**: Low  
**Estimated Time**: 1 hour  
**Dependencies**: None

#### Subtasks:

- [x] 7.1 Add loading skeleton for task table
  - Show placeholder rows while loading
  - Match table structure
  - Animate skeleton for better UX

- [x] 7.2 Add loading state for statistics
  - Show skeleton cards while loading
  - Don't show stale data during reload

- [x] 7.3 Ensure loading states are accessible
  - Add role="status" and aria-live="polite"
  - Provide screen reader announcements

**Acceptance Criteria**:
- Loading states are visually clear
- No flash of empty state before data loads
- Loading states are accessible to screen readers

---

## Phase 4: Testing

### Task 8: Write Unit Tests for Service Layer

**Priority**: High  
**Estimated Time**: 3 hours  
**Dependencies**: Tasks 1-5 (all service layer changes)

#### Subtasks:

- [ ] 8.1 Test status mapping functions
  - Test mapBackendStatus() with all backend status values
  - Test mapFrontendStatus() with all frontend status values
  - Test bidirectional mapping consistency
  - Test handling of unknown status values

- [ ] 8.2 Test mapWorkItemToTask() function
  - Test with complete WorkItemResponse
  - Test with minimal required fields
  - Test with null/undefined optional fields
  - Test UUID to string conversion for dependencies

- [ ] 8.3 Test getTasks() method
  - Mock apiClient.get() response
  - Test successful data fetch
  - Test with filters (status, assigned_to)
  - Test pagination calculation
  - Test error handling (network, HTTP errors)

- [ ] 8.4 Test CRUD methods
  - Test getTask() with valid ID
  - Test createTask() with valid data
  - Test updateTask() with partial updates
  - Test deleteTask() with valid ID
  - Test error handling for each method

- [ ] 8.5 Test getStatistics() method
  - Test with various task arrays
  - Test calculation of all statistics
  - Test with empty task array
  - Test completion percentage calculation

**Acceptance Criteria**:
- All service methods have unit tests
- Test coverage > 80% for scheduleService.ts
- All tests pass
- Tests cover success and error cases

---

### Task 9: Write Property-Based Tests

**Priority**: High  
**Estimated Time**: 4 hours  
**Dependencies**: Task 8 (unit tests)

#### Subtasks:

- [ ] 9.1 Write Property 1: Status Mapping Consistency
  - Generate random backend status values
  - Test mapBackendStatus() → mapFrontendStatus() → mapBackendStatus()
  - Verify semantic meaning is preserved
  - Test with 100+ examples

- [ ] 9.2 Write Property 2: Task Data Rendering
  - Generate random Task objects with various field combinations
  - Test that rendering doesn't throw errors
  - Verify all non-null fields are displayed
  - Test with 100+ examples

- [ ] 9.3 Write Property 3: Statistics Calculation Accuracy
  - Generate random arrays of tasks
  - Calculate statistics
  - Verify counts match actual data
  - Test with arrays of 0-1000 tasks

- [ ] 9.4 Write Property 4: Pagination State Correctness
  - Generate random pagination states
  - Verify button disabled states
  - Test edge cases (page 1, last page)
  - Test with various total page counts

- [ ] 9.5 Write Property 5: Pagination Info Display
  - Generate random pagination states
  - Verify info string is correct
  - Test formatting with various numbers

- [ ] 9.6 Write Property 6: Error Message Presence
  - Generate random error states
  - Verify error message and retry button are present
  - Test with various error types

- [ ] 9.7 Write Property 7: Empty Data Handling
  - Test components with empty arrays
  - Test components with null values
  - Verify no errors are thrown
  - Verify empty states are displayed

- [ ] 9.8 Write Property 8: API Call Parameters
  - Generate random filter states
  - Verify API call includes correct parameters
  - Test parameter encoding
  - Test with various filter combinations

**Acceptance Criteria**:
- All 8 correctness properties have property-based tests
- Tests use fast-check or similar PBT library
- All property tests pass with 100+ examples
- Tests are annotated with requirement links

---

### Task 10: Write Component Tests

**Priority**: Medium  
**Estimated Time**: 3 hours  
**Dependencies**: Tasks 6-7 (component enhancements)

#### Subtasks:

- [ ] 10.1 Test SchedulePage rendering
  - Test initial render with loading state
  - Test render with task data
  - Test render with empty data
  - Test render with error state

- [ ] 10.2 Test user interactions
  - Test filter changes
  - Test pagination navigation
  - Test task click (navigation to detail)
  - Test create button click
  - Test edit button click
  - Test delete button click and confirmation

- [ ] 10.3 Test statistics dashboard
  - Test statistics display with data
  - Test statistics calculation
  - Test statistics with various task statuses

- [ ] 10.4 Test error handling in component
  - Test retry button functionality
  - Test error message display
  - Test error recovery

**Acceptance Criteria**:
- SchedulePage component has comprehensive tests
- All user interactions are tested
- Test coverage > 80% for SchedulePage.tsx
- All tests pass

---

## Phase 5: Verification

### Task 11: Manual Testing and Verification

**Priority**: High  
**Estimated Time**: 2 hours  
**Dependencies**: All previous tasks

#### Subtasks:

- [ ] 11.1 Verify API connection (Phase 1 from design)
  - Open DevTools Network tab
  - Navigate to Schedule page
  - Verify API call to `/api/v1/workitems?type=task`
  - Check response status is 200
  - Inspect response body
  - Verify no console errors

- [ ] 11.2 Verify data display (Phase 2 from design)
  - Check tasks appear in table
  - Verify task titles are displayed
  - Verify status badges show correct colors
  - Verify dates format correctly
  - Verify missing fields show "-"
  - Check at least 3 tasks from medical-device template

- [ ] 11.3 Verify statistics (Phase 3 from design)
  - Check statistics dashboard displays
  - Verify total task count
  - Verify completed/in-progress/blocked counts
  - Verify completion percentage
  - Check statistics update correctly

- [ ] 11.4 Verify pagination (Phase 4 from design)
  - Check pagination controls appear
  - Verify "Previous" disabled on page 1
  - Click "Next" and verify new data loads
  - Verify page number updates
  - Verify "Next" disabled on last page

- [ ] 11.5 Verify filters (Phase 5 from design)
  - Select status filter
  - Verify API call includes status parameter
  - Verify filtered results display
  - Clear filter and verify all tasks return
  - Test assigned_to filter

- [ ] 11.6 Verify error handling (Phase 6 from design)
  - Simulate network error (disconnect network)
  - Verify error message displays
  - Verify retry button appears
  - Click retry and verify reload attempt
  - Test with various error scenarios

- [ ] 11.7 Verify loading states (Phase 7 from design)
  - Throttle network to slow 3G
  - Navigate to Schedule page
  - Verify loading indicator appears
  - Wait for data to load
  - Verify loading indicator disappears

- [ ] 11.8 Verify console errors (Phase 8 from design)
  - Open browser console
  - Clear console
  - Navigate to Schedule page
  - Interact with page (filters, pagination, etc.)
  - Verify no errors in console
  - Check for warnings

**Acceptance Criteria**:
- All 8 verification phases pass
- No console errors during normal operation
- All requirements from requirements.md are met
- Page is production-ready

---

### Task 12: Code Quality and Documentation

**Priority**: Medium  
**Estimated Time**: 1.5 hours  
**Dependencies**: All previous tasks

#### Subtasks:

- [ ] 12.1 Run linting and formatting
  - Run `npm run lint` and fix all issues
  - Run `npm run format` to format code
  - Ensure no ESLint errors or warnings

- [ ] 12.2 Run type checking
  - Run `npm run type-check`
  - Fix any TypeScript errors
  - Ensure strict type safety

- [ ] 12.3 Update JSDoc comments
  - Add/update comments for all public methods
  - Document complex logic
  - Add usage examples where helpful

- [ ] 12.4 Update README if needed
  - Document any new patterns or conventions
  - Update troubleshooting section if needed

**Acceptance Criteria**:
- All linting checks pass
- All type checks pass
- Code is well-documented
- README is up to date

---

## Summary

**Total Estimated Time**: 26.5 hours

**Task Breakdown**:
- Phase 1 (Critical Fixes): 7 hours
- Phase 2 (Service Layer): 3.5 hours
- Phase 3 (Component Enhancements): 2.5 hours
- Phase 4 (Testing): 10 hours
- Phase 5 (Verification): 3.5 hours

**Priority Order**:
1. Task 1: Fix Status Field Mapping (Critical)
2. Task 2: Fix API Endpoint Usage (Critical)
3. Task 3: Fix Pagination Implementation (Critical)
4. Task 4: Enhance Error Handling (High)
5. Task 8: Write Unit Tests (High)
6. Task 9: Write Property-Based Tests (High)
7. Task 11: Manual Testing and Verification (High)
8. Task 5: Improve Type Safety (Medium)
9. Task 6: Improve Error State Display (Medium)
10. Task 10: Write Component Tests (Medium)
11. Task 12: Code Quality and Documentation (Medium)
12. Task 7: Enhance Loading States (Low)

**Dependencies**:
- Tasks 2-3 depend on Task 1 (status mapping must be fixed first)
- Task 4 depends on Task 2 (API endpoints must be correct)
- Tasks 8-10 depend on implementation tasks being complete
- Task 11 depends on all implementation and testing tasks
- Task 12 should be done last

**Notes**:
- Focus on critical fixes first to unblock other work
- Testing should be done incrementally as features are fixed
- Manual verification should be done after all automated tests pass
- Code quality checks should be the final step before considering work complete

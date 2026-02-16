# Implementation Plan: Web Time Tracking

## Overview

This implementation plan breaks down the web time tracking feature into discrete, incremental tasks. Each task builds on previous work and includes testing to validate functionality early. The implementation follows the established patterns in the RxDx web frontend using React, TypeScript, Zustand, and Axios.

## Tasks

- [ ] 1. Set up core infrastructure and types
  - Create TypeScript interfaces for Task, ActiveTracking, TimeEntry
  - Create timeTrackingService.ts with API client methods
  - Set up basic error handling patterns
  - _Requirements: 12.1, 12.2, 12.5, 12.6_

- [ ] 1.1 Write unit tests for timeTrackingService
  - Test getTasks() API call and error handling
  - Test startTracking() API call and error handling
  - Test stopTracking() API call and error handling
  - Test getActiveTracking() API call
  - Test getEntries() API call with pagination
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 2. Implement Zustand store for time tracking state
  - [ ] 2.1 Create useTimeTrackingStore with state interface
    - Define TimeTrackingState interface
    - Initialize store with default state
    - Add loading and error state management
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [ ] 2.2 Implement store actions for task management
    - Add fetchTasks() action
    - Add task filtering and sorting logic
    - Add search query state management
    - _Requirements: 11.3, 11.8, 3.2_
  
  - [ ] 2.3 Implement store actions for time tracking
    - Add startTracking() action with validation
    - Add stopTracking() action
    - Add checkActiveTracking() action
    - Implement localStorage persistence for active tracking
    - _Requirements: 11.3, 11.6, 11.7, 5.11_
  
  - [ ] 2.4 Implement store actions for time entries
    - Add fetchEntries() action with pagination
    - Add loadMoreEntries() action
    - Add entry grouping by date logic
    - _Requirements: 11.3, 7.4_

- [ ] 2.5 Write unit tests for useTimeTrackingStore
  - Test fetchTasks() updates state correctly
  - Test startTracking() creates active tracking
  - Test stopTracking() clears active tracking
  - Test localStorage persistence and recovery
  - Test error handling in all actions
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 2.6 Write property test for task sorting
  - **Property 1: Task List Sorting Consistency**
  - **Validates: Requirements 3.2**

- [ ] 2.7 Write property test for search filtering
  - **Property 6: Search Filter Correctness**
  - **Validates: Requirements 4.2**

- [ ] 3. Create utility functions and formatters
  - [ ] 3.1 Implement time formatting utilities
    - Create formatDuration(hours) → "Xh Ym"
    - Create formatTime(isoString) → "HH:MM"
    - Create formatElapsedTime(milliseconds) → "HH:MM:SS"
    - Create calculateElapsedTime(startTime, currentTime)
    - _Requirements: 3.5, 7.6, 7.7, 8.3_
  
  - [ ] 3.2 Implement date grouping utilities
    - Create groupEntriesByDate(entries)
    - Create formatDateHeader(date) → "Today", "Yesterday", "MMM DD, YYYY"
    - _Requirements: 7.4, 7.5_
  
  - [ ] 3.3 Implement validation utilities
    - Create validateDescription(text) → { isValid, error }
    - Create validateTaskSelection(taskId, tasks)
    - _Requirements: 6.3, 13.4_

- [ ] 3.4 Write unit tests for utility functions
  - Test formatDuration with various hour values
  - Test formatTime with ISO strings
  - Test formatElapsedTime with milliseconds
  - Test groupEntriesByDate with various entry lists
  - Test validateDescription with valid and invalid inputs
  - _Requirements: 3.5, 6.3, 7.4, 7.7_

- [ ] 3.5 Write property test for duration formatting
  - **Property 8: Worked Sum Format**
  - **Validates: Requirements 3.5, 7.7**

- [ ] 3.6 Write property test for timer accuracy
  - **Property 2: Timer Accuracy**
  - **Validates: Requirements 8.2, 8.3**

- [ ] 3.7 Write property test for description validation
  - **Property 5: Description Length Validation**
  - **Validates: Requirements 6.3**

- [ ] 4. Build TaskListPanel component
  - [ ] 4.1 Create TaskListPanel component structure
    - Create component with props interface
    - Add search input with debounce (300ms)
    - Add task list container with scrolling
    - Add empty state display
    - _Requirements: 3.1, 4.1, 4.3, 4.4_
  
  - [ ] 4.2 Create TaskCard component
    - Display task title, description (truncated to 100 chars)
    - Display worked_sum formatted as "Xh Ym"
    - Add timer icon for tasks with active tracking
    - Add click handler for task selection
    - Add highlight for selected task
    - _Requirements: 3.3, 3.4, 3.5, 3.8_
  
  - [ ] 4.3 Implement search and filter logic
    - Connect search input to store
    - Implement client-side filtering by title/description
    - Display filtered task count
    - Add clear search button
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

- [ ] 4.4 Write unit tests for TaskListPanel
  - Test task rendering with correct data
  - Test search filtering functionality
  - Test task selection updates state
  - Test empty state display
  - Test worked_sum formatting
  - _Requirements: 3.1, 3.3, 3.5, 4.2_

- [ ] 5. Build TimerPanel component
  - [ ] 5.1 Create TimerPanel component structure
    - Create component with props interface
    - Add task header section
    - Add timer display section
    - Add description textarea
    - Add start/stop button
    - _Requirements: 5.2, 5.3, 5.7, 6.1_
  
  - [ ] 5.2 Implement Timer component with real-time updates
    - Create useEffect hook for interval
    - Update elapsed time every 1000ms
    - Format time as "HH:MM:SS"
    - Clear interval on unmount and stop
    - _Requirements: 5.5, 5.6, 5.7, 8.1, 8.2, 8.3_
  
  - [ ] 5.3 Implement description input with character counter
    - Add textarea with 500 char limit
    - Display character count "X/500"
    - Allow editing while tracking
    - Preserve description when switching tasks
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 6.9_
  
  - [ ] 5.4 Implement start/stop button logic
    - Connect to store actions
    - Show loading states during API calls
    - Disable when no task selected
    - Validate description length before submit
    - _Requirements: 5.4, 5.8, 13.4_

- [ ] 5.5 Write unit tests for TimerPanel
  - Test timer display updates every second
  - Test timer format is correct (HH:MM:SS)
  - Test description character counter
  - Test start/stop button states
  - Test interval cleanup on unmount
  - _Requirements: 5.5, 5.6, 5.7, 6.3, 6.4_

- [ ] 5.6 Write property test for timer cleanup
  - **Property 10: Timer Cleanup on Unmount**
  - **Validates: Requirements 8.4, 8.5**

- [ ] 5.7 Write property test for timezone handling
  - **Property 11: Timezone Handling**
  - **Validates: Requirements 8.6**

- [ ] 6. Build TimeEntriesPanel component
  - [ ] 6.1 Create TimeEntriesPanel component structure
    - Create component with props interface
    - Add "Recent Entries" header
    - Add scrollable entries container
    - Add "Load More" button
    - Add empty state display
    - _Requirements: 7.1, 7.2, 7.9, 7.10_
  
  - [ ] 6.2 Create TimeEntryGroup component
    - Display date header with formatting
    - Group entries by date
    - Sort dates descending (most recent first)
    - _Requirements: 7.4, 7.5_
  
  - [ ] 6.3 Create TimeEntryCard component
    - Display task title
    - Display start time, end time, duration
    - Display description (truncated if long)
    - Format times as "HH:MM"
    - Format duration as "Xh Ym"
    - _Requirements: 7.3, 7.6, 7.7_
  
  - [ ] 6.4 Implement pagination with load more
    - Connect to store fetchEntries action
    - Implement loadMoreEntries handler
    - Show loading state during fetch
    - Hide button when no more entries
    - _Requirements: 7.9_

- [ ] 6.5 Write unit tests for TimeEntriesPanel
  - Test entry grouping by date
  - Test date header formatting
  - Test entry card display
  - Test load more functionality
  - Test empty state display
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.9_

- [ ] 6.6 Write property test for time entry grouping
  - **Property 7: Time Entry Grouping**
  - **Validates: Requirements 7.4**

- [ ] 7. Create TimeTrackingPage main component
  - [ ] 7.1 Create page component structure
    - Set up two-column layout for desktop (≥1024px)
    - Set up single-column layout for tablet (<1024px)
    - Add page header with title
    - Add responsive CSS
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_
  
  - [ ] 7.2 Integrate child components
    - Add TaskListPanel to left column
    - Add TimerPanel to right column (top)
    - Add TimeEntriesPanel to right column (bottom)
    - Connect all components to store
    - _Requirements: 2.2, 2.3_
  
  - [ ] 7.3 Implement page initialization
    - Fetch tasks on mount
    - Check for active tracking on mount
    - Fetch recent entries on mount
    - Handle loading states
    - _Requirements: 5.12_
  
  - [ ] 7.4 Implement keyboard shortcuts
    - Add Ctrl+Space (Cmd+Space) for start/stop
    - Add Ctrl+F (Cmd+F) for search focus
    - Add Escape for clear search/deselect
    - Add arrow keys for task navigation
    - Add Enter for task selection
    - Prevent shortcuts when typing in inputs
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 7.5 Implement error display and notifications
    - Add error banner for page-level errors
    - Add toast notifications for actions
    - Add retry buttons for failed operations
    - _Requirements: 13.1, 13.2, 13.5, 13.6, 13.7_

- [ ] 7.6 Write unit tests for TimeTrackingPage
  - Test page layout responsiveness
  - Test component integration
  - Test initialization on mount
  - Test keyboard shortcuts
  - Test error display
  - _Requirements: 2.1, 2.4, 2.5, 10.1, 13.1_

- [ ] 7.7 Write property test for keyboard shortcut isolation
  - **Property 9: Keyboard Shortcut Isolation**
  - **Validates: Requirements 10.1, 10.2**

- [ ] 8. Add routing and navigation integration
  - [ ] 8.1 Add route to App.tsx
    - Import TimeTrackingPage component
    - Add route `/time-tracking` with ProtectedRoute
    - Wrap in PageErrorBoundary
    - Wrap in AppLayout
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 8.2 Add navigation item to NavigationHeader
    - Add "Time Tracking" link to navigation
    - Add icon for time tracking
    - Highlight when active
    - _Requirements: 1.1_

- [ ] 8.3 Write integration test for routing
  - Test route renders TimeTrackingPage
  - Test ProtectedRoute requires authentication
  - Test navigation link works
  - _Requirements: 1.2, 1.3_

- [ ] 9. Implement state persistence and recovery
  - [ ] 9.1 Add localStorage persistence for active tracking
    - Save active tracking on start
    - Clear on stop
    - Recover on page load
    - Validate recovered data
    - _Requirements: 11.6, 11.7, 15.7_
  
  - [ ] 9.2 Add sessionStorage for UI state
    - Persist selected task ID
    - Persist search query
    - Restore on page return
    - _Requirements: 4.8_

- [ ] 9.3 Write unit tests for persistence
  - Test localStorage save and recovery
  - Test sessionStorage save and recovery
  - Test corrupted data handling
  - _Requirements: 11.6, 11.7, 15.7_

- [ ] 9.4 Write property test for localStorage validation
  - **Property 12: localStorage Validation**
  - **Validates: Requirements 15.7**

- [ ] 9.5 Write property test for task selection persistence
  - **Property 14: Task Selection Persistence**
  - **Validates: Requirements 4.8**

- [ ] 10. Implement optimistic UI updates and error recovery
  - [ ] 10.1 Add optimistic updates for start tracking
    - Update UI immediately on start
    - Rollback on API error
    - Show loading indicator
    - _Requirements: 14.7_
  
  - [ ] 10.2 Add optimistic updates for stop tracking
    - Update UI immediately on stop
    - Rollback on API error
    - Refresh entries on success
    - _Requirements: 14.7_
  
  - [ ] 10.3 Implement error recovery with retry
    - Add retry logic to failed operations
    - Display retry button in error messages
    - Clear error on successful retry
    - _Requirements: 13.6, 13.7_

- [ ] 10.4 Write unit tests for optimistic updates
  - Test UI updates before API response
  - Test rollback on error
  - Test retry functionality
  - _Requirements: 14.7_

- [ ] 10.5 Write property test for optimistic UI rollback
  - **Property 13: Optimistic UI Update Rollback**
  - **Validates: Requirements 14.7**

- [ ] 11. Add styling and responsive design
  - [ ] 11.1 Create TimeTrackingPage.css
    - Add two-column layout styles
    - Add responsive breakpoints
    - Add task list styles
    - Add timer panel styles
    - Add time entries styles
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 11.2 Style TaskListPanel and TaskCard
    - Add search input styles
    - Add task card styles
    - Add hover and selected states
    - Add timer icon styles
    - _Requirements: 3.3, 3.4, 3.8_
  
  - [ ] 11.3 Style TimerPanel and Timer
    - Add timer display styles
    - Add description textarea styles
    - Add button styles with loading states
    - Add character counter styles
    - _Requirements: 5.2, 5.3, 5.7, 6.4_
  
  - [ ] 11.4 Style TimeEntriesPanel
    - Add date header styles
    - Add entry card styles
    - Add load more button styles
    - Add empty state styles
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 11.5 Add accessibility styles
    - Add focus indicators for keyboard navigation
    - Add ARIA labels
    - Add screen reader text
    - Ensure color contrast meets WCAG AA
    - _Requirements: 10.7, 10.8, 10.9_

- [ ] 11.6 Write responsive design tests
  - Test layout at different breakpoints
  - Test mobile/tablet/desktop views
  - _Requirements: 2.4, 2.5_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Integration testing and end-to-end flows
  - [ ] 13.1 Write integration test for complete tracking flow
    - User selects task
    - User starts tracking
    - Timer updates in real-time
    - User adds description
    - User stops tracking
    - Entry appears in history
    - _Requirements: 5.1, 5.4, 5.8, 6.5, 7.2_
  
  - [ ] 13.2 Write integration test for search and filter flow
    - User types in search
    - Task list filters
    - User clears search
    - All tasks reappear
    - _Requirements: 4.2, 4.3, 4.5_
  
  - [ ] 13.3 Write integration test for error recovery flow
    - API returns error
    - Error message displays
    - User clicks retry
    - Operation succeeds
    - _Requirements: 13.1, 13.2, 13.6_
  
  - [ ] 13.4 Write integration test for keyboard shortcuts
    - Test Ctrl+Space starts/stops tracking
    - Test Ctrl+F focuses search
    - Test Escape clears search
    - Test arrow keys navigate tasks
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 14. Performance optimization
  - [ ] 14.1 Add React.memo to list components
    - Memoize TaskCard component
    - Memoize TimeEntryCard component
    - Prevent unnecessary re-renders
    - _Requirements: 14.4_
  
  - [ ] 14.2 Optimize search debouncing
    - Ensure 300ms debounce on search input
    - Cancel pending searches on unmount
    - _Requirements: 14.5_
  
  - [ ] 14.3 Implement task list caching
    - Cache task list for 5 minutes
    - Invalidate cache on start/stop
    - _Requirements: 14.6_
  
  - [ ] 14.4 Optimize timer updates
    - Use requestAnimationFrame for smooth updates
    - Minimize re-renders during timer updates
    - _Requirements: 14.2_

- [ ] 14.5 Write performance tests
  - Test component render counts
  - Test search debounce timing
  - Test timer update performance
  - _Requirements: 14.2, 14.4, 14.5_

- [ ] 15. Final checkpoint and documentation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end user flows
- The implementation follows existing web frontend patterns (Zustand, Axios, React Router)
- All components use TypeScript for type safety
- Styling follows the existing web app design system
- Accessibility is built in from the start (ARIA labels, keyboard navigation, focus indicators)

# Requirements Document: Web Time Tracking

## Introduction

This document specifies the requirements for the RxDx Web Time Tracking feature, a React + TypeScript web application that enables project team members to track time spent on tasks through a desktop-optimized interface. The web application integrates with the existing RxDx backend API to synchronize time entries in real-time and provides a data-dense UI suitable for desktop and tablet users.

## Glossary

- **Web App**: The React + TypeScript web application running in a browser
- **Worked Node**: A graph database node representing a time tracking entry
- **Task**: A WorkItem of type "task" in the RxDx system
- **Active Tracking**: A time entry that has been started but not yet stopped
- **Worked Sum**: The total time worked on a task (aggregate of all worked nodes)
- **Backend API**: The RxDx FastAPI backend service
- **Time Entry**: A completed worked node with start and end times
- **Time Tracking Page**: The dedicated page in the web app for time tracking functionality
- **Zustand Store**: The state management library used in the web app
- **API Client**: The axios-based HTTP client for backend communication
- **localStorage**: Browser storage API for persisting data locally

## Requirements

### Requirement 1: Web Application Integration

**User Story:** As a project team member, I want time tracking integrated into the existing web application, so that I can track time without switching between different applications.

#### Acceptance Criteria

1. THE Web App SHALL add a "Time Tracking" navigation item to the existing NavigationHeader
2. THE Web App SHALL create a new route `/time-tracking` in the React Router configuration
3. THE Time Tracking Page SHALL be wrapped in ProtectedRoute to require authentication
4. THE Time Tracking Page SHALL be wrapped in PageErrorBoundary for error handling
5. THE Time Tracking Page SHALL use the existing AppLayout component for consistent UI
6. THE Web App SHALL use the existing apiClient for all backend API calls
7. THE Web App SHALL use the existing useAuthStore for authentication state
8. THE Web App SHALL follow the established component structure (pages, components, services, stores)

### Requirement 2: Time Tracking Page Layout

**User Story:** As a user, I want a desktop-optimized layout for time tracking, so that I can view multiple pieces of information simultaneously without scrolling.

#### Acceptance Criteria

1. THE Time Tracking Page SHALL use a two-column layout on desktop screens (≥1024px width)
2. THE left column SHALL display the task list with search and filters
3. THE right column SHALL display the active timer and time entry form
4. THE Time Tracking Page SHALL use a single-column layout on tablet screens (<1024px width)
5. THE Time Tracking Page SHALL be responsive and adapt to different screen sizes
6. THE Time Tracking Page SHALL maintain the existing web app visual style and color scheme
7. THE Time Tracking Page SHALL display a page header with title "Time Tracking"
8. THE Time Tracking Page SHALL use the existing CSS patterns and component styles

### Requirement 3: Task List Display and Sorting

**User Story:** As a user, I want to see tasks sorted by relevance to me, so that I can quickly find and select the task I'm currently working on.

#### Acceptance Criteria

1. THE Web App SHALL fetch tasks from the backend API endpoint `/api/v1/time-tracking/tasks`
2. THE Web App SHALL display tasks in the following order:
   - Tasks with active tracking by the logged-in user (highest priority)
   - Tasks scheduled next (medium priority)
   - All other tasks (lowest priority)
3. WHEN displaying tasks, THE Web App SHALL show task title, description (truncated to 100 characters), and worked_sum
4. THE Web App SHALL display a visual indicator (timer icon) for tasks with active tracking
5. THE Web App SHALL format worked_sum as "Xh Ym" (e.g., "2h 30m")
6. WHEN a task has no time entries, THE Web App SHALL display "0h 0m" as the worked_sum
7. THE Web App SHALL display tasks in a scrollable list with fixed height
8. THE Web App SHALL highlight the currently selected task with a distinct background color

### Requirement 4: Task Search and Filtering

**User Story:** As a user, I want to search and filter tasks, so that I can quickly find specific tasks in large projects.

#### Acceptance Criteria

1. THE Time Tracking Page SHALL provide a search input field above the task list
2. WHEN the user types in the search field, THE Web App SHALL filter tasks by title or description (case-insensitive)
3. THE Web App SHALL debounce search input by 300ms to avoid excessive filtering
4. THE Web App SHALL display "No tasks found" when search returns zero results
5. THE Web App SHALL provide a "Clear" button to reset the search filter
6. THE Web App SHALL display the count of filtered tasks (e.g., "Showing 5 of 20 tasks")
7. THE search SHALL be performed client-side on the fetched task list
8. THE Web App SHALL preserve search state when navigating away and returning to the page

### Requirement 5: Time Tracking Start/Stop

**User Story:** As a user, I want a simple start/stop interface for time tracking, so that I can quickly begin and end time recording with minimal interaction.

#### Acceptance Criteria

1. WHEN the user selects a task from the list, THE Web App SHALL display the task details in the right column
2. THE right column SHALL display the task title and full description
3. WHEN no active tracking exists for the user, THE Web App SHALL display a "Start Tracking" button
4. WHEN the user clicks "Start Tracking", THE Web App SHALL call the backend API `/api/v1/time-tracking/start`
5. WHEN active tracking exists, THE Web App SHALL display a "Stop Tracking" button and elapsed time
6. THE Web App SHALL update the elapsed time display every second while tracking is active
7. THE elapsed time SHALL be displayed in "HH:MM:SS" format
8. WHEN the user clicks "Stop Tracking", THE Web App SHALL call the backend API `/api/v1/time-tracking/stop`
9. THE Web App SHALL display a success notification when time tracking starts or stops successfully
10. THE Web App SHALL display an error notification if the API call fails
11. THE Web App SHALL prevent starting multiple time entries simultaneously for the same user
12. THE Web App SHALL check for active tracking on page load by calling `/api/v1/time-tracking/active`

### Requirement 6: Time Entry Description

**User Story:** As a user, I want to add descriptions to my time entries, so that I can provide context about what work was performed during the tracked time.

#### Acceptance Criteria

1. THE right column SHALL provide a textarea input field for description
2. THE description field SHALL support multi-line text input
3. THE description field SHALL have a maximum length of 500 characters
4. THE Web App SHALL display a character count indicator below the description field (e.g., "250/500")
5. WHEN the user starts time tracking, THE Web App SHALL include the description in the API request
6. WHEN the user stops time tracking, THE Web App SHALL include the description in the API request
7. THE Web App SHALL allow editing the description while tracking is active
8. THE description field SHALL be optional (can be empty)
9. THE Web App SHALL preserve the description text when switching between tasks (if not tracking)

### Requirement 7: Time Entry History Display

**User Story:** As a user, I want to view my time entry history on the same page, so that I can review what I've worked on without navigating away.

#### Acceptance Criteria

1. THE Time Tracking Page SHALL display a "Recent Entries" section below the timer controls
2. THE Recent Entries section SHALL display the 10 most recent time entries for the logged-in user
3. WHEN displaying time entries, THE Web App SHALL show task title, date, start time, end time, duration, and description (truncated)
4. THE Web App SHALL group time entries by date (most recent first)
5. THE Web App SHALL display dates in "MMM DD, YYYY" format (e.g., "Jan 15, 2024")
6. THE Web App SHALL display times in "HH:MM" format (e.g., "09:30")
7. THE Web App SHALL display duration in "Xh Ym" format (e.g., "2h 30m")
8. THE Web App SHALL fetch time entry history from the backend API `/api/v1/time-tracking/entries`
9. THE Web App SHALL provide a "Load More" button to fetch additional entries
10. THE Web App SHALL display "No time entries yet" when the user has no history

### Requirement 8: Real-Time Timer Updates

**User Story:** As a user, I want the timer to update in real-time, so that I can see how long I've been working on the current task.

#### Acceptance Criteria

1. WHEN active tracking exists, THE Web App SHALL start a JavaScript interval to update the elapsed time
2. THE interval SHALL update the display every 1000ms (1 second)
3. THE Web App SHALL calculate elapsed time as the difference between current time and start time
4. THE Web App SHALL clear the interval when tracking stops
5. THE Web App SHALL clear the interval when the component unmounts
6. THE Web App SHALL handle timezone differences correctly using UTC timestamps
7. THE Web App SHALL continue updating the timer even if the user switches browser tabs
8. THE Web App SHALL resume the correct elapsed time when the user returns to the page

### Requirement 9: Network Error Handling

**User Story:** As a user, I want clear feedback when network errors occur, so that I understand when operations fail due to connectivity issues.

#### Acceptance Criteria

1. WHEN the backend API is unavailable, THE Web App SHALL display a user-friendly error message
2. WHEN a network error occurs during tracking operations, THE Web App SHALL display the specific error
3. THE Web App SHALL provide a retry button for failed operations
4. THE Web App SHALL log network errors to the browser console for debugging
5. THE Web App SHALL not expose sensitive information in error messages
6. WHEN authentication fails due to network issues, THE Web App SHALL prompt the user to retry
7. THE Web App SHALL display loading indicators during API calls to provide feedback
8. THE Web App SHALL timeout long-running requests after 30 seconds
9. THE Web App SHALL handle API rate limiting gracefully with appropriate messages
10. THE Web App SHALL validate network responses before updating UI state

### Requirement 10: Keyboard Shortcuts and Accessibility

**User Story:** As a user, I want keyboard shortcuts for common actions, so that I can track time efficiently without using the mouse.

#### Acceptance Criteria

1. THE Web App SHALL support keyboard shortcut "Ctrl+Space" (or "Cmd+Space" on Mac) to start/stop tracking
2. THE Web App SHALL support keyboard shortcut "Ctrl+F" (or "Cmd+F" on Mac) to focus the search field
3. THE Web App SHALL support arrow keys to navigate the task list
4. THE Web App SHALL support "Enter" key to select a task from the list
5. THE Web App SHALL support "Escape" key to clear search or deselect task
6. THE Web App SHALL display keyboard shortcuts in a help tooltip or modal
7. THE Web App SHALL provide ARIA labels for all interactive elements
8. THE Web App SHALL support screen readers with proper semantic HTML
9. THE Web App SHALL ensure all functionality is accessible via keyboard navigation
10. THE Web App SHALL display focus indicators for keyboard navigation

### Requirement 11: State Management with Zustand

**User Story:** As a developer, I want centralized state management for time tracking, so that the application state is predictable and maintainable.

#### Acceptance Criteria

1. THE Web App SHALL create a new Zustand store `useTimeTrackingStore`
2. THE store SHALL manage tasks list, active tracking state, time entries, and loading states
3. THE store SHALL provide actions for fetching tasks, starting tracking, stopping tracking, and fetching history
4. THE store SHALL handle error states and error messages
5. THE store SHALL follow the same pattern as existing stores (workitemStore, authStore)
6. THE store SHALL persist active tracking state in localStorage for page refresh recovery
7. THE store SHALL clear localStorage when tracking stops successfully
8. THE store SHALL provide computed values for filtered tasks and sorted tasks
9. THE store SHALL handle optimistic updates for better user experience
10. THE store SHALL validate data before updating state

### Requirement 12: Service Layer Implementation

**User Story:** As a developer, I want a dedicated service for time tracking API calls, so that API logic is separated from UI components.

#### Acceptance Criteria

1. THE Web App SHALL create a new service `timeTrackingService.ts`
2. THE service SHALL use the existing apiClient for all HTTP requests
3. THE service SHALL provide methods: `getTasks()`, `startTracking()`, `stopTracking()`, `getActiveTracking()`, `getEntries()`
4. THE service SHALL handle API errors and throw descriptive error messages
5. THE service SHALL use TypeScript interfaces for all request and response types
6. THE service SHALL follow the same pattern as existing services (workitemService, scheduleService)
7. THE service SHALL log API calls using the existing logger service
8. THE service SHALL include request/response type definitions
9. THE service SHALL handle pagination for time entry history
10. THE service SHALL validate request data before sending to the backend

### Requirement 13: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages and feedback, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the backend API is unavailable, THE Web App SHALL display a user-friendly error notification
2. WHEN authentication fails, THE Web App SHALL redirect to the login page
3. WHEN a time entry validation fails, THE Web App SHALL display the validation error message
4. THE Web App SHALL validate that description doesn't exceed 500 characters before submitting
5. THE Web App SHALL display success notifications for start/stop actions
6. THE Web App SHALL display error notifications with retry options
7. THE Web App SHALL use toast notifications for non-blocking feedback
8. THE Web App SHALL display inline error messages for form validation
9. THE Web App SHALL log errors to the browser console for debugging
10. THE Web App SHALL not expose sensitive information in error messages

### Requirement 14: Performance and Optimization

**User Story:** As a user, I want a fast and responsive application, so that time tracking doesn't interrupt my workflow.

#### Acceptance Criteria

1. THE Time Tracking Page SHALL load within 2 seconds on a typical broadband connection
2. THE Web App SHALL respond to user interactions (button clicks, navigation) within 100ms
3. THE Web App SHALL display loading indicators for operations taking longer than 500ms
4. THE Web App SHALL use React.memo for task list items to prevent unnecessary re-renders
5. THE Web App SHALL debounce search input to avoid excessive filtering
6. THE Web App SHALL cache task list data for 5 minutes to reduce API calls
7. THE Web App SHALL use optimistic UI updates for start/stop actions
8. THE Web App SHALL lazy load time entry history (load more on demand)
9. THE Web App SHALL minimize bundle size by avoiding unnecessary dependencies
10. THE Web App SHALL use efficient data structures for task filtering and sorting

### Requirement 15: Browser Compatibility and Storage

**User Story:** As a user, I want the time tracking feature to work across modern browsers, so that I can use my preferred browser.

#### Acceptance Criteria

1. THE Web App SHALL support Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+
2. THE Web App SHALL use localStorage for persisting offline queue and active tracking state
3. THE Web App SHALL handle localStorage quota exceeded errors gracefully
4. THE Web App SHALL provide a fallback when localStorage is unavailable (private browsing)
5. THE Web App SHALL use sessionStorage for temporary UI state (search filters)
6. THE Web App SHALL clear old localStorage data on logout
7. THE Web App SHALL validate localStorage data on page load to prevent corruption
8. THE Web App SHALL use JSON serialization for complex objects in localStorage
9. THE Web App SHALL handle browser timezone differences correctly
10. THE Web App SHALL work correctly when cookies are disabled (using localStorage for state)

### Requirement 16: Integration with Existing Features

**User Story:** As a user, I want time tracking to integrate with existing features, so that I have a cohesive experience across the application.

#### Acceptance Criteria

1. THE Web App SHALL use the existing authentication system (useAuthStore)
2. THE Web App SHALL use the existing API client with JWT token handling
3. THE Web App SHALL use the existing logger service for logging
4. THE Web App SHALL use the existing error handling patterns (PageErrorBoundary)
5. THE Web App SHALL use the existing navigation system (NavigationHeader)
6. THE Web App SHALL use the existing notification system (if available) or implement toast notifications
7. THE Web App SHALL follow the existing code style and formatting standards
8. THE Web App SHALL use the existing TypeScript configuration and type definitions
9. THE Web App SHALL integrate with the existing build and test infrastructure
10. THE Web App SHALL follow the existing component naming and file structure conventions

# Requirements Document: Mobile Time Tracking App

## Introduction

This document specifies the requirements for the RxDx Mobile Time Tracking App, a React Native mobile application for iOS and Android that enables project team members to track time spent on tasks with a simple start/stop interface. The app integrates with the RxDx backend API to synchronize time entries in real-time.

## Glossary

- **Mobile App**: The React Native application for iOS and Android
- **Worked Node**: A graph database node representing a time tracking entry
- **Task**: A WorkItem of type "task" in the RxDx system
- **Active Tracking**: A time entry that has been started but not yet stopped
- **Worked Sum**: The total time worked on a task (aggregate of all worked nodes)
- **Backend API**: The RxDx FastAPI backend service
- **Time Entry**: A completed worked node with start and end times

## Requirements

### Requirement 1: Mobile App Platform Support

**User Story:** As a project team member, I want the time tracking app to work on both iOS and Android devices, so that I can use it regardless of my mobile platform preference.

#### Acceptance Criteria

1. THE Mobile App SHALL be built using React Native for cross-platform compatibility
2. THE Mobile App SHALL support iOS 13.0 and later
3. THE Mobile App SHALL support Android 8.0 (API level 26) and later
4. THE Mobile App SHALL use React Navigation for screen navigation
5. THE Mobile App SHALL use AsyncStorage for local data persistence
6. THE Mobile App SHALL have a consistent user experience across iOS and Android platforms
7. THE Mobile App SHALL follow platform-specific design guidelines (iOS Human Interface Guidelines, Material Design)

### Requirement 2: Authentication and Security

**User Story:** As a user, I want secure authentication in the mobile app, so that only authorized personnel can track time on project tasks.

#### Acceptance Criteria

1. WHEN the app is first launched, THE Mobile App SHALL display a login screen
2. THE Mobile App SHALL authenticate users using the same credentials as the web application
3. WHEN authentication succeeds, THE Mobile App SHALL store the JWT token securely using AsyncStorage
4. THE Mobile App SHALL include the JWT token in all API requests to the backend
5. WHEN the JWT token expires, THE Mobile App SHALL automatically refresh the token or prompt for re-authentication
6. THE Mobile App SHALL provide a logout function that clears stored credentials
7. THE Mobile App SHALL validate SSL/TLS certificates when communicating with the backend
8. THE Mobile App SHALL not store passwords locally

### Requirement 3: Task Selection and Sorting

**User Story:** As a user, I want to see tasks sorted by relevance to me, so that I can quickly find and select the task I'm currently working on.

#### Acceptance Criteria

1. WHEN the user opens the task selector, THE Mobile App SHALL display tasks in the following order:
   - Tasks already started by the logged-in user (highest priority)
   - Tasks scheduled next (medium priority)
   - All other tasks (lowest priority)
2. THE Mobile App SHALL fetch the sorted task list from the backend API endpoint `/api/v1/time-tracking/tasks`
3. WHEN displaying tasks, THE Mobile App SHALL show task title, description (truncated), and worked_sum
4. THE Mobile App SHALL support search functionality to filter tasks by title or description
5. THE Mobile App SHALL support pull-to-refresh to reload the task list
6. WHEN a task has active tracking, THE Mobile App SHALL display a visual indicator (e.g., timer icon)
7. THE Mobile App SHALL cache the task list locally for offline viewing
8. WHEN the network is unavailable, THE Mobile App SHALL display cached tasks with an offline indicator

### Requirement 4: Time Tracking Start/Stop

**User Story:** As a user, I want a simple start/stop interface for time tracking, so that I can quickly begin and end time recording with minimal interaction.

#### Acceptance Criteria

1. WHEN the user selects a task, THE Mobile App SHALL navigate to the time tracking screen
2. THE time tracking screen SHALL display the task title and description
3. WHEN no active tracking exists for the user, THE Mobile App SHALL display a "Start" button
4. WHEN the user taps "Start", THE Mobile App SHALL call the backend API `/api/v1/time-tracking/start` to create a worked node
5. WHEN active tracking exists, THE Mobile App SHALL display a "Stop" button and elapsed time
6. THE Mobile App SHALL update the elapsed time display every second while tracking is active
7. WHEN the user taps "Stop", THE Mobile App SHALL call the backend API `/api/v1/time-tracking/stop` to complete the worked node
8. THE Mobile App SHALL display a success message when time tracking starts or stops successfully
9. THE Mobile App SHALL display an error message if the API call fails
10. THE Mobile App SHALL prevent starting multiple time entries simultaneously for the same user
11. WHEN the app is closed or backgrounded during active tracking, THE Mobile App SHALL continue tracking time
12. WHEN the app is reopened during active tracking, THE Mobile App SHALL resume displaying the elapsed time

### Requirement 5: Time Entry Description

**User Story:** As a user, I want to add descriptions to my time entries, so that I can provide context about what work was performed during the tracked time.

#### Acceptance Criteria

1. THE time tracking screen SHALL provide an optional text input field for description
2. THE description field SHALL support multi-line text input
3. THE description field SHALL have a maximum length of 500 characters
4. WHEN the user starts time tracking, THE Mobile App SHALL include the description in the API request
5. WHEN the user stops time tracking, THE Mobile App SHALL preserve the description in the worked node
6. THE Mobile App SHALL allow editing the description while tracking is active
7. THE Mobile App SHALL display a character count indicator for the description field

### Requirement 6: Time Entry History

**User Story:** As a user, I want to view my time entry history, so that I can review what I've worked on and verify my time records.

#### Acceptance Criteria

1. THE Mobile App SHALL provide a "History" screen accessible from the main navigation
2. THE History screen SHALL display all time entries for the logged-in user
3. WHEN displaying time entries, THE Mobile App SHALL show task title, date, start time, end time, duration, and description
4. THE Mobile App SHALL group time entries by date (most recent first)
5. THE Mobile App SHALL calculate and display the total duration for each day
6. THE Mobile App SHALL support filtering time entries by date range
7. THE Mobile App SHALL support searching time entries by task title or description
8. THE Mobile App SHALL allow users to tap a time entry to view full details
9. THE Mobile App SHALL fetch time entry history from the backend API
10. THE Mobile App SHALL cache time entry history locally for offline viewing

### Requirement 7: Worked Sum Display

**User Story:** As a user, I want to see the total time worked on each task, so that I can understand how much effort has been invested in different tasks.

#### Acceptance Criteria

1. WHEN displaying tasks in the task selector, THE Mobile App SHALL show the worked_sum for each task
2. THE worked_sum SHALL be displayed in hours and minutes format (e.g., "2h 30m")
3. THE Mobile App SHALL fetch worked_sum data from the backend API
4. WHEN a task has no time entries, THE Mobile App SHALL display "0h 0m" as the worked_sum
5. THE Mobile App SHALL update the worked_sum after stopping time tracking
6. THE worked_sum SHALL include time entries from all users, not just the logged-in user

### Requirement 8: Offline Support and Synchronization

**User Story:** As a user, I want the app to work offline and synchronize when network is available, so that I can track time even in areas with poor connectivity.

#### Acceptance Criteria

1. WHEN the network is unavailable, THE Mobile App SHALL queue time tracking operations locally
2. THE Mobile App SHALL store queued operations in AsyncStorage
3. WHEN the network becomes available, THE Mobile App SHALL automatically synchronize queued operations with the backend
4. THE Mobile App SHALL display a sync status indicator showing pending operations
5. WHEN synchronization fails, THE Mobile App SHALL retry with exponential backoff
6. THE Mobile App SHALL allow users to manually trigger synchronization
7. THE Mobile App SHALL display an offline indicator when network is unavailable
8. THE Mobile App SHALL prevent data loss by persisting all time entries locally before attempting API calls

### Requirement 9: User Experience and Performance

**User Story:** As a user, I want a fast and responsive app, so that time tracking doesn't interrupt my workflow.

#### Acceptance Criteria

1. THE Mobile App SHALL load the task list within 2 seconds on a typical mobile network
2. THE Mobile App SHALL respond to user interactions (button taps, navigation) within 100ms
3. THE Mobile App SHALL display loading indicators for operations taking longer than 500ms
4. THE Mobile App SHALL use optimistic UI updates to provide immediate feedback
5. THE Mobile App SHALL cache API responses to improve performance
6. THE Mobile App SHALL minimize battery consumption during active tracking
7. THE Mobile App SHALL support dark mode based on device settings
8. THE Mobile App SHALL be accessible with proper labels for screen readers
9. THE Mobile App SHALL support landscape and portrait orientations
10. THE Mobile App SHALL handle errors gracefully with user-friendly error messages

### Requirement 10: Notifications and Background Tracking

**User Story:** As a user, I want notifications to remind me about active time tracking, so that I don't forget to stop tracking when I finish a task.

#### Acceptance Criteria

1. WHEN time tracking has been active for 4 hours, THE Mobile App SHALL display a notification reminding the user to stop tracking
2. THE Mobile App SHALL request notification permissions on first launch
3. THE Mobile App SHALL display a persistent notification while time tracking is active
4. THE persistent notification SHALL show the task title and elapsed time
5. THE persistent notification SHALL provide a "Stop" action to stop tracking without opening the app
6. WHEN the user taps the persistent notification, THE Mobile App SHALL open to the time tracking screen
7. THE Mobile App SHALL continue tracking time when the app is in the background
8. THE Mobile App SHALL update the persistent notification every minute with the current elapsed time

### Requirement 11: Error Handling and Validation

**User Story:** As a user, I want clear error messages and validation, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the backend API is unavailable, THE Mobile App SHALL display a user-friendly error message
2. WHEN authentication fails, THE Mobile App SHALL display the specific error (invalid credentials, account locked, etc.)
3. WHEN a time entry validation fails, THE Mobile App SHALL display the validation error message
4. THE Mobile App SHALL validate that end time is after start time before submitting
5. THE Mobile App SHALL validate that the description doesn't exceed the maximum length
6. THE Mobile App SHALL validate that required fields are filled before submitting
7. THE Mobile App SHALL provide retry options for failed operations
8. THE Mobile App SHALL log errors locally for debugging purposes
9. THE Mobile App SHALL not expose sensitive information in error messages

### Requirement 12: Configuration and Settings

**User Story:** As a user, I want to configure app settings, so that I can customize the app behavior to my preferences.

#### Acceptance Criteria

1. THE Mobile App SHALL provide a Settings screen accessible from the main navigation
2. THE Settings screen SHALL allow users to configure the backend API URL
3. THE Settings screen SHALL display the current app version
4. THE Settings screen SHALL display the logged-in user's name and email
5. THE Settings screen SHALL provide a logout button
6. THE Settings screen SHALL allow users to enable/disable notifications
7. THE Settings screen SHALL allow users to configure the notification reminder interval (default 4 hours)
8. THE Settings screen SHALL allow users to clear cached data
9. THE Settings screen SHALL allow users to view and manage queued offline operations
10. THE Settings screen SHALL provide a link to the user guide documentation


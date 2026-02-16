# Design Document: Mobile Time Tracking App

## Overview

The RxDx Mobile Time Tracking App is a React Native application that provides a simple, intuitive interface for tracking time spent on project tasks. The app integrates with the existing RxDx backend API and follows mobile-first design principles for optimal user experience on iOS and Android devices.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Mobile App (React Native)        │
│  ┌────────────────────────────────────┐ │
│  │      Presentation Layer            │ │
│  │  - Screens (Login, Tasks, Timer)   │ │
│  │  - Components (TaskCard, Timer)    │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │      State Management              │ │
│  │  - Context API / Redux             │ │
│  │  - Local State (useState)          │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │      Services Layer                │ │
│  │  - API Client (axios)              │ │
│  │  - Auth Service                    │ │
│  │  - Time Tracking Service           │ │
│  │  - Storage Service (AsyncStorage)  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    │ HTTPS/REST API
                    ▼
┌─────────────────────────────────────────┐
│         RxDx Backend (FastAPI)          │
│  - /api/v1/auth/login                   │
│  - /api/v1/time-tracking/start          │
│  - /api/v1/time-tracking/stop           │
│  - /api/v1/time-tracking/tasks          │
│  - /api/v1/time-tracking/active         │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: React Native 0.73+
- **Language**: TypeScript
- **Navigation**: React Navigation 6.x
- **State Management**: React Context API + useReducer (or Redux Toolkit if complexity grows)
- **HTTP Client**: axios
- **Local Storage**: @react-native-async-storage/async-storage
- **UI Components**: React Native Paper (Material Design) or React Native Elements
- **Date/Time**: date-fns or dayjs
- **Notifications**: @notifee/react-native or react-native-push-notification
- **Testing**: Jest + React Native Testing Library

## Screen Design

### 1. Login Screen

**Purpose**: Authenticate users with the RxDx backend

**Components**:
- Logo/App name
- Email input field
- Password input field
- Login button
- Error message display
- Loading indicator

**State**:
```typescript
interface LoginState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}
```

**API Calls**:
- `POST /api/v1/auth/login` - Authenticate user

### 2. Task Selector Screen

**Purpose**: Display sorted list of tasks for time tracking

**Components**:
- Search bar
- Task list (FlatList)
- Task card component
- Pull-to-refresh
- Empty state
- Loading indicator
- Offline indicator

**Task Card**:
- Task title
- Task description (truncated)
- Worked sum (e.g., "2h 30m")
- Active tracking indicator (if applicable)
- Priority indicator (visual cue for started/scheduled/other)

**State**:
```typescript
interface TaskSelectorState {
  tasks: Task[];
  searchQuery: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isOffline: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number; // 1=started, 2=scheduled, 3=other
  scheduled_start: string | null;
  scheduled_end: string | null;
  worked_sum?: string; // e.g., "2h 30m"
  has_active_tracking?: boolean;
}
```

**API Calls**:
- `GET /api/v1/time-tracking/tasks` - Get sorted task list
- `GET /api/v1/time-tracking/active` - Get active tracking entries

### 3. Time Tracking Screen

**Purpose**: Start/stop time tracking for a selected task

**Components**:
- Task title and description
- Timer display (elapsed time)
- Start/Stop button
- Description input field
- Character count
- Success/Error message display

**State**:
```typescript
interface TimeTrackingState {
  task: Task;
  workedEntry: WorkedEntry | null;
  elapsedTime: number; // seconds
  description: string;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
}

interface WorkedEntry {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
  date: string;
}
```

**Timer Logic**:
- Update every second using `setInterval`
- Calculate elapsed time from start_time to current time
- Format as "HH:MM:SS"
- Persist timer state to AsyncStorage
- Resume timer on app reopen

**API Calls**:
- `POST /api/v1/time-tracking/start` - Start time tracking
- `POST /api/v1/time-tracking/stop` - Stop time tracking

### 4. History Screen

**Purpose**: View past time entries

**Components**:
- Date range filter
- Search bar
- Time entry list (SectionList grouped by date)
- Time entry card
- Daily total
- Empty state

**Time Entry Card**:
- Task title
- Start time - End time
- Duration
- Description
- Date

**State**:
```typescript
interface HistoryState {
  entries: WorkedEntry[];
  filteredEntries: WorkedEntry[];
  searchQuery: string;
  dateRange: { start: Date; end: Date };
  isLoading: boolean;
  error: string | null;
}
```

**API Calls**:
- `GET /api/v1/time-tracking/entries` - Get time entry history (to be implemented)

### 5. Settings Screen

**Purpose**: Configure app settings and view user info

**Components**:
- User info section (name, email)
- API URL configuration
- Notification settings toggle
- Notification interval picker
- Clear cache button
- Logout button
- App version display
- Link to user guide

**State**:
```typescript
interface SettingsState {
  user: User | null;
  apiUrl: string;
  notificationsEnabled: boolean;
  notificationInterval: number; // hours
  appVersion: string;
}
```

## Navigation Structure

```
Stack Navigator
├── Auth Stack (not authenticated)
│   └── Login Screen
└── Main Stack (authenticated)
    ├── Tab Navigator
    │   ├── Tasks Tab → Task Selector Screen
    │   ├── History Tab → History Screen
    │   └── Settings Tab → Settings Screen
    └── Time Tracking Screen (modal)
```

## Data Models

### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority: number; // 1=started, 2=scheduled, 3=other
  scheduled_start: string | null; // ISO 8601
  scheduled_end: string | null; // ISO 8601
  worked_sum?: string; // e.g., "2h 30m"
  has_active_tracking?: boolean;
}
```

### WorkedEntry

```typescript
interface WorkedEntry {
  id: string;
  resource: string; // user_id
  task_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string | null; // HH:MM:SS
  description: string | null;
  created_at: string; // ISO 8601
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}
```

## Services

### 1. API Service

**Purpose**: Handle all HTTP requests to the backend

```typescript
class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string);
  
  setToken(token: string): void;
  clearToken(): void;
  
  // Auth
  login(email: string, password: string): Promise<{ token: string; user: User }>;
  
  // Time Tracking
  startTracking(taskId: string, description?: string): Promise<WorkedEntry>;
  stopTracking(workedId: string): Promise<WorkedEntry>;
  getActivTracking(): Promise<WorkedEntry[]>;
  getTasks(): Promise<Task[]>;
  getTaskWorkedSum(taskId: string): Promise<number>;
  
  // Generic request handler
  private request<T>(method: string, endpoint: string, data?: any): Promise<T>;
}
```

### 2. Auth Service

**Purpose**: Manage authentication state and token storage

```typescript
class AuthService {
  async login(email: string, password: string): Promise<User>;
  async logout(): Promise<void>;
  async getStoredToken(): Promise<string | null>;
  async getStoredUser(): Promise<User | null>;
  async storeToken(token: string): Promise<void>;
  async storeUser(user: User): Promise<void>;
  async clearAuth(): Promise<void>;
}
```

### 3. Storage Service

**Purpose**: Wrapper around AsyncStorage for type-safe storage

```typescript
class StorageService {
  async setItem<T>(key: string, value: T): Promise<void>;
  async getItem<T>(key: string): Promise<T | null>;
  async removeItem(key: string): Promise<void>;
  async clear(): Promise<void>;
}
```

### 4. Notification Service

**Purpose**: Handle local notifications

```typescript
class NotificationService {
  async requestPermissions(): Promise<boolean>;
  async scheduleReminder(hours: number): Promise<void>;
  async showPersistentNotification(taskTitle: string, elapsedTime: string): Promise<void>;
  async cancelPersistentNotification(): Promise<void>;
  async cancelAllNotifications(): Promise<void>;
}
```

### 5. Sync Service

**Purpose**: Handle offline queue and synchronization

```typescript
interface QueuedOperation {
  id: string;
  type: 'start' | 'stop' | 'add';
  data: any;
  timestamp: number;
  retryCount: number;
}

class SyncService {
  async queueOperation(operation: QueuedOperation): Promise<void>;
  async getQueuedOperations(): Promise<QueuedOperation[]>;
  async syncAll(): Promise<void>;
  async removeOperation(id: string): Promise<void>;
  private async syncOperation(operation: QueuedOperation): Promise<void>;
}
```

## State Management

### Context Structure

```typescript
// Auth Context
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Time Tracking Context
interface TimeTrackingContextType {
  activeEntry: WorkedEntry | null;
  elapsedTime: number;
  isTracking: boolean;
  startTracking: (taskId: string, description?: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateDescription: (description: string) => void;
}

// Tasks Context
interface TasksContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  searchTasks: (query: string) => Task[];
}
```

## Offline Support

### Strategy

1. **Queue Operations**: Store failed API calls in AsyncStorage
2. **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s, 16s, max 60s)
3. **Sync on Connect**: Automatically sync when network becomes available
4. **Optimistic Updates**: Update UI immediately, rollback on failure
5. **Conflict Resolution**: Last-write-wins for time entries

### Queued Operation Storage

```typescript
// AsyncStorage key: 'queued_operations'
interface QueuedOperations {
  operations: QueuedOperation[];
}

// Example queued operation
{
  id: 'uuid-1234',
  type: 'start',
  data: {
    task_id: 'task-uuid',
    description: 'Working on feature X'
  },
  timestamp: 1234567890,
  retryCount: 0
}
```

## Error Handling

### Error Types

```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
}
```

### Error Display

- **Network Errors**: "Unable to connect. Please check your internet connection."
- **Auth Errors**: "Invalid credentials. Please try again."
- **Validation Errors**: Display specific validation message from backend
- **Server Errors**: "Something went wrong. Please try again later."

## Performance Optimization

### Strategies

1. **Lazy Loading**: Load screens on demand
2. **Memoization**: Use `React.memo` for expensive components
3. **FlatList Optimization**: Use `getItemLayout`, `removeClippedSubviews`
4. **Image Optimization**: Use appropriate image sizes and formats
5. **Debouncing**: Debounce search input (300ms)
6. **Caching**: Cache API responses with TTL
7. **Background Tasks**: Use background fetch for sync

### Caching Strategy

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

// Cache keys
const CACHE_KEYS = {
  TASKS: 'cache_tasks',
  ACTIVE_TRACKING: 'cache_active_tracking',
  HISTORY: 'cache_history',
};

// TTL values
const CACHE_TTL = {
  TASKS: 5 * 60 * 1000, // 5 minutes
  ACTIVE_TRACKING: 1 * 60 * 1000, // 1 minute
  HISTORY: 10 * 60 * 1000, // 10 minutes
};
```

## Security Considerations

### Token Storage

- Store JWT token in AsyncStorage (encrypted on iOS, keychain on Android)
- Never log tokens or sensitive data
- Clear token on logout

### API Communication

- Use HTTPS only
- Validate SSL certificates
- Include token in Authorization header: `Bearer <token>`
- Handle 401 responses by clearing auth and redirecting to login

### Input Validation

- Sanitize user input before sending to API
- Validate email format
- Validate description length (max 500 characters)
- Validate time ranges (end > start)

## Testing Strategy

### Unit Tests

- Test utility functions (time formatting, validation)
- Test service methods (API calls, storage)
- Test reducers and context logic

### Component Tests

- Test component rendering
- Test user interactions (button clicks, input changes)
- Test conditional rendering (loading, error states)

### Integration Tests

- Test navigation flows
- Test API integration with mock server
- Test offline queue and sync

### E2E Tests (Optional)

- Test complete user flows (login → select task → start/stop tracking)
- Test offline scenarios
- Test notification behavior

## Accessibility

### Requirements

- All interactive elements must have accessible labels
- Support screen readers (VoiceOver on iOS, TalkBack on Android)
- Minimum touch target size: 44x44 points
- Sufficient color contrast (WCAG AA)
- Support dynamic text sizing

### Implementation

```typescript
// Example accessible button
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Start time tracking"
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading }}
>
  <Text>Start</Text>
</TouchableOpacity>
```

## Internationalization (Future)

While not required for initial release, the app should be structured to support internationalization:

- Use i18n library (react-i18next)
- Extract all user-facing strings to translation files
- Support date/time formatting for different locales
- Support RTL languages

## Build and Deployment

### iOS

- Xcode 14+
- CocoaPods for dependencies
- Build configurations: Debug, Release
- Code signing with Apple Developer account
- TestFlight for beta testing
- App Store submission

### Android

- Android Studio
- Gradle build system
- Build variants: debug, release
- Code signing with keystore
- Google Play Console for beta testing
- Google Play Store submission

### CI/CD (Future)

- GitHub Actions or Bitrise
- Automated builds on commit
- Automated testing
- Automated deployment to TestFlight/Play Console

## Monitoring and Analytics (Future)

- Crash reporting (Sentry, Crashlytics)
- Analytics (Firebase Analytics, Mixpanel)
- Performance monitoring
- User behavior tracking

## Correctness Properties

### Property 1: Time Entry Integrity

**Property**: All time entries must have valid start and end times where end time is after start time.

**Validation**: Property-based test that generates random time entries and verifies end > start.

### Property 2: Active Tracking Uniqueness

**Property**: A user can have at most one active time entry at any given time.

**Validation**: Property-based test that attempts to start multiple tracking sessions and verifies only one succeeds.

### Property 3: Elapsed Time Accuracy

**Property**: The displayed elapsed time must match the difference between start time and current time.

**Validation**: Property-based test that generates random start times and verifies elapsed time calculation.

### Property 4: Offline Queue Ordering

**Property**: Queued operations must be processed in the order they were created (FIFO).

**Validation**: Property-based test that queues multiple operations and verifies sync order.

### Property 5: Token Persistence

**Property**: Authentication token must persist across app restarts until logout.

**Validation**: Property-based test that stores token, simulates app restart, and verifies token retrieval.

## Open Questions

1. Should we support editing time entries after they're created?
2. Should we support deleting time entries?
3. Should we support manual time entry creation (without start/stop)?
4. Should we support multiple simultaneous tasks (split time tracking)?
5. Should we support offline task creation?
6. Should we support biometric authentication (Face ID, Touch ID)?
7. Should we support Apple Watch / Wear OS companion apps?

## Future Enhancements

1. Widget support for quick start/stop
2. Siri Shortcuts / Google Assistant integration
3. Calendar integration
4. Geofencing (auto-start/stop based on location)
5. NFC tag support (tap to start/stop)
6. Team collaboration features
7. Time entry approval workflow
8. Export time entries to CSV/PDF
9. Detailed analytics and reports
10. Integration with invoicing systems


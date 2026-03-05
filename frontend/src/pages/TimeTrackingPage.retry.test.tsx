/**
 * TimeTrackingPage Retry Integration Tests
 * Tests error recovery with retry functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TimeTrackingPage } from './TimeTrackingPage';
import { useTimeTrackingStore } from '../stores/timeTrackingStore';
import type { Task } from '../services/timeTrackingService';

// Mock the store
vi.mock('../stores/timeTrackingStore');

// Mock child components
vi.mock('../components/timetracking/TaskListPanel', () => ({
  TaskListPanel: () => <div data-testid="task-list-panel">Task List</div>,
}));

vi.mock('../components/timetracking/TimerPanel', () => ({
  TimerPanel: () => <div data-testid="timer-panel">Timer</div>,
}));

vi.mock('../components/timetracking/TimeEntriesPanel', () => ({
  TimeEntriesPanel: () => <div data-testid="time-entries-panel">Entries</div>,
}));

describe('TimeTrackingPage - Error Recovery with Retry', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Task 1',
      description: 'Description',
      status: 'not_started',
      priority: 1,
      estimated_hours: 5,
      worked_sum: 0,
      has_active_tracking: false,
      user_is_tracking: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays retry button when operation fails', () => {
    const mockStore = {
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: 'Failed to fetch tasks',
      lastFailedOperation: { operation: 'fetchTasks' },
      fetchTasks: vi.fn(),
      checkActiveTracking: vi.fn(),
      fetchEntries: vi.fn(),
      selectTask: vi.fn(),
      setSearchQuery: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      loadMoreEntries: vi.fn(),
      clearError: vi.fn(),
      retryLastOperation: vi.fn(),
      getFilteredAndSortedTasks: vi.fn(() => []),
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStore as any);

    render(<TimeTrackingPage />);

    // Error message should be displayed
    expect(screen.getByText('Failed to fetch tasks')).toBeInTheDocument();

    // Retry button should be displayed
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('does not display retry button for validation errors', () => {
    const mockStore = {
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: 'You already have an active tracking session',
      lastFailedOperation: null, // No retry context for validation errors
      fetchTasks: vi.fn(),
      checkActiveTracking: vi.fn(),
      fetchEntries: vi.fn(),
      selectTask: vi.fn(),
      setSearchQuery: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      loadMoreEntries: vi.fn(),
      clearError: vi.fn(),
      retryLastOperation: vi.fn(),
      getFilteredAndSortedTasks: vi.fn(() => []),
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStore as any);

    render(<TimeTrackingPage />);

    // Error message should be displayed
    expect(screen.getByText('You already have an active tracking session')).toBeInTheDocument();

    // Retry button should NOT be displayed
    const retryButton = screen.queryByRole('button', { name: /retry/i });
    expect(retryButton).not.toBeInTheDocument();
  });

  it('calls retryLastOperation when retry button is clicked', async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const mockStore = {
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: 'Network error',
      lastFailedOperation: { operation: 'fetchTasks' },
      fetchTasks: vi.fn(),
      checkActiveTracking: vi.fn(),
      fetchEntries: vi.fn(),
      selectTask: vi.fn(),
      setSearchQuery: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      loadMoreEntries: vi.fn(),
      clearError: vi.fn(),
      retryLastOperation: mockRetry,
      getFilteredAndSortedTasks: vi.fn(() => []),
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStore as any);

    render(<TimeTrackingPage />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('clears error on successful retry', async () => {
    // First render with error
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const mockStoreWithError = {
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: 'Network error',
      lastFailedOperation: { operation: 'fetchTasks' },
      fetchTasks: vi.fn(),
      checkActiveTracking: vi.fn(),
      fetchEntries: vi.fn(),
      selectTask: vi.fn(),
      setSearchQuery: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      loadMoreEntries: vi.fn(),
      clearError: vi.fn(),
      retryLastOperation: mockRetry,
      getFilteredAndSortedTasks: vi.fn(() => []),
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStoreWithError as any);

    const { rerender } = render(<TimeTrackingPage />);

    // Click retry
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    // Simulate successful retry by updating store state
    const mockStoreAfterRetry = {
      ...mockStoreWithError,
      tasks: mockTasks,
      error: null,
      lastFailedOperation: null,
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStoreAfterRetry as any);

    rerender(<TimeTrackingPage />);

    // Error should be cleared
    expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('displays dismiss button alongside retry button', () => {
    const mockStore = {
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: 'Failed to start tracking',
      lastFailedOperation: {
        operation: 'startTracking',
        params: { taskId: 'task-1', description: 'Working' },
      },
      fetchTasks: vi.fn(),
      checkActiveTracking: vi.fn(),
      fetchEntries: vi.fn(),
      selectTask: vi.fn(),
      setSearchQuery: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      loadMoreEntries: vi.fn(),
      clearError: vi.fn(),
      retryLastOperation: vi.fn(),
      getFilteredAndSortedTasks: vi.fn(() => []),
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStore as any);

    render(<TimeTrackingPage />);

    // Both buttons should be present
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('clears error when dismiss button is clicked', () => {
    const mockClearError = vi.fn();
    const mockStore = {
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: 'Some error',
      lastFailedOperation: { operation: 'fetchTasks' },
      fetchTasks: vi.fn(),
      checkActiveTracking: vi.fn(),
      fetchEntries: vi.fn(),
      selectTask: vi.fn(),
      setSearchQuery: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      loadMoreEntries: vi.fn(),
      clearError: mockClearError,
      retryLastOperation: vi.fn(),
      getFilteredAndSortedTasks: vi.fn(() => []),
    };

    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStore as any);

    render(<TimeTrackingPage />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(mockClearError).toHaveBeenCalledTimes(1);
  });
});

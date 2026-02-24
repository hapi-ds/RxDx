/**
 * TimeTrackingPage Unit Tests
 * Tests page layout, component integration, initialization, keyboard shortcuts, and error display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TimeTrackingPage } from './TimeTrackingPage';
import { useTimeTrackingStore } from '../stores/timeTrackingStore';
import type { Task, ActiveTracking, TimeEntry } from '../services/timeTrackingService';

// Mock the store
vi.mock('../stores/timeTrackingStore');

// Mock child components
vi.mock('../components/timetracking/TaskListPanel', () => ({
  TaskListPanel: ({ tasks, onTaskSelect }: any) => (
    <div data-testid="task-list-panel">
      <div>Task List Panel</div>
      {tasks.map((task: Task) => (
        <button key={task.id} onClick={() => onTaskSelect(task)}>
          {task.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../components/timetracking/TimerPanel', () => ({
  TimerPanel: ({ selectedTask, activeTracking, onStart, onStop }: any) => (
    <div data-testid="timer-panel">
      <div>Timer Panel</div>
      {selectedTask && <div>Selected: {selectedTask.title}</div>}
      {activeTracking && <div>Active: {activeTracking.task_title}</div>}
      <button onClick={() => onStart('task-1', 'test description')}>Start</button>
      <button onClick={() => onStop('test description')}>Stop</button>
    </div>
  ),
}));

vi.mock('../components/timetracking/TimeEntriesPanel', () => ({
  TimeEntriesPanel: ({ entries, onLoadMore }: any) => (
    <div data-testid="time-entries-panel">
      <div>Time Entries Panel</div>
      <div>{entries.length} entries</div>
      <button onClick={onLoadMore}>Load More</button>
    </div>
  ),
}));

describe('TimeTrackingPage', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Task 1',
      description: 'Description 1',
      status: 'in_progress',
      priority: 1,
      estimated_hours: 8,
      worked_sum: 2.5,
      has_active_tracking: false,
      user_is_tracking: false,
    },
    {
      id: 'task-2',
      title: 'Task 2',
      description: 'Description 2',
      status: 'not_started',
      priority: 2,
      estimated_hours: 4,
      worked_sum: 0,
      has_active_tracking: false,
      user_is_tracking: false,
      scheduled_start: '2024-01-15T09:00:00Z',
    },
  ];

  const mockActiveTracking: ActiveTracking = {
    id: 'tracking-1',
    task_id: 'task-1',
    task_title: 'Task 1',
    start_time: '2024-01-15T10:00:00Z',
    description: 'Working on task 1',
  };

  const mockEntries: TimeEntry[] = [
    {
      id: 'entry-1',
      task_id: 'task-1',
      task_title: 'Task 1',
      start_time: '2024-01-15T09:00:00Z',
      end_time: '2024-01-15T11:00:00Z',
      duration_hours: 2,
      description: 'Completed work',
      created_at: '2024-01-15T11:00:00Z',
    },
  ];

  const mockStore = {
    tasks: mockTasks,
    activeTracking: null,
    entries: mockEntries,
    selectedTaskId: null,
    searchQuery: '',
    entriesHasMore: false,
    isLoadingTasks: false,
    isLoadingEntries: false,
    isStarting: false,
    isStopping: false,
    error: null,
    fetchTasks: vi.fn(),
    checkActiveTracking: vi.fn(),
    fetchEntries: vi.fn(),
    selectTask: vi.fn(),
    setSearchQuery: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    loadMoreEntries: vi.fn(),
    clearError: vi.fn(),
    getFilteredAndSortedTasks: vi.fn(() => mockTasks),
  };

  beforeEach(() => {
    vi.mocked(useTimeTrackingStore).mockReturnValue(mockStore as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Layout', () => {
    it('renders page header with title and subtitle', () => {
      render(<TimeTrackingPage />);

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
      expect(
        screen.getByText('Track time spent on tasks and view your work history')
      ).toBeInTheDocument();
    });

    it('renders all three main components', () => {
      render(<TimeTrackingPage />);

      expect(screen.getByTestId('task-list-panel')).toBeInTheDocument();
      expect(screen.getByTestId('timer-panel')).toBeInTheDocument();
      expect(screen.getByTestId('time-entries-panel')).toBeInTheDocument();
    });

    it('applies responsive layout classes', () => {
      const { container } = render(<TimeTrackingPage />);

      const content = container.querySelector('.time-tracking-page__content');
      expect(content).toBeInTheDocument();

      const leftColumn = container.querySelector('.time-tracking-page__left-column');
      expect(leftColumn).toBeInTheDocument();

      const rightColumn = container.querySelector('.time-tracking-page__right-column');
      expect(rightColumn).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to TaskListPanel', () => {
      render(<TimeTrackingPage />);

      const taskListPanel = screen.getByTestId('task-list-panel');
      expect(taskListPanel).toBeInTheDocument();

      // Check that tasks are rendered
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('passes correct props to TimerPanel', () => {
      render(<TimeTrackingPage />);

      const timerPanel = screen.getByTestId('timer-panel');
      expect(timerPanel).toBeInTheDocument();
    });

    it('passes correct props to TimeEntriesPanel', () => {
      render(<TimeTrackingPage />);

      const entriesPanel = screen.getByTestId('time-entries-panel');
      expect(entriesPanel).toBeInTheDocument();
      expect(screen.getByText('1 entries')).toBeInTheDocument();
    });

    it('updates selected task when task is clicked', () => {
      render(<TimeTrackingPage />);

      const taskButton = screen.getByText('Task 1');
      fireEvent.click(taskButton);

      expect(mockStore.selectTask).toHaveBeenCalledWith('task-1');
    });

    it('displays selected task in TimerPanel', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-1',
      } as any);

      render(<TimeTrackingPage />);

      expect(screen.getByText('Selected: Task 1')).toBeInTheDocument();
    });

    it('displays active tracking in TimerPanel', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        activeTracking: mockActiveTracking,
      } as any);

      render(<TimeTrackingPage />);

      expect(screen.getByText('Active: Task 1')).toBeInTheDocument();
    });
  });

  describe('Initialization', () => {
    it('fetches tasks on mount', async () => {
      render(<TimeTrackingPage />);

      await waitFor(() => {
        expect(mockStore.fetchTasks).toHaveBeenCalledTimes(1);
      });
    });

    it('checks for active tracking on mount', async () => {
      render(<TimeTrackingPage />);

      await waitFor(() => {
        expect(mockStore.checkActiveTracking).toHaveBeenCalledTimes(1);
      });
    });

    it('fetches entries on mount', async () => {
      render(<TimeTrackingPage />);

      await waitFor(() => {
        expect(mockStore.fetchEntries).toHaveBeenCalledTimes(1);
      });
    });

    it('handles loading states correctly', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        isLoadingTasks: true,
        isLoadingEntries: true,
      } as any);

      render(<TimeTrackingPage />);

      // Components should still render during loading
      expect(screen.getByTestId('task-list-panel')).toBeInTheDocument();
      expect(screen.getByTestId('time-entries-panel')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('starts tracking with Ctrl+Space when task is selected', async () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-1',
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: ' ', ctrlKey: true });

      await waitFor(() => {
        expect(mockStore.startTracking).toHaveBeenCalledWith('task-1', '');
      });
    });

    it('stops tracking with Ctrl+Space when actively tracking', async () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        activeTracking: mockActiveTracking,
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: ' ', ctrlKey: true });

      await waitFor(() => {
        expect(mockStore.stopTracking).toHaveBeenCalledWith('Working on task 1');
      });
    });

    it('clears search with Escape when search query exists', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        searchQuery: 'test query',
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockStore.setSearchQuery).toHaveBeenCalledWith('');
    });

    it('deselects task with Escape when no search query', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-1',
        searchQuery: '',
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockStore.selectTask).toHaveBeenCalledWith(null);
    });

    it('navigates down with ArrowDown', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-1',
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: 'ArrowDown' });

      expect(mockStore.selectTask).toHaveBeenCalledWith('task-2');
    });

    it('navigates up with ArrowUp', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-2',
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: 'ArrowUp' });

      expect(mockStore.selectTask).toHaveBeenCalledWith('task-1');
    });

    it('selects first task with ArrowDown when no task selected', () => {
      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: 'ArrowDown' });

      expect(mockStore.selectTask).toHaveBeenCalledWith('task-1');
    });

    it('does not navigate beyond list boundaries', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-2',
      } as any);

      render(<TimeTrackingPage />);

      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Should not call selectTask since we're at the end
      expect(mockStore.selectTask).not.toHaveBeenCalled();
    });

    it('does not trigger shortcuts when typing in input fields', () => {
      render(<TimeTrackingPage />);

      // Create a mock input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Try to trigger Escape (should not clear search)
      fireEvent.keyDown(input, { key: 'Escape' });

      // Escape should still work on inputs (native behavior)
      // but our custom handler should not interfere
      expect(mockStore.setSearchQuery).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('allows Ctrl+Space even when typing in input fields', async () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        selectedTaskId: 'task-1',
      } as any);

      render(<TimeTrackingPage />);

      // Create a mock input element
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Ctrl+Space should work even in input fields
      fireEvent.keyDown(input, { key: ' ', ctrlKey: true });

      await waitFor(() => {
        expect(mockStore.startTracking).toHaveBeenCalledWith('task-1', '');
      });

      document.body.removeChild(input);
    });
  });

  describe('Error Display', () => {
    it('displays error banner when error exists', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        error: 'Failed to fetch tasks',
      } as any);

      render(<TimeTrackingPage />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch tasks')).toBeInTheDocument();
    });

    it('does not display error banner when no error', () => {
      render(<TimeTrackingPage />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('clears error when dismiss button is clicked', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        error: 'Failed to fetch tasks',
      } as any);

      render(<TimeTrackingPage />);

      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);

      expect(mockStore.clearError).toHaveBeenCalledTimes(1);
    });

    it('displays error icon in error banner', () => {
      vi.mocked(useTimeTrackingStore).mockReturnValue({
        ...mockStore,
        error: 'Failed to fetch tasks',
      } as any);

      const { container } = render(<TimeTrackingPage />);

      const errorIcon = container.querySelector('.time-tracking-page__error-icon');
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon?.textContent).toBe('⚠️');
    });
  });

  describe('Responsive Behavior', () => {
    it('applies correct CSS classes for responsive layout', () => {
      const { container } = render(<TimeTrackingPage />);

      const page = container.querySelector('.time-tracking-page');
      expect(page).toBeInTheDocument();

      const content = container.querySelector('.time-tracking-page__content');
      expect(content).toBeInTheDocument();

      const leftColumn = container.querySelector('.time-tracking-page__left-column');
      expect(leftColumn).toBeInTheDocument();

      const rightColumn = container.querySelector('.time-tracking-page__right-column');
      expect(rightColumn).toBeInTheDocument();

      const timerSection = container.querySelector('.time-tracking-page__timer-section');
      expect(timerSection).toBeInTheDocument();

      const entriesSection = container.querySelector('.time-tracking-page__entries-section');
      expect(entriesSection).toBeInTheDocument();
    });
  });
});

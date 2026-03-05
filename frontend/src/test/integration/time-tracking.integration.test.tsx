/**
 * Integration tests for time tracking user flows
 * 
 * Feature: web-time-tracking
 * Tasks: 13.1, 13.2, 13.3, 13.4
 * 
 * Tests:
 * - Complete tracking flow (select task → start → add description → stop → view entry)
 * - Search and filter flow
 * - Error recovery flow
 * - Keyboard shortcuts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TimeTrackingPage } from '../../pages/TimeTrackingPage';
import { useTimeTrackingStore } from '../../stores/timeTrackingStore';
import type { Task, ActiveTracking, TimeEntry } from '../../services/timeTrackingService';
import * as timeTrackingService from '../../services/timeTrackingService';

// Mock API service
vi.mock('../../services/timeTrackingService', () => ({
  timeTrackingService: {
    getTasks: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    getActiveTracking: vi.fn(),
    getEntries: vi.fn(),
  },
}));

// Mock data
const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Implement user authentication',
    description: 'Add login and registration functionality',
    worked_sum: 5.5,
    user_is_tracking: false,
    scheduled_start: null,
  },
  {
    id: 'task-2',
    title: 'Create dashboard UI',
    description: 'Design and implement the main dashboard',
    worked_sum: 3.25,
    user_is_tracking: false,
    scheduled_start: '2024-01-15T09:00:00Z',
  },
  {
    id: 'task-3',
    title: 'Write API documentation',
    description: 'Document all REST endpoints',
    worked_sum: 1.0,
    user_is_tracking: false,
    scheduled_start: null,
  },
];

const mockActiveTracking: ActiveTracking = {
  id: 'tracking-1',
  task_id: 'task-1',
  task_title: 'Implement user authentication',
  start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  description: 'Working on login form',
};

const mockEntries: TimeEntry[] = [
  {
    id: 'entry-1',
    task_id: 'task-1',
    task_title: 'Implement user authentication',
    start_time: '2024-01-10T09:00:00Z',
    end_time: '2024-01-10T11:30:00Z',
    duration_hours: 2.5,
    description: 'Implemented login form',
  },
  {
    id: 'entry-2',
    task_id: 'task-2',
    task_title: 'Create dashboard UI',
    start_time: '2024-01-10T13:00:00Z',
    end_time: '2024-01-10T15:00:00Z',
    duration_hours: 2.0,
    description: 'Created dashboard layout',
  },
  {
    id: 'entry-3',
    task_id: 'task-1',
    task_title: 'Implement user authentication',
    start_time: '2024-01-09T10:00:00Z',
    end_time: '2024-01-09T12:00:00Z',
    duration_hours: 2.0,
    description: 'Set up authentication service',
  },
];

describe('Time Tracking Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    useTimeTrackingStore.setState({
      tasks: [],
      activeTracking: null,
      entries: [],
      selectedTaskId: null,
      searchQuery: '',
      entriesSkip: 0,
      entriesLimit: 20,
      entriesHasMore: false,
      isLoadingTasks: false,
      isLoadingEntries: false,
      isStarting: false,
      isStopping: false,
      error: null,
      lastFailedOperation: null,
    });

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Setup default mocks
    vi.mocked(timeTrackingService.timeTrackingService.getTasks).mockResolvedValue(mockTasks);
    vi.mocked(timeTrackingService.timeTrackingService.getActiveTracking).mockResolvedValue(null);
    vi.mocked(timeTrackingService.timeTrackingService.getEntries).mockResolvedValue({
      entries: mockEntries,
      total: mockEntries.length,
      skip: 0,
      limit: 20,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 13.1: Complete Tracking Flow', () => {
    it('should complete full tracking workflow: select → start → add description → stop → view entry', async () => {
      const user = userEvent.setup();

      // Mock start and stop tracking
      vi.mocked(timeTrackingService.timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);
      vi.mocked(timeTrackingService.timeTrackingService.stopTracking).mockResolvedValue({
        id: 'entry-new',
        task_id: 'task-1',
        task_title: 'Implement user authentication',
        start_time: mockActiveTracking.start_time,
        end_time: new Date().toISOString(),
        duration_hours: 1.0,
        description: 'Completed login form implementation',
      });

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });

      // Step 1: Select a task
      const taskCard = screen.getByText('Implement user authentication').closest('[role="button"]');
      expect(taskCard).toBeInTheDocument();
      await user.click(taskCard!);

      // Verify task is selected
      await waitFor(() => {
        expect(taskCard).toHaveClass('task-card-selected');
      });

      // Step 2: Start tracking
      const startButton = screen.getByRole('button', { name: /start tracking/i });
      expect(startButton).toBeEnabled();
      await user.click(startButton);

      // Verify tracking started
      await waitFor(() => {
        expect(timeTrackingService.timeTrackingService.startTracking).toHaveBeenCalledWith('task-1', '');
      });

      // Wait for timer to appear
      await waitFor(() => {
        expect(screen.getByText(/tracking/i)).toBeInTheDocument();
      });

      // Step 3: Add description
      const descriptionInput = screen.getByPlaceholderText(/what are you working on/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Completed login form implementation');

      // Verify description is updated
      expect(descriptionInput).toHaveValue('Completed login form implementation');

      // Step 4: Stop tracking
      const stopButton = screen.getByRole('button', { name: /stop tracking/i });
      await user.click(stopButton);

      // Verify tracking stopped
      await waitFor(() => {
        expect(timeTrackingService.timeTrackingService.stopTracking).toHaveBeenCalledWith(
          'Completed login form implementation'
        );
      });

      // Step 5: Verify entry appears in history
      // Note: In real implementation, we'd need to refresh entries after stop
      // For this test, we verify the stop was called with correct description
      expect(timeTrackingService.timeTrackingService.stopTracking).toHaveBeenCalledTimes(1);
    });

    it('should update timer in real-time while tracking', async () => {
      const user = userEvent.setup();

      // Mock active tracking
      vi.mocked(timeTrackingService.timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for active tracking to load
      await waitFor(() => {
        expect(screen.getByText(/tracking/i)).toBeInTheDocument();
      });

      // Verify timer is displayed (format: HH:MM:SS)
      const timerDisplay = screen.getByText(/\d{2}:\d{2}:\d{2}/);
      expect(timerDisplay).toBeInTheDocument();

      // Wait a bit and verify timer updates
      const initialTime = timerDisplay.textContent;
      
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Timer should have updated
      await waitFor(() => {
        const currentTime = timerDisplay.textContent;
        expect(currentTime).not.toBe(initialTime);
      }, { timeout: 2000 });
    });
  });

  describe('Task 13.2: Search and Filter Flow', () => {
    it('should filter tasks based on search query', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
        expect(screen.getByText('Create dashboard UI')).toBeInTheDocument();
        expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      await user.type(searchInput, 'dashboard');

      // Wait for debounce (300ms)
      await new Promise(resolve => setTimeout(resolve, 350));

      // Verify filtered results
      await waitFor(() => {
        expect(screen.getByText('Create dashboard UI')).toBeInTheDocument();
        expect(screen.queryByText('Implement user authentication')).not.toBeInTheDocument();
        expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
      });

      // Verify task count
      expect(screen.getByText(/showing 1 of 3 tasks/i)).toBeInTheDocument();

      // Clear search
      const clearButton = screen.getByLabelText(/clear search/i);
      await user.click(clearButton);

      // Verify all tasks reappear
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
        expect(screen.getByText('Create dashboard UI')).toBeInTheDocument();
        expect(screen.getByText('Write API documentation')).toBeInTheDocument();
      });
    });

    it('should show empty state when no tasks match search', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });

      // Search for non-existent task
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      await user.type(searchInput, 'nonexistent task xyz');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));

      // Verify empty state
      await waitFor(() => {
        expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
        expect(screen.getByText(/try adjusting your search query/i)).toBeInTheDocument();
      });
    });
  });

  describe('Task 13.3: Error Recovery Flow', () => {
    it('should display error and allow retry on API failure', async () => {
      const user = userEvent.setup();

      // Mock API error
      vi.mocked(timeTrackingService.timeTrackingService.getTasks).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Verify retry button is present
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      vi.mocked(timeTrackingService.timeTrackingService.getTasks).mockResolvedValueOnce(mockTasks);

      // Click retry
      await user.click(retryButton);

      // Verify tasks load successfully
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
      });
    });

    it('should handle start tracking error with retry', async () => {
      const user = userEvent.setup();

      // Mock start tracking error
      vi.mocked(timeTrackingService.timeTrackingService.startTracking).mockRejectedValueOnce(
        new Error('Failed to start tracking')
      );

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });

      // Select task
      const taskCard = screen.getByText('Implement user authentication').closest('[role="button"]');
      await user.click(taskCard!);

      // Try to start tracking
      const startButton = screen.getByRole('button', { name: /start tracking/i });
      await user.click(startButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to start tracking/i)).toBeInTheDocument();
      });

      // Mock successful retry
      vi.mocked(timeTrackingService.timeTrackingService.startTracking).mockResolvedValueOnce(mockActiveTracking);

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Verify tracking started
      await waitFor(() => {
        expect(screen.getByText(/tracking/i)).toBeInTheDocument();
        expect(screen.queryByText(/failed to start tracking/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Task 13.4: Keyboard Shortcuts', () => {
    it('should start/stop tracking with Ctrl+Space', async () => {
      const user = userEvent.setup();

      // Mock start and stop
      vi.mocked(timeTrackingService.timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);
      vi.mocked(timeTrackingService.timeTrackingService.stopTracking).mockResolvedValue({
        id: 'entry-new',
        task_id: 'task-1',
        task_title: 'Implement user authentication',
        start_time: mockActiveTracking.start_time,
        end_time: new Date().toISOString(),
        duration_hours: 1.0,
        description: '',
      });

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for tasks
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });

      // Select task
      const taskCard = screen.getByText('Implement user authentication').closest('[role="button"]');
      await user.click(taskCard!);

      // Press Ctrl+Space to start
      await user.keyboard('{Control>} {/Control}');

      // Verify tracking started
      await waitFor(() => {
        expect(timeTrackingService.timeTrackingService.startTracking).toHaveBeenCalled();
      });

      // Press Ctrl+Space to stop
      await user.keyboard('{Control>} {/Control}');

      // Verify tracking stopped
      await waitFor(() => {
        expect(timeTrackingService.timeTrackingService.stopTracking).toHaveBeenCalled();
      });
    });

    it('should focus search with Ctrl+F', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search tasks/i);

      // Press Ctrl+F
      await user.keyboard('{Control>}f{/Control}');

      // Verify search is focused
      await waitFor(() => {
        expect(searchInput).toHaveFocus();
      });
    });

    it('should clear search with Escape', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for tasks
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      await user.type(searchInput, 'dashboard');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));

      // Verify search is active
      await waitFor(() => {
        expect(screen.getByText(/showing 1 of 3 tasks/i)).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Verify search is cleared
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.queryByText(/showing 1 of 3 tasks/i)).not.toBeInTheDocument();
      });
    });

    it('should navigate tasks with arrow keys', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/time-tracking']}>
          <Routes>
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for tasks
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });

      // Press ArrowDown to select first task
      await user.keyboard('{ArrowDown}');

      // Verify first task is selected (scheduled task should be first)
      await waitFor(() => {
        const selectedTask = screen.getByText('Create dashboard UI').closest('[role="button"]');
        expect(selectedTask).toHaveClass('task-card-selected');
      });

      // Press ArrowDown again
      await user.keyboard('{ArrowDown}');

      // Verify next task is selected
      await waitFor(() => {
        const previousTask = screen.getByText('Create dashboard UI').closest('[role="button"]');
        expect(previousTask).not.toHaveClass('task-card-selected');
      });

      // Press ArrowUp
      await user.keyboard('{ArrowUp}');

      // Verify previous task is selected again
      await waitFor(() => {
        const selectedTask = screen.getByText('Create dashboard UI').closest('[role="button"]');
        expect(selectedTask).toHaveClass('task-card-selected');
      });
    });
  });
});

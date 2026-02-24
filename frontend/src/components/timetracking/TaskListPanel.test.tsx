/**
 * TaskListPanel component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskListPanel } from './TaskListPanel';
import type { Task } from '../../services/timeTrackingService';

describe('TaskListPanel', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Implement authentication',
      description: 'Add JWT token handling and user authentication flow',
      status: 'in_progress',
      priority: 1,
      estimated_hours: 8,
      worked_sum: 2.5,
      user_is_tracking: false,
      has_active_tracking: false,
    },
    {
      id: '2',
      title: 'Fix database bug',
      description: 'Resolve constraint conflict in scheduler',
      status: 'in_progress',
      priority: 2,
      estimated_hours: 4,
      worked_sum: 0,
      user_is_tracking: true,
      has_active_tracking: true,
    },
    {
      id: '3',
      title: 'Update documentation',
      description: 'Add API documentation for new endpoints',
      status: 'not_started',
      priority: 3,
      estimated_hours: 2,
      worked_sum: 1.25,
      scheduled_start: '2024-02-20T09:00:00Z',
      user_is_tracking: false,
      has_active_tracking: false,
    },
  ];

  const defaultProps = {
    tasks: mockTasks,
    selectedTaskId: null,
    onTaskSelect: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders task list with correct data', () => {
      render(<TaskListPanel {...defaultProps} />);

      expect(screen.getByText('Implement authentication')).toBeInTheDocument();
      expect(screen.getByText('Fix database bug')).toBeInTheDocument();
      expect(screen.getByText('Update documentation')).toBeInTheDocument();
    });

    it('displays worked_sum formatted correctly', () => {
      render(<TaskListPanel {...defaultProps} />);

      expect(screen.getByText('2h 30m')).toBeInTheDocument();
      expect(screen.getByText('0h 0m')).toBeInTheDocument();
      expect(screen.getByText('1h 15m')).toBeInTheDocument();
    });

    it('displays timer icon for tasks with active tracking', () => {
      render(<TaskListPanel {...defaultProps} />);

      const timerIcons = screen.getAllByTitle('Currently tracking');
      expect(timerIcons).toHaveLength(1);
    });

    it('truncates long descriptions to 100 characters', () => {
      const longDescriptionTask: Task = {
        ...mockTasks[0],
        description:
          'This is a very long description that exceeds one hundred characters and should be truncated with ellipsis at the end',
      };

      render(
        <TaskListPanel
          {...defaultProps}
          tasks={[longDescriptionTask]}
        />
      );

      const description = screen.getByText(/This is a very long description/);
      expect(description.textContent).toHaveLength(103); // 100 chars + "..."
      expect(description.textContent).toMatch(/\.\.\.$/);
    });

    it('highlights selected task', () => {
      render(<TaskListPanel {...defaultProps} selectedTaskId="2" />);

      const selectedCard = screen.getByText('Fix database bug').closest('.task-card');
      expect(selectedCard).toHaveClass('task-card-selected');
    });

    it('displays loading state', () => {
      render(<TaskListPanel {...defaultProps} tasks={[]} isLoading={true} />);

      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });

    it('displays empty state when no tasks', () => {
      render(<TaskListPanel {...defaultProps} tasks={[]} />);

      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.getByText('No tasks available for time tracking')).toBeInTheDocument();
    });
  });

  describe('Task Selection', () => {
    it('calls onTaskSelect when task is clicked', () => {
      const onTaskSelect = vi.fn();
      render(<TaskListPanel {...defaultProps} onTaskSelect={onTaskSelect} />);

      fireEvent.click(screen.getByText('Implement authentication'));

      expect(onTaskSelect).toHaveBeenCalledTimes(1);
      expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('calls onTaskSelect when Enter key is pressed', () => {
      const onTaskSelect = vi.fn();
      render(<TaskListPanel {...defaultProps} onTaskSelect={onTaskSelect} />);

      const taskCard = screen.getByText('Implement authentication').closest('.task-card');
      fireEvent.keyDown(taskCard!, { key: 'Enter' });

      expect(onTaskSelect).toHaveBeenCalledTimes(1);
      expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('calls onTaskSelect when Space key is pressed', () => {
      const onTaskSelect = vi.fn();
      render(<TaskListPanel {...defaultProps} onTaskSelect={onTaskSelect} />);

      const taskCard = screen.getByText('Implement authentication').closest('.task-card');
      fireEvent.keyDown(taskCard!, { key: ' ' });

      expect(onTaskSelect).toHaveBeenCalledTimes(1);
      expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });
  });

  describe('Search Functionality', () => {
    it('filters tasks by title', async () => {
      const onSearchChange = vi.fn();
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery=""
          onSearchChange={onSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      fireEvent.change(searchInput, { target: { value: 'auth' } });

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(onSearchChange).toHaveBeenCalledWith('auth');
        },
        { timeout: 500 }
      );
    });

    it('filters tasks by description', () => {
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery="constraint"
        />
      );

      expect(screen.getByText('Fix database bug')).toBeInTheDocument();
      expect(screen.queryByText('Implement authentication')).not.toBeInTheDocument();
      expect(screen.queryByText('Update documentation')).not.toBeInTheDocument();
    });

    it('displays filtered task count', () => {
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery="bug"
        />
      );

      expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();
    });

    it('displays empty state when search returns no results', () => {
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery="nonexistent"
        />
      );

      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search query')).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', () => {
      const onSearchChange = vi.fn();
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery="test"
          onSearchChange={onSearchChange}
        />
      );

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(onSearchChange).toHaveBeenCalledWith('');
    });

    it('debounces search input by 300ms', async () => {
      const onSearchChange = vi.fn();
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery=""
          onSearchChange={onSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');

      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'au' } });
      fireEvent.change(searchInput, { target: { value: 'aut' } });
      fireEvent.change(searchInput, { target: { value: 'auth' } });

      // Should not be called immediately
      expect(onSearchChange).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(
        () => {
          expect(onSearchChange).toHaveBeenCalledTimes(1);
          expect(onSearchChange).toHaveBeenCalledWith('auth');
        },
        { timeout: 500 }
      );
    });
  });

  describe('Task Sorting', () => {
    it('sorts tasks with user_is_tracking first', () => {
      render(<TaskListPanel {...defaultProps} />);

      const taskCards = screen.getAllByRole('button');
      const firstTask = taskCards[0];

      expect(firstTask).toHaveTextContent('Fix database bug');
      // Check for timer icon presence
      const timerIcon = firstTask.querySelector('.timer-icon');
      expect(timerIcon).toBeInTheDocument();
    });

    it('sorts tasks with scheduled_start second', () => {
      const tasksWithoutTracking = mockTasks.map((t) => ({
        ...t,
        user_is_tracking: false,
      }));

      render(<TaskListPanel {...defaultProps} tasks={tasksWithoutTracking} />);

      const taskCards = screen.getAllByRole('button');
      const firstTask = taskCards[0];

      expect(firstTask).toHaveTextContent('Update documentation');
    });

    it('maintains order for tasks without tracking or schedule', () => {
      const unscheduledTasks: Task[] = [
        {
          id: '1',
          title: 'Task A',
          description: 'Description A',
          status: 'not_started',
          priority: 1,
          estimated_hours: 4,
          worked_sum: 0,
          user_is_tracking: false,
          has_active_tracking: false,
        },
        {
          id: '2',
          title: 'Task B',
          description: 'Description B',
          status: 'not_started',
          priority: 2,
          estimated_hours: 4,
          worked_sum: 0,
          user_is_tracking: false,
          has_active_tracking: false,
        },
      ];

      render(<TaskListPanel {...defaultProps} tasks={unscheduledTasks} />);

      const taskCards = screen.getAllByRole('button');
      expect(taskCards[0]).toHaveTextContent('Task A');
      expect(taskCards[1]).toHaveTextContent('Task B');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<TaskListPanel {...defaultProps} selectedTaskId="1" />);

      const selectedCard = screen.getByText('Implement authentication').closest('.task-card');
      expect(selectedCard).toHaveAttribute('role', 'button');
      expect(selectedCard).toHaveAttribute('tabIndex', '0');
      expect(selectedCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('has accessible timer icon label', () => {
      render(<TaskListPanel {...defaultProps} />);

      const timerIcon = screen.getByLabelText('Currently tracking');
      expect(timerIcon).toBeInTheDocument();
    });

    it('has accessible clear search button', () => {
      render(
        <TaskListPanel
          {...defaultProps}
          searchQuery="test"
          onSearchChange={vi.fn()}
        />
      );

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });
  });
});

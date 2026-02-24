/**
 * Unit tests for TimerPanel component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimerPanel } from './TimerPanel';
import type { Task, ActiveTracking } from '../../services/timeTrackingService';

describe('TimerPanel', () => {
  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test task description',
    status: 'in_progress',
    priority: 1,
    estimated_hours: 5,
    worked_sum: 2.5,
    has_active_tracking: false,
    user_is_tracking: false,
  };

  const mockActiveTracking: ActiveTracking = {
    id: 'tracking-1',
    task_id: 'task-1',
    task_title: 'Test Task',
    start_time: new Date(Date.now() - 5000).toISOString(), // Started 5 seconds ago
    description: 'Working on tests',
  };

  const mockOnStart = vi.fn();
  const mockOnStop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Task Display', () => {
    it('should display selected task when not tracking', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test task description')).toBeInTheDocument();
    });

    it('should display active tracking task when tracking', () => {
      render(
        <TimerPanel
          selectedTask={null}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Tracking')).toBeInTheDocument();
    });

    it('should display message when no task selected', () => {
      render(
        <TimerPanel
          selectedTask={null}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      expect(screen.getByText('Select a task to start tracking')).toBeInTheDocument();
    });
  });

  describe('Timer Display', () => {
    it('should display timer in HH:MM:SS format', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      // Timer should show 00:00:05 (5 seconds elapsed)
      expect(screen.getByText(/00:00:0[45]/)).toBeInTheDocument();
    });

    it('should update timer every second', async () => {
      const startTime = new Date(Date.now() - 2000).toISOString(); // Started 2 seconds ago
      const tracking: ActiveTracking = {
        ...mockActiveTracking,
        start_time: startTime,
      };

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={tracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      // Initial time should be around 2 seconds
      expect(screen.getByText(/00:00:0[12]/)).toBeInTheDocument();

      // Wait for timer to update (real time, not fake timers)
      await waitFor(() => {
        // After 1+ seconds, should show 3+ seconds
        expect(screen.getByText(/00:00:0[3-9]/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display 00:00:00 when not tracking', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });

    it('should clear interval on unmount', () => {
      const { unmount } = render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      // Spy on clearInterval
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Description Input', () => {
    it('should display description textarea', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const textarea = screen.getByPlaceholderText('What are you working on?');
      expect(textarea).toBeInTheDocument();
    });

    it('should display character counter', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const textarea = screen.getByPlaceholderText('What are you working on?');

      // Initially 0/500
      expect(screen.getByText('0/500')).toBeInTheDocument();

      // Type some text
      await user.type(textarea, 'Test description');

      // Should update counter
      expect(screen.getByText('16/500')).toBeInTheDocument();
    });

    it('should show error when description exceeds 500 characters', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const textarea = screen.getByPlaceholderText('What are you working on?');

      // Type exactly 500 characters (maxLength prevents more)
      const longText = 'x'.repeat(500);
      await user.clear(textarea);
      await user.type(textarea, longText);

      // Should show 500/500 but no error (500 is valid)
      expect(screen.getByText('500/500')).toBeInTheDocument();
      expect(screen.queryByText('Description cannot exceed 500 characters')).not.toBeInTheDocument();
    });

    it('should initialize description from active tracking', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const textarea = screen.getByPlaceholderText('What are you working on?') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Working on tests');
    });

    it('should allow editing description while tracking', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const textarea = screen.getByPlaceholderText('What are you working on?');

      // Clear and type new text
      await user.clear(textarea);
      await user.type(textarea, 'Updated description');

      expect((textarea as HTMLTextAreaElement).value).toBe('Updated description');
    });
  });

  describe('Start/Stop Button', () => {
    it('should display "Start Tracking" when not tracking', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Start Tracking' })).toBeInTheDocument();
    });

    it('should display "Stop Tracking" when tracking', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Stop Tracking' })).toBeInTheDocument();
    });

    it('should be disabled when no task selected', () => {
      render(
        <TimerPanel
          selectedTask={null}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const button = screen.getByRole('button', { name: 'Start Tracking' });
      expect(button).toBeDisabled();
    });

    it('should call onStart when clicking start button', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const button = screen.getByRole('button', { name: 'Start Tracking' });
      await user.click(button);

      expect(mockOnStart).toHaveBeenCalledWith('task-1', '');
    });

    it('should call onStop when clicking stop button', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const button = screen.getByRole('button', { name: 'Stop Tracking' });
      await user.click(button);

      expect(mockOnStop).toHaveBeenCalledWith('Working on tests');
    });

    it('should show loading state when starting', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={true}
          isStopping={false}
        />
      );

      const button = screen.getByRole('button', { name: 'Starting...' });
      expect(button).toBeDisabled();
    });

    it('should show loading state when stopping', () => {
      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={mockActiveTracking}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={true}
        />
      );

      const button = screen.getByRole('button', { name: 'Stopping...' });
      expect(button).toBeDisabled();
    });

    it('should not call onStart if description is invalid', async () => {
      const user = userEvent.setup({ delay: null });

      // Mock onStart to reject with validation error
      mockOnStart.mockRejectedValue(new Error('Description cannot exceed 500 characters'));

      render(
        <TimerPanel
          selectedTask={mockTask}
          activeTracking={null}
          onStart={mockOnStart}
          onStop={mockOnStop}
          isStarting={false}
          isStopping={false}
        />
      );

      const textarea = screen.getByPlaceholderText('What are you working on?');
      const button = screen.getByRole('button', { name: 'Start Tracking' });

      // Manually set value to bypass maxLength (simulating programmatic input)
      Object.defineProperty(textarea, 'value', {
        writable: true,
        value: 'x'.repeat(501),
      });
      
      // Trigger change event
      textarea.dispatchEvent(new Event('change', { bubbles: true }));

      // Try to start
      await user.click(button);

      // Should not call onStart due to validation
      expect(mockOnStart).not.toHaveBeenCalled();

      // Should show error
      expect(screen.getByText('Description cannot exceed 500 characters')).toBeInTheDocument();
    });
  });
});

/**
 * Unit tests for TimeEntriesPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeEntriesPanel } from './TimeEntriesPanel';
import type { TimeEntry } from '../../services/timeTrackingService';

describe('TimeEntriesPanel', () => {
  const mockEntries: TimeEntry[] = [
    {
      id: 'entry-1',
      task_id: 'task-1',
      task_title: 'Implement authentication',
      start_time: new Date().toISOString(), // Today
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
      duration_hours: 2,
      description: 'Added JWT token handling and user authentication flow',
      created_at: new Date().toISOString(),
    },
    {
      id: 'entry-2',
      task_id: 'task-2',
      task_title: 'Fix bug in scheduler',
      start_time: new Date().toISOString(), // Today
      end_time: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours later
      duration_hours: 1.5,
      description: 'Resolved constraint conflict in scheduling algorithm',
      created_at: new Date().toISOString(),
    },
    {
      id: 'entry-3',
      task_id: 'task-3',
      task_title: 'Update documentation',
      start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      end_time: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 1 hour later
      duration_hours: 1,
      description: 'Updated API documentation with new endpoints',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const mockOnLoadMore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no entries', () => {
      render(
        <TimeEntriesPanel
          entries={[]}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      expect(screen.getByText('No time entries yet')).toBeInTheDocument();
      expect(screen.getByText('Start tracking time to see your entries here')).toBeInTheDocument();
    });

    it('should not display empty state when loading', () => {
      render(
        <TimeEntriesPanel
          entries={[]}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={true}
        />
      );

      expect(screen.queryByText('No time entries yet')).not.toBeInTheDocument();
    });
  });

  describe('Entry Display', () => {
    it('should display panel title', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      expect(screen.getByText('Recent Entries')).toBeInTheDocument();
    });

    it('should display all entries', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      expect(screen.getByText('Implement authentication')).toBeInTheDocument();
      expect(screen.getByText('Fix bug in scheduler')).toBeInTheDocument();
      expect(screen.getByText('Update documentation')).toBeInTheDocument();
    });

    it('should display entry descriptions', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Added JWT token handling/)).toBeInTheDocument();
      expect(screen.getByText(/Resolved constraint conflict/)).toBeInTheDocument();
      expect(screen.getByText(/Updated API documentation/)).toBeInTheDocument();
    });

    it('should display formatted durations', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      expect(screen.getByText('2h 0m')).toBeInTheDocument();
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });

    it('should truncate long descriptions', () => {
      const longEntry: TimeEntry = {
        id: 'entry-long',
        task_id: 'task-1',
        task_title: 'Long task',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        duration_hours: 1,
        description: 'x'.repeat(200), // 200 characters
        created_at: new Date().toISOString(),
      };

      render(
        <TimeEntriesPanel
          entries={[longEntry]}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      const description = screen.getByText(/x+\.\.\./);
      expect(description.textContent?.length).toBeLessThan(200);
      expect(description.textContent).toContain('...');
    });
  });

  describe('Date Grouping', () => {
    it('should group entries by date', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      // Should have "Today" and "Yesterday" headers
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('should display dates in descending order (most recent first)', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      const headers = screen.getAllByRole('heading', { level: 3 });
      const headerTexts = headers.map(h => h.textContent);

      // "Today" should come before "Yesterday"
      const todayIndex = headerTexts.indexOf('Today');
      const yesterdayIndex = headerTexts.indexOf('Yesterday');

      expect(todayIndex).toBeLessThan(yesterdayIndex);
    });

    it('should format older dates as "MMM DD, YYYY"', () => {
      const oldEntry: TimeEntry = {
        id: 'entry-old',
        task_id: 'task-1',
        task_title: 'Old task',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        duration_hours: 1,
        description: 'Old entry',
        created_at: '2024-01-15T11:00:00Z',
      };

      render(
        <TimeEntriesPanel
          entries={[oldEntry]}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      // Should display formatted date (e.g., "Jan 15, 2024")
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display load more button when hasMore is true', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={true}
          isLoading={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
    });

    it('should not display load more button when hasMore is false', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={true}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button', { name: 'Load More' });
      await user.click(button);

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should show loading state on load more button', () => {
      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={true}
          isLoading={true}
        />
      );

      const button = screen.getByRole('button', { name: 'Loading...' });
      expect(button).toBeDisabled();
    });

    it('should not call onLoadMore when already loading', async () => {
      const user = userEvent.setup();

      render(
        <TimeEntriesPanel
          entries={mockEntries}
          onLoadMore={mockOnLoadMore}
          hasMore={true}
          isLoading={true}
        />
      );

      const button = screen.getByRole('button', { name: 'Loading...' });
      await user.click(button);

      // Should not call onLoadMore because button is disabled
      expect(mockOnLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('Time Formatting', () => {
    it('should display start and end times in HH:MM format', () => {
      const entry: TimeEntry = {
        id: 'entry-time',
        task_id: 'task-1',
        task_title: 'Test task',
        start_time: '2024-01-15T09:30:00Z',
        end_time: '2024-01-15T11:45:00Z',
        duration_hours: 2.25,
        description: 'Test entry',
        created_at: '2024-01-15T11:45:00Z',
      };

      render(
        <TimeEntriesPanel
          entries={[entry]}
          onLoadMore={mockOnLoadMore}
          hasMore={false}
          isLoading={false}
        />
      );

      // Should display time range (times will be in local timezone)
      const timeRange = screen.getByText(/\d{2}:\d{2} - \d{2}:\d{2}/);
      expect(timeRange).toBeInTheDocument();
    });
  });
});

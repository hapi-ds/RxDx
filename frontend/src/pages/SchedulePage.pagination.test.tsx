/**
 * Schedule Page Pagination Tests
 * Tests pagination functionality for the Schedule page
 * Validates task 24.3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchedulePage } from './SchedulePage';
import { scheduleService, type Task, type PaginatedResponse } from '../services';

// Mock the services
vi.mock('../services', async () => {
  const actual = await vi.importActual('../services');
  return {
    ...actual,
    scheduleService: {
      getTasks: vi.fn(),
      getStatistics: vi.fn(),
      deleteTask: vi.fn(),
    },
  };
});

describe('SchedulePage Pagination', () => {
  const mockTasks: Task[] = Array.from({ length: 50 }, (_, i) => ({
    id: `task-${i + 1}`,
    title: `Task ${i + 1}`,
    description: `Description for task ${i + 1}`,
    estimated_hours: 8,
    status: 'not_started' as const,
    priority: 1,
  }));

  const createMockResponse = (page: number, size: number): PaginatedResponse<Task> => {
    const start = (page - 1) * size;
    const end = start + size;
    const items = mockTasks.slice(start, end);
    
    return {
      items,
      total: mockTasks.length,
      page,
      size,
      pages: Math.ceil(mockTasks.length / size),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(scheduleService.getTasks).mockImplementation(async (filters) => {
      const page = filters?.page || 1;
      const size = filters?.size || 20;
      return createMockResponse(page, size);
    });

    vi.mocked(scheduleService.getStatistics).mockResolvedValue({
      total_tasks: 50,
      completed_tasks: 10,
      in_progress_tasks: 15,
      blocked_tasks: 5,
      total_estimated_hours: 400,
      completion_percentage: 20,
    });
  });

  it('should display pagination controls when there are multiple pages', async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
  });

  it('should not display pagination when there is only one page', async () => {
    // Mock response with fewer tasks
    vi.mocked(scheduleService.getTasks).mockResolvedValue({
      items: mockTasks.slice(0, 10),
      total: 10,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it('should disable Previous button on first page', async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
    });
  });

  it('should disable Next button on last page', async () => {
    // Mock only 2 pages of data (40 tasks)
    const smallerMockTasks = mockTasks.slice(0, 40);
    vi.mocked(scheduleService.getTasks).mockImplementation(async (filters) => {
      const page = filters?.page || 1;
      const size = filters?.size || 20;
      const start = (page - 1) * size;
      const end = start + size;
      const items = smallerMockTasks.slice(start, end);
      
      return {
        items,
        total: smallerMockTasks.length,
        page,
        size,
        pages: Math.ceil(smallerMockTasks.length / size),
      };
    });

    const user = userEvent.setup();
    render(<SchedulePage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Navigate to last page (page 2)
    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    });

    expect(nextButton).toBeDisabled();
  });

  it('should navigate to next page when Next button is clicked', async () => {
    const user = userEvent.setup();
    render(<SchedulePage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Click Next button
    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    // Verify getTasks was called with page 2
    await waitFor(() => {
      expect(scheduleService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it('should navigate to previous page when Previous button is clicked', async () => {
    const user = userEvent.setup();
    render(<SchedulePage />);

    // Wait for initial load on page 1
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Navigate to page 2 first
    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });

    // Click Previous button to go back to page 1
    const prevButton = screen.getByLabelText('Previous page');
    await user.click(prevButton);

    // Verify getTasks was called with page 1
    await waitFor(() => {
      expect(scheduleService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it('should display correct page information', async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      const pageInfo = screen.getByText(/Page 1 of 3 \(50 total\)/);
      expect(pageInfo).toBeInTheDocument();
    });
  });

  it('should reset to page 1 when filters change', async () => {
    const user = userEvent.setup();
    render(<SchedulePage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Navigate to page 2
    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    await waitFor(() => {
      expect(scheduleService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    // Change filter
    const statusFilter = screen.getByLabelText('Filter by status');
    await user.selectOptions(statusFilter, 'in_progress');

    // Verify getTasks was called with page 1
    await waitFor(() => {
      expect(scheduleService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          page: 1,
          status: 'in_progress'
        })
      );
    });
  });

  it('should maintain page size across pagination', async () => {
    const user = userEvent.setup();
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Navigate to page 2
    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    // Verify size is maintained
    await waitFor(() => {
      expect(scheduleService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          page: 2,
          size: 20
        })
      );
    });
  });

  it('should handle pagination with filtered results', async () => {
    const user = userEvent.setup();
    
    // Mock filtered results
    const filteredTasks = mockTasks.filter(t => t.status === 'in_progress').slice(0, 25);
    vi.mocked(scheduleService.getTasks).mockImplementation(async (filters) => {
      if (filters?.status === 'in_progress') {
        const page = filters.page || 1;
        const size = filters.size || 20;
        const start = (page - 1) * size;
        const end = start + size;
        return {
          items: filteredTasks.slice(start, end),
          total: filteredTasks.length,
          page,
          size,
          pages: Math.ceil(filteredTasks.length / size),
        };
      }
      return createMockResponse(filters?.page || 1, filters?.size || 20);
    });

    render(<SchedulePage />);

    // Apply filter
    const statusFilter = screen.getByLabelText('Filter by status');
    await user.selectOptions(statusFilter, 'in_progress');

    await waitFor(() => {
      expect(scheduleService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          status: 'in_progress',
          page: 1
        })
      );
    });
  });

  it('should display correct total count in pagination info', async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      const totalText = screen.getByText(/50 total/);
      expect(totalText).toBeInTheDocument();
    });
  });

  it('should handle empty results gracefully', async () => {
    vi.mocked(scheduleService.getTasks).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 20,
      pages: 0,
    });

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText('No tasks found')).toBeInTheDocument();
    });

    // Pagination should not be visible
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it('should handle API errors during pagination', async () => {
    const user = userEvent.setup();
    
    // First call succeeds
    vi.mocked(scheduleService.getTasks).mockResolvedValueOnce(
      createMockResponse(1, 20)
    );

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    // Second call fails
    vi.mocked(scheduleService.getTasks).mockRejectedValueOnce(
      new Error('Network error')
    );

    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });
  });

  it('should preserve pagination state when returning from detail view', async () => {
    const user = userEvent.setup();
    render(<SchedulePage />);

    // Navigate to page 2
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });

    // Click on a task to view details
    const taskButton = screen.getByLabelText(/View details for Task 21/);
    await user.click(taskButton);

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Go back to list
    const backButton = screen.getByText('← Back to List');
    await user.click(backButton);

    // Should still be on page 2
    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });
  });
});

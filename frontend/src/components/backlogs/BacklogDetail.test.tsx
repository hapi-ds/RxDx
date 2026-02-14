/**
 * Tests for BacklogDetail component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BacklogDetail } from './BacklogDetail';
import { backlogService, Backlog, BacklogTask } from '../../services/backlogService';
import { sprintService, Sprint } from '../../services/sprintService';

vi.mock('../../services/backlogService');
vi.mock('../../services/sprintService');

describe('BacklogDetail', () => {
  const mockBacklog: Backlog = {
    id: 'backlog-123',
    name: 'Product Backlog',
    description: 'Main product backlog',
    project_id: 'project-123',
    created_at: '2024-01-01T00:00:00Z',
    task_count: 2,
  };

  const mockTasks: BacklogTask[] = [
    {
      id: 'task-1',
      type: 'task',
      title: 'Task 1',
      description: 'First task',
      status: 'ready',
      priority: 1,
      version: '1.0',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_signed: false,
      priority_order: 1,
      added_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'Task 2',
      description: 'Second task',
      status: 'ready',
      priority: 2,
      version: '1.0',
      created_by: 'user-1',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      is_signed: false,
      priority_order: 2,
      added_at: '2024-01-02T00:00:00Z',
    },
  ];

  const mockSprints: Sprint[] = [
    {
      id: 'sprint-1',
      name: 'Sprint 1',
      start_date: '2024-01-01',
      end_date: '2024-01-14',
      status: 'planning',
      project_id: 'project-123',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(backlogService.getBacklog).mockImplementation(
      () => new Promise(() => {})
    );
    vi.mocked(backlogService.getBacklogTasks).mockImplementation(
      () => new Promise(() => {})
    );
    vi.mocked(sprintService.getSprints).mockImplementation(
      () => new Promise(() => {})
    );

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render backlog details after loading', async () => {
    vi.mocked(backlogService.getBacklog).mockResolvedValue(mockBacklog);
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue(mockTasks);
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText('Product Backlog')).toBeInTheDocument();
      expect(screen.getByText('Main product backlog')).toBeInTheDocument();
    });

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should display task count and estimated hours', async () => {
    vi.mocked(backlogService.getBacklog).mockResolvedValue(mockBacklog);
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue(mockTasks);
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total tasks
    });
  });

  it('should filter tasks by search query', async () => {
    vi.mocked(backlogService.getBacklog).mockResolvedValue(mockBacklog);
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue(mockTasks);
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tasks...');
    await userEvent.type(searchInput, 'Task 1');

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
  });

  it('should select and deselect tasks', async () => {
    vi.mocked(backlogService.getBacklog).mockResolvedValue(mockBacklog);
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue(mockTasks);
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();

    await userEvent.click(checkboxes[0]);

    expect(checkboxes[0]).not.toBeChecked();
  });

  it('should remove task from backlog', async () => {
    vi.mocked(backlogService.getBacklog).mockResolvedValue(mockBacklog);
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue(mockTasks);
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);
    vi.mocked(backlogService.removeTaskFromBacklog).mockResolvedValue();

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    await userEvent.click(removeButtons[0]);

    expect(backlogService.removeTaskFromBacklog).toHaveBeenCalledWith(
      'backlog-123',
      'task-1'
    );
  });

  it('should call onBack when back button clicked', async () => {
    const onBack = vi.fn();
    vi.mocked(backlogService.getBacklog).mockResolvedValue(mockBacklog);
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue(mockTasks);
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(
      <BacklogDetail
        backlogId="backlog-123"
        projectId="project-123"
        onBack={onBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('← Back'));

    expect(onBack).toHaveBeenCalled();
  });

  it('should render error message on failure', async () => {
    vi.mocked(backlogService.getBacklog).mockRejectedValue(
      new Error('Failed to load')
    );
    vi.mocked(backlogService.getBacklogTasks).mockResolvedValue([]);
    vi.mocked(sprintService.getSprints).mockResolvedValue([]);

    render(<BacklogDetail backlogId="backlog-123" projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});

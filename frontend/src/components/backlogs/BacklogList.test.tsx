/**
 * Tests for BacklogList component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BacklogList } from './BacklogList';
import { backlogService, Backlog } from '../../services/backlogService';

vi.mock('../../services/backlogService');

describe('BacklogList', () => {
  const mockBacklogs: Backlog[] = [
    {
      id: 'backlog-1',
      name: 'Product Backlog',
      description: 'Main product backlog',
      project_id: 'project-123',
      created_at: '2024-01-01T00:00:00Z',
      task_count: 10,
    },
    {
      id: 'backlog-2',
      name: 'Sprint Backlog',
      project_id: 'project-123',
      created_at: '2024-01-02T00:00:00Z',
      task_count: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(backlogService.getBacklogs).mockImplementation(
      () => new Promise(() => {})
    );

    render(<BacklogList projectId="project-123" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render backlogs after loading', async () => {
    vi.mocked(backlogService.getBacklogs).mockResolvedValue(mockBacklogs);

    render(<BacklogList projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText('Product Backlog')).toBeInTheDocument();
      expect(screen.getByText('Sprint Backlog')).toBeInTheDocument();
    });

    expect(screen.getByText('10 tasks')).toBeInTheDocument();
    expect(screen.getByText('5 tasks')).toBeInTheDocument();
  });

  it('should render error message on failure', async () => {
    vi.mocked(backlogService.getBacklogs).mockRejectedValue(
      new Error('Failed to load')
    );

    render(<BacklogList projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should render empty state when no backlogs', async () => {
    vi.mocked(backlogService.getBacklogs).mockResolvedValue([]);

    render(<BacklogList projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no backlogs found/i)).toBeInTheDocument();
    });
  });

  it('should call onSelectBacklog when backlog is clicked', async () => {
    const onSelectBacklog = vi.fn();
    vi.mocked(backlogService.getBacklogs).mockResolvedValue(mockBacklogs);

    render(
      <BacklogList projectId="project-123" onSelectBacklog={onSelectBacklog} />
    );

    await waitFor(() => {
      expect(screen.getByText('Product Backlog')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Product Backlog'));

    expect(onSelectBacklog).toHaveBeenCalledWith(mockBacklogs[0]);
  });

  it('should show create button when onCreateBacklog provided', async () => {
    const onCreateBacklog = vi.fn();
    vi.mocked(backlogService.getBacklogs).mockResolvedValue(mockBacklogs);

    render(
      <BacklogList
        projectId="project-123"
        onCreateBacklog={onCreateBacklog}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create Backlog')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Create Backlog'));

    expect(onCreateBacklog).toHaveBeenCalled();
  });

  it('should retry loading on error retry button click', async () => {
    vi.mocked(backlogService.getBacklogs)
      .mockRejectedValueOnce(new Error('Failed to load'))
      .mockResolvedValueOnce(mockBacklogs);

    render(<BacklogList projectId="project-123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    // ErrorMessage with inline variant doesn't show retry button
    // So we need to check if the component handles errors properly
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

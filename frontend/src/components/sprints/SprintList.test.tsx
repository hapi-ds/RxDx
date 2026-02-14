import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintList } from './SprintList';
import { sprintService, Sprint } from '../../services/sprintService';

vi.mock('../../services/sprintService');

describe('SprintList', () => {
  const mockSprints: Sprint[] = [
    {
      id: 'sprint-1',
      name: 'Sprint 1',
      goal: 'Complete user authentication',
      start_date: '2024-01-01',
      end_date: '2024-01-14',
      capacity_hours: 80,
      capacity_story_points: 20,
      actual_velocity_hours: 0,
      actual_velocity_story_points: 0,
      status: 'planning',
      project_id: 'project-1',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'sprint-2',
      name: 'Sprint 2',
      goal: 'Implement dashboard',
      start_date: '2024-01-15',
      end_date: '2024-01-28',
      capacity_hours: 80,
      capacity_story_points: 20,
      actual_velocity_hours: 75,
      actual_velocity_story_points: 18,
      status: 'completed',
      project_id: 'project-1',
      created_at: '2024-01-15T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(sprintService.getSprints).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SprintList projectId="project-1" />);

    expect(screen.getByText('Loading sprints...')).toBeInTheDocument();
  });

  it('should render sprints after loading', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    });
  });

  it('should display sprint details', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Complete user authentication')).toBeInTheDocument();
      expect(screen.getByText('Implement dashboard')).toBeInTheDocument();
    });
  });

  it('should display sprint status badges', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('planning')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  it('should display capacity information', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      const capacityElements = screen.getAllByText(/80h/);
      expect(capacityElements.length).toBeGreaterThan(0);
    });
  });

  it('should display velocity for completed sprints', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('75h')).toBeInTheDocument();
    });
  });

  it('should call onSelectSprint when sprint is clicked', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);
    const onSelectSprint = vi.fn();

    render(<SprintList projectId="project-1" onSelectSprint={onSelectSprint} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Sprint 1'));

    expect(onSelectSprint).toHaveBeenCalledWith(mockSprints[0]);
  });

  it('should call onCreateSprint when create button is clicked', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);
    const onCreateSprint = vi.fn();

    render(<SprintList projectId="project-1" onCreateSprint={onCreateSprint} />);

    await waitFor(() => {
      expect(screen.getByText('Create Sprint')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Create Sprint'));

    expect(onCreateSprint).toHaveBeenCalled();
  });

  it('should display error message on failure', async () => {
    vi.mocked(sprintService.getSprints).mockRejectedValue(new Error('API Error'));

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should retry loading on error', async () => {
    vi.mocked(sprintService.getSprints)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Try again'));

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });
  });

  it('should display empty state when no sprints', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue([]);

    render(<SprintList projectId="project-1" onCreateSprint={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No sprints found')).toBeInTheDocument();
      expect(screen.getByText('Create your first sprint')).toBeInTheDocument();
    });
  });

  it('should not show create button when onCreateSprint is not provided', async () => {
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);

    render(<SprintList projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    expect(screen.queryByText('Create Sprint')).not.toBeInTheDocument();
  });
});

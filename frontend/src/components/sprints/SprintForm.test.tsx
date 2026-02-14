import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintForm } from './SprintForm';
import { sprintService, Sprint } from '../../services/sprintService';

vi.mock('../../services/sprintService');

describe('SprintForm', () => {
  const mockSprint: Sprint = {
    id: 'sprint-1',
    name: 'Sprint 1',
    goal: 'Complete user authentication',
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-01-14T00:00:00Z',
    capacity_hours: 80,
    capacity_story_points: 20,
    actual_velocity_hours: 0,
    actual_velocity_story_points: 0,
    status: 'planning',
    project_id: 'project-1',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty form for create mode', () => {
    render(<SprintForm projectId="project-1" />);

    expect(screen.getByLabelText(/Sprint Name/)).toHaveValue('');
    expect(screen.getByLabelText(/Sprint Goal/)).toHaveValue('');
    expect(screen.getByText('Create Sprint')).toBeInTheDocument();
  });

  it('should render populated form for edit mode', () => {
    render(<SprintForm projectId="project-1" sprint={mockSprint} />);

    expect(screen.getByLabelText(/Sprint Name/)).toHaveValue('Sprint 1');
    expect(screen.getByLabelText(/Sprint Goal/)).toHaveValue('Complete user authentication');
    expect(screen.getByText('Update Sprint')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<SprintForm projectId="project-1" />);

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(screen.getByText('Sprint name is required')).toBeInTheDocument();
      expect(screen.getByText('Start date is required')).toBeInTheDocument();
      expect(screen.getByText('End date is required')).toBeInTheDocument();
    });
  });

  it('should validate end date is after start date', async () => {
    render(<SprintForm projectId="project-1" />);

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');
    await userEvent.type(screen.getByLabelText(/Start Date/), '2024-01-15');
    await userEvent.type(screen.getByLabelText(/End Date/), '2024-01-10');

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });
  });

  it('should validate sprint duration does not exceed 30 days', async () => {
    render(<SprintForm projectId="project-1" />);

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');
    await userEvent.type(screen.getByLabelText(/Start Date/), '2024-01-01');
    await userEvent.type(screen.getByLabelText(/End Date/), '2024-02-15');

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(screen.getByText('Sprint duration cannot exceed 30 days')).toBeInTheDocument();
    });
  });

  it('should accept valid capacity values', async () => {
    const onSuccess = vi.fn();
    vi.mocked(sprintService.createSprint).mockResolvedValue(mockSprint);

    render(<SprintForm projectId="project-1" onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');
    await userEvent.type(screen.getByLabelText(/Start Date/), '2024-01-01');
    await userEvent.type(screen.getByLabelText(/End Date/), '2024-01-14');
    await userEvent.type(screen.getByLabelText(/Capacity \(Hours\)/), '80');
    await userEvent.type(screen.getByLabelText(/Capacity \(Story Points\)/), '20');

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(sprintService.createSprint).toHaveBeenCalledWith('project-1', expect.objectContaining({
        capacity_hours: 80,
        capacity_story_points: 20,
      }));
    });
  });

  it('should create sprint successfully', async () => {
    const onSuccess = vi.fn();
    vi.mocked(sprintService.createSprint).mockResolvedValue(mockSprint);

    render(<SprintForm projectId="project-1" onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');
    await userEvent.type(screen.getByLabelText(/Sprint Goal/), 'Complete user authentication');
    await userEvent.type(screen.getByLabelText(/Start Date/), '2024-01-01');
    await userEvent.type(screen.getByLabelText(/End Date/), '2024-01-14');
    await userEvent.type(screen.getByLabelText(/Capacity \(Hours\)/), '80');
    await userEvent.type(screen.getByLabelText(/Capacity \(Story Points\)/), '20');

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(sprintService.createSprint).toHaveBeenCalledWith('project-1', {
        name: 'Sprint 1',
        goal: 'Complete user authentication',
        start_date: '2024-01-01',
        end_date: '2024-01-14',
        capacity_hours: 80,
        capacity_story_points: 20,
      });
      expect(onSuccess).toHaveBeenCalledWith(mockSprint);
    });
  });

  it('should update sprint successfully', async () => {
    const onSuccess = vi.fn();
    const updatedSprint = { ...mockSprint, name: 'Sprint 1 Updated' };
    vi.mocked(sprintService.updateSprint).mockResolvedValue(updatedSprint);

    render(<SprintForm projectId="project-1" sprint={mockSprint} onSuccess={onSuccess} />);

    const nameInput = screen.getByLabelText(/Sprint Name/);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Sprint 1 Updated');

    await userEvent.click(screen.getByText('Update Sprint'));

    await waitFor(() => {
      expect(sprintService.updateSprint).toHaveBeenCalledWith('sprint-1', expect.objectContaining({
        name: 'Sprint 1 Updated',
      }));
      expect(onSuccess).toHaveBeenCalledWith(updatedSprint);
    });
  });

  it('should display error on API failure', async () => {
    vi.mocked(sprintService.createSprint).mockRejectedValue(new Error('API Error'));

    render(<SprintForm projectId="project-1" />);

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');
    await userEvent.type(screen.getByLabelText(/Start Date/), '2024-01-01');
    await userEvent.type(screen.getByLabelText(/End Date/), '2024-01-14');

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();

    render(<SprintForm projectId="project-1" onCancel={onCancel} />);

    await userEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('should disable submit button while submitting', async () => {
    vi.mocked(sprintService.createSprint).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SprintForm projectId="project-1" />);

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');
    await userEvent.type(screen.getByLabelText(/Start Date/), '2024-01-01');
    await userEvent.type(screen.getByLabelText(/End Date/), '2024-01-14');

    const submitButton = screen.getByText('Create Sprint');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('should clear field errors on input change', async () => {
    render(<SprintForm projectId="project-1" />);

    await userEvent.click(screen.getByText('Create Sprint'));

    await waitFor(() => {
      expect(screen.getByText('Sprint name is required')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/Sprint Name/), 'Sprint 1');

    await waitFor(() => {
      expect(screen.queryByText('Sprint name is required')).not.toBeInTheDocument();
    });
  });
});

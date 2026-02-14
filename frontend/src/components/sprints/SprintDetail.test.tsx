import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintDetail } from './SprintDetail';
import { sprintService } from '../../services/sprintService';
import type { Sprint, SprintStatistics } from '../../services/sprintService';

vi.mock('../../services/sprintService');

describe('SprintDetail', () => {
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
    created_at: '2023-12-15T00:00:00Z',
  };

  const mockStatistics: SprintStatistics = {
    total_tasks: 10,
    completed_tasks: 3,
    in_progress_tasks: 2,
    completed_hours: 24,
    remaining_hours: 56,
    completion_percentage: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders sprint name and status', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
    });

    it('renders sprint goal when provided', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(screen.getByText('Sprint Goal')).toBeInTheDocument();
      expect(screen.getByText('Complete user authentication')).toBeInTheDocument();
    });

    it('does not render goal section when goal is not provided', () => {
      const sprintWithoutGoal = { ...mockSprint, goal: undefined };
      render(<SprintDetail sprint={sprintWithoutGoal} />);
      
      expect(screen.queryByText('Sprint Goal')).not.toBeInTheDocument();
    });

    it('renders start and end dates', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
      expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('January 14, 2024')).toBeInTheDocument();
    });

    it('renders capacity when provided', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(screen.getByText('Capacity')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument(); // hours
      expect(screen.getByText('20')).toBeInTheDocument(); // story points
    });

    it('does not render capacity section when not provided', () => {
      const sprintWithoutCapacity = {
        ...mockSprint,
        capacity_hours: undefined,
        capacity_story_points: undefined,
      };
      render(<SprintDetail sprint={sprintWithoutCapacity} />);
      
      expect(screen.queryByText('Capacity')).not.toBeInTheDocument();
    });

    it('renders created date', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/December 15, 2023/)).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('applies correct color for planning status', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      const statusElement = screen.getByText('Planning');
      expect(statusElement).toHaveClass('text-gray-600');
    });

    it('applies correct color for active status', () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      render(<SprintDetail sprint={activeSprint} />);
      
      const statusElement = screen.getByText('Active');
      expect(statusElement).toHaveClass('text-green-600');
    });

    it('applies correct color for completed status', () => {
      const completedSprint = { ...mockSprint, status: 'completed' as const };
      render(<SprintDetail sprint={completedSprint} />);
      
      const statusElement = screen.getByText('Completed');
      expect(statusElement).toHaveClass('text-blue-600');
    });

    it('applies correct color for cancelled status', () => {
      const cancelledSprint = { ...mockSprint, status: 'cancelled' as const };
      render(<SprintDetail sprint={cancelledSprint} />);
      
      const statusElement = screen.getByText('Cancelled');
      expect(statusElement).toHaveClass('text-red-600');
    });
  });

  describe('Action Buttons', () => {
    it('shows Edit button for planning sprint when onEdit provided', () => {
      const onEdit = vi.fn();
      render(<SprintDetail sprint={mockSprint} onEdit={onEdit} />);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('does not show Edit button for active sprint', () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      const onEdit = vi.fn();
      render(<SprintDetail sprint={activeSprint} onEdit={onEdit} />);
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('shows Start Sprint button for planning sprint when onStart provided', () => {
      const onStart = vi.fn();
      render(<SprintDetail sprint={mockSprint} onStart={onStart} />);
      
      expect(screen.getByText('Start Sprint')).toBeInTheDocument();
    });

    it('does not show Start Sprint button for active sprint', () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      const onStart = vi.fn();
      render(<SprintDetail sprint={activeSprint} onStart={onStart} />);
      
      expect(screen.queryByText('Start Sprint')).not.toBeInTheDocument();
    });

    it('shows Complete Sprint button for active sprint when onComplete provided', () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      const onComplete = vi.fn();
      render(<SprintDetail sprint={activeSprint} onComplete={onComplete} />);
      
      expect(screen.getByText('Complete Sprint')).toBeInTheDocument();
    });

    it('does not show Complete Sprint button for planning sprint', () => {
      const onComplete = vi.fn();
      render(<SprintDetail sprint={mockSprint} onComplete={onComplete} />);
      
      expect(screen.queryByText('Complete Sprint')).not.toBeInTheDocument();
    });

    it('shows View Burndown button for active sprint when onViewBurndown provided', () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      const onViewBurndown = vi.fn();
      render(<SprintDetail sprint={activeSprint} onViewBurndown={onViewBurndown} />);
      
      expect(screen.getByText('View Burndown')).toBeInTheDocument();
    });

    it('shows View Burndown button for completed sprint', () => {
      const completedSprint = { ...mockSprint, status: 'completed' as const };
      const onViewBurndown = vi.fn();
      render(<SprintDetail sprint={completedSprint} onViewBurndown={onViewBurndown} />);
      
      expect(screen.getByText('View Burndown')).toBeInTheDocument();
    });

    it('does not show View Burndown button for planning sprint', () => {
      const onViewBurndown = vi.fn();
      render(<SprintDetail sprint={mockSprint} onViewBurndown={onViewBurndown} />);
      
      expect(screen.queryByText('View Burndown')).not.toBeInTheDocument();
    });

    it('shows Delete button when onDelete provided', () => {
      const onDelete = vi.fn();
      render(<SprintDetail sprint={mockSprint} onDelete={onDelete} />);
      
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls onEdit when Edit button clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<SprintDetail sprint={mockSprint} onEdit={onEdit} />);
      
      await user.click(screen.getByText('Edit'));
      
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onStart when Start Sprint button clicked', async () => {
      const user = userEvent.setup();
      const onStart = vi.fn();
      render(<SprintDetail sprint={mockSprint} onStart={onStart} />);
      
      await user.click(screen.getByText('Start Sprint'));
      
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete when Complete Sprint button clicked', async () => {
      const user = userEvent.setup();
      const activeSprint = { ...mockSprint, status: 'active' as const };
      const onComplete = vi.fn();
      render(<SprintDetail sprint={activeSprint} onComplete={onComplete} />);
      
      await user.click(screen.getByText('Complete Sprint'));
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onViewBurndown when View Burndown button clicked', async () => {
      const user = userEvent.setup();
      const activeSprint = { ...mockSprint, status: 'active' as const };
      const onViewBurndown = vi.fn();
      render(<SprintDetail sprint={activeSprint} onViewBurndown={onViewBurndown} />);
      
      await user.click(screen.getByText('View Burndown'));
      
      expect(onViewBurndown).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when Delete button clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(<SprintDetail sprint={mockSprint} onDelete={onDelete} />);
      
      await user.click(screen.getByText('Delete'));
      
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics Loading', () => {
    it('loads statistics for active sprint', async () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      vi.mocked(sprintService.getSprintStatistics).mockResolvedValue(mockStatistics);
      
      render(<SprintDetail sprint={activeSprint} />);
      
      await waitFor(() => {
        expect(sprintService.getSprintStatistics).toHaveBeenCalledWith('sprint-1');
      });
    });

    it('loads statistics for completed sprint', async () => {
      const completedSprint = { ...mockSprint, status: 'completed' as const };
      vi.mocked(sprintService.getSprintStatistics).mockResolvedValue(mockStatistics);
      
      render(<SprintDetail sprint={completedSprint} />);
      
      await waitFor(() => {
        expect(sprintService.getSprintStatistics).toHaveBeenCalledWith('sprint-1');
      });
    });

    it('does not load statistics for planning sprint', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(sprintService.getSprintStatistics).not.toHaveBeenCalled();
    });

    it('displays loading state while fetching statistics', async () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      vi.mocked(sprintService.getSprintStatistics).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      render(<SprintDetail sprint={activeSprint} />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
      });
    });

    it('displays statistics when loaded successfully', async () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      vi.mocked(sprintService.getSprintStatistics).mockResolvedValue(mockStatistics);
      
      render(<SprintDetail sprint={activeSprint} />);
      
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // total tasks
        expect(screen.getByText('3')).toBeInTheDocument(); // completed tasks
        expect(screen.getByText('2')).toBeInTheDocument(); // in progress tasks
        expect(screen.getByText('24')).toBeInTheDocument(); // completed hours
        expect(screen.getByText('56')).toBeInTheDocument(); // remaining hours
        expect(screen.getByText('30%')).toBeInTheDocument(); // completion percentage
      });
    });

    it('displays error message when statistics loading fails', async () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      vi.mocked(sprintService.getSprintStatistics).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<SprintDetail sprint={activeSprint} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Velocity Display', () => {
    it('displays velocity for completed sprint', () => {
      const completedSprint: Sprint = {
        ...mockSprint,
        status: 'completed',
        actual_velocity_hours: 72,
        actual_velocity_story_points: 18,
      };
      
      render(<SprintDetail sprint={completedSprint} />);
      
      expect(screen.getByText('Actual Velocity')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    it('does not display velocity for active sprint', () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      
      render(<SprintDetail sprint={activeSprint} />);
      
      expect(screen.queryByText('Actual Velocity')).not.toBeInTheDocument();
    });

    it('does not display velocity for planning sprint', () => {
      render(<SprintDetail sprint={mockSprint} />);
      
      expect(screen.queryByText('Actual Velocity')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles sprint with only hours capacity', () => {
      const sprintWithHoursOnly = {
        ...mockSprint,
        capacity_story_points: undefined,
      };
      
      render(<SprintDetail sprint={sprintWithHoursOnly} />);
      
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.queryByText('Story Points')).not.toBeInTheDocument();
    });

    it('handles sprint with only story points capacity', () => {
      const sprintWithPointsOnly = {
        ...mockSprint,
        capacity_hours: undefined,
      };
      
      render(<SprintDetail sprint={sprintWithPointsOnly} />);
      
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.queryByText(/^Hours$/)).not.toBeInTheDocument();
    });

    it('handles very long sprint names', () => {
      const longNameSprint = {
        ...mockSprint,
        name: 'This is a very long sprint name that should still be displayed correctly without breaking the layout',
      };
      
      render(<SprintDetail sprint={longNameSprint} />);
      
      expect(screen.getByText(longNameSprint.name)).toBeInTheDocument();
    });

    it('handles very long sprint goals', () => {
      const longGoalSprint = {
        ...mockSprint,
        goal: 'This is a very long sprint goal that describes in great detail what the team aims to accomplish during this sprint iteration including multiple features and improvements',
      };
      
      render(<SprintDetail sprint={longGoalSprint} />);
      
      expect(screen.getByText(longGoalSprint.goal)).toBeInTheDocument();
    });
  });
});

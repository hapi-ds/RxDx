import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintBurndown } from './SprintBurndown';
import { sprintService } from '../../services/sprintService';
import type { BurndownPoint } from '../../services/sprintService';

vi.mock('../../services/sprintService');

describe('SprintBurndown', () => {
  const mockBurndownData: BurndownPoint[] = [
    {
      date: '2024-01-01',
      ideal_remaining_hours: 80,
      actual_remaining_hours: 80,
      ideal_remaining_points: 20,
      actual_remaining_points: 20,
    },
    {
      date: '2024-01-02',
      ideal_remaining_hours: 70,
      actual_remaining_hours: 75,
      ideal_remaining_points: 17.5,
      actual_remaining_points: 19,
    },
    {
      date: '2024-01-03',
      ideal_remaining_hours: 60,
      actual_remaining_hours: 65,
      ideal_remaining_points: 15,
      actual_remaining_points: 16,
    },
    {
      date: '2024-01-04',
      ideal_remaining_hours: 50,
      actual_remaining_hours: 50,
      ideal_remaining_points: 12.5,
      actual_remaining_points: 12,
    },
    {
      date: '2024-01-05',
      ideal_remaining_hours: 40,
      actual_remaining_hours: 35,
      ideal_remaining_points: 10,
      actual_remaining_points: 8,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders burndown chart title with sprint name', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Burndown Chart - Sprint 1')).toBeInTheDocument();
      });
    });

    it('renders legend with ideal and actual labels', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Ideal')).toBeInTheDocument();
        expect(screen.getByText('Actual')).toBeInTheDocument();
      });
    });

    it('renders SVG chart', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('renders summary with ideal and actual remaining values', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Ideal Remaining')).toBeInTheDocument();
        expect(screen.getByText('Actual Remaining')).toBeInTheDocument();
        expect(screen.getByText('40')).toBeInTheDocument(); // ideal remaining hours
        expect(screen.getByText('35')).toBeInTheDocument(); // actual remaining hours
      });
    });
  });

  describe('Data Loading', () => {
    it('loads burndown data on mount', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(sprintService.getSprintBurndown).toHaveBeenCalledWith('sprint-1');
      });
    });

    it('displays loading state while fetching data', () => {
      vi.mocked(sprintService.getSprintBurndown).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      expect(screen.getByText('Loading burndown chart...')).toBeInTheDocument();
    });

    it('displays error message when loading fails', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('displays try again button on error', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('retries loading when try again button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(sprintService.getSprintBurndown)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Try again'));
      
      await waitFor(() => {
        expect(sprintService.getSprintBurndown).toHaveBeenCalledTimes(2);
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });

    it('displays empty state when no data available', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue([]);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('No burndown data available')).toBeInTheDocument();
      });
    });
  });

  describe('Hours vs Story Points', () => {
    it('displays hours by default', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('40')).toBeInTheDocument(); // ideal remaining hours
        expect(screen.getByText('35')).toBeInTheDocument(); // actual remaining hours
      });
    });

    it('displays story points when useStoryPoints is true', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(
        <SprintBurndown
          sprintId="sprint-1"
          sprintName="Sprint 1"
          useStoryPoints={true}
        />
      );
      
      await waitFor(() => {
        const summarySection = screen.getByText('Ideal Remaining').closest('.grid');
        expect(summarySection).toBeInTheDocument();
        expect(summarySection?.textContent).toContain('10'); // ideal remaining points
        expect(summarySection?.textContent).toContain('8'); // actual remaining points
      });
    });

    it('displays correct y-axis label for hours', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const yAxisLabel = container.querySelector('text[transform*="rotate"]');
        expect(yAxisLabel?.textContent).toBe('Hours Remaining');
      });
    });

    it('displays correct y-axis label for story points', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown
          sprintId="sprint-1"
          sprintName="Sprint 1"
          useStoryPoints={true}
        />
      );
      
      await waitFor(() => {
        const yAxisLabel = container.querySelector('text[transform*="rotate"]');
        expect(yAxisLabel?.textContent).toBe('Story Points Remaining');
      });
    });
  });

  describe('Chart Elements', () => {
    it('renders ideal line as dashed', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const idealLine = container.querySelector('path[stroke="#3b82f6"]');
        expect(idealLine).toHaveAttribute('stroke-dasharray', '5,5');
      });
    });

    it('renders actual line as solid', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const actualLine = container.querySelector('path[stroke="#10b981"]');
        expect(actualLine).not.toHaveAttribute('stroke-dasharray');
      });
    });

    it('renders data points for ideal line', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const idealPoints = container.querySelectorAll('circle[fill="#3b82f6"]');
        expect(idealPoints).toHaveLength(mockBurndownData.length);
      });
    });

    it('renders data points for actual line', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const actualPoints = container.querySelectorAll('circle[fill="#10b981"]');
        expect(actualPoints).toHaveLength(mockBurndownData.length);
      });
    });

    it('renders x-axis', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const xAxis = container.querySelector('line[stroke="#e5e7eb"]');
        expect(xAxis).toBeInTheDocument();
      });
    });

    it('renders y-axis', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const yAxis = container.querySelector('line[stroke="#e5e7eb"]');
        expect(yAxis).toBeInTheDocument();
      });
    });

    it('renders y-axis grid lines', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const gridLines = container.querySelectorAll('line[stroke="#f3f4f6"]');
        expect(gridLines.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly on x-axis', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Jan 1')).toBeInTheDocument();
        expect(screen.getByText('Jan 5')).toBeInTheDocument();
      });
    });

    it('shows first and last date labels', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Jan 1')).toBeInTheDocument();
        expect(screen.getByText('Jan 5')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', async () => {
      const singlePoint: BurndownPoint[] = [
        {
          date: '2024-01-01',
          ideal_remaining_hours: 80,
          actual_remaining_hours: 80,
          ideal_remaining_points: 20,
          actual_remaining_points: 20,
        },
      ];
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(singlePoint);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        const summarySection = screen.getByText('Ideal Remaining').closest('.grid');
        expect(summarySection).toBeInTheDocument();
        expect(summarySection?.textContent).toContain('80');
      });
    });

    it('handles zero remaining values', async () => {
      const zeroData: BurndownPoint[] = [
        {
          date: '2024-01-01',
          ideal_remaining_hours: 80,
          actual_remaining_hours: 80,
          ideal_remaining_points: 20,
          actual_remaining_points: 20,
        },
        {
          date: '2024-01-02',
          ideal_remaining_hours: 0,
          actual_remaining_hours: 0,
          ideal_remaining_points: 0,
          actual_remaining_points: 0,
        },
      ];
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(zeroData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        const summarySection = screen.getByText('Ideal Remaining').closest('.grid');
        expect(summarySection).toBeInTheDocument();
        expect(summarySection?.textContent).toContain('0');
      });
    });

    it('handles very long sprint names', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      render(
        <SprintBurndown
          sprintId="sprint-1"
          sprintName="This is a very long sprint name that should still be displayed"
        />
      );
      
      await waitFor(() => {
        expect(
          screen.getByText(/Burndown Chart - This is a very long sprint name/)
        ).toBeInTheDocument();
      });
    });

    it('handles large burndown values', async () => {
      const largeData: BurndownPoint[] = [
        {
          date: '2024-01-01',
          ideal_remaining_hours: 1000,
          actual_remaining_hours: 1000,
          ideal_remaining_points: 250,
          actual_remaining_points: 250,
        },
        {
          date: '2024-01-02',
          ideal_remaining_hours: 500,
          actual_remaining_hours: 600,
          ideal_remaining_points: 125,
          actual_remaining_points: 150,
        },
      ];
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(largeData);
      
      render(<SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />);
      
      await waitFor(() => {
        const summarySection = screen.getByText('Ideal Remaining').closest('.grid');
        expect(summarySection).toBeInTheDocument();
        expect(summarySection?.textContent).toContain('500');
        expect(summarySection?.textContent).toContain('600');
      });
    });

    it('handles many data points', async () => {
      const manyPoints: BurndownPoint[] = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        ideal_remaining_hours: 80 - i * 2.67,
        actual_remaining_hours: 80 - i * 2.5,
        ideal_remaining_points: 20 - i * 0.67,
        actual_remaining_points: 20 - i * 0.6,
      }));
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(manyPoints);
      
      const { container } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        const dataPoints = container.querySelectorAll('circle');
        expect(dataPoints.length).toBe(manyPoints.length * 2); // ideal + actual
      });
    });
  });

  describe('Reloading', () => {
    it('reloads data when sprintId changes', async () => {
      vi.mocked(sprintService.getSprintBurndown).mockResolvedValue(mockBurndownData);
      
      const { rerender } = render(
        <SprintBurndown sprintId="sprint-1" sprintName="Sprint 1" />
      );
      
      await waitFor(() => {
        expect(sprintService.getSprintBurndown).toHaveBeenCalledWith('sprint-1');
      });
      
      rerender(<SprintBurndown sprintId="sprint-2" sprintName="Sprint 2" />);
      
      await waitFor(() => {
        expect(sprintService.getSprintBurndown).toHaveBeenCalledWith('sprint-2');
      });
    });
  });
});

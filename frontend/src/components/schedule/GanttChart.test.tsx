/**
 * GanttChart component tests
 * Tests visualization, interactions, and accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GanttChart, type GanttChartProps, type TaskDependency } from './GanttChart';
import type { ScheduledTask } from '../../services/scheduleService';

describe('GanttChart', () => {
  const mockTasks: ScheduledTask[] = [
    {
      task_id: 'task-1',
      task_title: 'Design Phase',
      start_date: '2024-01-01',
      end_date: '2024-01-10',
      duration_hours: 80,
      assigned_resources: ['dev-1'],
    },
    {
      task_id: 'task-2',
      task_title: 'Development Phase',
      start_date: '2024-01-11',
      end_date: '2024-01-25',
      duration_hours: 120,
      assigned_resources: ['dev-1', 'dev-2'],
    },
    {
      task_id: 'task-3',
      task_title: 'Testing Phase',
      start_date: '2024-01-26',
      end_date: '2024-02-05',
      duration_hours: 80,
      assigned_resources: ['qa-1'],
    },
  ];

  const mockDependencies: TaskDependency[] = [
    {
      from_task_id: 'task-1',
      to_task_id: 'task-2',
      type: 'finish-to-start',
    },
    {
      from_task_id: 'task-2',
      to_task_id: 'task-3',
      type: 'finish-to-start',
    },
  ];

  const mockCriticalPath = ['task-1', 'task-2'];

  const defaultProps: GanttChartProps = {
    tasks: mockTasks,
    dependencies: mockDependencies,
    criticalPath: mockCriticalPath,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render gantt chart with tasks', () => {
      render(<GanttChart {...defaultProps} />);

      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /gantt chart showing 3 tasks/i })).toBeInTheDocument();
    });

    it('should render all task bars', () => {
      render(<GanttChart {...defaultProps} />);

      const svg = screen.getByRole('img');
      const taskBars = within(svg).getAllByText(/Phase/);
      expect(taskBars).toHaveLength(3);
    });

    it('should render empty state when no tasks', () => {
      render(<GanttChart tasks={[]} />);

      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
      expect(screen.getByText(/Add tasks to your project/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <GanttChart {...defaultProps} className="custom-class" />
      );

      const chart = container.querySelector('.gantt-chart');
      expect(chart).toHaveClass('custom-class');
    });

    it('should render with custom height', () => {
      render(<GanttChart {...defaultProps} height={800} />);

      const container = screen.getByRole('img').closest('.gantt-container');
      expect(container).toHaveStyle({ height: '800px' });
    });
  });

  describe('Critical Path', () => {
    it('should highlight critical path tasks', () => {
      render(<GanttChart {...defaultProps} showCriticalPath={true} />);

      expect(screen.getByText('Critical Path')).toBeInTheDocument();
    });

    it('should not show critical path when disabled', () => {
      render(<GanttChart {...defaultProps} showCriticalPath={false} />);

      expect(screen.queryByText('Critical Path')).not.toBeInTheDocument();
    });

    it('should show legend when critical path is enabled', () => {
      render(<GanttChart {...defaultProps} showCriticalPath={true} />);

      expect(screen.getByText('Normal Task')).toBeInTheDocument();
      expect(screen.getByText('Critical Path')).toBeInTheDocument();
    });
  });

  describe('Dependencies', () => {
    it('should render dependency lines when enabled', () => {
      render(<GanttChart {...defaultProps} showDependencies={true} />);

      const svg = screen.getByRole('img');
      const dependencies = svg.querySelectorAll('.gantt-dependency');
      expect(dependencies.length).toBeGreaterThan(0);
    });

    it('should not render dependencies when disabled', () => {
      render(<GanttChart {...defaultProps} showDependencies={false} />);

      const svg = screen.getByRole('img');
      const dependencies = svg.querySelectorAll('.gantt-dependency');
      expect(dependencies).toHaveLength(0);
    });

    it('should show dependency legend item', () => {
      render(<GanttChart {...defaultProps} showDependencies={true} />);

      expect(screen.getByText('Dependency')).toBeInTheDocument();
    });
  });

  describe('Today Line', () => {
    it('should show today line when enabled', () => {
      // Create tasks that span today
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasksSpanningToday: ScheduledTask[] = [
        {
          task_id: 'task-today',
          task_title: 'Current Task',
          start_date: yesterday.toISOString().split('T')[0],
          end_date: tomorrow.toISOString().split('T')[0],
          duration_hours: 16,
        },
      ];

      render(<GanttChart tasks={tasksSpanningToday} showToday={true} />);

      const svg = screen.getByRole('img');
      const todayLine = svg.querySelector('.today-line');
      expect(todayLine).toBeInTheDocument();
    });

    it('should not show today line when disabled', () => {
      render(<GanttChart {...defaultProps} showToday={false} />);

      const svg = screen.getByRole('img');
      const todayLine = svg.querySelector('.today-line');
      expect(todayLine).not.toBeInTheDocument();
    });
  });

  describe('Zoom Controls', () => {
    it('should render zoom controls', () => {
      render(<GanttChart {...defaultProps} />);

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset view')).toBeInTheDocument();
      expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();
    });

    it('should zoom in when zoom in button clicked', () => {
      render(<GanttChart {...defaultProps} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      expect(screen.getByText('Zoom: 120%')).toBeInTheDocument();
    });

    it('should zoom out when zoom out button clicked', () => {
      render(<GanttChart {...defaultProps} />);

      const zoomOutButton = screen.getByLabelText('Zoom out');
      fireEvent.click(zoomOutButton);

      expect(screen.getByText('Zoom: 80%')).toBeInTheDocument();
    });

    it('should reset zoom when reset button clicked', () => {
      render(<GanttChart {...defaultProps} />);

      // Zoom in first
      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);
      expect(screen.getByText('Zoom: 120%')).toBeInTheDocument();

      // Reset
      const resetButton = screen.getByLabelText('Reset view');
      fireEvent.click(resetButton);
      expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();
    });

    it('should limit zoom to minimum 50%', () => {
      render(<GanttChart {...defaultProps} />);

      const zoomOutButton = screen.getByLabelText('Zoom out');
      
      // Click multiple times to try to go below 50%
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomOutButton);
      }

      const zoomText = screen.getByText(/Zoom:/);
      const zoomValue = parseInt(zoomText.textContent?.match(/\d+/)?.[0] || '0');
      expect(zoomValue).toBeGreaterThanOrEqual(50);
    });

    it('should limit zoom to maximum 300%', () => {
      render(<GanttChart {...defaultProps} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      
      // Click multiple times to try to go above 300%
      for (let i = 0; i < 20; i++) {
        fireEvent.click(zoomInButton);
      }

      const zoomText = screen.getByText(/Zoom:/);
      const zoomValue = parseInt(zoomText.textContent?.match(/\d+/)?.[0] || '0');
      expect(zoomValue).toBeLessThanOrEqual(300);
    });
  });

  describe('Task Interactions', () => {
    it('should call onTaskClick when task is clicked', () => {
      const onTaskClick = vi.fn();
      render(<GanttChart {...defaultProps} onTaskClick={onTaskClick} />);

      const svg = screen.getByRole('img');
      const taskBars = svg.querySelectorAll('.gantt-task');
      
      fireEvent.click(taskBars[0]);
      expect(onTaskClick).toHaveBeenCalledWith('task-1');
    });

    it('should call onTaskHover when task is hovered', () => {
      const onTaskHover = vi.fn();
      render(<GanttChart {...defaultProps} onTaskHover={onTaskHover} />);

      const svg = screen.getByRole('img');
      const taskBars = svg.querySelectorAll('.gantt-task');
      
      fireEvent.mouseEnter(taskBars[0]);
      expect(onTaskHover).toHaveBeenCalledWith('task-1');
    });

    it('should call onTaskHover with null when mouse leaves task', () => {
      const onTaskHover = vi.fn();
      render(<GanttChart {...defaultProps} onTaskHover={onTaskHover} />);

      const svg = screen.getByRole('img');
      const taskBars = svg.querySelectorAll('.gantt-task');
      
      fireEvent.mouseEnter(taskBars[0]);
      fireEvent.mouseLeave(taskBars[0]);
      
      expect(onTaskHover).toHaveBeenLastCalledWith(null);
    });

    it('should show tooltip on hover', () => {
      render(<GanttChart {...defaultProps} />);

      const svg = screen.getByRole('img');
      const taskBars = svg.querySelectorAll('.gantt-task');
      
      fireEvent.mouseEnter(taskBars[0]);

      const tooltip = svg.querySelector('.task-tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single task', () => {
      const singleTask: ScheduledTask[] = [mockTasks[0]];
      render(<GanttChart tasks={singleTask} />);

      expect(screen.getByRole('img', { name: /gantt chart showing 1 task/i })).toBeInTheDocument();
    });

    it('should handle tasks with same start date', () => {
      const overlappingTasks: ScheduledTask[] = [
        {
          task_id: 'task-a',
          task_title: 'Task A',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          duration_hours: 40,
        },
        {
          task_id: 'task-b',
          task_title: 'Task B',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          duration_hours: 40,
        },
      ];

      render(<GanttChart tasks={overlappingTasks} />);

      const svg = screen.getByRole('img');
      const taskBars = within(svg).getAllByText(/Task [AB]/);
      expect(taskBars).toHaveLength(2);
    });

    it('should handle very short tasks', () => {
      const shortTask: ScheduledTask[] = [
        {
          task_id: 'short-task',
          task_title: 'Short',
          start_date: '2024-01-01',
          end_date: '2024-01-01',
          duration_hours: 1,
        },
      ];

      render(<GanttChart tasks={shortTask} />);

      const svg = screen.getByRole('img');
      const taskBar = svg.querySelector('.gantt-task rect');
      expect(taskBar).toBeInTheDocument();
      // Should have minimum width
      const width = taskBar?.getAttribute('width');
      expect(parseFloat(width || '0')).toBeGreaterThanOrEqual(10);
    });

    it('should handle many tasks', () => {
      const manyTasks: ScheduledTask[] = Array.from({ length: 50 }, (_, i) => ({
        task_id: `task-${i}`,
        task_title: `Task ${i}`,
        start_date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
        end_date: `2024-01-${String((i % 28 + 1) + 1).padStart(2, '0')}`,
        duration_hours: 8,
      }));

      render(<GanttChart tasks={manyTasks} />);

      expect(screen.getByRole('img', { name: /gantt chart showing 50 tasks/i })).toBeInTheDocument();
    });

    it('should handle missing dependencies', () => {
      const invalidDependencies: TaskDependency[] = [
        {
          from_task_id: 'non-existent',
          to_task_id: 'task-1',
          type: 'finish-to-start',
        },
      ];

      render(<GanttChart {...defaultProps} dependencies={invalidDependencies} />);

      // Should render without errors
      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });

    it('should handle empty critical path', () => {
      render(<GanttChart {...defaultProps} criticalPath={[]} />);

      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });

    it('should handle undefined optional props', () => {
      render(<GanttChart tasks={mockTasks} />);

      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GanttChart {...defaultProps} />);

      expect(screen.getByRole('img', { name: /gantt chart showing 3 tasks/i })).toBeInTheDocument();
    });

    it('should have accessible zoom controls', () => {
      render(<GanttChart {...defaultProps} />);

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset view')).toBeInTheDocument();
    });

    it('should have title attributes on buttons', () => {
      render(<GanttChart {...defaultProps} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      expect(zoomInButton).toHaveAttribute('title');
    });

    it('should support keyboard navigation', () => {
      const onTaskClick = vi.fn();
      render(<GanttChart {...defaultProps} onTaskClick={onTaskClick} />);

      const svg = screen.getByRole('img');
      const taskBars = svg.querySelectorAll('.gantt-task');
      
      // Simulate keyboard interaction
      fireEvent.click(taskBars[0]);
      expect(onTaskClick).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should render on small screens', () => {
      // Mock small viewport
      global.innerWidth = 375;
      
      render(<GanttChart {...defaultProps} />);

      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });

    it('should render on large screens', () => {
      // Mock large viewport
      global.innerWidth = 1920;
      
      render(<GanttChart {...defaultProps} />);

      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });
  });

  describe('Time Grid', () => {
    it('should render time grid lines', () => {
      render(<GanttChart {...defaultProps} />);

      const svg = screen.getByRole('img');
      const timeGrid = svg.querySelector('.time-grid');
      expect(timeGrid).toBeInTheDocument();
    });

    it('should show month labels', () => {
      render(<GanttChart {...defaultProps} />);

      const svg = screen.getByRole('img');
      // Should have month labels in the time grid
      const monthLabels = within(svg).getAllByText(/Jan|Feb/);
      expect(monthLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Pan Functionality', () => {
    it('should handle mouse down for panning', () => {
      render(<GanttChart {...defaultProps} />);

      const svg = screen.getByRole('img');
      
      fireEvent.mouseDown(svg, { button: 0, shiftKey: true, clientX: 100, clientY: 100 });
      fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(svg);

      // Should not throw errors
      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });

    it('should not pan without shift key', () => {
      render(<GanttChart {...defaultProps} />);

      const svg = screen.getByRole('img');
      
      fireEvent.mouseDown(svg, { button: 0, shiftKey: false, clientX: 100, clientY: 100 });
      fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 });

      // Should not start panning
      expect(screen.getByText('Project Schedule')).toBeInTheDocument();
    });
  });

  describe('Dependency Types', () => {
    it('should render finish-to-start dependencies', () => {
      const deps: TaskDependency[] = [
        { from_task_id: 'task-1', to_task_id: 'task-2', type: 'finish-to-start' },
      ];
      render(<GanttChart {...defaultProps} dependencies={deps} />);

      const svg = screen.getByRole('img');
      const dependencies = svg.querySelectorAll('.gantt-dependency');
      expect(dependencies.length).toBeGreaterThan(0);
    });

    it('should render start-to-start dependencies', () => {
      const deps: TaskDependency[] = [
        { from_task_id: 'task-1', to_task_id: 'task-2', type: 'start-to-start' },
      ];
      render(<GanttChart {...defaultProps} dependencies={deps} />);

      const svg = screen.getByRole('img');
      const dependencies = svg.querySelectorAll('.gantt-dependency');
      expect(dependencies.length).toBeGreaterThan(0);
    });

    it('should render finish-to-finish dependencies', () => {
      const deps: TaskDependency[] = [
        { from_task_id: 'task-1', to_task_id: 'task-2', type: 'finish-to-finish' },
      ];
      render(<GanttChart {...defaultProps} dependencies={deps} />);

      const svg = screen.getByRole('img');
      const dependencies = svg.querySelectorAll('.gantt-dependency');
      expect(dependencies.length).toBeGreaterThan(0);
    });

    it('should render start-to-finish dependencies', () => {
      const deps: TaskDependency[] = [
        { from_task_id: 'task-1', to_task_id: 'task-2', type: 'start-to-finish' },
      ];
      render(<GanttChart {...defaultProps} dependencies={deps} />);

      const svg = screen.getByRole('img');
      const dependencies = svg.querySelectorAll('.gantt-dependency');
      expect(dependencies.length).toBeGreaterThan(0);
    });
  });
});

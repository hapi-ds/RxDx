/**
 * ResourceAllocation component tests
 * Tests resource allocation visualization and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ResourceAllocation } from './ResourceAllocation';
import type { ScheduledTask, Resource } from '../../services/scheduleService';

describe('ResourceAllocation', () => {
  const mockResources: Resource[] = [
    {
      id: 'dev-1',
      name: 'Alice Johnson',
      type: 'Developer',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'qa-1',
      name: 'Bob Smith',
      type: 'QA Engineer',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'pm-1',
      name: 'Carol Williams',
      type: 'Project Manager',
      capacity: 160,
      availability: 1.0,
    },
  ];

  const mockTasks: ScheduledTask[] = [
    {
      task_id: 'task-1',
      task_title: 'Backend Development',
      start_date: '2024-01-01',
      end_date: '2024-01-10',
      duration_hours: 80,
      assigned_resources: ['dev-1'],
    },
    {
      task_id: 'task-2',
      task_title: 'Testing',
      start_date: '2024-01-11',
      end_date: '2024-01-20',
      duration_hours: 80,
      assigned_resources: ['qa-1'],
    },
  ];

  describe('Rendering', () => {
    it('should render component with title', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      expect(screen.getByText('Resource Allocation')).toBeInTheDocument();
    });

    it('should render all resources', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol Williams')).toBeInTheDocument();
    });

    it('should render resource type filter', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      expect(screen.getByLabelText('Filter by resource type')).toBeInTheDocument();
    });

    it('should render statistics panel', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      expect(screen.getByText('Total Resources:')).toBeInTheDocument();
      expect(screen.getByText('Total Tasks:')).toBeInTheDocument();
      expect(screen.getByText('Avg Utilization:')).toBeInTheDocument();
      expect(screen.getByText('Over-allocated:')).toBeInTheDocument();
    });

    it('should display correct statistics', () => {
      const { container } = render(
        <ResourceAllocation tasks={mockTasks} resources={mockResources} />
      );
      const statValues = container.querySelectorAll('.stat-value');
      expect(statValues[0]).toHaveTextContent('3'); // Total resources
      expect(statValues[1]).toHaveTextContent('2'); // Total tasks
    });

    it('should render SVG chart', () => {
      const { container } = render(
        <ResourceAllocation tasks={mockTasks} resources={mockResources} />
      );
      const svg = container.querySelector('.allocation-svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no resources', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={[]} />);
      expect(screen.getByText('No resources available')).toBeInTheDocument();
    });

    it('should show filtered empty state when no resources match filter', () => {
      render(
        <ResourceAllocation
          tasks={mockTasks}
          resources={mockResources}
          resourceTypeFilter="Designer"
        />
      );
      expect(screen.getByText('No resources match the selected filter')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter resources by type', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      
      const filter = screen.getByLabelText('Filter by resource type');
      fireEvent.change(filter, { target: { value: 'Developer' } });
      
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Carol Williams')).not.toBeInTheDocument();
    });

    it('should show all resources when filter is "all"', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      
      const filter = screen.getByLabelText('Filter by resource type');
      fireEvent.change(filter, { target: { value: 'all' } });
      
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol Williams')).toBeInTheDocument();
    });

    it('should populate filter with available resource types', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      
      const filter = screen.getByLabelText('Filter by resource type') as HTMLSelectElement;
      const options = Array.from(filter.options).map(opt => opt.value);
      
      expect(options).toContain('all');
      expect(options).toContain('Developer');
      expect(options).toContain('QA Engineer');
      expect(options).toContain('Project Manager');
    });
  });

  describe('Over-Allocation Detection', () => {
    it('should detect over-allocated resources', () => {
      const overAllocatedTasks: ScheduledTask[] = [
        {
          task_id: 'task-1',
          task_title: 'Task 1',
          start_date: '2024-01-01',
          end_date: '2024-01-10',
          duration_hours: 100,
          assigned_resources: ['dev-1'],
        },
        {
          task_id: 'task-2',
          task_title: 'Task 2',
          start_date: '2024-01-05',
          end_date: '2024-01-15',
          duration_hours: 100,
          assigned_resources: ['dev-1'],
        },
      ];

      render(
        <ResourceAllocation
          tasks={overAllocatedTasks}
          resources={mockResources}
          showWarnings={true}
        />
      );

      // Check for over-allocation in the SVG (more specific)
      expect(screen.getByText('⚠️ Over-allocated')).toBeInTheDocument();
    });

    it('should show warning banner when resources are over-allocated', () => {
      const overAllocatedTasks: ScheduledTask[] = [
        {
          task_id: 'task-1',
          task_title: 'Task 1',
          start_date: '2024-01-01',
          end_date: '2024-01-10',
          duration_hours: 200,
          assigned_resources: ['dev-1'],
        },
      ];

      render(
        <ResourceAllocation
          tasks={overAllocatedTasks}
          resources={mockResources}
          showWarnings={true}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/resource\(s\) are over-allocated/)).toBeInTheDocument();
    });

    it('should not show warning banner when showWarnings is false', () => {
      const overAllocatedTasks: ScheduledTask[] = [
        {
          task_id: 'task-1',
          task_title: 'Task 1',
          start_date: '2024-01-01',
          end_date: '2024-01-10',
          duration_hours: 200,
          assigned_resources: ['dev-1'],
        },
      ];

      render(
        <ResourceAllocation
          tasks={overAllocatedTasks}
          resources={mockResources}
          showWarnings={false}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onResourceClick when resource is clicked', () => {
      const handleResourceClick = vi.fn();
      const { container } = render(
        <ResourceAllocation
          tasks={mockTasks}
          resources={mockResources}
          onResourceClick={handleResourceClick}
        />
      );

      const resourceLabel = container.querySelector('.resource-label');
      if (resourceLabel) {
        fireEvent.click(resourceLabel);
        expect(handleResourceClick).toHaveBeenCalled();
      }
    });

    it('should call onTaskClick when task is clicked', () => {
      const handleTaskClick = vi.fn();
      const { container } = render(
        <ResourceAllocation
          tasks={mockTasks}
          resources={mockResources}
          onTaskClick={handleTaskClick}
        />
      );

      const allocationBar = container.querySelector('.allocation-bar');
      if (allocationBar) {
        fireEvent.click(allocationBar);
        expect(handleTaskClick).toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ResourceAllocation tasks={mockTasks} resources={mockResources} />);
      
      expect(screen.getByLabelText('Filter by resource type')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Resource allocation chart')
      );
    });

    it('should have proper role for warning banner', () => {
      const overAllocatedTasks: ScheduledTask[] = [
        {
          task_id: 'task-1',
          task_title: 'Task 1',
          start_date: '2024-01-01',
          end_date: '2024-01-10',
          duration_hours: 200,
          assigned_resources: ['dev-1'],
        },
      ];

      render(
        <ResourceAllocation
          tasks={overAllocatedTasks}
          resources={mockResources}
          showWarnings={true}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ResourceAllocation
          tasks={mockTasks}
          resources={mockResources}
          className="custom-class"
        />
      );

      const component = container.querySelector('.resource-allocation');
      expect(component).toHaveClass('custom-class');
    });

    it('should apply custom height', () => {
      render(
        <ResourceAllocation
          tasks={mockTasks}
          resources={mockResources}
          height={800}
        />
      );

      const container = screen.getByRole('img').closest('.allocation-container');
      expect(container).toHaveStyle({ height: '800px' });
    });

    it('should use resourceTypeFilter prop', () => {
      render(
        <ResourceAllocation
          tasks={mockTasks}
          resources={mockResources}
          resourceTypeFilter="Developer"
        />
      );

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  describe('Utilization Calculation', () => {
    it('should calculate utilization percentage correctly', () => {
      const tasks: ScheduledTask[] = [
        {
          task_id: 'task-1',
          task_title: 'Task 1',
          start_date: '2024-01-01',
          end_date: '2024-01-10',
          duration_hours: 80, // 50% of 160 capacity
          assigned_resources: ['dev-1'],
        },
      ];

      render(<ResourceAllocation tasks={tasks} resources={mockResources} />);
      
      // Should show 50% utilization for dev-1
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('should show 0% utilization for unassigned resources', () => {
      const tasks: ScheduledTask[] = [
        {
          task_id: 'task-1',
          task_title: 'Task 1',
          start_date: '2024-01-01',
          end_date: '2024-01-10',
          duration_hours: 80,
          assigned_resources: ['dev-1'],
        },
      ];

      render(<ResourceAllocation tasks={tasks} resources={mockResources} />);
      
      // pm-1 should have 0% utilization
      expect(screen.getByText(/Carol Williams/)).toBeInTheDocument();
      expect(screen.getByText(/Project Manager • 0%/)).toBeInTheDocument();
    });
  });
});

/**
 * Tests for ScheduleConflictDisplay component
 * Validates conflict detection and display functionality
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { ScheduleConflictDisplay } from './ScheduleConflictDisplay';
import type { ScheduledTask, Resource } from '../../services/scheduleService';
import type { TaskDependency } from './ScheduleConflictDisplay';

describe('ScheduleConflictDisplay', () => {
  const mockResources: Resource[] = [
    { id: 'r1', name: 'Developer A', type: 'developer', capacity: 160 },
    { id: 'r2', name: 'Designer B', type: 'designer', capacity: 120 },
  ];

  const mockTasks: ScheduledTask[] = [
    {
      task_id: 't1',
      task_title: 'Task 1',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-05T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['r1'],
    },
    {
      task_id: 't2',
      task_title: 'Task 2',
      start_date: '2024-01-03T00:00:00Z',
      end_date: '2024-01-07T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['r1'],
    },
  ];

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );
      expect(screen.getByText('Schedule Conflicts')).toBeInTheDocument();
    });

    it('should show empty state when no tasks provided', () => {
      render(
        <ScheduleConflictDisplay
          tasks={[]}
          resources={mockResources}
        />
      );
      expect(screen.getByText('No tasks to analyze')).toBeInTheDocument();
    });

    it('should show success message when no conflicts detected', () => {
      const noConflictTasks: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-05T00:00:00Z',
          duration_hours: 40,
          assigned_resources: ['r1'],
        },
        {
          task_id: 't2',
          task_title: 'Task 2',
          start_date: '2024-01-06T00:00:00Z',
          end_date: '2024-01-10T00:00:00Z',
          duration_hours: 40,
          assigned_resources: ['r1'],
        },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={noConflictTasks}
          resources={mockResources}
        />
      );
      expect(screen.getByText('No Conflicts Detected')).toBeInTheDocument();
    });
  });

  describe('Resource Overlap Detection', () => {
    it('should detect resource overlap conflicts', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      expect(screen.getByRole('heading', { name: /Resource Overlap: Developer A/ })).toBeInTheDocument();
    });

    it('should show affected tasks in overlap conflict', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      // Expand the conflict
      const expandButton = screen.getAllByRole('button', { name: /Expand details/ })[0];
      fireEvent.click(expandButton);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
  });

  describe('Resource Over-allocation Detection', () => {
    it('should detect resource over-allocation', () => {
      const overallocatedTasks: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-10T00:00:00Z',
          duration_hours: 100,
          assigned_resources: ['r1'],
        },
        {
          task_id: 't2',
          task_title: 'Task 2',
          start_date: '2024-01-11T00:00:00Z',
          end_date: '2024-01-20T00:00:00Z',
          duration_hours: 100,
          assigned_resources: ['r1'],
        },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={overallocatedTasks}
          resources={mockResources}
        />
      );

      expect(screen.getByText(/Resource Over-allocated/)).toBeInTheDocument();
      expect(screen.getByText(/125%/)).toBeInTheDocument();
    });

    it('should show warning severity for moderate over-allocation', () => {
      const moderateOverallocation: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-10T00:00:00Z',
          duration_hours: 180,
          assigned_resources: ['r1'],
        },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={moderateOverallocation}
          resources={mockResources}
        />
      );

      const warningCount = screen.getByText('Warnings').previousSibling;
      expect(warningCount).toHaveTextContent('1');
    });
  });

  describe('Dependency Violation Detection', () => {
    it('should detect finish-to-start dependency violations', () => {
      const violationTasks: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-05T00:00:00Z',
          end_date: '2024-01-10T00:00:00Z',
          duration_hours: 40,
        },
        {
          task_id: 't2',
          task_title: 'Task 2',
          start_date: '2024-01-08T00:00:00Z',
          end_date: '2024-01-12T00:00:00Z',
          duration_hours: 40,
        },
      ];

      const dependencies: TaskDependency[] = [
        {
          from_task_id: 't1',
          to_task_id: 't2',
          type: 'finish-to-start',
        },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={violationTasks}
          resources={mockResources}
          dependencies={dependencies}
        />
      );

      expect(screen.getByText(/Dependency Constraint Violated/)).toBeInTheDocument();
    });

    it('should detect start-to-start dependency violations', () => {
      const violationTasks: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-05T00:00:00Z',
          end_date: '2024-01-10T00:00:00Z',
          duration_hours: 40,
        },
        {
          task_id: 't2',
          task_title: 'Task 2',
          start_date: '2024-01-03T00:00:00Z',
          end_date: '2024-01-08T00:00:00Z',
          duration_hours: 40,
        },
      ];

      const dependencies: TaskDependency[] = [
        {
          from_task_id: 't1',
          to_task_id: 't2',
          type: 'start-to-start',
        },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={violationTasks}
          resources={mockResources}
          dependencies={dependencies}
        />
      );

      expect(screen.getByText(/Dependency Constraint Violated/)).toBeInTheDocument();
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect circular dependencies', () => {
      const circularTasks: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-05T00:00:00Z',
          duration_hours: 40,
        },
        {
          task_id: 't2',
          task_title: 'Task 2',
          start_date: '2024-01-06T00:00:00Z',
          end_date: '2024-01-10T00:00:00Z',
          duration_hours: 40,
        },
        {
          task_id: 't3',
          task_title: 'Task 3',
          start_date: '2024-01-11T00:00:00Z',
          end_date: '2024-01-15T00:00:00Z',
          duration_hours: 40,
        },
      ];

      const circularDependencies: TaskDependency[] = [
        { from_task_id: 't1', to_task_id: 't2', type: 'finish-to-start' },
        { from_task_id: 't2', to_task_id: 't3', type: 'finish-to-start' },
        { from_task_id: 't3', to_task_id: 't1', type: 'finish-to-start' },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={circularTasks}
          resources={mockResources}
          dependencies={circularDependencies}
        />
      );

      expect(screen.getByText(/Circular Dependency Detected/)).toBeInTheDocument();
    });
  });

  describe('Conflict Summary', () => {
    it('should display correct conflict counts', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      // Should have at least one critical conflict (resource overlap)
      const criticalCount = screen.getByText('Critical').previousSibling;
      expect(criticalCount).toHaveTextContent(/[1-9]/);
    });

    it('should filter conflicts by type', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      const filterSelect = screen.getByLabelText('Filter conflicts by type');
      fireEvent.change(filterSelect, { target: { value: 'resource_overlap' } });

      expect(screen.getByRole('heading', { name: /Resource Overlap: Developer A/ })).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should expand and collapse conflict details', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      const expandButton = screen.getAllByRole('button', { name: /Expand details/ })[0];
      
      // Initially collapsed
      expect(screen.queryByText('Affected Tasks:')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(expandButton);
      expect(screen.getByText('Affected Tasks:')).toBeInTheDocument();

      // Collapse
      const collapseButton = screen.getByRole('button', { name: /Collapse details/ });
      fireEvent.click(collapseButton);
      expect(screen.queryByText('Affected Tasks:')).not.toBeInTheDocument();
    });

    it('should call onConflictClick when view details is clicked', () => {
      const handleConflictClick = vi.fn();

      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
          onConflictClick={handleConflictClick}
        />
      );

      // Expand conflict
      const expandButton = screen.getAllByRole('button', { name: /Expand details/ })[0];
      fireEvent.click(expandButton);

      // Click view details
      const viewDetailsButton = screen.getByRole('button', { name: /View conflict details/ });
      fireEvent.click(viewDetailsButton);

      expect(handleConflictClick).toHaveBeenCalledTimes(1);
      expect(handleConflictClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resource_overlap',
          severity: 'critical',
        })
      );
    });
  });

  describe('Critical Only Filter', () => {
    it('should show only critical conflicts when showCriticalOnly is true', () => {
      const mixedSeverityTasks: ScheduledTask[] = [
        {
          task_id: 't1',
          task_title: 'Task 1',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-05T00:00:00Z',
          duration_hours: 40,
          assigned_resources: ['r1'],
        },
        {
          task_id: 't2',
          task_title: 'Task 2',
          start_date: '2024-01-03T00:00:00Z',
          end_date: '2024-01-07T00:00:00Z',
          duration_hours: 40,
          assigned_resources: ['r1'],
        },
        {
          task_id: 't3',
          task_title: 'Task 3',
          start_date: '2024-01-10T00:00:00Z',
          end_date: '2024-01-15T00:00:00Z',
          duration_hours: 50,
          assigned_resources: ['r1'],
        },
      ];

      render(
        <ScheduleConflictDisplay
          tasks={mixedSeverityTasks}
          resources={mockResources}
          showCriticalOnly={true}
        />
      );

      // Should only show critical conflicts
      const criticalCount = screen.getByText('Critical').previousSibling;
      expect(criticalCount).not.toHaveTextContent('0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      expect(screen.getByLabelText('Filter conflicts by type')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Expand details/ })[0]).toBeInTheDocument();
    });

    it('should have proper role attributes', () => {
      render(
        <ScheduleConflictDisplay
          tasks={mockTasks}
          resources={mockResources}
        />
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    });
  });
});

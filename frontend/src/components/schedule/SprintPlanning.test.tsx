/**
 * SprintPlanning component tests
 * Tests sprint planning functionality and capacity tracking
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SprintPlanning } from './SprintPlanning';
import type { WorkItem } from '../../services/workitemService';

// Mock work items
const mockBacklogItems: WorkItem[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    type: 'task',
    status: 'draft',
    priority: 1,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    is_signed: false,
    estimated_hours: 8,
    story_points: 5,
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    type: 'task',
    status: 'draft',
    priority: 2,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
    is_signed: false,
    estimated_hours: 12,
    story_points: 8,
  },
];

const mockSprintItems: WorkItem[] = [
  {
    id: '3',
    title: 'Task 3',
    description: 'Description 3',
    type: 'task',
    status: 'active',
    priority: 1,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
    is_signed: false,
    estimated_hours: 4,
    story_points: 2,
  },
];

describe('SprintPlanning', () => {
  it('renders sprint planning interface', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
    expect(screen.getByText('Product Backlog')).toBeInTheDocument();
    expect(screen.getByText('Sprint Items')).toBeInTheDocument();
  });

  it('displays sprint name and dates', () => {
    const startDate = new Date('2024-02-01');
    const endDate = new Date('2024-02-14');

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        sprintName="Sprint 1"
        sprintStartDate={startDate}
        sprintEndDate={endDate}
      />
    );

    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText(/Feb 1 - Feb 14, 2024/)).toBeInTheDocument();
  });

  it('displays capacity metrics', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        teamVelocity={35}
      />
    );

    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('40 hrs')).toBeInTheDocument();
    expect(screen.getByText('Committed')).toBeInTheDocument();
    expect(screen.getAllByText('4 hrs').length).toBeGreaterThan(0);
    expect(screen.getByText('Avg Velocity')).toBeInTheDocument();
    expect(screen.getByText('35 hrs')).toBeInTheDocument();
  });

  it('calculates capacity utilization correctly', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    // Sprint has 4 hours committed out of 40 = 10%
    expect(screen.getByText('Utilization')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('displays backlog items', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('displays sprint items', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('Task 3')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  it('shows story points when useStoryPoints is true', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={20}
        useStoryPoints={true}
      />
    );

    expect(screen.getByText('20 pts')).toBeInTheDocument();
    expect(screen.getAllByText('2 pts').length).toBeGreaterThan(0);
    expect(screen.getByText('5 pts')).toBeInTheDocument();
  });

  it('shows hours when useStoryPoints is false', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        useStoryPoints={false}
      />
    );

    expect(screen.getByText('40 hrs')).toBeInTheDocument();
    expect(screen.getAllByText('4 hrs').length).toBeGreaterThan(0);
    expect(screen.getByText('8 hrs')).toBeInTheDocument();
  });

  it('calls onAddToSprint when item is added', () => {
    const onAddToSprint = vi.fn();

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        onAddToSprint={onAddToSprint}
      />
    );

    const backlogItem = screen.getByText('Task 1').closest('.planning-card');
    expect(backlogItem).toBeInTheDocument();

    // Simulate drag and drop
    if (backlogItem) {
      fireEvent.dragStart(backlogItem, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
          getData: () => '1',
        },
      });

      const sprintZone = screen.getByLabelText('Sprint items');
      fireEvent.dragOver(sprintZone, {
        dataTransfer: { dropEffect: 'move' },
      });
      fireEvent.drop(sprintZone, {
        dataTransfer: { getData: () => '1' },
      });
    }

    expect(onAddToSprint).toHaveBeenCalledWith('1');
  });

  it('calls onRemoveFromSprint when item is removed', () => {
    const onRemoveFromSprint = vi.fn();

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        onRemoveFromSprint={onRemoveFromSprint}
      />
    );

    const sprintItem = screen.getByText('Task 3').closest('.planning-card');
    expect(sprintItem).toBeInTheDocument();

    // Simulate drag and drop
    if (sprintItem) {
      fireEvent.dragStart(sprintItem, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
          getData: () => '3',
        },
      });

      const backlogZone = screen.getByLabelText('Product backlog');
      fireEvent.dragOver(backlogZone, {
        dataTransfer: { dropEffect: 'move' },
      });
      fireEvent.drop(backlogZone, {
        dataTransfer: { getData: () => '3' },
      });
    }

    expect(onRemoveFromSprint).toHaveBeenCalledWith('3');
  });

  it('calls onBacklogItemClick when backlog item is clicked', () => {
    const onBacklogItemClick = vi.fn();

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        onBacklogItemClick={onBacklogItemClick}
      />
    );

    const backlogItem = screen.getByText('Task 1').closest('.planning-card');
    if (backlogItem) {
      fireEvent.click(backlogItem);
    }

    expect(onBacklogItemClick).toHaveBeenCalledWith('1');
  });

  it('calls onSprintItemClick when sprint item is clicked', () => {
    const onSprintItemClick = vi.fn();

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        onSprintItemClick={onSprintItemClick}
      />
    );

    const sprintItem = screen.getByText('Task 3').closest('.planning-card');
    if (sprintItem) {
      fireEvent.click(sprintItem);
    }

    expect(onSprintItemClick).toHaveBeenCalledWith('3');
  });

  it('shows under capacity status when utilization is low', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={100}
      />
    );

    expect(screen.getByText('Under Capacity')).toBeInTheDocument();
  });

  it('shows optimal status when utilization is 80-100%', () => {
    render(
      <SprintPlanning
        backlogItems={[]}
        sprintItems={[
          {
            ...mockSprintItems[0],
            estimated_hours: 40,
          },
        ]}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('Optimal')).toBeInTheDocument();
  });

  it('shows over capacity warning when utilization exceeds 100%', () => {
    render(
      <SprintPlanning
        backlogItems={[]}
        sprintItems={[
          {
            ...mockSprintItems[0],
            estimated_hours: 45,
          },
        ]}
        sprintCapacity={40}
      />
    );

    // 45/40 = 112.5% which should show "Over Capacity" (between 100-120%)
    expect(screen.getByText('Over Capacity')).toBeInTheDocument();
    expect(screen.getByText(/Sprint is over capacity/)).toBeInTheDocument();
  });

  it('shows severely over capacity warning when utilization exceeds 120%', () => {
    render(
      <SprintPlanning
        backlogItems={[]}
        sprintItems={[
          {
            ...mockSprintItems[0],
            estimated_hours: 60,
          },
        ]}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('Severely Over Capacity')).toBeInTheDocument();
    expect(screen.getByText(/significantly over capacity/)).toBeInTheDocument();
  });

  it('disables drag and drop in read-only mode', () => {
    const onAddToSprint = vi.fn();

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        onAddToSprint={onAddToSprint}
        readOnly={true}
      />
    );

    const backlogItem = screen.getByText('Task 1').closest('.planning-card');
    expect(backlogItem).toBeInTheDocument();

    if (backlogItem) {
      fireEvent.dragStart(backlogItem);
      const sprintZone = screen.getByLabelText('Sprint items');
      fireEvent.drop(sprintZone);
    }

    expect(onAddToSprint).not.toHaveBeenCalled();
  });

  it('hides hint in read-only mode', () => {
    const { rerender } = render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText(/Drag items from the backlog/)).toBeInTheDocument();

    rerender(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        readOnly={true}
      />
    );

    expect(screen.queryByText(/Drag items from the backlog/)).not.toBeInTheDocument();
  });

  it('shows empty state for backlog', () => {
    render(
      <SprintPlanning
        backlogItems={[]}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('No items in backlog')).toBeInTheDocument();
  });

  it('shows empty state for sprint', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={[]}
        sprintCapacity={40}
      />
    );

    expect(screen.getByText('No items in sprint')).toBeInTheDocument();
    expect(screen.getByText('Drag items here to add to sprint')).toBeInTheDocument();
  });

  it('displays priority badges', () => {
    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
      />
    );

    expect(screen.getAllByText('Critical')).toHaveLength(2);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        className="custom-class"
      />
    );

    const sprintPlanning = container.querySelector('.sprint-planning');
    expect(sprintPlanning).toHaveClass('custom-class');
  });

  it('handles keyboard navigation', () => {
    const onBacklogItemClick = vi.fn();

    render(
      <SprintPlanning
        backlogItems={mockBacklogItems}
        sprintItems={mockSprintItems}
        sprintCapacity={40}
        onBacklogItemClick={onBacklogItemClick}
      />
    );

    const backlogItem = screen.getByText('Task 1').closest('.planning-card');
    if (backlogItem) {
      fireEvent.keyDown(backlogItem, { key: 'Enter' });
    }

    expect(onBacklogItemClick).toHaveBeenCalledWith('1');
  });
});

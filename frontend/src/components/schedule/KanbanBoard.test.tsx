/**
 * KanbanBoard component tests
 * Tests drag-and-drop functionality, task display, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import { KanbanBoard, type KanbanColumn } from './KanbanBoard';
import type { WorkItem } from '../../services/workitemService';

describe('KanbanBoard', () => {
  const mockTasks: WorkItem[] = [
    {
      id: 'task-1',
      type: 'task',
      title: 'Task 1',
      description: 'Description 1',
      status: 'draft',
      priority: 1,
      assigned_to: 'user1',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'Task 2',
      description: 'Description 2',
      status: 'active',
      priority: 2,
      assigned_to: 'user2',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-3',
      type: 'task',
      title: 'Task 3',
      status: 'completed',
      priority: 3,
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-03T10:00:00Z',
      updated_at: '2024-01-03T10:00:00Z',
      is_signed: true,
    },
  ];

  const customColumns: KanbanColumn[] = [
    { id: 'col1', title: 'Column 1', status: 'draft', color: '#94a3b8' },
    { id: 'col2', title: 'Column 2', status: 'active', color: '#3b82f6', limit: 2 },
    { id: 'col3', title: 'Column 3', status: 'completed', color: '#10b981' },
  ];

  describe('Rendering', () => {
    it('renders board with default columns', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      expect(screen.getByText('Task Board')).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('renders board with custom columns', () => {
      render(<KanbanBoard tasks={mockTasks} columns={customColumns} />);
      
      expect(screen.getByText('Column 1')).toBeInTheDocument();
      expect(screen.getByText('Column 2')).toBeInTheDocument();
      expect(screen.getByText('Column 3')).toBeInTheDocument();
    });

    it('displays empty state when no tasks provided', () => {
      render(<KanbanBoard tasks={[]} />);
      
      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
      expect(screen.getByText(/Create tasks to see them organized/)).toBeInTheDocument();
    });

    it('displays task count in board header', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      expect(screen.getByText('3', { selector: 'strong' })).toBeInTheDocument();
      expect(screen.getByText('total tasks')).toBeInTheDocument();
      expect(screen.getByText('1', { selector: 'strong' })).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  describe('Task Cards', () => {
    it('renders task cards with correct information', () => {
      render(<KanbanBoard tasks={mockTasks} showPriority={true} showAssignee={true} />);
      
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByText(/user1/)).toBeInTheDocument();
    });

    it('displays priority badges when showPriority is true', () => {
      render(<KanbanBoard tasks={mockTasks} showPriority={true} />);
      
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('hides priority badges when showPriority is false', () => {
      render(<KanbanBoard tasks={mockTasks} showPriority={false} />);
      
      expect(screen.queryByText('Critical')).not.toBeInTheDocument();
      expect(screen.queryByText('High')).not.toBeInTheDocument();
    });

    it('displays assignee when showAssignee is true', () => {
      render(<KanbanBoard tasks={mockTasks} showAssignee={true} />);
      
      expect(screen.getByText(/user1/)).toBeInTheDocument();
      expect(screen.getByText(/user2/)).toBeInTheDocument();
    });

    it('hides assignee when showAssignee is false', () => {
      render(<KanbanBoard tasks={mockTasks} showAssignee={false} />);
      
      expect(screen.queryByText(/user1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/user2/)).not.toBeInTheDocument();
    });

    it('displays signed indicator for signed tasks', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      expect(screen.getByText('✓ Signed')).toBeInTheDocument();
    });

    it('displays task type badge', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      const typeBadges = screen.getAllByText('task');
      expect(typeBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Columns', () => {
    it('groups tasks by status in correct columns', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      const todoColumn = screen.getByLabelText('To Do column');
      const inProgressColumn = screen.getByLabelText('In Progress column');
      const doneColumn = screen.getByLabelText('Done column');
      
      expect(within(todoColumn).getByText('Task 1')).toBeInTheDocument();
      expect(within(inProgressColumn).getByText('Task 2')).toBeInTheDocument();
      expect(within(doneColumn).getByText('Task 3')).toBeInTheDocument();
    });

    it('displays task count in column header', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      const todoColumn = screen.getByLabelText('To Do column');
      expect(within(todoColumn).getByText('1')).toBeInTheDocument();
    });

    it('displays WIP limit in column header when specified', () => {
      render(<KanbanBoard tasks={mockTasks} columns={customColumns} />);
      
      const col2 = screen.getByLabelText('Column 2 column');
      expect(within(col2).getByText('1 / 2')).toBeInTheDocument();
    });

    it('displays empty message in columns with no tasks', () => {
      const singleTask: WorkItem[] = [{
        ...mockTasks[0],
        status: 'draft',
      }];
      
      render(<KanbanBoard tasks={singleTask} />);
      
      const inProgressColumn = screen.getByLabelText('In Progress column');
      expect(within(inProgressColumn).getByText('No tasks')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onTaskClick when task is clicked', () => {
      const handleTaskClick = vi.fn();
      render(<KanbanBoard tasks={mockTasks} onTaskClick={handleTaskClick} />);
      
      fireEvent.click(screen.getByText('Task 1'));
      
      expect(handleTaskClick).toHaveBeenCalledWith('task-1');
    });

    it('calls onTaskClick when Enter key is pressed on task', () => {
      const handleTaskClick = vi.fn();
      render(<KanbanBoard tasks={mockTasks} onTaskClick={handleTaskClick} />);
      
      const taskCard = screen.getByText('Task 1').closest('[role="button"]');
      fireEvent.keyDown(taskCard!, { key: 'Enter' });
      
      expect(handleTaskClick).toHaveBeenCalledWith('task-1');
    });

    it('does not allow drag when readOnly is true', () => {
      render(<KanbanBoard tasks={mockTasks} readOnly={true} />);
      
      const taskCard = screen.getByText('Task 1').closest('.kanban-card');
      expect(taskCard).toHaveAttribute('draggable', 'false');
    });

    it('allows drag when readOnly is false', () => {
      render(<KanbanBoard tasks={mockTasks} readOnly={false} />);
      
      const taskCard = screen.getByText('Task 1').closest('.kanban-card');
      expect(taskCard).toHaveAttribute('draggable', 'true');
    });
  });

  describe('Drag and Drop', () => {
    it('calls onTaskMove when task is dropped on different column', () => {
      const handleTaskMove = vi.fn();
      render(<KanbanBoard tasks={mockTasks} onTaskMove={handleTaskMove} />);
      
      const taskCard = screen.getByText('Task 1').closest('.kanban-card')!;
      const targetColumn = screen.getByLabelText('In Progress column');
      
      // Simulate drag and drop
      fireEvent.dragStart(taskCard, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      fireEvent.dragOver(targetColumn, { dataTransfer: { dropEffect: '' } });
      fireEvent.drop(targetColumn, { dataTransfer: { getData: () => 'task-1' } });
      
      expect(handleTaskMove).toHaveBeenCalledWith('task-1', 'draft', 'active');
    });

    it('does not call onTaskMove when dropped on same column', () => {
      const handleTaskMove = vi.fn();
      render(<KanbanBoard tasks={mockTasks} onTaskMove={handleTaskMove} />);
      
      const taskCard = screen.getByText('Task 1').closest('.kanban-card')!;
      const sameColumn = screen.getByLabelText('To Do column');
      
      // Simulate drag and drop on same column
      fireEvent.dragStart(taskCard, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      fireEvent.drop(sameColumn, { dataTransfer: { getData: () => 'task-1' } });
      
      expect(handleTaskMove).not.toHaveBeenCalled();
    });
  });

  describe('Read-Only Mode', () => {
    it('hides drag hint when readOnly is true', () => {
      render(<KanbanBoard tasks={mockTasks} readOnly={true} />);
      
      expect(screen.queryByText(/Drag and drop tasks/)).not.toBeInTheDocument();
    });

    it('shows drag hint when readOnly is false', () => {
      render(<KanbanBoard tasks={mockTasks} readOnly={false} />);
      
      expect(screen.getByText(/Drag and drop tasks/)).toBeInTheDocument();
    });

    it('hides "Drag tasks here" hint in empty columns when readOnly is true', () => {
      const singleTask: WorkItem[] = [{ ...mockTasks[0], status: 'draft' }];
      render(<KanbanBoard tasks={singleTask} readOnly={true} />);
      
      expect(screen.queryByText('Drag tasks here')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for columns', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      expect(screen.getByLabelText('To Do column')).toBeInTheDocument();
      expect(screen.getByLabelText('In Progress column')).toBeInTheDocument();
      expect(screen.getByLabelText('Done column')).toBeInTheDocument();
    });

    it('has proper ARIA labels for task cards', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      expect(screen.getByLabelText('Task: Task 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Task: Task 2')).toBeInTheDocument();
    });

    it('task cards are keyboard accessible', () => {
      render(<KanbanBoard tasks={mockTasks} />);
      
      const taskCard = screen.getByText('Task 1').closest('[role="button"]');
      expect(taskCard).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <KanbanBoard tasks={mockTasks} className="custom-class" />
      );
      
      expect(container.querySelector('.kanban-board.custom-class')).toBeInTheDocument();
    });

    it('applies custom column colors', () => {
      render(<KanbanBoard tasks={mockTasks} columns={customColumns} />);
      
      const col1Header = screen.getByText('Column 1').closest('.column-header');
      expect(col1Header).toHaveStyle({ borderTopColor: '#94a3b8' });
    });
  });
});

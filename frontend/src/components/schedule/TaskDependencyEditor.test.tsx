/**
 * TaskDependencyEditor component tests
 * Tests for task dependency management functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TaskDependencyEditor, type TaskDependency, type Task } from './TaskDependencyEditor';

describe('TaskDependencyEditor', () => {
  const mockTasks: Task[] = [
    { id: 'task-1', title: 'Task 1' },
    { id: 'task-2', title: 'Task 2' },
    { id: 'task-3', title: 'Task 3' },
    { id: 'task-4', title: 'Task 4' },
  ];

  const mockDependencies: TaskDependency[] = [
    {
      id: 'dep-1',
      from_task_id: 'task-1',
      to_task_id: 'task-2',
      type: 'finish-to-start',
    },
    {
      id: 'dep-2',
      from_task_id: 'task-2',
      to_task_id: 'task-3',
      type: 'start-to-start',
    },
  ];

  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('Rendering', () => {
    it('should render with title', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Task Dependencies')).toBeInTheDocument();
    });

    it('should render add button when not in read-only mode', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: /add dependency/i })).toBeInTheDocument();
    });

    it('should not render add button in read-only mode', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      expect(screen.queryByRole('button', { name: /add dependency/i })).not.toBeInTheDocument();
    });

    it('should render empty state when no dependencies exist', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('No dependencies defined')).toBeInTheDocument();
      expect(
        screen.getByText(/add dependencies to define the order/i)
      ).toBeInTheDocument();
    });

    it('should render dependencies table when dependencies exist', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getAllByText('Task 2')).toHaveLength(2); // Appears twice (predecessor and successor)
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Dependency Display', () => {
    it('should display all dependency types correctly', () => {
      const allTypeDependencies: TaskDependency[] = [
        {
          id: 'dep-1',
          from_task_id: 'task-1',
          to_task_id: 'task-2',
          type: 'finish-to-start',
        },
        {
          id: 'dep-2',
          from_task_id: 'task-2',
          to_task_id: 'task-3',
          type: 'start-to-start',
        },
        {
          id: 'dep-3',
          from_task_id: 'task-3',
          to_task_id: 'task-4',
          type: 'finish-to-finish',
        },
        {
          id: 'dep-4',
          from_task_id: 'task-1',
          to_task_id: 'task-4',
          type: 'start-to-finish',
        },
      ];

      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={allTypeDependencies}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Finish-to-Start (FS)')).toBeInTheDocument();
      expect(screen.getByText('Start-to-Start (SS)')).toBeInTheDocument();
      expect(screen.getByText('Finish-to-Finish (FF)')).toBeInTheDocument();
      expect(screen.getByText('Start-to-Finish (SF)')).toBeInTheDocument();
    });

    it('should display task titles for dependencies', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows

      // Check that task titles appear in the table
      expect(screen.getAllByText('Task 1')).toHaveLength(1);
      expect(screen.getAllByText('Task 2')).toHaveLength(2); // Appears twice (predecessor and successor)
      expect(screen.getAllByText('Task 3')).toHaveLength(1);
    });

    it('should show action buttons for each dependency when not read-only', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency/i);
      const deleteButtons = screen.getAllByLabelText(/delete dependency/i);

      expect(editButtons).toHaveLength(mockDependencies.length);
      expect(deleteButtons).toHaveLength(mockDependencies.length);
    });

    it('should not show action buttons in read-only mode', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
          readOnly={true}
        />
      );

      expect(screen.queryByLabelText(/edit dependency/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/delete dependency/i)).not.toBeInTheDocument();
    });
  });

  describe('Adding Dependencies', () => {
    it('should show add form when add button is clicked', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(addButton);

      expect(screen.getByText('Add New Dependency')).toBeInTheDocument();
      expect(screen.getByLabelText(/predecessor task/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dependency type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/successor task/i)).toBeInTheDocument();
    });

    it('should hide add button when form is open', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      // Initially, the header add button should be present
      const initialAddButton = screen.getByRole('button', { name: /add dependency/i });
      expect(initialAddButton).toHaveClass('add-button');

      fireEvent.click(initialAddButton);

      // After clicking, the header add button should be gone
      // The form save button will have similar text but different class
      const buttons = screen.getAllByRole('button');
      const headerAddButton = buttons.find(btn => btn.classList.contains('add-button'));
      expect(headerAddButton).toBeUndefined();
      
      // But the save button should be present
      expect(screen.getByRole('button', { name: /add dependency/i })).toHaveClass('save-button');
    });

    it('should populate task dropdowns with available tasks', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const options = within(fromTaskSelect as HTMLElement).getAllByRole('option');

      // Should have placeholder + all tasks
      expect(options).toHaveLength(mockTasks.length + 1);
      expect(options[0]).toHaveTextContent('Select a task...');
    });

    it('should exclude current task from available tasks', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          currentTaskId="task-1"
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const options = within(fromTaskSelect as HTMLElement).getAllByRole('option');

      // Should have placeholder + (all tasks - current task)
      expect(options).toHaveLength(mockTasks.length); // 1 placeholder + 3 tasks (excluding current)
      
      const optionTexts = options.map(opt => opt.textContent);
      expect(optionTexts).not.toContain('Task 1');
    });

    it('should show all dependency type options', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const typeSelect = screen.getByLabelText(/dependency type/i);
      const options = within(typeSelect as HTMLElement).getAllByRole('option');

      expect(options).toHaveLength(4);
      expect(options[0]).toHaveTextContent('Finish-to-Start (FS)');
      expect(options[1]).toHaveTextContent('Start-to-Start (SS)');
      expect(options[2]).toHaveTextContent('Finish-to-Finish (FF)');
      expect(options[3]).toHaveTextContent('Start-to-Finish (SF)');
    });

    it('should show dependency type description', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      expect(
        screen.getByText(/task b cannot start until task a finishes/i)
      ).toBeInTheDocument();
    });

    it('should update description when dependency type changes', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const typeSelect = screen.getByLabelText(/dependency type/i);
      fireEvent.change(typeSelect, { target: { value: 'start-to-start' } });

      expect(
        screen.getByText(/task b cannot start until task a starts/i)
      ).toBeInTheDocument();
    });

    it('should call onChange with new dependency when saved', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const toTaskSelect = screen.getByLabelText(/successor task/i);
      const typeSelect = screen.getByLabelText(/dependency type/i);

      fireEvent.change(fromTaskSelect, { target: { value: 'task-1' } });
      fireEvent.change(toTaskSelect, { target: { value: 'task-2' } });
      fireEvent.change(typeSelect, { target: { value: 'finish-to-start' } });

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const newDependencies = mockOnChange.mock.calls[0][0];
      expect(newDependencies).toHaveLength(1);
      expect(newDependencies[0]).toMatchObject({
        from_task_id: 'task-1',
        to_task_id: 'task-2',
        type: 'finish-to-start',
      });
      expect(newDependencies[0].id).toBeDefined();
    });

    it('should close form after successful save', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const toTaskSelect = screen.getByLabelText(/successor task/i);

      fireEvent.change(fromTaskSelect, { target: { value: 'task-1' } });
      fireEvent.change(toTaskSelect, { target: { value: 'task-2' } });

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      expect(screen.queryByText('Add New Dependency')).not.toBeInTheDocument();
    });

    it('should close form when cancel is clicked', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));
      expect(screen.getByText('Add New Dependency')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Add New Dependency')).not.toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show error when tasks are not selected', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/please select both tasks/i)).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should prevent self-reference', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const toTaskSelect = screen.getByLabelText(/successor task/i);

      fireEvent.change(fromTaskSelect, { target: { value: 'task-1' } });
      fireEvent.change(toTaskSelect, { target: { value: 'task-1' } });

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/a task cannot depend on itself/i)).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should prevent duplicate dependencies', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const toTaskSelect = screen.getByLabelText(/successor task/i);

      // Try to add the same dependency that already exists
      fireEvent.change(fromTaskSelect, { target: { value: 'task-1' } });
      fireEvent.change(toTaskSelect, { target: { value: 'task-2' } });

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/this dependency already exists/i)).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should detect circular dependencies', () => {
      // Existing: task-1 -> task-2 -> task-3
      const existingDeps: TaskDependency[] = [
        {
          id: 'dep-1',
          from_task_id: 'task-1',
          to_task_id: 'task-2',
          type: 'finish-to-start',
        },
        {
          id: 'dep-2',
          from_task_id: 'task-2',
          to_task_id: 'task-3',
          type: 'finish-to-start',
        },
      ];

      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={existingDeps}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const toTaskSelect = screen.getByLabelText(/successor task/i);

      // Try to add task-3 -> task-1, which would create a cycle
      fireEvent.change(fromTaskSelect, { target: { value: 'task-3' } });
      fireEvent.change(toTaskSelect, { target: { value: 'task-1' } });

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      expect(
        screen.getByText(/this dependency would create a circular reference/i)
      ).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Editing Dependencies', () => {
    it('should open edit form when edit button is clicked', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Dependency')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should populate form with existing dependency values', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency/i);
      fireEvent.click(editButtons[0]);

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i) as HTMLSelectElement;
      const toTaskSelect = screen.getByLabelText(/successor task/i) as HTMLSelectElement;
      const typeSelect = screen.getByLabelText(/dependency type/i) as HTMLSelectElement;

      expect(fromTaskSelect.value).toBe('task-1');
      expect(toTaskSelect.value).toBe('task-2');
      expect(typeSelect.value).toBe('finish-to-start');
    });

    it('should update dependency when save changes is clicked', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency/i);
      fireEvent.click(editButtons[0]);

      const typeSelect = screen.getByLabelText(/dependency type/i);
      fireEvent.change(typeSelect, { target: { value: 'start-to-start' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedDependencies = mockOnChange.mock.calls[0][0];
      expect(updatedDependencies[0]).toMatchObject({
        id: 'dep-1',
        from_task_id: 'task-1',
        to_task_id: 'task-2',
        type: 'start-to-start',
      });
    });

    it('should close form after successful edit', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency/i);
      fireEvent.click(editButtons[0]);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(screen.queryByText('Edit Dependency')).not.toBeInTheDocument();
    });

    it('should validate edited dependency', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency/i);
      fireEvent.click(editButtons[0]);

      const fromTaskSelect = screen.getByLabelText(/predecessor task/i);
      const toTaskSelect = screen.getByLabelText(/successor task/i);

      // Try to create self-reference
      fireEvent.change(fromTaskSelect, { target: { value: 'task-1' } });
      fireEvent.change(toTaskSelect, { target: { value: 'task-1' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/a task cannot depend on itself/i)).toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Deleting Dependencies', () => {
    it('should remove dependency when delete button is clicked', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/delete dependency/i);
      fireEvent.click(deleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedDependencies = mockOnChange.mock.calls[0][0];
      expect(updatedDependencies).toHaveLength(mockDependencies.length - 1);
      expect(updatedDependencies.find((d: TaskDependency) => d.id === 'dep-1')).toBeUndefined();
    });

    it('should delete correct dependency', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/delete dependency/i);
      fireEvent.click(deleteButtons[1]); // Delete second dependency

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedDependencies = mockOnChange.mock.calls[0][0];
      expect(updatedDependencies).toHaveLength(1);
      expect(updatedDependencies[0].id).toBe('dep-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on form elements', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      expect(screen.getByLabelText(/predecessor task/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/dependency type/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/successor task/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper ARIA labels on action buttons', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText(/edit dependency from/i);
      const deleteButtons = screen.getAllByLabelText(/delete dependency from/i);

      expect(editButtons).toHaveLength(mockDependencies.length);
      expect(deleteButtons).toHaveLength(mockDependencies.length);
    });

    it('should announce validation errors with aria-live', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /add dependency/i }));

      const saveButton = screen.getByRole('button', { name: /add dependency/i });
      fireEvent.click(saveButton);

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper table structure', () => {
      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={mockDependencies}
          onChange={mockOnChange}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4); // Predecessor, Type, Successor, Actions
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tasks array', () => {
      render(
        <TaskDependencyEditor
          tasks={[]}
          dependencies={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Task Dependencies')).toBeInTheDocument();
      expect(screen.getByText('No dependencies defined')).toBeInTheDocument();
    });

    it('should handle dependencies with missing task references', () => {
      const invalidDependencies: TaskDependency[] = [
        {
          id: 'dep-1',
          from_task_id: 'non-existent-task',
          to_task_id: 'task-2',
          type: 'finish-to-start',
        },
      ];

      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={invalidDependencies}
          onChange={mockOnChange}
        />
      );

      // Should display the task ID when task is not found
      expect(screen.getByText('non-existent-task')).toBeInTheDocument();
    });

    it('should handle dependencies without IDs', () => {
      const depsWithoutIds: TaskDependency[] = [
        {
          from_task_id: 'task-1',
          to_task_id: 'task-2',
          type: 'finish-to-start',
        },
      ];

      render(
        <TaskDependencyEditor
          tasks={mockTasks}
          dependencies={depsWithoutIds}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });
});

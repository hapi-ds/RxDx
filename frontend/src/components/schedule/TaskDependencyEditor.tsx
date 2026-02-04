/**
 * TaskDependencyEditor component
 * Allows users to create, edit, and delete task dependencies
 * Implements Requirement 7 (Offline Project Scheduling)
 * 
 * Features:
 * - Display existing dependencies in a table
 * - Add new dependencies with task selection
 * - Support all dependency types (finish-to-start, start-to-start, finish-to-finish, start-to-finish)
 * - Validate to prevent circular dependencies
 * - Show visual feedback for dependency changes
 * - Accessible and responsive design
 */

import React, { useState, useCallback, useMemo } from 'react';

export interface TaskDependency {
  id?: string;
  from_task_id: string;
  to_task_id: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
}

export interface Task {
  id: string;
  title: string;
}

export interface TaskDependencyEditorProps {
  /** List of all available tasks */
  tasks: Task[];
  /** Current task ID (the task being edited) */
  currentTaskId?: string;
  /** Existing dependencies */
  dependencies: TaskDependency[];
  /** Callback when dependencies change */
  onChange: (dependencies: TaskDependency[]) => void;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface ValidationError {
  type: 'circular' | 'duplicate' | 'self-reference';
  message: string;
}

export function TaskDependencyEditor({
  tasks,
  currentTaskId,
  dependencies,
  onChange,
  readOnly = false,
  className = '',
}: TaskDependencyEditorProps): React.ReactElement {
  const [isAdding, setIsAdding] = useState(false);
  const [newDependency, setNewDependency] = useState<Partial<TaskDependency>>({
    type: 'finish-to-start',
  });
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Get task title by ID
  const getTaskTitle = useCallback(
    (taskId: string): string => {
      const task = tasks.find(t => t.id === taskId);
      return task?.title || taskId;
    },
    [tasks]
  );

  // Get available tasks for selection (exclude current task if specified)
  const availableTasks = useMemo(() => {
    if (currentTaskId) {
      return tasks.filter(t => t.id !== currentTaskId);
    }
    return tasks;
  }, [tasks, currentTaskId]);

  // Format dependency type for display
  const formatDependencyType = (type: TaskDependency['type']): string => {
    switch (type) {
      case 'finish-to-start':
        return 'Finish-to-Start (FS)';
      case 'start-to-start':
        return 'Start-to-Start (SS)';
      case 'finish-to-finish':
        return 'Finish-to-Finish (FF)';
      case 'start-to-finish':
        return 'Start-to-Finish (SF)';
      default:
        return type;
    }
  };

  // Get dependency type description
  const getDependencyDescription = (type: TaskDependency['type']): string => {
    switch (type) {
      case 'finish-to-start':
        return 'Task B cannot start until Task A finishes';
      case 'start-to-start':
        return 'Task B cannot start until Task A starts';
      case 'finish-to-finish':
        return 'Task B cannot finish until Task A finishes';
      case 'start-to-finish':
        return 'Task B cannot finish until Task A starts';
      default:
        return '';
    }
  };

  // Validate dependency for circular references
  const validateDependency = useCallback(
    (fromTaskId: string, toTaskId: string): ValidationError | null => {
      // Check for self-reference
      if (fromTaskId === toTaskId) {
        return {
          type: 'self-reference',
          message: 'A task cannot depend on itself',
        };
      }

      // Check for duplicate
      const isDuplicate = dependencies.some(
        dep =>
          dep.from_task_id === fromTaskId &&
          dep.to_task_id === toTaskId &&
          dep.id !== editingId
      );

      if (isDuplicate) {
        return {
          type: 'duplicate',
          message: 'This dependency already exists',
        };
      }

      // Check for circular dependency using depth-first search
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = (taskId: string): boolean => {
        if (recursionStack.has(taskId)) {
          return true;
        }

        if (visited.has(taskId)) {
          return false;
        }

        visited.add(taskId);
        recursionStack.add(taskId);

        // Get all tasks that depend on this task
        const dependentTasks = dependencies
          .filter(dep => dep.from_task_id === taskId && dep.id !== editingId)
          .map(dep => dep.to_task_id);

        // Add the new dependency to check
        if (taskId === fromTaskId) {
          dependentTasks.push(toTaskId);
        }

        for (const depTaskId of dependentTasks) {
          if (hasCycle(depTaskId)) {
            return true;
          }
        }

        recursionStack.delete(taskId);
        return false;
      };

      if (hasCycle(fromTaskId)) {
        return {
          type: 'circular',
          message: 'This dependency would create a circular reference',
        };
      }

      return null;
    },
    [dependencies, editingId]
  );

  // Handle add dependency button click
  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    setNewDependency({ type: 'finish-to-start' });
    setValidationError(null);
  }, []);

  // Handle cancel add
  const handleCancelAdd = useCallback(() => {
    setIsAdding(false);
    setNewDependency({ type: 'finish-to-start' });
    setValidationError(null);
  }, []);

  // Handle save new dependency
  const handleSaveAdd = useCallback(() => {
    if (!newDependency.from_task_id || !newDependency.to_task_id || !newDependency.type) {
      setValidationError({
        type: 'duplicate',
        message: 'Please select both tasks',
      });
      return;
    }

    const error = validateDependency(newDependency.from_task_id, newDependency.to_task_id);
    if (error) {
      setValidationError(error);
      return;
    }

    const newDep: TaskDependency = {
      id: `dep-${Date.now()}`,
      from_task_id: newDependency.from_task_id,
      to_task_id: newDependency.to_task_id,
      type: newDependency.type,
    };

    onChange([...dependencies, newDep]);
    setIsAdding(false);
    setNewDependency({ type: 'finish-to-start' });
    setValidationError(null);
  }, [newDependency, dependencies, onChange, validateDependency]);

  // Handle delete dependency
  const handleDelete = useCallback(
    (dependencyId: string) => {
      const updatedDependencies = dependencies.filter(dep => dep.id !== dependencyId);
      onChange(updatedDependencies);
    },
    [dependencies, onChange]
  );

  // Handle edit dependency
  const handleEdit = useCallback((dependency: TaskDependency) => {
    setEditingId(dependency.id || null);
    setNewDependency(dependency);
    setIsAdding(true);
    setValidationError(null);
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (!newDependency.from_task_id || !newDependency.to_task_id || !newDependency.type) {
      setValidationError({
        type: 'duplicate',
        message: 'Please select both tasks',
      });
      return;
    }

    const error = validateDependency(newDependency.from_task_id, newDependency.to_task_id);
    if (error) {
      setValidationError(error);
      return;
    }

    const updatedDependencies = dependencies.map(dep =>
      dep.id === editingId
        ? {
            ...dep,
            from_task_id: newDependency.from_task_id!,
            to_task_id: newDependency.to_task_id!,
            type: newDependency.type!,
          }
        : dep
    );

    onChange(updatedDependencies);
    setIsAdding(false);
    setEditingId(null);
    setNewDependency({ type: 'finish-to-start' });
    setValidationError(null);
  }, [newDependency, dependencies, editingId, onChange, validateDependency]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
    setNewDependency({ type: 'finish-to-start' });
    setValidationError(null);
  }, []);

  return (
    <div className={`task-dependency-editor ${className}`}>
      <div className="editor-header">
        <h3 className="editor-title">Task Dependencies</h3>
        {!readOnly && !isAdding && (
          <button
            className="add-button"
            onClick={handleAddClick}
            aria-label="Add dependency"
          >
            + Add Dependency
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && !readOnly && (
        <div className="dependency-form" role="form" aria-label="Dependency form">
          <div className="form-header">
            <h4 className="form-title">
              {editingId ? 'Edit Dependency' : 'Add New Dependency'}
            </h4>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="from-task" className="form-label">
                Predecessor Task
              </label>
              <select
                id="from-task"
                className="form-select"
                value={newDependency.from_task_id || ''}
                onChange={e =>
                  setNewDependency({ ...newDependency, from_task_id: e.target.value })
                }
                aria-label="Select predecessor task"
                aria-required="true"
              >
                <option value="">Select a task...</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dependency-type" className="form-label">
                Dependency Type
              </label>
              <select
                id="dependency-type"
                className="form-select"
                value={newDependency.type || 'finish-to-start'}
                onChange={e =>
                  setNewDependency({
                    ...newDependency,
                    type: e.target.value as TaskDependency['type'],
                  })
                }
                aria-label="Select dependency type"
                aria-required="true"
              >
                <option value="finish-to-start">Finish-to-Start (FS)</option>
                <option value="start-to-start">Start-to-Start (SS)</option>
                <option value="finish-to-finish">Finish-to-Finish (FF)</option>
                <option value="start-to-finish">Start-to-Finish (SF)</option>
              </select>
              {newDependency.type && (
                <p className="form-hint">{getDependencyDescription(newDependency.type)}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="to-task" className="form-label">
                Successor Task
              </label>
              <select
                id="to-task"
                className="form-select"
                value={newDependency.to_task_id || ''}
                onChange={e =>
                  setNewDependency({ ...newDependency, to_task_id: e.target.value })
                }
                aria-label="Select successor task"
                aria-required="true"
              >
                <option value="">Select a task...</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {validationError && (
            <div className="validation-error" role="alert" aria-live="polite">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{validationError.message}</span>
            </div>
          )}

          <div className="form-actions">
            <button
              className="save-button"
              onClick={editingId ? handleSaveEdit : handleSaveAdd}
              aria-label={editingId ? 'Save changes' : 'Add dependency'}
            >
              {editingId ? 'Save Changes' : 'Add Dependency'}
            </button>
            <button
              className="cancel-button"
              onClick={editingId ? handleCancelEdit : handleCancelAdd}
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dependencies List */}
      {dependencies.length === 0 && !isAdding && (
        <div className="empty-state">
          <p className="empty-message">No dependencies defined</p>
          <p className="empty-hint">
            Add dependencies to define the order in which tasks must be completed.
          </p>
        </div>
      )}

      {dependencies.length > 0 && (
        <div className="dependencies-table-container">
          <table className="dependencies-table" role="table">
            <thead>
              <tr>
                <th scope="col">Predecessor</th>
                <th scope="col">Type</th>
                <th scope="col">Successor</th>
                {!readOnly && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {dependencies.map((dep, index) => (
                <tr key={dep.id || index}>
                  <td>
                    <div className="task-cell">
                      <span className="task-title">{getTaskTitle(dep.from_task_id)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="type-cell">
                      <span className="type-badge">{formatDependencyType(dep.type)}</span>
                      <span className="type-description">
                        {getDependencyDescription(dep.type)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="task-cell">
                      <span className="task-title">{getTaskTitle(dep.to_task_id)}</span>
                    </div>
                  </td>
                  {!readOnly && (
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-button edit"
                          onClick={() => handleEdit(dep)}
                          aria-label={`Edit dependency from ${getTaskTitle(
                            dep.from_task_id
                          )} to ${getTaskTitle(dep.to_task_id)}`}
                          title="Edit dependency"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-button delete"
                          onClick={() => handleDelete(dep.id!)}
                          aria-label={`Delete dependency from ${getTaskTitle(
                            dep.from_task_id
                          )} to ${getTaskTitle(dep.to_task_id)}`}
                          title="Delete dependency"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .task-dependency-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .editor-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .add-button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .add-button:hover {
    background: #2563eb;
  }

  .add-button:active {
    transform: scale(0.98);
  }

  .add-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  .dependency-form {
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .form-header {
    margin-bottom: 1rem;
  }

  .form-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  @media (min-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
    color: #111827;
    cursor: pointer;
  }

  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }

  .validation-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .error-message {
    font-size: 0.875rem;
    color: #dc2626;
    font-weight: 500;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .save-button,
  .cancel-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .save-button {
    background: #3b82f6;
    color: white;
  }

  .save-button:hover {
    background: #2563eb;
  }

  .save-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  .cancel-button {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .cancel-button:hover {
    background: #e5e7eb;
  }

  .cancel-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(209, 213, 219, 0.3);
  }

  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
    background: #f9fafb;
    border-radius: 6px;
    border: 2px dashed #d1d5db;
  }

  .empty-message {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #374151;
    font-weight: 500;
  }

  .empty-hint {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
  }

  .dependencies-table-container {
    overflow-x: auto;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .dependencies-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
  }

  .dependencies-table th {
    text-align: left;
    padding: 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  .dependencies-table td {
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .dependencies-table tbody tr:hover {
    background: #f9fafb;
  }

  .dependencies-table tbody tr:last-child td {
    border-bottom: none;
  }

  .task-cell {
    display: flex;
    flex-direction: column;
  }

  .task-title {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 500;
  }

  .type-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .type-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: fit-content;
  }

  .type-description {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .action-button:hover {
    opacity: 1;
  }

  .action-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .action-button.delete:hover {
    filter: brightness(1.2);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .task-dependency-editor {
      padding: 1rem;
    }

    .editor-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .add-button {
      width: 100%;
    }

    .dependencies-table {
      font-size: 0.75rem;
    }

    .dependencies-table th,
    .dependencies-table td {
      padding: 0.5rem;
    }

    .type-description {
      display: none;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .add-button,
    .save-button,
    .cancel-button,
    .action-button {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .add-button,
    .form-actions,
    .actions-cell {
      display: none;
    }

    .task-dependency-editor {
      border: 1px solid #000;
    }

    .dependencies-table {
      border: 1px solid #000;
    }
  }
`;

export default TaskDependencyEditor;

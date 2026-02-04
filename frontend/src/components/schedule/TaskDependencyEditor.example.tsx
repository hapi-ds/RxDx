/**
 * TaskDependencyEditor Example
 * Demonstrates usage of the TaskDependencyEditor component
 */

import React, { useState } from 'react';
import { TaskDependencyEditor, type TaskDependency, type Task } from './TaskDependencyEditor';

export function TaskDependencyEditorExample(): React.ReactElement {
  // Sample tasks for demonstration
  const sampleTasks: Task[] = [
    { id: 'task-1', title: 'Requirements Gathering' },
    { id: 'task-2', title: 'System Design' },
    { id: 'task-3', title: 'Database Schema Design' },
    { id: 'task-4', title: 'Frontend Development' },
    { id: 'task-5', title: 'Backend Development' },
    { id: 'task-6', title: 'Integration Testing' },
    { id: 'task-7', title: 'User Acceptance Testing' },
    { id: 'task-8', title: 'Deployment' },
  ];

  // Sample dependencies
  const initialDependencies: TaskDependency[] = [
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
    {
      id: 'dep-3',
      from_task_id: 'task-2',
      to_task_id: 'task-4',
      type: 'finish-to-start',
    },
    {
      id: 'dep-4',
      from_task_id: 'task-2',
      to_task_id: 'task-5',
      type: 'finish-to-start',
    },
    {
      id: 'dep-5',
      from_task_id: 'task-4',
      to_task_id: 'task-6',
      type: 'finish-to-start',
    },
    {
      id: 'dep-6',
      from_task_id: 'task-5',
      to_task_id: 'task-6',
      type: 'finish-to-start',
    },
    {
      id: 'dep-7',
      from_task_id: 'task-6',
      to_task_id: 'task-7',
      type: 'finish-to-start',
    },
    {
      id: 'dep-8',
      from_task_id: 'task-7',
      to_task_id: 'task-8',
      type: 'finish-to-start',
    },
  ];

  const [dependencies, setDependencies] = useState<TaskDependency[]>(initialDependencies);
  const [readOnly, setReadOnly] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined);

  const handleDependenciesChange = (newDependencies: TaskDependency[]): void => {
    setDependencies(newDependencies);
    console.log('Dependencies updated:', newDependencies);
  };

  return (
    <div className="example-container">
      <div className="example-header">
        <h1 className="example-title">TaskDependencyEditor Examples</h1>
        <p className="example-description">
          Interactive examples demonstrating the TaskDependencyEditor component for managing
          task dependencies in project scheduling.
        </p>
      </div>

      <div className="examples-grid">
        {/* Example 1: Basic Usage */}
        <section className="example-section">
          <h2 className="section-title">Basic Usage</h2>
          <p className="section-description">
            Standard dependency editor with full functionality. Add, edit, and delete
            dependencies between tasks.
          </p>
          <div className="example-demo">
            <TaskDependencyEditor
              tasks={sampleTasks}
              dependencies={dependencies}
              onChange={handleDependenciesChange}
            />
          </div>
          <div className="example-info">
            <p className="info-text">
              <strong>Dependencies:</strong> {dependencies.length}
            </p>
            <button
              className="reset-button"
              onClick={() => setDependencies(initialDependencies)}
            >
              Reset Dependencies
            </button>
          </div>
        </section>

        {/* Example 2: Read-Only Mode */}
        <section className="example-section">
          <h2 className="section-title">Read-Only Mode</h2>
          <p className="section-description">
            Display dependencies without allowing modifications. Useful for viewing
            approved schedules or historical data.
          </p>
          <div className="example-demo">
            <TaskDependencyEditor
              tasks={sampleTasks}
              dependencies={dependencies}
              onChange={handleDependenciesChange}
              readOnly={true}
            />
          </div>
        </section>

        {/* Example 3: With Current Task Filter */}
        <section className="example-section">
          <h2 className="section-title">Current Task Context</h2>
          <p className="section-description">
            When editing a specific task, the current task is excluded from the available
            task list to prevent self-references.
          </p>
          <div className="example-controls">
            <label htmlFor="current-task-select">
              <strong>Current Task:</strong>
            </label>
            <select
              id="current-task-select"
              value={currentTaskId || ''}
              onChange={(e) => setCurrentTaskId(e.target.value || undefined)}
              className="task-select"
            >
              <option value="">None (show all tasks)</option>
              {sampleTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
          <div className="example-demo">
            <TaskDependencyEditor
              tasks={sampleTasks}
              currentTaskId={currentTaskId}
              dependencies={dependencies}
              onChange={handleDependenciesChange}
            />
          </div>
        </section>

        {/* Example 4: Empty State */}
        <section className="example-section">
          <h2 className="section-title">Empty State</h2>
          <p className="section-description">
            Display when no dependencies have been defined yet.
          </p>
          <div className="example-demo">
            <TaskDependencyEditor
              tasks={sampleTasks}
              dependencies={[]}
              onChange={() => {}}
            />
          </div>
        </section>

        {/* Example 5: All Dependency Types */}
        <section className="example-section">
          <h2 className="section-title">All Dependency Types</h2>
          <p className="section-description">
            Demonstration of all four dependency types supported by the component.
          </p>
          <div className="example-demo">
            <TaskDependencyEditor
              tasks={sampleTasks.slice(0, 4)}
              dependencies={[
                {
                  id: 'demo-fs',
                  from_task_id: 'task-1',
                  to_task_id: 'task-2',
                  type: 'finish-to-start',
                },
                {
                  id: 'demo-ss',
                  from_task_id: 'task-2',
                  to_task_id: 'task-3',
                  type: 'start-to-start',
                },
                {
                  id: 'demo-ff',
                  from_task_id: 'task-3',
                  to_task_id: 'task-4',
                  type: 'finish-to-finish',
                },
                {
                  id: 'demo-sf',
                  from_task_id: 'task-1',
                  to_task_id: 'task-4',
                  type: 'start-to-finish',
                },
              ]}
              onChange={() => {}}
              readOnly={true}
            />
          </div>
          <div className="dependency-types-info">
            <h3>Dependency Type Descriptions:</h3>
            <ul>
              <li>
                <strong>Finish-to-Start (FS):</strong> The successor task cannot start
                until the predecessor task finishes. This is the most common dependency
                type.
              </li>
              <li>
                <strong>Start-to-Start (SS):</strong> The successor task cannot start
                until the predecessor task starts. Both tasks can run in parallel after
                the predecessor starts.
              </li>
              <li>
                <strong>Finish-to-Finish (FF):</strong> The successor task cannot finish
                until the predecessor task finishes. The successor can start before the
                predecessor finishes.
              </li>
              <li>
                <strong>Start-to-Finish (SF):</strong> The successor task cannot finish
                until the predecessor task starts. This is the least common dependency
                type.
              </li>
            </ul>
          </div>
        </section>

        {/* Example 6: Interactive Toggle */}
        <section className="example-section">
          <h2 className="section-title">Interactive Controls</h2>
          <p className="section-description">
            Toggle between read-only and editable modes.
          </p>
          <div className="example-controls">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnly(e.target.checked)}
                className="toggle-checkbox"
              />
              <span>Read-Only Mode</span>
            </label>
          </div>
          <div className="example-demo">
            <TaskDependencyEditor
              tasks={sampleTasks}
              dependencies={dependencies}
              onChange={handleDependenciesChange}
              readOnly={readOnly}
            />
          </div>
        </section>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .example-container {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    background: #f9fafb;
    min-height: 100vh;
  }

  .example-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .example-title {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
  }

  .example-description {
    margin: 0;
    font-size: 1rem;
    color: #6b7280;
    max-width: 800px;
    margin: 0 auto;
  }

  .examples-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .example-section {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .section-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .section-description {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .example-demo {
    margin-top: 1rem;
  }

  .example-info {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-text {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
  }

  .reset-button {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-button:hover {
    background: #e5e7eb;
  }

  .example-controls {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .example-controls label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .task-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
  }

  .task-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .toggle-checkbox {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
  }

  .dependency-types-info {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .dependency-types-info h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .dependency-types-info ul {
    margin: 0;
    padding-left: 1.5rem;
    list-style-type: disc;
  }

  .dependency-types-info li {
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .dependency-types-info li:last-child {
    margin-bottom: 0;
  }

  .dependency-types-info strong {
    color: #111827;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .example-container {
      padding: 1rem;
    }

    .example-title {
      font-size: 1.5rem;
    }

    .example-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .reset-button {
      width: 100%;
    }
  }
`;

export default TaskDependencyEditorExample;

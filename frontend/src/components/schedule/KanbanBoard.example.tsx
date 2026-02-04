/**
 * KanbanBoard component examples
 * Demonstrates various usage scenarios
 */

import React, { useState } from 'react';
import { KanbanBoard, type KanbanColumn } from './KanbanBoard';
import type { WorkItem } from '../../services/workitemService';

export function KanbanBoardExamples(): React.ReactElement {
  // Example 1: Basic Kanban board with default columns
  const [basicTasks, setBasicTasks] = useState<WorkItem[]>([
    {
      id: 'task-1',
      type: 'task',
      title: 'Implement user authentication',
      description: 'Add JWT-based authentication with login and registration endpoints',
      status: 'draft',
      priority: 1,
      assigned_to: 'john.doe',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'Design database schema',
      description: 'Create ERD and define all tables, relationships, and indexes',
      status: 'active',
      priority: 2,
      assigned_to: 'jane.smith',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-3',
      type: 'task',
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: 'active',
      priority: 3,
      assigned_to: 'bob.wilson',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-03T10:00:00Z',
      updated_at: '2024-01-03T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-4',
      type: 'task',
      title: 'Write API documentation',
      description: 'Document all REST endpoints with examples and response schemas',
      status: 'completed',
      priority: 4,
      assigned_to: 'alice.brown',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-04T10:00:00Z',
      updated_at: '2024-01-04T10:00:00Z',
      is_signed: true,
    },
    {
      id: 'task-5',
      type: 'requirement',
      title: 'Define security requirements',
      description: 'List all security requirements for the application',
      status: 'draft',
      priority: 1,
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-05T10:00:00Z',
      updated_at: '2024-01-05T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-6',
      type: 'test',
      title: 'Integration tests for auth',
      description: 'Write comprehensive integration tests for authentication flow',
      status: 'active',
      priority: 2,
      assigned_to: 'charlie.davis',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-06T10:00:00Z',
      updated_at: '2024-01-06T10:00:00Z',
      is_signed: false,
    },
  ]);

  // Example 2: Custom columns with WIP limits
  const customColumns: KanbanColumn[] = [
    { id: 'backlog', title: 'Backlog', status: 'draft', color: '#94a3b8' },
    { id: 'ready', title: 'Ready', status: 'active', color: '#f59e0b', limit: 3 },
    { id: 'in-progress', title: 'In Progress', status: 'active', color: '#3b82f6', limit: 2 },
    { id: 'review', title: 'Review', status: 'active', color: '#8b5cf6', limit: 3 },
    { id: 'done', title: 'Done', status: 'completed', color: '#10b981' },
  ];

  const [customTasks, setCustomTasks] = useState<WorkItem[]>([
    {
      id: 'custom-1',
      type: 'task',
      title: 'Feature A',
      status: 'draft',
      priority: 1,
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'custom-2',
      type: 'task',
      title: 'Feature B',
      status: 'active',
      priority: 2,
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      is_signed: false,
    },
  ]);

  // Handle task move
  const handleTaskMove = (
    taskId: string,
    fromStatus: string,
    toStatus: string,
    tasks: WorkItem[],
    setTasks: React.Dispatch<React.SetStateAction<WorkItem[]>>
  ) => {
    console.log(`Moving task ${taskId} from ${fromStatus} to ${toStatus}`);
    
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: toStatus as WorkItem['status'] } : task
      )
    );
  };

  // Handle task click
  const handleTaskClick = (taskId: string) => {
    console.log('Task clicked:', taskId);
    alert(`Task clicked: ${taskId}\n\nIn a real application, this would open a task detail modal or navigate to the task page.`);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <h1 style={{ marginBottom: '1rem' }}>KanbanBoard Component Examples</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Interactive examples demonstrating various features of the KanbanBoard component.
        </p>
      </div>

      {/* Example 1: Basic Kanban board */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 1: Basic Kanban Board</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Standard three-column board (To Do, In Progress, Done) with drag-and-drop support.
        </p>
        <KanbanBoard
          tasks={basicTasks}
          onTaskMove={(taskId, fromStatus, toStatus) =>
            handleTaskMove(taskId, fromStatus, toStatus, basicTasks, setBasicTasks)
          }
          onTaskClick={handleTaskClick}
          showPriority={true}
          showAssignee={true}
        />
      </section>

      {/* Example 2: Custom columns with WIP limits */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 2: Custom Columns with WIP Limits</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Five-column board with work-in-progress limits to prevent overloading.
        </p>
        <KanbanBoard
          tasks={customTasks}
          columns={customColumns}
          onTaskMove={(taskId, fromStatus, toStatus) =>
            handleTaskMove(taskId, fromStatus, toStatus, customTasks, setCustomTasks)
          }
          onTaskClick={handleTaskClick}
        />
      </section>

      {/* Example 3: Read-only board */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 3: Read-Only Board</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Display-only mode for viewing task status without editing capabilities.
        </p>
        <KanbanBoard
          tasks={basicTasks}
          readOnly={true}
          showPriority={true}
          showAssignee={true}
        />
      </section>

      {/* Example 4: Minimal display */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 4: Minimal Display</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Simplified view without priority and assignee information.
        </p>
        <KanbanBoard
          tasks={basicTasks.slice(0, 3)}
          onTaskMove={(taskId, fromStatus, toStatus) =>
            handleTaskMove(taskId, fromStatus, toStatus, basicTasks, setBasicTasks)
          }
          showPriority={false}
          showAssignee={false}
        />
      </section>

      {/* Example 5: Empty state */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 5: Empty State</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          How the component appears when no tasks are provided.
        </p>
        <KanbanBoard tasks={[]} />
      </section>

      {/* Usage instructions */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Usage Instructions</h2>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li><strong>Drag and Drop:</strong> Click and drag task cards between columns to update status</li>
          <li><strong>Task Details:</strong> Click on any task card to view or edit details</li>
          <li><strong>Priority:</strong> Color-coded badges indicate task priority (Critical, High, Medium, Low)</li>
          <li><strong>WIP Limits:</strong> Columns with limits prevent adding more tasks than allowed</li>
          <li><strong>Assignee:</strong> Shows who is responsible for each task</li>
          <li><strong>Signed Tasks:</strong> Green checkmark indicates digitally signed tasks</li>
          <li><strong>Task Types:</strong> Badge shows whether item is a task, requirement, test, or risk</li>
        </ul>
      </section>

      {/* Integration example */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Integration Example</h2>
        <pre style={{ 
          background: '#1e293b', 
          color: '#e2e8f0', 
          padding: '1rem', 
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '0.875rem',
        }}>
{`import { KanbanBoard } from './components/schedule/KanbanBoard';
import { workitemService } from './services/workitemService';
import { useState, useEffect } from 'react';

function ProjectBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const result = await workitemService.list({ 
          type: 'task',
          limit: 100 
        });
        setTasks(result.items);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const handleTaskMove = async (taskId, fromStatus, toStatus) => {
    try {
      // Optimistically update UI
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: toStatus } : task
        )
      );

      // Update on server
      await workitemService.update(taskId, { status: toStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on error
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: fromStatus } : task
        )
      );
    }
  };

  const handleTaskClick = (taskId) => {
    // Navigate to task detail page
    window.location.href = \`/tasks/\${taskId}\`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <KanbanBoard
      tasks={tasks}
      onTaskMove={handleTaskMove}
      onTaskClick={handleTaskClick}
      showPriority={true}
      showAssignee={true}
    />
  );
}`}
        </pre>
      </section>
    </div>
  );
}

export default KanbanBoardExamples;

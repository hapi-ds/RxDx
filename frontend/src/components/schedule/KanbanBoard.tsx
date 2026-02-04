/**
 * KanbanBoard component
 * Visualizes tasks in columns with drag-and-drop support
 * Implements Requirement 11 (Project Management Workflows)
 * 
 * Features:
 * - Display tasks in customizable columns (e.g., To Do, In Progress, Done)
 * - Drag-and-drop tasks between columns to update status
 * - Visual feedback during drag operations
 * - Task cards with key information
 * - Responsive and accessible design
 * - Integrates with workitem/task services
 */

import React, { useState, useCallback, useMemo, type DragEvent } from 'react';
import type { WorkItem } from '../../services/workitemService';

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color?: string;
  limit?: number;
}

export interface KanbanBoardProps {
  /** Tasks to display on the board */
  tasks: WorkItem[];
  /** Column configuration */
  columns?: KanbanColumn[];
  /** Callback when a task is moved to a different column */
  onTaskMove?: (taskId: string, fromStatus: string, toStatus: string) => void;
  /** Callback when a task is clicked */
  onTaskClick?: (taskId: string) => void;
  /** Whether the board is in read-only mode */
  readOnly?: boolean;
  /** Show task priority indicators */
  showPriority?: boolean;
  /** Show assigned user */
  showAssignee?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface DragState {
  taskId: string | null;
  sourceColumnId: string | null;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'draft', title: 'To Do', status: 'draft', color: '#94a3b8' },
  { id: 'active', title: 'In Progress', status: 'active', color: '#3b82f6' },
  { id: 'completed', title: 'Done', status: 'completed', color: '#10b981' },
];

export function KanbanBoard({
  tasks,
  columns = DEFAULT_COLUMNS,
  onTaskMove,
  onTaskClick,
  readOnly = false,
  showPriority = true,
  showAssignee = true,
  className = '',
}: KanbanBoardProps): React.ReactElement {
  const [dragState, setDragState] = useState<DragState>({
    taskId: null,
    sourceColumnId: null,
  });
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Group tasks by status
  const tasksByColumn = useMemo(() => {
    const grouped = new Map<string, WorkItem[]>();
    
    // Initialize all columns
    columns.forEach(col => {
      grouped.set(col.id, []);
    });

    // Group tasks
    tasks.forEach(task => {
      const column = columns.find(col => col.status === task.status);
      if (column) {
        const columnTasks = grouped.get(column.id) || [];
        columnTasks.push(task);
        grouped.set(column.id, columnTasks);
      }
    });

    return grouped;
  }, [tasks, columns]);

  // Get priority label and color
  const getPriorityInfo = (priority?: number): { label: string; color: string } => {
    if (!priority) return { label: 'None', color: '#9ca3af' };
    
    switch (priority) {
      case 1:
        return { label: 'Critical', color: '#dc2626' };
      case 2:
        return { label: 'High', color: '#ea580c' };
      case 3:
        return { label: 'Medium', color: '#f59e0b' };
      case 4:
        return { label: 'Low', color: '#84cc16' };
      case 5:
        return { label: 'Trivial', color: '#22c55e' };
      default:
        return { label: `P${priority}`, color: '#6b7280' };
    }
  };

  // Handle drag start
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, taskId: string, columnId: string) => {
      if (readOnly) return;

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
      
      setDragState({
        taskId,
        sourceColumnId: columnId,
      });

      // Add dragging class to the element
      const target = e.currentTarget;
      setTimeout(() => {
        target.classList.add('dragging');
      }, 0);
    },
    [readOnly]
  );

  // Handle drag end
  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    setDragState({ taskId: null, sourceColumnId: null });
    setDragOverColumn(null);
  }, []);

  // Handle drag over column
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, columnId: string) => {
    if (readOnly) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, [readOnly]);

  // Handle drag leave column
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only clear if we're leaving the column container, not a child element
    if (e.currentTarget === e.target) {
      setDragOverColumn(null);
    }
  }, []);

  // Handle drop on column
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetColumnId: string) => {
      if (readOnly) return;

      e.preventDefault();
      setDragOverColumn(null);

      const taskId = e.dataTransfer.getData('text/plain');
      const sourceColumnId = dragState.sourceColumnId;

      if (!taskId || !sourceColumnId || sourceColumnId === targetColumnId) {
        return;
      }

      const sourceColumn = columns.find(col => col.id === sourceColumnId);
      const targetColumn = columns.find(col => col.id === targetColumnId);

      if (!sourceColumn || !targetColumn) {
        return;
      }

      // Check column limit
      if (targetColumn.limit) {
        const targetTasks = tasksByColumn.get(targetColumnId) || [];
        if (targetTasks.length >= targetColumn.limit) {
          alert(`Cannot move task: ${targetColumn.title} column is at capacity (${targetColumn.limit} tasks)`);
          return;
        }
      }

      // Call the move callback
      if (onTaskMove) {
        onTaskMove(taskId, sourceColumn.status, targetColumn.status);
      }

      setDragState({ taskId: null, sourceColumnId: null });
    },
    [readOnly, dragState, columns, tasksByColumn, onTaskMove]
  );

  // Handle task click
  const handleTaskClick = useCallback(
    (taskId: string) => {
      if (onTaskClick) {
        onTaskClick(taskId);
      }
    },
    [onTaskClick]
  );

  // Render task card
  const renderTaskCard = (task: WorkItem, columnId: string) => {
    const priorityInfo = getPriorityInfo(task.priority);
    const isDragging = dragState.taskId === task.id;

    return (
      <div
        key={task.id}
        className={`kanban-card ${isDragging ? 'dragging' : ''}`}
        draggable={!readOnly}
        onDragStart={(e) => handleDragStart(e, task.id, columnId)}
        onDragEnd={handleDragEnd}
        onClick={() => handleTaskClick(task.id)}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${task.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTaskClick(task.id);
          }
        }}
      >
        {/* Priority indicator */}
        {showPriority && task.priority && (
          <div
            className="card-priority"
            style={{ backgroundColor: priorityInfo.color }}
            title={`Priority: ${priorityInfo.label}`}
          >
            {priorityInfo.label}
          </div>
        )}

        {/* Task title */}
        <h4 className="card-title">{task.title}</h4>

        {/* Task description (truncated) */}
        {task.description && (
          <p className="card-description">
            {task.description.length > 100
              ? `${task.description.substring(0, 100)}...`
              : task.description}
          </p>
        )}

        {/* Task metadata */}
        <div className="card-footer">
          {/* Task type badge */}
          <span className="card-type" title={`Type: ${task.type}`}>
            {task.type}
          </span>

          {/* Assignee */}
          {showAssignee && task.assigned_to && (
            <span className="card-assignee" title={`Assigned to: ${task.assigned_to}`}>
              👤 {task.assigned_to}
            </span>
          )}

          {/* Signed indicator */}
          {task.is_signed && (
            <span className="card-signed" title="Digitally signed">
              ✓ Signed
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render column
  const renderColumn = (column: KanbanColumn) => {
    const columnTasks = tasksByColumn.get(column.id) || [];
    const isDragOver = dragOverColumn === column.id;
    const isAtLimit = column.limit && columnTasks.length >= column.limit;

    return (
      <div
        key={column.id}
        className={`kanban-column ${isDragOver ? 'drag-over' : ''} ${isAtLimit ? 'at-limit' : ''}`}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.id)}
        role="region"
        aria-label={`${column.title} column`}
      >
        {/* Column header */}
        <div className="column-header" style={{ borderTopColor: column.color }}>
          <h3 className="column-title">{column.title}</h3>
          <span className="column-count">
            {columnTasks.length}
            {column.limit && ` / ${column.limit}`}
          </span>
        </div>

        {/* Column content */}
        <div className="column-content">
          {columnTasks.length === 0 ? (
            <div className="column-empty">
              <p>No tasks</p>
              {!readOnly && <p className="hint">Drag tasks here</p>}
            </div>
          ) : (
            columnTasks.map(task => renderTaskCard(task, column.id))
          )}
        </div>
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className={`kanban-board ${className}`}>
        <div className="empty-state">
          <p>No tasks to display</p>
          <p className="hint">
            Create tasks to see them organized in the Kanban board.
          </p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`kanban-board ${className}`}>
      <div className="board-header">
        <h2 className="board-title">Task Board</h2>
        <div className="board-stats">
          <span className="stat">
            <strong>{tasks.length}</strong> total tasks
          </span>
          <span className="stat">
            <strong>{tasksByColumn.get('completed')?.length || 0}</strong> completed
          </span>
        </div>
      </div>

      {!readOnly && (
        <div className="board-hint">
          <p>💡 Drag and drop tasks between columns to update their status</p>
        </div>
      )}

      <div className="board-columns">
        {columns.map(column => renderColumn(column))}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .kanban-board {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .board-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .board-stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .stat {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .stat strong {
    color: #111827;
    font-weight: 600;
  }

  .board-hint {
    padding: 0.75rem 1rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
  }

  .board-hint p {
    margin: 0;
    font-size: 0.875rem;
    color: #1e40af;
  }

  .board-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    min-height: 400px;
  }

  .kanban-column {
    display: flex;
    flex-direction: column;
    background: #f9fafb;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    transition: all 0.2s ease;
  }

  .kanban-column.drag-over {
    background: #eff6ff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .kanban-column.at-limit {
    opacity: 0.7;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-top: 4px solid #94a3b8;
    border-bottom: 1px solid #e5e7eb;
    background: white;
    border-radius: 6px 6px 0 0;
  }

  .column-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .column-count {
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
  }

  .column-content {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    min-height: 200px;
  }

  .column-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    text-align: center;
    color: #9ca3af;
    font-style: italic;
  }

  .column-empty p {
    margin: 0;
    font-size: 0.875rem;
  }

  .column-empty .hint {
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }

  .kanban-card {
    position: relative;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .kanban-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .kanban-card:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .kanban-card.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .card-priority {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.4;
    padding-right: 4rem; /* Space for priority badge */
  }

  .card-description {
    margin: 0 0 0.75rem 0;
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .card-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid #f3f4f6;
  }

  .card-type {
    padding: 0.125rem 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-assignee {
    font-size: 0.75rem;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .card-signed {
    padding: 0.125rem 0.5rem;
    background: #d1fae5;
    color: #065f46;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 6px;
  }

  .empty-state p {
    margin: 0 0 0.5rem 0;
    color: #6b7280;
  }

  .empty-state .hint {
    font-size: 0.875rem;
    font-style: italic;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .kanban-board {
      padding: 1rem;
    }

    .board-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .board-columns {
      grid-template-columns: 1fr;
    }

    .kanban-card {
      padding: 0.75rem;
    }

    .card-title {
      font-size: 0.8125rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .kanban-card,
    .kanban-column {
      transition: none;
    }

    .kanban-card:hover {
      transform: none;
    }
  }

  /* Print Styles */
  @media print {
    .kanban-board {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .board-hint {
      display: none;
    }

    .board-columns {
      display: block;
    }

    .kanban-column {
      page-break-inside: avoid;
      margin-bottom: 1rem;
    }

    .kanban-card {
      page-break-inside: avoid;
    }
  }
`;

export default KanbanBoard;

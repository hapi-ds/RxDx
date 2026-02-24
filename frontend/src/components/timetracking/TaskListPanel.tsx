/**
 * TaskListPanel component
 * Displays a searchable, sortable list of tasks for time tracking
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Input, Spinner, EmptyState } from '../common';
import type { Task } from '../../services/timeTrackingService';

export interface TaskListPanelProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
  isLoading: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function TaskListPanel({
  tasks,
  selectedTaskId,
  onTaskSelect,
  isLoading,
  searchQuery = '',
  onSearchChange,
}: TaskListPanelProps): React.ReactElement {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search input by 300ms
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalSearchQuery(value);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the actual search
      timeoutRef.current = setTimeout(() => {
        onSearchChange?.(value);
      }, 300);
    },
    [onSearchChange]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearchQuery('');
    onSearchChange?.('');
  }, [onSearchChange]);

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }

    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  // Sort tasks by priority
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Priority 1: Tasks with active tracking by current user
      if (a.user_is_tracking && !b.user_is_tracking) return -1;
      if (!a.user_is_tracking && b.user_is_tracking) return 1;

      // Priority 2: Tasks scheduled next
      if (a.scheduled_start && !b.scheduled_start) return -1;
      if (!a.scheduled_start && b.scheduled_start) return 1;

      // If both have scheduled_start, sort by date
      if (a.scheduled_start && b.scheduled_start) {
        return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
      }

      // Priority 3: All other tasks (maintain original order)
      return 0;
    });
  }, [filteredTasks]);

  const taskCount = filteredTasks.length;
  const totalCount = tasks.length;

  if (isLoading && tasks.length === 0) {
    return (
      <div className="task-list-panel">
        <div className="task-list-loading">
          <Spinner size="lg" />
          <span>Loading tasks...</span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="task-list-panel">
      <div className="task-list-header">
        <h2 className="task-list-title">Tasks</h2>
        <div className="task-search">
          <Input
            placeholder="Search tasks..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            leftAddon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            rightAddon={
              localSearchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="clear-search-btn"
                  aria-label="Clear search"
                  type="button"
                >
                  ✕
                </button>
              )
            }
          />
        </div>
        {searchQuery && (
          <div className="task-count">
            Showing {taskCount} of {totalCount} tasks
          </div>
        )}
      </div>

      <div className="task-list-container">
        {sortedTasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            message={
              searchQuery
                ? 'Try adjusting your search query'
                : 'No tasks available for time tracking'
            }
          />
        ) : (
          <div className="task-list">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onClick={() => onTaskSelect(task)}
              />
            ))}
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

function TaskCard({ task, isSelected, onClick }: TaskCardProps): React.ReactElement {
  // Format worked_sum as "Xh Ym"
  const formatWorkedSum = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Truncate description to 100 characters
  const truncateDescription = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={`task-card ${isSelected ? 'task-card-selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={isSelected}
    >
      <div className="task-card-header">
        <h3 className="task-card-title">
          {task.title}
          {task.user_is_tracking && (
            <span className="timer-icon" title="Currently tracking" aria-label="Currently tracking">
              ⏱️
            </span>
          )}
        </h3>
        <span className="task-worked-sum">{formatWorkedSum(task.worked_sum)}</span>
      </div>
      {task.description && (
        <p className="task-card-description">
          {truncateDescription(task.description, 100)}
        </p>
      )}
    </div>
  );
}

const styles = `
  .task-list-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .task-list-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .task-list-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 1rem 0;
  }

  .task-search {
    margin-bottom: 0.75rem;
  }

  .clear-search-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .clear-search-btn:hover {
    color: #111827;
  }

  .task-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .task-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .task-list-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: #6b7280;
  }

  .task-card {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #ffffff;
    cursor: pointer;
    transition: all 0.2s;
  }

  .task-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .task-card:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .task-card-selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .task-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .task-card-title {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .timer-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .task-worked-sum {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    white-space: nowrap;
  }

  .task-card-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  }

  /* Scrollbar styling */
  .task-list-container::-webkit-scrollbar {
    width: 8px;
  }

  .task-list-container::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  .task-list-container::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  .task-list-container::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

export default TaskListPanel;

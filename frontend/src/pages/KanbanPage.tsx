/**
 * Kanban page with schedule integration
 * Displays tasks in Kanban board with sprint filtering and backlog management
 * Implements Requirements 10.1-10.16 (Kanban Board Schedule Integration)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanBoard } from '../components/schedule/KanbanBoard';
import { sprintService, type Sprint } from '../services/sprintService';
import { workitemService, type WorkItem } from '../services/workitemService';

interface ExtendedWorkItem extends WorkItem {
  sprint_id?: string;
  sprint_name?: string;
  in_backlog?: boolean;
  estimated_hours?: number;
}

export function KanbanPage(): React.ReactElement {
  const [tasks, setTasks] = useState<ExtendedWorkItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBacklogOnly, setShowBacklogOnly] = useState(false);

  // Load sprints for the project
  const loadSprints = useCallback(async (projectId: string) => {
    try {
      const sprintsData = await sprintService.getSprints(projectId);
      setSprints(sprintsData);
    } catch (err) {
      console.error('Failed to load sprints:', err);
    }
  }, []);

  // Load tasks with sprint and backlog information
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all tasks for the project
      const response = await workitemService.list({ type: 'task' });
      const projectTasks = response.items;

      // Enrich tasks with sprint and backlog information
      const enrichedTasks: ExtendedWorkItem[] = await Promise.all(
        projectTasks.map(async (task: WorkItem) => {
          const enriched: ExtendedWorkItem = { ...task };

          // Check if task is in a sprint
          if (selectedSprintId !== 'all' && selectedSprintId !== 'backlog') {
            try {
              const sprintTasks = await sprintService.getSprintTasks(selectedSprintId);
              const isInSprint = sprintTasks.some(st => st.id === task.id);
              if (isInSprint) {
                enriched.sprint_id = selectedSprintId;
                const sprint = sprints.find(s => s.id === selectedSprintId);
                enriched.sprint_name = sprint?.name;
              }
            } catch {
              // Task not in this sprint
            }
          }

          // Set in_backlog to false for now (simplified - backlog integration pending)
          enriched.in_backlog = false;

          return enriched;
        })
      );

      // Filter tasks based on selection
      let filteredTasks = enrichedTasks;
      
      if (selectedSprintId === 'backlog') {
        filteredTasks = enrichedTasks.filter(t => t.in_backlog);
      } else if (selectedSprintId !== 'all') {
        filteredTasks = enrichedTasks.filter(t => t.sprint_id === selectedSprintId);
      } else if (showBacklogOnly) {
        filteredTasks = enrichedTasks.filter(t => t.in_backlog);
      }

      setTasks(filteredTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSprintId, sprints, showBacklogOnly]);

  // Load data on mount and when filters change
  useEffect(() => {
    // TODO: Get project ID from context or route params
    const projectId = ''; // Placeholder
    if (projectId) {
      loadSprints(projectId);
    }
  }, [loadSprints]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle task status change via drag-and-drop
  const handleTaskMove = useCallback(async (taskId: string, _fromStatus: string, toStatus: string) => {
    try {
      await workitemService.update(taskId, { status: toStatus as any });
      
      // Reload tasks to reflect the change
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    }
  }, [loadTasks]);

  // Handle task click
  const handleTaskClick = useCallback((taskId: string) => {
    // Navigate to task detail page or open modal
    console.log('Task clicked:', taskId);
    // TODO: Implement navigation or modal
  }, []);

  // Handle sprint assignment
  const handleAssignToSprint = useCallback(async (taskId: string, sprintId: string) => {
    try {
      await sprintService.assignTaskToSprint(sprintId, taskId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task to sprint');
    }
  }, [loadTasks]);

  // Handle return to backlog
  const handleReturnToBacklog = useCallback(async (taskId: string) => {
    try {
      // Remove from sprint if in one
      const task = tasks.find(t => t.id === taskId);
      if (task?.sprint_id) {
        await sprintService.removeTaskFromSprint(task.sprint_id, taskId);
      }
      
      // TODO: Add to backlog when project context is available
      
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return task to backlog');
    }
  }, [tasks, loadTasks]);

  if (isLoading) {
    return (
      <div className="kanban-page">
        <div className="loading-state">
          <p>Loading Kanban board...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kanban-page">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => loadTasks()} className="retry-button">
            Retry
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="kanban-page">
      {/* Filters */}
      <div className="kanban-filters">
        <div className="filter-group">
          <label htmlFor="sprint-filter">Sprint:</label>
          <select
            id="sprint-filter"
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Tasks</option>
            <option value="backlog">Backlog Only</option>
            {sprints.map(sprint => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} ({sprint.status})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={showBacklogOnly}
              onChange={(e) => setShowBacklogOnly(e.target.checked)}
            />
            Show backlog tasks only
          </label>
        </div>
      </div>

      {/* Task metadata info */}
      <div className="kanban-info">
        <p className="info-text">
          💡 Task cards show: assignee, sprint, estimated hours, and backlog status.
          Schedule dates are read-only and managed through the Schedule page.
        </p>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskClick={handleTaskClick}
        showPriority={true}
        showAssignee={true}
      />

      {/* Task Actions */}
      {tasks.length > 0 && (
        <div className="kanban-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button
              onClick={() => {
                const taskId = tasks[0]?.id;
                if (taskId && sprints.length > 0) {
                  handleAssignToSprint(taskId, sprints[0].id);
                }
              }}
              className="action-button"
              disabled={sprints.length === 0}
            >
              Move to Sprint
            </button>
            <button
              onClick={() => {
                const taskId = tasks[0]?.id;
                if (taskId) {
                  handleReturnToBacklog(taskId);
                }
              }}
              className="action-button"
            >
              Return to Backlog
            </button>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .kanban-page {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .kanban-filters {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .filter-select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .kanban-info {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    border-radius: 6px;
  }

  .info-text {
    margin: 0;
    font-size: 0.875rem;
    color: #1e40af;
  }

  .kanban-actions {
    margin-top: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .kanban-actions h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .action-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .action-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
  }

  .error-message {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .retry-button:hover {
    background: #2563eb;
  }
`;

/**
 * BacklogDetail component
 * Displays backlog details with task list and reordering
 */

import React, { useEffect, useState, useCallback } from 'react';
import { backlogService, type Backlog, type BacklogTask, type ReorderRequest } from '../../services/backlogService';
import { sprintService, type Sprint } from '../../services/sprintService';
import { Button, Spinner, ErrorMessage, Input } from '../common';

interface BacklogDetailProps {
  backlogId: string;
  projectId: string;
  onBack?: () => void;
}

export function BacklogDetail({
  backlogId,
  projectId,
  onBack,
}: BacklogDetailProps): React.ReactElement {
  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<BacklogTask | null>(null);

  useEffect(() => {
    loadBacklogData();
  }, [backlogId]);

  async function loadBacklogData(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);
      const [backlogData, tasksData, sprintsData] = await Promise.all([
        backlogService.getBacklog(backlogId),
        backlogService.getBacklogTasks(backlogId),
        sprintService.getSprints(projectId),
      ]);
      setBacklog(backlogData);
      setTasks(tasksData);
      setSprints(sprintsData.filter(s => s.status === 'planning' || s.status === 'active'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backlog');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDragStart = useCallback((task: BacklogTask) => {
    setDraggedTask(task);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (targetTask: BacklogTask) => {
    if (!draggedTask || draggedTask.id === targetTask.id) {
      return;
    }

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
    const targetIndex = tasks.findIndex(t => t.id === targetTask.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Reorder tasks locally
    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    // Update priority_order for all affected tasks
    const reorders: ReorderRequest[] = newTasks.map((task, index) => ({
      task_id: task.id,
      new_priority_order: index + 1,
    }));

    setTasks(newTasks);
    setDraggedTask(null);

    try {
      await backlogService.reorderBacklogTasks(backlogId, reorders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder tasks');
      // Reload to get correct order
      loadBacklogData();
    }
  }, [draggedTask, tasks, backlogId]);

  const handleMoveToSprint = useCallback(async (sprintId: string) => {
    if (selectedTasks.size === 0) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedTasks).map(taskId =>
          sprintService.assignTaskToSprint(sprintId, taskId)
        )
      );
      setSelectedTasks(new Set());
      loadBacklogData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move tasks to sprint');
    }
  }, [selectedTasks]);

  const handleRemoveTask = useCallback(async (taskId: string) => {
    try {
      await backlogService.removeTaskFromBacklog(backlogId, taskId);
      loadBacklogData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove task');
    }
  }, [backlogId]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEstimatedHours = tasks.reduce((sum, task) => {
    // Assuming tasks have estimated_hours property
    return sum + ((task as any).estimated_hours || 0);
  }, 0);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadBacklogData} />;
  }

  if (!backlog) {
    return <ErrorMessage message="Backlog not found" />;
  }

  return (
    <div className="backlog-detail">
      <div className="backlog-header">
        {onBack && <Button onClick={onBack}>← Back</Button>}
        <h2>{backlog.name}</h2>
        {backlog.description && <p>{backlog.description}</p>}
      </div>

      <div className="backlog-stats">
        <div className="stat">
          <span className="stat-label">Total Tasks:</span>
          <span className="stat-value">{tasks.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Estimated Hours:</span>
          <span className="stat-value">{totalEstimatedHours}h</span>
        </div>
      </div>

      <div className="backlog-actions">
        <Input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {selectedTasks.size > 0 && sprints.length > 0 && (
          <div className="sprint-actions">
            <span>{selectedTasks.size} selected</span>
            {sprints.map(sprint => (
              <Button
                key={sprint.id}
                onClick={() => handleMoveToSprint(sprint.id)}
              >
                Move to {sprint.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="backlog-tasks">
        {filteredTasks.length === 0 ? (
          <p>No tasks found</p>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`backlog-task ${selectedTasks.has(task.id) ? 'selected' : ''}`}
              draggable
              onDragStart={() => handleDragStart(task)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(task)}
            >
              <input
                type="checkbox"
                checked={selectedTasks.has(task.id)}
                onChange={() => toggleTaskSelection(task.id)}
              />
              <div className="task-content">
                <div className="task-header">
                  <span className="task-priority">#{task.priority_order}</span>
                  <h4>{task.title}</h4>
                </div>
                {task.description && <p>{task.description}</p>}
                <div className="task-meta">
                  <span>Status: {task.status}</span>
                  {task.priority && <span>Priority: {task.priority}</span>}
                  {(task as any).estimated_hours && (
                    <span>Est: {(task as any).estimated_hours}h</span>
                  )}
                </div>
              </div>
              <Button
                variant="danger"
                onClick={() => handleRemoveTask(task.id)}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

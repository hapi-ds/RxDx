/**
 * Schedule page
 * Main page for managing project schedules and task planning
 * Supports Requirement 7 (Offline Project Scheduling)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, ConfirmModal } from '../components/common';
import {
  scheduleService,
  type Task,
  type ScheduleFilters,
  type ScheduleStatistics,
  type ScheduleResult,
} from '../services';

type ViewMode = 'list' | 'detail' | 'create' | 'edit' | 'gantt' | 'calculate';

export function SchedulePage(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statistics, setStatistics] = useState<ScheduleStatistics | null>(null);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ScheduleFilters>({
    page: 1,
    size: 20,
  });
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load tasks and statistics on mount and when filters change
  useEffect(() => {
    loadTasks();
    loadStatistics();
  }, [filters]);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await scheduleService.getTasks(filters);
      setTasks(response.items || []);
      setTotalTasks(response.total || 0);
      setTotalPages(response.pages || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      setTasks([]);
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleRetry = useCallback(async () => {
    console.log('Retrying task load...');
    setError(null);
    await loadTasks();
  }, [loadTasks]);

  const loadStatistics = useCallback(async () => {
    setStatisticsError(null);
    try {
      const stats = await scheduleService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics';
      setStatisticsError(errorMessage);
      console.error('Failed to load statistics:', err);
      // Don't clear statistics - keep showing previous data if available
    }
  }, []);

  const handleCalculateSchedule = useCallback(async () => {
    setIsCalculating(true);
    setError(null);
    try {
      // Using a default project ID for now
      const result = await scheduleService.calculateSchedule('default-project', {
        horizon_days: 365,
        working_hours_per_day: 8,
      });
      setScheduleResult(result);
      setViewMode('calculate');
      
      if (result.status === 'success') {
        // Reload tasks to show updated schedule
        await loadTasks();
      }
    } catch (err) {
      setError('Failed to calculate schedule');
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  }, [loadTasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    setViewMode('detail');
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedTaskId(null);
    setViewMode('create');
  }, []);

  const handleEditClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    setViewMode('edit');
  }, []);

  const handleDeleteClick = useCallback((task: Task) => {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (taskToDelete) {
      setIsDeleting(true);
      try {
        await scheduleService.deleteTask(taskToDelete.id);
        setShowDeleteConfirm(false);
        setTaskToDelete(null);
        setViewMode('list');
        setSelectedTaskId(null);
        await loadTasks();
        await loadStatistics();
      } catch (err) {
        setError('Failed to delete task');
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [taskToDelete, loadTasks, loadStatistics]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedTaskId(null);
    setScheduleResult(null);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<ScheduleFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleViewGantt = useCallback(() => {
    setViewMode('gantt');
  }, []);

  const getStatusColor = (status: Task['status']): string => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'blocked':
        return '#ef4444';
      case 'not_started':
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: Task['status']): string => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'blocked':
        return 'Blocked';
      default:
        return status;
    }
  };

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Project Schedule</h1>
          <p className="page-subtitle">
            Plan and track project timelines with constraint-based scheduling
          </p>
        </div>
        <div className="header-actions">
          {viewMode !== 'list' && (
            <Button variant="secondary" onClick={handleBackToList}>
              ← Back to List
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Dashboard */}
      {viewMode === 'list' && (
        <div className="statistics-dashboard">
          <h2 className="dashboard-title">Schedule Overview</h2>
          {statisticsError && (
            <div className="statistics-error" role="alert">
              <span className="error-icon" aria-hidden="true">⚠️</span>
              <span className="error-text">{statisticsError}</span>
            </div>
          )}
          {statistics && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Tasks</div>
                <div className="stat-value">{statistics.total_tasks ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completed</div>
                <div className="stat-value" style={{ color: '#10b981' }}>
                  {statistics.completed_tasks ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">In Progress</div>
                <div className="stat-value" style={{ color: '#3b82f6' }}>
                  {statistics.in_progress_tasks ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Blocked</div>
                <div className="stat-value" style={{ color: '#ef4444' }}>
                  {statistics.blocked_tasks ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Hours</div>
                <div className="stat-value">{statistics.total_estimated_hours ?? 0}h</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completion</div>
                <div className="stat-value">
                  {(statistics.completion_percentage ?? 0).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="page-content">
        {viewMode === 'list' && (
          <div className="schedule-list-container">
            {/* Filters and Actions */}
            <div className="filters-section">
              <div className="filters-header">
                <h2 className="filters-title">Tasks</h2>
                <div className="action-buttons">
                  <Button
                    variant="secondary"
                    onClick={handleViewGantt}
                    disabled={tasks.length === 0}
                  >
                    📊 View Gantt Chart
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCalculateSchedule}
                    disabled={isCalculating || tasks.length === 0}
                  >
                    {isCalculating ? '⏳ Calculating...' : '🔄 Calculate Schedule'}
                  </Button>
                  <Button variant="primary" onClick={handleCreateClick}>
                    + Create Task
                  </Button>
                </div>
              </div>

              <div className="filters-grid">
                <div className="filter-group">
                  <label htmlFor="status-filter">Status</label>
                  <select
                    id="status-filter"
                    value={filters.status || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        status: (e.target.value as Task['status']) || undefined,
                      })
                    }
                    className="filter-select"
                    aria-label="Filter by status"
                  >
                    <option value="">All Statuses</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="assigned-filter">Assigned To</label>
                  <input
                    id="assigned-filter"
                    type="text"
                    value={filters.assigned_to || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        assigned_to: e.target.value || undefined,
                      })
                    }
                    className="filter-input"
                    placeholder="User ID or name"
                    aria-label="Filter by assigned user"
                  />
                </div>
              </div>
            </div>

            {/* Task List */}
            <div className="task-list">
              {isLoading && (
                <div className="loading-state" role="status" aria-live="polite">
                  Loading tasks...
                </div>
              )}

              {error && (
                <div className="error-state" role="alert">
                  <div className="error-icon" aria-hidden="true">⚠️</div>
                  <div className="error-content">
                    <p className="error-message">{error}</p>
                    <Button variant="secondary" onClick={handleRetry}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && !error && tasks.length === 0 && (
                <div className="empty-state">
                  <p>No tasks found</p>
                  <Button variant="primary" onClick={handleCreateClick}>
                    Create First Task
                  </Button>
                </div>
              )}

              {!isLoading && !error && tasks.length > 0 && (
                <>
                  <div className="task-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Duration</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Priority</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => (
                          <tr key={task.id}>
                            <td>
                              <button
                                className="task-title-button"
                                onClick={() => handleTaskClick(task)}
                                aria-label={`View details for ${task.title}`}
                              >
                                {task.title}
                              </button>
                            </td>
                            <td>
                              <span
                                className="status-badge"
                                style={{
                                  backgroundColor: getStatusColor(task.status),
                                }}
                              >
                                {getStatusLabel(task.status)}
                              </span>
                            </td>
                            <td>{task.estimated_hours}h</td>
                            <td>
                              {task.start_date
                                ? new Date(task.start_date).toLocaleDateString()
                                : '-'}
                            </td>
                            <td>
                              {task.end_date
                                ? new Date(task.end_date).toLocaleDateString()
                                : '-'}
                            </td>
                            <td>{task.priority || '-'}</td>
                            <td>
                              <div className="action-buttons-cell">
                                <button
                                  className="action-button"
                                  onClick={() => handleEditClick(task)}
                                  aria-label={`Edit ${task.title}`}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-button delete"
                                  onClick={() => handleDeleteClick(task)}
                                  aria-label={`Delete ${task.title}`}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination" role="navigation" aria-label="Pagination">
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(filters.page! - 1)}
                        disabled={filters.page === 1}
                        aria-label="Previous page"
                      >
                        Previous
                      </Button>
                      <span className="pagination-info" aria-current="page">
                        Page {filters.page} of {totalPages} ({totalTasks} total)
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(filters.page! + 1)}
                        disabled={filters.page === totalPages}
                        aria-label="Next page"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {viewMode === 'detail' && selectedTaskId && (
          <div className="detail-container">
            <h2 className="detail-title">Task Details</h2>
            <div className="coming-soon-message">
              <p>Task detail view coming soon...</p>
              <p className="hint">
                This will display task details, dependencies, resource assignments,
                version history, and digital signatures.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'create' && (
          <div className="form-container">
            <h2 className="form-title">Create New Task</h2>
            <div className="coming-soon-message">
              <p>Task creation form coming soon...</p>
              <p className="hint">
                This will include fields for title, description, estimated hours,
                dependencies, resource requirements, and priority.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'edit' && selectedTaskId && (
          <div className="form-container">
            <h2 className="form-title">Edit Task</h2>
            <div className="coming-soon-message">
              <p>Task edit form coming soon...</p>
              <p className="hint">
                This will allow updating task information, adjusting schedules,
                and managing dependencies.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'gantt' && (
          <div className="gantt-container">
            <h2 className="gantt-title">Gantt Chart</h2>
            <div className="coming-soon-message">
              <p>Gantt chart visualization coming soon...</p>
              <p className="hint">
                This will display an interactive Gantt chart showing task timelines,
                dependencies, and critical path analysis.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'calculate' && scheduleResult && (
          <div className="result-container">
            <h2 className="result-title">Schedule Calculation Result</h2>
            {scheduleResult.status === 'success' && (
              <div className="success-result">
                <div className="result-header">
                  <span className="success-icon">✅</span>
                  <h3>Schedule calculated successfully!</h3>
                </div>
                <div className="result-stats">
                  <div className="result-stat">
                    <span className="stat-label">Project Duration:</span>
                    <span className="stat-value">
                      {scheduleResult.project_duration_hours} hours
                    </span>
                  </div>
                  <div className="result-stat">
                    <span className="stat-label">Tasks Scheduled:</span>
                    <span className="stat-value">
                      {scheduleResult.schedule?.length || 0}
                    </span>
                  </div>
                </div>
                {scheduleResult.schedule && scheduleResult.schedule.length > 0 && (
                  <div className="scheduled-tasks">
                    <h4>Scheduled Tasks:</h4>
                    <ul>
                      {scheduleResult.schedule.map((task) => (
                        <li key={task.task_id}>
                          <strong>{task.task_title}</strong>
                          <br />
                          <span className="task-dates">
                            {new Date(task.start_date).toLocaleDateString()} -{' '}
                            {new Date(task.end_date).toLocaleDateString()}
                          </span>
                          <span className="task-duration">
                            ({task.duration_hours}h)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {scheduleResult.status === 'infeasible' && (
              <div className="error-result">
                <div className="result-header">
                  <span className="error-icon">❌</span>
                  <h3>Schedule calculation failed</h3>
                </div>
                <p>
                  The schedule could not be calculated due to conflicting constraints.
                </p>
                {scheduleResult.conflicts && scheduleResult.conflicts.length > 0 && (
                  <div className="conflicts">
                    <h4>Conflicts:</h4>
                    <ul>
                      {scheduleResult.conflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <style>{`
        .schedule-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.5rem;
          background-color: #f9fafb;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .page-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .statistics-dashboard {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dashboard-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .stat-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .page-content {
          flex: 1;
          overflow: auto;
        }

        .schedule-list-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filters-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filters-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-select,
        .filter-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .task-list {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .task-table {
          overflow-x: auto;
        }

        .task-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .task-table th {
          text-align: left;
          padding: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }

        .task-table td {
          padding: 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
        }

        .task-table tbody tr:hover {
          background: #f9fafb;
        }

        .task-title-button {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          padding: 0;
        }

        .task-title-button:hover {
          text-decoration: underline;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .action-buttons-cell {
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
          transition: opacity 0.2s;
        }

        .action-button:hover {
          opacity: 1;
        }

        .action-button.delete:hover {
          filter: brightness(1.2);
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .loading-state,
        .error-state,
        .empty-state {
          padding: 3rem 2rem;
          text-align: center;
        }

        .error-state p,
        .empty-state p {
          margin: 0 0 1rem 0;
          color: #6b7280;
        }

        .detail-container,
        .form-container,
        .gantt-container,
        .result-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .detail-title,
        .form-title,
        .gantt-title,
        .result-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .coming-soon-message {
          padding: 3rem 2rem;
          text-align: center;
          background: #f9fafb;
          border-radius: 6px;
          border: 2px dashed #d1d5db;
        }

        .coming-soon-message p {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #374151;
        }

        .coming-soon-message .hint {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        .success-result,
        .error-result {
          padding: 1.5rem;
          border-radius: 6px;
        }

        .success-result {
          background: #f0fdf4;
          border: 1px solid #86efac;
        }

        .error-result {
          background: #fef2f2;
          border: 1px solid #fca5a5;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .success-icon,
        .error-icon {
          font-size: 1.5rem;
        }

        .result-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .result-stats {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .result-stat {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: white;
          border-radius: 4px;
        }

        .result-stat .stat-label {
          font-weight: 500;
          color: #6b7280;
        }

        .result-stat .stat-value {
          font-weight: 600;
          color: #111827;
        }

        .scheduled-tasks h4,
        .conflicts h4 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .scheduled-tasks ul,
        .conflicts ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .scheduled-tasks li {
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: white;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .task-dates {
          font-size: 0.875rem;
          color: #6b7280;
          margin-right: 0.5rem;
        }

        .task-duration {
          font-size: 0.875rem;
          color: #3b82f6;
          font-weight: 500;
        }

        .conflicts li {
          padding: 0.5rem;
          margin-bottom: 0.25rem;
          color: #dc2626;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .schedule-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
          }

          .header-actions,
          .action-buttons {
            flex-direction: column;
            width: 100%;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .task-table {
            font-size: 0.75rem;
          }

          .task-table th,
          .task-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default SchedulePage;

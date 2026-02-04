/**
 * ScheduleConflictDisplay component
 * Detects and visualizes conflicts in the schedule
 * Implements Requirement 7 (Offline Project Scheduling)
 * 
 * Features:
 * - Detects overlapping tasks for the same resource
 * - Identifies resource over-allocation
 * - Shows dependency violations (circular dependencies, impossible constraints)
 * - Displays conflicts in a clear, actionable format
 * - Provides suggestions for conflict resolution
 * - Responsive and accessible design
 * - Integrates with schedule service
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { ScheduledTask, Resource } from '../../services/scheduleService';

export interface TaskDependency {
  from_task_id: string;
  to_task_id: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
}

export interface ScheduleConflictDisplayProps {
  /** List of scheduled tasks */
  tasks: ScheduledTask[];
  /** List of available resources */
  resources: Resource[];
  /** Task dependencies */
  dependencies?: TaskDependency[];
  /** Callback when a conflict is clicked */
  onConflictClick?: (conflict: ScheduleConflict) => void;
  /** Show only critical conflicts */
  showCriticalOnly?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface ScheduleConflict {
  id: string;
  type: 'resource_overlap' | 'resource_overallocation' | 'dependency_violation' | 'circular_dependency';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedTasks: string[];
  affectedResources?: string[];
  suggestion?: string;
}

export function ScheduleConflictDisplay({
  tasks,
  resources,
  dependencies = [],
  onConflictClick,
  showCriticalOnly = false,
  className = '',
}: ScheduleConflictDisplayProps): React.ReactElement {
  const [selectedConflictType, setSelectedConflictType] = useState<string>('all');
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());

  // Get task title by ID
  const getTaskTitle = useCallback(
    (taskId: string): string => {
      const task = tasks.find(t => t.task_id === taskId);
      return task?.task_title || taskId;
    },
    [tasks]
  );

  // Get resource name by ID
  const getResourceName = useCallback(
    (resourceId: string): string => {
      const resource = resources.find(r => r.id === resourceId);
      return resource?.name || resourceId;
    },
    [resources]
  );

  // Detect resource overlap conflicts
  const detectResourceOverlaps = useCallback((): ScheduleConflict[] => {
    const conflicts: ScheduleConflict[] = [];
    const resourceTaskMap = new Map<string, ScheduledTask[]>();

    // Group tasks by resource
    tasks.forEach(task => {
      if (task.assigned_resources) {
        task.assigned_resources.forEach(resourceId => {
          if (!resourceTaskMap.has(resourceId)) {
            resourceTaskMap.set(resourceId, []);
          }
          resourceTaskMap.get(resourceId)!.push(task);
        });
      }
    });

    // Check for overlaps within each resource
    resourceTaskMap.forEach((resourceTasks, resourceId) => {
      const sortedTasks = [...resourceTasks].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      for (let i = 0; i < sortedTasks.length - 1; i++) {
        for (let j = i + 1; j < sortedTasks.length; j++) {
          const task1 = sortedTasks[i];
          const task2 = sortedTasks[j];

          const start1 = new Date(task1.start_date).getTime();
          const end1 = new Date(task1.end_date).getTime();
          const start2 = new Date(task2.start_date).getTime();
          const end2 = new Date(task2.end_date).getTime();

          // Check for overlap
          if (start2 < end1 && start1 < end2) {
            conflicts.push({
              id: `overlap-${resourceId}-${task1.task_id}-${task2.task_id}`,
              type: 'resource_overlap',
              severity: 'critical',
              title: `Resource Overlap: ${getResourceName(resourceId)}`,
              description: `Tasks "${task1.task_title}" and "${task2.task_title}" are scheduled to use the same resource at overlapping times.`,
              affectedTasks: [task1.task_id, task2.task_id],
              affectedResources: [resourceId],
              suggestion: 'Adjust task schedules to avoid overlap or assign additional resources.',
            });
          }
        }
      }
    });

    return conflicts;
  }, [tasks, resources, getResourceName]);

  // Detect resource over-allocation conflicts
  const detectResourceOverallocation = useCallback((): ScheduleConflict[] => {
    const conflicts: ScheduleConflict[] = [];

    resources.forEach(resource => {
      const resourceTasks = tasks.filter(
        task =>
          task.assigned_resources &&
          task.assigned_resources.includes(resource.id)
      );

      const totalAllocated = resourceTasks.reduce(
        (sum, task) => sum + task.duration_hours,
        0
      );

      const utilizationPercentage = resource.capacity > 0
        ? (totalAllocated / resource.capacity) * 100
        : 0;

      if (utilizationPercentage > 100) {
        const severity: ScheduleConflict['severity'] =
          utilizationPercentage > 150 ? 'critical' : 'warning';

        conflicts.push({
          id: `overallocation-${resource.id}`,
          type: 'resource_overallocation',
          severity,
          title: `Resource Over-allocated: ${resource.name}`,
          description: `Resource "${resource.name}" is allocated ${utilizationPercentage.toFixed(0)}% of capacity (${totalAllocated}h / ${resource.capacity}h).`,
          affectedTasks: resourceTasks.map(t => t.task_id),
          affectedResources: [resource.id],
          suggestion: 'Reduce task assignments, extend timeline, or add more resources.',
        });
      }
    });

    return conflicts;
  }, [tasks, resources]);
  // Detect circular dependency conflicts
  const detectCircularDependencies = useCallback((): ScheduleConflict[] => {
    const conflicts: ScheduleConflict[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const hasCycle = (taskId: string, path: string[]): boolean => {
      if (recursionStack.has(taskId)) {
        // Found a cycle - extract the cycle from the path
        const cycleStart = path.indexOf(taskId);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle, taskId]);
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      // Get all tasks that depend on this task
      const dependentTasks = dependencies
        .filter(dep => dep.from_task_id === taskId)
        .map(dep => dep.to_task_id);

      for (const depTaskId of dependentTasks) {
        if (hasCycle(depTaskId, [...path])) {
          // Continue checking to find all cycles
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    // Check all tasks for cycles
    tasks.forEach(task => {
      if (!visited.has(task.task_id)) {
        hasCycle(task.task_id, []);
      }
    });

    // Create conflicts for each unique cycle
    const uniqueCycles = new Set(cycles.map(cycle => cycle.sort().join('-')));
    uniqueCycles.forEach((cycleKey, index) => {
      const cycle = cycleKey.split('-');
      conflicts.push({
        id: `circular-${index}`,
        type: 'circular_dependency',
        severity: 'critical',
        title: 'Circular Dependency Detected',
        description: `Tasks form a circular dependency: ${cycle.map(id => getTaskTitle(id)).join(' → ')} → ${getTaskTitle(cycle[0])}`,
        affectedTasks: cycle,
        suggestion: 'Remove or reorder dependencies to break the cycle.',
      });
    });

    return conflicts;
  }, [dependencies, tasks, getTaskTitle]);

  // Detect dependency violation conflicts
  const detectDependencyViolations = useCallback((): ScheduleConflict[] => {
    const conflicts: ScheduleConflict[] = [];

    dependencies.forEach(dep => {
      const fromTask = tasks.find(t => t.task_id === dep.from_task_id);
      const toTask = tasks.find(t => t.task_id === dep.to_task_id);

      if (!fromTask || !toTask) {
        return;
      }

      const fromStart = new Date(fromTask.start_date).getTime();
      const fromEnd = new Date(fromTask.end_date).getTime();
      const toStart = new Date(toTask.start_date).getTime();
      const toEnd = new Date(toTask.end_date).getTime();

      let isViolation = false;
      let violationDescription = '';

      switch (dep.type) {
        case 'finish-to-start':
          if (toStart < fromEnd) {
            isViolation = true;
            violationDescription = `Task "${toTask.task_title}" starts before "${fromTask.task_title}" finishes (Finish-to-Start dependency).`;
          }
          break;
        case 'start-to-start':
          if (toStart < fromStart) {
            isViolation = true;
            violationDescription = `Task "${toTask.task_title}" starts before "${fromTask.task_title}" starts (Start-to-Start dependency).`;
          }
          break;
        case 'finish-to-finish':
          if (toEnd < fromEnd) {
            isViolation = true;
            violationDescription = `Task "${toTask.task_title}" finishes before "${fromTask.task_title}" finishes (Finish-to-Finish dependency).`;
          }
          break;
        case 'start-to-finish':
          if (toEnd < fromStart) {
            isViolation = true;
            violationDescription = `Task "${toTask.task_title}" finishes before "${fromTask.task_title}" starts (Start-to-Finish dependency).`;
          }
          break;
      }

      if (isViolation) {
        conflicts.push({
          id: `dep-violation-${dep.from_task_id}-${dep.to_task_id}`,
          type: 'dependency_violation',
          severity: 'critical',
          title: 'Dependency Constraint Violated',
          description: violationDescription,
          affectedTasks: [dep.from_task_id, dep.to_task_id],
          suggestion: 'Adjust task schedules to respect the dependency constraint.',
        });
      }
    });

    return conflicts;
  }, [dependencies, tasks]);
  // Aggregate all conflicts
  const allConflicts = useMemo((): ScheduleConflict[] => {
    const conflicts = [
      ...detectResourceOverlaps(),
      ...detectResourceOverallocation(),
      ...detectCircularDependencies(),
      ...detectDependencyViolations(),
    ];

    // Filter by severity if needed
    if (showCriticalOnly) {
      return conflicts.filter(c => c.severity === 'critical');
    }

    return conflicts;
  }, [
    detectResourceOverlaps,
    detectResourceOverallocation,
    detectCircularDependencies,
    detectDependencyViolations,
    showCriticalOnly,
  ]);

  // Filter conflicts by type
  const filteredConflicts = useMemo(() => {
    if (selectedConflictType === 'all') {
      return allConflicts;
    }
    return allConflicts.filter(c => c.type === selectedConflictType);
  }, [allConflicts, selectedConflictType]);

  // Get conflict type counts
  const conflictCounts = useMemo(() => {
    const counts = {
      all: allConflicts.length,
      resource_overlap: 0,
      resource_overallocation: 0,
      dependency_violation: 0,
      circular_dependency: 0,
      critical: 0,
      warning: 0,
      info: 0,
    };

    allConflicts.forEach(conflict => {
      counts[conflict.type]++;
      counts[conflict.severity]++;
    });

    return counts;
  }, [allConflicts]);

  // Toggle conflict expansion
  const toggleConflictExpansion = useCallback((conflictId: string) => {
    setExpandedConflicts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conflictId)) {
        newSet.delete(conflictId);
      } else {
        newSet.add(conflictId);
      }
      return newSet;
    });
  }, []);

  // Handle conflict click
  const handleConflictClick = useCallback(
    (conflict: ScheduleConflict) => {
      if (onConflictClick) {
        onConflictClick(conflict);
      }
    },
    [onConflictClick]
  );

  // Get severity icon
  const getSeverityIcon = (severity: ScheduleConflict['severity']): string => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  // Get severity color (unused but kept for potential future use)
  // const getSeverityColor = (severity: ScheduleConflict['severity']): string => {
  //   switch (severity) {
  //     case 'critical':
  //       return '#dc2626';
  //     case 'warning':
  //       return '#f59e0b';
  //     case 'info':
  //       return '#3b82f6';
  //     default:
  //       return '#6b7280';
  //   }
  // };

  // Get conflict type label
  const getConflictTypeLabel = (type: ScheduleConflict['type']): string => {
    switch (type) {
      case 'resource_overlap':
        return 'Resource Overlap';
      case 'resource_overallocation':
        return 'Resource Over-allocation';
      case 'dependency_violation':
        return 'Dependency Violation';
      case 'circular_dependency':
        return 'Circular Dependency';
      default:
        return type;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={`schedule-conflict-display ${className}`}>
        <div className="empty-state">
          <p>No tasks to analyze</p>
          <p className="hint">Add tasks to your schedule to detect conflicts.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }
  return (
    <div className={`schedule-conflict-display ${className}`}>
      <div className="conflict-header">
        <h2 className="conflict-title">Schedule Conflicts</h2>
        <div className="conflict-summary">
          <div className="summary-item critical">
            <span className="summary-icon">🔴</span>
            <span className="summary-count">{conflictCounts.critical}</span>
            <span className="summary-label">Critical</span>
          </div>
          <div className="summary-item warning">
            <span className="summary-icon">⚠️</span>
            <span className="summary-count">{conflictCounts.warning}</span>
            <span className="summary-label">Warnings</span>
          </div>
          <div className="summary-item info">
            <span className="summary-icon">ℹ️</span>
            <span className="summary-count">{conflictCounts.info}</span>
            <span className="summary-label">Info</span>
          </div>
        </div>
      </div>

      {allConflicts.length === 0 ? (
        <div className="no-conflicts">
          <div className="success-icon">✅</div>
          <h3 className="success-title">No Conflicts Detected</h3>
          <p className="success-message">
            Your schedule is conflict-free. All tasks are properly scheduled with no
            overlaps, over-allocations, or dependency violations.
          </p>
        </div>
      ) : (
        <>
          <div className="conflict-filters">
            <label htmlFor="conflict-type-filter" className="filter-label">
              Filter by type:
            </label>
            <select
              id="conflict-type-filter"
              className="filter-select"
              value={selectedConflictType}
              onChange={e => setSelectedConflictType(e.target.value)}
              aria-label="Filter conflicts by type"
            >
              <option value="all">All Conflicts ({conflictCounts.all})</option>
              <option value="resource_overlap">
                Resource Overlap ({conflictCounts.resource_overlap})
              </option>
              <option value="resource_overallocation">
                Over-allocation ({conflictCounts.resource_overallocation})
              </option>
              <option value="dependency_violation">
                Dependency Violations ({conflictCounts.dependency_violation})
              </option>
              <option value="circular_dependency">
                Circular Dependencies ({conflictCounts.circular_dependency})
              </option>
            </select>
          </div>

          <div className="conflicts-list" role="list">
            {filteredConflicts.map(conflict => {
              const isExpanded = expandedConflicts.has(conflict.id);

              return (
                <div
                  key={conflict.id}
                  className={`conflict-item ${conflict.severity}`}
                  role="listitem"
                >
                  <div
                    className="conflict-header-row"
                    onClick={() => toggleConflictExpansion(conflict.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="conflict-icon-title">
                      <span className="severity-icon" aria-label={conflict.severity}>
                        {getSeverityIcon(conflict.severity)}
                      </span>
                      <div className="conflict-info">
                        <h3 className="conflict-item-title">{conflict.title}</h3>
                        <span className="conflict-type-badge">
                          {getConflictTypeLabel(conflict.type)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="expand-button"
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </div>

                  <p className="conflict-description">{conflict.description}</p>

                  {isExpanded && (
                    <div className="conflict-details">
                      <div className="detail-section">
                        <h4 className="detail-title">Affected Tasks:</h4>
                        <ul className="affected-list">
                          {conflict.affectedTasks.map(taskId => (
                            <li key={taskId} className="affected-item">
                              <span className="task-icon">📋</span>
                              <span className="task-name">{getTaskTitle(taskId)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {conflict.affectedResources && conflict.affectedResources.length > 0 && (
                        <div className="detail-section">
                          <h4 className="detail-title">Affected Resources:</h4>
                          <ul className="affected-list">
                            {conflict.affectedResources.map(resourceId => (
                              <li key={resourceId} className="affected-item">
                                <span className="resource-icon">👤</span>
                                <span className="resource-name">
                                  {getResourceName(resourceId)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {conflict.suggestion && (
                        <div className="detail-section suggestion">
                          <h4 className="detail-title">💡 Suggestion:</h4>
                          <p className="suggestion-text">{conflict.suggestion}</p>
                        </div>
                      )}

                      <div className="conflict-actions">
                        <button
                          className="action-button primary"
                          onClick={() => handleConflictClick(conflict)}
                          aria-label="View conflict details"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredConflicts.length === 0 && (
            <div className="no-filtered-conflicts">
              <p>No conflicts match the selected filter.</p>
            </div>
          )}
        </>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .schedule-conflict-display {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .conflict-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .conflict-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .conflict-summary {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .summary-item.critical {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  .summary-item.warning {
    background: #fffbeb;
    border-color: #fcd34d;
  }

  .summary-item.info {
    background: #eff6ff;
    border-color: #93c5fd;
  }

  .summary-icon {
    font-size: 1.25rem;
  }

  .summary-count {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
  }

  .summary-label {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .no-conflicts {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    background: #f0fdf4;
    border: 2px solid #86efac;
    border-radius: 8px;
  }

  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .success-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #166534;
  }

  .success-message {
    margin: 0;
    font-size: 1rem;
    color: #15803d;
    max-width: 600px;
  }

  .conflict-filters {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
  }

  .filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .filter-select {
    flex: 1;
    max-width: 400px;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-select:hover {
    border-color: #9ca3af;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .conflicts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .conflict-item {
    padding: 1.25rem;
    background: white;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    transition: all 0.2s ease;
  }

  .conflict-item.critical {
    border-color: #fca5a5;
    background: #fef2f2;
  }

  .conflict-item.warning {
    border-color: #fcd34d;
    background: #fffbeb;
  }

  .conflict-item.info {
    border-color: #93c5fd;
    background: #eff6ff;
  }

  .conflict-item:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .conflict-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .conflict-icon-title {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
  }

  .severity-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .conflict-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .conflict-item-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .conflict-type-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    color: #1e40af;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: fit-content;
  }

  .expand-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #6b7280;
    padding: 0.25rem;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .expand-button:hover {
    color: #111827;
    transform: scale(1.1);
  }

  .expand-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .conflict-description {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .conflict-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-section.suggestion {
    padding: 1rem;
    background: rgba(59, 130, 246, 0.05);
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
  }

  .detail-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .affected-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .affected-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #374151;
  }

  .task-icon,
  .resource-icon {
    font-size: 1rem;
  }

  .task-name,
  .resource-name {
    font-weight: 500;
  }

  .suggestion-text {
    margin: 0;
    font-size: 0.875rem;
    color: #1e40af;
    line-height: 1.5;
  }

  .conflict-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-button.primary {
    background: #3b82f6;
    color: white;
  }

  .action-button.primary:hover {
    background: #2563eb;
  }

  .action-button.primary:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  .action-button.primary:active {
    transform: scale(0.98);
  }

  .no-filtered-conflicts {
    padding: 2rem;
    text-align: center;
    background: #f9fafb;
    border-radius: 6px;
    border: 2px dashed #d1d5db;
  }

  .no-filtered-conflicts p {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
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

  .hint {
    font-size: 0.875rem;
    font-style: italic;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .schedule-conflict-display {
      padding: 1rem;
    }

    .conflict-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .conflict-summary {
      width: 100%;
      justify-content: space-between;
    }

    .summary-item {
      flex: 1;
      flex-direction: column;
      text-align: center;
      padding: 0.75rem 0.5rem;
    }

    .conflict-filters {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-select {
      width: 100%;
      max-width: none;
    }

    .conflict-icon-title {
      flex-direction: column;
    }

    .conflict-actions {
      flex-direction: column;
    }

    .action-button {
      width: 100%;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .conflict-item,
    .expand-button,
    .action-button,
    .filter-select {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .schedule-conflict-display {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .conflict-filters,
    .conflict-actions,
    .expand-button {
      display: none;
    }

    .conflict-details {
      display: flex !important;
    }

    .conflict-item {
      page-break-inside: avoid;
    }
  }
`;

export default ScheduleConflictDisplay;

/**
 * ResourceAllocation component
 * Displays resource allocation across tasks and projects
 * Implements Requirement 7 (Offline Project Scheduling)
 * 
 * Features:
 * - Visualizes resource utilization over time
 * - Shows resource capacity and allocation
 * - Highlights over-allocation and conflicts
 * - Supports filtering by resource type
 * - Interactive timeline view
 * - Responsive and accessible design
 * - Integrates with schedule service
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { ScheduledTask, Resource } from '../../services/scheduleService';

export interface ResourceAllocationProps {
  /** List of scheduled tasks with resource assignments */
  tasks: ScheduledTask[];
  /** List of available resources */
  resources: Resource[];
  /** Callback when a resource is clicked */
  onResourceClick?: (resourceId: string) => void;
  /** Callback when a task is clicked */
  onTaskClick?: (taskId: string) => void;
  /** Show over-allocation warnings */
  showWarnings?: boolean;
  /** Filter by resource type */
  resourceTypeFilter?: string;
  /** Height of the component */
  height?: number;
  /** Custom CSS class */
  className?: string;
}

interface ResourceUtilization {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  capacity: number;
  allocations: TaskAllocation[];
  totalAllocated: number;
  utilizationPercentage: number;
  isOverAllocated: boolean;
}

interface TaskAllocation {
  taskId: string;
  taskTitle: string;
  startDate: Date;
  endDate: Date;
  durationHours: number;
  color: string;
}

interface TimeRange {
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export function ResourceAllocation({
  tasks,
  resources,
  onResourceClick,
  onTaskClick,
  showWarnings = true,
  resourceTypeFilter,
  height = 600,
  className = '',
}: ResourceAllocationProps): React.ReactElement {
  const [hoveredResource, setHoveredResource] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string>(
    resourceTypeFilter || 'all'
  );

  // Configuration
  const config = {
    rowHeight: 60,
    leftMargin: 200,
    topMargin: 60,
    rightMargin: 40,
    bottomMargin: 40,
    minPixelsPerDay: 15,
    gridColor: '#e5e7eb',
    warningColor: '#ef4444',
    normalColor: '#3b82f6',
    overAllocatedColor: '#dc2626',
  };

  // Get unique resource types
  const resourceTypes = useMemo(() => {
    const types = new Set(resources.map(r => r.type));
    return ['all', ...Array.from(types)];
  }, [resources]);

  // Filter resources by type
  const filteredResources = useMemo(() => {
    if (selectedResourceType === 'all') {
      return resources;
    }
    return resources.filter(r => r.type === selectedResourceType);
  }, [resources, selectedResourceType]);

  // Calculate time range from tasks
  const timeRange = useMemo((): TimeRange => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalDays: 30,
      };
    }

    const dates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.end_date),
    ]);

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    const totalDays = Math.ceil(
      (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    return {
      startDate: minDate,
      endDate: maxDate,
      totalDays,
    };
  }, [tasks]);

  // Calculate resource utilization
  const resourceUtilization = useMemo((): ResourceUtilization[] => {
    const taskColors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#06b6d4', '#6366f1', '#f97316',
    ];

    return filteredResources.map(resource => {
      // Find all tasks assigned to this resource
      const resourceTasks = tasks.filter(
        task =>
          task.assigned_resources &&
          task.assigned_resources.includes(resource.id)
      );

      // Create allocations
      const allocations: TaskAllocation[] = resourceTasks.map((task, index) => ({
        taskId: task.task_id,
        taskTitle: task.task_title,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        durationHours: task.duration_hours,
        color: taskColors[index % taskColors.length],
      }));

      // Calculate total allocated hours
      const totalAllocated = allocations.reduce(
        (sum, alloc) => sum + alloc.durationHours,
        0
      );

      // Calculate utilization percentage
      const utilizationPercentage = resource.capacity > 0
        ? (totalAllocated / resource.capacity) * 100
        : 0;

      // Check for over-allocation
      const isOverAllocated = utilizationPercentage > 100;

      return {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        capacity: resource.capacity,
        allocations,
        totalAllocated,
        utilizationPercentage,
        isOverAllocated,
      };
    });
  }, [filteredResources, tasks]);

  // Calculate chart dimensions
  const dimensions = useMemo(() => {
    const chartWidth = timeRange.totalDays * config.minPixelsPerDay;
    const chartHeight = resourceUtilization.length * config.rowHeight;

    return {
      width: config.leftMargin + chartWidth + config.rightMargin,
      height: config.topMargin + chartHeight + config.bottomMargin,
      chartWidth,
      chartHeight,
    };
  }, [timeRange, resourceUtilization]);

  // Generate time grid
  const timeGrid = useMemo(() => {
    const lines: Array<{ x: number; label: string; isWeek: boolean }> = [];
    const currentDate = new Date(timeRange.startDate);

    while (currentDate <= timeRange.endDate) {
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - timeRange.startDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const x = config.leftMargin + daysSinceStart * config.minPixelsPerDay;

      const isWeek = currentDate.getDay() === 1; // Monday
      const label = isWeek
        ? currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';

      if (isWeek || currentDate.getTime() === timeRange.startDate.getTime()) {
        lines.push({ x, label, isWeek });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return lines;
  }, [timeRange]);

  // Calculate allocation bar position and width
  const calculateBarGeometry = useCallback(
    (allocation: TaskAllocation) => {
      const daysSinceStart = Math.floor(
        (allocation.startDate.getTime() - timeRange.startDate.getTime()) /
          (24 * 60 * 60 * 1000)
      );
      const durationDays = Math.ceil(
        (allocation.endDate.getTime() - allocation.startDate.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      const x = config.leftMargin + daysSinceStart * config.minPixelsPerDay;
      const width = Math.max(durationDays * config.minPixelsPerDay, 5);

      return { x, width };
    },
    [timeRange]
  );

  // Handle resource click
  const handleResourceClick = useCallback(
    (resourceId: string) => {
      if (onResourceClick) {
        onResourceClick(resourceId);
      }
    },
    [onResourceClick]
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

  // Render resource row
  const renderResourceRow = (utilization: ResourceUtilization, index: number) => {
    const y = config.topMargin + index * config.rowHeight;
    const isHovered = hoveredResource === utilization.resourceId;
    const barHeight = 36;
    const barY = y + (config.rowHeight - barHeight) / 2;

    return (
      <g
        key={utilization.resourceId}
        className="resource-row"
        onMouseEnter={() => setHoveredResource(utilization.resourceId)}
        onMouseLeave={() => setHoveredResource(null)}
      >
        {/* Row background */}
        <rect
          x="0"
          y={y}
          width={dimensions.width}
          height={config.rowHeight}
          fill={isHovered ? '#f9fafb' : 'white'}
          stroke="none"
        />

        {/* Resource label */}
        <g
          className="resource-label"
          onClick={() => handleResourceClick(utilization.resourceId)}
          style={{ cursor: 'pointer' }}
        >
          <rect
            x="0"
            y={y}
            width={config.leftMargin}
            height={config.rowHeight}
            fill={isHovered ? '#f3f4f6' : 'white'}
          />
          <text
            x="10"
            y={y + config.rowHeight / 2 - 8}
            fontSize="13"
            fontWeight="600"
            fill="#111827"
          >
            {utilization.resourceName}
          </text>
          <text
            x="10"
            y={y + config.rowHeight / 2 + 8}
            fontSize="11"
            fill="#6b7280"
          >
            {utilization.resourceType} • {utilization.utilizationPercentage.toFixed(0)}%
          </text>
          {utilization.isOverAllocated && showWarnings && (
            <text
              x="10"
              y={y + config.rowHeight / 2 + 22}
              fontSize="10"
              fontWeight="600"
              fill={config.warningColor}
            >
              ⚠️ Over-allocated
            </text>
          )}
        </g>

        {/* Capacity bar background */}
        <rect
          x={config.leftMargin}
          y={barY}
          width={dimensions.chartWidth}
          height={barHeight}
          fill="#f3f4f6"
          stroke="#e5e7eb"
          strokeWidth="1"
          rx="4"
        />

        {/* Allocation bars */}
        {utilization.allocations.map((allocation, allocIndex) => {
          const { x, width } = calculateBarGeometry(allocation);
          const isTaskHovered = hoveredTask === allocation.taskId;

          return (
            <g
              key={`${allocation.taskId}-${allocIndex}`}
              className="allocation-bar"
              onClick={() => handleTaskClick(allocation.taskId)}
              onMouseEnter={() => setHoveredTask(allocation.taskId)}
              onMouseLeave={() => setHoveredTask(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={barY + 2}
                width={width}
                height={barHeight - 4}
                fill={allocation.color}
                opacity={isTaskHovered ? 1 : 0.85}
                stroke={isTaskHovered ? '#1e293b' : 'none'}
                strokeWidth={isTaskHovered ? 2 : 0}
                rx="3"
              />
              {width > 40 && (
                <text
                  x={x + width / 2}
                  y={barY + barHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="500"
                  fill="white"
                  style={{ pointerEvents: 'none' }}
                >
                  {allocation.taskTitle.length > 15
                    ? allocation.taskTitle.substring(0, 15) + '...'
                    : allocation.taskTitle}
                </text>
              )}

              {/* Tooltip */}
              {isTaskHovered && (
                <g className="allocation-tooltip">
                  <rect
                    x={x}
                    y={barY - 70}
                    width="220"
                    height="60"
                    rx="4"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    filter="url(#shadow)"
                  />
                  <text
                    x={x + 8}
                    y={barY - 52}
                    fontSize="11"
                    fontWeight="600"
                    fill="#111827"
                  >
                    {allocation.taskTitle}
                  </text>
                  <text
                    x={x + 8}
                    y={barY - 38}
                    fontSize="10"
                    fill="#6b7280"
                  >
                    Start: {allocation.startDate.toLocaleDateString()}
                  </text>
                  <text
                    x={x + 8}
                    y={barY - 26}
                    fontSize="10"
                    fill="#6b7280"
                  >
                    End: {allocation.endDate.toLocaleDateString()}
                  </text>
                  <text
                    x={x + 8}
                    y={barY - 14}
                    fontSize="10"
                    fill="#6b7280"
                  >
                    Duration: {allocation.durationHours}h
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Utilization indicator */}
        {utilization.utilizationPercentage > 0 && (
          <text
            x={config.leftMargin + dimensions.chartWidth + 10}
            y={y + config.rowHeight / 2}
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill={
              utilization.isOverAllocated
                ? config.overAllocatedColor
                : config.normalColor
            }
          >
            {utilization.totalAllocated}h / {utilization.capacity}h
          </text>
        )}
      </g>
    );
  };

  if (resources.length === 0) {
    return (
      <div className={`resource-allocation ${className}`}>
        <div className="empty-state">
          <p>No resources available</p>
          <p className="hint">
            Add resources to your project to see their allocation.
          </p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (filteredResources.length === 0) {
    return (
      <div className={`resource-allocation ${className}`}>
        <div className="empty-state">
          <p>No resources match the selected filter</p>
          <p className="hint">
            Try selecting a different resource type.
          </p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`resource-allocation ${className}`}>
      <div className="allocation-header">
        <h2 className="allocation-title">Resource Allocation</h2>
        <div className="allocation-controls">
          <label htmlFor="resource-type-filter" className="filter-label">
            Resource Type:
          </label>
          <select
            id="resource-type-filter"
            className="filter-select"
            value={selectedResourceType}
            onChange={e => setSelectedResourceType(e.target.value)}
            aria-label="Filter by resource type"
          >
            {resourceTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showWarnings && resourceUtilization.some(r => r.isOverAllocated) && (
        <div className="warning-banner" role="alert">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            {resourceUtilization.filter(r => r.isOverAllocated).length} resource(s)
            are over-allocated. Review assignments to resolve conflicts.
          </span>
        </div>
      )}

      <div className="allocation-stats">
        <div className="stat-item">
          <span className="stat-label">Total Resources:</span>
          <span className="stat-value">{filteredResources.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Tasks:</span>
          <span className="stat-value">{tasks.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Utilization:</span>
          <span className="stat-value">
            {resourceUtilization.length > 0
              ? (
                  resourceUtilization.reduce(
                    (sum, r) => sum + r.utilizationPercentage,
                    0
                  ) / resourceUtilization.length
                ).toFixed(0)
              : 0}
            %
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Over-allocated:</span>
          <span className="stat-value warning">
            {resourceUtilization.filter(r => r.isOverAllocated).length}
          </span>
        </div>
      </div>

      <div className="allocation-container" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="allocation-svg"
          role="img"
          aria-label={`Resource allocation chart showing ${filteredResources.length} resources`}
        >
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Background */}
          <rect
            x="0"
            y="0"
            width={dimensions.width}
            height={dimensions.height}
            fill="white"
          />

          {/* Time grid */}
          <g className="time-grid">
            {timeGrid.map((line, index) => (
              <g key={index}>
                <line
                  x1={line.x}
                  y1={config.topMargin}
                  x2={line.x}
                  y2={config.topMargin + dimensions.chartHeight}
                  stroke={config.gridColor}
                  strokeWidth={line.isWeek ? 2 : 1}
                  opacity={line.isWeek ? 0.5 : 0.3}
                />
                {line.label && (
                  <text
                    x={line.x}
                    y={config.topMargin - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#6b7280"
                  >
                    {line.label}
                  </text>
                )}
              </g>
            ))}
          </g>

          {/* Resource rows */}
          {resourceUtilization.map((utilization, index) =>
            renderResourceRow(utilization, index)
          )}

          {/* Row separators */}
          {resourceUtilization.map((_, index) => (
            <line
              key={`sep-${index}`}
              x1="0"
              y1={config.topMargin + (index + 1) * config.rowHeight}
              x2={dimensions.width}
              y2={config.topMargin + (index + 1) * config.rowHeight}
              stroke={config.gridColor}
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      <div className="allocation-footer">
        <p className="hint">
          Click resources for details • Hover over tasks to see allocation info
        </p>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .resource-allocation {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .allocation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .allocation-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .allocation-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .filter-select {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-select:hover {
    background: #e5e7eb;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .warning-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
  }

  .warning-icon {
    font-size: 1.25rem;
  }

  .warning-text {
    font-size: 0.875rem;
    color: #dc2626;
    font-weight: 500;
  }

  .allocation-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 1.5rem;
    color: #111827;
    font-weight: 700;
  }

  .stat-value.warning {
    color: #dc2626;
  }

  .allocation-container {
    overflow: auto;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
  }

  .allocation-svg {
    display: block;
    min-width: 100%;
    min-height: 100%;
  }

  .resource-row {
    transition: all 0.2s ease;
  }

  .resource-label {
    transition: all 0.2s ease;
  }

  .allocation-bar {
    transition: all 0.2s ease;
  }

  .allocation-bar:hover rect {
    filter: brightness(1.1);
  }

  .allocation-footer {
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .hint {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
    text-align: center;
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
    .resource-allocation {
      padding: 1rem;
    }

    .allocation-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .allocation-controls {
      width: 100%;
    }

    .filter-select {
      flex: 1;
    }

    .allocation-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .resource-row,
    .resource-label,
    .allocation-bar,
    .filter-select {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .resource-allocation {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .allocation-controls,
    .allocation-footer {
      display: none;
    }

    .allocation-container {
      overflow: visible;
      border: none;
    }
  }
`;

export default ResourceAllocation;

/**
 * GanttChart component
 * Visualizes project schedules with task timelines, dependencies, and critical path
 * Implements Requirement 7 (Offline Project Scheduling)
 * 
 * Features:
 * - Displays tasks as horizontal bars on a timeline
 * - Shows task dependencies with connecting lines
 * - Highlights critical path tasks
 * - Supports zooming and panning
 * - Shows task details on hover
 * - Responsive and accessible design
 * - Integrates with schedule service
 */

import React, { useState, useMemo, useRef } from 'react';
import type { ScheduledTask } from '../../services/scheduleService';

export interface GanttChartProps {
  tasks: ScheduledTask[];
  dependencies?: TaskDependency[];
  criticalPath?: string[];
  onTaskClick?: (taskId: string) => void;
  onTaskHover?: (taskId: string | null) => void;
  showCriticalPath?: boolean;
  showDependencies?: boolean;
  showToday?: boolean;
  height?: number;
  className?: string;
}

export interface TaskDependency {
  from_task_id: string;
  to_task_id: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
}

interface LayoutTask extends ScheduledTask {
  x: number;
  y: number;
  width: number;
  row: number;
  isCritical: boolean;
}

interface TimeScale {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  pixelsPerDay: number;
}

export function GanttChart({
  tasks,
  dependencies = [],
  criticalPath = [],
  onTaskClick,
  onTaskHover,
  showCriticalPath = true,
  showDependencies = true,
  showToday = true,
  height = 600,
  className = '',
}: GanttChartProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  // Layout configuration
  const config = {
    rowHeight: 50,
    taskHeight: 36,
    leftMargin: 200,
    topMargin: 60,
    rightMargin: 40,
    bottomMargin: 40,
    minPixelsPerDay: 20,
    maxPixelsPerDay: 100,
    gridColor: '#e5e7eb',
    todayLineColor: '#ef4444',
  };

  // Calculate time scale
  const timeScale = useMemo((): TimeScale => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalDays: 30,
        pixelsPerDay: config.minPixelsPerDay,
      };
    }

    const dates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.end_date),
    ]);

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding
    const paddingDays = 2;
    minDate.setDate(minDate.getDate() - paddingDays);
    maxDate.setDate(maxDate.getDate() + paddingDays);

    const totalDays = Math.ceil(
      (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    const pixelsPerDay = Math.max(
      config.minPixelsPerDay,
      Math.min(config.maxPixelsPerDay, 800 / totalDays)
    ) * zoom;

    return {
      startDate: minDate,
      endDate: maxDate,
      totalDays,
      pixelsPerDay,
    };
  }, [tasks, zoom]);

  // Calculate task layout
  const layoutTasks = useMemo((): LayoutTask[] => {
    if (tasks.length === 0) return [];

    // Sort tasks by start date
    const sortedTasks = [...tasks].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    // Assign rows to avoid overlaps
    const rows: Array<{ endDate: Date }> = [];
    
    return sortedTasks.map(task => {
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      const isCritical = criticalPath.includes(task.task_id);

      // Find available row
      let row = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].endDate <= startDate) {
          row = i;
          rows[i].endDate = endDate;
          break;
        }
      }
      
      // If no available row found, create new one
      if (row === 0 && rows.length > 0 && rows[0].endDate > startDate) {
        row = rows.length;
        rows.push({ endDate });
      } else if (rows.length === 0) {
        rows.push({ endDate });
      }

      // Calculate position and size
      const daysSinceStart = Math.floor(
        (startDate.getTime() - timeScale.startDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      const x = config.leftMargin + daysSinceStart * timeScale.pixelsPerDay;
      const y = config.topMargin + row * config.rowHeight + (config.rowHeight - config.taskHeight) / 2;
      const width = Math.max(durationDays * timeScale.pixelsPerDay, 10);

      return {
        ...task,
        x,
        y,
        width,
        row,
        isCritical,
      };
    });
  }, [tasks, timeScale, criticalPath]);

  // Calculate SVG dimensions
  const dimensions = useMemo(() => {
    const chartWidth = timeScale.totalDays * timeScale.pixelsPerDay;
    const maxRow = Math.max(...layoutTasks.map(t => t.row), 0);
    const chartHeight = (maxRow + 1) * config.rowHeight;

    return {
      width: config.leftMargin + chartWidth + config.rightMargin,
      height: config.topMargin + chartHeight + config.bottomMargin,
      chartWidth,
      chartHeight,
    };
  }, [layoutTasks, timeScale]);

  // Generate time grid
  const timeGrid = useMemo(() => {
    const lines: Array<{ x: number; label: string; isMonth: boolean }> = [];
    const currentDate = new Date(timeScale.startDate);

    while (currentDate <= timeScale.endDate) {
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - timeScale.startDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const x = config.leftMargin + daysSinceStart * timeScale.pixelsPerDay;

      const isMonth = currentDate.getDate() === 1;
      const label = isMonth
        ? currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : currentDate.getDate().toString();

      lines.push({ x, label, isMonth });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return lines;
  }, [timeScale]);

  // Calculate today line position
  const todayX = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (today < timeScale.startDate || today > timeScale.endDate) {
      return null;
    }

    const daysSinceStart = Math.floor(
      (today.getTime() - timeScale.startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    return config.leftMargin + daysSinceStart * timeScale.pixelsPerDay;
  }, [timeScale]);

  // Calculate dependency paths
  const dependencyPaths = useMemo(() => {
    if (!showDependencies) return [];

    const taskMap = new Map(layoutTasks.map(t => [t.task_id, t]));

    return dependencies
      .map(dep => {
        const fromTask = taskMap.get(dep.from_task_id);
        const toTask = taskMap.get(dep.to_task_id);

        if (!fromTask || !toTask) return null;

        // Calculate connection points based on dependency type
        let x1: number, y1: number, x2: number, y2: number;

        switch (dep.type) {
          case 'finish-to-start':
            x1 = fromTask.x + fromTask.width;
            y1 = fromTask.y + config.taskHeight / 2;
            x2 = toTask.x;
            y2 = toTask.y + config.taskHeight / 2;
            break;
          case 'start-to-start':
            x1 = fromTask.x;
            y1 = fromTask.y + config.taskHeight / 2;
            x2 = toTask.x;
            y2 = toTask.y + config.taskHeight / 2;
            break;
          case 'finish-to-finish':
            x1 = fromTask.x + fromTask.width;
            y1 = fromTask.y + config.taskHeight / 2;
            x2 = toTask.x + toTask.width;
            y2 = toTask.y + config.taskHeight / 2;
            break;
          case 'start-to-finish':
            x1 = fromTask.x;
            y1 = fromTask.y + config.taskHeight / 2;
            x2 = toTask.x + toTask.width;
            y2 = toTask.y + config.taskHeight / 2;
            break;
          default:
            return null;
        }

        // Create path with right-angle bends
        const path = `M ${x1} ${y1} L ${(x1 + x2) / 2} ${y1} L ${(x1 + x2) / 2} ${y2} L ${x2} ${y2}`;

        return {
          path,
          fromTask: dep.from_task_id,
          toTask: dep.to_task_id,
          type: dep.type,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [dependencies, layoutTasks, showDependencies]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom(prevZoom => {
      const newZoom = Math.max(0.5, Math.min(3, prevZoom + delta));
      return newZoom;
    });
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0 && e.shiftKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
    }
  };

  // Handle task interactions
  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    }
  };

  const handleTaskMouseEnter = (taskId: string) => {
    setHoveredTask(taskId);
    if (onTaskHover) {
      onTaskHover(taskId);
    }
  };

  const handleTaskMouseLeave = () => {
    setHoveredTask(null);
    if (onTaskHover) {
      onTaskHover(null);
    }
  };

  // Render task bar
  const renderTask = (task: LayoutTask) => {
    const isHovered = hoveredTask === task.task_id;
    const color = task.isCritical && showCriticalPath ? '#dc2626' : '#3b82f6';
    const opacity = isHovered ? 1 : 0.9;

    return (
      <g
        key={task.task_id}
        className="gantt-task"
        onClick={() => handleTaskClick(task.task_id)}
        onMouseEnter={() => handleTaskMouseEnter(task.task_id)}
        onMouseLeave={handleTaskMouseLeave}
        style={{ cursor: 'pointer' }}
      >
        {/* Task bar */}
        <rect
          x={task.x}
          y={task.y}
          width={task.width}
          height={config.taskHeight}
          rx="4"
          fill={color}
          opacity={opacity}
          stroke={isHovered ? '#1e293b' : 'none'}
          strokeWidth={isHovered ? 2 : 0}
        />

        {/* Task label */}
        <text
          x={task.x + 8}
          y={task.y + config.taskHeight / 2}
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="500"
          fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {task.task_title}
        </text>

        {/* Critical path indicator */}
        {task.isCritical && showCriticalPath && (
          <path
            d={`M ${task.x + task.width - 20} ${task.y + 8} l 8 8 l -8 8 z`}
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth="1"
          />
        )}

        {/* Hover tooltip */}
        {isHovered && (
          <g className="task-tooltip">
            <rect
              x={task.x}
              y={task.y - 60}
              width="200"
              height="50"
              rx="4"
              fill="white"
              stroke="#e5e7eb"
              strokeWidth="1"
              filter="url(#shadow)"
            />
            <text
              x={task.x + 8}
              y={task.y - 42}
              fontSize="11"
              fontWeight="600"
              fill="#111827"
            >
              {task.task_title}
            </text>
            <text
              x={task.x + 8}
              y={task.y - 28}
              fontSize="10"
              fill="#6b7280"
            >
              Start: {new Date(task.start_date).toLocaleDateString()}
            </text>
            <text
              x={task.x + 8}
              y={task.y - 16}
              fontSize="10"
              fill="#6b7280"
            >
              End: {new Date(task.end_date).toLocaleDateString()}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render dependency line
  const renderDependency = (dep: typeof dependencyPaths[0], index: number) => {
    const isHighlighted =
      hoveredTask === dep.fromTask || hoveredTask === dep.toTask;

    return (
      <g key={`dep-${index}`} className="gantt-dependency">
        <path
          d={dep.path}
          fill="none"
          stroke={isHighlighted ? '#1e293b' : '#94a3b8'}
          strokeWidth={isHighlighted ? 2 : 1}
          markerEnd="url(#arrowhead)"
          opacity={isHighlighted ? 1 : 0.6}
        />
      </g>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className={`gantt-chart ${className}`}>
        <div className="empty-state">
          <p>No tasks to display</p>
          <p className="hint">
            Add tasks to your project to see them visualized in the Gantt chart.
          </p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`gantt-chart ${className}`}>
      <div className="gantt-header">
        <h2 className="gantt-title">Project Schedule</h2>
        <div className="gantt-controls">
          <button
            className="zoom-button"
            onClick={() => handleZoom(0.2)}
            aria-label="Zoom in"
            title="Zoom in (or Ctrl+Scroll)"
          >
            +
          </button>
          <button
            className="zoom-button"
            onClick={() => handleZoom(-0.2)}
            aria-label="Zoom out"
            title="Zoom out (or Ctrl+Scroll)"
          >
            −
          </button>
          <button
            className="reset-button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            aria-label="Reset view"
            title="Reset zoom and pan"
          >
            Reset
          </button>
          <span className="zoom-level">Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>
      </div>

      {showCriticalPath && criticalPath.length > 0 && (
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color normal" />
            <span className="legend-label">Normal Task</span>
          </div>
          <div className="legend-item">
            <div className="legend-color critical" />
            <span className="legend-label">Critical Path</span>
          </div>
          {showDependencies && (
            <div className="legend-item">
              <div className="legend-symbol">→</div>
              <span className="legend-label">Dependency</span>
            </div>
          )}
        </div>
      )}

      <div
        className="gantt-container"
        style={{ height: `${height}px` }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${-pan.x} ${-pan.y} ${dimensions.width} ${dimensions.height}`}
          className="gantt-svg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          role="img"
          aria-label={`Gantt chart showing ${tasks.length} tasks`}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
            </marker>
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
                  strokeWidth={line.isMonth ? 2 : 1}
                  opacity={line.isMonth ? 0.5 : 0.3}
                />
                <text
                  x={line.x}
                  y={config.topMargin - 10}
                  textAnchor="middle"
                  fontSize={line.isMonth ? 12 : 10}
                  fontWeight={line.isMonth ? 600 : 400}
                  fill="#6b7280"
                >
                  {line.label}
                </text>
              </g>
            ))}
          </g>

          {/* Today line */}
          {showToday && todayX !== null && (
            <g className="today-line">
              <line
                x1={todayX}
                y1={config.topMargin}
                x2={todayX}
                y2={config.topMargin + dimensions.chartHeight}
                stroke={config.todayLineColor}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <text
                x={todayX + 5}
                y={config.topMargin - 10}
                fontSize="11"
                fontWeight="600"
                fill={config.todayLineColor}
              >
                Today
              </text>
            </g>
          )}

          {/* Dependencies */}
          {dependencyPaths.map((dep, index) => renderDependency(dep, index))}

          {/* Tasks */}
          {layoutTasks.map(task => renderTask(task))}
        </svg>
      </div>

      <div className="gantt-footer">
        <p className="hint">
          Hold Shift and drag to pan • Ctrl+Scroll to zoom • Click tasks for details
        </p>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .gantt-chart {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .gantt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .gantt-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .gantt-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .zoom-button,
  .reset-button {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .zoom-button:hover,
  .reset-button:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  .zoom-button:active,
  .reset-button:active {
    transform: scale(0.95);
  }

  .zoom-level {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
    min-width: 80px;
    text-align: center;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 24px;
    height: 24px;
    border-radius: 4px;
  }

  .legend-color.normal {
    background: #3b82f6;
  }

  .legend-color.critical {
    background: #dc2626;
  }

  .legend-symbol {
    font-size: 1.25rem;
    font-weight: 600;
    color: #94a3b8;
  }

  .legend-label {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }

  .gantt-container {
    overflow: auto;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
  }

  .gantt-svg {
    display: block;
    min-width: 100%;
    min-height: 100%;
  }

  .gantt-svg.dragging {
    cursor: grabbing;
  }

  .gantt-task {
    transition: all 0.2s ease;
  }

  .gantt-task:hover rect {
    filter: brightness(1.1);
  }

  .gantt-dependency {
    transition: all 0.2s ease;
  }

  .gantt-footer {
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
    .gantt-chart {
      padding: 1rem;
    }

    .gantt-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .gantt-controls {
      width: 100%;
      justify-content: space-between;
    }

    .legend {
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .gantt-task,
    .gantt-dependency,
    .zoom-button,
    .reset-button {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .gantt-chart {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .gantt-controls,
    .gantt-footer {
      display: none;
    }

    .gantt-container {
      overflow: visible;
      border: none;
    }
  }
`;

export default GanttChart;

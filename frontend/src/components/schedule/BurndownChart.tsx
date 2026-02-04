/**
 * BurndownChart component
 * Visualizes sprint progress with ideal vs actual burndown
 * Implements Requirement 11 (Project Management Workflows)
 * 
 * Features:
 * - Display ideal burndown line
 * - Display actual burndown line
 * - Show remaining work over time
 * - Highlight current day
 * - Show sprint completion status
 * - Support for story points or hours
 * - Responsive SVG chart
 */

import React, { useMemo } from 'react';

export interface BurndownDataPoint {
  /** Date of the data point */
  date: Date;
  /** Remaining work (hours or story points) */
  remaining: number;
  /** Completed work (optional) */
  completed?: number;
}

export interface BurndownChartProps {
  /** Sprint start date */
  sprintStartDate: Date;
  /** Sprint end date */
  sprintEndDate: Date;
  /** Initial sprint capacity */
  initialCapacity: number;
  /** Actual burndown data points */
  actualData: BurndownDataPoint[];
  /** Sprint name */
  sprintName?: string;
  /** Whether to use story points (true) or hours (false) */
  useStoryPoints?: boolean;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Custom CSS class */
  className?: string;
}

export function BurndownChart({
  sprintStartDate,
  sprintEndDate,
  initialCapacity,
  actualData,
  sprintName = 'Sprint Burndown',
  useStoryPoints = false,
  width = 800,
  height = 400,
  showGrid = true,
  showLegend = true,
  className = '',
}: BurndownChartProps): React.ReactElement {
  const unit = useStoryPoints ? 'points' : 'hours';

  // Calculate chart dimensions
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate sprint duration in days
  const sprintDays = useMemo(() => {
    const diffTime = sprintEndDate.getTime() - sprintStartDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [sprintStartDate, sprintEndDate]);

  // Generate ideal burndown line
  const idealData = useMemo(() => {
    const points: BurndownDataPoint[] = [];
    const dailyBurn = initialCapacity / (sprintDays - 1);

    for (let day = 0; day < sprintDays; day++) {
      const date = new Date(sprintStartDate);
      date.setDate(date.getDate() + day);
      const remaining = Math.max(0, initialCapacity - (dailyBurn * day));
      points.push({ date, remaining });
    }

    return points;
  }, [sprintStartDate, sprintDays, initialCapacity]);

  // Get current date for highlighting
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate scales
  const xScale = (date: Date): number => {
    const dayIndex = Math.floor(
      (date.getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return (dayIndex / (sprintDays - 1)) * chartWidth;
  };

  const yScale = (value: number): number => {
    return chartHeight - (value / initialCapacity) * chartHeight;
  };

  // Generate path for line chart
  const generatePath = (data: BurndownDataPoint[]): string => {
    if (data.length === 0) return '';

    const points = data.map(
      (point) => `${xScale(point.date)},${yScale(point.remaining)}`
    );

    return `M ${points.join(' L ')}`;
  };

  const idealPath = generatePath(idealData);
  const actualPath = generatePath(actualData);

  // Calculate Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push((initialCapacity / tickCount) * i);
    }
    return ticks.reverse();
  }, [initialCapacity]);

  // Calculate X-axis ticks (show every few days)
  const xTicks = useMemo(() => {
    const ticks: Date[] = [];
    const tickInterval = Math.max(1, Math.floor(sprintDays / 7));

    for (let day = 0; day < sprintDays; day += tickInterval) {
      const date = new Date(sprintStartDate);
      date.setDate(date.getDate() + day);
      ticks.push(date);
    }

    // Always include the last day
    if (ticks[ticks.length - 1].getTime() !== sprintEndDate.getTime()) {
      ticks.push(sprintEndDate);
    }

    return ticks;
  }, [sprintStartDate, sprintEndDate, sprintDays]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate sprint status
  const sprintStatus = useMemo(() => {
    if (actualData.length === 0) {
      return { label: 'No Data', color: '#9ca3af' };
    }

    const latestActual = actualData[actualData.length - 1];
    const latestDate = latestActual.date;
    
    // Find corresponding ideal value
    const dayIndex = Math.floor(
      (latestDate.getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const idealRemaining = Math.max(
      0,
      initialCapacity - (initialCapacity / (sprintDays - 1)) * dayIndex
    );

    const difference = latestActual.remaining - idealRemaining;
    const percentDiff = (difference / initialCapacity) * 100;

    if (latestActual.remaining === 0) {
      return { label: 'Sprint Completed', color: '#10b981' };
    } else if (percentDiff <= -10) {
      return { label: 'Ahead of Schedule', color: '#10b981' };
    } else if (percentDiff <= 10) {
      return { label: 'On Track', color: '#3b82f6' };
    } else if (percentDiff <= 25) {
      return { label: 'Slightly Behind', color: '#f59e0b' };
    } else {
      return { label: 'Behind Schedule', color: '#dc2626' };
    }
  }, [actualData, sprintStartDate, sprintDays, initialCapacity]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (actualData.length === 0) return 0;
    const latestActual = actualData[actualData.length - 1];
    return Math.round(((initialCapacity - latestActual.remaining) / initialCapacity) * 100);
  }, [actualData, initialCapacity]);

  return (
    <div className={`burndown-chart ${className}`}>
      {/* Chart header */}
      <div className="chart-header">
        <div className="header-info">
          <h3 className="chart-title">{sprintName}</h3>
          <p className="chart-subtitle">
            {formatDate(sprintStartDate)} - {formatDate(sprintEndDate)}
          </p>
        </div>

        <div className="chart-stats">
          <div className="stat">
            <span className="stat-label">Status</span>
            <span className="stat-value" style={{ color: sprintStatus.color }}>
              {sprintStatus.label}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Completion</span>
            <span className="stat-value">{completionPercentage}%</span>
          </div>
          {actualData.length > 0 && (
            <div className="stat">
              <span className="stat-label">Remaining</span>
              <span className="stat-value">
                {actualData[actualData.length - 1].remaining} {unit}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width={width}
        height={height}
        className="chart-svg"
        role="img"
        aria-label={`Burndown chart for ${sprintName}`}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {showGrid && (
            <g className="grid">
              {/* Horizontal grid lines */}
              {yTicks.map((tick, i) => (
                <line
                  key={`h-grid-${i}`}
                  x1={0}
                  y1={yScale(tick)}
                  x2={chartWidth}
                  y2={yScale(tick)}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}
              {/* Vertical grid lines */}
              {xTicks.map((tick, i) => (
                <line
                  key={`v-grid-${i}`}
                  x1={xScale(tick)}
                  y1={0}
                  x2={xScale(tick)}
                  y2={chartHeight}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}
            </g>
          )}

          {/* Axes */}
          <g className="axes">
            {/* X-axis */}
            <line
              x1={0}
              y1={chartHeight}
              x2={chartWidth}
              y2={chartHeight}
              stroke="#374151"
              strokeWidth={2}
            />
            {/* Y-axis */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={chartHeight}
              stroke="#374151"
              strokeWidth={2}
            />
          </g>

          {/* Y-axis labels */}
          <g className="y-axis-labels">
            {yTicks.map((tick, i) => (
              <text
                key={`y-label-${i}`}
                x={-10}
                y={yScale(tick)}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={12}
                fill="#6b7280"
              >
                {Math.round(tick)}
              </text>
            ))}
          </g>

          {/* X-axis labels */}
          <g className="x-axis-labels">
            {xTicks.map((tick, i) => (
              <text
                key={`x-label-${i}`}
                x={xScale(tick)}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize={12}
                fill="#6b7280"
              >
                {formatDate(tick)}
              </text>
            ))}
          </g>

          {/* Axis titles */}
          <text
            x={chartWidth / 2}
            y={chartHeight + 45}
            textAnchor="middle"
            fontSize={14}
            fontWeight="600"
            fill="#374151"
          >
            Sprint Days
          </text>
          <text
            x={-chartHeight / 2}
            y={-45}
            textAnchor="middle"
            fontSize={14}
            fontWeight="600"
            fill="#374151"
            transform={`rotate(-90, -${chartHeight / 2}, -45)`}
          >
            Remaining Work ({unit})
          </text>

          {/* Current day indicator */}
          {today >= sprintStartDate && today <= sprintEndDate && (
            <line
              x1={xScale(today)}
              y1={0}
              x2={xScale(today)}
              y2={chartHeight}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}

          {/* Ideal burndown line */}
          <path
            d={idealPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="8 4"
          />

          {/* Actual burndown line */}
          {actualData.length > 0 && (
            <path
              d={actualPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3}
            />
          )}

          {/* Data points */}
          {actualData.map((point, i) => (
            <circle
              key={`point-${i}`}
              cx={xScale(point.date)}
              cy={yScale(point.remaining)}
              r={4}
              fill="#3b82f6"
              stroke="white"
              strokeWidth={2}
            >
              <title>
                {formatDate(point.date)}: {point.remaining} {unit} remaining
              </title>
            </circle>
          ))}
        </g>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-line ideal" />
            <span>Ideal Burndown</span>
          </div>
          <div className="legend-item">
            <div className="legend-line actual" />
            <span>Actual Burndown</span>
          </div>
          {today >= sprintStartDate && today <= sprintEndDate && (
            <div className="legend-item">
              <div className="legend-line today" />
              <span>Today</span>
            </div>
          )}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .burndown-chart {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .header-info {
    flex: 1;
    min-width: 200px;
  }

  .chart-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .chart-subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .chart-stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .chart-svg {
    display: block;
    margin: 0 auto;
  }

  .chart-legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .legend-line {
    width: 32px;
    height: 3px;
    border-radius: 2px;
  }

  .legend-line.ideal {
    background: #94a3b8;
    background-image: repeating-linear-gradient(
      90deg,
      #94a3b8,
      #94a3b8 8px,
      transparent 8px,
      transparent 12px
    );
  }

  .legend-line.actual {
    background: #3b82f6;
  }

  .legend-line.today {
    background: #f59e0b;
    background-image: repeating-linear-gradient(
      90deg,
      #f59e0b,
      #f59e0b 6px,
      transparent 6px,
      transparent 9px
    );
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .burndown-chart {
      padding: 1rem;
    }

    .chart-header {
      flex-direction: column;
    }

    .chart-stats {
      width: 100%;
      justify-content: space-between;
    }

    .chart-svg {
      width: 100%;
      height: auto;
    }
  }

  /* Print Styles */
  @media print {
    .burndown-chart {
      box-shadow: none;
      border: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
  }
`;

export default BurndownChart;

/**
 * VelocityChart component
 * Visualizes team velocity across sprints with trend analysis
 * Implements Requirement 11 (Project Management Workflows)
 * 
 * Features:
 * - Display velocity as bar chart
 * - Show average velocity line
 * - Show trend line
 * - Highlight current sprint
 * - Display planned vs actual velocity
 * - Support for story points or hours
 * - Responsive SVG chart
 */

import React, { useMemo } from 'react';

export interface VelocityDataPoint {
  /** Sprint name or number */
  sprintName: string;
  /** Planned velocity */
  planned: number;
  /** Actual completed velocity */
  actual: number;
  /** Whether this is the current sprint */
  isCurrent?: boolean;
}

export interface VelocityChartProps {
  /** Velocity data for each sprint */
  data: VelocityDataPoint[];
  /** Chart title */
  title?: string;
  /** Whether to use story points (true) or hours (false) */
  useStoryPoints?: boolean;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Show average line */
  showAverage?: boolean;
  /** Show trend line */
  showTrend?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Custom CSS class */
  className?: string;
}

export function VelocityChart({
  data,
  title = 'Team Velocity',
  useStoryPoints = false,
  width = 800,
  height = 400,
  showAverage = true,
  showTrend = true,
  showLegend = true,
  className = '',
}: VelocityChartProps): React.ReactElement {
  const unit = useStoryPoints ? 'points' : 'hours';

  // Calculate chart dimensions
  const margin = { top: 40, right: 40, bottom: 80, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate statistics
  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        avgVelocity: 0,
        maxVelocity: 0,
        minVelocity: 0,
        totalCompleted: 0,
        completionRate: 0,
      };
    }

    const actualValues = data.map(d => d.actual);
    const plannedValues = data.map(d => d.planned);
    
    const avgVelocity = actualValues.reduce((sum, val) => sum + val, 0) / actualValues.length;
    const maxVelocity = Math.max(...actualValues, ...plannedValues);
    const minVelocity = Math.min(...actualValues);
    const totalCompleted = actualValues.reduce((sum, val) => sum + val, 0);
    const totalPlanned = plannedValues.reduce((sum, val) => sum + val, 0);
    const completionRate = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

    return {
      avgVelocity: Math.round(avgVelocity * 10) / 10,
      maxVelocity,
      minVelocity,
      totalCompleted,
      completionRate: Math.round(completionRate),
    };
  }, [data]);

  // Calculate trend line using linear regression
  const trendLine = useMemo(() => {
    if (!showTrend || data.length < 2) return null;

    const actualValues = data.map(d => d.actual);
    const n = actualValues.length;
    const xValues = Array.from({ length: n }, (_, i) => i);

    // Calculate means
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = actualValues.reduce((sum, y) => sum + y, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (actualValues[i] - yMean);
      denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    return { slope, intercept };
  }, [data, showTrend]);

  // Calculate scales
  const barWidth = chartWidth / (data.length * 2.5);
  const barSpacing = barWidth * 0.5;
  const groupWidth = barWidth * 2 + barSpacing;

  const xScale = (index: number): number => {
    return index * groupWidth + barSpacing;
  };

  const yScale = (value: number): number => {
    const maxY = Math.max(stats.maxVelocity, stats.avgVelocity) * 1.1;
    return chartHeight - (value / maxY) * chartHeight;
  };

  // Calculate Y-axis ticks
  const yTicks = useMemo(() => {
    const maxY = Math.max(stats.maxVelocity, stats.avgVelocity) * 1.1;
    const tickCount = 5;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push((maxY / tickCount) * i);
    }
    return ticks.reverse();
  }, [stats]);

  // Get trend description
  const getTrendDescription = (): { label: string; color: string } => {
    if (!trendLine) return { label: 'No Trend', color: '#9ca3af' };

    if (trendLine.slope > 1) {
      return { label: 'Improving', color: '#10b981' };
    } else if (trendLine.slope > 0) {
      return { label: 'Slightly Improving', color: '#3b82f6' };
    } else if (trendLine.slope > -1) {
      return { label: 'Slightly Declining', color: '#f59e0b' };
    } else {
      return { label: 'Declining', color: '#dc2626' };
    }
  };

  const trendDescription = getTrendDescription();

  if (data.length === 0) {
    return (
      <div className={`velocity-chart ${className}`}>
        <div className="chart-header">
          <h3 className="chart-title">{title}</h3>
        </div>
        <div className="empty-state">
          <p>No velocity data available</p>
          <p className="hint">Complete sprints to see velocity trends</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`velocity-chart ${className}`}>
      {/* Chart header */}
      <div className="chart-header">
        <div className="header-info">
          <h3 className="chart-title">{title}</h3>
          <p className="chart-subtitle">{data.length} sprints</p>
        </div>

        <div className="chart-stats">
          <div className="stat">
            <span className="stat-label">Avg Velocity</span>
            <span className="stat-value">
              {stats.avgVelocity} {unit}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Completed</span>
            <span className="stat-value">
              {stats.totalCompleted} {unit}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Completion Rate</span>
            <span className="stat-value">{stats.completionRate}%</span>
          </div>
          {showTrend && (
            <div className="stat">
              <span className="stat-label">Trend</span>
              <span className="stat-value" style={{ color: trendDescription.color }}>
                {trendDescription.label}
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
        aria-label={`Velocity chart showing ${data.length} sprints`}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          <g className="grid">
            {yTicks.map((tick, i) => (
              <line
                key={`grid-${i}`}
                x1={0}
                y1={yScale(tick)}
                x2={chartWidth}
                y2={yScale(tick)}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}
          </g>

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

          {/* Axis titles */}
          <text
            x={chartWidth / 2}
            y={chartHeight + 65}
            textAnchor="middle"
            fontSize={14}
            fontWeight="600"
            fill="#374151"
          >
            Sprint
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
            Velocity ({unit})
          </text>

          {/* Average line */}
          {showAverage && (
            <line
              x1={0}
              y1={yScale(stats.avgVelocity)}
              x2={chartWidth}
              y2={yScale(stats.avgVelocity)}
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="8 4"
            />
          )}

          {/* Trend line */}
          {showTrend && trendLine && (
            <line
              x1={xScale(0) + barWidth}
              y1={yScale(trendLine.intercept)}
              x2={xScale(data.length - 1) + barWidth}
              y2={yScale(trendLine.intercept + trendLine.slope * (data.length - 1))}
              stroke={trendDescription.color}
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}

          {/* Bars */}
          {data.map((point, i) => {
            const x = xScale(i);
            const plannedHeight = chartHeight - yScale(point.planned);
            const actualHeight = chartHeight - yScale(point.actual);

            return (
              <g key={`bar-group-${i}`}>
                {/* Planned bar */}
                <rect
                  x={x}
                  y={yScale(point.planned)}
                  width={barWidth}
                  height={plannedHeight}
                  fill={point.isCurrent ? '#fbbf24' : '#d1d5db'}
                  opacity={0.6}
                >
                  <title>
                    {point.sprintName} - Planned: {point.planned} {unit}
                  </title>
                </rect>

                {/* Actual bar */}
                <rect
                  x={x + barWidth + barSpacing / 2}
                  y={yScale(point.actual)}
                  width={barWidth}
                  height={actualHeight}
                  fill={point.isCurrent ? '#f59e0b' : '#3b82f6'}
                >
                  <title>
                    {point.sprintName} - Actual: {point.actual} {unit}
                  </title>
                </rect>

                {/* Current sprint indicator */}
                {point.isCurrent && (
                  <text
                    x={x + barWidth + barSpacing / 4}
                    y={yScale(Math.max(point.planned, point.actual)) - 10}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="600"
                    fill="#f59e0b"
                  >
                    Current
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={x + barWidth + barSpacing / 4}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#6b7280"
                  transform={`rotate(-45, ${x + barWidth + barSpacing / 4}, ${chartHeight + 20})`}
                >
                  {point.sprintName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-box planned" />
            <span>Planned</span>
          </div>
          <div className="legend-item">
            <div className="legend-box actual" />
            <span>Actual</span>
          </div>
          {showAverage && (
            <div className="legend-item">
              <div className="legend-line average" />
              <span>Average</span>
            </div>
          )}
          {showTrend && (
            <div className="legend-item">
              <div className="legend-line trend" style={{ backgroundColor: trendDescription.color }} />
              <span>Trend</span>
            </div>
          )}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .velocity-chart {
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

  .legend-box {
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }

  .legend-box.planned {
    background: #d1d5db;
    opacity: 0.6;
  }

  .legend-box.actual {
    background: #3b82f6;
  }

  .legend-line {
    width: 32px;
    height: 3px;
    border-radius: 2px;
  }

  .legend-line.average {
    background: #6366f1;
    background-image: repeating-linear-gradient(
      90deg,
      #6366f1,
      #6366f1 8px,
      transparent 8px,
      transparent 12px
    );
  }

  .legend-line.trend {
    background-image: repeating-linear-gradient(
      90deg,
      currentColor,
      currentColor 6px,
      transparent 6px,
      transparent 9px
    );
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
    .velocity-chart {
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
    .velocity-chart {
      box-shadow: none;
      border: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
  }
`;

export default VelocityChart;

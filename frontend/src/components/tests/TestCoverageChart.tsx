/**
 * TestCoverageChart component
 * Visualizes test coverage metrics in multiple formats
 * Implements Requirement 9 (Verification and Validation Management)
 * 
 * Features:
 * - Multiple visualization types (bar chart, pie chart, progress bars)
 * - Shows percentage of requirements with tests
 * - Shows percentage of requirements with passing tests
 * - Responsive design
 * - Accessible with ARIA labels
 * - Color-coded status indicators
 */

import React, { useMemo } from 'react';

export interface TestCoverageData {
  total_requirements: number;
  requirements_with_tests: number;
  requirements_with_passing_tests: number;
  coverage_percentage: number;
  pass_rate_percentage?: number;
}

export interface TestCoverageChartProps {
  data: TestCoverageData;
  visualizationType?: 'bar' | 'pie' | 'progress' | 'all';
  showLegend?: boolean;
  showStatistics?: boolean;
  height?: number;
  className?: string;
}

export function TestCoverageChart({
  data,
  visualizationType = 'all',
  showLegend = true,
  showStatistics = true,
  height = 300,
  className = '',
}: TestCoverageChartProps): React.ReactElement {
  // Calculate derived metrics
  const metrics = useMemo(() => {
    const {
      total_requirements,
      requirements_with_tests,
      requirements_with_passing_tests,
    } = data;

    const withoutTests = total_requirements - requirements_with_tests;
    const withFailingTests = requirements_with_tests - requirements_with_passing_tests;
    
    const coveragePercentage = total_requirements > 0
      ? (requirements_with_tests / total_requirements) * 100
      : 0;
    
    const passRatePercentage = requirements_with_tests > 0
      ? (requirements_with_passing_tests / requirements_with_tests) * 100
      : 0;

    return {
      withoutTests,
      withFailingTests,
      coveragePercentage,
      passRatePercentage,
    };
  }, [data]);

  // Colors for visualization
  const colors = {
    passing: '#10b981', // green
    failing: '#ef4444', // red
    noTests: '#9ca3af', // gray
    coverage: '#667eea', // purple
  };

  // Render bar chart
  const renderBarChart = () => {
    const { total_requirements, requirements_with_passing_tests } = data;
    const { withFailingTests, withoutTests } = metrics;

    if (total_requirements === 0) {
      return (
        <div className="empty-chart">
          <p>No requirements data available</p>
        </div>
      );
    }

    const passingWidth = (requirements_with_passing_tests / total_requirements) * 100;
    const failingWidth = (withFailingTests / total_requirements) * 100;
    const noTestsWidth = (withoutTests / total_requirements) * 100;

    return (
      <div className="bar-chart" style={{ height: `${height}px` }}>
        <div className="chart-title">Requirements Test Coverage</div>
        <div className="bar-container">
          <div className="bar-stack">
            {requirements_with_passing_tests > 0 && (
              <div
                className="bar-segment passing"
                style={{
                  width: `${passingWidth}%`,
                  backgroundColor: colors.passing,
                }}
                role="img"
                aria-label={`${requirements_with_passing_tests} requirements with passing tests (${passingWidth.toFixed(1)}%)`}
              >
                <span className="bar-label">
                  {requirements_with_passing_tests} Passing
                </span>
              </div>
            )}
            {withFailingTests > 0 && (
              <div
                className="bar-segment failing"
                style={{
                  width: `${failingWidth}%`,
                  backgroundColor: colors.failing,
                }}
                role="img"
                aria-label={`${withFailingTests} requirements with failing tests (${failingWidth.toFixed(1)}%)`}
              >
                <span className="bar-label">
                  {withFailingTests} Failing
                </span>
              </div>
            )}
            {withoutTests > 0 && (
              <div
                className="bar-segment no-tests"
                style={{
                  width: `${noTestsWidth}%`,
                  backgroundColor: colors.noTests,
                }}
                role="img"
                aria-label={`${withoutTests} requirements without tests (${noTestsWidth.toFixed(1)}%)`}
              >
                <span className="bar-label">
                  {withoutTests} No Tests
                </span>
              </div>
            )}
          </div>
          <div className="bar-axis">
            <span>0</span>
            <span>{total_requirements}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render pie chart
  const renderPieChart = () => {
    const { total_requirements, requirements_with_passing_tests } = data;
    const { withFailingTests, withoutTests } = metrics;

    if (total_requirements === 0) {
      return (
        <div className="empty-chart">
          <p>No requirements data available</p>
        </div>
      );
    }

    // Calculate angles for pie slices
    const passingAngle = (requirements_with_passing_tests / total_requirements) * 360;
    const failingAngle = (withFailingTests / total_requirements) * 360;
    // const noTestsAngle = (withoutTests / total_requirements) * 360;

    // Create conic gradient for pie chart
    const gradientStops = [];
    let currentAngle = 0;

    if (requirements_with_passing_tests > 0) {
      gradientStops.push(`${colors.passing} 0deg ${passingAngle}deg`);
      currentAngle = passingAngle;
    }

    if (withFailingTests > 0) {
      gradientStops.push(`${colors.failing} ${currentAngle}deg ${currentAngle + failingAngle}deg`);
      currentAngle += failingAngle;
    }

    if (withoutTests > 0) {
      gradientStops.push(`${colors.noTests} ${currentAngle}deg 360deg`);
    }

    const gradient = `conic-gradient(${gradientStops.join(', ')})`;

    return (
      <div className="pie-chart" style={{ height: `${height}px` }}>
        <div className="chart-title">Test Coverage Distribution</div>
        <div className="pie-container">
          <div
            className="pie-circle"
            style={{ background: gradient }}
            role="img"
            aria-label={`Pie chart showing ${requirements_with_passing_tests} passing, ${withFailingTests} failing, ${withoutTests} without tests`}
          >
            <div className="pie-center">
              <div className="pie-percentage">{metrics.coveragePercentage.toFixed(1)}%</div>
              <div className="pie-label">Coverage</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render progress bars
  const renderProgressBars = () => {
    const { coveragePercentage, passRatePercentage } = metrics;

    return (
      <div className="progress-bars" style={{ minHeight: `${height}px` }}>
        <div className="chart-title">Coverage Metrics</div>
        
        <div className="progress-item">
          <div className="progress-header">
            <span className="progress-label">Requirements with Tests</span>
            <span className="progress-value">{coveragePercentage.toFixed(1)}%</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${coveragePercentage}%`,
                backgroundColor: colors.coverage,
              }}
              role="progressbar"
              aria-valuenow={coveragePercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${coveragePercentage.toFixed(1)}% of requirements have tests`}
            />
          </div>
          <div className="progress-details">
            {data.requirements_with_tests} of {data.total_requirements} requirements
          </div>
        </div>

        <div className="progress-item">
          <div className="progress-header">
            <span className="progress-label">Requirements with Passing Tests</span>
            <span className="progress-value">{passRatePercentage.toFixed(1)}%</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${passRatePercentage}%`,
                backgroundColor: colors.passing,
              }}
              role="progressbar"
              aria-valuenow={passRatePercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${passRatePercentage.toFixed(1)}% of tested requirements have passing tests`}
            />
          </div>
          <div className="progress-details">
            {data.requirements_with_passing_tests} of {data.requirements_with_tests} tested requirements
          </div>
        </div>
      </div>
    );
  };

  // Render legend
  const renderLegend = () => {
    if (!showLegend) return null;

    return (
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: colors.passing }} />
          <span className="legend-label">Passing Tests</span>
          <span className="legend-count">({data.requirements_with_passing_tests})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: colors.failing }} />
          <span className="legend-label">Failing Tests</span>
          <span className="legend-count">({metrics.withFailingTests})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: colors.noTests }} />
          <span className="legend-label">No Tests</span>
          <span className="legend-count">({metrics.withoutTests})</span>
        </div>
      </div>
    );
  };

  // Render statistics
  const renderStatistics = () => {
    if (!showStatistics) return null;

    return (
      <div className="chart-statistics">
        <div className="stat-item">
          <div className="stat-label">Total Requirements</div>
          <div className="stat-value">{data.total_requirements}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Test Coverage</div>
          <div className="stat-value">{metrics.coveragePercentage.toFixed(1)}%</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Pass Rate</div>
          <div className="stat-value">{metrics.passRatePercentage.toFixed(1)}%</div>
        </div>
      </div>
    );
  };

  return (
    <div className={`test-coverage-chart ${className}`}>
      {visualizationType === 'all' ? (
        <div className="chart-grid">
          <div className="chart-section">
            {renderBarChart()}
          </div>
          <div className="chart-section">
            {renderPieChart()}
          </div>
          <div className="chart-section full-width">
            {renderProgressBars()}
          </div>
        </div>
      ) : (
        <div className="chart-single">
          {visualizationType === 'bar' && renderBarChart()}
          {visualizationType === 'pie' && renderPieChart()}
          {visualizationType === 'progress' && renderProgressBars()}
        </div>
      )}

      {renderLegend()}
      {renderStatistics()}

      <style>{`
        .test-coverage-chart {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Grid Layout */
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .chart-section {
          display: flex;
          flex-direction: column;
        }

        .chart-section.full-width {
          grid-column: 1 / -1;
        }

        .chart-single {
          width: 100%;
        }

        /* Common Chart Styles */
        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 1rem;
          text-align: center;
        }

        .empty-chart {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 2rem;
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 6px;
        }

        .empty-chart p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        /* Bar Chart */
        .bar-chart {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .bar-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .bar-stack {
          display: flex;
          width: 100%;
          height: 60px;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .bar-segment {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
        }

        .bar-segment:hover {
          filter: brightness(1.1);
          transform: scaleY(1.05);
        }

        .bar-label {
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 0.5rem;
        }

        .bar-axis {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #6b7280;
          padding: 0 0.25rem;
        }

        /* Pie Chart */
        .pie-chart {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .pie-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          flex: 1;
        }

        .pie-circle {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .pie-circle:hover {
          transform: scale(1.05);
        }

        .pie-center {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .pie-percentage {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
        }

        .pie-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        /* Progress Bars */
        .progress-bars {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .progress-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .progress-value {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
        }

        .progress-bar-container {
          width: 100%;
          height: 32px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-bar-fill {
          height: 100%;
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 0.5rem;
          border-radius: 6px;
        }

        .progress-details {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: right;
        }

        /* Legend */
        .chart-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
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
          width: 16px;
          height: 16px;
          border-radius: 3px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .legend-label {
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }

        .legend-count {
          font-size: 0.75rem;
          color: #6b7280;
        }

        /* Statistics */
        .chart-statistics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 6px;
          color: white;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.75rem;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.9;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .chart-grid {
            grid-template-columns: 1fr;
          }

          .chart-section.full-width {
            grid-column: 1;
          }

          .pie-circle {
            width: 160px;
            height: 160px;
          }

          .pie-center {
            width: 100px;
            height: 100px;
          }

          .pie-percentage {
            font-size: 1.5rem;
          }

          .bar-label {
            font-size: 0.625rem;
          }

          .chart-legend {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .bar-segment,
          .pie-circle,
          .progress-bar-fill {
            transition: none;
          }
        }

        /* Print Styles */
        @media print {
          .test-coverage-chart {
            box-shadow: none;
            border: 1px solid #e5e7eb;
          }

          .bar-segment:hover,
          .pie-circle:hover {
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}

export default TestCoverageChart;

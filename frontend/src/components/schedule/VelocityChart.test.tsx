/**
 * VelocityChart component tests
 * Tests velocity visualization and trend analysis
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VelocityChart, type VelocityDataPoint } from './VelocityChart';

// Mock data
const mockData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 40, actual: 38 },
  { sprintName: 'Sprint 2', planned: 40, actual: 42 },
  { sprintName: 'Sprint 3', planned: 40, actual: 39 },
  { sprintName: 'Sprint 4', planned: 40, actual: 41 },
  { sprintName: 'Sprint 5', planned: 40, actual: 40 },
];

const mockImprovingData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 30, actual: 25 },
  { sprintName: 'Sprint 2', planned: 35, actual: 32 },
  { sprintName: 'Sprint 3', planned: 40, actual: 38 },
  { sprintName: 'Sprint 4', planned: 45, actual: 44 },
  { sprintName: 'Sprint 5', planned: 50, actual: 48 },
];

const mockDecliningData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 50, actual: 48 },
  { sprintName: 'Sprint 2', planned: 50, actual: 45 },
  { sprintName: 'Sprint 3', planned: 45, actual: 40 },
  { sprintName: 'Sprint 4', planned: 40, actual: 35 },
  { sprintName: 'Sprint 5', planned: 35, actual: 30 },
];

describe('VelocityChart', () => {
  it('renders velocity chart', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getByText('Team Velocity')).toBeInTheDocument();
  });

  it('displays custom title', () => {
    render(<VelocityChart data={mockData} title="Custom Velocity" />);

    expect(screen.getByText('Custom Velocity')).toBeInTheDocument();
  });

  it('displays sprint count', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getByText('5 sprints')).toBeInTheDocument();
  });

  it('calculates and displays average velocity', () => {
    render(<VelocityChart data={mockData} />);

    // Average of [38, 42, 39, 41, 40] = 40
    expect(screen.getByText('Avg Velocity')).toBeInTheDocument();
    expect(screen.getByText('40 hours')).toBeInTheDocument();
  });

  it('calculates and displays total completed', () => {
    render(<VelocityChart data={mockData} />);

    // Sum of [38, 42, 39, 41, 40] = 200
    expect(screen.getByText('Total Completed')).toBeInTheDocument();
    expect(screen.getByText('200 hours')).toBeInTheDocument();
  });

  it('calculates and displays completion rate', () => {
    render(<VelocityChart data={mockData} />);

    // 200 actual / 200 planned = 100%
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows improving trend for increasing velocity', () => {
    render(<VelocityChart data={mockImprovingData} />);

    expect(screen.getByText('Improving')).toBeInTheDocument();
  });

  it('shows declining trend for decreasing velocity', () => {
    render(<VelocityChart data={mockDecliningData} />);

    expect(screen.getByText('Declining')).toBeInTheDocument();
  });

  it('uses story points when specified', () => {
    render(<VelocityChart data={mockData} useStoryPoints={true} />);

    expect(screen.getByText('40 points')).toBeInTheDocument();
    expect(screen.getByText('200 points')).toBeInTheDocument();
    expect(screen.getByText(/Velocity \(points\)/)).toBeInTheDocument();
  });

  it('uses hours by default', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getByText('40 hours')).toBeInTheDocument();
    expect(screen.getByText('200 hours')).toBeInTheDocument();
    expect(screen.getByText(/Velocity \(hours\)/)).toBeInTheDocument();
  });

  it('renders SVG chart', () => {
    const { container } = render(<VelocityChart data={mockData} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');
  });

  it('displays legend by default', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getAllByText('Trend').length).toBeGreaterThan(0);
  });

  it('hides legend when showLegend is false', () => {
    render(<VelocityChart data={mockData} showLegend={false} />);

    expect(screen.queryByText('Planned')).not.toBeInTheDocument();
    expect(screen.queryByText('Actual')).not.toBeInTheDocument();
  });

  it('hides average line when showAverage is false', () => {
    render(<VelocityChart data={mockData} showAverage={false} />);

    expect(screen.queryByText('Average')).not.toBeInTheDocument();
  });

  it('hides trend line when showTrend is false', () => {
    render(<VelocityChart data={mockData} showTrend={false} />);

    expect(screen.queryByText('Trend')).not.toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    const { container } = render(
      <VelocityChart data={mockData} width={1000} height={500} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '1000');
    expect(svg).toHaveAttribute('height', '500');
  });

  it('applies custom className', () => {
    const { container } = render(
      <VelocityChart data={mockData} className="custom-class" />
    );

    const chart = container.querySelector('.velocity-chart');
    expect(chart).toHaveClass('custom-class');
  });

  it('handles empty data gracefully', () => {
    render(<VelocityChart data={[]} />);

    expect(screen.getByText('No velocity data available')).toBeInTheDocument();
    expect(screen.getByText('Complete sprints to see velocity trends')).toBeInTheDocument();
  });

  it('renders bars for each sprint', () => {
    const { container } = render(<VelocityChart data={mockData} />);

    // Each sprint has 2 bars (planned and actual)
    const bars = container.querySelectorAll('rect');
    expect(bars.length).toBeGreaterThanOrEqual(mockData.length * 2);
  });

  it('includes tooltips on bars', () => {
    const { container } = render(<VelocityChart data={mockData} />);

    const titles = container.querySelectorAll('title');
    expect(titles.length).toBeGreaterThan(0);
    expect(titles[0].textContent).toContain('Sprint 1');
    expect(titles[0].textContent).toContain('Planned');
  });

  it('highlights current sprint', () => {
    const dataWithCurrent: VelocityDataPoint[] = [
      ...mockData.slice(0, 4),
      { sprintName: 'Sprint 5', planned: 40, actual: 40, isCurrent: true },
    ];

    render(<VelocityChart data={dataWithCurrent} />);

    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('renders grid lines', () => {
    const { container } = render(<VelocityChart data={mockData} />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('renders axes', () => {
    const { container } = render(<VelocityChart data={mockData} />);

    const axes = container.querySelector('.axes');
    expect(axes).toBeInTheDocument();
  });

  it('renders axis labels', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getByText('Sprint')).toBeInTheDocument();
    expect(screen.getAllByText(/Velocity/).length).toBeGreaterThan(0);
  });

  it('displays sprint names on x-axis', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();
    expect(screen.getByText('Sprint 4')).toBeInTheDocument();
    expect(screen.getByText('Sprint 5')).toBeInTheDocument();
  });

  it('calculates completion rate correctly', () => {
    const underPerformingData: VelocityDataPoint[] = [
      { sprintName: 'Sprint 1', planned: 50, actual: 35 },
      { sprintName: 'Sprint 2', planned: 50, actual: 40 },
    ];

    render(<VelocityChart data={underPerformingData} />);

    // (35 + 40) / (50 + 50) = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('handles single sprint data', () => {
    const singleSprint: VelocityDataPoint[] = [
      { sprintName: 'Sprint 1', planned: 40, actual: 38 },
    ];

    render(<VelocityChart data={singleSprint} />);

    expect(screen.getByText('1 sprints')).toBeInTheDocument();
    expect(screen.getAllByText('38 hours').length).toBeGreaterThan(0);
  });

  it('does not show trend for single sprint', () => {
    const singleSprint: VelocityDataPoint[] = [
      { sprintName: 'Sprint 1', planned: 40, actual: 38 },
    ];

    render(<VelocityChart data={singleSprint} />);

    expect(screen.getByText('No Trend')).toBeInTheDocument();
  });

  it('calculates average velocity with decimal precision', () => {
    const unevenData: VelocityDataPoint[] = [
      { sprintName: 'Sprint 1', planned: 40, actual: 37 },
      { sprintName: 'Sprint 2', planned: 40, actual: 38 },
      { sprintName: 'Sprint 3', planned: 40, actual: 39 },
    ];

    render(<VelocityChart data={unevenData} />);

    // Average of [37, 38, 39] = 38
    expect(screen.getByText('38 hours')).toBeInTheDocument();
  });

  it('shows trend label in statistics', () => {
    render(<VelocityChart data={mockData} />);

    expect(screen.getAllByText('Trend').length).toBeGreaterThan(0);
  });

  it('hides trend label when showTrend is false', () => {
    render(<VelocityChart data={mockData} showTrend={false} />);

    // Should only appear once in the header (not in legend)
    const trendElements = screen.queryAllByText('Trend');
    expect(trendElements.length).toBe(0);
  });
});

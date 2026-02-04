/**
 * BurndownChart component tests
 * Tests burndown visualization and calculations
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BurndownChart, type BurndownDataPoint } from './BurndownChart';

// Mock data
const sprintStart = new Date('2024-02-01');
const sprintEnd = new Date('2024-02-14');

const mockActualData: BurndownDataPoint[] = [
  { date: new Date('2024-02-01'), remaining: 40 },
  { date: new Date('2024-02-02'), remaining: 37 },
  { date: new Date('2024-02-05'), remaining: 31 },
  { date: new Date('2024-02-06'), remaining: 28 },
  { date: new Date('2024-02-07'), remaining: 24 },
  { date: new Date('2024-02-08'), remaining: 21 },
  { date: new Date('2024-02-09'), remaining: 17 },
  { date: new Date('2024-02-12'), remaining: 11 },
  { date: new Date('2024-02-13'), remaining: 6 },
  { date: new Date('2024-02-14'), remaining: 0 },
];

describe('BurndownChart', () => {
  it('renders burndown chart', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('Sprint Burndown')).toBeInTheDocument();
  });

  it('displays sprint name', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
        sprintName="Sprint 1"
      />
    );

    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('displays sprint date range', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText(/Feb 1 - Feb 14/)).toBeInTheDocument();
  });

  it('displays completion percentage', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('Completion')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('displays remaining work', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('0 hours')).toBeInTheDocument();
  });

  it('shows completed status when sprint is done', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('Sprint Completed')).toBeInTheDocument();
  });

  it('shows on track status for normal progress', () => {
    const partialData: BurndownDataPoint[] = [
      { date: new Date('2024-02-01'), remaining: 40 },
      { date: new Date('2024-02-02'), remaining: 37 },
      { date: new Date('2024-02-05'), remaining: 31 },
    ];

    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={partialData}
      />
    );

    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('shows ahead of schedule status', () => {
    const aheadData: BurndownDataPoint[] = [
      { date: new Date('2024-02-01'), remaining: 40 },
      { date: new Date('2024-02-02'), remaining: 34 },
      { date: new Date('2024-02-05'), remaining: 20 },
    ];

    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={aheadData}
      />
    );

    expect(screen.getByText('Ahead of Schedule')).toBeInTheDocument();
  });

  it('shows behind schedule status', () => {
    const behindData: BurndownDataPoint[] = [
      { date: new Date('2024-02-01'), remaining: 40 },
      { date: new Date('2024-02-02'), remaining: 39 },
      { date: new Date('2024-02-05'), remaining: 37 },
      { date: new Date('2024-02-06'), remaining: 36 },
      { date: new Date('2024-02-07'), remaining: 35 },
    ];

    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={behindData}
      />
    );

    expect(screen.getByText('Behind Schedule')).toBeInTheDocument();
  });

  it('uses story points when specified', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={50}
        actualData={[
          { date: new Date('2024-02-01'), remaining: 50 },
          { date: new Date('2024-02-14'), remaining: 0 },
        ]}
        useStoryPoints={true}
      />
    );

    expect(screen.getByText('0 points')).toBeInTheDocument();
    expect(screen.getByText(/Remaining Work \(points\)/)).toBeInTheDocument();
  });

  it('uses hours by default', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('0 hours')).toBeInTheDocument();
    expect(screen.getByText(/Remaining Work \(hours\)/)).toBeInTheDocument();
  });

  it('renders SVG chart', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');
  });

  it('displays legend by default', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('Ideal Burndown')).toBeInTheDocument();
    expect(screen.getByText('Actual Burndown')).toBeInTheDocument();
  });

  it('hides legend when showLegend is false', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
        showLegend={false}
      />
    );

    expect(screen.queryByText('Ideal Burndown')).not.toBeInTheDocument();
    expect(screen.queryByText('Actual Burndown')).not.toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
        width={1000}
        height={500}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '1000');
    expect(svg).toHaveAttribute('height', '500');
  });

  it('applies custom className', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
        className="custom-class"
      />
    );

    const chart = container.querySelector('.burndown-chart');
    expect(chart).toHaveClass('custom-class');
  });

  it('handles empty data gracefully', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={[]}
      />
    );

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('calculates completion percentage correctly', () => {
    const partialData: BurndownDataPoint[] = [
      { date: new Date('2024-02-01'), remaining: 40 },
      { date: new Date('2024-02-07'), remaining: 20 },
    ];

    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={partialData}
      />
    );

    // 20 out of 40 completed = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders grid lines by default', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('hides grid lines when showGrid is false', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
        showGrid={false}
      />
    );

    const grid = container.querySelector('.grid');
    expect(grid).not.toBeInTheDocument();
  });

  it('renders data points as circles', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(mockActualData.length);
  });

  it('includes tooltips on data points', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={[
          { date: new Date('2024-02-01'), remaining: 40 },
          { date: new Date('2024-02-02'), remaining: 37 },
        ]}
      />
    );

    const titles = container.querySelectorAll('title');
    expect(titles.length).toBeGreaterThan(0);
    expect(titles[0].textContent).toContain('40 hours remaining');
  });

  it('renders axes', () => {
    const { container } = render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    const axes = container.querySelector('.axes');
    expect(axes).toBeInTheDocument();
  });

  it('renders axis labels', () => {
    render(
      <BurndownChart
        sprintStartDate={sprintStart}
        sprintEndDate={sprintEnd}
        initialCapacity={40}
        actualData={mockActualData}
      />
    );

    expect(screen.getByText('Sprint Days')).toBeInTheDocument();
    expect(screen.getByText(/Remaining Work/)).toBeInTheDocument();
  });
});

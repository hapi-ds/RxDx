/**
 * BurndownChart component examples
 * Demonstrates various burndown scenarios
 */

import React from 'react';
import { BurndownChart, type BurndownDataPoint } from './BurndownChart';

// Helper to generate dates
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Sprint dates
const sprintStart = new Date('2024-02-01');
const sprintEnd = new Date('2024-02-14');

// Example 1: On-track sprint
const onTrackData: BurndownDataPoint[] = [
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

// Example 2: Ahead of schedule
const aheadData: BurndownDataPoint[] = [
  { date: new Date('2024-02-01'), remaining: 40 },
  { date: new Date('2024-02-02'), remaining: 34 },
  { date: new Date('2024-02-05'), remaining: 25 },
  { date: new Date('2024-02-06'), remaining: 20 },
  { date: new Date('2024-02-07'), remaining: 15 },
  { date: new Date('2024-02-08'), remaining: 10 },
  { date: new Date('2024-02-09'), remaining: 5 },
  { date: new Date('2024-02-12'), remaining: 0 },
];

// Example 3: Behind schedule
const behindData: BurndownDataPoint[] = [
  { date: new Date('2024-02-01'), remaining: 40 },
  { date: new Date('2024-02-02'), remaining: 39 },
  { date: new Date('2024-02-05'), remaining: 37 },
  { date: new Date('2024-02-06'), remaining: 35 },
  { date: new Date('2024-02-07'), remaining: 33 },
  { date: new Date('2024-02-08'), remaining: 30 },
  { date: new Date('2024-02-09'), remaining: 28 },
  { date: new Date('2024-02-12'), remaining: 24 },
  { date: new Date('2024-02-13'), remaining: 20 },
];

// Example 4: Scope increase mid-sprint
const scopeIncreaseData: BurndownDataPoint[] = [
  { date: new Date('2024-02-01'), remaining: 40 },
  { date: new Date('2024-02-02'), remaining: 37 },
  { date: new Date('2024-02-05'), remaining: 31 },
  { date: new Date('2024-02-06'), remaining: 28 },
  { date: new Date('2024-02-07'), remaining: 35 }, // Scope increase
  { date: new Date('2024-02-08'), remaining: 32 },
  { date: new Date('2024-02-09'), remaining: 28 },
  { date: new Date('2024-02-12'), remaining: 22 },
  { date: new Date('2024-02-13'), remaining: 16 },
];

// Example 5: Story points
const storyPointsData: BurndownDataPoint[] = [
  { date: new Date('2024-02-01'), remaining: 50 },
  { date: new Date('2024-02-02'), remaining: 47 },
  { date: new Date('2024-02-05'), remaining: 40 },
  { date: new Date('2024-02-06'), remaining: 35 },
  { date: new Date('2024-02-07'), remaining: 30 },
  { date: new Date('2024-02-08'), remaining: 25 },
  { date: new Date('2024-02-09'), remaining: 20 },
  { date: new Date('2024-02-12'), remaining: 12 },
  { date: new Date('2024-02-13'), remaining: 5 },
];

// Example 6: In-progress sprint (partial data)
const inProgressData: BurndownDataPoint[] = [
  { date: new Date('2024-02-01'), remaining: 40 },
  { date: new Date('2024-02-02'), remaining: 37 },
  { date: new Date('2024-02-05'), remaining: 31 },
  { date: new Date('2024-02-06'), remaining: 28 },
  { date: new Date('2024-02-07'), remaining: 24 },
];

export function BurndownChartExamples(): React.ReactElement {
  return (
    <div style={{ padding: '2rem', background: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '2rem' }}>BurndownChart Component Examples</h1>

      {/* Example 1: On-track sprint */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 1: On-Track Sprint</h2>
        <p>Sprint progressing according to plan with work completed at expected rate</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={onTrackData}
          sprintName="Sprint 1 - On Track"
        />
      </section>

      {/* Example 2: Ahead of schedule */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 2: Ahead of Schedule</h2>
        <p>Team completing work faster than planned, finished early</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={aheadData}
          sprintName="Sprint 2 - Ahead"
        />
      </section>

      {/* Example 3: Behind schedule */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 3: Behind Schedule</h2>
        <p>Sprint falling behind with work remaining above ideal burndown</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={behindData}
          sprintName="Sprint 3 - Behind"
        />
      </section>

      {/* Example 4: Scope increase */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 4: Scope Increase Mid-Sprint</h2>
        <p>Additional work added during sprint causing upward spike</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={scopeIncreaseData}
          sprintName="Sprint 4 - Scope Change"
        />
      </section>

      {/* Example 5: Story points */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 5: Story Points Burndown</h2>
        <p>Burndown chart using story points instead of hours</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={50}
          actualData={storyPointsData}
          sprintName="Sprint 5 - Story Points"
          useStoryPoints={true}
        />
      </section>

      {/* Example 6: In-progress sprint */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 6: In-Progress Sprint</h2>
        <p>Active sprint with partial data showing current progress</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={inProgressData}
          sprintName="Sprint 6 - In Progress"
        />
      </section>

      {/* Example 7: No grid lines */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 7: Minimal Chart (No Grid)</h2>
        <p>Simplified chart without grid lines</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={onTrackData}
          sprintName="Sprint 7 - Minimal"
          showGrid={false}
        />
      </section>

      {/* Example 8: No legend */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 8: Chart Without Legend</h2>
        <p>Chart with legend hidden</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={onTrackData}
          sprintName="Sprint 8 - No Legend"
          showLegend={false}
        />
      </section>

      {/* Example 9: Custom dimensions */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 9: Custom Dimensions</h2>
        <p>Larger chart with custom width and height</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={onTrackData}
          sprintName="Sprint 9 - Large"
          width={1000}
          height={500}
        />
      </section>

      {/* Example 10: Empty data */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 10: New Sprint (No Data)</h2>
        <p>Sprint just started with no burndown data yet</p>
        <BurndownChart
          sprintStartDate={sprintStart}
          sprintEndDate={sprintEnd}
          initialCapacity={40}
          actualData={[]}
          sprintName="Sprint 10 - New"
        />
      </section>
    </div>
  );
}

export default BurndownChartExamples;

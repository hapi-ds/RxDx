/**
 * VelocityChart component examples
 * Demonstrates various velocity scenarios
 */

import React from 'react';
import { VelocityChart, type VelocityDataPoint } from './VelocityChart';

// Example 1: Consistent velocity
const consistentData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 40, actual: 38 },
  { sprintName: 'Sprint 2', planned: 40, actual: 42 },
  { sprintName: 'Sprint 3', planned: 40, actual: 39 },
  { sprintName: 'Sprint 4', planned: 40, actual: 41 },
  { sprintName: 'Sprint 5', planned: 40, actual: 40 },
  { sprintName: 'Sprint 6', planned: 40, actual: 38 },
];

// Example 2: Improving velocity
const improvingData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 30, actual: 25 },
  { sprintName: 'Sprint 2', planned: 35, actual: 32 },
  { sprintName: 'Sprint 3', planned: 40, actual: 38 },
  { sprintName: 'Sprint 4', planned: 45, actual: 44 },
  { sprintName: 'Sprint 5', planned: 50, actual: 48 },
  { sprintName: 'Sprint 6', planned: 50, actual: 52, isCurrent: true },
];

// Example 3: Declining velocity
const decliningData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 50, actual: 48 },
  { sprintName: 'Sprint 2', planned: 50, actual: 45 },
  { sprintName: 'Sprint 3', planned: 45, actual: 40 },
  { sprintName: 'Sprint 4', planned: 40, actual: 35 },
  { sprintName: 'Sprint 5', planned: 35, actual: 30 },
  { sprintName: 'Sprint 6', planned: 35, actual: 28, isCurrent: true },
];

// Example 4: Variable velocity
const variableData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 40, actual: 35 },
  { sprintName: 'Sprint 2', planned: 40, actual: 48 },
  { sprintName: 'Sprint 3', planned: 45, actual: 32 },
  { sprintName: 'Sprint 4', planned: 40, actual: 45 },
  { sprintName: 'Sprint 5', planned: 40, actual: 38 },
  { sprintName: 'Sprint 6', planned: 40, actual: 42 },
  { sprintName: 'Sprint 7', planned: 40, actual: 30 },
  { sprintName: 'Sprint 8', planned: 40, actual: 44, isCurrent: true },
];

// Example 5: Story points
const storyPointsData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 25, actual: 23 },
  { sprintName: 'Sprint 2', planned: 28, actual: 26 },
  { sprintName: 'Sprint 3', planned: 30, actual: 29 },
  { sprintName: 'Sprint 4', planned: 30, actual: 31 },
  { sprintName: 'Sprint 5', planned: 32, actual: 30 },
];

// Example 6: Under-performing
const underPerformingData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 50, actual: 35 },
  { sprintName: 'Sprint 2', planned: 50, actual: 38 },
  { sprintName: 'Sprint 3', planned: 45, actual: 32 },
  { sprintName: 'Sprint 4', planned: 45, actual: 36 },
  { sprintName: 'Sprint 5', planned: 40, actual: 30, isCurrent: true },
];

// Example 7: Over-performing
const overPerformingData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 30, actual: 38 },
  { sprintName: 'Sprint 2', planned: 35, actual: 42 },
  { sprintName: 'Sprint 3', planned: 40, actual: 48 },
  { sprintName: 'Sprint 4', planned: 45, actual: 52 },
  { sprintName: 'Sprint 5', planned: 50, actual: 55, isCurrent: true },
];

// Example 8: Few sprints
const fewSprintsData: VelocityDataPoint[] = [
  { sprintName: 'Sprint 1', planned: 40, actual: 35 },
  { sprintName: 'Sprint 2', planned: 40, actual: 42, isCurrent: true },
];

export function VelocityChartExamples(): React.ReactElement {
  return (
    <div style={{ padding: '2rem', background: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '2rem' }}>VelocityChart Component Examples</h1>

      {/* Example 1: Consistent velocity */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 1: Consistent Velocity</h2>
        <p>Team maintaining steady velocity across sprints</p>
        <VelocityChart
          data={consistentData}
          title="Consistent Team Velocity"
        />
      </section>

      {/* Example 2: Improving velocity */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 2: Improving Velocity</h2>
        <p>Team velocity increasing over time with positive trend</p>
        <VelocityChart
          data={improvingData}
          title="Improving Team Velocity"
        />
      </section>

      {/* Example 3: Declining velocity */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 3: Declining Velocity</h2>
        <p>Team velocity decreasing over time - may need investigation</p>
        <VelocityChart
          data={decliningData}
          title="Declining Team Velocity"
        />
      </section>

      {/* Example 4: Variable velocity */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 4: Variable Velocity</h2>
        <p>Inconsistent velocity with high variability between sprints</p>
        <VelocityChart
          data={variableData}
          title="Variable Team Velocity"
        />
      </section>

      {/* Example 5: Story points */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 5: Story Points Velocity</h2>
        <p>Velocity measured in story points instead of hours</p>
        <VelocityChart
          data={storyPointsData}
          title="Story Points Velocity"
          useStoryPoints={true}
        />
      </section>

      {/* Example 6: Under-performing */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 6: Under-Performing Team</h2>
        <p>Consistently delivering less than planned</p>
        <VelocityChart
          data={underPerformingData}
          title="Under-Performing Velocity"
        />
      </section>

      {/* Example 7: Over-performing */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 7: Over-Performing Team</h2>
        <p>Consistently delivering more than planned</p>
        <VelocityChart
          data={overPerformingData}
          title="Over-Performing Velocity"
        />
      </section>

      {/* Example 8: Few sprints */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 8: New Team (Few Sprints)</h2>
        <p>Limited data from a new team</p>
        <VelocityChart
          data={fewSprintsData}
          title="New Team Velocity"
        />
      </section>

      {/* Example 9: Without average line */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 9: Without Average Line</h2>
        <p>Chart without average velocity indicator</p>
        <VelocityChart
          data={consistentData}
          title="Velocity Without Average"
          showAverage={false}
        />
      </section>

      {/* Example 10: Without trend line */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 10: Without Trend Line</h2>
        <p>Chart without trend analysis</p>
        <VelocityChart
          data={improvingData}
          title="Velocity Without Trend"
          showTrend={false}
        />
      </section>

      {/* Example 11: Without legend */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 11: Without Legend</h2>
        <p>Minimal chart without legend</p>
        <VelocityChart
          data={consistentData}
          title="Velocity Without Legend"
          showLegend={false}
        />
      </section>

      {/* Example 12: Custom dimensions */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 12: Custom Dimensions</h2>
        <p>Larger chart with custom width and height</p>
        <VelocityChart
          data={variableData}
          title="Large Velocity Chart"
          width={1000}
          height={500}
        />
      </section>

      {/* Example 13: Empty data */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 13: No Data</h2>
        <p>Chart with no velocity data</p>
        <VelocityChart
          data={[]}
          title="No Velocity Data"
        />
      </section>
    </div>
  );
}

export default VelocityChartExamples;

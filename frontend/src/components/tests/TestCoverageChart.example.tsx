/**
 * TestCoverageChart Example Usage
 * Demonstrates different ways to use the TestCoverageChart component
 */

import React from 'react';
import { TestCoverageChart, type TestCoverageData } from './TestCoverageChart';

// Example data
const sampleData: TestCoverageData = {
  total_requirements: 100,
  requirements_with_tests: 85,
  requirements_with_passing_tests: 75,
  coverage_percentage: 85,
  pass_rate_percentage: 88.24,
};

const lowCoverageData: TestCoverageData = {
  total_requirements: 50,
  requirements_with_tests: 20,
  requirements_with_passing_tests: 15,
  coverage_percentage: 40,
  pass_rate_percentage: 75,
};

const perfectCoverageData: TestCoverageData = {
  total_requirements: 30,
  requirements_with_tests: 30,
  requirements_with_passing_tests: 30,
  coverage_percentage: 100,
  pass_rate_percentage: 100,
};

export function TestCoverageChartExamples(): React.ReactElement {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb' }}>
      <h1 style={{ marginBottom: '2rem' }}>TestCoverageChart Examples</h1>

      {/* Example 1: All visualizations (default) */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 1: All Visualizations (Default)</h2>
        <p>Shows bar chart, pie chart, and progress bars together with legend and statistics.</p>
        <TestCoverageChart data={sampleData} />
      </section>

      {/* Example 2: Bar chart only */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 2: Bar Chart Only</h2>
        <p>Displays only the horizontal stacked bar chart.</p>
        <TestCoverageChart 
          data={sampleData} 
          visualizationType="bar"
        />
      </section>

      {/* Example 3: Pie chart only */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 3: Pie Chart Only</h2>
        <p>Displays only the pie chart with coverage percentage in the center.</p>
        <TestCoverageChart 
          data={sampleData} 
          visualizationType="pie"
        />
      </section>

      {/* Example 4: Progress bars only */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 4: Progress Bars Only</h2>
        <p>Displays only the progress bars for coverage metrics.</p>
        <TestCoverageChart 
          data={sampleData} 
          visualizationType="progress"
        />
      </section>

      {/* Example 5: Without legend */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 5: Without Legend</h2>
        <p>All visualizations but without the legend.</p>
        <TestCoverageChart 
          data={sampleData} 
          showLegend={false}
        />
      </section>

      {/* Example 6: Without statistics */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 6: Without Statistics</h2>
        <p>All visualizations but without the statistics section.</p>
        <TestCoverageChart 
          data={sampleData} 
          showStatistics={false}
        />
      </section>

      {/* Example 7: Custom height */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 7: Custom Height</h2>
        <p>Bar chart with custom height of 200px.</p>
        <TestCoverageChart 
          data={sampleData} 
          visualizationType="bar"
          height={200}
        />
      </section>

      {/* Example 8: Low coverage scenario */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 8: Low Coverage Scenario</h2>
        <p>Demonstrates visualization with low test coverage (40%).</p>
        <TestCoverageChart data={lowCoverageData} />
      </section>

      {/* Example 9: Perfect coverage scenario */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 9: Perfect Coverage Scenario</h2>
        <p>Demonstrates visualization with 100% test coverage.</p>
        <TestCoverageChart data={perfectCoverageData} />
      </section>

      {/* Example 10: Minimal configuration */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 10: Minimal Configuration</h2>
        <p>Progress bars only, no legend, no statistics - most compact view.</p>
        <TestCoverageChart 
          data={sampleData} 
          visualizationType="progress"
          showLegend={false}
          showStatistics={false}
          height={200}
        />
      </section>

      {/* Example 11: Integration with TestsPage */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 11: Integration Example</h2>
        <p>How to use in a page component:</p>
        <pre style={{
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          padding: '1rem',
          borderRadius: '6px',
          overflow: 'auto',
        }}>
{`import { TestCoverageChart, TestCoverageData } from '../components/tests';

function TestsPage() {
  const [coverage, setCoverage] = useState<TestCoverageData | null>(null);

  useEffect(() => {
    // Fetch coverage data from API
    fetch('/api/v1/tests/coverage')
      .then(res => res.json())
      .then(data => setCoverage(data));
  }, []);

  return (
    <div>
      <h1>Tests</h1>
      {coverage && (
        <TestCoverageChart 
          data={coverage}
          visualizationType="all"
        />
      )}
    </div>
  );
}`}
        </pre>
      </section>

      {/* Example 12: Responsive behavior */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 12: Responsive Behavior</h2>
        <p>The component is fully responsive. Try resizing your browser window.</p>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <TestCoverageChart data={sampleData} />
        </div>
      </section>
    </div>
  );
}

export default TestCoverageChartExamples;

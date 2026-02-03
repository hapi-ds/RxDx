/**
 * TestCoverageChart component tests
 * Tests for test coverage visualization component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestCoverageChart, type TestCoverageData } from './TestCoverageChart';

describe('TestCoverageChart', () => {
  const mockData: TestCoverageData = {
    total_requirements: 100,
    requirements_with_tests: 80,
    requirements_with_passing_tests: 70,
    coverage_percentage: 80,
    pass_rate_percentage: 87.5,
  };

  const emptyData: TestCoverageData = {
    total_requirements: 0,
    requirements_with_tests: 0,
    requirements_with_passing_tests: 0,
    coverage_percentage: 0,
    pass_rate_percentage: 0,
  };

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<TestCoverageChart data={mockData} />);
      
      // Should render all visualization types by default
      expect(screen.getByText('Requirements Test Coverage')).toBeInTheDocument();
      expect(screen.getByText('Test Coverage Distribution')).toBeInTheDocument();
      expect(screen.getByText('Coverage Metrics')).toBeInTheDocument();
    });

    it('should render bar chart only when specified', () => {
      render(<TestCoverageChart data={mockData} visualizationType="bar" />);
      
      expect(screen.getByText('Requirements Test Coverage')).toBeInTheDocument();
      expect(screen.queryByText('Test Coverage Distribution')).not.toBeInTheDocument();
      expect(screen.queryByText('Coverage Metrics')).not.toBeInTheDocument();
    });

    it('should render pie chart only when specified', () => {
      render(<TestCoverageChart data={mockData} visualizationType="pie" />);
      
      expect(screen.getByText('Test Coverage Distribution')).toBeInTheDocument();
      expect(screen.queryByText('Requirements Test Coverage')).not.toBeInTheDocument();
      expect(screen.queryByText('Coverage Metrics')).not.toBeInTheDocument();
    });

    it('should render progress bars only when specified', () => {
      render(<TestCoverageChart data={mockData} visualizationType="progress" />);
      
      expect(screen.getByText('Coverage Metrics')).toBeInTheDocument();
      expect(screen.queryByText('Requirements Test Coverage')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Coverage Distribution')).not.toBeInTheDocument();
    });

    it('should render all charts when visualizationType is "all"', () => {
      render(<TestCoverageChart data={mockData} visualizationType="all" />);
      
      expect(screen.getByText('Requirements Test Coverage')).toBeInTheDocument();
      expect(screen.getByText('Test Coverage Distribution')).toBeInTheDocument();
      expect(screen.getByText('Coverage Metrics')).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('should render legend by default', () => {
      render(<TestCoverageChart data={mockData} />);
      
      expect(screen.getByText('Passing Tests')).toBeInTheDocument();
      expect(screen.getByText('Failing Tests')).toBeInTheDocument();
      expect(screen.getByText('No Tests')).toBeInTheDocument();
    });

    it('should not render legend when showLegend is false', () => {
      render(<TestCoverageChart data={mockData} showLegend={false} />);
      
      expect(screen.queryByText('Passing Tests')).not.toBeInTheDocument();
      expect(screen.queryByText('Failing Tests')).not.toBeInTheDocument();
      expect(screen.queryByText('No Tests')).not.toBeInTheDocument();
    });

    it('should display correct counts in legend', () => {
      render(<TestCoverageChart data={mockData} />);
      
      expect(screen.getByText('(70)')).toBeInTheDocument(); // Passing
      expect(screen.getByText('(10)')).toBeInTheDocument(); // Failing (80 - 70)
      expect(screen.getByText('(20)')).toBeInTheDocument(); // No tests (100 - 80)
    });
  });

  describe('Statistics', () => {
    it('should render statistics by default', () => {
      render(<TestCoverageChart data={mockData} />);
      
      expect(screen.getByText('Total Requirements')).toBeInTheDocument();
      expect(screen.getByText('Test Coverage')).toBeInTheDocument();
      expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    });

    it('should not render statistics when showStatistics is false', () => {
      render(<TestCoverageChart data={mockData} showStatistics={false} />);
      
      expect(screen.queryByText('Total Requirements')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Coverage')).not.toBeInTheDocument();
      expect(screen.queryByText('Pass Rate')).not.toBeInTheDocument();
    });

    it('should display correct statistics values', () => {
      render(<TestCoverageChart data={mockData} />);
      
      expect(screen.getByText('Total Requirements')).toBeInTheDocument();
      const values100 = screen.getAllByText('100');
      expect(values100.length).toBeGreaterThan(0);
      const values80 = screen.getAllByText('80.0%');
      expect(values80.length).toBeGreaterThan(0);
      const values87 = screen.getAllByText('87.5%');
      expect(values87.length).toBeGreaterThan(0);
    });
  });

  describe('Bar Chart', () => {
    it('should render bar segments with correct labels', () => {
      render(<TestCoverageChart data={mockData} visualizationType="bar" />);
      
      expect(screen.getByText('70 Passing')).toBeInTheDocument();
      expect(screen.getByText('10 Failing')).toBeInTheDocument();
      expect(screen.getByText('20 No Tests')).toBeInTheDocument();
    });

    it('should render axis labels', () => {
      render(<TestCoverageChart data={mockData} visualizationType="bar" />);
      
      const axisLabels = screen.getAllByText(/^(0|100)$/);
      expect(axisLabels.length).toBeGreaterThan(0);
    });

    it('should show empty state when no data', () => {
      render(<TestCoverageChart data={emptyData} visualizationType="bar" />);
      
      expect(screen.getByText('No requirements data available')).toBeInTheDocument();
    });

    it('should have ARIA labels for accessibility', () => {
      const { container } = render(<TestCoverageChart data={mockData} visualizationType="bar" />);
      
      const segments = container.querySelectorAll('[role="img"]');
      expect(segments.length).toBeGreaterThan(0);
      
      segments.forEach(segment => {
        expect(segment).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Pie Chart', () => {
    it('should render coverage percentage in center', () => {
      render(<TestCoverageChart data={mockData} visualizationType="pie" />);
      
      expect(screen.getAllByText('80.0%').length).toBeGreaterThan(0);
      expect(screen.getByText('Coverage')).toBeInTheDocument();
    });

    it('should show empty state when no data', () => {
      render(<TestCoverageChart data={emptyData} visualizationType="pie" />);
      
      expect(screen.getByText('No requirements data available')).toBeInTheDocument();
    });

    it('should have ARIA label for accessibility', () => {
      const { container } = render(<TestCoverageChart data={mockData} visualizationType="pie" />);
      
      const pieChart = container.querySelector('[role="img"]');
      expect(pieChart).toHaveAttribute('aria-label');
      expect(pieChart?.getAttribute('aria-label')).toContain('70 passing');
      expect(pieChart?.getAttribute('aria-label')).toContain('10 failing');
      expect(pieChart?.getAttribute('aria-label')).toContain('20 without tests');
    });
  });

  describe('Progress Bars', () => {
    it('should render both progress bars', () => {
      render(<TestCoverageChart data={mockData} visualizationType="progress" />);
      
      expect(screen.getByText('Requirements with Tests')).toBeInTheDocument();
      expect(screen.getByText('Requirements with Passing Tests')).toBeInTheDocument();
    });

    it('should display correct percentages', () => {
      render(<TestCoverageChart data={mockData} visualizationType="progress" />);
      
      const percentages = screen.getAllByText(/\d+\.\d+%/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('should display correct details', () => {
      render(<TestCoverageChart data={mockData} visualizationType="progress" />);
      
      expect(screen.getByText('80 of 100 requirements')).toBeInTheDocument();
      expect(screen.getByText('70 of 80 tested requirements')).toBeInTheDocument();
    });

    it('should have progress bars with ARIA attributes', () => {
      const { container } = render(<TestCoverageChart data={mockData} visualizationType="progress" />);
      
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBe(2);
      
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin');
        expect(bar).toHaveAttribute('aria-valuemax');
        expect(bar).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero requirements', () => {
      render(<TestCoverageChart data={emptyData} />);
      
      expect(screen.getAllByText('No requirements data available').length).toBeGreaterThan(0);
    });

    it('should handle 100% coverage', () => {
      const fullCoverageData: TestCoverageData = {
        total_requirements: 50,
        requirements_with_tests: 50,
        requirements_with_passing_tests: 50,
        coverage_percentage: 100,
        pass_rate_percentage: 100,
      };
      
      render(<TestCoverageChart data={fullCoverageData} />);
      
      const percentages = screen.getAllByText('100.0%');
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('should handle all failing tests', () => {
      const allFailingData: TestCoverageData = {
        total_requirements: 50,
        requirements_with_tests: 50,
        requirements_with_passing_tests: 0,
        coverage_percentage: 100,
        pass_rate_percentage: 0,
      };
      
      render(<TestCoverageChart data={allFailingData} visualizationType="bar" showLegend={false} />);
      
      expect(screen.getByText('50 Failing')).toBeInTheDocument();
      expect(screen.queryByText(/\d+ Passing/)).not.toBeInTheDocument();
    });

    it('should handle partial coverage', () => {
      const partialData: TestCoverageData = {
        total_requirements: 100,
        requirements_with_tests: 30,
        requirements_with_passing_tests: 20,
        coverage_percentage: 30,
        pass_rate_percentage: 66.67,
      };
      
      render(<TestCoverageChart data={partialData} visualizationType="bar" />);
      
      expect(screen.getByText('20 Passing')).toBeInTheDocument();
      expect(screen.getByText('10 Failing')).toBeInTheDocument();
      expect(screen.getByText('70 No Tests')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <TestCoverageChart data={mockData} className="custom-class" />
      );
      
      const chartElement = container.querySelector('.test-coverage-chart');
      expect(chartElement).toHaveClass('custom-class');
    });

    it('should respect custom height', () => {
      const { container } = render(
        <TestCoverageChart data={mockData} height={400} visualizationType="bar" />
      );
      
      const barChart = container.querySelector('.bar-chart');
      expect(barChart).toHaveStyle({ height: '400px' });
    });
  });

  describe('Calculations', () => {
    it('should calculate coverage percentage correctly', () => {
      const testData: TestCoverageData = {
        total_requirements: 200,
        requirements_with_tests: 150,
        requirements_with_passing_tests: 120,
        coverage_percentage: 75,
        pass_rate_percentage: 80,
      };
      
      render(<TestCoverageChart data={testData} />);
      
      // Coverage: 150/200 = 75%
      const percentages75 = screen.getAllByText('75.0%');
      expect(percentages75.length).toBeGreaterThan(0);
      // Pass rate: 120/150 = 80%
      const percentages80 = screen.getAllByText('80.0%');
      expect(percentages80.length).toBeGreaterThan(0);
    });

    it('should handle decimal percentages', () => {
      const testData: TestCoverageData = {
        total_requirements: 3,
        requirements_with_tests: 2,
        requirements_with_passing_tests: 1,
        coverage_percentage: 66.67,
        pass_rate_percentage: 50,
      };
      
      render(<TestCoverageChart data={testData} />);
      
      const percentages66 = screen.getAllByText('66.7%');
      expect(percentages66.length).toBeGreaterThan(0);
      const percentages50 = screen.getAllByText('50.0%');
      expect(percentages50.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      const { container } = render(<TestCoverageChart data={mockData} />);
      
      const ariaElements = container.querySelectorAll('[aria-label]');
      expect(ariaElements.length).toBeGreaterThan(0);
    });

    it('should have proper role attributes', () => {
      const { container } = render(<TestCoverageChart data={mockData} />);
      
      const imgElements = container.querySelectorAll('[role="img"]');
      const progressElements = container.querySelectorAll('[role="progressbar"]');
      
      expect(imgElements.length + progressElements.length).toBeGreaterThan(0);
    });
  });
});

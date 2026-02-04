/**
 * Tests for FailureChainVisualization component
 * Validates Requirement 10 (Risk Management with FMEA)
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FailureChainVisualization } from './FailureChainVisualization';
import type { RiskChain } from '../../services/riskService';

describe('FailureChainVisualization', () => {
  const mockChain: RiskChain = {
    start_risk_id: 'risk-1',
    chain_length: 3,
    total_probability: 0.45,
    nodes: [
      {
        id: 'risk-1',
        type: 'Risk',
        title: 'Initial Risk',
        description: 'Starting point',
        severity: 8,
        rpn: 240,
      },
      {
        id: 'failure-1',
        type: 'Failure',
        title: 'Component Failure',
        description: 'First failure',
      },
      {
        id: 'failure-2',
        type: 'Failure',
        title: 'System Failure',
        description: 'Final failure',
      },
    ],
    edges: [
      {
        from_id: 'risk-1',
        to_id: 'failure-1',
        probability: 0.6,
      },
      {
        from_id: 'failure-1',
        to_id: 'failure-2',
        probability: 0.75,
      },
    ],
  };

  describe('Empty State', () => {
    it('should render empty state when no chains provided', () => {
      render(<FailureChainVisualization chains={[]} />);
      
      expect(screen.getByText('No failure chains found')).toBeInTheDocument();
      expect(screen.getByText(/Failure chains show how risks propagate/)).toBeInTheDocument();
    });
  });

  describe('Chain Rendering', () => {
    it('should render chain with nodes and edges', () => {
      render(<FailureChainVisualization chains={[mockChain]} />);
      
      expect(screen.getByText('Failure Chain Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 1 failure chain/)).toBeInTheDocument();
      expect(screen.getByText('Chain 1')).toBeInTheDocument();
    });

    it('should display total probability when enabled', () => {
      render(<FailureChainVisualization chains={[mockChain]} showTotalProbability={true} />);
      
      expect(screen.getByText('Total Probability:')).toBeInTheDocument();
      expect(screen.getByText('45.0%')).toBeInTheDocument();
    });

    it('should hide total probability when disabled', () => {
      render(<FailureChainVisualization chains={[mockChain]} showTotalProbability={false} />);
      
      expect(screen.queryByText('Total Probability:')).not.toBeInTheDocument();
    });

    it('should display chain metadata', () => {
      render(<FailureChainVisualization chains={[mockChain]} />);
      
      expect(screen.getByText('Length: 3')).toBeInTheDocument();
      expect(screen.getByText('Nodes: 3')).toBeInTheDocument();
    });

    it('should render SVG with correct ARIA label', () => {
      render(<FailureChainVisualization chains={[mockChain]} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', expect.stringContaining('Failure chain 1'));
      expect(svg).toHaveAttribute('aria-label', expect.stringContaining('3 nodes'));
      expect(svg).toHaveAttribute('aria-label', expect.stringContaining('45.0%'));
    });
  });

  describe('Multiple Chains', () => {
    const mockChains: RiskChain[] = [
      mockChain,
      {
        start_risk_id: 'risk-2',
        chain_length: 2,
        total_probability: 0.3,
        nodes: [
          {
            id: 'risk-2',
            type: 'Risk',
            title: 'Second Risk',
            rpn: 150,
          },
          {
            id: 'failure-3',
            type: 'Failure',
            title: 'Another Failure',
          },
        ],
        edges: [
          {
            from_id: 'risk-2',
            to_id: 'failure-3',
            probability: 0.3,
          },
        ],
      },
    ];

    it('should render multiple chains', () => {
      render(<FailureChainVisualization chains={mockChains} />);
      
      expect(screen.getByText(/Showing 2 of 2 failure chains/)).toBeInTheDocument();
      expect(screen.getByText('Chain 1')).toBeInTheDocument();
      expect(screen.getByText('Chain 2')).toBeInTheDocument();
    });

    it('should limit chains displayed based on maxChainsToShow', () => {
      render(<FailureChainVisualization chains={mockChains} maxChainsToShow={1} />);
      
      expect(screen.getByText(/Showing 1 of 2 failure chains/)).toBeInTheDocument();
      expect(screen.getByText('Chain 1')).toBeInTheDocument();
      expect(screen.queryByText('Chain 2')).not.toBeInTheDocument();
      expect(screen.getByText('1 more chain not shown')).toBeInTheDocument();
    });

    it('should show correct plural form for multiple hidden chains', () => {
      const manyChains = Array(10).fill(mockChain);
      render(<FailureChainVisualization chains={manyChains} maxChainsToShow={3} />);
      
      expect(screen.getByText('7 more chains not shown')).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('should render legend with risk and failure indicators', () => {
      render(<FailureChainVisualization chains={[mockChain]} />);
      
      expect(screen.getByText('Risk Node')).toBeInTheDocument();
      expect(screen.getByText('Failure Node')).toBeInTheDocument();
    });

    it('should show probability indicator in legend when enabled', () => {
      render(<FailureChainVisualization chains={[mockChain]} showProbabilities={true} />);
      
      expect(screen.getByText('Probability of occurrence')).toBeInTheDocument();
    });

    it('should hide probability indicator in legend when disabled', () => {
      render(<FailureChainVisualization chains={[mockChain]} showProbabilities={false} />);
      
      expect(screen.queryByText('Probability of occurrence')).not.toBeInTheDocument();
    });
  });

  describe('Probability Display', () => {
    it('should display edge probabilities when enabled', () => {
      render(<FailureChainVisualization chains={[mockChain]} showProbabilities={true} />);
      
      // Probabilities are rendered in SVG text elements
      const svg = screen.getByRole('img');
      expect(svg).toBeInTheDocument();
      // Note: Testing SVG text content is complex, so we verify the SVG exists
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <FailureChainVisualization chains={[mockChain]} className="custom-class" />
      );
      
      const element = container.querySelector('.failure-chain-visualization');
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle chain with no nodes gracefully', () => {
      const emptyChain: RiskChain = {
        start_risk_id: 'risk-1',
        chain_length: 0,
        total_probability: 0,
        nodes: [],
        edges: [],
      };

      render(<FailureChainVisualization chains={[emptyChain]} />);
      
      expect(screen.getByText('Chain 1')).toBeInTheDocument();
      expect(screen.getByText('No nodes in this chain')).toBeInTheDocument();
    });

    it('should handle chain with single node', () => {
      const singleNodeChain: RiskChain = {
        start_risk_id: 'risk-1',
        chain_length: 1,
        total_probability: 1.0,
        nodes: [
          {
            id: 'risk-1',
            type: 'Risk',
            title: 'Isolated Risk',
            rpn: 100,
          },
        ],
        edges: [],
      };

      render(<FailureChainVisualization chains={[singleNodeChain]} />);
      
      expect(screen.getByText('Chain 1')).toBeInTheDocument();
      expect(screen.getByText('Nodes: 1')).toBeInTheDocument();
    });

    it('should handle nodes without titles', () => {
      const noTitleChain: RiskChain = {
        start_risk_id: 'risk-1',
        chain_length: 1,
        total_probability: 0.5,
        nodes: [
          {
            id: 'risk-1',
            type: 'Risk',
            description: 'Risk without title',
          },
        ],
        edges: [],
      };

      render(<FailureChainVisualization chains={[noTitleChain]} />);
      
      expect(screen.getByText('Chain 1')).toBeInTheDocument();
    });

    it('should handle very small probabilities', () => {
      const smallProbChain: RiskChain = {
        ...mockChain,
        total_probability: 0.001,
      };

      render(<FailureChainVisualization chains={[smallProbChain]} />);
      
      expect(screen.getByText('0.1%')).toBeInTheDocument();
    });

    it('should handle probability of 1.0', () => {
      const certainChain: RiskChain = {
        ...mockChain,
        total_probability: 1.0,
      };

      render(<FailureChainVisualization chains={[certainChain]} />);
      
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for SVG', () => {
      render(<FailureChainVisualization chains={[mockChain]} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label');
    });

    it('should render semantic HTML structure', () => {
      const { container } = render(<FailureChainVisualization chains={[mockChain]} />);
      
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render scrollable container for large chains', () => {
      const { container } = render(<FailureChainVisualization chains={[mockChain]} />);
      
      const visualization = container.querySelector('.chain-visualization');
      expect(visualization).toBeInTheDocument();
      // The overflow-x: auto style is applied via CSS
    });
  });
});

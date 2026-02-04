/**
 * Example usage of FailureChainVisualization component
 * Demonstrates various configurations and use cases
 */

import React from 'react';
import { FailureChainVisualization } from './FailureChainVisualization';
import type { RiskChain } from '../../services/riskService';

// Example 1: Simple chain with 3 nodes
const simpleChain: RiskChain = {
  start_risk_id: 'risk-001',
  chain_length: 3,
  total_probability: 0.36,
  nodes: [
    {
      id: 'risk-001',
      type: 'Risk',
      title: 'Software Bug',
      description: 'Critical bug in authentication module',
      severity: 9,
      rpn: 270,
    },
    {
      id: 'failure-001',
      type: 'Failure',
      title: 'Authentication Failure',
      description: 'Users cannot log in',
    },
    {
      id: 'failure-002',
      type: 'Failure',
      title: 'System Unavailable',
      description: 'Complete system outage',
    },
  ],
  edges: [
    {
      from_id: 'risk-001',
      to_id: 'failure-001',
      probability: 0.6,
    },
    {
      from_id: 'failure-001',
      to_id: 'failure-002',
      probability: 0.6,
    },
  ],
};

// Example 2: Complex chain with branching
const complexChain: RiskChain = {
  start_risk_id: 'risk-002',
  chain_length: 5,
  total_probability: 0.24,
  nodes: [
    {
      id: 'risk-002',
      type: 'Risk',
      title: 'Hardware Failure',
      description: 'Server hardware malfunction',
      severity: 8,
      rpn: 240,
    },
    {
      id: 'failure-003',
      type: 'Failure',
      title: 'Database Corruption',
      description: 'Data integrity compromised',
    },
    {
      id: 'failure-004',
      type: 'Failure',
      title: 'Service Degradation',
      description: 'Slow response times',
    },
    {
      id: 'failure-005',
      type: 'Failure',
      title: 'Data Loss',
      description: 'Permanent data loss',
    },
    {
      id: 'failure-006',
      type: 'Failure',
      title: 'Customer Impact',
      description: 'Loss of customer trust',
    },
  ],
  edges: [
    {
      from_id: 'risk-002',
      to_id: 'failure-003',
      probability: 0.4,
    },
    {
      from_id: 'risk-002',
      to_id: 'failure-004',
      probability: 0.8,
    },
    {
      from_id: 'failure-003',
      to_id: 'failure-005',
      probability: 0.6,
    },
    {
      from_id: 'failure-004',
      to_id: 'failure-006',
      probability: 0.3,
    },
  ],
};

// Example 3: High probability chain
const highProbabilityChain: RiskChain = {
  start_risk_id: 'risk-003',
  chain_length: 2,
  total_probability: 0.81,
  nodes: [
    {
      id: 'risk-003',
      type: 'Risk',
      title: 'Network Congestion',
      description: 'High traffic during peak hours',
      severity: 5,
      rpn: 125,
    },
    {
      id: 'failure-007',
      type: 'Failure',
      title: 'Timeout Errors',
      description: 'Requests timing out',
    },
  ],
  edges: [
    {
      from_id: 'risk-003',
      to_id: 'failure-007',
      probability: 0.9,
    },
  ],
};

export function FailureChainVisualizationExamples(): React.ReactElement {
  return (
    <div style={{ padding: '2rem', background: '#f9fafb' }}>
      <h1 style={{ marginBottom: '2rem' }}>FailureChainVisualization Examples</h1>

      {/* Example 1: Default configuration */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 1: Default Configuration</h2>
        <p>Shows all features enabled with a simple 3-node chain.</p>
        <FailureChainVisualization chains={[simpleChain]} />
      </section>

      {/* Example 2: Multiple chains */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 2: Multiple Chains</h2>
        <p>Displays multiple failure chains with different complexities.</p>
        <FailureChainVisualization 
          chains={[simpleChain, complexChain, highProbabilityChain]} 
        />
      </section>

      {/* Example 3: Without probabilities */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 3: Without Edge Probabilities</h2>
        <p>Hides probability labels on edges for a cleaner view.</p>
        <FailureChainVisualization 
          chains={[simpleChain]} 
          showProbabilities={false}
        />
      </section>

      {/* Example 4: Without total probability */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 4: Without Total Probability</h2>
        <p>Hides the total probability badge in the header.</p>
        <FailureChainVisualization 
          chains={[simpleChain]} 
          showTotalProbability={false}
        />
      </section>

      {/* Example 5: Limited chains display */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 5: Limited Chains Display</h2>
        <p>Shows only the first 2 chains when there are more available.</p>
        <FailureChainVisualization 
          chains={[simpleChain, complexChain, highProbabilityChain]} 
          maxChainsToShow={2}
        />
      </section>

      {/* Example 6: Empty state */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 6: Empty State</h2>
        <p>Shows the empty state when no chains are provided.</p>
        <FailureChainVisualization chains={[]} />
      </section>

      {/* Example 7: Complex branching chain */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 7: Complex Branching Chain</h2>
        <p>Demonstrates a chain with multiple branches and paths.</p>
        <FailureChainVisualization chains={[complexChain]} />
      </section>

      {/* Example 8: High probability chain */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 8: High Probability Chain</h2>
        <p>Shows a chain with very high probability of occurrence.</p>
        <FailureChainVisualization chains={[highProbabilityChain]} />
      </section>

      {/* Example 9: Minimal configuration */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 9: Minimal Configuration</h2>
        <p>Minimal display with all optional features disabled.</p>
        <FailureChainVisualization 
          chains={[simpleChain]} 
          showProbabilities={false}
          showTotalProbability={false}
        />
      </section>

      {/* Example 10: Custom styling */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 10: Custom Styling</h2>
        <p>Demonstrates custom className for additional styling.</p>
        <FailureChainVisualization 
          chains={[simpleChain]} 
          className="custom-chain-viz"
        />
        <style>{`
          .custom-chain-viz {
            border: 3px solid #3b82f6;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
          }
        `}</style>
      </section>
    </div>
  );
}

export default FailureChainVisualizationExamples;

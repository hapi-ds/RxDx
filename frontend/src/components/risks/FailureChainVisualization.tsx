/**
 * FailureChainVisualization component
 * Visualizes risk propagation paths showing how risks lead to failures
 * Implements Requirement 10 (Risk Management with FMEA)
 * 
 * Features:
 * - Displays failure chains as a tree/flow diagram
 * - Shows probability values on connections
 * - Calculates and displays total chain probability
 * - Responsive design with horizontal scrolling for large chains
 * - Color-coded nodes by type (risk vs failure)
 * - Accessible with ARIA labels
 */

import React, { useMemo } from 'react';
import type { RiskChain, RiskChainNode, RiskChainEdge } from '../../services/riskService';

export interface FailureChainVisualizationProps {
  chains: RiskChain[];
  maxChainsToShow?: number;
  showProbabilities?: boolean;
  showTotalProbability?: boolean;
  className?: string;
}

interface LayoutNode extends RiskChainNode {
  x: number;
  y: number;
  level: number;
}

interface LayoutEdge extends RiskChainEdge {
  fromNode: LayoutNode;
  toNode: LayoutNode;
}

export function FailureChainVisualization({
  chains,
  maxChainsToShow = 5,
  showProbabilities = true,
  showTotalProbability = true,
  className = '',
}: FailureChainVisualizationProps): React.ReactElement {
  // Layout configuration
  const config = {
    nodeWidth: 180,
    nodeHeight: 80,
    horizontalSpacing: 100,
    verticalSpacing: 120,
    padding: 40,
  };

  // Calculate layout for a single chain
  const calculateChainLayout = (chain: RiskChain): { nodes: LayoutNode[]; edges: LayoutEdge[] } => {
    // Build adjacency map
    const adjacencyMap = new Map<string, string[]>();
    chain.edges.forEach(edge => {
      if (!adjacencyMap.has(edge.from_id)) {
        adjacencyMap.set(edge.from_id, []);
      }
      adjacencyMap.get(edge.from_id)!.push(edge.to_id);
    });

    // Find root node (node with no incoming edges)
    const hasIncoming = new Set(chain.edges.map(e => e.to_id));
    const rootNode = chain.nodes.find(n => !hasIncoming.has(n.id));
    
    if (!rootNode) {
      // Fallback: use first node
      return { nodes: [], edges: [] };
    }

    // BFS to assign levels
    const levels = new Map<string, number>();
    const queue: Array<{ id: string; level: number }> = [{ id: rootNode.id, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      
      visited.add(id);
      levels.set(id, level);

      const children = adjacencyMap.get(id) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 });
        }
      });
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, RiskChainNode[]>();
    chain.nodes.forEach(node => {
      const level = levels.get(node.id) ?? 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    // Calculate positions
    const layoutNodes: LayoutNode[] = [];
    nodesByLevel.forEach((nodesAtLevel, level) => {
      const levelHeight = nodesAtLevel.length * (config.nodeHeight + config.verticalSpacing);
      const startY = -levelHeight / 2;

      nodesAtLevel.forEach((node, index) => {
        layoutNodes.push({
          ...node,
          x: config.padding + level * (config.nodeWidth + config.horizontalSpacing),
          y: config.padding + startY + index * (config.nodeHeight + config.verticalSpacing),
          level,
        });
      });
    });

    // Create layout edges
    const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));
    const layoutEdges: LayoutEdge[] = chain.edges
      .map(edge => {
        const fromNode = nodeMap.get(edge.from_id);
        const toNode = nodeMap.get(edge.to_id);
        if (!fromNode || !toNode) return null;
        return {
          ...edge,
          fromNode,
          toNode,
        };
      })
      .filter((e): e is LayoutEdge => e !== null);

    return { nodes: layoutNodes, edges: layoutEdges };
  };

  // Calculate layouts for all chains
  const chainLayouts = useMemo(() => {
    return chains.slice(0, maxChainsToShow).map(chain => ({
      chain,
      layout: calculateChainLayout(chain),
    }));
  }, [chains, maxChainsToShow]);

  // Calculate SVG dimensions for each chain
  const getChainDimensions = (layout: { nodes: LayoutNode[]; edges: LayoutEdge[] }) => {
    if (layout.nodes.length === 0) {
      return { width: 400, height: 200 };
    }

    const maxX = Math.max(...layout.nodes.map(n => n.x + config.nodeWidth));
    const maxY = Math.max(...layout.nodes.map(n => n.y + config.nodeHeight));
    const minY = Math.min(...layout.nodes.map(n => n.y));

    return {
      width: maxX + config.padding,
      height: maxY - minY + config.nodeHeight + config.padding * 2,
    };
  };

  // Render a single node
  const renderNode = (node: LayoutNode) => {
    const isRisk = node.type === 'Risk' || node.type === 'risk';
    const color = isRisk ? '#3b82f6' : '#ef4444'; // blue for risk, red for failure
    const textColor = '#ffffff';

    return (
      <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
        <rect
          width={config.nodeWidth}
          height={config.nodeHeight}
          rx="8"
          fill={color}
          stroke="#1e293b"
          strokeWidth="2"
          className="chain-node"
        />
        <foreignObject
          width={config.nodeWidth}
          height={config.nodeHeight}
          className="node-content"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px',
              color: textColor,
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.2',
              }}
              title={node.title || node.description}
            >
              {node.title || node.description || `${node.type} ${node.id.substring(0, 8)}`}
            </div>
            {node.rpn && (
              <div style={{ fontSize: '0.625rem', marginTop: '4px', opacity: 0.9 }}>
                RPN: {node.rpn}
              </div>
            )}
            {node.severity && (
              <div style={{ fontSize: '0.625rem', opacity: 0.9 }}>
                Severity: {node.severity}
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  };

  // Render a single edge
  const renderEdge = (edge: LayoutEdge, index: number) => {
    const { fromNode, toNode, probability } = edge;
    
    // Calculate connection points (right side of from node to left side of to node)
    const x1 = fromNode.x + config.nodeWidth;
    const y1 = fromNode.y + config.nodeHeight / 2;
    const x2 = toNode.x;
    const y2 = toNode.y + config.nodeHeight / 2;

    // Create curved path
    const midX = (x1 + x2) / 2;
    const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

    // Calculate label position
    const labelX = midX;
    const labelY = (y1 + y2) / 2;

    return (
      <g key={`edge-${index}`} className="chain-edge">
        <path
          d={path}
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        {showProbabilities && (
          <g transform={`translate(${labelX}, ${labelY})`}>
            <rect
              x="-25"
              y="-12"
              width="50"
              height="24"
              rx="4"
              fill="#ffffff"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
              fill="#1e293b"
            >
              {(probability * 100).toFixed(0)}%
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render a single chain
  const renderChain = (chainData: { chain: RiskChain; layout: { nodes: LayoutNode[]; edges: LayoutEdge[] } }, index: number) => {
    const { chain, layout } = chainData;
    const dimensions = getChainDimensions(layout);

    if (layout.nodes.length === 0) {
      return (
        <div key={index} className="chain-container empty">
          <div className="chain-header">
            <h3 className="chain-title">Chain {index + 1}</h3>
          </div>
          <div className="empty-chain">
            <p>No nodes in this chain</p>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="chain-container">
        <div className="chain-header">
          <h3 className="chain-title">Chain {index + 1}</h3>
          {showTotalProbability && (
            <div className="chain-probability">
              <span className="probability-label">Total Probability:</span>
              <span className="probability-value">
                {(chain.total_probability * 100).toFixed(1)}%
              </span>
            </div>
          )}
          <div className="chain-info">
            <span className="info-item">Length: {chain.chain_length}</span>
            <span className="info-item">Nodes: {layout.nodes.length}</span>
          </div>
        </div>
        
        <div className="chain-visualization">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="chain-svg"
            role="img"
            aria-label={`Failure chain ${index + 1} with ${layout.nodes.length} nodes and total probability ${(chain.total_probability * 100).toFixed(1)}%`}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
              </marker>
            </defs>
            
            {/* Render edges first (so they appear behind nodes) */}
            {layout.edges.map((edge, edgeIndex) => renderEdge(edge, edgeIndex))}
            
            {/* Render nodes */}
            {layout.nodes.map(node => renderNode(node))}
          </svg>
        </div>
      </div>
    );
  };

  if (chains.length === 0) {
    return (
      <div className={`failure-chain-visualization ${className}`}>
        <div className="empty-state">
          <p>No failure chains found</p>
          <p className="hint">
            Failure chains show how risks propagate and lead to failures with probability calculations.
          </p>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`failure-chain-visualization ${className}`}>
      <div className="visualization-header">
        <h2 className="visualization-title">Failure Chain Analysis</h2>
        <p className="visualization-description">
          Showing {Math.min(chains.length, maxChainsToShow)} of {chains.length} failure chain{chains.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-color risk" />
          <span className="legend-label">Risk Node</span>
        </div>
        <div className="legend-item">
          <div className="legend-color failure" />
          <span className="legend-label">Failure Node</span>
        </div>
        {showProbabilities && (
          <div className="legend-item">
            <div className="legend-symbol">→</div>
            <span className="legend-label">Probability of occurrence</span>
          </div>
        )}
      </div>

      <div className="chains-list">
        {chainLayouts.map((chainData, index) => renderChain(chainData, index))}
      </div>

      {chains.length > maxChainsToShow && (
        <div className="more-chains-notice">
          <p>
            {chains.length - maxChainsToShow} more chain{chains.length - maxChainsToShow !== 1 ? 's' : ''} not shown
          </p>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .failure-chain-visualization {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .visualization-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .visualization-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .visualization-description {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
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
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid #1e293b;
  }

  .legend-color.risk {
    background: #3b82f6;
  }

  .legend-color.failure {
    background: #ef4444;
  }

  .legend-symbol {
    font-size: 1.25rem;
    font-weight: 600;
    color: #64748b;
  }

  .legend-label {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }

  .chains-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .chain-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .chain-container.empty {
    padding: 2rem;
  }

  .chain-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .chain-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .chain-probability {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 6px;
    color: white;
  }

  .probability-label {
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.9;
  }

  .probability-value {
    font-size: 1rem;
    font-weight: 700;
  }

  .chain-info {
    display: flex;
    gap: 1rem;
    margin-left: auto;
  }

  .info-item {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .chain-visualization {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 1rem 0;
  }

  .chain-svg {
    display: block;
    min-width: 100%;
  }

  .chain-node {
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .chain-node:hover {
    filter: brightness(1.1);
    stroke-width: 3;
  }

  .chain-edge path {
    transition: all 0.2s ease;
  }

  .chain-edge:hover path {
    stroke: #1e293b;
    stroke-width: 3;
  }

  .empty-chain,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 6px;
  }

  .empty-chain p,
  .empty-state p {
    margin: 0 0 0.5rem 0;
    color: #6b7280;
  }

  .empty-state .hint {
    font-size: 0.875rem;
    font-style: italic;
  }

  .more-chains-notice {
    padding: 1rem;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 6px;
    text-align: center;
  }

  .more-chains-notice p {
    margin: 0;
    font-size: 0.875rem;
    color: #92400e;
    font-weight: 500;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .failure-chain-visualization {
      padding: 1rem;
    }

    .chain-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .chain-info {
      margin-left: 0;
    }

    .legend {
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .chain-node,
    .chain-edge path {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .failure-chain-visualization {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .chain-visualization {
      overflow: visible;
    }

    .more-chains-notice {
      display: none;
    }
  }
`;

export default FailureChainVisualization;

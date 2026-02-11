/**
 * GraphView2D Component
 * 2D graph visualization using @xyflow/react (react-flow)
 * Renders nodes and edges from the graphStore with pan, zoom, and node click interactivity
 * Supports creating relationships via drag-and-drop with relationship type selection
 * 
 * State Synchronization:
 * - Uses filtered nodes/edges from graphStore based on nodeTypeFilter
 * - Updates viewport state (zoom/pan) in graphStore for synchronization with 3D view
 * - Node positions are synchronized via graphStore.updateNodePosition
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  type NodeTypes,
  type Viewport,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore, type GraphNodeData } from '../../stores/graphStore';
import type { GraphEdge } from '../../services/graphService';
import {
  RelationshipTypeDialog,
  type PendingConnection,
  type RelationshipType,
} from './RelationshipTypeDialog';
import { LayoutEngine, type LayoutNode, type LayoutEdge } from '../../services/layout/LayoutEngine';

// Node styling constants
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  requirement: { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  task: { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  test: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' },
  risk: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c' },
  document: { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  default: { bg: '#fafafa', border: '#9e9e9e', text: '#424242' },
};

const NODE_TYPE_LABELS: Record<string, string> = {
  requirement: 'REQ',
  task: 'TASK',
  test: 'TEST',
  risk: 'RISK',
  document: 'DOC',
};

// Base styles for custom nodes
const baseNodeStyle: React.CSSProperties = {
  padding: '10px 15px',
  borderRadius: '8px',
  borderWidth: '2px',
  borderStyle: 'solid',
  minWidth: '150px',
  maxWidth: '250px',
  fontSize: '12px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

/**
 * Custom node component for Requirement type
 */
const RequirementNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.requirement;
  const isSigned = data?.properties?.is_signed === true;

  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: colors.bg,
        borderColor: selected ? '#000' : colors.border,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '10px', opacity: 0.7 }}>
          {NODE_TYPE_LABELS.requirement}
        </span>
        {isSigned && (
          <span style={{ fontSize: '10px', color: '#388e3c' }} title="Signed">
            ✓
          </span>
        )}
      </div>
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data?.label || 'Untitled'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Custom node component for Task type
 */
const TaskNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.task;
  const status = data?.properties?.status as string | undefined;

  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: colors.bg,
        borderColor: selected ? '#000' : colors.border,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '10px', opacity: 0.7 }}>
          {NODE_TYPE_LABELS.task}
        </span>
        {status && (
          <span style={{ fontSize: '10px', opacity: 0.8 }}>{status}</span>
        )}
      </div>
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data?.label || 'Untitled'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Custom node component for Test type
 */
const TestNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.test;
  const status = data?.properties?.status as string | undefined;

  const statusIcon = useMemo(() => {
    if (status === 'passed') return '✓';
    if (status === 'failed') return '✗';
    if (status === 'blocked') return '⊘';
    return null;
  }, [status]);

  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: colors.bg,
        borderColor: selected ? '#000' : colors.border,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '10px', opacity: 0.7 }}>
          {NODE_TYPE_LABELS.test}
        </span>
        {statusIcon && (
          <span
            style={{
              fontSize: '10px',
              color: status === 'passed' ? '#388e3c' : status === 'failed' ? '#d32f2f' : '#757575',
            }}
          >
            {statusIcon}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data?.label || 'Untitled'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Custom node component for Risk type
 */
const RiskNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.risk;
  const rpn = data?.properties?.rpn as number | undefined;

  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: colors.bg,
        borderColor: selected ? '#000' : colors.border,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '10px', opacity: 0.7 }}>
          {NODE_TYPE_LABELS.risk}
        </span>
        {rpn !== undefined && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: rpn > 100 ? '#d32f2f' : rpn > 50 ? '#f57c00' : '#388e3c',
            }}
            title="Risk Priority Number"
          >
            RPN: {rpn}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data?.label || 'Untitled'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Default node component for other types (document, etc.)
 */
const DefaultNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const nodeType = data?.type || 'default';
  const colors = NODE_COLORS[nodeType] || NODE_COLORS.default;
  const typeLabel = NODE_TYPE_LABELS[nodeType] || nodeType.toUpperCase();

  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: colors.bg,
        borderColor: selected ? '#000' : colors.border,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '10px', opacity: 0.7 }}>{typeLabel}</span>
      </div>
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data?.label || 'Untitled'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Register custom node types
const nodeTypes: NodeTypes = {
  requirement: RequirementNode,
  task: TaskNode,
  test: TestNode,
  risk: RiskNode,
  document: DefaultNode,
  default: DefaultNode,
};

// MiniMap node color function
const getMinimapNodeColor = (node: Node<GraphNodeData>): string => {
  const nodeType = node.data?.type || node.type || 'default';
  return NODE_COLORS[nodeType]?.border || NODE_COLORS.default.border;
};

export interface GraphView2DProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Whether to show the MiniMap */
  showMiniMap?: boolean;
  /** Whether to show the Controls */
  showControls?: boolean;
  /** Whether to show the Background */
  showBackground?: boolean;
  /** Background variant */
  backgroundVariant?: BackgroundVariant;
  /** Callback when a connection is made */
  onConnectionMade?: (sourceId: string, targetId: string, type: string) => void;
  /** Render prop for toolbar content that needs ReactFlow context (e.g., export button) */
  renderToolbarContent?: () => React.ReactNode;
  /** Whether connection mode is active */
  isConnectionMode?: boolean;
  /** Callback when a node is clicked in connection mode */
  onNodeClickInConnectionMode?: (nodeId: string) => void;
  /** Source node ID in connection mode */
  connectionSource?: string | null;
  /** Target node ID in connection mode */
  connectionTarget?: string | null;
}

/**
 * GraphView2D - 2D graph visualization component
 * Uses @xyflow/react to render an interactive graph with custom node types
 * Supports creating relationships via drag-and-drop with a type selection dialog
 */
export const GraphView2D: React.FC<GraphView2DProps> = ({
  className,
  style,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  backgroundVariant = BackgroundVariant.Dots,
  onConnectionMade,
  renderToolbarContent,
  isConnectionMode = false,
  onNodeClickInConnectionMode,
  connectionSource = null,
  connectionTarget = null,
}) => {
  return (
    <ReactFlowProvider>
      <GraphView2DInner
        className={className}
        style={style}
        showMiniMap={showMiniMap}
        showControls={showControls}
        showBackground={showBackground}
        backgroundVariant={backgroundVariant}
        onConnectionMade={onConnectionMade}
        renderToolbarContent={renderToolbarContent}
        isConnectionMode={isConnectionMode}
        onNodeClickInConnectionMode={onNodeClickInConnectionMode}
        connectionSource={connectionSource}
        connectionTarget={connectionTarget}
      />
    </ReactFlowProvider>
  );
};

/**
 * Inner component that has access to ReactFlow context
 * Handles state synchronization between graphStore and react-flow
 */
const GraphView2DInner: React.FC<GraphView2DProps> = ({
  className,
  style,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  backgroundVariant = BackgroundVariant.Dots,
  onConnectionMade,
  renderToolbarContent,
  isConnectionMode = false,
  onNodeClickInConnectionMode,
  connectionSource: _connectionSource = null,
  connectionTarget: _connectionTarget = null,
}) => {
  // Get state and actions from graphStore
  const {
    selectNode,
    selectRelationship,
    createRelationship,
    updateNodePosition,
    setViewport,
    getFilteredNodes,
    getFilteredEdges,
    viewport,
    isLoading,
    isCreatingRelationship,
    isViewTransitioning,
    error,
    layoutAlgorithm,
  } = useGraphStore();

  // Get filtered nodes and edges for rendering
  const storeNodes = getFilteredNodes() || [];
  const storeEdges = getFilteredEdges() || [];

  console.log('[GraphView2D] Rendering with nodes:', storeNodes.length, 'edges:', storeEdges.length);
  if (storeNodes.length > 0) {
    console.log('[GraphView2D] First node:', storeNodes[0]);
  }

  // Get react-flow instance for viewport synchronization
  const reactFlowInstance = useReactFlow();

  // Local state for react-flow (allows smooth dragging)
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Store the React Flow instance
  const [rfInstance, setRfInstance] = React.useState<any>(null);

  // Layout engine instance
  const layoutEngineRef = useRef<LayoutEngine | null>(null);
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);

  // Initialize layout engine
  useEffect(() => {
    if (!layoutEngineRef.current) {
      layoutEngineRef.current = new LayoutEngine({
        animationDuration: 500,
        preserveSelection: true,
      });
    }
  }, []);

  // Sync store nodes/edges to flow nodes/edges when they change
  // Use JSON.stringify for deep comparison to avoid infinite loops
  const storeNodesJson = JSON.stringify(storeNodes.map(n => n.id));
  const storeEdgesJson = JSON.stringify(storeEdges.map(e => e.id));
  
  useEffect(() => {
    console.log('[GraphView2D] Syncing storeNodes to flowNodes:', storeNodes.length);
    if (storeNodes.length > 0) {
      console.log('[GraphView2D] Sample node being synced:', JSON.stringify(storeNodes[0], null, 2));
    }
    setFlowNodes(storeNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeNodesJson, setFlowNodes]);

  useEffect(() => {
    console.log('[GraphView2D] Syncing storeEdges to flowEdges:', storeEdges.length);
    setFlowEdges(storeEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeEdgesJson, setFlowEdges]);

  // Fit view when nodes are loaded
  useEffect(() => {
    console.log('[GraphView2D] fitView useEffect triggered', {
      hasRfInstance: !!rfInstance,
      flowNodesLength: flowNodes.length,
      hasNodes: flowNodes.length > 0
    });
    
    if (rfInstance && flowNodes.length > 0) {
      console.log('[GraphView2D] Nodes loaded, calling fitView');
      console.log('[GraphView2D] Node count:', flowNodes.length);
      console.log('[GraphView2D] First node position:', flowNodes[0].position);
      
      // Try multiple times with different delays to ensure it works
      setTimeout(() => {
        console.log('[GraphView2D] Calling fitView (attempt 1)');
        rfInstance.fitView({ padding: 0.2, duration: 200 });
        console.log('[GraphView2D] fitView called, viewport:', rfInstance.getViewport());
      }, 50);
      
      setTimeout(() => {
        console.log('[GraphView2D] Calling fitView (attempt 2)');
        rfInstance.fitView({ padding: 0.2, duration: 200 });
        console.log('[GraphView2D] fitView called, viewport:', rfInstance.getViewport());
      }, 300);
      
      setTimeout(() => {
        console.log('[GraphView2D] Calling fitView (attempt 3)');
        rfInstance.fitView({ padding: 0.2, duration: 200 });
        console.log('[GraphView2D] fitView called, viewport:', rfInstance.getViewport());
      }, 600);
    }
  }, [rfInstance, flowNodes.length]);

  // Apply layout when algorithm changes
  useEffect(() => {
    const applyLayout = async () => {
      if (!layoutEngineRef.current || !rfInstance || flowNodes.length === 0 || isApplyingLayout) {
        return;
      }

      console.log('[GraphView2D] Applying layout:', layoutAlgorithm);
      setIsApplyingLayout(true);

      try {
        // Convert flow nodes to layout nodes
        const layoutNodes: LayoutNode[] = flowNodes.map((node) => ({
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        }));

        // Convert flow edges to layout edges
        const layoutEdges: LayoutEdge[] = flowEdges.map((edge) => ({
          source: edge.source,
          target: edge.target,
        }));

        // Get current positions
        const currentPositions = new Map<string, { x: number; y: number }>();
        flowNodes.forEach((node) => {
          currentPositions.set(node.id, { x: node.position.x, y: node.position.y });
        });

        // Apply layout with animation
        await layoutEngineRef.current.transitionToLayout(
          layoutNodes,
          layoutEdges,
          currentPositions,
          { algorithm: layoutAlgorithm },
          (positions) => {
            // Update node positions during animation
            const updatedNodes = flowNodes.map((node) => {
              const newPos = positions.get(node.id);
              if (newPos) {
                return {
                  ...node,
                  position: { x: newPos.x, y: newPos.y },
                };
              }
              return node;
            });
            setFlowNodes(updatedNodes);
          }
        );

        // Update store with final positions
        const finalPositions = layoutEngineRef.current.calculateLayout(
          layoutNodes,
          layoutEdges,
          { algorithm: layoutAlgorithm }
        );
        finalPositions.forEach((pos, nodeId) => {
          updateNodePosition(nodeId, pos);
        });

        // Fit view after layout
        setTimeout(() => {
          rfInstance.fitView({ padding: 0.2, duration: 300 });
        }, 100);

        console.log('[GraphView2D] Layout applied successfully');
      } catch (err) {
        console.error('[GraphView2D] Failed to apply layout:', err);
      } finally {
        setIsApplyingLayout(false);
      }
    };

    applyLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutAlgorithm, rfInstance]);

  // State for relationship type dialog
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Note: Graph data is loaded by the parent GraphExplorer component
  // No need to load here to avoid duplicate API calls

  // Note: React Flow's useNodesState and useEdgesState automatically sync with storeNodes/storeEdges
  // No manual synchronization needed to avoid infinite loops

  // Sync viewport from store when switching from 3D to 2D view
  useEffect(() => {
    if (!isViewTransitioning && reactFlowInstance) {
      // Apply stored viewport state when view becomes active
      const currentViewport = reactFlowInstance.getViewport();
      if (Math.abs(currentViewport.zoom - viewport.zoom) > 0.01 ||
          Math.abs(currentViewport.x - viewport.panX) > 1 ||
          Math.abs(currentViewport.y - viewport.panY) > 1) {
        reactFlowInstance.setViewport({
          x: viewport.panX,
          y: viewport.panY,
          zoom: viewport.zoom,
        });
      }
    }
  }, [isViewTransitioning, viewport, reactFlowInstance]);

  // Handle viewport changes and sync to store
  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, newViewport: Viewport) => {
      // Update store with new viewport state for synchronization
      setViewport({
        zoom: newViewport.zoom,
        panX: newViewport.x,
        panY: newViewport.y,
      });
    },
    [setViewport]
  );

  // Handle node position changes (for drag)
  const handleNodesChange: OnNodesChange<Node<GraphNodeData>> = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Update store with new positions after drag ends
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [onNodesChange, updateNodePosition]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange<Edge> = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle new connections (create relationship)
  // Opens the relationship type dialog instead of creating directly
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Find source and target node labels for display
        const sourceNode = flowNodes.find((n) => n.id === connection.source);
        const targetNode = flowNodes.find((n) => n.id === connection.target);

        // Set pending connection and open dialog
        setPendingConnection({
          sourceId: connection.source,
          targetId: connection.target,
          sourceLabel: sourceNode?.data?.label,
          targetLabel: targetNode?.data?.label,
        });
        setIsDialogOpen(true);
      }
    },
    [flowNodes]
  );

  // Handle relationship type confirmation from dialog
  const handleRelationshipConfirm = useCallback(
    async (sourceId: string, targetId: string, type: RelationshipType) => {
      try {
        // Create relationship in the store
        await createRelationship(sourceId, targetId, type);

        // Close dialog
        setIsDialogOpen(false);
        setPendingConnection(null);

        // Notify parent if callback provided
        if (onConnectionMade) {
          onConnectionMade(sourceId, targetId, type);
        }
      } catch (err) {
        // Error is handled by the store, but we keep the dialog open
        // so the user can see the error and retry or cancel
        console.error('Failed to create relationship:', err);
      }
    },
    [createRelationship, onConnectionMade]
  );

  // Handle dialog cancel
  const handleDialogCancel = useCallback(() => {
    setIsDialogOpen(false);
    setPendingConnection(null);
  }, []);

  // Handle node click (select node)
  const handleNodeClick: NodeMouseHandler<Node<GraphNodeData>> = useCallback(
    (_event, node) => {
      // If in connection mode, handle node selection for connection
      if (isConnectionMode && onNodeClickInConnectionMode) {
        onNodeClickInConnectionMode(node.id);
      } else {
        // Normal mode - select node for editing
        selectNode(node.id);
      }
    },
    [isConnectionMode, onNodeClickInConnectionMode, selectNode]
  );

  // Handle edge click (select relationship)
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Find the full edge data from store
      const fullEdge = storeEdges.find((e) => e.id === edge.id);
      if (fullEdge) {
        // Convert react-flow Edge to GraphEdge format
        const graphEdge: GraphEdge = {
          id: fullEdge.id,
          source: fullEdge.source,
          target: fullEdge.target,
          type: fullEdge.type || 'default',
          label: typeof fullEdge.label === 'string' ? fullEdge.label : undefined,
          properties: fullEdge.data,
        };
        selectRelationship(graphEdge);
      }
    },
    [storeEdges, selectRelationship]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectNode(null);
    selectRelationship(null);
  }, [selectNode, selectRelationship]);

  // Container styles - ensure explicit dimensions for React Flow
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: '500px',
    position: 'relative',
    ...style,
  };

  // Loading state
  if (isLoading && flowNodes.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading graph...</div>
      </div>
    );
  }

  // Error state
  if (error && flowNodes.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#d32f2f' }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div 
      className={`${className} ${isConnectionMode ? 'connection-mode-active' : ''}`} 
      style={containerStyle}
    >
      {/* Connection mode indicator */}
      {isConnectionMode && (
        <div 
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            padding: '8px 12px',
            background: '#667eea',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          🔗 Connection Mode Active
        </div>
      )}
      
      {/* Toolbar content slot for components that need ReactFlow context */}
      {renderToolbarContent && (
        <div className="graph-toolbar-slot" style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          {renderToolbarContent()}
        </div>
      )}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onMoveEnd={handleMoveEnd}
        onInit={(instance) => {
          console.log('[GraphView2D] ReactFlow initialized');
          console.log('[GraphView2D] Initial nodes:', flowNodes.length);
          console.log('[GraphView2D] Viewport:', instance.getViewport());
          // Store the instance for later use
          setRfInstance(instance);
          
          // Try to fit view immediately if we have nodes
          if (flowNodes.length > 0) {
            console.log('[GraphView2D] Calling fitView on init (has nodes)');
            setTimeout(() => {
              instance.fitView({ padding: 0.2, duration: 200 });
              console.log('[GraphView2D] fitView on init complete, viewport:', instance.getViewport());
            }, 100);
          } else {
            console.log('[GraphView2D] No nodes yet on init, will wait for useEffect');
          }
        }}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#9e9e9e', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        {showControls && <Controls />}
        {showMiniMap && (
          <MiniMap
            nodeColor={getMinimapNodeColor}
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
        )}
        {showBackground && (
          <Background variant={backgroundVariant} gap={12} size={1} color="#e0e0e0" />
        )}
      </ReactFlow>

      {/* Relationship Type Dialog */}
      <RelationshipTypeDialog
        isOpen={isDialogOpen}
        connection={pendingConnection}
        onConfirm={handleRelationshipConfirm}
        onCancel={handleDialogCancel}
        isLoading={isCreatingRelationship}
      />
    </div>
  );
};

export default GraphView2D;

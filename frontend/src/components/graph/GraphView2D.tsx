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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  RelationshipTypeDialog,
  type PendingConnection,
  type RelationshipType,
} from './RelationshipTypeDialog';

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
  const isSigned = data.properties?.is_signed === true;

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
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Custom node component for Task type
 */
const TaskNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.task;
  const status = data.properties?.status as string | undefined;

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
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Custom node component for Test type
 */
const TestNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.test;
  const status = data.properties?.status as string | undefined;

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
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Custom node component for Risk type
 */
const RiskNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.risk;
  const rpn = data.properties?.rpn as number | undefined;

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
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

/**
 * Default node component for other types (document, etc.)
 */
const DefaultNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const nodeType = data.type || 'default';
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
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data.label}</div>
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
}) => {
  // Get state and actions from graphStore
  const {
    loadGraph,
    selectNode,
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
  } = useGraphStore();

  // Get filtered nodes and edges for rendering
  const storeNodes = getFilteredNodes() || [];
  const storeEdges = getFilteredEdges() || [];

  // Get react-flow instance for viewport synchronization
  const reactFlowInstance = useReactFlow();

  // Local state for react-flow (allows smooth dragging)
  const [flowNodes, , onNodesChange] = useNodesState<Node<GraphNodeData>>(storeNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState<Edge>(storeEdges);

  // State for relationship type dialog
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load graph data on mount
  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

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
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: '400px',
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
    <div className={className} style={containerStyle}>
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
        onPaneClick={handlePaneClick}
        onMoveEnd={handleMoveEnd}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
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

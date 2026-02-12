# Design Document: Graph Visualization Improvements (2D)

## Overview

This design document outlines the technical approach for enhancing the 2D graph visualization in the RxDx project management system. The improvements focus on five key areas:

1. **Advanced Layout Algorithms** - Multiple layout options (force-directed, hierarchical, circular, grid) with improved collision detection
2. **Type-Specific Node Rendering** - Distinctive shapes and icons for each node type with concentric circle progress indicators
3. **Enhanced Edge Rendering** - Curved edges with proper connection points, directional arrows, and edge bundling
4. **Visual Enhancements** - Shadows, hover effects, smooth animations, improved minimap, and dark mode support
5. **Performance Optimizations** - Level-of-detail rendering, canvas mode for large graphs, viewport culling, and progressive rendering

The design builds upon the existing @xyflow/react implementation in `GraphView2D.tsx` and extends the graph store in `graphStore.ts` to support new features while maintaining backward compatibility.

### Key Design Decisions

- **Extend existing React Flow implementation** rather than replacing it to minimize breaking changes
- **Custom node components** for each type to enable shape-specific rendering and progress indicators
- **SVG for small graphs (<100 nodes)**, Canvas for large graphs (≥100 nodes) to balance quality and performance
- **Client-side progress calculation** with caching to avoid excessive backend queries
- **CSS-based animations** for smooth transitions and visual feedback
- **Local storage** for user preference persistence

## Architecture

### Component Structure

```
GraphView2D (Container)
├── ReactFlowProvider
│   └── GraphView2DInner
│       ├── ReactFlow
│       │   ├── Custom Node Components
│       │   │   ├── UnifiedNode (base component for all types)
│       │   │   │   ├── CircularBackground
│       │   │   │   ├── RoundedRectangle (content box)
│       │   │   │   ├── TypeIcon (above box)
│       │   │   │   ├── TypeLabel (text below icon)
│       │   │   │   ├── StatusIcon (below box)
│       │   │   │   ├── PriorityBadge (upper right)
│       │   │   │   └── DialGauges (around circle)
│       │   │   ├── RequirementNode (extends UnifiedNode)
│       │   │   ├── TaskNode (extends UnifiedNode)
│       │   │   ├── TestNode (extends UnifiedNode)
│       │   │   ├── RiskNode (extends UnifiedNode)
│       │   │   ├── DocumentNode (extends UnifiedNode)
│       │   │   ├── WorkpackageNode (extends UnifiedNode)
│       │   │   └── ProjectNode (extends UnifiedNode)
│       │   ├── Custom Edge Components
│       │   │   ├── CurvedEdge (Bezier curves)
│       │   │   └── BundledEdge (grouped edges)
│       │   ├── Controls (zoom, fit, layout selector)
│       │   ├── MiniMap (enhanced with shapes)
│       │   └── Background
│       ├── LayoutEngine (force/hierarchical/circular/grid)
│       ├── ProgressCalculator (hierarchical completion)
│       └── RenderingOptimizer (LOD, culling, progressive)
└── LayoutControls (UI for algorithm selection)
```

### Data Flow

```
Backend Graph API
    ↓
graphService.getVisualization()
    ↓
graphStore (Zustand)
    ↓
GraphView2D
    ↓
LayoutEngine → Node Positions
    ↓
ProgressCalculator → Completion %
    ↓
ReactFlow → Render Nodes & Edges
    ↓
User Interactions → graphStore updates
```

### State Management

The graph store (`graphStore.ts`) will be extended with:

```typescript
interface GraphState {
  // Existing state...
  
  // New layout state
  layoutAlgorithm: 'force' | 'hierarchical' | 'circular' | 'grid';
  layoutConfig: LayoutConfig;
  
  // New rendering state
  renderingMode: 'svg' | 'canvas' | 'auto';
  levelOfDetail: 'full' | 'simplified' | 'minimal';
  
  // New progress state
  progressCache: Map<string, ProgressData>;
  progressCacheTimestamp: Map<string, number>;
  
  // New preference state
  edgeBundlingEnabled: boolean;
  animationsEnabled: boolean;
  darkModeEnabled: boolean;
}
```

## Components and Interfaces

### 1. Layout Engine

The layout engine provides multiple algorithms for node positioning.

#### Interface

```typescript
interface LayoutEngine {
  /**
   * Calculate node positions using the selected algorithm
   */
  calculateLayout(
    nodes: Node[],
    edges: Edge[],
    algorithm: LayoutAlgorithm,
    config: LayoutConfig
  ): Map<string, Position>;
  
  /**
   * Apply collision detection to prevent overlap
   */
  applyCollisionDetection(
    positions: Map<string, Position>,
    nodes: Node[],
    minSpacing: number
  ): Map<string, Position>;
  
  /**
   * Animate transition between layouts
   */
  animateLayoutTransition(
    fromPositions: Map<string, Position>,
    toPositions: Map<string, Position>,
    duration: number
  ): void;
}

type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'grid';

interface LayoutConfig {
  // Force-directed config
  force?: {
    repulsionStrength: number;
    attractionStrength: number;
    idealEdgeLength: number;
    centerGravity: number;
    damping: number;
    useBarnesHut: boolean;
  };
  
  // Hierarchical config
  hierarchical?: {
    direction: 'TB' | 'BT' | 'LR' | 'RL';
    levelSeparation: number;
    nodeSeparation: number;
    treeSpacing: number;
  };
  
  // Circular config
  circular?: {
    radius: number;
    startAngle: number;
    endAngle: number;
  };
  
  // Grid config
  grid?: {
    columns: number;
    rowSpacing: number;
    columnSpacing: number;
  };
}
```

#### Implementation Details

**Force-Directed Layout** (existing, enhanced):
- Extend current Barnes-Hut implementation with collision detection
- Add quadtree-based spatial partitioning for O(n log n) collision checks
- Implement adaptive cooling schedule based on node movement

**Hierarchical Layout** (new):
- Use Sugiyama framework: layer assignment → crossing reduction → coordinate assignment
- Implement barycenter heuristic for crossing minimization
- Support multiple root nodes for forest structures

**Circular Layout** (new):
- Sort nodes by degree (high-degree nodes in center)
- Place nodes on concentric circles based on distance from center
- Optimize angular positions to minimize edge crossings

**Grid Layout** (new):
- Calculate optimal grid dimensions: columns = ceil(sqrt(nodeCount))
- Sort nodes by type and priority
- Place nodes left-to-right, top-to-bottom

### 2. Custom Node Components

All node types use a unified design with a base component that provides consistent structure.

#### Base Node Interface

```typescript
interface CustomNodeProps extends NodeProps<GraphNodeData> {
  data: GraphNodeData & {
    progress?: number;  // 0-100
    priority?: number;  // 1-5
    children?: string[];  // Child node IDs
    status?: string;  // Node status
    gauges?: GaugeDefinition[];  // Dial gauge configurations
  };
  selected: boolean;
  dragging?: boolean;
}

interface GaugeDefinition {
  id: string;
  label: string;
  value: number;  // Current value
  min: number;  // Minimum value
  max: number;  // Maximum value
  startAngle: number;  // Start angle in degrees (0 = top)
  endAngle: number;  // End angle in degrees
  color: string;  // Gauge color
  showValue: boolean;  // Whether to show numeric value
}
```

#### Unified Node Component

The base component that all node types extend:

```typescript
interface UnifiedNodeProps extends CustomNodeProps {
  typeIcon: React.ComponentType<IconProps>;
  typeName: string;
  statusIcon?: React.ComponentType<IconProps>;
  gauges?: GaugeDefinition[];
}

const UnifiedNode: React.FC<UnifiedNodeProps> = ({
  data,
  selected,
  typeIcon: TypeIcon,
  typeName,
  statusIcon: StatusIcon,
  gauges = [],
}) => {
  const circleRadius = 95;  // Radius of circular background
  const boxWidth = 150;
  const boxHeight = 60;
  
  return (
    <g>
      {/* Dial gauges (outermost) */}
      {gauges.map((gauge, index) => (
        <DialGauge
          key={gauge.id}
          {...gauge}
          radius={circleRadius + 8 + (index * 8)}
          strokeWidth={4}
        />
      ))}
      
      {/* Circular background */}
      <circle
        r={circleRadius}
        fill={NODE_COLORS[data.type]?.bg || NODE_COLORS.default.bg}
        stroke={selected ? '#000' : NODE_COLORS[data.type]?.border}
        strokeWidth={selected ? 3 : 2}
        opacity={0.9}
      />
      
      {/* Type icon (above box) */}
      <g transform={`translate(0, ${-boxHeight/2 - 25})`}>
        <TypeIcon size={20} color={NODE_COLORS[data.type]?.icon} />
        <text
          y={20}
          textAnchor="middle"
          fontSize={12}
          fill={NODE_COLORS[data.type]?.text}
        >
          {typeName}
        </text>
      </g>
      
      {/* Rounded rectangle content box */}
      <rect
        x={-boxWidth/2}
        y={-boxHeight/2}
        width={boxWidth}
        height={boxHeight}
        rx={8}
        ry={8}
        fill="white"
        stroke={NODE_COLORS[data.type]?.border}
        strokeWidth={2}
      />
      
      {/* Node label (inside box) */}
      <text
        y={0}
        textAnchor="middle"
        fontSize={14}
        fill="#333"
        style={{
          maxWidth: boxWidth - 20,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.label}
      </text>
      
      {/* Priority badge (upper right) */}
      {data.priority && (
        <g transform={`translate(${boxWidth/2 - 15}, ${-boxHeight/2 + 15})`}>
          <PriorityBadge priority={data.priority} />
        </g>
      )}
      
      {/* Status icon (below box) */}
      {StatusIcon && (
        <g transform={`translate(0, ${boxHeight/2 + 20})`}>
          <StatusIcon size={16} color={getStatusColor(data.status)} />
        </g>
      )}
    </g>
  );
};
```

#### Node Type Implementations

Each node type extends the unified component with type-specific configuration:

**TaskNode**:
```typescript
const TaskNode: React.FC<CustomNodeProps> = (props) => {
  const progress = useNodeProgress(props.data.id, props.data.properties?.done);
  
  const gauges: GaugeDefinition[] = [
    {
      id: 'progress',
      label: 'Progress',
      value: progress,
      min: 0,
      max: 100,
      startAngle: 0,
      endAngle: 360,
      color: '#388e3c',
      showValue: true,
    },
  ];
  
  return (
    <UnifiedNode
      {...props}
      typeIcon={TaskIcon}
      typeName="Task"
      statusIcon={getTaskStatusIcon(props.data.status)}
      gauges={gauges}
    />
  );
};
```

**RequirementNode**:
```typescript
const RequirementNode: React.FC<CustomNodeProps> = (props) => {
  const gauges: GaugeDefinition[] = [];
  
  // Add signed indicator as a gauge if applicable
  if (props.data.properties?.is_signed) {
    gauges.push({
      id: 'signed',
      label: 'Signed',
      value: 100,
      min: 0,
      max: 100,
      startAngle: 0,
      endAngle: 90,
      color: '#388e3c',
      showValue: false,
    });
  }
  
  return (
    <UnifiedNode
      {...props}
      typeIcon={RequirementIcon}
      typeName="Requirement"
      statusIcon={getRequirementStatusIcon(props.data.status)}
      gauges={gauges}
    />
  );
};
```

**TestNode**:
```typescript
const TestNode: React.FC<CustomNodeProps> = (props) => {
  return (
    <UnifiedNode
      {...props}
      typeIcon={TestIcon}
      typeName="Test"
      statusIcon={getTestStatusIcon(props.data.status)}
    />
  );
};
```

**RiskNode**:
```typescript
const RiskNode: React.FC<CustomNodeProps> = (props) => {
  const rpn = props.data.properties?.rpn || 0;
  
  const gauges: GaugeDefinition[] = [
    {
      id: 'rpn',
      label: 'RPN',
      value: rpn,
      min: 0,
      max: 1000,
      startAngle: 0,
      endAngle: 270,
      color: getRPNColor(rpn),
      showValue: true,
    },
  ];
  
  return (
    <UnifiedNode
      {...props}
      typeIcon={WarningIcon}
      typeName="Risk"
      statusIcon={getRiskStatusIcon(props.data.status)}
      gauges={gauges}
    />
  );
};
```

**DocumentNode**:
```typescript
const DocumentNode: React.FC<CustomNodeProps> = (props) => {
  return (
    <UnifiedNode
      {...props}
      typeIcon={DocumentIcon}
      typeName="Document"
      statusIcon={getDocumentStatusIcon(props.data.status)}
    />
  );
};
```

**WorkpackageNode**:
```typescript
const WorkpackageNode: React.FC<CustomNodeProps> = (props) => {
  const progress = useHierarchicalProgress(props.data.id, props.data.children);
  
  const gauges: GaugeDefinition[] = [
    {
      id: 'progress',
      label: 'Completion',
      value: progress,
      min: 0,
      max: 100,
      startAngle: 0,
      endAngle: 360,
      color: '#388e3c',
      showValue: true,
    },
  ];
  
  return (
    <UnifiedNode
      {...props}
      typeIcon={FolderIcon}
      typeName="Workpackage"
      statusIcon={getWorkpackageStatusIcon(props.data.status)}
      gauges={gauges}
    />
  );
};
```

**ProjectNode**:
```typescript
const ProjectNode: React.FC<CustomNodeProps> = (props) => {
  const progress = useHierarchicalProgress(props.data.id, props.data.children);
  
  const gauges: GaugeDefinition[] = [
    {
      id: 'progress',
      label: 'Overall Progress',
      value: progress,
      min: 0,
      max: 100,
      startAngle: 0,
      endAngle: 360,
      color: '#1976d2',
      showValue: true,
    },
  ];
  
  return (
    <UnifiedNode
      {...props}
      typeIcon={ProjectIcon}
      typeName="Project"
      statusIcon={getProjectStatusIcon(props.data.status)}
      gauges={gauges}
    />
  );
};
```

### 3. Progress Calculation System

The progress calculator computes completion percentages for container nodes.

#### Interface

```typescript
interface ProgressCalculator {
  /**
   * Calculate progress for a single node
   */
  calculateNodeProgress(
    nodeId: string,
    nodeType: string,
    properties: Record<string, unknown>
  ): number;
  
  /**
   * Calculate hierarchical progress for container nodes
   */
  calculateHierarchicalProgress(
    nodeId: string,
    childNodeIds: string[]
  ): Promise<number>;
  
  /**
   * Get cached progress or calculate if expired
   */
  getProgress(nodeId: string): Promise<number>;
  
  /**
   * Invalidate cache for node and ancestors
   */
  invalidateCache(nodeId: string): void;
}

interface ProgressData {
  percentage: number;
  completedCount: number;
  totalCount: number;
  timestamp: number;
}
```

#### Implementation

```typescript
class ProgressCalculatorImpl implements ProgressCalculator {
  private cache: Map<string, ProgressData> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds
  
  calculateNodeProgress(
    nodeId: string,
    nodeType: string,
    properties: Record<string, unknown>
  ): number {
    // Task nodes: check "done" attribute
    if (nodeType === 'task') {
      return properties.done === true ? 100 : 0;
    }
    
    // Other leaf nodes: no progress
    return 0;
  }
  
  async calculateHierarchicalProgress(
    nodeId: string,
    childNodeIds: string[]
  ): Promise<number> {
    if (childNodeIds.length === 0) {
      return 0;
    }
    
    // Fetch child nodes from graph
    const childNodes = await this.fetchChildNodes(childNodeIds);
    
    let totalProgress = 0;
    let count = 0;
    
    for (const child of childNodes) {
      // Recursively calculate progress for children
      const childProgress = await this.getProgress(child.id);
      totalProgress += childProgress;
      count++;
    }
    
    return count > 0 ? totalProgress / count : 0;
  }
  
  async getProgress(nodeId: string): Promise<number> {
    // Check cache
    const cached = this.cache.get(nodeId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.percentage;
    }
    
    // Calculate fresh progress
    const node = await this.fetchNode(nodeId);
    let progress: number;
    
    if (node.children && node.children.length > 0) {
      // Container node: hierarchical calculation
      progress = await this.calculateHierarchicalProgress(
        nodeId,
        node.children
      );
    } else {
      // Leaf node: direct calculation
      progress = this.calculateNodeProgress(
        nodeId,
        node.type,
        node.properties
      );
    }
    
    // Update cache
    this.cache.set(nodeId, {
      percentage: progress,
      completedCount: 0, // TODO: track actual counts
      totalCount: 0,
      timestamp: Date.now(),
    });
    
    return progress;
  }
  
  invalidateCache(nodeId: string): void {
    this.cache.delete(nodeId);
    
    // TODO: Invalidate ancestors
    // This requires maintaining a parent map
  }
  
  private async fetchNode(nodeId: string): Promise<GraphNode> {
    // Fetch from graph service
    // Implementation depends on backend API
    throw new Error('Not implemented');
  }
  
  private async fetchChildNodes(childIds: string[]): Promise<GraphNode[]> {
    // Batch fetch child nodes
    // Implementation depends on backend API
    throw new Error('Not implemented');
  }
}
```

#### React Hook

```typescript
/**
 * Hook to get node progress with caching
 */
function useNodeProgress(
  nodeId: string,
  doneAttribute?: boolean
): number {
  const [progress, setProgress] = useState<number>(0);
  const calculator = useProgressCalculator();
  
  useEffect(() => {
    // For simple task nodes, use done attribute directly
    if (doneAttribute !== undefined) {
      setProgress(doneAttribute ? 100 : 0);
      return;
    }
    
    // For container nodes, calculate hierarchically
    calculator.getProgress(nodeId).then(setProgress);
  }, [nodeId, doneAttribute, calculator]);
  
  return progress;
}

/**
 * Hook to get hierarchical progress for container nodes
 */
function useHierarchicalProgress(
  nodeId: string,
  childIds?: string[]
): number {
  const [progress, setProgress] = useState<number>(0);
  const calculator = useProgressCalculator();
  
  useEffect(() => {
    if (!childIds || childIds.length === 0) {
      setProgress(0);
      return;
    }
    
    calculator.calculateHierarchicalProgress(nodeId, childIds)
      .then(setProgress);
  }, [nodeId, childIds, calculator]);
  
  return progress;
}
```

### 4. Dial Gauge Component

Reusable component for rendering dial-type gauge indicators around nodes.

```typescript
interface DialGaugeProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  startAngle: number;  // Degrees, 0 = top
  endAngle: number;    // Degrees
  radius: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  showValue?: boolean;
  animated?: boolean;
}

const DialGauge: React.FC<DialGaugeProps> = ({
  id,
  label,
  value,
  min,
  max,
  startAngle,
  endAngle,
  radius,
  strokeWidth,
  color,
  backgroundColor = '#e0e0e0',
  showValue = false,
  animated = true,
}) => {
  // Normalize value to 0-1 range
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Calculate arc angles in radians
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);
  const totalAngle = endRad - startRad;
  const valueAngle = startRad + (totalAngle * normalizedValue);
  
  // Calculate arc path
  const startX = radius * Math.cos(startRad);
  const startY = radius * Math.sin(startRad);
  const endX = radius * Math.cos(endRad);
  const endY = radius * Math.sin(endRad);
  const valueX = radius * Math.cos(valueAngle);
  const valueY = radius * Math.sin(valueAngle);
  
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const valueLargeArcFlag = Math.abs(valueAngle - startRad) > Math.PI ? 1 : 0;
  
  // Background arc path
  const backgroundPath = `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
  `;
  
  // Value arc path
  const valuePath = `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${valueLargeArcFlag} 1 ${valueX} ${valueY}
  `;
  
  return (
    <g className="dial-gauge" data-gauge-id={id}>
      {/* Background arc */}
      <path
        d={backgroundPath}
        fill="none"
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={0.3}
      />
      
      {/* Value arc */}
      <path
        d={valuePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{
          transition: animated ? 'd 300ms ease-in-out' : 'none',
        }}
      />
      
      {/* Value text (if enabled) */}
      {showValue && (
        <text
          x={valueX * 1.15}
          y={valueY * 1.15}
          textAnchor="middle"
          fontSize={10}
          fill={color}
          fontWeight="bold"
        >
          {value.toFixed(0)}
        </text>
      )}
      
      {/* Tooltip trigger area */}
      <title>
        {label}: {value.toFixed(1)} ({min}-{max})
      </title>
    </g>
  );
};
```

#### Priority Badge Component

Component for displaying priority as a numeric badge:

```typescript
interface PriorityBadgeProps {
  priority: number;  // 1-5
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityColor = (p: number): string => {
    if (p === 1) return '#d32f2f';  // High priority - red
    if (p === 2) return '#f57c00';  // Medium-high - orange
    if (p === 3) return '#fbc02d';  // Medium - yellow
    if (p === 4) return '#388e3c';  // Medium-low - green
    return '#1976d2';  // Low priority - blue
  };
  
  const getPriorityIcon = (p: number): string => {
    if (p <= 2) return '⬆';  // High priority
    if (p === 3) return '➡';  // Medium priority
    return '⬇';  // Low priority
  };
  
  return (
    <g className="priority-badge">
      {/* Badge background */}
      <circle
        r={12}
        fill={getPriorityColor(priority)}
        stroke="white"
        strokeWidth={2}
      />
      
      {/* Priority number */}
      <text
        y={-2}
        textAnchor="middle"
        fontSize={10}
        fill="white"
        fontWeight="bold"
      >
        {priority}
      </text>
      
      {/* Priority icon */}
      <text
        y={8}
        textAnchor="middle"
        fontSize={8}
        fill="white"
      >
        {getPriorityIcon(priority)}
      </text>
      
      <title>Priority: {priority} (1=Highest, 5=Lowest)</title>
    </g>
  );
};
```

### 5. Enhanced Edge Components

Custom edge components for curved rendering and bundling.

#### Curved Edge

```typescript
interface CurvedEdgeProps extends EdgeProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  style?: React.CSSProperties;
  markerEnd?: string;
  label?: string;
}

const CurvedEdge: React.FC<CurvedEdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
}) => {
  // Calculate control point for Bezier curve
  const [controlX, controlY] = calculateControlPoint(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  );
  
  // Create path
  const path = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
  
  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={style?.stroke || '#9e9e9e'}
        strokeWidth={style?.strokeWidth || 2}
        markerEnd={markerEnd}
      />
      
      {label && (
        <EdgeLabel
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          label={label}
        />
      )}
    </>
  );
};

/**
 * Calculate control point for quadratic Bezier curve
 */
function calculateControlPoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position
): [number, number] {
  // Midpoint
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular offset (20% of edge length)
  const offset = length * 0.2;
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Control point offset from midpoint
  const controlX = midX + perpX * offset;
  const controlY = midY + perpY * offset;
  
  return [controlX, controlY];
}
```

#### Edge Bundling

```typescript
interface EdgeBundle {
  edges: Edge[];
  path: string;
  width: number;
}

class EdgeBundler {
  /**
   * Group edges into bundles based on path similarity
   */
  bundleEdges(edges: Edge[], nodes: Map<string, Node>): EdgeBundle[] {
    const bundles: EdgeBundle[] = [];
    const processed = new Set<string>();
    
    for (const edge of edges) {
      if (processed.has(edge.id)) continue;
      
      // Find similar edges
      const similar = edges.filter(e => 
        !processed.has(e.id) && 
        this.areSimilar(edge, e, nodes)
      );
      
      if (similar.length > 1) {
        // Create bundle
        const bundle = this.createBundle(similar, nodes);
        bundles.push(bundle);
        similar.forEach(e => processed.add(e.id));
      }
    }
    
    return bundles;
  }
  
  private areSimilar(
    edge1: Edge,
    edge2: Edge,
    nodes: Map<string, Node>
  ): boolean {
    // Check if edges have similar paths
    const source1 = nodes.get(edge1.source);
    const target1 = nodes.get(edge1.target);
    const source2 = nodes.get(edge2.source);
    const target2 = nodes.get(edge2.target);
    
    if (!source1 || !target1 || !source2 || !target2) return false;
    
    // Calculate path similarity (simplified)
    const angle1 = Math.atan2(
      target1.position.y - source1.position.y,
      target1.position.x - source1.position.x
    );
    const angle2 = Math.atan2(
      target2.position.y - source2.position.y,
      target2.position.x - source2.position.x
    );
    
    const angleDiff = Math.abs(angle1 - angle2);
    return angleDiff < Math.PI / 12; // 15 degrees
  }
  
  private createBundle(
    edges: Edge[],
    nodes: Map<string, Node>
  ): EdgeBundle {
    // Calculate average path
    // Implementation details omitted for brevity
    return {
      edges,
      path: '',
      width: Math.min(edges.length * 2, 10),
    };
  }
}
```

### 6. Rendering Optimizer

Handles level-of-detail, viewport culling, and progressive rendering.

```typescript
interface RenderingOptimizer {
  /**
   * Determine level of detail based on zoom
   */
  getLevelOfDetail(zoom: number): 'full' | 'simplified' | 'minimal';
  
  /**
   * Get nodes visible in viewport
   */
  getVisibleNodes(
    nodes: Node[],
    viewport: { x: number; y: number; zoom: number; width: number; height: number }
  ): Node[];
  
  /**
   * Render nodes progressively in batches
   */
  renderProgressively(
    nodes: Node[],
    batchSize: number,
    onBatch: (batch: Node[]) => void
  ): void;
}

class RenderingOptimizerImpl implements RenderingOptimizer {
  getLevelOfDetail(zoom: number): 'full' | 'simplified' | 'minimal' {
    if (zoom >= 0.5) return 'full';
    if (zoom >= 0.3) return 'simplified';
    return 'minimal';
  }
  
  getVisibleNodes(
    nodes: Node[],
    viewport: { x: number; y: number; zoom: number; width: number; height: number }
  ): Node[] {
    const buffer = 100; // pixels
    
    const minX = -viewport.x / viewport.zoom - buffer;
    const maxX = (-viewport.x + viewport.width) / viewport.zoom + buffer;
    const minY = -viewport.y / viewport.zoom - buffer;
    const maxY = (-viewport.y + viewport.height) / viewport.zoom + buffer;
    
    return nodes.filter(node => {
      const { x, y } = node.position;
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });
  }
  
  renderProgressively(
    nodes: Node[],
    batchSize: number,
    onBatch: (batch: Node[]) => void
  ): void {
    let index = 0;
    
    const renderBatch = () => {
      if (index >= nodes.length) return;
      
      const batch = nodes.slice(index, index + batchSize);
      onBatch(batch);
      index += batchSize;
      
      // Schedule next batch
      setTimeout(renderBatch, 60); // ~16ms for 60 FPS
    };
    
    renderBatch();
  }
}
```

## Data Models

### Extended Graph Node

```typescript
interface GraphNodeData {
  label: string;
  type: string;
  properties: {
    // Existing properties
    done?: boolean;
    status?: string;
    priority?: number;
    is_signed?: boolean;
    rpn?: number;
    
    // New properties for progress
    children?: string[];  // Child node IDs
    completion_percentage?: number;  // Cached progress
    
    // New properties for rendering
    shape?: 'circle' | 'rectangle' | 'hexagon' | 'triangle' | 'document';
    icon?: string;  // Icon identifier
  };
}
```

### Layout Configuration

```typescript
interface LayoutConfig {
  algorithm: 'force' | 'hierarchical' | 'circular' | 'grid';
  
  force?: {
    repulsionStrength: number;
    attractionStrength: number;
    idealEdgeLength: number;
    centerGravity: number;
    damping: number;
    useBarnesHut: boolean;
    barnesHutTheta: number;
    minSpacing: number;  // For collision detection
  };
  
  hierarchical?: {
    direction: 'TB' | 'BT' | 'LR' | 'RL';
    levelSeparation: number;
    nodeSeparation: number;
    treeSpacing: number;
  };
  
  circular?: {
    radius: number;
    startAngle: number;
    endAngle: number;
    sortBy: 'degree' | 'type' | 'none';
  };
  
  grid?: {
    columns: number;
    rowSpacing: number;
    columnSpacing: number;
    sortBy: 'type' | 'priority' | 'none';
  };
}
```

### Rendering Preferences

```typescript
interface RenderingPreferences {
  // Rendering mode
  mode: 'svg' | 'canvas' | 'auto';
  autoThreshold: number;  // Node count to switch to canvas
  
  // Visual features
  edgeBundling: boolean;
  animations: boolean;
  shadows: boolean;
  darkMode: boolean;
  
  // Performance
  levelOfDetail: boolean;
  viewportCulling: boolean;
  progressiveRendering: boolean;
  progressiveBatchSize: number;
  
  // Layout
  layoutAlgorithm: 'force' | 'hierarchical' | 'circular' | 'grid';
  layoutConfig: LayoutConfig;
}
```

## Correctness Properties

Before writing the correctness properties, I need to analyze the acceptance criteria to determine which are testable.


Now I'll use the prework tool to analyze acceptance criteria before writing correctness properties.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Layout Algorithm Properties

Property 1: Collision-free layout
*For any* graph with nodes positioned by the layout algorithm, no two nodes should have bounding boxes that overlap or are closer than 20 pixels apart.
**Validates: Requirements 1.1, 1.3**

Property 2: Barnes-Hut optimization activation
*For any* graph with more than 50 nodes, the force-directed layout algorithm should use Barnes-Hut spatial partitioning for force calculations.
**Validates: Requirements 1.5**

Property 3: Temperature increase on drag
*For any* node drag operation, the force simulation temperature should increase to allow layout adjustment.
**Validates: Requirements 1.4**

Property 4: Hierarchical level assignment
*For any* tree-structured graph using hierarchical layout, nodes at the same depth from the root should be positioned at the same vertical level (for TB/BT direction) or horizontal level (for LR/RL direction).
**Validates: Requirements 2.2**

Property 5: Circular distance mapping
*For any* graph using circular layout, the radial distance of each node from the center should be proportional to its graph distance from the center node.
**Validates: Requirements 2.3**

Property 6: Grid regularity
*For any* graph using grid layout, the spacing between adjacent nodes should be consistent both horizontally and vertically.
**Validates: Requirements 2.4**

Property 7: Layout transition timing
*For any* layout algorithm change, the animation duration should be 500 milliseconds ± 50ms.
**Validates: Requirements 2.5**

Property 8: Layout preference persistence
*For any* layout algorithm selection, saving and reloading the application should restore the same layout algorithm.
**Validates: Requirements 2.6**

Property 9: Selection preservation across layouts
*For any* selected node, changing the layout algorithm should maintain the same node selection.
**Validates: Requirements 2.7**

### Progress Calculation Properties

Property 10: Task completion mapping
*For any* task node, if the "done" attribute is true, the calculated progress should be 100%; if false or absent, it should be 0%.
**Validates: Requirements 4.2, 4.3, 4.1.6**

Property 11: Hierarchical progress aggregation
*For any* container node with N children, the progress percentage should equal the sum of all child progress percentages divided by N.
**Validates: Requirements 4.4, 4.5, 4.1.2, 4.1.7**

Property 12: Progress cache validity
*For any* node, requesting progress twice within 30 seconds should return the cached value without making additional database queries.
**Validates: Requirements 4.1.3**

Property 13: Cache invalidation on child change
*For any* node with ancestors, changing its completion status should invalidate the progress cache for all ancestor nodes.
**Validates: Requirements 4.1.4**

Property 14: Progress animation timing
*For any* progress indicator update, the animation duration should be 300 milliseconds ± 30ms.
**Validates: Requirements 4.10**

Property 15: Multiple progress indicators
*For any* node with N numeric attributes requiring progress indicators, exactly N concentric circles should be rendered with 4-pixel spacing between them.
**Validates: Requirements 4.11**

Property 16: Progress tooltip accuracy
*For any* progress indicator hover event, the tooltip should display the exact percentage value with at most 1 decimal place.
**Validates: Requirements 4.12**

### Node Styling Properties

Property 17: Priority badge display
*For any* node with a priority value P (1-5), the node should display a priority badge in the upper right corner showing the priority number and an appropriate icon.
**Validates: Requirements 5.2, 5.3**

Property 18: Unified node structure
*For any* node type, the node should consist of a circular background, a rounded rectangle content box (150px × 60px), a type icon above the box, a type label below the icon, and optionally a status icon below the box.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

Property 19: Dial gauge configuration
*For any* dial gauge, the gauge should render as a circular arc with configurable start angle, end angle, radius, stroke width, and color, positioned around the node's circular background.
**Validates: Requirements 4.1, 4.6, 4.7, 4.8, 4.9, 4.13**

### Edge Rendering Properties

Property 18: Edge connection point accuracy
*For any* edge connecting two nodes, the connection points should lie on the perimeter of the source and target node shapes, not inside or outside the boundaries.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

Property 19: Edge thickness from weight
*For any* edge with a weight property W, the edge thickness should be 2 + (W - 1) pixels, clamped to a maximum of 6 pixels.
**Validates: Requirements 9.1, 9.2**

Property 20: Edge bundling similarity threshold
*For any* two edges in a bundle, the angular difference between their paths should be less than 15 degrees (π/12 radians).
**Validates: Requirements 10.2**

### Animation Properties

Property 21: Node addition animation
*For any* node addition or removal, the layout adjustment animation should complete within 300 milliseconds ± 30ms.
**Validates: Requirements 11.2**

Property 22: Drag immediate update
*For any* node drag operation, the node position should update immediately without animation delay.
**Validates: Requirements 11.4**

### Zoom and Viewport Properties

Property 23: Zoom-to-fit bounding box
*For any* zoom-to-fit operation, the viewport should be adjusted so that all visible nodes fit within the viewport with exactly 20% padding on all sides.
**Validates: Requirements 12.1, 12.2**

Property 24: Zoom-to-fit centering
*For any* zoom-to-fit operation, the viewport center should be positioned at the geometric center of all visible nodes.
**Validates: Requirements 12.3**

Property 25: Zoom-to-fit timing
*For any* zoom-to-fit operation, the animation should complete within 500 milliseconds ± 50ms.
**Validates: Requirements 12.4**

### Hover and Interaction Properties

Property 26: Connected node identification
*For any* hovered node, the set of highlighted nodes should exactly match the set of nodes directly connected by edges to the hovered node.
**Validates: Requirements 14.1**

Property 27: Connected edge identification
*For any* hovered node, the set of highlighted edges should exactly match the set of edges where either the source or target is the hovered node.
**Validates: Requirements 14.2**

Property 28: Opacity restoration timing
*For any* hover end event, the opacity of all nodes and edges should return
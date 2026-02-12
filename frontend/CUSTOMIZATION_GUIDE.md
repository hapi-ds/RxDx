# Node Appearance Customization Guide

This guide explains how to customize the appearance of nodes in the RxDx graph visualization (both 2D and 3D views).

---

## Overview

Nodes in the graph can be customized in two places:
1. **2D View** (`GraphView2D.tsx`) - Uses React Flow with custom React components
2. **3D View** (`GraphView3D.tsx`) - Uses Three.js with 3D geometries and materials

---

## 2D View Customization

### Location
**File**: `frontend/src/components/graph/GraphView2D.tsx`

### 1. Node Colors

Colors are defined in the `NODE_COLORS` constant (around line 48):

```typescript
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  requirement: { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  task: { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  test: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' },
  risk: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c' },
  document: { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  default: { bg: '#fafafa', border: '#9e9e9e', text: '#424242' },
};
```

**Properties**:
- `bg`: Background color of the node
- `border`: Border color of the node
- `text`: Text color inside the node

**To change colors**: Simply modify the hex color values for any node type.

### 2. Node Labels

Short labels displayed in the node header are defined in `NODE_TYPE_LABELS` (around line 56):

```typescript
const NODE_TYPE_LABELS: Record<string, string> = {
  requirement: 'REQ',
  task: 'TASK',
  test: 'TEST',
  risk: 'RISK',
  document: 'DOC',
};
```

**To change labels**: Modify the string values (e.g., change 'REQ' to 'REQUIREMENT').

### 3. Base Node Styling

The base style for all nodes is defined in `baseNodeStyle` (around line 63):

```typescript
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
```

**Customizable properties**:
- `padding`: Space inside the node
- `borderRadius`: Roundness of corners (higher = more rounded)
- `borderWidth`: Thickness of the border
- `minWidth`/`maxWidth`: Size constraints
- `fontSize`: Text size
- `boxShadow`: Drop shadow effect

### 4. Custom Node Components

Each node type has its own React component (starting around line 82):

- `RequirementNode` - Shows signed status (✓ icon)
- `TaskNode` - Shows task status
- `TestNode` - Shows test status with icons (✓, ✗, ⊘)
- `RiskNode` - Shows Risk Priority Number (RPN) with color coding
- `DefaultNode` - Generic node for other types

**Example - RequirementNode**:
```typescript
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
```

**To customize a node type**:
1. Find the component (e.g., `RequirementNode`)
2. Modify the JSX structure
3. Add/remove elements
4. Change inline styles
5. Add custom icons or badges

### 5. Selection Highlighting

When a node is selected, the border color changes to black:
```typescript
borderColor: selected ? '#000' : colors.border
```

**To change selection color**: Replace `'#000'` with your preferred color.

---

## 3D View Customization

### Location
**File**: `frontend/src/components/graph/GraphView3D.tsx`

### 1. Node Colors

Colors are defined in the `NODE_COLORS` constant (around line 1756):

```typescript
const NODE_COLORS: Record<NodeType | 'default', string> = {
  requirement: '#3b82f6', // Blue - represents structured requirements
  task: '#10b981',        // Green - represents actionable items
  test: '#f59e0b',        // Amber - represents verification
  risk: '#ef4444',        // Red - represents complexity/danger
  document: '#8b5cf6',    // Purple - represents documents/files
  default: '#6b7280',     // Gray - fallback
};
```

**To change colors**: Modify the hex color values. These colors are used for:
- Mesh material color
- Emissive color (glow effect)
- Text label color
- Selection ring color

### 2. Node Geometries

Each node type has a different 3D shape defined in the `NodeGeometry` component:

```typescript
const NodeGeometry: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'requirement':
      return <boxGeometry args={[1, 1, 1]} />;  // Cube
    case 'task':
      return <octahedronGeometry args={[0.6]} />;  // Octahedron
    case 'test':
      return <coneGeometry args={[0.6, 1.2, 8]} />;  // Cone
    case 'risk':
      return <icosahedronGeometry args={[0.6]} />;  // Icosahedron
    case 'document':
      return <cylinderGeometry args={[0.5, 0.5, 1, 16]} />;  // Cylinder
    default:
      return <sphereGeometry args={[0.5]} />;  // Sphere
  }
};
```

**Geometry parameters**:
- `boxGeometry`: `[width, height, depth]`
- `octahedronGeometry`: `[radius]`
- `coneGeometry`: `[radius, height, segments]`
- `icosahedronGeometry`: `[radius]`
- `cylinderGeometry`: `[radiusTop, radiusBottom, height, segments]`
- `sphereGeometry`: `[radius]`

**To change shapes**:
1. Modify the geometry type (e.g., change box to sphere)
2. Adjust the size parameters
3. Add more segments for smoother shapes (higher number = smoother but slower)

### 3. Material Properties

Node materials are defined in the `Node3D` component (around line 1941):

```typescript
<meshStandardMaterial
  color={color}
  emissive={color}
  emissiveIntensity={emissiveIntensity}
  metalness={0.3}
  roughness={0.7}
/>
```

**Material properties**:
- `color`: Base color of the material
- `emissive`: Glow color (same as base color)
- `emissiveIntensity`: How much the node glows (0-1)
  - Dragging: 0.8
  - Selected: 0.7
  - Hovered: 0.5
  - Normal: 0
- `metalness`: How metallic the surface looks (0-1)
- `roughness`: How rough/shiny the surface is (0-1)

**To make nodes more shiny**: Decrease `roughness` (e.g., 0.3)
**To make nodes more metallic**: Increase `metalness` (e.g., 0.7)
**To make nodes glow more**: Increase `emissiveIntensity` values

### 4. Selection Ring

Selected nodes show a ring indicator (around line 1953):

```typescript
{isSelected && (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
    <ringGeometry args={[0.7, 0.85, 32]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
  </mesh>
)}
```

**Ring parameters**:
- `args`: `[innerRadius, outerRadius, segments]`
- `position`: `[x, y, z]` - position relative to node
- `opacity`: Transparency (0-1)

### 5. Text Labels

Node labels are displayed above the node (around line 1969):

```typescript
<Text
  position={[0, 1.0, 0]}
  fontSize={0.25}
  color="white"
  anchorX="center"
  anchorY="middle"
  outlineWidth={0.02}
  outlineColor="#000000"
  maxWidth={3}
>
  {label}
</Text>
```

**Text properties**:
- `position`: `[x, y, z]` - height above node
- `fontSize`: Size of the text
- `color`: Text color
- `outlineWidth`: Thickness of text outline
- `outlineColor`: Color of text outline
- `maxWidth`: Maximum width before wrapping

---

## Common Customization Examples

### Example 1: Change Requirement Node to Purple

**2D View** (`GraphView2D.tsx`):
```typescript
const NODE_COLORS = {
  requirement: { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  // ... other colors
};
```

**3D View** (`GraphView3D.tsx`):
```typescript
const NODE_COLORS = {
  requirement: '#7b1fa2', // Purple
  // ... other colors
};
```

### Example 2: Make Nodes Larger in 2D

**2D View** (`GraphView2D.tsx`):
```typescript
const baseNodeStyle: React.CSSProperties = {
  padding: '15px 20px',  // Increased from 10px 15px
  minWidth: '200px',     // Increased from 150px
  maxWidth: '300px',     // Increased from 250px
  fontSize: '14px',      // Increased from 12px
  // ... other properties
};
```

### Example 3: Make 3D Nodes Glow More

**3D View** (`GraphView3D.tsx`):
```typescript
const emissiveIntensity = useMemo(() => {
  if (isDragging) return 1.0;   // Increased from 0.8
  if (isSelected) return 0.9;   // Increased from 0.7
  if (isHovered) return 0.7;    // Increased from 0.5
  return 0.2;                   // Increased from 0 (always glow slightly)
}, [isHovered, isSelected, isDragging]);
```

### Example 4: Change Node Shape in 3D

**3D View** (`GraphView3D.tsx`):
```typescript
const NodeGeometry: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'requirement':
      return <sphereGeometry args={[0.6]} />;  // Changed from box to sphere
    // ... other cases
  }
};
```

### Example 5: Add Custom Icon to Task Node

**2D View** (`GraphView2D.tsx`):
```typescript
const TaskNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data, selected }) => {
  const colors = NODE_COLORS.task;
  const status = data?.properties?.status as string | undefined;

  return (
    <div style={{ ...baseNodeStyle, backgroundColor: colors.bg, borderColor: selected ? '#000' : colors.border, color: colors.text }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '10px', opacity: 0.7 }}>
          ✓ {NODE_TYPE_LABELS.task}  {/* Added checkmark icon */}
        </span>
        {status && <span style={{ fontSize: '10px', opacity: 0.8 }}>{status}</span>}
      </div>
      <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{data?.label || 'Untitled'}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
```

---

## Testing Your Changes

After making changes:

1. **Save the file**
2. **Rebuild the frontend**:
   ```bash
   cd frontend
   npm run build
   ```
3. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```
4. **Open the application** in your browser
5. **Navigate to Graph Explorer** to see your changes
6. **Toggle between 2D and 3D views** to verify both

---

## Tips and Best Practices

### Color Selection
- Use consistent color schemes across 2D and 3D views
- Ensure sufficient contrast between background and text
- Consider colorblind-friendly palettes
- Test colors in both light and dark environments

### Performance
- Keep 3D geometries simple (fewer segments = better performance)
- Avoid very high emissive intensities (can cause visual fatigue)
- Test with large graphs (100+ nodes) to ensure smooth performance

### Accessibility
- Maintain WCAG 2.1 Level AA contrast ratios (4.5:1 for normal text)
- Don't rely solely on color to convey information
- Provide text labels in addition to colors
- Test with screen readers and keyboard navigation

### Consistency
- Keep node sizes proportional across types
- Use similar styling patterns for all node types
- Document your color choices and their meanings
- Update the design document if making significant changes

---

## Related Files

- **2D View**: `frontend/src/components/graph/GraphView2D.tsx`
- **3D View**: `frontend/src/components/graph/GraphView3D.tsx`
- **Graph Store**: `frontend/src/stores/graphStore.ts`
- **Graph Service**: `frontend/src/services/graphService.ts`
- **Design Document**: `.kiro/specs/graph-table-ui-enhancements/design.md`

---

## Need Help?

If you need assistance with customization:
1. Check the React Flow documentation: https://reactflow.dev/
2. Check the Three.js documentation: https://threejs.org/docs/
3. Check the React Three Fiber documentation: https://docs.pmnd.rs/react-three-fiber
4. Review the design document for color scheme rationale
5. Test changes in both 2D and 3D views before committing

---

## Color Reference

### Current Color Scheme

| Node Type   | 2D Background | 2D Border | 2D Text | 3D Color |
|-------------|---------------|-----------|---------|----------|
| Requirement | #e3f2fd (light blue) | #1976d2 (blue) | #0d47a1 (dark blue) | #3b82f6 (blue) |
| Task        | #e8f5e9 (light green) | #388e3c (green) | #1b5e20 (dark green) | #10b981 (green) |
| Test        | #fff3e0 (light amber) | #f57c00 (orange) | #e65100 (dark orange) | #f59e0b (amber) |
| Risk        | #ffebee (light red) | #d32f2f (red) | #b71c1c (dark red) | #ef4444 (red) |
| Document    | #f3e5f5 (light purple) | #7b1fa2 (purple) | #4a148c (dark purple) | #8b5cf6 (purple) |
| Default     | #fafafa (light gray) | #9e9e9e (gray) | #424242 (dark gray) | #6b7280 (gray) |

### 3D Geometry Mapping

| Node Type   | 3D Shape      | Meaning                          |
|-------------|---------------|----------------------------------|
| Requirement | Box/Cube      | Structured, foundational         |
| Task        | Octahedron    | Actionable, multi-faceted        |
| Test        | Cone          | Focused, verification            |
| Risk        | Icosahedron   | Complex, many-sided              |
| Document    | Cylinder      | Container, documentation         |
| Default     | Sphere        | Generic, neutral                 |

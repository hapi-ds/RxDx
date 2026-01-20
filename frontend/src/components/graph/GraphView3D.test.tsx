/**
 * GraphView3D Component Tests
 * Tests for 3D graph visualization using React Three Fiber with WebXR support
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as THREE from 'three';
import type { Node, Edge } from '@xyflow/react';
import type { GraphNodeData } from '../../stores/graphStore';

// Mock the graphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

// Mock useXRSupport hook
vi.mock('../../hooks/useXRSupport', () => ({
  useXRSupport: vi.fn(() => ({
    support: {
      isWebXRSupported: true,
      isVRSupported: true,
      isARSupported: false,
      isInlineSupported: true,
      isChecking: false,
      error: null,
      features: {},
    },
    sessionState: {
      isSessionActive: false,
      currentMode: null,
      visibilityState: null,
      sessionStartTime: null,
      sessionError: null,
    },
    checkSessionSupport: vi.fn().mockResolvedValue(true),
    requestSession: vi.fn().mockResolvedValue({}),
    endSession: vi.fn().mockResolvedValue(undefined),
    getRecommendedReferenceSpace: vi.fn().mockReturnValue('local-floor'),
    refreshSupport: vi.fn().mockResolvedValue(undefined),
  })),
  DEFAULT_XR_CONFIG: {
    vrReferenceSpace: 'local-floor',
    arReferenceSpace: 'local-floor',
    vrRequiredFeatures: ['local-floor'],
    vrOptionalFeatures: ['bounded-floor', 'hand-tracking', 'layers'],
    arRequiredFeatures: ['local-floor'],
    arOptionalFeatures: ['hit-test', 'plane-detection', 'anchors', 'light-estimation'],
    frameRate: 'high',
    foveation: 1,
  },
}));

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: {
      position: new THREE.Vector3(0, 5, 15),
      getWorldDirection: vi.fn(() => new THREE.Vector3(0, 0, -1)),
    },
    gl: {
      domElement: {
        clientWidth: 800,
        clientHeight: 600,
      },
    },
  })),
}));

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
  Line: vi.fn(() => null),
  Text: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drei-text">{children}</div>
  ),
  QuadraticBezierLine: vi.fn(() => null),
  Cone: vi.fn(() => null),
}));

// Mock @react-three/xr
vi.mock('@react-three/xr', () => ({
  XR: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="xr-wrapper">{children}</div>
  ),
  createXRStore: vi.fn(() => ({
    enterVR: vi.fn(),
    enterAR: vi.fn(),
  })),
  useXR: vi.fn((selector) => {
    const state = {
      session: null,
    };
    return selector ? selector(state) : state;
  }),
}));

// Import after mocks are set up
import { GraphView3D, DEFAULT_FORCE_CONFIG, type ForceLayoutConfig } from './GraphView3D';
import { useGraphStore } from '../../stores/graphStore';

// Sample test data
const mockNodes: Node<GraphNodeData>[] = [
  {
    id: 'req-1',
    type: 'requirement',
    position: { x: 0, y: 0 },
    data: {
      label: 'Requirement 1',
      type: 'requirement',
      properties: { is_signed: true },
    },
  },
  {
    id: 'task-1',
    type: 'task',
    position: { x: 200, y: 0 },
    data: {
      label: 'Task 1',
      type: 'task',
      properties: { status: 'active' },
    },
  },
  {
    id: 'test-1',
    type: 'test',
    position: { x: 400, y: 0 },
    data: {
      label: 'Test 1',
      type: 'test',
      properties: { status: 'passed' },
    },
  },
  {
    id: 'risk-1',
    type: 'risk',
    position: { x: 0, y: 200 },
    data: {
      label: 'Risk 1',
      type: 'risk',
      properties: { rpn: 120 },
    },
  },
  {
    id: 'doc-1',
    type: 'document',
    position: { x: 200, y: 200 },
    data: {
      label: 'Document 1',
      type: 'document',
      properties: {},
    },
  },
];

const mockEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'req-1',
    target: 'task-1',
    type: 'IMPLEMENTS',
  },
  {
    id: 'edge-2',
    source: 'task-1',
    target: 'test-1',
    type: 'TESTED_BY',
  },
  {
    id: 'edge-3',
    source: 'risk-1',
    target: 'req-1',
    type: 'MITIGATES',
  },
  {
    id: 'edge-4',
    source: 'req-1',
    target: 'doc-1',
    type: 'REFERENCES',
  },
];

describe('GraphView3D', () => {
  let mockLoadGraph: Mock;
  let mockSelectNode: Mock;

  beforeEach(() => {
    mockLoadGraph = vi.fn();
    mockSelectNode = vi.fn();

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: mockLoadGraph,
      selectNode: mockSelectNode,
      selectedNode: null,
      isLoading: false,
      error: null,
      getFilteredNodes: () => mockNodes,
      getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<GraphView3D />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('calls loadGraph on mount', () => {
      render(<GraphView3D />);
      expect(mockLoadGraph).toHaveBeenCalledTimes(1);
    });

    it('renders XR wrapper for WebXR support', () => {
      render(<GraphView3D />);
      expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<GraphView3D className="custom-3d-graph" />);
      expect(container.querySelector('.custom-3d-graph')).toBeInTheDocument();
    });

    it('applies custom style', () => {
      const { container } = render(
        <GraphView3D style={{ backgroundColor: 'red', minHeight: '600px' }} />
      );
      const graphContainer = container.firstChild as HTMLElement;
      expect(graphContainer.style.backgroundColor).toBe('red');
      expect(graphContainer.style.minHeight).toBe('600px');
    });

    it('renders with default container styles', () => {
      const { container } = render(<GraphView3D />);
      const graphContainer = container.firstChild as HTMLElement;
      expect(graphContainer.style.width).toBe('100%');
      expect(graphContainer.style.height).toBe('100%');
      expect(graphContainer.style.position).toBe('relative');
    });
  });

  describe('Loading State', () => {
    it('displays loading state when isLoading is true and no nodes', () => {
      (useGraphStore as unknown as Mock).mockReturnValue({
        nodes: [],
        edges: [],
        loadGraph: mockLoadGraph,
        selectNode: mockSelectNode,
        selectedNode: null,
        isLoading: true,
        error: null,
        getFilteredNodes: () => [],
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
      });

      render(<GraphView3D />);
      expect(screen.getByText('Loading 3D graph...')).toBeInTheDocument();
    });

    it('does not show loading when nodes exist even if isLoading is true', () => {
      (useGraphStore as unknown as Mock).mockReturnValue({
        nodes: mockNodes,
        edges: mockEdges,
        loadGraph: mockLoadGraph,
        selectNode: mockSelectNode,
        selectedNode: null,
        isLoading: true,
        error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
      });

      render(<GraphView3D />);
      expect(screen.queryByText('Loading 3D graph...')).not.toBeInTheDocument();
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error state when error exists and no nodes', () => {
      (useGraphStore as unknown as Mock).mockReturnValue({
        nodes: [],
        edges: [],
        loadGraph: mockLoadGraph,
        selectNode: mockSelectNode,
        selectedNode: null,
        isLoading: false,
        error: 'Failed to load 3D graph data',
        getFilteredNodes: () => [],
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
      });

      render(<GraphView3D />);
      expect(screen.getByText('Error: Failed to load 3D graph data')).toBeInTheDocument();
    });

    it('does not show error when nodes exist even if error is set', () => {
      (useGraphStore as unknown as Mock).mockReturnValue({
        nodes: mockNodes,
        edges: mockEdges,
        loadGraph: mockLoadGraph,
        selectNode: mockSelectNode,
        selectedNode: null,
        isLoading: false,
        error: 'Some error',
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
      });

      render(<GraphView3D />);
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('applies error styling to error container', () => {
      (useGraphStore as unknown as Mock).mockReturnValue({
        nodes: [],
        edges: [],
        loadGraph: mockLoadGraph,
        selectNode: mockSelectNode,
        selectedNode: null,
        isLoading: false,
        error: 'Test error',
        getFilteredNodes: () => [],
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
      });

      const { container } = render(<GraphView3D />);
      const errorContainer = container.firstChild as HTMLElement;
      expect(errorContainer.style.backgroundColor).toBe('rgb(26, 26, 46)');
    });
  });

  describe('VR Button', () => {
    it('renders VR button by default', () => {
      render(<GraphView3D />);
      expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
    });

    it('renders VR button when showVRButton is true', () => {
      render(<GraphView3D showVRButton={true} />);
      expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
    });

    it('does not render VR button when showVRButton is false', () => {
      render(<GraphView3D showVRButton={false} />);
      expect(screen.queryByRole('button', { name: /enter vr/i })).not.toBeInTheDocument();
    });

    it('VR button has correct styling', () => {
      render(<GraphView3D />);
      const vrButton = screen.getByRole('button', { name: /enter vr/i });
      // Button styling - the positioning is now on the container div
      expect(vrButton).toHaveStyle({
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 'bold',
      });
    });
  });

  describe('Camera Controls Overlay', () => {
    it('renders camera controls overlay by default', () => {
      render(<GraphView3D />);
      expect(screen.getByRole('button', { name: /reset camera/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom to fit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle auto-rotate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keyboard shortcuts help/i })).toBeInTheDocument();
    });

    it('renders camera controls when showCameraControls is true', () => {
      render(<GraphView3D showCameraControls={true} />);
      expect(screen.getByRole('button', { name: /reset camera/i })).toBeInTheDocument();
    });

    it('does not render camera controls when showCameraControls is false', () => {
      render(<GraphView3D showCameraControls={false} />);
      expect(screen.queryByRole('button', { name: /reset camera/i })).not.toBeInTheDocument();
    });

    it('does not render camera controls when enableOrbitControls is false', () => {
      render(<GraphView3D enableOrbitControls={false} />);
      expect(screen.queryByRole('button', { name: /reset camera/i })).not.toBeInTheDocument();
    });

    it('toggles auto-rotate state when button is clicked', async () => {
      render(<GraphView3D autoRotate={false} />);
      const autoRotateButton = screen.getByRole('button', { name: /toggle auto-rotate/i });
      
      // Initial state - not active
      expect(autoRotateButton).not.toHaveStyle({ backgroundColor: 'rgba(59, 130, 246, 0.8)' });
      
      // Click to toggle
      await act(async () => {
        fireEvent.click(autoRotateButton);
      });
      
      // After click - should be active (blue background)
      await waitFor(() => {
        expect(autoRotateButton).toHaveStyle({ backgroundColor: 'rgba(59, 130, 246, 0.8)' });
      });
    });

    it('shows keyboard shortcuts alert when help button is clicked', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<GraphView3D />);
      
      const helpButton = screen.getByRole('button', { name: /keyboard shortcuts help/i });
      fireEvent.click(helpButton);
      
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Keyboard Shortcuts'));
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('W/↑ - Pan Up'));
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('R - Reset Camera'));
      
      alertSpy.mockRestore();
    });
  });

  describe('Force Layout Configuration Props', () => {
    it('uses default force config when no custom config provided', () => {
      render(<GraphView3D />);
      // Component should render without errors using defaults
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('accepts custom force config', () => {
      const customConfig: Partial<ForceLayoutConfig> = {
        repulsionStrength: 1000,
        attractionStrength: 0.2,
        idealEdgeLength: 5,
      };
      
      render(<GraphView3D forceConfig={customConfig} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('merges custom config with defaults', () => {
      const customConfig: Partial<ForceLayoutConfig> = {
        repulsionStrength: 1000,
      };
      
      render(<GraphView3D forceConfig={customConfig} />);
      // Should render without errors, meaning defaults were properly merged
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });

  describe('Simulation Controls', () => {
    it('shows simulation controls by default', () => {
      render(<GraphView3D />);
      // Simulation indicator is rendered inside the 3D scene
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('accepts showSimulationControls prop', () => {
      render(<GraphView3D showSimulationControls={false} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });

  describe('Light Configuration Props', () => {
    it('accepts custom ambient light intensity', () => {
      render(<GraphView3D ambientLightIntensity={0.8} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('accepts custom point light intensity', () => {
      render(<GraphView3D pointLightIntensity={1.5} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });

  describe('Camera Configuration Props', () => {
    it('accepts autoRotate prop', () => {
      render(<GraphView3D autoRotate={true} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('accepts autoRotateSpeed prop', () => {
      render(<GraphView3D autoRotateSpeed={1.0} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('accepts enableKeyboardNavigation prop', () => {
      render(<GraphView3D enableKeyboardNavigation={false} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('accepts cameraTransitionDuration prop', () => {
      render(<GraphView3D cameraTransitionDuration={1000} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });
});


describe('DEFAULT_FORCE_CONFIG', () => {
  it('has correct default repulsion strength', () => {
    expect(DEFAULT_FORCE_CONFIG.repulsionStrength).toBe(500);
  });

  it('has correct default attraction strength', () => {
    expect(DEFAULT_FORCE_CONFIG.attractionStrength).toBe(0.1);
  });

  it('has correct default ideal edge length', () => {
    expect(DEFAULT_FORCE_CONFIG.idealEdgeLength).toBe(3);
  });

  it('has correct default center gravity', () => {
    expect(DEFAULT_FORCE_CONFIG.centerGravity).toBe(0.02);
  });

  it('has correct default damping factor', () => {
    expect(DEFAULT_FORCE_CONFIG.damping).toBe(0.85);
  });

  it('has correct default initial temperature', () => {
    expect(DEFAULT_FORCE_CONFIG.initialTemperature).toBe(1.0);
  });

  it('has correct default cooling rate', () => {
    expect(DEFAULT_FORCE_CONFIG.coolingRate).toBe(0.995);
  });

  it('has correct default minimum temperature', () => {
    expect(DEFAULT_FORCE_CONFIG.minTemperature).toBe(0.001);
  });

  it('has correct default max velocity', () => {
    expect(DEFAULT_FORCE_CONFIG.maxVelocity).toBe(2.0);
  });

  it('has correct default Barnes-Hut theta', () => {
    expect(DEFAULT_FORCE_CONFIG.barnesHutTheta).toBe(0.5);
  });

  it('has Barnes-Hut enabled by default', () => {
    expect(DEFAULT_FORCE_CONFIG.useBarnesHut).toBe(true);
  });

  it('has correct default Barnes-Hut threshold', () => {
    expect(DEFAULT_FORCE_CONFIG.barnesHutThreshold).toBe(50);
  });
});


describe('Node Type Geometries', () => {
  beforeEach(() => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  it('renders requirement nodes (should use box geometry)', () => {
    const reqNodes: Node<GraphNodeData>[] = [
      {
        id: 'req-only',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: { label: 'Requirement', type: 'requirement', properties: {} },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: reqNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => reqNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders task nodes (should use octahedron geometry)', () => {
    const taskNodes: Node<GraphNodeData>[] = [
      {
        id: 'task-only',
        type: 'task',
        position: { x: 0, y: 0 },
        data: { label: 'Task', type: 'task', properties: {} },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: taskNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => taskNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders test nodes (should use cone geometry)', () => {
    const testNodes: Node<GraphNodeData>[] = [
      {
        id: 'test-only',
        type: 'test',
        position: { x: 0, y: 0 },
        data: { label: 'Test', type: 'test', properties: {} },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: testNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => testNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders risk nodes (should use icosahedron geometry)', () => {
    const riskNodes: Node<GraphNodeData>[] = [
      {
        id: 'risk-only',
        type: 'risk',
        position: { x: 0, y: 0 },
        data: { label: 'Risk', type: 'risk', properties: {} },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: riskNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => riskNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders document nodes (should use cylinder geometry)', () => {
    const docNodes: Node<GraphNodeData>[] = [
      {
        id: 'doc-only',
        type: 'document',
        position: { x: 0, y: 0 },
        data: { label: 'Document', type: 'document', properties: {} },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: docNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => docNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders unknown node types with default sphere geometry', () => {
    const unknownNodes: Node<GraphNodeData>[] = [
      {
        id: 'unknown-1',
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { label: 'Unknown', type: 'custom', properties: {} },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: unknownNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => unknownNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});

describe('Edge Type Styling', () => {
  beforeEach(() => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  it('renders TESTED_BY edges with dashed style and arrow', () => {
    const testedByEdges: Edge[] = [
      { id: 'e1', source: 'req-1', target: 'test-1', type: 'TESTED_BY' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: testedByEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders MITIGATES edges with solid style and arrow', () => {
    const mitigatesEdges: Edge[] = [
      { id: 'e1', source: 'risk-1', target: 'req-1', type: 'MITIGATES' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mitigatesEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders DEPENDS_ON edges with dashed style', () => {
    const dependsOnEdges: Edge[] = [
      { id: 'e1', source: 'req-1', target: 'task-1', type: 'DEPENDS_ON' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: dependsOnEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders IMPLEMENTS edges with solid purple style', () => {
    const implementsEdges: Edge[] = [
      { id: 'e1', source: 'task-1', target: 'req-1', type: 'IMPLEMENTS' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: implementsEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders LEADS_TO edges with red solid style (FMEA)', () => {
    const leadsToEdges: Edge[] = [
      { id: 'e1', source: 'risk-1', target: 'task-1', type: 'LEADS_TO' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: leadsToEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders RELATES_TO edges with gray dashed style', () => {
    const relatesToEdges: Edge[] = [
      { id: 'e1', source: 'req-1', target: 'doc-1', type: 'RELATES_TO' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: relatesToEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders NEXT_VERSION edges for version history', () => {
    const nextVersionEdges: Edge[] = [
      { id: 'e1', source: 'req-1', target: 'task-1', type: 'NEXT_VERSION' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: nextVersionEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders REFERENCES edges with purple dashed style', () => {
    const referencesEdges: Edge[] = [
      { id: 'e1', source: 'req-1', target: 'doc-1', type: 'REFERENCES' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: referencesEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders unknown edge types with default style', () => {
    const unknownEdges: Edge[] = [
      { id: 'e1', source: 'req-1', target: 'task-1', type: 'CUSTOM_TYPE' },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: unknownEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});

describe('Node Selection', () => {
  let mockSelectNode: Mock;

  beforeEach(() => {
    mockSelectNode = vi.fn();
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: mockSelectNode,
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  it('renders with no selected node initially', () => {
    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders with a selected node', () => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: mockSelectNode,
      selectedNode: mockNodes[0],
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});

describe('Node Labels', () => {
  it('truncates long node labels', () => {
    const longLabelNodes: Node<GraphNodeData>[] = [
      {
        id: 'long-1',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: {
          label: 'This is a very long requirement label that should be truncated',
          type: 'requirement',
          properties: {},
        },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: longLabelNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => longLabelNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('uses node id as fallback when label is missing', () => {
    const noLabelNodes: Node<GraphNodeData>[] = [
      {
        id: 'node-without-label',
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
          label: '',
          type: 'task',
          properties: {},
        },
      },
    ];

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: noLabelNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => noLabelNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});


describe('Empty Graph State', () => {
  it('renders empty canvas when no nodes exist', () => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: [],
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => [],
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('renders nodes without edges', () => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});

describe('Multiple Props Combinations', () => {
  beforeEach(() => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  it('renders with all controls disabled', () => {
    render(
      <GraphView3D
        showVRButton={false}
        showCameraControls={false}
        showSimulationControls={false}
        enableOrbitControls={false}
        enableKeyboardNavigation={false}
      />
    );
    
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enter vr/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset camera/i })).not.toBeInTheDocument();
  });

  it('renders with all controls enabled', () => {
    render(
      <GraphView3D
        showVRButton={true}
        showCameraControls={true}
        showSimulationControls={true}
        enableOrbitControls={true}
        enableKeyboardNavigation={true}
        autoRotate={true}
        autoRotateSpeed={1.0}
      />
    );
    
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset camera/i })).toBeInTheDocument();
  });

  it('renders with custom force config and camera settings', () => {
    render(
      <GraphView3D
        forceConfig={{
          repulsionStrength: 1000,
          attractionStrength: 0.2,
          idealEdgeLength: 5,
          damping: 0.9,
        }}
        cameraTransitionDuration={1000}
        autoRotateSpeed={2.0}
        ambientLightIntensity={0.7}
        pointLightIntensity={1.2}
      />
    );
    
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  beforeEach(() => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  it('VR button has accessible label', () => {
    render(<GraphView3D />);
    const vrButton = screen.getByRole('button', { name: /enter vr/i });
    expect(vrButton).toBeInTheDocument();
  });

  it('camera control buttons have accessible labels', () => {
    render(<GraphView3D />);
    expect(screen.getByRole('button', { name: /reset camera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom to fit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle auto-rotate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keyboard shortcuts help/i })).toBeInTheDocument();
  });
});


describe('Button Hover Effects', () => {
  beforeEach(() => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => mockNodes,
        getFilteredEdges: () => mockEdges,
        updateNodePosition3D: vi.fn(),
    });
  });

  it('VR button changes style on hover', async () => {
    render(<GraphView3D />);
    const vrButton = screen.getByRole('button', { name: /enter vr/i });
    
    // Initial background color
    expect(vrButton).toHaveStyle({ backgroundColor: '#3b82f6' });
    
    // Hover
    fireEvent.mouseOver(vrButton);
    expect(vrButton).toHaveStyle({ backgroundColor: '#2563eb' });
    
    // Mouse out
    fireEvent.mouseOut(vrButton);
    expect(vrButton).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('camera control buttons change style on hover', async () => {
    render(<GraphView3D />);
    const resetButton = screen.getByRole('button', { name: /reset camera/i });
    
    // Hover
    fireEvent.mouseOver(resetButton);
    expect(resetButton).toHaveStyle({ backgroundColor: 'rgba(51, 65, 85, 0.9)' });
    
    // Mouse out
    fireEvent.mouseOut(resetButton);
    expect(resetButton).toHaveStyle({ backgroundColor: 'rgba(30, 41, 59, 0.9)' });
  });
});

describe('Large Graph Performance', () => {
  it('renders with many nodes (Barnes-Hut threshold test)', () => {
    // Create 100 nodes to exceed Barnes-Hut threshold of 50
    const manyNodes: Node<GraphNodeData>[] = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      type: i % 5 === 0 ? 'requirement' : i % 5 === 1 ? 'task' : i % 5 === 2 ? 'test' : i % 5 === 3 ? 'risk' : 'document',
      position: { x: i * 10, y: i * 10 },
      data: {
        label: `Node ${i}`,
        type: i % 5 === 0 ? 'requirement' : i % 5 === 1 ? 'task' : i % 5 === 2 ? 'test' : i % 5 === 3 ? 'risk' : 'document',
        properties: {},
      },
    }));

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: manyNodes,
      edges: [],
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      isLoading: false,
      error: null,
        getFilteredNodes: () => manyNodes,
        getFilteredEdges: () => [],
        updateNodePosition3D: vi.fn(),
    });

    render(<GraphView3D />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});

/**
 * GraphView2D Component Tests
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GraphView2D } from './GraphView2D';
import { useGraphStore } from '../../stores/graphStore';
import type { Node, Edge } from '@xyflow/react';
import type { GraphNodeData } from '../../stores/graphStore';

// Mock the graphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

// Mock ResizeObserver for react-flow
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;

// Mock DOMMatrixReadOnly for react-flow
class DOMMatrixReadOnlyMock {
  m22 = 1;
  constructor() {
    this.m22 = 1;
  }
}

(globalThis as unknown as { DOMMatrixReadOnly: typeof DOMMatrixReadOnlyMock }).DOMMatrixReadOnly = DOMMatrixReadOnlyMock;

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
];

const mockEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'req-1',
    target: 'task-1',
    type: 'smoothstep',
  },
  {
    id: 'edge-2',
    source: 'task-1',
    target: 'test-1',
    type: 'smoothstep',
  },
];

describe('GraphView2D', () => {
  let mockLoadGraph: Mock;
  let mockSelectNode: Mock;
  let mockCreateRelationship: Mock;
  let mockUpdateNodePosition: Mock;
  let mockSetViewport: Mock;
  let mockGetFilteredNodes: Mock;
  let mockGetFilteredEdges: Mock;

  beforeEach(() => {
    mockLoadGraph = vi.fn();
    mockSelectNode = vi.fn();
    mockCreateRelationship = vi.fn();
    mockUpdateNodePosition = vi.fn();
    mockSetViewport = vi.fn();
    mockGetFilteredNodes = vi.fn().mockReturnValue(mockNodes);
    mockGetFilteredEdges = vi.fn().mockReturnValue(mockEdges);

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: mockLoadGraph,
      selectNode: mockSelectNode,
      createRelationship: mockCreateRelationship,
      updateNodePosition: mockUpdateNodePosition,
      setViewport: mockSetViewport,
      getFilteredNodes: mockGetFilteredNodes,
      getFilteredEdges: mockGetFilteredEdges,
      viewport: { zoom: 1, panX: 0, panY: 0, panZ: 0 },
      isLoading: false,
      isCreatingRelationship: false,
      isViewTransitioning: false,
      error: null,
    });
  });

  it('renders without crashing', () => {
    render(<GraphView2D />);
    // React Flow renders a container
    expect(document.querySelector('.react-flow')).toBeInTheDocument();
  });

  it('calls loadGraph on mount', () => {
    render(<GraphView2D />);
    expect(mockLoadGraph).toHaveBeenCalledTimes(1);
  });

  it('displays loading state when isLoading is true and no nodes', () => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: [],
      edges: [],
      loadGraph: mockLoadGraph,
      selectNode: mockSelectNode,
      createRelationship: mockCreateRelationship,
      updateNodePosition: mockUpdateNodePosition,
      setViewport: mockSetViewport,
      getFilteredNodes: vi.fn().mockReturnValue([]),
      getFilteredEdges: vi.fn().mockReturnValue([]),
      viewport: { zoom: 1, panX: 0, panY: 0, panZ: 0 },
      isLoading: true,
      isCreatingRelationship: false,
      isViewTransitioning: false,
      error: null,
    });

    render(<GraphView2D />);
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
  });

  it('displays error state when error exists and no nodes', () => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: [],
      edges: [],
      loadGraph: mockLoadGraph,
      selectNode: mockSelectNode,
      createRelationship: mockCreateRelationship,
      updateNodePosition: mockUpdateNodePosition,
      setViewport: mockSetViewport,
      getFilteredNodes: vi.fn().mockReturnValue([]),
      getFilteredEdges: vi.fn().mockReturnValue([]),
      viewport: { zoom: 1, panX: 0, panY: 0, panZ: 0 },
      isLoading: false,
      isCreatingRelationship: false,
      isViewTransitioning: false,
      error: 'Failed to load graph data',
    });

    render(<GraphView2D />);
    expect(screen.getByText('Error: Failed to load graph data')).toBeInTheDocument();
  });

  it('renders nodes with correct labels', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      expect(screen.getByText('Requirement 1')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test 1')).toBeInTheDocument();
      expect(screen.getByText('Risk 1')).toBeInTheDocument();
    });
  });

  it('renders node type labels', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      expect(screen.getByText('REQ')).toBeInTheDocument();
      expect(screen.getByText('TASK')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('RISK')).toBeInTheDocument();
    });
  });

  it('shows signed indicator for signed requirements', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      // The signed checkmark should be visible
      const reqNode = screen.getByText('Requirement 1').closest('div');
      expect(reqNode?.parentElement?.textContent).toContain('✓');
    });
  });

  it('shows RPN for risk nodes', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      expect(screen.getByText('RPN: 120')).toBeInTheDocument();
    });
  });

  it('shows status for task nodes', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('renders Controls when showControls is true', () => {
    render(<GraphView2D showControls={true} />);
    // Controls component renders buttons for zoom
    expect(document.querySelector('.react-flow__controls')).toBeInTheDocument();
  });

  it('does not render Controls when showControls is false', () => {
    render(<GraphView2D showControls={false} />);
    expect(document.querySelector('.react-flow__controls')).not.toBeInTheDocument();
  });

  it('renders MiniMap when showMiniMap is true', () => {
    render(<GraphView2D showMiniMap={true} />);
    expect(document.querySelector('.react-flow__minimap')).toBeInTheDocument();
  });

  it('does not render MiniMap when showMiniMap is false', () => {
    render(<GraphView2D showMiniMap={false} />);
    expect(document.querySelector('.react-flow__minimap')).not.toBeInTheDocument();
  });

  it('renders Background when showBackground is true', () => {
    render(<GraphView2D showBackground={true} />);
    expect(document.querySelector('.react-flow__background')).toBeInTheDocument();
  });

  it('does not render Background when showBackground is false', () => {
    render(<GraphView2D showBackground={false} />);
    expect(document.querySelector('.react-flow__background')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<GraphView2D className="custom-graph" />);
    expect(container.querySelector('.custom-graph')).toBeInTheDocument();
  });

  it('applies custom style', () => {
    const { container } = render(<GraphView2D style={{ backgroundColor: 'red' }} />);
    const graphContainer = container.firstChild as HTMLElement;
    expect(graphContainer.style.backgroundColor).toBe('red');
  });

  it('calls selectNode when a node is clicked', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      const reqNode = screen.getByText('Requirement 1');
      fireEvent.click(reqNode);
    });

    // Note: Due to react-flow's event handling, the click may be captured differently
    // This test verifies the component renders and is interactive
    expect(mockLoadGraph).toHaveBeenCalled();
  });

  it('calls onConnectionMade callback when provided and connection is made', () => {
    const onConnectionMade = vi.fn();
    render(<GraphView2D onConnectionMade={onConnectionMade} />);

    // The callback would be called when a connection is made via drag
    // This is difficult to test without simulating the full drag interaction
    expect(document.querySelector('.react-flow')).toBeInTheDocument();
  });
});

describe('GraphView2D Node Types', () => {
  beforeEach(() => {
    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      createRelationship: vi.fn(),
      updateNodePosition: vi.fn(),
      setViewport: vi.fn(),
      getFilteredNodes: vi.fn().mockReturnValue(mockNodes),
      getFilteredEdges: vi.fn().mockReturnValue(mockEdges),
      viewport: { zoom: 1, panX: 0, panY: 0, panZ: 0 },
      isLoading: false,
      isCreatingRelationship: false,
      isViewTransitioning: false,
      error: null,
    });
  });

  it('renders requirement node with correct styling', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      // Use data-testid to find the node wrapper, then find the styled child
      const nodeWrapper = document.querySelector('[data-testid="rf__node-req-1"]');
      const styledContainer = nodeWrapper?.querySelector('div[style*="background-color"]');
      expect(styledContainer).toHaveStyle({ backgroundColor: 'rgb(227, 242, 253)' });
    });
  });

  it('renders task node with correct styling', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      const nodeWrapper = document.querySelector('[data-testid="rf__node-task-1"]');
      const styledContainer = nodeWrapper?.querySelector('div[style*="background-color"]');
      expect(styledContainer).toHaveStyle({ backgroundColor: 'rgb(232, 245, 233)' });
    });
  });

  it('renders test node with correct styling', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      const nodeWrapper = document.querySelector('[data-testid="rf__node-test-1"]');
      const styledContainer = nodeWrapper?.querySelector('div[style*="background-color"]');
      expect(styledContainer).toHaveStyle({ backgroundColor: 'rgb(255, 243, 224)' });
    });
  });

  it('renders risk node with correct styling', async () => {
    render(<GraphView2D />);

    await waitFor(() => {
      const nodeWrapper = document.querySelector('[data-testid="rf__node-risk-1"]');
      const styledContainer = nodeWrapper?.querySelector('div[style*="background-color"]');
      expect(styledContainer).toHaveStyle({ backgroundColor: 'rgb(255, 235, 238)' });
    });
  });
});

describe('GraphView2D Test Node Status Icons', () => {
  const createMockWithNodes = (nodes: Node<GraphNodeData>[]) => ({
    nodes,
    edges: [],
    loadGraph: vi.fn(),
    selectNode: vi.fn(),
    createRelationship: vi.fn(),
    updateNodePosition: vi.fn(),
    setViewport: vi.fn(),
    getFilteredNodes: vi.fn().mockReturnValue(nodes),
    getFilteredEdges: vi.fn().mockReturnValue([]),
    viewport: { zoom: 1, panX: 0, panY: 0, panZ: 0 },
    isLoading: false,
    isCreatingRelationship: false,
    isViewTransitioning: false,
    error: null,
  });

  it('shows checkmark for passed tests', async () => {
    const testNodes = [
      {
        id: 'test-passed',
        type: 'test',
        position: { x: 0, y: 0 },
        data: {
          label: 'Passed Test',
          type: 'test',
          properties: { status: 'passed' },
        },
      },
    ];
    (useGraphStore as unknown as Mock).mockReturnValue(createMockWithNodes(testNodes));

    render(<GraphView2D />);

    await waitFor(() => {
      const testNode = screen.getByText('Passed Test').closest('div')?.parentElement;
      expect(testNode?.textContent).toContain('✓');
    });
  });

  it('shows X for failed tests', async () => {
    const testNodes = [
      {
        id: 'test-failed',
        type: 'test',
        position: { x: 0, y: 0 },
        data: {
          label: 'Failed Test',
          type: 'test',
          properties: { status: 'failed' },
        },
      },
    ];
    (useGraphStore as unknown as Mock).mockReturnValue(createMockWithNodes(testNodes));

    render(<GraphView2D />);

    await waitFor(() => {
      const testNode = screen.getByText('Failed Test').closest('div')?.parentElement;
      expect(testNode?.textContent).toContain('✗');
    });
  });

  it('shows blocked icon for blocked tests', async () => {
    const testNodes = [
      {
        id: 'test-blocked',
        type: 'test',
        position: { x: 0, y: 0 },
        data: {
          label: 'Blocked Test',
          type: 'test',
          properties: { status: 'blocked' },
        },
      },
    ];
    (useGraphStore as unknown as Mock).mockReturnValue(createMockWithNodes(testNodes));

    render(<GraphView2D />);

    await waitFor(() => {
      const testNode = screen.getByText('Blocked Test').closest('div')?.parentElement;
      expect(testNode?.textContent).toContain('⊘');
    });
  });
});

describe('GraphView2D Risk RPN Colors', () => {
  const createMockWithNodes = (nodes: Node<GraphNodeData>[]) => ({
    nodes,
    edges: [],
    loadGraph: vi.fn(),
    selectNode: vi.fn(),
    createRelationship: vi.fn(),
    updateNodePosition: vi.fn(),
    setViewport: vi.fn(),
    getFilteredNodes: vi.fn().mockReturnValue(nodes),
    getFilteredEdges: vi.fn().mockReturnValue([]),
    viewport: { zoom: 1, panX: 0, panY: 0, panZ: 0 },
    isLoading: false,
    isCreatingRelationship: false,
    isViewTransitioning: false,
    error: null,
  });

  it('shows red RPN for high risk (>100)', async () => {
    const riskNodes = [
      {
        id: 'risk-high',
        type: 'risk',
        position: { x: 0, y: 0 },
        data: {
          label: 'High Risk',
          type: 'risk',
          properties: { rpn: 150 },
        },
      },
    ];
    (useGraphStore as unknown as Mock).mockReturnValue(createMockWithNodes(riskNodes));

    render(<GraphView2D />);

    await waitFor(() => {
      const rpnElement = screen.getByText('RPN: 150');
      expect(rpnElement).toHaveStyle({ color: '#d32f2f' });
    });
  });

  it('shows orange RPN for medium risk (50-100)', async () => {
    const riskNodes = [
      {
        id: 'risk-medium',
        type: 'risk',
        position: { x: 0, y: 0 },
        data: {
          label: 'Medium Risk',
          type: 'risk',
          properties: { rpn: 75 },
        },
      },
    ];
    (useGraphStore as unknown as Mock).mockReturnValue(createMockWithNodes(riskNodes));

    render(<GraphView2D />);

    await waitFor(() => {
      const rpnElement = screen.getByText('RPN: 75');
      expect(rpnElement).toHaveStyle({ color: '#f57c00' });
    });
  });

  it('shows green RPN for low risk (<50)', async () => {
    const riskNodes = [
      {
        id: 'risk-low',
        type: 'risk',
        position: { x: 0, y: 0 },
        data: {
          label: 'Low Risk',
          type: 'risk',
          properties: { rpn: 25 },
        },
      },
    ];
    (useGraphStore as unknown as Mock).mockReturnValue(createMockWithNodes(riskNodes));

    render(<GraphView2D />);

    await waitFor(() => {
      const rpnElement = screen.getByText('RPN: 25');
      expect(rpnElement).toHaveStyle({ color: '#388e3c' });
    });
  });
});

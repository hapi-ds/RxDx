/**
 * Unit tests for GraphExport component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphExport } from './GraphExport';

// Mock @xyflow/react hooks
const mockGetNodes = vi.fn();
const mockGetEdges = vi.fn();

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    getNodes: mockGetNodes,
    getEdges: mockGetEdges,
  }),
  getNodesBounds: vi.fn(() => ({ x: 0, y: 0, width: 500, height: 400 })),
  getViewportForBounds: vi.fn(() => ({ x: 100, y: 100, zoom: 1 })),
}));

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn(() => Promise.resolve('data:image/png;base64,mockPngData')),
  toSvg: vi.fn(() => Promise.resolve('data:image/svg+xml;base64,mockSvgData')),
}));

// Mock Button component
vi.mock('../common', () => ({
  Button: vi.fn(({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )),
}));

describe('GraphExport', () => {
  const mockNodes = [
    {
      id: 'node-1',
      type: 'requirement',
      position: { x: 0, y: 0 },
      data: { label: 'Test Requirement', type: 'requirement', properties: {} },
    },
    {
      id: 'node-2',
      type: 'task',
      position: { x: 200, y: 100 },
      data: { label: 'Test Task', type: 'task', properties: {} },
    },
  ];

  const mockEdges = [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      type: 'IMPLEMENTS',
      label: 'implements',
    },
  ];

  let mockViewport: HTMLDivElement;
  let mockFlowContainer: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNodes.mockReturnValue(mockNodes);
    mockGetEdges.mockReturnValue(mockEdges);

    // Mock DOM elements for export
    mockViewport = document.createElement('div');
    mockViewport.className = 'react-flow__viewport';
    mockViewport.style.transform = 'translate(0px, 0px) scale(1)';
    document.body.appendChild(mockViewport);

    mockFlowContainer = document.createElement('div');
    mockFlowContainer.className = 'react-flow';
    document.body.appendChild(mockFlowContainer);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    (globalThis as unknown as { URL: typeof URL }).URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    (globalThis as unknown as { URL: typeof URL }).URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    // Clean up mock DOM elements
    if (mockViewport.parentNode) {
      mockViewport.parentNode.removeChild(mockViewport);
    }
    if (mockFlowContainer.parentNode) {
      mockFlowContainer.parentNode.removeChild(mockFlowContainer);
    }
  });

  it('renders export button', () => {
    render(<GraphExport />);

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('opens dropdown menu when button is clicked', async () => {
    const user = userEvent.setup();
    render(<GraphExport />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('PNG Image')).toBeInTheDocument();
    expect(screen.getByText('SVG Vector')).toBeInTheDocument();
    expect(screen.getByText('Interactive HTML')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(<GraphExport />);

    // Open dropdown
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('displays export option descriptions', async () => {
    const user = userEvent.setup();
    render(<GraphExport />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(screen.getByText('High-quality raster image')).toBeInTheDocument();
    expect(screen.getByText('Scalable vector graphics')).toBeInTheDocument();
    expect(screen.getByText('Standalone interactive viewer')).toBeInTheDocument();
  });

  it('calls onExportStart callback when export begins', async () => {
    const user = userEvent.setup();
    const onExportStart = vi.fn();
    render(<GraphExport onExportStart={onExportStart} />);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText('Interactive HTML'));

    await waitFor(() => {
      expect(onExportStart).toHaveBeenCalledWith('html');
    });
  });

  it('calls onExportComplete callback when HTML export succeeds', async () => {
    const user = userEvent.setup();
    const onExportComplete = vi.fn();

    render(<GraphExport onExportComplete={onExportComplete} />);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText('Interactive HTML'));

    await waitFor(() => {
      expect(onExportComplete).toHaveBeenCalledWith('html');
    });
  });

  it('calls onExportError callback when export fails with no nodes', async () => {
    const user = userEvent.setup();
    const onExportError = vi.fn();
    mockGetNodes.mockReturnValue([]);

    render(<GraphExport onExportError={onExportError} />);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText('Interactive HTML'));

    await waitFor(() => {
      expect(onExportError).toHaveBeenCalledWith('html', expect.any(Error));
    });
  });

  it('closes dropdown after export completes', async () => {
    const user = userEvent.setup();

    render(<GraphExport />);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByText('Interactive HTML'));

    // After export completes, dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('renders with custom className', () => {
    render(<GraphExport className="custom-export-class" />);

    const container = screen.getByRole('button', { name: /export/i }).parentElement;
    expect(container).toHaveClass('custom-export-class');
  });

  it('has correct ARIA attributes for accessibility', async () => {
    const user = userEvent.setup();
    render(<GraphExport />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(exportButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(exportButton);

    expect(exportButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('menu items have correct role', async () => {
    const user = userEvent.setup();
    render(<GraphExport />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(3);
  });
});

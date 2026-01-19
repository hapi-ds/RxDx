/**
 * GraphExport Component
 * Provides export functionality for the graph visualization
 * Supports PNG, SVG, and interactive HTML export formats
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { Button } from '../common';

export type ExportFormat = 'png' | 'svg' | 'html';

export interface GraphExportProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when export starts */
  onExportStart?: (format: ExportFormat) => void;
  /** Callback when export completes */
  onExportComplete?: (format: ExportFormat) => void;
  /** Callback when export fails */
  onExportError?: (format: ExportFormat, error: Error) => void;
}

// Image export dimensions
const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;

/**
 * GraphExport - Export dropdown component for graph visualization
 * Must be used within a ReactFlowProvider context
 */
export const GraphExport: React.FC<GraphExportProps> = ({
  className,
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Download helper function
  const downloadFile = useCallback((dataUrl: string, filename: string): void => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, []);

  // Download blob helper function
  const downloadBlob = useCallback((blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Get the viewport element for export
  const getViewportElement = useCallback((): HTMLElement | null => {
    // Find the react-flow viewport element
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    return viewport;
  }, []);

  // Export as PNG
  const exportPng = useCallback(async (): Promise<void> => {
    setIsExporting(true);
    setExportingFormat('png');
    onExportStart?.('png');

    try {
      const nodes = reactFlowInstance.getNodes();
      if (nodes.length === 0) {
        throw new Error('No nodes to export');
      }

      // Get the bounds of all nodes
      const nodesBounds = getNodesBounds(nodes);
      
      // Calculate viewport to fit all nodes
      const viewport = getViewportForBounds(
        nodesBounds,
        IMAGE_WIDTH,
        IMAGE_HEIGHT,
        0.5,
        2,
        0.1
      );

      const viewportElement = getViewportElement();
      if (!viewportElement) {
        throw new Error('Could not find graph viewport element');
      }

      // Store original transform
      const originalTransform = viewportElement.style.transform;

      // Apply the calculated viewport transform
      viewportElement.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

      // Wait for the transform to be applied
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Find the react-flow container
      const flowContainer = document.querySelector('.react-flow') as HTMLElement;
      if (!flowContainer) {
        throw new Error('Could not find react-flow container');
      }

      // Export to PNG
      const dataUrl = await toPng(flowContainer, {
        backgroundColor: '#ffffff',
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        style: {
          width: `${IMAGE_WIDTH}px`,
          height: `${IMAGE_HEIGHT}px`,
        },
      });

      // Restore original transform
      viewportElement.style.transform = originalTransform;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadFile(dataUrl, `graph-export-${timestamp}.png`);

      onExportComplete?.('png');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('PNG export failed');
      console.error('PNG export error:', err);
      onExportError?.('png', err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setIsOpen(false);
    }
  }, [reactFlowInstance, getViewportElement, downloadFile, onExportStart, onExportComplete, onExportError]);

  // Export as SVG
  const exportSvg = useCallback(async (): Promise<void> => {
    setIsExporting(true);
    setExportingFormat('svg');
    onExportStart?.('svg');

    try {
      const nodes = reactFlowInstance.getNodes();
      if (nodes.length === 0) {
        throw new Error('No nodes to export');
      }

      // Get the bounds of all nodes
      const nodesBounds = getNodesBounds(nodes);
      
      // Calculate viewport to fit all nodes
      const viewport = getViewportForBounds(
        nodesBounds,
        IMAGE_WIDTH,
        IMAGE_HEIGHT,
        0.5,
        2,
        0.1
      );

      const viewportElement = getViewportElement();
      if (!viewportElement) {
        throw new Error('Could not find graph viewport element');
      }

      // Store original transform
      const originalTransform = viewportElement.style.transform;

      // Apply the calculated viewport transform
      viewportElement.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

      // Wait for the transform to be applied
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Find the react-flow container
      const flowContainer = document.querySelector('.react-flow') as HTMLElement;
      if (!flowContainer) {
        throw new Error('Could not find react-flow container');
      }

      // Export to SVG
      const dataUrl = await toSvg(flowContainer, {
        backgroundColor: '#ffffff',
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        style: {
          width: `${IMAGE_WIDTH}px`,
          height: `${IMAGE_HEIGHT}px`,
        },
      });

      // Restore original transform
      viewportElement.style.transform = originalTransform;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadFile(dataUrl, `graph-export-${timestamp}.svg`);

      onExportComplete?.('svg');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('SVG export failed');
      console.error('SVG export error:', err);
      onExportError?.('svg', err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setIsOpen(false);
    }
  }, [reactFlowInstance, getViewportElement, downloadFile, onExportStart, onExportComplete, onExportError]);

  // Export as interactive HTML
  const exportHtml = useCallback(async (): Promise<void> => {
    setIsExporting(true);
    setExportingFormat('html');
    onExportStart?.('html');

    try {
      const nodes = reactFlowInstance.getNodes();
      const edges = reactFlowInstance.getEdges();

      if (nodes.length === 0) {
        throw new Error('No nodes to export');
      }

      // Create standalone HTML with embedded graph data
      const htmlContent = generateInteractiveHtml(nodes, edges);

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `graph-export-${timestamp}.html`);

      onExportComplete?.('html');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('HTML export failed');
      console.error('HTML export error:', err);
      onExportError?.('html', err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
      setIsOpen(false);
    }
  }, [reactFlowInstance, downloadBlob, onExportStart, onExportComplete, onExportError]);

  // Handle export option click
  const handleExport = useCallback(
    (format: ExportFormat) => {
      switch (format) {
        case 'png':
          exportPng();
          break;
        case 'svg':
          exportSvg();
          break;
        case 'html':
          exportHtml();
          break;
      }
    },
    [exportPng, exportSvg, exportHtml]
  );

  return (
    <div className={`graph-export ${className ?? ''}`} ref={dropdownRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleDropdown}
        disabled={isExporting}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {isExporting ? `Exporting ${exportingFormat?.toUpperCase()}...` : 'Export ▾'}
      </Button>

      {isOpen && !isExporting && (
        <div className="export-dropdown" role="menu">
          <button
            className="export-option"
            onClick={() => handleExport('png')}
            role="menuitem"
          >
            <span className="export-icon">🖼️</span>
            <div className="export-option-content">
              <span className="export-option-title">PNG Image</span>
              <span className="export-option-desc">High-quality raster image</span>
            </div>
          </button>
          <button
            className="export-option"
            onClick={() => handleExport('svg')}
            role="menuitem"
          >
            <span className="export-icon">📐</span>
            <div className="export-option-content">
              <span className="export-option-title">SVG Vector</span>
              <span className="export-option-desc">Scalable vector graphics</span>
            </div>
          </button>
          <button
            className="export-option"
            onClick={() => handleExport('html')}
            role="menuitem"
          >
            <span className="export-icon">🌐</span>
            <div className="export-option-content">
              <span className="export-option-title">Interactive HTML</span>
              <span className="export-option-desc">Standalone interactive viewer</span>
            </div>
          </button>
        </div>
      )}

      <style>{`
        .graph-export {
          position: relative;
          display: inline-block;
        }

        .export-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 220px;
          overflow: hidden;
        }

        .export-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          transition: background-color 0.15s;
        }

        .export-option:hover {
          background-color: #f3f4f6;
        }

        .export-option:focus {
          outline: none;
          background-color: #e5e7eb;
        }

        .export-option:not(:last-child) {
          border-bottom: 1px solid #f3f4f6;
        }

        .export-icon {
          font-size: 1.25rem;
          width: 28px;
          text-align: center;
        }

        .export-option-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .export-option-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }

        .export-option-desc {
          font-size: 0.75rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

/**
 * Generate standalone interactive HTML with embedded graph data
 * Uses a minimal D3.js-based viewer for interactivity
 */
function generateInteractiveHtml(
  nodes: ReturnType<ReturnType<typeof useReactFlow>['getNodes']>,
  edges: ReturnType<ReturnType<typeof useReactFlow>['getEdges']>
): string {
  // Serialize graph data
  const graphData = {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data?.label ?? node.id,
      position: node.position,
      properties: node.data?.properties ?? {},
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: edge.label,
    })),
  };

  const graphDataJson = JSON.stringify(graphData, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RxDx Knowledge Graph Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f9fafb;
      overflow: hidden;
    }

    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      padding: 0 1rem;
      z-index: 100;
      gap: 1rem;
    }

    .header h1 {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    .header .stats {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .controls {
      margin-left: auto;
      display: flex;
      gap: 0.5rem;
    }

    .controls button {
      padding: 0.375rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background: white;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .controls button:hover {
      background: #f3f4f6;
    }

    #graph-container {
      position: fixed;
      top: 48px;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
    }

    svg {
      width: 100%;
      height: 100%;
    }

    .node {
      cursor: pointer;
    }

    .node rect {
      stroke-width: 2px;
      rx: 8;
      ry: 8;
    }

    .node text {
      font-size: 11px;
      pointer-events: none;
    }

    .node .type-label {
      font-size: 9px;
      font-weight: bold;
      opacity: 0.7;
    }

    .node .node-label {
      font-weight: 500;
    }

    .edge {
      fill: none;
      stroke: #9e9e9e;
      stroke-width: 2px;
    }

    .edge-label {
      font-size: 10px;
      fill: #6b7280;
    }

    .tooltip {
      position: fixed;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 0.75rem;
      max-width: 300px;
      z-index: 1000;
      display: none;
    }

    .tooltip.visible {
      display: block;
    }

    .tooltip h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #111827;
    }

    .tooltip .prop {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .tooltip .prop-key {
      color: #6b7280;
      min-width: 60px;
    }

    .tooltip .prop-value {
      color: #111827;
      word-break: break-word;
    }

    /* Node type colors */
    .node-requirement rect { fill: #e3f2fd; stroke: #1976d2; }
    .node-requirement text { fill: #0d47a1; }
    .node-task rect { fill: #e8f5e9; stroke: #388e3c; }
    .node-task text { fill: #1b5e20; }
    .node-test rect { fill: #fff3e0; stroke: #f57c00; }
    .node-test text { fill: #e65100; }
    .node-risk rect { fill: #ffebee; stroke: #d32f2f; }
    .node-risk text { fill: #b71c1c; }
    .node-document rect { fill: #f3e5f5; stroke: #7b1fa2; }
    .node-document text { fill: #4a148c; }
    .node-default rect { fill: #fafafa; stroke: #9e9e9e; }
    .node-default text { fill: #424242; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RxDx Knowledge Graph</h1>
    <span class="stats" id="stats"></span>
    <div class="controls">
      <button onclick="resetView()">Reset View</button>
      <button onclick="fitView()">Fit All</button>
    </div>
  </div>
  <div id="graph-container"></div>
  <div class="tooltip" id="tooltip"></div>

  <script>
    // Embedded graph data
    const graphData = ${graphDataJson};

    // Node type labels
    const typeLabels = {
      requirement: 'REQ',
      task: 'TASK',
      test: 'TEST',
      risk: 'RISK',
      document: 'DOC',
    };

    // Initialize
    const container = document.getElementById('graph-container');
    const tooltip = document.getElementById('tooltip');
    const stats = document.getElementById('stats');

    stats.textContent = \`\${graphData.nodes.length} nodes, \${graphData.edges.length} edges\`;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svg);

    // Create main group for zoom/pan
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(mainGroup);

    // Create edges group (rendered first, behind nodes)
    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.appendChild(edgesGroup);

    // Create nodes group
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.appendChild(nodesGroup);

    // Node dimensions
    const nodeWidth = 180;
    const nodeHeight = 50;

    // Create node map for edge rendering
    const nodeMap = new Map();
    graphData.nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // Render edges
    graphData.edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      const x1 = sourceNode.position.x + nodeWidth / 2;
      const y1 = sourceNode.position.y + nodeHeight;
      const x2 = targetNode.position.x + nodeWidth / 2;
      const y2 = targetNode.position.y;

      // Create smooth curve
      const midY = (y1 + y2) / 2;
      const d = \`M \${x1} \${y1} C \${x1} \${midY}, \${x2} \${midY}, \${x2} \${y2}\`;
      
      path.setAttribute('d', d);
      path.setAttribute('class', 'edge');
      path.setAttribute('marker-end', 'url(#arrowhead)');
      edgesGroup.appendChild(path);

      // Add edge label if present
      if (edge.label) {
        const labelX = (x1 + x2) / 2;
        const labelY = midY - 5;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'edge-label');
        text.textContent = edge.label;
        edgesGroup.appendChild(text);
      }
    });

    // Add arrowhead marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = \`
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#9e9e9e" />
      </marker>
    \`;
    svg.insertBefore(defs, mainGroup);

    // Render nodes
    graphData.nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', \`node node-\${node.type || 'default'}\`);
      g.setAttribute('transform', \`translate(\${node.position.x}, \${node.position.y})\`);

      // Background rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      g.appendChild(rect);

      // Type label
      const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      typeText.setAttribute('x', 10);
      typeText.setAttribute('y', 16);
      typeText.setAttribute('class', 'type-label');
      typeText.textContent = typeLabels[node.type] || node.type?.toUpperCase() || 'NODE';
      g.appendChild(typeText);

      // Node label (truncated if too long)
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('x', 10);
      labelText.setAttribute('y', 34);
      labelText.setAttribute('class', 'node-label');
      const label = node.label || node.id;
      labelText.textContent = label.length > 25 ? label.substring(0, 22) + '...' : label;
      g.appendChild(labelText);

      // Tooltip interaction
      g.addEventListener('mouseenter', (e) => {
        showTooltip(e, node);
      });
      g.addEventListener('mouseleave', () => {
        hideTooltip();
      });
      g.addEventListener('mousemove', (e) => {
        moveTooltip(e);
      });

      nodesGroup.appendChild(g);
    });

    // Tooltip functions
    function showTooltip(e, node) {
      let html = \`<h3>\${node.label || node.id}</h3>\`;
      html += \`<div class="prop"><span class="prop-key">Type:</span><span class="prop-value">\${node.type || 'unknown'}</span></div>\`;
      html += \`<div class="prop"><span class="prop-key">ID:</span><span class="prop-value">\${node.id}</span></div>\`;
      
      if (node.properties) {
        Object.entries(node.properties).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            html += \`<div class="prop"><span class="prop-key">\${key}:</span><span class="prop-value">\${value}</span></div>\`;
          }
        });
      }
      
      tooltip.innerHTML = html;
      tooltip.classList.add('visible');
      moveTooltip(e);
    }

    function hideTooltip() {
      tooltip.classList.remove('visible');
    }

    function moveTooltip(e) {
      const x = e.clientX + 15;
      const y = e.clientY + 15;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    }

    // Zoom and pan
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX, startY;

    function updateTransform() {
      mainGroup.setAttribute('transform', \`translate(\${translateX}, \${translateY}) scale(\${scale})\`);
    }

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(4, scale * delta));
      
      // Zoom towards mouse position
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      translateX = mouseX - (mouseX - translateX) * (newScale / scale);
      translateY = mouseY - (mouseY - translateY) * (newScale / scale);
      scale = newScale;
      
      updateTransform();
    });

    svg.addEventListener('mousedown', (e) => {
      if (e.target === svg || e.target === mainGroup) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        svg.style.cursor = 'grabbing';
      }
    });

    svg.addEventListener('mousemove', (e) => {
      if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      }
    });

    svg.addEventListener('mouseup', () => {
      isDragging = false;
      svg.style.cursor = 'default';
    });

    svg.addEventListener('mouseleave', () => {
      isDragging = false;
      svg.style.cursor = 'default';
    });

    // Control functions
    function resetView() {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    }

    function fitView() {
      if (graphData.nodes.length === 0) return;

      const rect = svg.getBoundingClientRect();
      const padding = 50;

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      graphData.nodes.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + nodeWidth);
        maxY = Math.max(maxY, node.position.y + nodeHeight);
      });

      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;
      const availableWidth = rect.width - padding * 2;
      const availableHeight = rect.height - padding * 2;

      scale = Math.min(availableWidth / graphWidth, availableHeight / graphHeight, 2);
      translateX = (rect.width - graphWidth * scale) / 2 - minX * scale;
      translateY = (rect.height - graphHeight * scale) / 2 - minY * scale;

      updateTransform();
    }

    // Initial fit
    setTimeout(fitView, 100);
  </script>
</body>
</html>`;
}

export default GraphExport;

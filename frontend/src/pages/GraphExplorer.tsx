/**
 * GraphExplorer page
 * Main interface for exploring the knowledge graph with 2D and 3D visualization
 * Includes GraphView2D/GraphView3D for visualization, NodeEditor for editing selected nodes,
 * ViewModeToggle for switching between views, and search functionality for finding nodes
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import React, { useCallback, useState, useEffect, useRef, Suspense } from 'react';
import { GraphView2D } from '../components/graph/GraphView2D';
import { GraphExport, type ExportFormat } from '../components/graph/GraphExport';
import { NodeEditor } from '../components/graph/NodeEditor';
import { RelationshipEditor } from '../components/graph/RelationshipEditor';
import { ConnectionMode } from '../components/graph/ConnectionMode';
import { ViewModeToggle } from '../components/graph/ViewModeToggle';
import { GraphEmptyState } from '../components/graph/GraphEmptyState';
import { LayoutSelector } from '../components/graph/LayoutSelector';
import { NodeTypeFilter } from '../components/common/NodeTypeFilter';
import { useGraphStore, type SearchResult, type ViewMode } from '../stores/graphStore';
import { Button } from '../components/common';
import { GRAPH_NODE_TYPE_OPTIONS } from '../types/filters';
import type { NodeTypeOption } from '../types/filters';
import { saveFilterState, loadFilterState } from '../utils/sessionStorage';

// Lazy load GraphView3D to prevent WebGL errors from crashing the entire page
const GraphView3D = React.lazy(() => 
  import('../components/graph/GraphView3D')
    .then(module => ({ default: module.GraphView3D }))
    .catch(() => ({ 
      default: () => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          background: '#f9fafb',
          padding: '2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>3D View Unavailable</h3>
            <p style={{ color: '#666' }}>
              WebGL is required for 3D visualization. Please use 2D view instead.
            </p>
          </div>
        </div>
      )
    }))
);

export function GraphExplorer(): React.ReactElement {
  const {
    nodes,
    isLoading,
    error,
    loadGraph,
    depth,
    setDepth,
    selectedNode,
    selectedRelationship,
    updateRelationship,
    deleteRelationship,
    selectRelationship,
    clearError,
    searchNodes,
    clearSearch,
    selectSearchResult,
    searchResults,
    isSearching,
    searchQuery,
    viewMode,
    nodeTypeFilter,
    setNodeTypeFilters,
    // Connection mode state and actions
    isConnectionMode,
    connectionSource,
    connectionTarget,
    toggleConnectionMode,
    setConnectionSource,
    setConnectionTarget,
    createConnection,
    isCreatingRelationship,
  } = useGraphStore();

  // Check if we have data to display
  const hasData = nodes.length > 0;

  // Local state for search input (controlled separately from store for debouncing)
  const [searchInput, setSearchInput] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Export state
  const [exportError, setExportError] = useState<string | null>(null);

  // Track if initial load has been done
  const hasLoadedRef = useRef(false);

  // Convert nodeTypeFilter to Set for NodeTypeFilter component
  const selectedNodeTypes = React.useMemo(() => {
    const selected = new Set<string>();
    Object.entries(nodeTypeFilter).forEach(([key, value]) => {
      if (value) {
        selected.add(key);
      }
    });
    return selected;
  }, [nodeTypeFilter]);

  // Get available node types from the predefined options
  const availableNodeTypes: NodeTypeOption[] = React.useMemo(() => {
    return GRAPH_NODE_TYPE_OPTIONS;
  }, []);

  // Handle node type filter change
  const handleNodeTypeFilterChange = useCallback((selectedTypes: Set<string>) => {
    // Convert Set to filter object
    const newFilters: Record<string, boolean> = {};
    
    // Set all types to false first
    GRAPH_NODE_TYPE_OPTIONS.forEach(option => {
      newFilters[option.value] = false;
    });
    
    // Set selected types to true
    selectedTypes.forEach(type => {
      newFilters[type] = true;
    });
    
    setNodeTypeFilters(newFilters);
  }, [setNodeTypeFilters]);

  // Load graph data on mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      // Load filter state from session storage
      const savedFilterState = loadFilterState('graph');
      if (savedFilterState && savedFilterState.size > 0) {
        // Convert Set to filter object
        const newFilters: Record<string, boolean> = {};
        
        // Set all types to false first
        GRAPH_NODE_TYPE_OPTIONS.forEach(option => {
          newFilters[option.value] = false;
        });
        
        // Set saved types to true
        savedFilterState.forEach(type => {
          newFilters[type] = true;
        });
        
        setNodeTypeFilters(newFilters);
      } else {
        // No saved state - initialize with all types enabled
        const newFilters: Record<string, boolean> = {};
        GRAPH_NODE_TYPE_OPTIONS.forEach(option => {
          newFilters[option.value] = true;
        });
        setNodeTypeFilters(newFilters);
      }
      
      loadGraph();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Save filter state to session storage when it changes
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveFilterState('graph', selectedNodeTypes);
    }
  }, [selectedNodeTypes]);

  // Sync local search input with store query when cleared externally
  useEffect(() => {
    if (searchQuery === '' && searchInput !== '') {
      const timer = setTimeout(() => {
        setSearchInput('');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchInput]);

  // Show search results dropdown when there are results
  useEffect(() => {
     
    setShowSearchResults(searchResults.length > 0 || isSearching);
  }, [searchResults, isSearching]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle depth change
  const handleDepthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newDepth = parseInt(e.target.value, 10);
      setDepth(newDepth);
      loadGraph(undefined, newDepth);
    },
    [setDepth, loadGraph]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    clearError();
    loadGraph();
  }, [clearError, loadGraph]);

  // Handle search form submission
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchInput.trim()) {
        searchNodes(searchInput.trim());
        setShowSearchResults(true);
      }
    },
    [searchInput, searchNodes]
  );

  // Handle search input change
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      
      // Clear search results if input is cleared
      if (!value.trim()) {
        clearSearch();
        setShowSearchResults(false);
      }
    },
    [clearSearch]
  );

  // Handle search result click
  const handleSearchResultClick = useCallback(
    async (result: SearchResult) => {
      await selectSearchResult(result);
      setShowSearchResults(false);
      setSearchInput('');
    },
    [selectSearchResult]
  );

  // Handle search input focus
  const handleSearchFocus = useCallback(() => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  }, [searchResults]);

  // Handle connection made callback
  const handleConnectionMade = useCallback(
    async (sourceId: string, targetId: string, type: string) => {
      try {
        await createConnection(sourceId, targetId, type);
        console.log(`Relationship created: ${sourceId} -[${type}]-> ${targetId}`);
      } catch (err) {
        console.error('Failed to create relationship:', err);
      }
    },
    [createConnection]
  );

  // Handle connection mode toggle
  const handleConnectionModeToggle = useCallback(() => {
    toggleConnectionMode();
  }, [toggleConnectionMode]);

  // Handle node click in connection mode
  const handleNodeClickInConnectionMode = useCallback(
    (nodeId: string) => {
      if (!isConnectionMode) return;

      if (!connectionSource) {
        // First node selection - set as source
        setConnectionSource(nodeId);
      } else if (connectionSource === nodeId) {
        // Clicking the same node - deselect source
        setConnectionSource(null);
      } else {
        // Second node selection - set as target
        setConnectionTarget(nodeId);
      }
    },
    [isConnectionMode, connectionSource, setConnectionSource, setConnectionTarget]
  );

  // Handle node editor close
  const handleNodeEditorClose = useCallback(() => {
    // Optional: Add any cleanup logic here
  }, []);

  // Handle node save
  const handleNodeSave = useCallback((nodeId: string) => {
    console.log(`Node saved: ${nodeId}`);
  }, []);

  // Handle relationship editor close
  const handleRelationshipEditorClose = useCallback(() => {
    selectRelationship(null);
  }, [selectRelationship]);

  // Handle relationship update
  const handleRelationshipUpdate = useCallback(
    async (relationshipId: string, type: string) => {
      await updateRelationship(relationshipId, type);
    },
    [updateRelationship]
  );

  // Handle relationship delete
  const handleRelationshipDelete = useCallback(
    async (relationshipId: string) => {
      await deleteRelationship(relationshipId);
    },
    [deleteRelationship]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    console.log(`View mode changed to: ${mode}`);
  }, []);

  // Export callbacks
  const handleExportStart = useCallback((format: ExportFormat) => {
    setExportError(null);
    console.log(`Starting ${format.toUpperCase()} export...`);
  }, []);

  const handleExportComplete = useCallback((format: ExportFormat) => {
    console.log(`${format.toUpperCase()} export completed successfully`);
  }, []);

  const handleExportError = useCallback((format: ExportFormat, err: Error) => {
    setExportError(`Failed to export as ${format.toUpperCase()}: ${err.message}`);
    console.error(`Export error (${format}):`, err);
  }, []);

  // Render the export component (used as render prop for GraphView2D)
  const renderExportButton = useCallback(() => {
    return (
      <GraphExport
        onExportStart={handleExportStart}
        onExportComplete={handleExportComplete}
        onExportError={handleExportError}
      />
    );
  }, [handleExportStart, handleExportComplete, handleExportError]);

  // Get node type display color
  const getNodeTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      requirement: '#3b82f6',
      task: '#10b981',
      test: '#8b5cf6',
      risk: '#ef4444',
      document: '#f59e0b',
    };
    return colors[type.toLowerCase()] ?? '#6b7280';
  };

  return (
    <div className="graph-explorer-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Knowledge Graph</h1>
          <p className="page-subtitle">
            Explore and manage project relationships with interactive visualization
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          {/* Node Type Filter */}
          <NodeTypeFilter
            selectedTypes={selectedNodeTypes}
            onChange={handleNodeTypeFilterChange}
            availableTypes={availableNodeTypes}
            showWorkItemTypes={true}
            showCategories={true}
            layout="compact"
            className="graph-node-filter"
          />

          {/* Layout Algorithm Selector */}
          <LayoutSelector
            showLabel={true}
            showHint={false}
            className="graph-layout-selector"
          />

          {/* Search */}
          <div className="search-container" ref={searchContainerRef}>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                className="search-input"
                placeholder="Search nodes..."
                value={searchInput}
                onChange={handleSearchInputChange}
                onFocus={handleSearchFocus}
                aria-label="Search nodes"
                aria-expanded={showSearchResults}
                aria-haspopup="listbox"
              />
              <Button 
                type="submit" 
                variant="secondary" 
                size="sm"
                disabled={isSearching || !searchInput.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="search-results-dropdown" role="listbox">
                {isSearching ? (
                  <div className="search-loading">
                    <span className="search-loading-spinner" />
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul className="search-results-list">
                    {searchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(result)}
                          role="option"
                          aria-selected="false"
                        >
                          <span
                            className="search-result-type-badge"
                            style={{ backgroundColor: getNodeTypeColor(result.type) }}
                          >
                            {result.type}
                          </span>
                          <div className="search-result-content">
                            <span className="search-result-label">{result.label}</span>
                            <span className="search-result-id">ID: {result.id}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searchInput.trim() && !isSearching ? (
                  <div className="search-no-results">
                    No nodes found matching "{searchInput}"
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Depth Control */}
          <div className="depth-control">
            <label htmlFor="depth-select" className="depth-label">
              Depth:
            </label>
            <select
              id="depth-select"
              className="depth-select"
              value={depth}
              onChange={handleDepthChange}
              aria-label="Graph depth"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          {/* Connection Mode */}
          <ConnectionMode
            isActive={isConnectionMode}
            onToggle={handleConnectionModeToggle}
            onConnectionCreated={handleConnectionMade}
            sourceNodeId={connectionSource}
            targetNodeId={connectionTarget}
            isCreating={isCreatingRelationship}
            error={error}
            onClearError={clearError}
          />

          {/* View Mode Toggle */}
          <ViewModeToggle
            onViewModeChange={handleViewModeChange}
            showShortcutHint={true}
            size="sm"
          />

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : '↻ Refresh'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="graph-container">
        {/* Error Banner */}
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-message">{error}</span>
            <button
              className="error-dismiss"
              onClick={clearError}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Export Error Banner */}
        {exportError && (
          <div className="error-banner export-error" role="alert">
            <span className="error-message">{exportError}</span>
            <button
              className="error-dismiss"
              onClick={() => setExportError(null)}
              aria-label="Dismiss export error"
            >
              ×
            </button>
          </div>
        )}

        {/* Empty State - Show when no data and not loading and no error */}
        {!isLoading && !error && !hasData && (
          <GraphEmptyState onRefresh={handleRefresh} />
        )}

        {/* Graph Visualization - Show only when we have data */}
        {!isLoading && !error && hasData && (
          <>
            {viewMode === '2d' ? (
              <GraphView2D
                className="graph-view"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0
                }}
                showMiniMap={true}
                showControls={true}
                showBackground={true}
                onConnectionMade={handleConnectionMade}
                renderToolbarContent={renderExportButton}
                isConnectionMode={isConnectionMode}
                onNodeClickInConnectionMode={handleNodeClickInConnectionMode}
                connectionSource={connectionSource}
                connectionTarget={connectionTarget}
              />
            ) : (
              <Suspense fallback={
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  background: '#f9fafb'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" />
                    <span style={{ color: '#666', marginTop: '1rem', display: 'block' }}>Loading 3D View...</span>
                  </div>
                </div>
              }>
                <GraphView3D
                  className="graph-view"
                  showVRButton={true}
                  showARButton={false}
                  enableOrbitControls={true}
                  showSimulationControls={true}
                  showCameraControls={true}
                  autoRotate={false}
                  enableKeyboardNavigation={true}
                  showXRStatus={true}
                  enableControllers={true}
                  enableHandTracking={true}
                  enableVoiceCommands={true}
                  showVoiceUI={true}
                />
              </Suspense>
            )}
          </>
        )}

        {/* Node Editor Panel */}
        {selectedNode && (
          <NodeEditor
            onClose={handleNodeEditorClose}
            onSave={handleNodeSave}
          />
        )}

        {/* Relationship Editor Panel */}
        {selectedRelationship && (
          <RelationshipEditor
            relationship={selectedRelationship}
            onUpdate={handleRelationshipUpdate}
            onDelete={handleRelationshipDelete}
            onClose={handleRelationshipEditorClose}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span className="loading-text">Loading graph...</span>
          </div>
        )}
      </div>

      <style>{`
        .graph-explorer-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.5rem;
          background-color: #f9fafb;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .page-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .page-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .graph-node-filter {
          min-width: 200px;
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-container {
          position: relative;
        }

        .search-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          width: 200px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        .search-results-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          min-width: 280px;
        }

        .search-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .search-loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .search-results-list {
          list-style: none;
          margin: 0;
          padding: 0.25rem 0;
        }

        .search-result-item {
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

        .search-result-item:hover {
          background-color: #f3f4f6;
        }

        .search-result-item:focus {
          outline: none;
          background-color: #e5e7eb;
        }

        .search-result-type-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
          min-width: 60px;
        }

        .search-result-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
          min-width: 0;
        }

        .search-result-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-result-id {
          font-size: 0.75rem;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-no-results {
          padding: 1rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .depth-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .depth-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .depth-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
          min-width: 60px;
        }

        .depth-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .graph-container {
          flex: 1;
          position: relative;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          min-height: 500px;
          height: calc(100vh - 250px);
          display: flex;
          flex-direction: column;
        }

        .graph-view {
          width: 100%;
          height: 100%;
          flex: 1;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .error-banner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #fee2e2;
          border-bottom: 1px solid #fecaca;
          z-index: 100;
        }

        .error-banner.export-error {
          top: auto;
          bottom: 0;
          border-bottom: none;
          border-top: 1px solid #fecaca;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.875rem;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .error-dismiss:hover {
          opacity: 1;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.9);
          z-index: 50;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .graph-explorer-page {
            padding: 1rem;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-left,
          .toolbar-right {
            justify-content: center;
          }

          .search-input {
            width: 100%;
            max-width: 300px;
          }

          .page-title {
            font-size: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .search-form {
            flex-direction: column;
            width: 100%;
          }

          .search-input {
            width: 100%;
            max-width: none;
          }

          .search-results-dropdown {
            min-width: 100%;
          }

          .depth-control {
            width: 100%;
            justify-content: space-between;
          }

          .depth-select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default GraphExplorer;

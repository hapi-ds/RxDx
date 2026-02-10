/**
 * Session storage utility functions for filter persistence
 * 
 * Provides functions to save, load, and clear filter state in browser session storage.
 * Filter state persists during a user's session but is cleared on logout or browser close.
 */

const FILTER_STORAGE_KEY = 'rxdx_node_filters';

export interface StoredFilterState {
  table: {
    nodeTypes: string[];
    timestamp: number;
  };
  graph: {
    nodeTypes: string[];
    timestamp: number;
  };
}

/**
 * Save filter state for a specific page
 * @param page - The page identifier ('table' or 'graph')
 * @param filterState - Set of selected node type strings
 */
export function saveFilterState(page: 'table' | 'graph', filterState: Set<string>): void {
  try {
    // Load existing state
    const existingState = loadAllFilterState();
    
    // Update the specific page's filter state
    const updatedState: StoredFilterState = {
      ...existingState,
      [page]: {
        nodeTypes: Array.from(filterState),
        timestamp: Date.now(),
      },
    };
    
    // Save to session storage
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(updatedState));
  } catch (error) {
    console.error('[SessionStorage] Failed to save filter state:', error);
  }
}

/**
 * Load filter state for a specific page
 * @param page - The page identifier ('table' or 'graph')
 * @returns Set of selected node type strings, or null if no state exists
 */
export function loadFilterState(page: 'table' | 'graph'): Set<string> | null {
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
    
    if (!stored) {
      return null;
    }
    
    const allState = JSON.parse(stored);
    
    // Validate structure
    if (!isValidFilterState(allState)) {
      return null;
    }
    
    const pageState = allState[page];
    
    if (!pageState || !Array.isArray(pageState.nodeTypes)) {
      return null;
    }
    
    // Return null if the array is empty (no filters set)
    if (pageState.nodeTypes.length === 0) {
      return null;
    }
    
    return new Set(pageState.nodeTypes);
  } catch (error) {
    console.error('[SessionStorage] Failed to load filter state:', error);
    return null;
  }
}

/**
 * Load all filter state from session storage
 * @returns Complete filter state object with defaults
 */
function loadAllFilterState(): StoredFilterState {
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
    
    if (!stored) {
      return getDefaultFilterState();
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate structure
    if (!isValidFilterState(parsed)) {
      console.warn('[SessionStorage] Invalid filter state structure, using defaults');
      return getDefaultFilterState();
    }
    
    return parsed;
  } catch (error) {
    console.error('[SessionStorage] Failed to parse filter state:', error);
    return getDefaultFilterState();
  }
}

/**
 * Validate filter state structure
 * @param state - State object to validate
 * @returns True if valid, false otherwise
 */
function isValidFilterState(state: unknown): state is StoredFilterState {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  const s = state as Record<string, unknown>;
  
  // Check table state
  if (s.table && typeof s.table === 'object') {
    const table = s.table as Record<string, unknown>;
    if (!Array.isArray(table.nodeTypes) || typeof table.timestamp !== 'number') {
      return false;
    }
  }
  
  // Check graph state
  if (s.graph && typeof s.graph === 'object') {
    const graph = s.graph as Record<string, unknown>;
    if (!Array.isArray(graph.nodeTypes) || typeof graph.timestamp !== 'number') {
      return false;
    }
  }
  
  return true;
}

/**
 * Get default filter state
 * @returns Default filter state with empty filters
 */
function getDefaultFilterState(): StoredFilterState {
  return {
    table: {
      nodeTypes: [],
      timestamp: Date.now(),
    },
    graph: {
      nodeTypes: [],
      timestamp: Date.now(),
    },
  };
}

/**
 * Clear all filter state from session storage
 * Should be called on logout
 */
export function clearFilterState(): void {
  try {
    sessionStorage.removeItem(FILTER_STORAGE_KEY);
  } catch (error) {
    console.error('[SessionStorage] Failed to clear filter state:', error);
  }
}

/**
 * Clear filter state for a specific page
 * @param page - The page identifier ('table' or 'graph')
 */
export function clearPageFilterState(page: 'table' | 'graph'): void {
  try {
    const allState = loadAllFilterState();
    allState[page] = {
      nodeTypes: [],
      timestamp: Date.now(),
    };
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(allState));
  } catch (error) {
    console.error('[SessionStorage] Failed to clear page filter state:', error);
  }
}

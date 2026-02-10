/**
 * Property-based test for duplicate relationship prevention
 * Feature: graph-table-ui-enhancements, Property 12: Duplicate Relationship Prevention
 * Validates: Requirements 7.9
 * 
 * Property: For any two nodes with an existing relationship of type T,
 * attempting to create another relationship of the same type T between
 * the same nodes should fail with an error.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { useGraphStore } from './graphStore';
import * as graphService from '../services/graphService';

// Mock the graphService
vi.mock('../services/graphService', () => ({
  graphService: {
    getVisualization: vi.fn(),
    createRelationship: vi.fn(),
    updateRelationship: vi.fn(),
    deleteRelationship: vi.fn(),
    search: vi.fn(),
    getAvailableNodeTypes: vi.fn(),
  },
}));

describe('Feature: graph-table-ui-enhancements, Property 12: Duplicate Relationship Prevention', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedRelationship: null,
      viewMode: '2d',
      searchResults: [],
      isSearching: false,
      searchQuery: '',
      isLoading: false,
      isUpdating: false,
      isCreatingRelationship: false,
      isLoadingNodeTypes: false,
      error: null,
      isConnectionMode: false,
      connectionSource: null,
      connectionTarget: null,
      centerNodeId: null,
      depth: 2,
      nodePositions: new Map(),
      viewport: { zoom: 1.0, panX: 0, panY: 0, panZ: 0 },
      nodeTypeFilter: {
        requirement: true,
        task: true,
        test: true,
        risk: true,
        document: true,
        WorkItem: true,
        Project: true,
        Phase: true,
        Workpackage: true,
        Resource: true,
        Company: true,
        Department: true,
        Milestone: true,
        Sprint: true,
        Backlog: true,
        User: true,
        Entity: true,
        Document: true,
        Failure: true,
      },
      availableNodeTypes: [],
      isViewTransitioning: false,
      lastViewModeChange: 0,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should prevent duplicate relationships between the same nodes with the same type', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary node IDs (UUIDs)
        fc.uuid(),
        fc.uuid(),
        // Generate arbitrary relationship type
        fc.constantFrom(
          'TESTED_BY',
          'MITIGATES',
          'DEPENDS_ON',
          'IMPLEMENTS',
          'LEADS_TO',
          'RELATES_TO',
          'MENTIONED_IN',
          'REFERENCES',
          'BLOCKS'
        ),
        async (sourceId, targetId, relationshipType) => {
          // Skip if source and target are the same (self-loops)
          if (sourceId === targetId) {
            return true;
          }

          // Set up initial state with an existing relationship
          const existingEdge = {
            id: `edge-${sourceId}-${targetId}-${relationshipType}`,
            source: sourceId,
            target: targetId,
            type: relationshipType,
            label: relationshipType,
            data: {},
          };

          useGraphStore.setState({
            edges: [existingEdge],
          });

          // Attempt to create a duplicate relationship
          const store = useGraphStore.getState();
          
          try {
            await store.createConnection(sourceId, targetId, relationshipType);
            
            // If we reach here, the duplicate was not prevented - test should fail
            return false;
          } catch (error) {
            // Verify that the error message indicates duplicate prevention
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isDuplicateError = errorMessage.toLowerCase().includes('already exists') ||
                                    errorMessage.toLowerCase().includes('duplicate');
            
            // Verify that the graphService.createRelationship was NOT called
            // (duplicate check should happen before API call)
            const wasApiCalled = vi.mocked(graphService.graphService.createRelationship).mock.calls.length > 0;
            
            // Property holds if:
            // 1. An error was thrown
            // 2. The error message indicates duplicate prevention
            // 3. The API was not called (duplicate check happened locally)
            return isDuplicateError && !wasApiCalled;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow creating relationships with different types between the same nodes', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary node IDs
        fc.uuid(),
        fc.uuid(),
        // Generate two different relationship types
        fc.constantFrom(
          'TESTED_BY',
          'MITIGATES',
          'DEPENDS_ON',
          'IMPLEMENTS',
          'LEADS_TO',
          'RELATES_TO'
        ),
        fc.constantFrom(
          'REFERENCES',
          'BLOCKS',
          'MENTIONED_IN',
          'CREATED_BY',
          'ASSIGNED_TO'
        ),
        async (sourceId, targetId, type1, type2) => {
          // Skip if source and target are the same
          if (sourceId === targetId) {
            return true;
          }

          // Ensure types are different
          if (type1 === type2) {
            return true;
          }

          // Set up initial state with one relationship type
          const existingEdge = {
            id: `edge-${sourceId}-${targetId}-${type1}`,
            source: sourceId,
            target: targetId,
            type: type1,
            label: type1,
            data: {},
          };

          useGraphStore.setState({
            edges: [existingEdge],
          });

          // Mock successful API call for different type
          vi.mocked(graphService.graphService.createRelationship).mockResolvedValue(undefined);
          vi.mocked(graphService.graphService.getVisualization).mockResolvedValue({
            nodes: [],
            edges: [
              existingEdge,
              {
                id: `edge-${sourceId}-${targetId}-${type2}`,
                source: sourceId,
                target: targetId,
                type: type2,
                label: type2,
                properties: {},
              },
            ],
          });

          // Attempt to create a relationship with a different type
          const store = useGraphStore.getState();
          
          try {
            await store.createConnection(sourceId, targetId, type2);
            
            // Should succeed - different type is allowed
            // Verify that the API was called
            const wasApiCalled = vi.mocked(graphService.graphService.createRelationship).mock.calls.length > 0;
            
            return wasApiCalled;
          } catch (error) {
            // Should not throw an error for different type
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow creating relationships between different node pairs with the same type', () => {
    fc.assert(
      fc.property(
        // Generate four different node IDs (two pairs)
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        // Generate arbitrary relationship type
        fc.constantFrom(
          'TESTED_BY',
          'MITIGATES',
          'DEPENDS_ON',
          'IMPLEMENTS',
          'BLOCKS'
        ),
        async (source1, target1, source2, target2, relationshipType) => {
          // Skip if any pair has same source and target
          if (source1 === target1 || source2 === target2) {
            return true;
          }

          // Skip if the pairs are the same
          if (source1 === source2 && target1 === target2) {
            return true;
          }

          // Set up initial state with one relationship
          const existingEdge = {
            id: `edge-${source1}-${target1}-${relationshipType}`,
            source: source1,
            target: target1,
            type: relationshipType,
            label: relationshipType,
            data: {},
          };

          useGraphStore.setState({
            edges: [existingEdge],
          });

          // Mock successful API call
          vi.mocked(graphService.graphService.createRelationship).mockResolvedValue(undefined);
          vi.mocked(graphService.graphService.getVisualization).mockResolvedValue({
            nodes: [],
            edges: [
              existingEdge,
              {
                id: `edge-${source2}-${target2}-${relationshipType}`,
                source: source2,
                target: target2,
                type: relationshipType,
                label: relationshipType,
                properties: {},
              },
            ],
          });

          // Attempt to create a relationship between different nodes
          const store = useGraphStore.getState();
          
          try {
            await store.createConnection(source2, target2, relationshipType);
            
            // Should succeed - different node pair is allowed
            const wasApiCalled = vi.mocked(graphService.graphService.createRelationship).mock.calls.length > 0;
            
            return wasApiCalled;
          } catch (error) {
            // Should not throw an error for different node pair
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


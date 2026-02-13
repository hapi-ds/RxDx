/**
 * Property-based tests for graph store search functionality
 * Feature: graph-ui-enhancements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useGraphStore } from './graphStore';
import type { Node } from '@xyflow/react';
import type { CustomNodeData } from '../components/graph/nodes/types';

describe('Graph Store Search Property Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.getState().reset();
  });

  describe('Property 6: Search scope completeness', () => {
    // Feature: graph-ui-enhancements, Property 6: Search scope completeness
    // **Validates: Requirements 2.1, 2.2**
    // For any node in the graph (regardless of type), if the search query matches
    // either its ID or label, the node should appear in the search results.

    it('should find all nodes matching ID or label regardless of type', () => {
      fc.assert(
        fc.property(
          // Generate an array of nodes with various types
          fc.array(
            fc.record({
              id: fc.uuid(),
              label: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom(
                'requirement', 'task', 'test', 'risk', 'document',
                'WorkItem', 'User', 'Project', 'Phase', 'Workpackage',
                'Resource', 'Company', 'Department', 'Milestone'
              ),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          // Generate a search query
          fc.string({ minLength: 2, maxLength: 10 }),
          (nodeData, query) => {
            const store = useGraphStore.getState();
            
            // Ensure unique IDs (filter out duplicates)
            const uniqueNodeData = nodeData.filter((data, index, self) =>
              index === self.findIndex(d => d.id === data.id)
            );
            
            // Skip test if we don't have enough unique nodes
            if (uniqueNodeData.length < 5) {
              return true;
            }
            
            // Transform node data to react-flow Node format
            const nodes: Node<CustomNodeData>[] = uniqueNodeData.map((data, index) => ({
              id: data.id,
              type: data.type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: data.label,
                type: data.type,
                properties: {},
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(query);
            
            const results = useGraphStore.getState().searchResults;
            const queryLower = query.toLowerCase().trim();
            
            // Skip if query is only whitespace
            if (!queryLower) {
              return true;
            }
            
            // Find all nodes that should match
            const expectedMatches = nodes.filter(node => {
              const idMatch = node.id.toLowerCase().includes(queryLower);
              const labelMatch = node.data?.label?.toLowerCase().includes(queryLower);
              return idMatch || labelMatch;
            });
            
            // Verify all expected matches are in results
            expectedMatches.forEach(expectedNode => {
              const found = results.some(result => result.id === expectedNode.id);
              expect(found).toBe(true);
            });
            
            // Verify no unexpected results
            results.forEach(result => {
              const idMatch = result.id.toLowerCase().includes(queryLower);
              const labelMatch = result.label.toLowerCase().includes(queryLower);
              expect(idMatch || labelMatch).toBe(true);
            });
            
            // Verify result count matches expected
            expect(results.length).toBe(expectedMatches.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should search across all node types including WorkItems, Users, Projects, etc.', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 10 }),
          (searchTerm) => {
            const store = useGraphStore.getState();
            
            // Create nodes of different types, some matching the search term
            const nodeTypes = [
              'requirement', 'task', 'test', 'risk', 'document',
              'WorkItem', 'User', 'Project', 'Phase', 'Workpackage',
              'Resource', 'Company', 'Department', 'Milestone'
            ];
            
            const nodes: Node<CustomNodeData>[] = nodeTypes.map((type, index) => ({
              id: `node-${index}`,
              type: type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: index % 2 === 0 ? `${searchTerm}-label-${index}` : `other-label-${index}`,
                type,
                properties: {},
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(searchTerm);
            
            const results = useGraphStore.getState().searchResults;
            
            // Verify that results include nodes from various types
            const resultTypes = new Set(results.map(r => r.type));
            
            // At least some results should be found (since we created matching nodes)
            expect(results.length).toBeGreaterThan(0);
            
            // All results should match the search term
            results.forEach(result => {
              const idMatch = result.id.toLowerCase().includes(searchTerm.toLowerCase());
              const labelMatch = result.label.toLowerCase().includes(searchTerm.toLowerCase());
              expect(idMatch || labelMatch).toBe(true);
            });
            
            // Verify we're searching across different node types
            // (at least one result should be found since we created matching nodes)
            expect(resultTypes.size).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should match against both node ID and node label', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 10 }),
          fc.string({ minLength: 3, maxLength: 10 }),
          (idPart, labelPart) => {
            const store = useGraphStore.getState();
            
            // Create nodes with specific ID and label patterns
            const nodes: Node<CustomNodeData>[] = [
              {
                id: `id-${idPart}-123`,
                type: 'requirement',
                position: { x: 0, y: 0 },
                data: {
                  label: 'no-match-label',
                  type: 'requirement',
                  properties: {},
                },
              },
              {
                id: 'no-match-id',
                type: 'task',
                position: { x: 100, y: 100 },
                data: {
                  label: `label-${labelPart}-456`,
                  type: 'task',
                  properties: {},
                },
              },
              {
                id: 'other-id',
                type: 'test',
                position: { x: 200, y: 200 },
                data: {
                  label: 'other-label',
                  type: 'test',
                  properties: {},
                },
              },
            ];
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Search by ID part
            store.searchNodes(idPart);
            let results = useGraphStore.getState().searchResults;
            
            // Should find the node with matching ID
            expect(results.some(r => r.id.includes(idPart))).toBe(true);
            
            // Search by label part
            store.searchNodes(labelPart);
            results = useGraphStore.getState().searchResults;
            
            // Should find the node with matching label
            expect(results.some(r => r.label.includes(labelPart))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Case-insensitive search equivalence', () => {
    // Feature: graph-ui-enhancements, Property 7: Case-insensitive search equivalence
    // **Validates: Requirements 2.3**
    // For any search query string, searching with different case variations
    // (uppercase, lowercase, mixed) should return the same set of results.

    it('should return same results regardless of query case', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              label: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom('requirement', 'task', 'test', 'User', 'Project'),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          fc.string({ minLength: 2, maxLength: 20 }),
          (nodeData, query) => {
            const store = useGraphStore.getState();
            
            // Transform node data to react-flow Node format
            const nodes: Node<CustomNodeData>[] = nodeData.map((data, index) => ({
              id: data.id,
              type: data.type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: data.label,
                type: data.type,
                properties: {},
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Search with lowercase query
            store.searchNodes(query.toLowerCase());
            const resultsLower = [...useGraphStore.getState().searchResults];
            
            // Search with uppercase query
            store.searchNodes(query.toUpperCase());
            const resultsUpper = [...useGraphStore.getState().searchResults];
            
            // Search with mixed case query
            const mixedCase = query.split('').map((char, i) => 
              i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
            ).join('');
            store.searchNodes(mixedCase);
            const resultsMixed = [...useGraphStore.getState().searchResults];
            
            // All three searches should return the same results
            expect(resultsLower.length).toBe(resultsUpper.length);
            expect(resultsLower.length).toBe(resultsMixed.length);
            
            // Sort results by ID for comparison
            const sortById = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
            resultsLower.sort(sortById);
            resultsUpper.sort(sortById);
            resultsMixed.sort(sortById);
            
            // Verify same IDs in all result sets
            resultsLower.forEach((result, index) => {
              expect(result.id).toBe(resultsUpper[index].id);
              expect(result.id).toBe(resultsMixed[index].id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should match nodes with different case labels', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 15 }),
          (searchTerm) => {
            const store = useGraphStore.getState();
            
            // Create nodes with labels in different cases
            const nodes: Node<CustomNodeData>[] = [
              {
                id: 'node-1',
                type: 'requirement',
                position: { x: 0, y: 0 },
                data: {
                  label: searchTerm.toLowerCase(),
                  type: 'requirement',
                  properties: {},
                },
              },
              {
                id: 'node-2',
                type: 'task',
                position: { x: 100, y: 100 },
                data: {
                  label: searchTerm.toUpperCase(),
                  type: 'task',
                  properties: {},
                },
              },
              {
                id: 'node-3',
                type: 'test',
                position: { x: 200, y: 200 },
                data: {
                  label: searchTerm.split('').map((c, i) => 
                    i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
                  ).join(''),
                  type: 'test',
                  properties: {},
                },
              },
            ];
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Search with any case variation
            store.searchNodes(searchTerm);
            const results = useGraphStore.getState().searchResults;
            
            // Should find all three nodes regardless of their label case
            expect(results.length).toBe(3);
            expect(results.some(r => r.id === 'node-1')).toBe(true);
            expect(results.some(r => r.id === 'node-2')).toBe(true);
            expect(results.some(r => r.id === 'node-3')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should match nodes with different case IDs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 15 }).filter(s => /[a-zA-Z]/.test(s)),
          (searchTerm) => {
            const store = useGraphStore.getState();
            
            // Create nodes with IDs in different cases
            const nodes: Node<CustomNodeData>[] = [
              {
                id: `id-${searchTerm.toLowerCase()}-1`,
                type: 'requirement',
                position: { x: 0, y: 0 },
                data: {
                  label: 'Label 1',
                  type: 'requirement',
                  properties: {},
                },
              },
              {
                id: `id-${searchTerm.toUpperCase()}-2`,
                type: 'task',
                position: { x: 100, y: 100 },
                data: {
                  label: 'Label 2',
                  type: 'task',
                  properties: {},
                },
              },
            ];
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Search with any case variation
            store.searchNodes(searchTerm);
            const results = useGraphStore.getState().searchResults;
            
            // Should find both nodes regardless of their ID case
            expect(results.length).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Search result completeness', () => {
    // Feature: graph-ui-enhancements, Property 8: Search result completeness
    // **Validates: Requirements 2.4**
    // For any search query, all nodes whose ID or label contains the query string
    // (case-insensitive) should be included in the results.

    it('should find all nodes matching the query string', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              label: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            }),
            { minLength: 10, maxLength: 100 }
          ),
          fc.string({ minLength: 2, maxLength: 10 }),
          (nodeData, query) => {
            const store = useGraphStore.getState();
            
            // Ensure unique IDs (filter out duplicates)
            const uniqueNodeData = nodeData.filter((data, index, self) =>
              index === self.findIndex(d => d.id === data.id)
            );
            
            // Skip test if we don't have enough unique nodes
            if (uniqueNodeData.length < 5) {
              return true;
            }
            
            // Transform node data to react-flow Node format
            const nodes: Node<CustomNodeData>[] = uniqueNodeData.map((data, index) => ({
              id: data.id,
              type: data.type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: data.label,
                type: data.type,
                properties: {},
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(query);
            
            const results = useGraphStore.getState().searchResults;
            const queryLower = query.toLowerCase().trim();
            
            // Skip if query is only whitespace
            if (!queryLower) {
              return true;
            }
            
            // All results should match the query
            results.forEach(result => {
              const idMatch = result.id.toLowerCase().includes(queryLower);
              const labelMatch = result.label.toLowerCase().includes(queryLower);
              expect(idMatch || labelMatch).toBe(true);
            });
            
            // All matching nodes should be in results
            nodes.forEach(node => {
              const idMatch = node.id.toLowerCase().includes(queryLower);
              const labelMatch = node.data?.label?.toLowerCase().includes(queryLower);
              
              if (idMatch || labelMatch) {
                const found = results.some(r => r.id === node.id);
                expect(found).toBe(true);
              }
            });
            
            // Count expected matches
            const expectedCount = nodes.filter(node => {
              const idMatch = node.id.toLowerCase().includes(queryLower);
              const labelMatch = node.data?.label?.toLowerCase().includes(queryLower);
              return idMatch || labelMatch;
            }).length;
            
            // Result count should match expected count
            expect(results.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not miss any matching nodes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 10 }),
          fc.integer({ min: 5, max: 20 }),
          (searchTerm, matchingCount) => {
            const store = useGraphStore.getState();
            
            // Create a mix of matching and non-matching nodes
            const nodes: Node<CustomNodeData>[] = [];
            
            // Add matching nodes (with search term in ID or label)
            for (let i = 0; i < matchingCount; i++) {
              if (i % 2 === 0) {
                // Match in ID
                nodes.push({
                  id: `id-${searchTerm}-${i}`,
                  type: 'requirement',
                  position: { x: i * 100, y: i * 100 },
                  data: {
                    label: `Label ${i}`,
                    type: 'requirement',
                    properties: {},
                  },
                });
              } else {
                // Match in label
                nodes.push({
                  id: `id-${i}`,
                  type: 'task',
                  position: { x: i * 100, y: i * 100 },
                  data: {
                    label: `Label ${searchTerm} ${i}`,
                    type: 'task',
                    properties: {},
                  },
                });
              }
            }
            
            // Add non-matching nodes
            for (let i = 0; i < 10; i++) {
              nodes.push({
                id: `other-id-${i}`,
                type: 'test',
                position: { x: (matchingCount + i) * 100, y: (matchingCount + i) * 100 },
                data: {
                  label: `Other Label ${i}`,
                  type: 'test',
                  properties: {},
                },
              });
            }
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(searchTerm);
            
            const results = useGraphStore.getState().searchResults;
            
            // Should find exactly the matching nodes
            expect(results.length).toBe(matchingCount);
            
            // All results should contain the search term
            results.forEach(result => {
              const idMatch = result.id.toLowerCase().includes(searchTerm.toLowerCase());
              const labelMatch = result.label.toLowerCase().includes(searchTerm.toLowerCase());
              expect(idMatch || labelMatch).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include partial matches', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 10 }),
          (substring) => {
            const store = useGraphStore.getState();
            
            // Create nodes with the substring at different positions
            const nodes: Node<CustomNodeData>[] = [
              {
                id: `${substring}`,
                type: 'requirement',
                position: { x: 0, y: 0 },
                data: {
                  label: 'Label 1',
                  type: 'requirement',
                  properties: {},
                },
              },
              {
                id: `prefix-${substring}`,
                type: 'task',
                position: { x: 100, y: 100 },
                data: {
                  label: 'Label 2',
                  type: 'task',
                  properties: {},
                },
              },
              {
                id: `${substring}-suffix`,
                type: 'test',
                position: { x: 200, y: 200 },
                data: {
                  label: 'Label 3',
                  type: 'test',
                  properties: {},
                },
              },
              {
                id: `prefix-${substring}-suffix`,
                type: 'risk',
                position: { x: 300, y: 300 },
                data: {
                  label: 'Label 4',
                  type: 'risk',
                  properties: {},
                },
              },
              {
                id: 'no-match',
                type: 'document',
                position: { x: 400, y: 400 },
                data: {
                  label: `${substring}`,
                  type: 'document',
                  properties: {},
                },
              },
            ];
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(substring);
            
            const results = useGraphStore.getState().searchResults;
            
            // Should find all 5 nodes (4 with ID match, 1 with label match)
            expect(results.length).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty results for non-matching queries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 10 }),
          (nonMatchingQuery) => {
            const store = useGraphStore.getState();
            
            // Create nodes that definitely don't match the query
            const nodes: Node<CustomNodeData>[] = [
              {
                id: 'node-1',
                type: 'requirement',
                position: { x: 0, y: 0 },
                data: {
                  label: 'Label 1',
                  type: 'requirement',
                  properties: {},
                },
              },
              {
                id: 'node-2',
                type: 'task',
                position: { x: 100, y: 100 },
                data: {
                  label: 'Label 2',
                  type: 'task',
                  properties: {},
                },
              },
            ];
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search with a query that won't match
            const uniqueQuery = `${nonMatchingQuery}-xyz-unique-123`;
            store.searchNodes(uniqueQuery);
            
            const results = useGraphStore.getState().searchResults;
            
            // Should return empty results
            expect(results.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Search result formatting', () => {
    // Feature: graph-ui-enhancements, Property 9: Search result formatting
    // **Validates: Requirements 2.6**
    // For any search result, the rendered output should contain the node's type, ID, and label.

    it('should include type, ID, and label in all search results', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              label: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom(
                'requirement', 'task', 'test', 'risk', 'document',
                'WorkItem', 'User', 'Project', 'Phase', 'Workpackage'
              ),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          fc.string({ minLength: 2, maxLength: 10 }),
          (nodeData, query) => {
            const store = useGraphStore.getState();
            
            // Transform node data to react-flow Node format
            const nodes: Node<CustomNodeData>[] = nodeData.map((data, index) => ({
              id: data.id,
              type: data.type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: data.label,
                type: data.type,
                properties: {},
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(query);
            
            const results = useGraphStore.getState().searchResults;
            
            // Verify all results have required fields
            results.forEach(result => {
              // Must have type
              expect(result.type).toBeDefined();
              expect(typeof result.type).toBe('string');
              expect(result.type.length).toBeGreaterThan(0);
              
              // Must have ID
              expect(result.id).toBeDefined();
              expect(typeof result.id).toBe('string');
              expect(result.id.length).toBeGreaterThan(0);
              
              // Must have label
              expect(result.label).toBeDefined();
              expect(typeof result.label).toBe('string');
              expect(result.label.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve original type, ID, and label values', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            label: fc.string({ minLength: 5, maxLength: 50 }),
            type: fc.constantFrom('requirement', 'task', 'User', 'Project'),
          }),
          (nodeData) => {
            const store = useGraphStore.getState();
            
            // Create a single node
            const node: Node<CustomNodeData> = {
              id: nodeData.id,
              type: nodeData.type.toLowerCase(),
              position: { x: 0, y: 0 },
              data: {
                label: nodeData.label,
                type: nodeData.type,
                properties: {},
              },
            };
            
            // Set node in the store
            store.reset();
            useGraphStore.setState({ nodes: [node] });
            
            // Search for the node by ID
            store.searchNodes(nodeData.id.substring(0, 8));
            
            const results = useGraphStore.getState().searchResults;
            
            // Should find the node
            expect(results.length).toBeGreaterThan(0);
            
            // Find our specific node in results
            const result = results.find(r => r.id === nodeData.id);
            expect(result).toBeDefined();
            
            if (result) {
              // Verify values match original
              expect(result.id).toBe(nodeData.id);
              expect(result.label).toBe(nodeData.label);
              expect(result.type).toBe(nodeData.type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include properties object in search results', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              label: fc.string({ minLength: 5, maxLength: 50 }),
              type: fc.constantFrom('requirement', 'task', 'test'),
              properties: fc.record({
                priority: fc.integer({ min: 1, max: 5 }),
                status: fc.constantFrom('draft', 'active', 'completed'),
              }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          fc.string({ minLength: 2, maxLength: 10 }),
          (nodeData, query) => {
            const store = useGraphStore.getState();
            
            // Transform node data to react-flow Node format
            const nodes: Node<CustomNodeData>[] = nodeData.map((data, index) => ({
              id: data.id,
              type: data.type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: data.label,
                type: data.type,
                properties: data.properties,
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(query);
            
            const results = useGraphStore.getState().searchResults;
            
            // Verify all results have properties object
            results.forEach(result => {
              expect(result.properties).toBeDefined();
              expect(typeof result.properties).toBe('object');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nodes with missing or empty labels gracefully', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom('requirement', 'task', 'User', 'Project'),
          (id, type) => {
            const store = useGraphStore.getState();
            
            // Create nodes with various label states
            const nodes: Node<CustomNodeData>[] = [
              {
                id: `${id}-1`,
                type: type.toLowerCase(),
                position: { x: 0, y: 0 },
                data: {
                  label: '', // Empty label
                  type,
                  properties: {},
                },
              },
              {
                id: `${id}-2`,
                type: type.toLowerCase(),
                position: { x: 100, y: 100 },
                data: {
                  label: 'Valid Label',
                  type,
                  properties: {},
                },
              },
            ];
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Search by ID
            store.searchNodes(id.substring(0, 8));
            
            const results = useGraphStore.getState().searchResults;
            
            // Should find both nodes
            expect(results.length).toBe(2);
            
            // All results should have label field (even if empty)
            results.forEach(result => {
              expect(result).toHaveProperty('label');
              expect(typeof result.label).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format results consistently across different node types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 10 }),
          (searchTerm) => {
            const store = useGraphStore.getState();
            
            // Create nodes of different types with consistent structure
            const nodeTypes = [
              'requirement', 'task', 'test', 'risk', 'document',
              'WorkItem', 'User', 'Project', 'Phase', 'Resource'
            ];
            
            const nodes: Node<CustomNodeData>[] = nodeTypes.map((type, index) => ({
              id: `${searchTerm}-id-${index}`,
              type: type.toLowerCase(),
              position: { x: index * 100, y: index * 100 },
              data: {
                label: `${searchTerm} Label ${index}`,
                type,
                properties: { index },
              },
            }));
            
            // Set nodes in the store
            store.reset();
            useGraphStore.setState({ nodes });
            
            // Perform search
            store.searchNodes(searchTerm);
            
            const results = useGraphStore.getState().searchResults;
            
            // Should find all nodes
            expect(results.length).toBe(nodeTypes.length);
            
            // All results should have the same structure
            results.forEach(result => {
              // Check required fields exist
              expect(result).toHaveProperty('id');
              expect(result).toHaveProperty('type');
              expect(result).toHaveProperty('label');
              expect(result).toHaveProperty('properties');
              
              // Check field types
              expect(typeof result.id).toBe('string');
              expect(typeof result.type).toBe('string');
              expect(typeof result.label).toBe('string');
              expect(typeof result.properties).toBe('object');
              
              // Check values are not empty
              expect(result.id.length).toBeGreaterThan(0);
              expect(result.type.length).toBeGreaterThan(0);
              expect(result.label.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

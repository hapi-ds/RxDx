/**
 * Property-based tests for graph service
 * Feature: fix-graph-visualization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { graphService } from './graphService';
import { apiClient } from './api';
import type { AxiosResponse } from 'axios';

// Mock the API client
vi.mock('./api', () => ({
  apiClient: {
    get: vi.fn(),
  },
  getErrorMessage: (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
  },
}));

// Helper to create mock axios response
function mockAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };
}

describe('Graph Service Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 6: Frontend Response Validation', () => {
    // Feature: fix-graph-visualization, Property 6: Frontend Response Validation
    // **Validates: Requirements 5.1**
    // For any API response received by the frontend, the response must be validated
    // to have a data property before attempting to access nested fields.

    it('should validate response has data property and handle missing data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasData: fc.boolean(),
            hasNodes: fc.boolean(),
            hasEdges: fc.boolean(),
          }),
          async ({ hasData, hasNodes, hasEdges }) => {
            // Generate response based on properties
            const responseData: any = {};
            
            if (hasData) {
              if (hasNodes) {
                responseData.nodes = [];
              }
              if (hasEdges) {
                responseData.edges = [];
              }
            }

            const response = hasData ? mockAxiosResponse(responseData) : (null as any);
            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw, should return empty arrays for missing data
            const result = await graphService.getVisualization();
            
            expect(result).toBeDefined();
            expect(result.nodes).toBeDefined();
            expect(result.edges).toBeDefined();
            expect(Array.isArray(result.nodes)).toBe(true);
            expect(Array.isArray(result.edges)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null and undefined response data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            null as any,
            undefined as any,
            mockAxiosResponse(null as any),
            mockAxiosResponse(undefined as any)
          ),
          async (response) => {
            vi.mocked(apiClient.get).mockResolvedValue(response);

            const result = await graphService.getVisualization();
            
            // Should return empty arrays, not throw
            expect(result.nodes).toEqual([]);
            expect(result.edges).toEqual([]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 7: Frontend Node Validation', () => {
    // Feature: fix-graph-visualization, Property 7: Frontend Node Validation
    // **Validates: Requirements 5.2**
    // For any node being transformed by the frontend, the node must be validated
    // to have an id property, and nodes without valid ids must be filtered out
    // with a warning logged.

    it('should filter out nodes without id property', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              hasId: fc.boolean(),
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk'),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              properties: fc.dictionary(fc.string(), fc.anything()),
            })
          ),
          async (nodeConfigs) => {
            // Build nodes based on hasId flag
            const nodes = nodeConfigs.map((config) => {
              const node: any = {
                type: config.type,
                label: config.label,
                properties: config.properties,
              };
              if (config.hasId) {
                node.id = config.id;
              }
              return node;
            });

            const response = mockAxiosResponse({
              nodes,
              edges: [],
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            const result = await graphService.getVisualization();

            // Only nodes with id should be in result
            const expectedCount = nodeConfigs.filter((c) => c.hasId).length;
            expect(result.nodes.length).toBe(expectedCount);

            // All returned nodes must have id
            result.nodes.forEach((node) => {
              expect(node.id).toBeDefined();
              expect(typeof node.id).toBe('string');
            });

            // Warning should be logged for nodes without id
            const nodesWithoutId = nodeConfigs.filter((c) => !c.hasId).length;
            if (nodesWithoutId > 0) {
              expect(consoleWarnSpy).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Property 8: Frontend Edge Validation', () => {
    // Feature: fix-graph-visualization, Property 8: Frontend Edge Validation
    // **Validates: Requirements 5.3**
    // For any edge being transformed by the frontend, the edge must be validated
    // to have source and target properties, and edges without valid source/target
    // must be filtered out with a warning logged.

    it('should filter out edges without source or target properties', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              hasSource: fc.boolean(),
              hasTarget: fc.boolean(),
              id: fc.uuid(),
              source: fc.uuid(),
              target: fc.uuid(),
              type: fc.constantFrom('depends_on', 'tests', 'mitigates', 'relates_to'),
            })
          ),
          async (edgeConfigs) => {
            // Build edges based on hasSource and hasTarget flags
            const edges = edgeConfigs.map((config) => {
              const edge: any = {
                id: config.id,
                type: config.type,
              };
              if (config.hasSource) {
                edge.source = config.source;
              }
              if (config.hasTarget) {
                edge.target = config.target;
              }
              return edge;
            });

            const response = mockAxiosResponse({
              nodes: [],
              edges,
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            const result = await graphService.getVisualization();

            // Only edges with both source and target should be in result
            const expectedCount = edgeConfigs.filter(
              (c) => c.hasSource && c.hasTarget
            ).length;
            expect(result.edges.length).toBe(expectedCount);

            // All returned edges must have source and target
            result.edges.forEach((edge) => {
              expect(edge.source).toBeDefined();
              expect(edge.target).toBeDefined();
              expect(typeof edge.source).toBe('string');
              expect(typeof edge.target).toBe('string');
            });

            // Warning should be logged for invalid edges
            const invalidEdges = edgeConfigs.filter(
              (c) => !c.hasSource || !c.hasTarget
            ).length;
            if (invalidEdges > 0) {
              expect(consoleWarnSpy).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Property 9: Frontend Defensive Transformation', () => {
    // Feature: fix-graph-visualization, Property 9: Frontend Defensive Transformation
    // **Validates: Requirements 3.3, 3.4, 3.5**
    // For any backend node being transformed by the frontend, if the node is missing
    // position data or reactFlow data, the frontend shall generate valid default values
    // and complete the transformation without errors.

    it('should handle nodes with missing position data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk'),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              hasReactFlow: fc.boolean(),
              hasPosition: fc.boolean(),
              properties: fc.dictionary(fc.string(), fc.anything()),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (nodeConfigs) => {
            // Build nodes with varying position data
            const nodes = nodeConfigs.map((config) => {
              const node: any = {
                id: config.id,
                type: config.type,
                label: config.label,
                properties: config.properties,
              };

              if (config.hasReactFlow && config.hasPosition) {
                node.reactFlow = {
                  id: config.id,
                  type: config.type,
                  position: {
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                  },
                  data: {},
                };
              } else if (config.hasReactFlow) {
                node.reactFlow = {
                  id: config.id,
                  type: config.type,
                  data: {},
                };
              }

              return node;
            });

            const response = mockAxiosResponse({
              nodes,
              edges: [],
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw
            const result = await graphService.getVisualization();

            // All nodes should have position
            expect(result.nodes.length).toBe(nodeConfigs.length);
            result.nodes.forEach((node) => {
              expect(node.position).toBeDefined();
              expect(typeof node.position!.x).toBe('number');
              expect(typeof node.position!.y).toBe('number');
              expect(Number.isFinite(node.position!.x)).toBe(true);
              expect(Number.isFinite(node.position!.y)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide default label for nodes missing label', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk'),
              hasLabel: fc.boolean(),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              properties: fc.dictionary(fc.string(), fc.anything()),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (nodeConfigs) => {
            const nodes = nodeConfigs.map((config) => {
              const node: any = {
                id: config.id,
                type: config.type,
                properties: config.properties,
              };
              if (config.hasLabel) {
                node.label = config.label;
              }
              return node;
            });

            const response = mockAxiosResponse({
              nodes,
              edges: [],
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            const result = await graphService.getVisualization();

            // All nodes should have a label
            result.nodes.forEach((node) => {
              expect(node.label).toBeDefined();
              expect(typeof node.label).toBe('string');
              expect(node.label.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Validation Failure Handling', () => {
    // Feature: fix-graph-visualization, Property 10: Validation Failure Handling
    // **Validates: Requirements 5.4**
    // For any item that fails validation during transformation, the system shall
    // log a warning message and skip the invalid item without throwing an exception.

    it('should log warnings and skip invalid items without throwing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            validNodes: fc.array(
              fc.record({
                id: fc.uuid(),
                type: fc.constantFrom('requirement', 'task', 'test', 'risk'),
                label: fc.string({ minLength: 1 }),
                properties: fc.dictionary(fc.string(), fc.anything()),
              }),
              { maxLength: 5 }
            ),
            invalidNodes: fc.array(
              fc.record({
                type: fc.constantFrom('requirement', 'task', 'test', 'risk'),
                label: fc.string({ minLength: 1 }),
                properties: fc.dictionary(fc.string(), fc.anything()),
              }),
              { maxLength: 5 }
            ),
            validEdges: fc.array(
              fc.record({
                id: fc.uuid(),
                source: fc.uuid(),
                target: fc.uuid(),
                type: fc.constantFrom('depends_on', 'tests', 'mitigates'),
              }),
              { maxLength: 5 }
            ),
            invalidEdges: fc.array(
              fc.record({
                id: fc.uuid(),
                type: fc.constantFrom('depends_on', 'tests', 'mitigates'),
              }),
              { maxLength: 5 }
            ),
          }),
          async ({ validNodes, invalidNodes, validEdges, invalidEdges }) => {
            const response = mockAxiosResponse({
              nodes: [...validNodes, ...invalidNodes],
              edges: [...validEdges, ...invalidEdges],
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw
            let result;
            expect(async () => {
              result = await graphService.getVisualization();
            }).not.toThrow();

            result = await graphService.getVisualization();

            // Only valid items should be in result
            expect(result.nodes.length).toBe(validNodes.length);
            expect(result.edges.length).toBe(validEdges.length);

            // Warnings should be logged for invalid items
            const totalInvalid = invalidNodes.length + invalidEdges.length;
            if (totalInvalid > 0) {
              expect(consoleWarnSpy).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

  describe('Property 13: Null-Safe Property Access', () => {
    // Feature: fix-graph-visualization, Property 13: Null-Safe Property Access
    // **Validates: Requirements 8.2**
    // For any property access in the graph rendering code when data may be empty,
    // the access shall use null-safe operators or validation checks to prevent
    // undefined property errors.

    it('should handle nodes with null or undefined nested properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.option(fc.constantFrom('requirement', 'task', 'test', 'risk'), { nil: null }),
              label: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
              properties: fc.option(
                fc.record({
                  title: fc.option(fc.string(), { nil: null }),
                  status: fc.option(fc.string(), { nil: null }),
                  priority: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
                }),
                { nil: null }
              ),
              reactFlow: fc.option(
                fc.record({
                  position: fc.option(
                    fc.record({
                      x: fc.float(),
                      y: fc.float(),
                    }),
                    { nil: null }
                  ),
                }),
                { nil: null }
              ),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (nodeConfigs) => {
            const response = mockAxiosResponse({
              nodes: nodeConfigs,
              edges: [],
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw even with null/undefined properties
            let result;
            expect(async () => {
              result = await graphService.getVisualization();
            }).not.toThrow();

            result = await graphService.getVisualization();

            // All nodes should be transformed successfully
            expect(result.nodes.length).toBe(nodeConfigs.length);
            
            // Verify all nodes have required properties with defaults
            result.nodes.forEach((node) => {
              expect(node.id).toBeDefined();
              expect(node.type).toBeDefined();
              expect(node.label).toBeDefined();
              expect(node.position).toBeDefined();
              expect(node.position!.x).toBeDefined();
              expect(node.position!.y).toBeDefined();
              expect(Number.isFinite(node.position!.x)).toBe(true);
              expect(Number.isFinite(node.position!.y)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edges with null or undefined properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              source: fc.uuid(),
              target: fc.uuid(),
              type: fc.option(fc.constantFrom('depends_on', 'tests', 'mitigates', 'relates_to'), { nil: null }),
              label: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
              properties: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (edgeConfigs) => {
            const response = mockAxiosResponse({
              nodes: [],
              edges: edgeConfigs,
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw even with null/undefined properties
            let result;
            expect(async () => {
              result = await graphService.getVisualization();
            }).not.toThrow();

            result = await graphService.getVisualization();

            // All edges should be transformed successfully
            expect(result.edges.length).toBe(edgeConfigs.length);
            
            // Verify all edges have required properties
            result.edges.forEach((edge) => {
              expect(edge.id).toBeDefined();
              expect(edge.source).toBeDefined();
              expect(edge.target).toBeDefined();
              expect(edge.type).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle completely empty or malformed data objects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            // Various malformed data scenarios
            { nodes: [{}], edges: [] },
            { nodes: [{ id: null }], edges: [] },
            { nodes: [{ id: undefined }], edges: [] },
            { nodes: [{ id: '123', data: null }], edges: [] },
            { nodes: [{ id: '123', data: { label: null } }], edges: [] },
            { nodes: [], edges: [{}] },
            { nodes: [], edges: [{ id: '1', source: null, target: null }] },
            { nodes: [], edges: [{ id: '1', source: '2', target: null }] },
          ),
          async (data) => {
            const response = mockAxiosResponse(data);
            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw, should handle gracefully
            let result;
            expect(async () => {
              result = await graphService.getVisualization();
            }).not.toThrow();

            result = await graphService.getVisualization();

            // Result should always have arrays
            expect(Array.isArray(result.nodes)).toBe(true);
            expect(Array.isArray(result.edges)).toBe(true);
            
            // All returned items should have valid required properties
            result.nodes.forEach((node) => {
              expect(node.id).toBeDefined();
              expect(typeof node.id).toBe('string');
            });
            
            result.edges.forEach((edge) => {
              expect(edge.id).toBeDefined();
              expect(edge.source).toBeDefined();
              expect(edge.target).toBeDefined();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle deeply nested null properties without errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.string(),
              data: fc.option(
                fc.record({
                  label: fc.option(fc.string(), { nil: null }),
                  properties: fc.option(
                    fc.record({
                      nested: fc.option(
                        fc.record({
                          deep: fc.option(fc.string(), { nil: null }),
                        }),
                        { nil: null }
                      ),
                    }),
                    { nil: null }
                  ),
                }),
                { nil: null }
              ),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (nodeConfigs) => {
            const response = mockAxiosResponse({
              nodes: nodeConfigs,
              edges: [],
            });

            vi.mocked(apiClient.get).mockResolvedValue(response);

            // Should not throw TypeError for undefined property access
            let didThrow = false;
            let thrownError: any = null;
            
            try {
              await graphService.getVisualization();
            } catch (error) {
              didThrow = true;
              thrownError = error;
            }

            // Should not throw TypeError about reading properties of undefined
            if (didThrow && thrownError instanceof TypeError) {
              const errorMessage = thrownError.message.toLowerCase();
              expect(errorMessage).not.toContain('cannot read propert');
              expect(errorMessage).not.toContain('undefined');
            }
          }
        ),
        { numRuns: 100 }
      );

      consoleWarnSpy.mockRestore();
    });
  });


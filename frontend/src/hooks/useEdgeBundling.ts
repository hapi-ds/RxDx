/**
 * useEdgeBundling Hook
 * Manages edge bundling state and automatically activates for graphs with >100 edges
 * 
 * References: Requirement 10 (Edge Bundling)
 */

import { useMemo, useEffect } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { edgeBundler, type EdgeBundle } from '../services/EdgeBundler';
import { useGraphStore } from '../stores/graphStore';

/**
 * Threshold for automatic edge bundling activation
 */
const AUTO_BUNDLE_THRESHOLD = 100;

/**
 * Hook to manage edge bundling
 * Automatically activates bundling when edge count exceeds threshold
 * 
 * @param edges - All edges in the graph
 * @param nodes - All nodes in the graph
 * @returns Object containing bundles and bundling state
 */
export function useEdgeBundling(edges: Edge[], nodes: Node[]) {
  const { edgeBundlingEnabled, setEdgeBundling } = useGraphStore();

  // Auto-enable bundling for graphs with >100 edges
  useEffect(() => {
    if (edges.length > AUTO_BUNDLE_THRESHOLD && !edgeBundlingEnabled) {
      console.log(
        `[useEdgeBundling] Auto-enabling edge bundling (${edges.length} edges > ${AUTO_BUNDLE_THRESHOLD} threshold)`
      );
      setEdgeBundling(true);
    }
  }, [edges.length, edgeBundlingEnabled, setEdgeBundling]);

  // Create node map for efficient lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Calculate edge bundles
  const bundles = useMemo(() => {
    if (!edgeBundlingEnabled || edges.length === 0) {
      return [];
    }

    console.log(`[useEdgeBundling] Bundling ${edges.length} edges`);
    const result = edgeBundler.bundleEdges(edges, nodeMap);
    console.log(`[useEdgeBundling] Created ${result.length} bundles`);
    return result;
  }, [edges, nodeMap, edgeBundlingEnabled]);

  // Get set of bundled edge IDs for quick lookup
  const bundledEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    bundles.forEach((bundle) => {
      bundle.edges.forEach((edge) => ids.add(edge.id));
    });
    return ids;
  }, [bundles]);

  // Get bundle for a specific edge
  const getBundleForEdge = (edgeId: string): EdgeBundle | undefined => {
    return bundles.find((bundle) => bundle.edges.some((e) => e.id === edgeId));
  };

  // Check if an edge is bundled
  const isEdgeBundled = (edgeId: string): boolean => {
    return bundledEdgeIds.has(edgeId);
  };

  // Get all edges in the same bundle as the given edge
  const getEdgesInBundle = (edgeId: string): string[] => {
    return edgeBundler.getEdgesInBundle(edgeId, bundles);
  };

  return {
    /** Whether edge bundling is currently enabled */
    enabled: edgeBundlingEnabled,
    /** Array of edge bundles */
    bundles,
    /** Set of bundled edge IDs */
    bundledEdgeIds,
    /** Get bundle for a specific edge */
    getBundleForEdge,
    /** Check if an edge is bundled */
    isEdgeBundled,
    /** Get all edges in the same bundle */
    getEdgesInBundle,
    /** Whether auto-bundling threshold is met */
    shouldAutoBundleByCount: edges.length > AUTO_BUNDLE_THRESHOLD,
  };
}

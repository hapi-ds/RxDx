/**
 * Graph service
 * Handles all graph visualization and query API calls
 */

import { apiClient, getErrorMessage } from './api';

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  position?: {
    x: number;
    y: number;
    z?: number;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  properties?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphVisualizationParams {
  root_id?: string;
  depth?: number;
  node_types?: string[];
  relationship_types?: string[];
  limit?: number;
}

export interface TraceabilityMatrixItem {
  requirement_id: string;
  requirement_title: string;
  tests: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  risks: Array<{
    id: string;
    title: string;
    rpn: number;
  }>;
}

export interface RiskChain {
  risk_id: string;
  risk_title: string;
  rpn: number;
  failures: Array<{
    id: string;
    description: string;
    probability: number;
  }>;
}

/**
 * Raw node format from backend API
 */
interface BackendNode {
  id: string;
  type: string;
  label: string;
  status?: string;
  priority?: number;
  description?: string;
  color?: string;
  size?: number;
  properties: Record<string, unknown>;
  reactFlow?: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    style?: Record<string, unknown>;
    className?: string;
  };
  r3f?: {
    id: string;
    position: [number, number, number];
    type: string;
    label: string;
    [key: string]: unknown;
  };
}

/**
 * Raw edge format from backend API
 */
interface BackendEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  properties?: Record<string, unknown>;
  reactFlow?: {
    id: string;
    source: string;
    target: string;
    type: string;
    label?: string;
    [key: string]: unknown;
  };
  r3f?: {
    id: string;
    source: string;
    target: string;
    [key: string]: unknown;
  };
}

/**
 * Raw response format from backend API
 */
interface BackendGraphResponse {
  nodes: BackendNode[];
  edges: BackendEdge[];
  metadata?: {
    total_nodes: number;
    total_edges: number;
    depth: number;
    center_node: string | null;
    truncated: boolean;
    performance_stats?: Record<string, unknown>;
  };
}

/**
 * Transform backend node to frontend GraphNode format
 * Returns null if the node is invalid (missing required properties)
 */
function transformBackendNode(backendNode: BackendNode): GraphNode | null {
  // Defensive: Validate node has required id property
  if (!backendNode || !backendNode.id) {
    console.warn('Invalid node: missing id', backendNode);
    return null;
  }

  // Defensive: Extract position with multiple fallbacks
  let position: { x: number; y: number };
  
  if (backendNode.reactFlow?.position) {
    const pos = backendNode.reactFlow.position;
    // Validate position values are finite numbers
    if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      position = pos;
    } else {
      // Generate random position if values are not finite
      position = {
        x: Math.random() * 500,
        y: Math.random() * 500,
      };
    }
  } else if (backendNode.properties?.position && 
             typeof backendNode.properties.position === 'object' &&
             'x' in backendNode.properties.position && 
             'y' in backendNode.properties.position) {
    const pos = backendNode.properties.position as { x: number; y: number };
    // Validate position values are finite numbers
    if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      position = { x: pos.x, y: pos.y };
    } else {
      // Generate random position if values are not finite
      position = {
        x: Math.random() * 500,
        y: Math.random() * 500,
      };
    }
  } else {
    // Generate random position as last resort
    position = {
      x: Math.random() * 500,
      y: Math.random() * 500,
    };
  }

  // Provide default label if missing
  const label = backendNode.label || `Node ${backendNode.id.substring(0, 8)}`;

  return {
    id: backendNode.id,
    type: backendNode.type?.toLowerCase() ?? 'default',
    label,
    properties: {
      ...backendNode.properties,
      status: backendNode.status,
      priority: backendNode.priority,
      description: backendNode.description,
      color: backendNode.color,
      size: backendNode.size,
    },
    position,
  };
}

/**
 * Transform backend edge to frontend GraphEdge format
 * Returns null if the edge is invalid (missing required properties)
 */
function transformBackendEdge(backendEdge: BackendEdge): GraphEdge | null {
  // Defensive: Validate edge has required source and target properties
  if (!backendEdge || !backendEdge.source || !backendEdge.target) {
    console.warn('Invalid edge: missing source or target', backendEdge);
    return null;
  }

  // Provide default edge type if missing
  const type = backendEdge.type || 'default';

  return {
    id: backendEdge.id,
    source: backendEdge.source,
    target: backendEdge.target,
    type,
    label: backendEdge.label,
    properties: backendEdge.properties,
  };
}

class GraphService {
  private readonly basePath = '/api/v1/graph';

  async getVisualization(params?: GraphVisualizationParams): Promise<GraphData> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.root_id) queryParams.append('root_id', params.root_id);
      if (params?.depth !== undefined) queryParams.append('depth', params.depth.toString());
      if (params?.node_types) {
        params.node_types.forEach((type) => queryParams.append('node_types', type));
      }
      if (params?.relationship_types) {
        params.relationship_types.forEach((type) =>
          queryParams.append('relationship_types', type)
        );
      }
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const url = queryParams.toString()
        ? `${this.basePath}/visualization?${queryParams.toString()}`
        : `${this.basePath}/visualization`;

      const response = await apiClient.get<BackendGraphResponse>(url);
      
      // Defensive: Validate response exists and has data
      if (!response || !response.data) {
        console.error('API returned no data');
        return { nodes: [], edges: [] };
      }
      
      // Defensive: Ensure arrays exist
      const backendNodes = Array.isArray(response.data.nodes) ? response.data.nodes : [];
      const backendEdges = Array.isArray(response.data.edges) ? response.data.edges : [];
      
      // Transform with validation - filter out null results
      const nodes = backendNodes
        .map(transformBackendNode)
        .filter((node): node is GraphNode => node !== null);
      
      const edges = backendEdges
        .map(transformBackendEdge)
        .filter((edge): edge is GraphEdge => edge !== null);

      return { nodes, edges };
    } catch (error) {
      console.error('Graph visualization error:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  async search(query: string, limit?: number): Promise<GraphNode[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      if (limit !== undefined) queryParams.append('limit', limit.toString());

      const response = await apiClient.get<GraphNode[]>(
        `${this.basePath}/search?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getTraceabilityMatrix(): Promise<TraceabilityMatrixItem[]> {
    try {
      const response = await apiClient.get<TraceabilityMatrixItem[]>(
        `${this.basePath}/traceability-matrix`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getRiskChains(riskId?: string): Promise<RiskChain[]> {
    try {
      const url = riskId
        ? `${this.basePath}/risk-chains?risk_id=${riskId}`
        : `${this.basePath}/risk-chains`;

      const response = await apiClient.get<RiskChain[]>(url);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async createRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    properties?: Record<string, unknown>
  ): Promise<GraphEdge> {
    try {
      const response = await apiClient.post<GraphEdge>(`${this.basePath}/relationships`, {
        source_id: sourceId,
        target_id: targetId,
        relationship_type: relationshipType,
        properties,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/relationships/${relationshipId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}

export const graphService = new GraphService();

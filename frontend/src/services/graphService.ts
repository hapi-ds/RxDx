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
 */
function transformBackendNode(backendNode: BackendNode): GraphNode {
  // Extract position from reactFlow data if available, otherwise use random position
  const position = backendNode.reactFlow?.position ?? {
    x: Math.random() * 500,
    y: Math.random() * 500,
  };

  return {
    id: backendNode.id,
    type: backendNode.type?.toLowerCase() ?? 'default',
    label: backendNode.label,
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
 */
function transformBackendEdge(backendEdge: BackendEdge): GraphEdge {
  return {
    id: backendEdge.id,
    source: backendEdge.source,
    target: backendEdge.target,
    type: backendEdge.type,
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
      
       // Transform backend response to frontend format
       const nodes = (response.data.nodes || []).map(transformBackendNode);
       const edges = (response.data.edges || []).map(transformBackendEdge);

       return { nodes, edges };
    } catch (error) {
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

/**
 * Risk Service
 * Handles API calls for risk management (FMEA)
 * Supports Requirement 10 (Risk Management with FMEA)
 */

import { apiClient } from './api';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type RiskStatus = 
  | 'draft' 
  | 'identified' 
  | 'assessed' 
  | 'mitigated' 
  | 'accepted' 
  | 'closed' 
  | 'archived';

export type MitigationStatus = 
  | 'planned' 
  | 'in_progress' 
  | 'completed' 
  | 'verified' 
  | 'cancelled';

export type FailureType = 
  | 'functional' 
  | 'performance' 
  | 'safety' 
  | 'reliability' 
  | 'interface' 
  | 'environmental' 
  | 'user_error' 
  | 'other';

export interface RiskNode {
  id: string;
  title: string;
  description?: string;
  status: RiskStatus;
  
  // FMEA ratings (1-10 scale)
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number; // Risk Priority Number (severity × occurrence × detection)
  
  // Risk categorization
  risk_category?: string;
  failure_mode?: string;
  failure_effect?: string;
  failure_cause?: string;
  current_controls?: string;
  
  // Assignment
  risk_owner?: string;
  
  // Metadata
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
  
  // Linked items
  linked_design_items: string[];
  linked_process_items: string[];
  
  // Mitigation summary
  mitigation_count: number;
  has_open_mitigations: boolean;
}

export interface RiskNodeCreate {
  title: string;
  description?: string;
  status?: RiskStatus;
  severity: number;
  occurrence: number;
  detection: number;
  risk_category?: string;
  failure_mode?: string;
  failure_effect?: string;
  failure_cause?: string;
  current_controls?: string;
  risk_owner?: string;
  linked_design_items?: string[];
  linked_process_items?: string[];
}

export interface RiskNodeUpdate {
  title?: string;
  description?: string;
  status?: RiskStatus;
  severity?: number;
  occurrence?: number;
  detection?: number;
  risk_category?: string;
  failure_mode?: string;
  failure_effect?: string;
  failure_cause?: string;
  current_controls?: string;
  risk_owner?: string;
}

export interface FailureNode {
  id: string;
  description: string;
  impact: string;
  failure_type: FailureType;
  severity_level?: number;
  affected_components?: string;
  detection_method?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  source_risk_id?: string;
  downstream_failure_count: number;
}

export interface MitigationAction {
  id: string;
  risk_id: string;
  title: string;
  description: string;
  action_type: string;
  status: MitigationStatus;
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
  expected_severity_reduction?: number;
  expected_occurrence_reduction?: number;
  expected_detection_improvement?: number;
  verification_method?: string;
  verification_result?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RiskChainNode {
  id: string;
  type: string;
  title?: string;
  description?: string;
  severity?: number;
  rpn?: number;
}

export interface RiskChainEdge {
  from_id: string;
  to_id: string;
  probability: number;
}

export interface RiskChain {
  start_risk_id: string;
  chain_length: number;
  total_probability: number;
  nodes: RiskChainNode[];
  edges: RiskChainEdge[];
}

export interface RPNAnalysis {
  risk_id: string;
  rpn: number;
  severity: number;
  occurrence: number;
  detection: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  requires_mitigation: boolean;
  mitigation_deadline?: string;
}

export interface RiskListResponse {
  items: RiskNode[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface MitigationListResponse {
  items: MitigationAction[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface RiskFilters {
  page?: number;
  size?: number;
  status?: RiskStatus;
  min_rpn?: number;
  max_rpn?: number;
  risk_owner?: string;
}

// ============================================================================
// Risk Service Functions
// ============================================================================

/**
 * Get risks with optional filtering and pagination
 */
export async function getRisks(filters?: RiskFilters): Promise<RiskListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.size) params.append('size', filters.size.toString());
  if (filters?.status) params.append('status', filters.status);
  if (filters?.min_rpn) params.append('min_rpn', filters.min_rpn.toString());
  if (filters?.max_rpn) params.append('max_rpn', filters.max_rpn.toString());
  if (filters?.risk_owner) params.append('risk_owner', filters.risk_owner);
  
  const response = await apiClient.get<RiskListResponse>(`/risks/?${params.toString()}`);
  return response.data;
}

/**
 * Get a specific risk by ID
 */
export async function getRisk(riskId: string): Promise<RiskNode> {
  const response = await apiClient.get<RiskNode>(`/risks/${riskId}`);
  return response.data;
}

/**
 * Create a new risk
 */
export async function createRisk(riskData: RiskNodeCreate): Promise<RiskNode> {
  const response = await apiClient.post<RiskNode>('/risks/', riskData);
  return response.data;
}

/**
 * Update an existing risk
 */
export async function updateRisk(
  riskId: string, 
  updates: RiskNodeUpdate,
  changeDescription: string
): Promise<RiskNode> {
  const response = await apiClient.patch<RiskNode>(
    `/risks/${riskId}?change_description=${encodeURIComponent(changeDescription)}`,
    updates
  );
  return response.data;
}

/**
 * Delete a risk
 */
export async function deleteRisk(riskId: string): Promise<void> {
  await apiClient.delete(`/risks/${riskId}`);
}

/**
 * Get high RPN risks requiring mitigation
 */
export async function getHighRPNRisks(threshold?: number): Promise<RiskNode[]> {
  const params = threshold ? `?threshold=${threshold}` : '';
  const response = await apiClient.get<RiskNode[]>(`/risks/high-rpn${params}`);
  return response.data;
}

/**
 * Get risk chains (failure propagation paths)
 */
export async function getRiskChains(riskId: string, maxDepth?: number): Promise<RiskChain[]> {
  const params = maxDepth ? `?max_depth=${maxDepth}` : '';
  const response = await apiClient.get<RiskChain[]>(`/risks/${riskId}/chains${params}`);
  return response.data;
}

/**
 * Get mitigations for a risk
 */
export async function getRiskMitigations(
  riskId: string,
  page?: number,
  size?: number,
  status?: MitigationStatus
): Promise<MitigationListResponse> {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (size) params.append('size', size.toString());
  if (status) params.append('status', status);
  
  const response = await apiClient.get<MitigationListResponse>(
    `/risks/${riskId}/mitigations?${params.toString()}`
  );
  return response.data;
}

/**
 * Analyze a risk and get RPN-based recommendations
 */
export async function analyzeRisk(riskId: string): Promise<RPNAnalysis> {
  const response = await apiClient.get<RPNAnalysis>(`/risks/${riskId}/analysis`);
  return response.data;
}

/**
 * Calculate RPN from severity, occurrence, and detection
 */
export function calculateRPN(severity: number, occurrence: number, detection: number): number {
  return severity * occurrence * detection;
}

/**
 * Get risk level based on RPN
 */
export function getRiskLevel(rpn: number): 'critical' | 'high' | 'medium' | 'low' {
  if (rpn >= 200) return 'critical';
  if (rpn >= 100) return 'high';
  if (rpn >= 50) return 'medium';
  return 'low';
}

/**
 * Get risk level color for UI display
 */
export function getRiskLevelColor(rpn: number): string {
  const level = getRiskLevel(rpn);
  switch (level) {
    case 'critical': return '#dc2626'; // red-600
    case 'high': return '#ea580c'; // orange-600
    case 'medium': return '#ca8a04'; // yellow-600
    case 'low': return '#16a34a'; // green-600
  }
}

/**
 * Format RPN for display with risk level
 */
export function formatRPN(rpn: number): string {
  const level = getRiskLevel(rpn);
  return `${rpn} (${level.toUpperCase()})`;
}

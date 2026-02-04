/**
 * Test Service
 * Handles API calls for test specification and test run management
 * Supports Requirement 9 (Verification and Validation Management)
 */

import { apiClient } from './api';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type TestType = 'unit' | 'integration' | 'system' | 'acceptance' | 'regression';
export type ExecutionStatus = 'pass' | 'fail' | 'blocked' | 'not_run';
export type StepExecutionStatus = 'pass' | 'fail' | 'blocked' | 'skipped' | 'not_run';

export interface TestStep {
  step_number: number;
  description: string;
  expected_result: string;
  status: StepExecutionStatus;
  actual_result?: string;
  notes?: string;
}

export interface TestSpec {
  id: string;
  title: string;
  description?: string;
  test_type: TestType;
  priority?: number;
  status?: 'draft' | 'active' | 'completed' | 'archived';
  preconditions?: string;
  test_steps: TestStep[];
  linked_requirements: string[];
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
}

export interface TestSpecCreate {
  title: string;
  description?: string;
  test_type: TestType;
  priority?: number;
  preconditions?: string;
  test_steps: TestStep[];
  linked_requirements: string[];
}

export interface TestSpecUpdate {
  title?: string;
  description?: string;
  test_type?: TestType;
  priority?: number;
  preconditions?: string;
  test_steps?: TestStep[];
  linked_requirements?: string[];
}

export interface TestRun {
  id: string;
  test_spec_id: string;
  test_spec_version: string;
  executed_by: string;
  execution_date: string;
  environment?: string;
  test_data?: Record<string, any>;
  overall_status: ExecutionStatus;
  step_results: TestStep[];
  failure_description?: string;
  defect_workitem_ids: string[];
  execution_notes?: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
}

export interface TestRunCreate {
  test_spec_id: string;
  test_spec_version: string;
  executed_by: string;
  execution_date?: string;
  environment?: string;
  test_data?: Record<string, any>;
  overall_status: ExecutionStatus;
  step_results: TestStep[];
  failure_description?: string;
  defect_workitem_ids?: string[];
  execution_notes?: string;
}

export interface TestRunUpdate {
  environment?: string;
  test_data?: Record<string, any>;
  overall_status?: ExecutionStatus;
  step_results?: TestStep[];
  failure_description?: string;
  defect_workitem_ids?: string[];
  execution_notes?: string;
}

export interface TestCoverage {
  total_requirements: number;
  requirements_with_tests: number;
  requirements_with_passing_tests: number;
  coverage_percentage: number;
  detailed_coverage: Array<{
    requirement_id: string;
    requirement_title: string;
    has_tests: boolean;
    has_passing_tests: boolean;
    coverage_status: 'covered' | 'partial' | 'not_covered';
  }>;
}

export interface TestSpecListResponse {
  items: TestSpec[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TestRunListResponse {
  items: TestRun[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TestFilters {
  page?: number;
  size?: number;
  test_type?: TestType;
  linked_requirement_id?: string;
}

// ============================================================================
// Test Service Functions
// ============================================================================

/**
 * Get test specifications with optional filtering and pagination
 */
export async function getTestSpecs(filters?: TestFilters): Promise<TestSpecListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.size) params.append('size', filters.size.toString());
  if (filters?.test_type) params.append('test_type', filters.test_type);
  if (filters?.linked_requirement_id) params.append('linked_requirement_id', filters.linked_requirement_id);
  
  const response = await apiClient.get<TestSpecListResponse>(`/api/v1/tests/?${params.toString()}`);
  return response.data;
}

/**
 * Get a specific test specification by ID
 */
export async function getTestSpec(testSpecId: string): Promise<TestSpec> {
  const response = await apiClient.get<TestSpec>(`/api/v1/tests/${testSpecId}`);
  return response.data;
}

/**
 * Get test coverage metrics
 */
export async function getTestCoverage(): Promise<TestCoverage> {
  const response = await apiClient.get<TestCoverage>('/api/v1/tests/coverage');
  return response.data;
}

/**
 * Create a new test specification
 */
export async function createTestSpec(testSpecData: TestSpecCreate): Promise<TestSpec> {
  const response = await apiClient.post<TestSpec>('/api/v1/tests/', testSpecData);
  return response.data;
}

/**
 * Update an existing test specification
 */
export async function updateTestSpec(
  testSpecId: string,
  updates: TestSpecUpdate,
  changeDescription: string
): Promise<TestSpec> {
  const response = await apiClient.patch<TestSpec>(
    `/api/v1/tests/${testSpecId}?change_description=${encodeURIComponent(changeDescription)}`,
    updates
  );
  return response.data;
}

/**
 * Delete a test specification
 */
export async function deleteTestSpec(testSpecId: string): Promise<void> {
  await apiClient.delete(`/api/v1/tests/${testSpecId}`);
}

/**
 * Create a test run for a test specification
 */
export async function createTestRun(
  testSpecId: string,
  testRunData: TestRunCreate
): Promise<TestRun> {
  const response = await apiClient.post<TestRun>(
    `/api/v1/tests/${testSpecId}/runs`,
    testRunData
  );
  return response.data;
}

/**
 * Get test runs for a specific test specification
 */
export async function getTestRuns(
  testSpecId: string,
  page?: number,
  size?: number
): Promise<TestRunListResponse> {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (size) params.append('size', size.toString());
  
  const response = await apiClient.get<TestRunListResponse>(
    `/api/v1/tests/${testSpecId}/runs?${params.toString()}`
  );
  return response.data;
}

/**
 * Update a test run
 */
export async function updateTestRun(
  runId: string,
  updates: TestRunUpdate
): Promise<TestRun> {
  const response = await apiClient.patch<TestRun>(
    `/api/v1/tests/runs/${runId}`,
    updates
  );
  return response.data;
}

/**
 * Property-based tests for test service
 * Feature: test-page-implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as testService from './testService';
import { apiClient } from './api';
import type { AxiosResponse } from 'axios';

// Mock the API client
vi.mock('./api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

// Arbitraries for generating test data
const testTypeArb = fc.constantFrom<testService.TestType>(
  'unit',
  'integration',
  'system',
  'acceptance',
  'regression'
);

const executionStatusArb = fc.constantFrom<testService.ExecutionStatus>(
  'pass',
  'fail',
  'blocked',
  'not_run'
);

const stepExecutionStatusArb = fc.constantFrom<testService.StepExecutionStatus>(
  'pass',
  'fail',
  'blocked',
  'skipped',
  'not_run'
);

const testStepArb = fc.record({
  step_number: fc.integer({ min: 1, max: 100 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  expected_result: fc.string({ minLength: 1, maxLength: 100 }),
  status: stepExecutionStatusArb,
  actual_result: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

const testSpecArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  test_type: testTypeArb,
  priority: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  preconditions: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  test_steps: fc.array(testStepArb, { minLength: 0, maxLength: 10 }),
  linked_requirements: fc.array(fc.uuid(), { maxLength: 5 }),
  version: fc.string({ minLength: 1, maxLength: 20 }),
  created_by: fc.uuid(),
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
  is_signed: fc.boolean(),
});

const testRunArb = fc.record({
  id: fc.uuid(),
  test_spec_id: fc.uuid(),
  test_spec_version: fc.string({ minLength: 1, maxLength: 20 }),
  executed_by: fc.uuid(),
  execution_date: fc.constant('2024-01-01T00:00:00.000Z'),
  environment: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
  test_data: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  overall_status: executionStatusArb,
  step_results: fc.array(testStepArb, { minLength: 0, maxLength: 10 }),
  failure_description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  defect_workitem_ids: fc.array(fc.uuid(), { maxLength: 5 }),
  execution_notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
  is_signed: fc.boolean(),
});

describe('Test Service Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Service API Integration', () => {
    // Feature: test-page-implementation, Property 1: Service API Integration
    // **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9**
    // For any valid test service function call with appropriate parameters,
    // the function should successfully communicate with the backend API and
    // return data matching the expected response schema.

    it('should fetch test specs with valid filters and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 100 }),
            size: fc.integer({ min: 1, max: 100 }),
            test_type: fc.option(testTypeArb, { nil: undefined }),
            linked_requirement_id: fc.option(fc.uuid(), { nil: undefined }),
          }),
          fc.array(testSpecArb, { minLength: 0, maxLength: 10 }),
          async (filters, items) => {
            const total = items.length;
            const pages = Math.ceil(total / (filters.size || 50));
            
            const response: testService.TestSpecListResponse = {
              items,
              total,
              page: filters.page || 1,
              size: filters.size || 50,
              pages,
            };

            vi.mocked(apiClient.get).mockResolvedValue(mockAxiosResponse(response));

            const result = await testService.getTestSpecs(filters);

            // Validate response schema
            expect(result).toHaveProperty('items');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('page');
            expect(result).toHaveProperty('size');
            expect(result).toHaveProperty('pages');
            expect(Array.isArray(result.items)).toBe(true);
            expect(typeof result.total).toBe('number');
            expect(typeof result.page).toBe('number');
            expect(typeof result.size).toBe('number');
            expect(typeof result.pages).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fetch a specific test spec by ID and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          testSpecArb,
          async (testSpecId, testSpec) => {
            vi.mocked(apiClient.get).mockResolvedValue(mockAxiosResponse(testSpec));

            const result = await testService.getTestSpec(testSpecId);

            // Validate response schema
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('test_type');
            expect(result).toHaveProperty('test_steps');
            expect(result).toHaveProperty('linked_requirements');
            expect(result).toHaveProperty('version');
            expect(result).toHaveProperty('created_by');
            expect(result).toHaveProperty('created_at');
            expect(result).toHaveProperty('updated_at');
            expect(result).toHaveProperty('is_signed');
            expect(Array.isArray(result.test_steps)).toBe(true);
            expect(Array.isArray(result.linked_requirements)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fetch test coverage and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            total_requirements: fc.integer({ min: 0, max: 1000 }),
            requirements_with_tests: fc.integer({ min: 0, max: 1000 }),
            requirements_with_passing_tests: fc.integer({ min: 0, max: 1000 }),
            coverage_percentage: fc.float({ min: 0, max: 100 }),
            detailed_coverage: fc.array(
              fc.record({
                requirement_id: fc.uuid(),
                requirement_title: fc.string({ minLength: 1, maxLength: 100 }),
                has_tests: fc.boolean(),
                has_passing_tests: fc.boolean(),
                coverage_status: fc.constantFrom('covered', 'partial', 'not_covered'),
              }),
              { maxLength: 10 }
            ),
          }),
          async (coverage) => {
            vi.mocked(apiClient.get).mockResolvedValue(mockAxiosResponse(coverage));

            const result = await testService.getTestCoverage();

            // Validate response schema
            expect(result).toHaveProperty('total_requirements');
            expect(result).toHaveProperty('requirements_with_tests');
            expect(result).toHaveProperty('requirements_with_passing_tests');
            expect(result).toHaveProperty('coverage_percentage');
            expect(result).toHaveProperty('detailed_coverage');
            expect(typeof result.total_requirements).toBe('number');
            expect(typeof result.requirements_with_tests).toBe('number');
            expect(typeof result.requirements_with_passing_tests).toBe('number');
            expect(typeof result.coverage_percentage).toBe('number');
            expect(Array.isArray(result.detailed_coverage)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create test spec and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            test_type: testTypeArb,
            priority: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
            preconditions: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
            test_steps: fc.array(testStepArb, { minLength: 0, maxLength: 10 }),
            linked_requirements: fc.array(fc.uuid(), { maxLength: 5 }),
          }),
          testSpecArb,
          async (createData, createdSpec) => {
            vi.mocked(apiClient.post).mockResolvedValue(mockAxiosResponse(createdSpec));

            const result = await testService.createTestSpec(createData);

            // Validate response schema
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('test_type');
            expect(result).toHaveProperty('version');
            expect(result).toHaveProperty('created_by');
            expect(result).toHaveProperty('created_at');
            expect(result).toHaveProperty('updated_at');
            expect(result).toHaveProperty('is_signed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update test spec and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            test_type: fc.option(testTypeArb, { nil: undefined }),
            priority: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          testSpecArb,
          async (testSpecId, updates, changeDescription, updatedSpec) => {
            vi.mocked(apiClient.patch).mockResolvedValue(mockAxiosResponse(updatedSpec));

            const result = await testService.updateTestSpec(testSpecId, updates, changeDescription);

            // Validate response schema
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('version');
            expect(result).toHaveProperty('updated_at');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should delete test spec successfully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (testSpecId) => {
            vi.mocked(apiClient.delete).mockResolvedValue(mockAxiosResponse(undefined));

            // Should not throw
            await expect(testService.deleteTestSpec(testSpecId)).resolves.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create test run and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            test_spec_id: fc.uuid(),
            test_spec_version: fc.string({ minLength: 1, maxLength: 20 }),
            executed_by: fc.uuid(),
            execution_date: fc.option(fc.constant('2024-01-01T00:00:00.000Z'), { nil: undefined }),
            environment: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
            overall_status: executionStatusArb,
            step_results: fc.array(testStepArb, { minLength: 0, maxLength: 10 }),
            failure_description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            defect_workitem_ids: fc.option(fc.array(fc.uuid(), { maxLength: 5 }), { nil: undefined }),
            execution_notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          testRunArb,
          async (testSpecId, createData, createdRun) => {
            vi.mocked(apiClient.post).mockResolvedValue(mockAxiosResponse(createdRun));

            const result = await testService.createTestRun(testSpecId, createData);

            // Validate response schema
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('test_spec_id');
            expect(result).toHaveProperty('test_spec_version');
            expect(result).toHaveProperty('executed_by');
            expect(result).toHaveProperty('execution_date');
            expect(result).toHaveProperty('overall_status');
            expect(result).toHaveProperty('step_results');
            expect(result).toHaveProperty('created_at');
            expect(result).toHaveProperty('updated_at');
            expect(result).toHaveProperty('is_signed');
            expect(Array.isArray(result.step_results)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fetch test runs for a spec and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          fc.array(testRunArb, { minLength: 0, maxLength: 10 }),
          async (testSpecId, page, size, items) => {
            const total = items.length;
            const pages = Math.ceil(total / (size || 50));
            
            const response: testService.TestRunListResponse = {
              items,
              total,
              page: page || 1,
              size: size || 50,
              pages,
            };

            vi.mocked(apiClient.get).mockResolvedValue(mockAxiosResponse(response));

            const result = await testService.getTestRuns(testSpecId, page, size);

            // Validate response schema
            expect(result).toHaveProperty('items');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('page');
            expect(result).toHaveProperty('size');
            expect(result).toHaveProperty('pages');
            expect(Array.isArray(result.items)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update test run and return correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            environment: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
            overall_status: fc.option(executionStatusArb, { nil: undefined }),
            step_results: fc.option(fc.array(testStepArb, { maxLength: 10 }), { nil: undefined }),
            failure_description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            execution_notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          testRunArb,
          async (runId, updates, updatedRun) => {
            vi.mocked(apiClient.patch).mockResolvedValue(mockAxiosResponse(updatedRun));

            const result = await testService.updateTestRun(runId, updates);

            // Validate response schema
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('test_spec_id');
            expect(result).toHaveProperty('overall_status');
            expect(result).toHaveProperty('updated_at');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Error Propagation', () => {
    // Feature: test-page-implementation, Property 2: Error Propagation
    // **Validates: Requirements 1.10**
    // For any test service function call that results in an API error,
    // the error should be propagated to the caller without being swallowed.

    it('should propagate errors from getTestSpecs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 100 }),
            size: fc.integer({ min: 1, max: 100 }),
          }),
          fc.constantFrom(400, 401, 403, 404, 500, 503),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (filters, statusCode, errorMessage) => {
            const error = {
              response: {
                status: statusCode,
                data: { detail: errorMessage },
              },
              isAxiosError: true,
            };

            vi.mocked(apiClient.get).mockRejectedValue(error);

            // Should propagate error, not swallow it
            await expect(testService.getTestSpecs(filters)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from getTestSpec', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom(400, 401, 403, 404, 500),
          async (testSpecId, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.get).mockRejectedValue(error);

            await expect(testService.getTestSpec(testSpecId)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from createTestSpec', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            test_type: testTypeArb,
            test_steps: fc.array(testStepArb, { maxLength: 5 }),
            linked_requirements: fc.array(fc.uuid(), { maxLength: 3 }),
          }),
          fc.constantFrom(400, 401, 403, 500),
          async (createData, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.post).mockRejectedValue(error);

            await expect(testService.createTestSpec(createData)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from updateTestSpec', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(400, 401, 403, 404, 500),
          async (testSpecId, updates, changeDescription, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.patch).mockRejectedValue(error);

            await expect(
              testService.updateTestSpec(testSpecId, updates, changeDescription)
            ).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from deleteTestSpec', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom(400, 401, 403, 404, 500),
          async (testSpecId, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.delete).mockRejectedValue(error);

            await expect(testService.deleteTestSpec(testSpecId)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from createTestRun', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            test_spec_id: fc.uuid(),
            test_spec_version: fc.string({ minLength: 1, maxLength: 20 }),
            executed_by: fc.uuid(),
            overall_status: executionStatusArb,
            step_results: fc.array(testStepArb, { maxLength: 5 }),
          }),
          fc.constantFrom(400, 401, 403, 404, 500),
          async (testSpecId, createData, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.post).mockRejectedValue(error);

            await expect(testService.createTestRun(testSpecId, createData)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from getTestRuns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom(400, 401, 403, 404, 500),
          async (testSpecId, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.get).mockRejectedValue(error);

            await expect(testService.getTestRuns(testSpecId)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate errors from updateTestRun', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            overall_status: fc.option(executionStatusArb, { nil: undefined }),
          }),
          fc.constantFrom(400, 401, 403, 404, 500),
          async (runId, updates, statusCode) => {
            const error = {
              response: { status: statusCode },
              isAxiosError: true,
            };

            vi.mocked(apiClient.patch).mockRejectedValue(error);

            await expect(testService.updateTestRun(runId, updates)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should propagate network errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (testSpecId, errorMessage) => {
            const error = new Error(errorMessage);

            vi.mocked(apiClient.get).mockRejectedValue(error);

            await expect(testService.getTestSpec(testSpecId)).rejects.toThrow(errorMessage);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

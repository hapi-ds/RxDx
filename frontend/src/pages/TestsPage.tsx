/**
 * Tests page
 * Main page for managing test specifications and test runs
 * Supports VV (Verification and Validation) management per Requirement 9
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, Modal } from '../components/common';
import { TestSpecList, type TestSpec, TestCoverageChart, TestSpecForm, TestSpecDetail, TestRunsList, TestRunForm } from '../components/tests';
import { getTestSpecs, getTestCoverage, createTestSpec, getTestSpec, deleteTestSpec, updateTestSpec, getTestRuns, createTestRun, updateTestRun, type TestFilters, type TestSpecListResponse, type TestCoverage as TestCoverageData, type TestType, type TestSpecCreate, type TestSpecUpdate, type TestRun, type TestRunListResponse, type TestRunCreate, type TestRunUpdate } from '../services/testService';

type ViewMode = 'list' | 'detail' | 'create' | 'runs';

interface TestCoverage {
  total_requirements: number;
  requirements_with_tests: number;
  requirements_with_passing_tests: number;
  coverage_percentage: number;
}

export function TestsPage(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedTestSpec, setSelectedTestSpec] = useState<TestSpec | null>(null);
  const [testSpecs, setTestSpecs] = useState<TestSpec[]>([]);
  const [coverage, setCoverage] = useState<TestCoverage | null>(null);
  const [totalTests, setTotalTests] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<TestFilters>({ page: 1, size: 50 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [changeDescription, setChangeDescription] = useState('');
  
  // Test runs state
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [createRunError, setCreateRunError] = useState<string | null>(null);
  const [showEditRunModal, setShowEditRunModal] = useState(false);
  const [isUpdatingRun, setIsUpdatingRun] = useState(false);
  const [updateRunError, setUpdateRunError] = useState<string | null>(null);
  const [selectedTestRun, setSelectedTestRun] = useState<TestRun | null>(null);

  // Load test specs on mount and when filters change
  useEffect(() => {
    loadTestSpecs();
  }, [filters]);

  // Load coverage on mount
  useEffect(() => {
    loadCoverage();
  }, []);

  const loadTestSpecs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: TestSpecListResponse = await getTestSpecs(filters);
      setTestSpecs(response.items);
      setTotalTests(response.total);
      setTotalPages(response.pages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load test specifications';
      setError(errorMessage);
      console.error('Error loading test specs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadCoverage = useCallback(async () => {
    try {
      const data: TestCoverageData = await getTestCoverage();
      setCoverage(data);
    } catch (err) {
      console.error('Failed to load coverage:', err);
      // Don't set error state for coverage failures, just log them
    }
  }, []);

  const handleTestClick = useCallback(async (test: TestSpec) => {
    setSelectedTestId(test.id);
    setIsLoading(true);
    setError(null);
    try {
      const fullTestSpec = await getTestSpec(test.id);
      setSelectedTestSpec(fullTestSpec);
      setViewMode('detail');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load test specification details';
      setError(errorMessage);
      console.error('Error loading test spec details:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedTestId(null);
    setShowCreateModal(true);
    setCreateError(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedTestId(null);
    setSelectedTestSpec(null);
  }, []);

  const loadTestRuns = useCallback(async (testId: string) => {
    setIsLoadingRuns(true);
    setRunsError(null);
    try {
      const response: TestRunListResponse = await getTestRuns(testId);
      setTestRuns(response.items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load test runs';
      setRunsError(errorMessage);
      console.error('Error loading test runs:', err);
    } finally {
      setIsLoadingRuns(false);
    }
  }, []);

  const handleViewRuns = useCallback(async (testId: string) => {
    setSelectedTestId(testId);
    setViewMode('runs');
    
    // Load test spec if not already loaded
    if (!selectedTestSpec || selectedTestSpec.id !== testId) {
      setIsLoading(true);
      try {
        const fullTestSpec = await getTestSpec(testId);
        setSelectedTestSpec(fullTestSpec);
      } catch (err) {
        console.error('Error loading test spec:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTestRuns(testId);
  }, [selectedTestSpec, loadTestRuns]);

  const handleRetryLoadRuns = useCallback(() => {
    if (selectedTestId) {
      loadTestRuns(selectedTestId);
    }
  }, [selectedTestId, loadTestRuns]);

  const handleCreateRunClick = useCallback(() => {
    setShowCreateRunModal(true);
    setCreateRunError(null);
  }, []);

  const handleCancelCreateRun = useCallback(() => {
    setShowCreateRunModal(false);
    setCreateRunError(null);
  }, []);

  const handleCreateTestRun = useCallback(async (data: any) => {
    if (!selectedTestId || !selectedTestSpec) return;
    
    setIsCreatingRun(true);
    setCreateRunError(null);
    try {
      // Transform the data to match TestRunCreate interface
      const testRunData: TestRunCreate = {
        test_spec_id: selectedTestSpec.id,
        test_spec_version: selectedTestSpec.version,
        executed_by: data.executed_by || 'current-user', // TODO: Get from auth context
        execution_date: data.execution_date,
        environment: data.environment,
        test_data: data.test_data,
        overall_status: data.overall_status,
        step_results: data.step_results,
        failure_description: data.failure_description,
        defect_workitem_ids: data.defect_workitem_ids || [],
        execution_notes: data.execution_notes,
      };
      
      await createTestRun(selectedTestId, testRunData);
      setShowCreateRunModal(false);
      // Refresh the test runs list
      await loadTestRuns(selectedTestId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test run';
      setCreateRunError(errorMessage);
      console.error('Error creating test run:', err);
    } finally {
      setIsCreatingRun(false);
    }
  }, [selectedTestId, selectedTestSpec, loadTestRuns]);

  const handleEditRunClick = useCallback((run: TestRun) => {
    setSelectedTestRun(run);
    setShowEditRunModal(true);
    setUpdateRunError(null);
  }, []);

  const handleCancelEditRun = useCallback(() => {
    setShowEditRunModal(false);
    setUpdateRunError(null);
    setSelectedTestRun(null);
  }, []);

  const handleUpdateTestRun = useCallback(async (data: any) => {
    if (!selectedTestRun) return;
    
    setIsUpdatingRun(true);
    setUpdateRunError(null);
    try {
      // Transform the data to match TestRunUpdate interface
      const updates: TestRunUpdate = {
        environment: data.environment,
        test_data: data.test_data,
        overall_status: data.overall_status,
        step_results: data.step_results,
        failure_description: data.failure_description,
        defect_workitem_ids: data.defect_workitem_ids || [],
        execution_notes: data.execution_notes,
      };
      
      await updateTestRun(selectedTestRun.id, updates);
      setShowEditRunModal(false);
      setSelectedTestRun(null);
      // Refresh the test runs list
      if (selectedTestId) {
        await loadTestRuns(selectedTestId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test run';
      setUpdateRunError(errorMessage);
      console.error('Error updating test run:', err);
    } finally {
      setIsUpdatingRun(false);
    }
  }, [selectedTestRun, selectedTestId, loadTestRuns]);

  const handleRetry = useCallback(() => {
    loadTestSpecs();
  }, [loadTestSpecs]);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<TestFilters>) => {
    setFilters((prev) => ({ 
      ...prev, 
      ...newFilters,
      // Reset to page 1 when filters change
      page: 1 
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ page: 1, size: 50 });
  }, []);

  const handleCreateTestSpec = useCallback(async (data: TestSpecCreate) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      await createTestSpec(data);
      setShowCreateModal(false);
      // Refresh the list
      await loadTestSpecs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test specification';
      setCreateError(errorMessage);
      console.error('Error creating test spec:', err);
    } finally {
      setIsCreating(false);
    }
  }, [loadTestSpecs]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateModal(false);
    setCreateError(null);
  }, []);

  const handleUpdateTestSpec = useCallback(async (data: TestSpecCreate) => {
    if (!selectedTestId || !changeDescription.trim()) {
      setUpdateError('Change description is required');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    try {
      const updates: TestSpecUpdate = {
        title: data.title,
        description: data.description,
        test_type: data.test_type,
        priority: data.priority,
        preconditions: data.preconditions,
        test_steps: data.test_steps,
        linked_requirements: data.linked_requirements,
      };
      
      const updatedSpec = await updateTestSpec(selectedTestId, updates, changeDescription);
      setSelectedTestSpec(updatedSpec);
      setShowEditModal(false);
      setChangeDescription('');
      // Refresh the list
      await loadTestSpecs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test specification';
      setUpdateError(errorMessage);
      console.error('Error updating test spec:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedTestId, changeDescription, loadTestSpecs]);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
    setUpdateError(null);
    setChangeDescription('');
  }, []);

  const handleEditClick = useCallback(() => {
    setShowEditModal(true);
    setUpdateError(null);
    setChangeDescription('');
  }, []);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
    setDeleteError(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedTestId) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTestSpec(selectedTestId);
      setShowDeleteConfirm(false);
      setViewMode('list');
      setSelectedTestId(null);
      setSelectedTestSpec(null);
      // Refresh the list
      await loadTestSpecs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete test specification';
      setDeleteError(errorMessage);
      console.error('Error deleting test spec:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedTestId, loadTestSpecs]);

  return (
    <div className="tests-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Tests</h1>
          <p className="page-subtitle">
            Manage test specifications, execute test runs, and track test coverage
          </p>
        </div>
        {viewMode !== 'list' && (
          <Button variant="secondary" onClick={handleBackToList}>
            ← Back to List
          </Button>
        )}
      </div>

      {/* Coverage Dashboard */}
      {viewMode === 'list' && coverage && (
        <div className="coverage-dashboard">
          <h2 className="dashboard-title">Test Coverage</h2>
          <TestCoverageChart 
            data={coverage}
            visualizationType="all"
            showLegend={true}
            showStatistics={true}
          />
        </div>
      )}

      <div className="page-content">
        {viewMode === 'list' && (
          <div className="test-list-container">
            <div className="list-header">
              <h2 className="list-title">Test Specifications</h2>
              <Button variant="primary" onClick={handleCreateClick}>
                + Create Test Spec
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="filter-controls">
              <div className="filter-group">
                <label htmlFor="test-type-filter" className="filter-label">
                  Test Type
                </label>
                <select
                  id="test-type-filter"
                  data-testid="filter-test-type"
                  className="filter-select"
                  value={filters.test_type || ''}
                  onChange={(e) => handleFilterChange({ test_type: e.target.value as TestType || undefined })}
                >
                  <option value="">All Types</option>
                  <option value="unit">Unit</option>
                  <option value="integration">Integration</option>
                  <option value="system">System</option>
                  <option value="acceptance">Acceptance</option>
                  <option value="regression">Regression</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="requirement-filter" className="filter-label">
                  Linked Requirement ID
                </label>
                <input
                  id="requirement-filter"
                  data-testid="filter-requirement-id"
                  type="text"
                  className="filter-input"
                  placeholder="Enter requirement ID..."
                  value={filters.linked_requirement_id || ''}
                  onChange={(e) => handleFilterChange({ linked_requirement_id: e.target.value || undefined })}
                />
              </div>

              {(filters.test_type || filters.linked_requirement_id) && (
                <div className="filter-actions">
                  <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            <TestSpecList
              testSpecs={testSpecs}
              onTestClick={handleTestClick}
              onViewRuns={handleViewRuns}
              isLoading={isLoading}
              error={error}
              onRetry={handleRetry}
            />

            {/* Pagination Controls */}
            {!isLoading && !error && totalPages > 1 && (
              <div className="pagination-controls">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(filters.page! - 1)}
                  disabled={filters.page === 1}
                >
                  ← Previous
                </Button>
                
                <div className="pagination-info">
                  <span className="page-indicator">
                    Page {filters.page} of {totalPages}
                  </span>
                  <span className="total-indicator">
                    ({totalTests} total test{totalTests !== 1 ? 's' : ''})
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(filters.page! + 1)}
                  disabled={filters.page === totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'detail' && selectedTestSpec && (
          <TestSpecDetail
            testSpec={selectedTestSpec}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onViewRuns={() => handleViewRuns(selectedTestSpec.id)}
            onBack={handleBackToList}
            isLoading={isLoading}
          />
        )}

        {viewMode === 'runs' && selectedTestId && (
          <div className="runs-container">
            <TestRunsList
              testRuns={testRuns}
              onCreateRun={handleCreateRunClick}
              onEditRun={handleEditRunClick}
              isLoading={isLoadingRuns}
              error={runsError}
              onRetry={handleRetryLoadRuns}
            />
          </div>
        )}
      </div>

      {/* Create Test Spec Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCancelCreate}
        title="Create Test Specification"
        size="xl"
      >
        {createError && (
          <div className="modal-error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{createError}</span>
          </div>
        )}
        <TestSpecForm
          onSubmit={handleCreateTestSpec}
          onCancel={handleCancelCreate}
          isLoading={isCreating}
          submitLabel="Create Test Specification"
        />
      </Modal>

      {/* Edit Test Spec Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCancelEdit}
        title="Edit Test Specification"
        size="xl"
      >
        {updateError && (
          <div className="modal-error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{updateError}</span>
          </div>
        )}
        {selectedTestSpec && (
          <>
            <div className="change-description-section">
              <label htmlFor="change-description" className="change-description-label">
                Change Description <span className="required-indicator">*</span>
              </label>
              <textarea
                id="change-description"
                data-testid="change-description"
                className="change-description-input"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="Describe what changes you are making and why..."
                rows={3}
                required
                disabled={isUpdating}
              />
              <span className="change-description-hint">
                Required for audit trail and version history
              </span>
            </div>
            <TestSpecForm
              initialData={{
                title: selectedTestSpec.title,
                description: selectedTestSpec.description,
                test_type: selectedTestSpec.test_type,
                priority: selectedTestSpec.priority,
                preconditions: selectedTestSpec.preconditions,
                test_steps: selectedTestSpec.test_steps,
                linked_requirements: selectedTestSpec.linked_requirements,
              }}
              onSubmit={handleUpdateTestSpec}
              onCancel={handleCancelEdit}
              isLoading={isUpdating}
              submitLabel="Update Test Specification"
            />
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        title="Delete Test Specification"
        size="md"
      >
        <div className="delete-modal-content">
          {deleteError && (
            <div className="modal-error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{deleteError}</span>
            </div>
          )}
          <p className="delete-warning">
            Are you sure you want to delete this test specification? This action cannot be undone.
          </p>
          {selectedTestSpec?.is_signed && (
            <div className="signed-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                This test specification is digitally signed. Deletion may be restricted.
              </span>
            </div>
          )}
          <div className="delete-modal-actions">
            <Button variant="secondary" onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Test Run Modal */}
      <Modal
        isOpen={showCreateRunModal}
        onClose={handleCancelCreateRun}
        title="Create Test Run"
        size="xl"
      >
        {createRunError && (
          <div className="modal-error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{createRunError}</span>
          </div>
        )}
        {selectedTestSpec && (
          <TestRunForm
            testSpec={selectedTestSpec}
            onSubmit={handleCreateTestRun}
            onCancel={handleCancelCreateRun}
            isSubmitting={isCreatingRun}
            mode="create"
          />
        )}
      </Modal>

      {/* Edit Test Run Modal */}
      <Modal
        isOpen={showEditRunModal}
        onClose={handleCancelEditRun}
        title="Edit Test Run"
        size="xl"
      >
        {updateRunError && (
          <div className="modal-error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{updateRunError}</span>
          </div>
        )}
        {selectedTestSpec && selectedTestRun && (
          <TestRunForm
            testSpec={selectedTestSpec}
            initialData={selectedTestRun}
            onSubmit={handleUpdateTestRun}
            onCancel={handleCancelEditRun}
            isSubmitting={isUpdatingRun}
            mode="edit"
          />
        )}
      </Modal>

      <style>{`
        .tests-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.5rem;
          background-color: #f9fafb;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .page-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .coverage-dashboard {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dashboard-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .page-content {
          flex: 1;
          overflow: auto;
        }

        .test-list-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .list-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .filter-controls {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
          min-width: 200px;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-select,
        .filter-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #111827;
          background: white;
          transition: border-color 0.2s;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-select:hover,
        .filter-input:hover {
          border-color: #9ca3af;
        }

        .filter-actions {
          display: flex;
          align-items: flex-end;
        }

        .pagination-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .pagination-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .page-indicator {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .total-indicator {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .form-container,
        .detail-container,
        .runs-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-title,
        .detail-title,
        .runs-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .coming-soon-message {
          padding: 3rem 2rem;
          text-align: center;
          background: #f9fafb;
          border-radius: 6px;
          border: 2px dashed #d1d5db;
        }

        .coming-soon-message p {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #374151;
        }

        .coming-soon-message .hint {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        .modal-error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
        }

        .modal-error-banner .error-icon {
          font-size: 1.25rem;
        }

        .modal-error-banner .error-message {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .delete-modal-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .delete-warning {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.5;
        }

        .signed-warning {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 6px;
        }

        .warning-icon {
          font-size: 1.25rem;
          color: #d97706;
        }

        .warning-text {
          font-size: 0.875rem;
          color: #92400e;
          font-weight: 500;
        }

        .delete-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .change-description-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .change-description-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .required-indicator {
          color: #dc2626;
          margin-left: 0.25rem;
        }

        .change-description-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #111827;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .change-description-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .change-description-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .change-description-hint {
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
        }

        /* Responsive Design - Mobile Screens (< 768px) */
        @media (max-width: 768px) {
          .tests-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .page-subtitle {
            font-size: 0.8125rem;
          }

          .coverage-dashboard {
            padding: 1rem;
          }

          .dashboard-title {
            font-size: 1rem;
          }

          .list-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
            padding: 1rem;
          }

          .list-title {
            font-size: 1.125rem;
          }

          /* Filter controls stack vertically on mobile */
          .filter-controls {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
            gap: 0.75rem;
          }

          .filter-group {
            min-width: 100%;
            width: 100%;
          }

          .filter-select,
          .filter-input {
            width: 100%;
          }

          .filter-actions {
            align-items: stretch;
            width: 100%;
          }

          .filter-actions button {
            width: 100%;
          }

          /* Pagination controls stack vertically */
          .pagination-controls {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }

          .pagination-info {
            order: -1;
            text-align: center;
          }

          .pagination-controls button {
            width: 100%;
          }

          /* Modal adjustments for mobile */
          .change-description-section {
            padding-bottom: 1rem;
            margin-bottom: 1rem;
          }

          .change-description-input {
            font-size: 1rem; /* Prevent zoom on iOS */
          }

          .delete-modal-actions {
            flex-direction: column;
          }

          .delete-modal-actions button {
            width: 100%;
          }

          /* Form containers on mobile */
          .form-container,
          .detail-container,
          .runs-container {
            padding: 1rem;
            margin: 0;
          }
        }

        /* Tablet adjustments (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .filter-controls {
            gap: 0.75rem;
          }

          .filter-group {
            min-width: 180px;
            flex: 1 1 calc(50% - 0.75rem);
          }
        }
      `}</style>
    </div>
  );
}

export default TestsPage;

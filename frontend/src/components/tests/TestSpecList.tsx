/**
 * TestSpecList component
 * Enhanced test specification listing with filtering, sorting, and search
 * Implements Requirement 9 (Verification and Validation Management)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '../common';

export interface TestSpec {
  id: string;
  title: string;
  description?: string;
  test_type: 'unit' | 'integration' | 'system' | 'acceptance' | 'regression';
  priority?: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  version: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
  linked_requirements: string[];
  test_steps: TestStep[];
}

export interface TestStep {
  step_number: number;
  description: string;
  expected_result: string;
  status: 'pass' | 'fail' | 'blocked' | 'skipped' | 'not_run';
  actual_result?: string;
  notes?: string;
}

export interface TestSpecListProps {
  testSpecs: TestSpec[];
  onTestClick: (test: TestSpec) => void;
  onViewRuns: (testId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

type SortField = 'title' | 'test_type' | 'priority' | 'status' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export function TestSpecList({
  testSpecs,
  onTestClick,
  onViewRuns,
  isLoading = false,
  error = null,
}: TestSpecListProps): React.ReactElement {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTestType, setFilterTestType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSigned, setFilterSigned] = useState<string>('all');

  // Sort states
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter and sort logic
  const filteredAndSortedTests = useMemo(() => {
    let filtered = [...testSpecs];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (test) =>
          test.title.toLowerCase().includes(query) ||
          test.description?.toLowerCase().includes(query)
      );
    }

    // Apply test type filter
    if (filterTestType !== 'all') {
      filtered = filtered.filter((test) => test.test_type === filterTestType);
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      const priority = parseInt(filterPriority, 10);
      filtered = filtered.filter((test) => test.priority === priority);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((test) => test.status === filterStatus);
    }

    // Apply signed filter
    if (filterSigned !== 'all') {
      const isSigned = filterSigned === 'signed';
      filtered = filtered.filter((test) => test.is_signed === isSigned);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | boolean;
      let bValue: string | number | boolean;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'test_type':
          aValue = a.test_type;
          bValue = b.test_type;
          break;
        case 'priority':
          aValue = a.priority ?? 999;
          bValue = b.priority ?? 999;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [testSpecs, searchQuery, filterTestType, filterPriority, filterStatus, filterSigned, sortField, sortDirection]);

  // Handle sort change
  const handleSortChange = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterTestType('all');
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterSigned('all');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      filterTestType !== 'all' ||
      filterPriority !== 'all' ||
      filterStatus !== 'all' ||
      filterSigned !== 'all'
    );
  }, [searchQuery, filterTestType, filterPriority, filterStatus, filterSigned]);

  // Helper functions
  const getTestTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      unit: '#10b981',
      integration: '#3b82f6',
      system: '#8b5cf6',
      acceptance: '#f59e0b',
      regression: '#ef4444',
    };
    return colors[type] || '#6b7280';
  };

  const getPriorityLabel = (priority?: number): string => {
    if (!priority) return 'N/A';
    const labels: Record<number, string> = {
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low',
      5: 'Trivial',
    };
    return labels[priority] || 'N/A';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: '#9ca3af',
      active: '#3b82f6',
      completed: '#10b981',
      archived: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="test-spec-list">
      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search test specifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search test specifications"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="filter-test-type" className="filter-label">
              Test Type:
            </label>
            <select
              id="filter-test-type"
              value={filterTestType}
              onChange={(e) => setFilterTestType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="unit">Unit</option>
              <option value="integration">Integration</option>
              <option value="system">System</option>
              <option value="acceptance">Acceptance</option>
              <option value="regression">Regression</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-priority" className="filter-label">
              Priority:
            </label>
            <select
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="1">Critical</option>
              <option value="2">High</option>
              <option value="3">Medium</option>
              <option value="4">Low</option>
              <option value="5">Trivial</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-status" className="filter-label">
              Status:
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-signed" className="filter-label">
              Signature:
            </label>
            <select
              id="filter-signed"
              value={filterSigned}
              onChange={(e) => setFilterSigned(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="signed">Signed</option>
              <option value="unsigned">Unsigned</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="sort-controls">
        <span className="sort-label">Sort by:</span>
        <div className="sort-buttons">
          <button
            className={`sort-button ${sortField === 'title' ? 'active' : ''}`}
            onClick={() => handleSortChange('title')}
          >
            Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`sort-button ${sortField === 'test_type' ? 'active' : ''}`}
            onClick={() => handleSortChange('test_type')}
          >
            Type {sortField === 'test_type' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`sort-button ${sortField === 'priority' ? 'active' : ''}`}
            onClick={() => handleSortChange('priority')}
          >
            Priority {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`sort-button ${sortField === 'status' ? 'active' : ''}`}
            onClick={() => handleSortChange('status')}
          >
            Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`sort-button ${sortField === 'created_at' ? 'active' : ''}`}
            onClick={() => handleSortChange('created_at')}
          >
            Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`sort-button ${sortField === 'updated_at' ? 'active' : ''}`}
            onClick={() => handleSortChange('updated_at')}
          >
            Updated {sortField === 'updated_at' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        <span className="results-count">
          Showing {filteredAndSortedTests.length} of {testSpecs.length} test specifications
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading test specifications...</span>
        </div>
      ) : filteredAndSortedTests.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? (
            <>
              <span className="empty-icon">🔍</span>
              <h3 className="empty-title">No Matching Tests</h3>
              <p className="empty-description">
                No test specifications match your current filters. Try adjusting your search criteria.
              </p>
              <Button variant="secondary" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <span className="empty-icon">🧪</span>
              <h3 className="empty-title">No Test Specifications</h3>
              <p className="empty-description">
                Create your first test specification to start tracking verification and validation activities.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="test-grid">
          {filteredAndSortedTests.map((test) => (
            <div
              key={test.id}
              className="test-card"
              onClick={() => onTestClick(test)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTestClick(test);
                }
              }}
            >
              <div className="test-card-header">
                <span
                  className="test-type-badge"
                  style={{ backgroundColor: getTestTypeColor(test.test_type) }}
                >
                  {test.test_type}
                </span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(test.status) }}
                >
                  {test.status}
                </span>
              </div>

              <h3 className="test-card-title">{test.title}</h3>

              {test.description && (
                <p className="test-card-description">{test.description}</p>
              )}

              <div className="test-card-meta">
                <span className="meta-item">
                  Priority: {getPriorityLabel(test.priority)}
                </span>
                <span className="meta-item">Steps: {test.test_steps.length}</span>
                <span className="meta-item">
                  Requirements: {test.linked_requirements.length}
                </span>
              </div>

              <div className="test-card-dates">
                <span className="date-item">Created: {formatDate(test.created_at)}</span>
                <span className="date-item">Updated: {formatDate(test.updated_at)}</span>
              </div>

              <div className="test-card-footer">
                <div className="footer-left">
                  <span className="version-badge">v{test.version}</span>
                  {test.is_signed && (
                    <span className="signed-badge" title="Digitally Signed">
                      ✓ Signed
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewRuns(test.id);
                  }}
                >
                  View Runs
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .test-spec-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Filters Section */
        .filters-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .search-bar {
          position: relative;
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          opacity: 0.5;
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: flex-end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 150px;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .filter-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        /* Sort Controls */
        .sort-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sort-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .sort-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sort-button {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sort-button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .sort-button.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .sort-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        /* Results Info */
        .results-info {
          padding: 0.5rem 1.25rem;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .results-count {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        /* Error Banner */
        .error-banner {
          padding: 1rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .empty-description {
          margin: 0 0 1.5rem 0;
          font-size: 0.875rem;
          color: #6b7280;
          max-width: 400px;
        }

        /* Test Grid */
        .test-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }

        .test-card {
          padding: 1.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .test-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .test-card:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .test-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .test-type-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
        }

        .test-card-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
        }

        .test-card-description {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .test-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .meta-item {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .test-card-dates {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .date-item {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .test-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .version-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .signed-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          background: #dcfce7;
          color: #166534;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .filters-row {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .sort-controls {
            flex-direction: column;
            align-items: flex-start;
          }

          .test-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default TestSpecList;

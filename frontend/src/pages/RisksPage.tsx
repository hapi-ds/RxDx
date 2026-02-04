/**
 * Risks page
 * Main page for managing risks with FMEA (Failure Mode and Effects Analysis)
 * Supports Requirement 10 (Risk Management with FMEA)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, ConfirmModal } from '../components/common';
import { RiskCard } from '../components/risks';
import { 
  riskService, 
  type RiskNode, 
  type RiskFilters,
  type RiskStatus 
} from '../services';

type ViewMode = 'list' | 'detail' | 'create' | 'edit' | 'chains';

export function RisksPage(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [risks, setRisks] = useState<RiskNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<RiskNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<RiskFilters>({
    page: 1,
    size: 20,
  });
  const [totalRisks, setTotalRisks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load risks on mount and when filters change
  useEffect(() => {
    loadRisks();
  }, [filters]);

  const loadRisks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await riskService.getRisks(filters);
      setRisks(response.items || []);
      setTotalRisks(response.total || 0);
      setTotalPages(response.pages || 0);
    } catch (err) {
      setError('Failed to load risks');
      setRisks([]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleRiskClick = useCallback((risk: RiskNode) => {
    setSelectedRiskId(risk.id);
    setViewMode('detail');
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedRiskId(null);
    setViewMode('create');
  }, []);

  // Placeholder handlers for delete functionality (future implementation)
  // const handleDelete = useCallback((risk: RiskNode) => {
  //   setRiskToDelete(risk);
  //   setShowDeleteConfirm(true);
  // }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (riskToDelete) {
      setIsDeleting(true);
      try {
        await riskService.deleteRisk(riskToDelete.id);
        setShowDeleteConfirm(false);
        setRiskToDelete(null);
        setViewMode('list');
        setSelectedRiskId(null);
        loadRisks();
      } catch (err) {
        setError('Failed to delete risk');
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [riskToDelete, loadRisks]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setRiskToDelete(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedRiskId(null);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<RiskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  return (
    <div className="risks-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Risk Management (FMEA)</h1>
          <p className="page-subtitle">
            Identify, assess, and mitigate project risks using Failure Mode and Effects Analysis
          </p>
        </div>
        {viewMode !== 'list' && (
          <Button variant="secondary" onClick={handleBackToList}>
            ← Back to List
          </Button>
        )}
      </div>

      <div className="page-content">
        {viewMode === 'list' && (
          <div className="risk-list-container">
            {/* Filters */}
            <div className="filters-section">
              <div className="filters-header">
                <h2 className="filters-title">Filters</h2>
                <Button variant="primary" onClick={handleCreateClick}>
                  + Create Risk
                </Button>
              </div>
              
              <div className="filters-grid">
                <div className="filter-group">
                  <label htmlFor="status-filter">Status</label>
                  <select
                    id="status-filter"
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange({ 
                      status: e.target.value as RiskStatus || undefined 
                    })}
                    className="filter-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="identified">Identified</option>
                    <option value="assessed">Assessed</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="accepted">Accepted</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="min-rpn-filter">Min RPN</label>
                  <input
                    id="min-rpn-filter"
                    type="number"
                    min="1"
                    max="1000"
                    value={filters.min_rpn || ''}
                    onChange={(e) => handleFilterChange({ 
                      min_rpn: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="filter-input"
                    placeholder="Min RPN"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="max-rpn-filter">Max RPN</label>
                  <input
                    id="max-rpn-filter"
                    type="number"
                    min="1"
                    max="1000"
                    value={filters.max_rpn || ''}
                    onChange={(e) => handleFilterChange({ 
                      max_rpn: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="filter-input"
                    placeholder="Max RPN"
                  />
                </div>
              </div>
            </div>

            {/* Risk List */}
            <div className="risk-list">
              {isLoading && (
                <div className="loading-state">Loading risks...</div>
              )}

              {error && (
                <div className="error-state">
                  <p>{error}</p>
                  <Button variant="secondary" onClick={loadRisks}>
                    Retry
                  </Button>
                </div>
              )}

              {!isLoading && !error && risks.length === 0 && (
                <div className="empty-state">
                  <p>No risks found</p>
                  <Button variant="primary" onClick={handleCreateClick}>
                    Create First Risk
                  </Button>
                </div>
              )}

              {!isLoading && !error && risks.length > 0 && (
                <>
                  <div className="risk-cards">
                    {risks.map((risk) => (
                      <RiskCard
                        key={risk.id}
                        risk={risk}
                        onClick={handleRiskClick}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(filters.page! - 1)}
                        disabled={filters.page === 1}
                      >
                        Previous
                      </Button>
                      <span className="pagination-info">
                        Page {filters.page} of {totalPages} ({totalRisks} total)
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(filters.page! + 1)}
                        disabled={filters.page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {viewMode === 'detail' && selectedRiskId && (
          <div className="detail-container">
            <div className="coming-soon-message">
              <p>Risk detail view coming soon...</p>
              <p className="hint">
                This will display risk details, FMEA ratings, failure chains, mitigations,
                version history, and digital signatures.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'create' && (
          <div className="form-container">
            <h2 className="form-title">Create New Risk</h2>
            <div className="coming-soon-message">
              <p>Risk creation form coming soon...</p>
              <p className="hint">
                This will include fields for title, description, FMEA ratings (severity,
                occurrence, detection), failure mode, effects, causes, and current controls.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'edit' && selectedRiskId && (
          <div className="form-container">
            <h2 className="form-title">Edit Risk</h2>
            <div className="coming-soon-message">
              <p>Risk edit form coming soon...</p>
              <p className="hint">
                This will allow updating risk information and FMEA ratings, creating new versions.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'chains' && selectedRiskId && (
          <div className="chains-container">
            <h2 className="chains-title">Failure Chains</h2>
            <div className="coming-soon-message">
              <p>Failure chain visualization coming soon...</p>
              <p className="hint">
                This will display risk propagation paths showing how risks lead to failures
                with probability calculations.
              </p>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Risk"
        message={`Are you sure you want to delete "${riskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <style>{`
        .risks-page {
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

        .page-content {
          flex: 1;
          overflow: auto;
        }

        .risk-list-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filters-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filters-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-select,
        .filter-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .risk-list {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .risk-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1rem;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .loading-state,
        .error-state,
        .empty-state {
          padding: 3rem 2rem;
          text-align: center;
        }

        .error-state p,
        .empty-state p {
          margin: 0 0 1rem 0;
          color: #6b7280;
        }

        .detail-container,
        .form-container,
        .chains-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-title,
        .chains-title {
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

        @media (max-width: 768px) {
          .risks-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .risk-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default RisksPage;

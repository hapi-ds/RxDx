/**
 * Templates Page
 * Allows administrators to browse, validate, and apply project templates
 */

import React, { useEffect, useState } from 'react';
import { useTemplateStore } from '../stores/templateStore';
import { useAuthStore } from '../stores/authStore';
import './TemplatesPage.css';

export function TemplatesPage(): React.ReactElement {
  const { user } = useAuthStore();
  const {
    templates,
    selectedTemplate,
    validationResult,
    applicationResult,
    isLoading,
    error,
    loadTemplates,
    selectTemplate,
    validateTemplate,
    applyTemplate,
    clearError,
    clearValidation,
    clearApplication,
  } = useTemplateStore();

  // Ensure templates is always an array
  const safeTemplates = Array.isArray(templates) ? templates : [];

  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSelectTemplate = async (name: string) => {
    setSelectedTemplateName(name);
    setShowValidation(false);
    setShowApplication(false);
    clearValidation();
    clearApplication();
    await selectTemplate(name);
  };

  const handleValidate = async () => {
    if (!selectedTemplateName) return;
    setShowValidation(true);
    setShowApplication(false);
    await validateTemplate(selectedTemplateName);
  };

  const handleApplyDryRun = async () => {
    if (!selectedTemplateName) return;
    setShowApplication(true);
    setShowValidation(false);
    await applyTemplate(selectedTemplateName, true);
  };

  const handleApply = async () => {
    if (!selectedTemplateName || !confirmApply) return;
    setShowApplication(true);
    setShowValidation(false);
    await applyTemplate(selectedTemplateName, false);
    setConfirmApply(false);
  };

  const handleRefresh = () => {
    loadTemplates();
    setSelectedTemplateName(null);
    setShowValidation(false);
    setShowApplication(false);
    clearValidation();
    clearApplication();
  };

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div>
          <h1>📋 Templates</h1>
          <p className="templates-description">
            Browse and apply project templates to quickly initialize projects with predefined configurations.
          </p>
        </div>
        <button onClick={handleRefresh} className="refresh-button" disabled={isLoading}>
          {isLoading ? '⟳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      {!isAdmin && (
        <div className="warning-message">
          <span className="warning-icon">ℹ️</span>
          <span>You are viewing templates in read-only mode. Admin role required to apply templates.</span>
        </div>
      )}

      <div className="templates-content">
        {/* Template List */}
        <aside className="templates-sidebar">
          <h2>Available Templates</h2>
          {isLoading && safeTemplates.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading templates...</p>
            </div>
          ) : safeTemplates.length === 0 ? (
            <div className="empty-state">
              <p>No templates available</p>
            </div>
          ) : (
            <div className="template-list">
              {safeTemplates.map((template) => (
                <button
                  key={template.name}
                  className={`template-item ${selectedTemplateName === template.name ? 'selected' : ''}`}
                  onClick={() => handleSelectTemplate(template.name)}
                  disabled={isLoading}
                >
                  <div className="template-item-header">
                    <span className="template-name">{template.name}</span>
                    <span className="template-version">v{template.version}</span>
                  </div>
                  <p className="template-description">{template.description}</p>
                  <span className="template-author">by {template.author}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Template Details */}
        <main className="templates-main">
          {!selectedTemplate && !isLoading && (
            <div className="placeholder-state">
              <div className="placeholder-icon">📋</div>
              <h3>Select a Template</h3>
              <p>Choose a template from the list to view details and options.</p>
            </div>
          )}

          {isLoading && selectedTemplateName && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading template details...</p>
            </div>
          )}

          {selectedTemplate && !isLoading && (
            <div className="template-details">
              {/* Template Info */}
              <section className="template-info">
                <h2>{selectedTemplate.metadata.name}</h2>
                <div className="template-meta">
                  <span className="meta-item">
                    <strong>Version:</strong> {selectedTemplate.metadata.version}
                  </span>
                  <span className="meta-item">
                    <strong>Author:</strong> {selectedTemplate.metadata.author}
                  </span>
                </div>
                <p className="template-full-description">{selectedTemplate.metadata.description}</p>
              </section>

              {/* Action Buttons */}
              <section className="template-actions">
                <button
                  onClick={handleValidate}
                  className="button-secondary"
                  disabled={isLoading}
                >
                  ✓ Validate Template
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={handleApplyDryRun}
                      className="button-secondary"
                      disabled={isLoading}
                    >
                      👁️ Preview (Dry Run)
                    </button>
                    <button
                      onClick={() => setConfirmApply(true)}
                      className="button-primary"
                      disabled={isLoading}
                    >
                      ✨ Apply Template
                    </button>
                  </>
                )}
              </section>

              {/* Template Content Summary */}
              <section className="template-summary">
                <h3>Template Contents</h3>
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="summary-icon">👥</div>
                    <div className="summary-content">
                      <div className="summary-count">{selectedTemplate.users?.length || 0}</div>
                      <div className="summary-label">Users</div>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon">📝</div>
                    <div className="summary-content">
                      <div className="summary-count">
                        {(selectedTemplate.workitems?.requirements?.length || 0) +
                          (selectedTemplate.workitems?.tasks?.length || 0) +
                          (selectedTemplate.workitems?.tests?.length || 0) +
                          (selectedTemplate.workitems?.risks?.length || 0) +
                          (selectedTemplate.workitems?.documents?.length || 0)}
                      </div>
                      <div className="summary-label">Work Items</div>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon">🔗</div>
                    <div className="summary-content">
                      <div className="summary-count">{selectedTemplate.relationships?.length || 0}</div>
                      <div className="summary-label">Relationships</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Validation Results */}
              {showValidation && validationResult && (
                <section className="validation-results">
                  <h3>Validation Results</h3>
                  {validationResult.valid ? (
                    <div className="success-message">
                      <span className="success-icon">✓</span>
                      <span>Template is valid and ready to apply</span>
                    </div>
                  ) : (
                    <div className="validation-errors">
                      <div className="error-summary">
                        <span className="error-icon">⚠️</span>
                        <span>Found {validationResult.errors?.length || 0} validation error(s)</span>
                      </div>
                      <div className="error-list">
                        {(validationResult.errors || []).map((error, index) => (
                          <div key={index} className="error-item">
                            <div className="error-path">{error.path}</div>
                            <div className="error-message">{error.message}</div>
                            {error.value !== undefined && (
                              <div className="error-value">Value: {JSON.stringify(error.value)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Application Results */}
              {showApplication && applicationResult && (
                <section className="application-results">
                  <h3>Application Results {applicationResult.dry_run && '(Dry Run)'}</h3>
                  <div className="result-summary">
                    <div className={`result-badge ${applicationResult.success ? 'success' : 'error'}`}>
                      {applicationResult.success ? '✓ Success' : '✗ Failed'}
                    </div>
                    <div className="result-stats">
                      <span className="stat-item created">
                        <strong>{applicationResult.created_count}</strong> created
                      </span>
                      <span className="stat-item skipped">
                        <strong>{applicationResult.skipped_count}</strong> skipped
                      </span>
                      <span className="stat-item failed">
                        <strong>{applicationResult.failed_count}</strong> failed
                      </span>
                    </div>
                  </div>
                  <div className="entity-results">
                    {(applicationResult.entities || []).map((entity, index) => (
                      <div key={index} className={`entity-item status-${entity.status}`}>
                        <div className="entity-header">
                          <span className="entity-type">{entity.type}</span>
                          <span className="entity-id">{entity.id}</span>
                          <span className={`entity-status ${entity.status}`}>{entity.status}</span>
                        </div>
                        <div className="entity-message">{entity.message}</div>
                        {entity.error && (
                          <div className="entity-error">{entity.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Dialog */}
      {confirmApply && (
        <div className="modal-overlay" onClick={() => setConfirmApply(false)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirm Template Application</h2>
              <button onClick={() => setConfirmApply(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to apply the template <strong>{selectedTemplateName}</strong>?
              </p>
              <p>
                This will create users, work items, and relationships in the database.
                The operation is idempotent - applying the same template multiple times
                will produce the same result.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setConfirmApply(false)} className="button-secondary">
                Cancel
              </button>
              <button onClick={handleApply} className="button-primary" disabled={isLoading}>
                {isLoading ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;

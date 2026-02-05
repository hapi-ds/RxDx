/**
 * Document Generator Component
 * Provides forms for generating different types of documents
 */

import React, { useState } from 'react';
import {
  documentService,
  type DesignReviewRequest,
  type TraceabilityMatrixRequest,
  type FMEARequest,
  type InvoiceRequest,
} from '../../services/documentService';
import './DocumentGenerator.css';

export type GeneratorType = 'design_review' | 'traceability_matrix' | 'fmea' | 'invoice';

interface DocumentGeneratorProps {
  type: GeneratorType;
  onClose: () => void;
  onGenerated: () => void;
}

export function DocumentGenerator({
  type,
  onClose,
  onGenerated,
}: DocumentGeneratorProps): React.ReactElement {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields
  const [projectId, setProjectId] = useState('');

  // Design Review fields
  const [drTitle, setDrTitle] = useState('');
  const [drIncludeSignatures, setDrIncludeSignatures] = useState(true);
  const [drIncludeVersionHistory, setDrIncludeVersionHistory] = useState(false);

  // Traceability Matrix fields
  const [tmIncludeTests, setTmIncludeTests] = useState(true);
  const [tmIncludeRisks, setTmIncludeRisks] = useState(true);
  const [tmIncludeSignatures, setTmIncludeSignatures] = useState(true);

  // FMEA fields
  const [fmeaMinRpn, setFmeaMinRpn] = useState('');
  const [fmeaIncludeChains, setFmeaIncludeChains] = useState(true);
  const [fmeaIncludeMitigations, setFmeaIncludeMitigations] = useState(true);

  // Invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [notes, setNotes] = useState('');

  const handleGenerate = async () => {
    if (!projectId.trim()) {
      setError('Project ID is required');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      switch (type) {
        case 'design_review': {
          const request: DesignReviewRequest = {
            project_id: projectId,
            title: drTitle || undefined,
            include_signatures: drIncludeSignatures,
            include_version_history: drIncludeVersionHistory,
          };
          await documentService.generateDesignReview(request);
          break;
        }
        case 'traceability_matrix': {
          const request: TraceabilityMatrixRequest = {
            project_id: projectId,
            include_tests: tmIncludeTests,
            include_risks: tmIncludeRisks,
            include_signatures: tmIncludeSignatures,
          };
          await documentService.generateTraceabilityMatrix(request);
          break;
        }
        case 'fmea': {
          const request: FMEARequest = {
            project_id: projectId,
            min_rpn: fmeaMinRpn ? parseInt(fmeaMinRpn) : undefined,
            include_failure_chains: fmeaIncludeChains,
            include_mitigations: fmeaIncludeMitigations,
          };
          await documentService.generateFMEA(request);
          break;
        }
        case 'invoice': {
          if (!clientName.trim()) {
            setError('Client name is required for invoices');
            return;
          }
          const request: InvoiceRequest = {
            project_id: projectId,
            invoice_number: invoiceNumber,
            billing_period: {
              start_date: startDate,
              end_date: endDate,
            },
            client_name: clientName,
            client_address: clientAddress || undefined,
            hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
            tax_rate: taxRate ? parseFloat(taxRate) : undefined,
            notes: notes || undefined,
          };
          await documentService.generateInvoice(request);
          break;
        }
      }
      onGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate document');
      console.error('Failed to generate document:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTitle = (): string => {
    const titles: Record<GeneratorType, string> = {
      design_review: 'Generate Design Review',
      traceability_matrix: 'Generate Traceability Matrix',
      fmea: 'Generate FMEA Report',
      invoice: 'Generate Invoice',
    };
    return titles[type];
  };

  const renderFormFields = () => {
    switch (type) {
      case 'design_review':
        return (
          <>
            <div className="form-group">
              <label htmlFor="drTitle">Document Title</label>
              <input
                id="drTitle"
                type="text"
                value={drTitle}
                onChange={(e) => setDrTitle(e.target.value)}
                placeholder="Design Phase Review"
                disabled={isGenerating}
              />
              <small>Optional custom title for the document</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={drIncludeSignatures}
                  onChange={(e) => setDrIncludeSignatures(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Digital Signatures</span>
              </label>
              <small>Show all digital signatures for each requirement</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={drIncludeVersionHistory}
                  onChange={(e) => setDrIncludeVersionHistory(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Version History</span>
              </label>
              <small>Show complete version history for each requirement</small>
            </div>
          </>
        );

      case 'traceability_matrix':
        return (
          <>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={tmIncludeTests}
                  onChange={(e) => setTmIncludeTests(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Test Coverage</span>
              </label>
              <small>Show linked test cases for each requirement</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={tmIncludeRisks}
                  onChange={(e) => setTmIncludeRisks(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Risk Linkage</span>
              </label>
              <small>Show linked risks for each requirement</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={tmIncludeSignatures}
                  onChange={(e) => setTmIncludeSignatures(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Signature Status</span>
              </label>
              <small>Show signature status for each item</small>
            </div>
          </>
        );

      case 'fmea':
        return (
          <>
            <div className="form-group">
              <label htmlFor="fmeaMinRpn">Minimum RPN (Optional)</label>
              <input
                id="fmeaMinRpn"
                type="number"
                value={fmeaMinRpn}
                onChange={(e) => setFmeaMinRpn(e.target.value)}
                placeholder="e.g., 50"
                min="0"
                max="1000"
                disabled={isGenerating}
              />
              <small>Only include risks with RPN greater than or equal to this value</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={fmeaIncludeChains}
                  onChange={(e) => setFmeaIncludeChains(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Failure Chains</span>
              </label>
              <small>Show failure propagation paths for each risk</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={fmeaIncludeMitigations}
                  onChange={(e) => setFmeaIncludeMitigations(e.target.checked)}
                  disabled={isGenerating}
                />
                <span>Include Mitigation Actions</span>
              </label>
              <small>Show mitigation actions and their status</small>
            </div>
          </>
        );

      case 'invoice':
        return (
          <>
            <div className="form-group">
              <label htmlFor="invoiceNumber">Invoice Number *</label>
              <input
                id="invoiceNumber"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
                disabled={isGenerating}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientName">Client Name *</label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Company Name"
                disabled={isGenerating}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientAddress">Client Address</label>
              <textarea
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="123 Main St, City, State, ZIP"
                disabled={isGenerating}
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Billing Start Date *</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isGenerating}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">Billing End Date *</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isGenerating}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hourlyRate">Hourly Rate</label>
                <input
                  id="hourlyRate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="150.00"
                  min="0"
                  step="0.01"
                  disabled={isGenerating}
                />
              </div>

              <div className="form-group">
                <label htmlFor="taxRate">Tax Rate (%)</label>
                <input
                  id="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="8.5"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, additional notes..."
                disabled={isGenerating}
                rows={3}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-generator" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="projectId">Project ID *</label>
            <input
              id="projectId"
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Enter project UUID"
              disabled={isGenerating}
              required
            />
            <small>Enter the UUID of the project to generate the document for</small>
          </div>

          {renderFormFields()}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="button-secondary" disabled={isGenerating}>
            Cancel
          </button>
          <button onClick={handleGenerate} className="button-primary" disabled={isGenerating}>
            {isGenerating ? '⏳ Generating...' : '✨ Generate Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentGenerator;

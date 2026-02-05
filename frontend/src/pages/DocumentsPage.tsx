/**
 * Documents page
 * Allows users to generate and manage compliance documents
 */

import React, { useState, useEffect } from 'react';
import {
  documentService,
  type DocumentRecord,
} from '../services/documentService';
import { DocumentGenerator, type GeneratorType, DocumentHistory, DocumentPreview } from '../components/documents';
import './DocumentsPage.css';

export function DocumentsPage(): React.ReactElement {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGenerator, setSelectedGenerator] = useState<GeneratorType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentService.listDocuments({ limit: 50 });
      setDocuments(response.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocuments([]); // Reset to empty array on error
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      await documentService.downloadDocument(doc.id, doc.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
      console.error('Failed to download document:', err);
    }
  };

  return (
    <div className="documents-page">
      <div className="documents-header">
        <h1>📄 Documents</h1>
        <p className="documents-description">
          Generate compliance documents including design reviews, traceability matrices, FMEA reports, and invoices.
        </p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="documents-content">
        {/* Document Generators */}
        <section className="generators-section">
          <h2>Generate New Document</h2>
          <div className="generator-grid">
            <button
              className="generator-card"
              onClick={() => setSelectedGenerator('design_review')}
            >
              <div className="generator-icon">📋</div>
              <h3>Design Review</h3>
              <p>Generate PDF with requirements and signatures</p>
            </button>

            <button
              className="generator-card"
              onClick={() => setSelectedGenerator('traceability_matrix')}
            >
              <div className="generator-icon">🔗</div>
              <h3>Traceability Matrix</h3>
              <p>Show requirement-test-risk relationships</p>
            </button>

            <button
              className="generator-card"
              onClick={() => setSelectedGenerator('fmea')}
            >
              <div className="generator-icon">⚠️</div>
              <h3>FMEA Report</h3>
              <p>Generate Excel with risk analysis</p>
            </button>

            <button
              className="generator-card"
              onClick={() => setSelectedGenerator('invoice')}
            >
              <div className="generator-icon">💰</div>
              <h3>Invoice</h3>
              <p>Generate Word document from time entries</p>
            </button>
          </div>
        </section>

        {/* Document History */}
        <DocumentHistory
          documents={documents}
          isLoading={isLoading}
          onDownload={handleDownload}
          onPreview={setPreviewDocument}
          onRefresh={loadDocuments}
        />
      </div>

      {/* Document Generator Modal */}
      {selectedGenerator && (
        <DocumentGenerator
          type={selectedGenerator}
          onClose={() => setSelectedGenerator(null)}
          onGenerated={() => {
            setSelectedGenerator(null);
            loadDocuments();
          }}
        />
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          onDownload={handleDownload}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
}

export default DocumentsPage;


/**
 * Document Preview Component
 * Displays document metadata and preview information
 */

import React from 'react';
import { type DocumentRecord, DocumentType, DocumentFormat, DocumentStatus } from '../../services/documentService';
import './DocumentPreview.css';

interface DocumentPreviewProps {
  document: DocumentRecord;
  onDownload: (document: DocumentRecord) => void;
  onClose: () => void;
}

export function DocumentPreview({
  document,
  onDownload,
  onClose,
}: DocumentPreviewProps): React.ReactElement {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      [DocumentType.DESIGN_REVIEW]: 'Design Review',
      [DocumentType.TRACEABILITY_MATRIX]: 'Traceability Matrix',
      [DocumentType.FMEA]: 'FMEA',
      [DocumentType.INVOICE]: 'Invoice',
    };
    return labels[type] || type;
  };

  const getFormatLabel = (format: DocumentFormat): string => {
    const labels: Record<DocumentFormat, string> = {
      [DocumentFormat.PDF]: 'PDF Document',
      [DocumentFormat.EXCEL]: 'Excel Spreadsheet',
      [DocumentFormat.WORD]: 'Word Document',
    };
    return labels[format] || format;
  };

  const getFormatIcon = (format: DocumentFormat): string => {
    const icons: Record<DocumentFormat, string> = {
      [DocumentFormat.PDF]: '📄',
      [DocumentFormat.EXCEL]: '📊',
      [DocumentFormat.WORD]: '📝',
    };
    return icons[format] || '📄';
  };

  const renderMetadata = () => {
    const metadata = document.metadata || {};
    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return <p className="no-metadata">No additional metadata available</p>;
    }

    return (
      <dl className="metadata-list">
        {entries.map(([key, value]) => (
          <div key={key} className="metadata-item">
            <dt>{formatMetadataKey(key)}</dt>
            <dd>{formatMetadataValue(value)}</dd>
          </div>
        ))}
      </dl>
    );
  };

  const formatMetadataKey = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatMetadataValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <span className="format-icon">{getFormatIcon(document.format)}</span>
            <div>
              <h2>{document.filename}</h2>
              <p className="document-type">{getDocumentTypeLabel(document.document_type)}</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Status Badge */}
          <div className="status-section">
            <span className={`status-badge status-${document.status}`}>
              {document.status}
            </span>
          </div>

          {/* Document Information */}
          <section className="info-section">
            <h3>Document Information</h3>
            <dl className="info-list">
              <div className="info-item">
                <dt>Document ID</dt>
                <dd className="monospace">{document.id}</dd>
              </div>
              <div className="info-item">
                <dt>Project ID</dt>
                <dd className="monospace">{document.project_id}</dd>
              </div>
              <div className="info-item">
                <dt>Format</dt>
                <dd>{getFormatLabel(document.format)}</dd>
              </div>
              <div className="info-item">
                <dt>File Size</dt>
                <dd>{formatFileSize(document.file_size_bytes)}</dd>
              </div>
              <div className="info-item">
                <dt>Version</dt>
                <dd>{document.version}</dd>
              </div>
              <div className="info-item">
                <dt>Generated</dt>
                <dd>{formatDate(document.generated_at)}</dd>
              </div>
              <div className="info-item">
                <dt>Content Hash</dt>
                <dd className="monospace hash">{document.content_hash}</dd>
              </div>
            </dl>
          </section>

          {/* Metadata Section */}
          <section className="metadata-section">
            <h3>Document Metadata</h3>
            {renderMetadata()}
          </section>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="button-secondary">
            Close
          </button>
          <button
            onClick={() => onDownload(document)}
            className="button-primary"
            disabled={document.status !== DocumentStatus.COMPLETED}
          >
            ⬇️ Download Document
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentPreview;

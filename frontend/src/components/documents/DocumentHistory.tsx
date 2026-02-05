/**
 * Document History Component
 * Displays a list of generated documents with filtering and sorting
 */

import React, { useState } from 'react';
import { type DocumentRecord, DocumentType, DocumentStatus } from '../../services/documentService';
import './DocumentHistory.css';

interface DocumentHistoryProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  onDownload: (document: DocumentRecord) => void;
  onPreview?: (document: DocumentRecord) => void;
  onRefresh: () => void;
}

export function DocumentHistory({
  documents,
  isLoading,
  onDownload,
  onPreview,
  onRefresh,
}: DocumentHistoryProps): React.ReactElement {
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const filterDocuments = (docs: DocumentRecord[]): DocumentRecord[] => {
    // Safety check: ensure docs is an array
    if (!Array.isArray(docs)) {
      return [];
    }
    
    let filtered = docs;

    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === filterStatus);
    }

    return filtered;
  };

  const sortDocuments = (docs: DocumentRecord[]): DocumentRecord[] => {
    // Safety check: ensure docs is an array
    if (!Array.isArray(docs)) {
      return [];
    }
    
    const sorted = [...docs];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime();
          break;
        case 'type':
          comparison = a.document_type.localeCompare(b.document_type);
          break;
        case 'size':
          comparison = a.file_size_bytes - b.file_size_bytes;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const filteredAndSortedDocuments = sortDocuments(filterDocuments(documents));

  const handleSort = (newSortBy: 'date' | 'type' | 'size') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'type' | 'size'): string => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="document-history">
      <div className="history-header">
        <h2>Document History</h2>
        <button onClick={onRefresh} className="refresh-button" disabled={isLoading}>
          {isLoading ? '⟳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label htmlFor="filterType">Type:</label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentType | 'all')}
          >
            <option value="all">All Types</option>
            <option value={DocumentType.DESIGN_REVIEW}>Design Review</option>
            <option value={DocumentType.TRACEABILITY_MATRIX}>Traceability Matrix</option>
            <option value={DocumentType.FMEA}>FMEA</option>
            <option value={DocumentType.INVOICE}>Invoice</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filterStatus">Status:</label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as DocumentStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            <option value={DocumentStatus.COMPLETED}>Completed</option>
            <option value={DocumentStatus.PROCESSING}>Processing</option>
            <option value={DocumentStatus.FAILED}>Failed</option>
            <option value={DocumentStatus.PENDING}>Pending</option>
          </select>
        </div>

        <div className="results-count">
          {filteredAndSortedDocuments.length} of {documents.length} documents
        </div>
      </div>

      {/* Document List */}
      {isLoading && documents.length === 0 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      ) : filteredAndSortedDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Documents Found</h3>
          <p>
            {documents.length === 0
              ? 'Generate your first document using one of the generators above.'
              : 'No documents match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="documents-table-container">
          <table className="documents-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('type')} className="sortable">
                  Type {getSortIcon('type')}
                </th>
                <th>Filename</th>
                <th onClick={() => handleSort('size')} className="sortable">
                  Size {getSortIcon('size')}
                </th>
                <th onClick={() => handleSort('date')} className="sortable">
                  Generated {getSortIcon('date')}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="document-type-badge">
                      {getDocumentTypeLabel(doc.document_type)}
                    </span>
                  </td>
                  <td className="filename-cell">{doc.filename}</td>
                  <td>{formatFileSize(doc.file_size_bytes)}</td>
                  <td>{formatDate(doc.generated_at)}</td>
                  <td>
                    <span className={`status-badge status-${doc.status}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {onPreview && (
                        <button
                          onClick={() => onPreview(doc)}
                          className="action-button preview-button"
                          title="Preview document"
                        >
                          👁️
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(doc)}
                        className="action-button download-button"
                        title="Download document"
                        disabled={doc.status !== DocumentStatus.COMPLETED}
                      >
                        ⬇️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DocumentHistory;

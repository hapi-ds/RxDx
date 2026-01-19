/**
 * SignatureList component
 * Displays a list of digital signatures for a work item
 */

import React from 'react';
import { Spinner } from '../common';
import type { DigitalSignature } from '../../types';

export interface SignatureListProps {
  signatures: DigitalSignature[];
  isLoading?: boolean;
  onVerify?: (signature: DigitalSignature) => void;
}

export function SignatureList({
  signatures,
  isLoading = false,
  onVerify,
}: SignatureListProps): React.ReactElement {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusIcon = (isValid: boolean): React.ReactNode => {
    if (isValid) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="status-icon valid">
          <path
            d="M13.333 4L6 11.333 2.667 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="status-icon invalid">
        <path
          d="M12 4L4 12M4 4l8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="signature-list-loading">
        <Spinner size="md" />
        <span>Loading signatures...</span>
      </div>
    );
  }

  if (signatures.length === 0) {
    return (
      <div className="signature-list-empty">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M40 18v20a4 4 0 01-4 4H12a4 4 0 01-4-4V14a4 4 0 014-4h20"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 30l6 6 16-20"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>No signatures yet</span>
        <p className="empty-hint">
          Sign this work item to create a digital signature
        </p>
      </div>
    );
  }

  return (
    <div className="signature-list">
      <h3 className="list-title">
        Digital Signatures
        <span className="signature-count">{signatures.length}</span>
      </h3>

      <div className="signatures">
        {signatures.map((signature) => (
          <div
            key={signature.id}
            className={`signature-item ${signature.isValid ? 'valid' : 'invalid'}`}
          >
            <div className="signature-status">
              {getStatusIcon(signature.isValid)}
              <span className="status-text">
                {signature.isValid ? 'Valid' : 'Invalid'}
              </span>
            </div>

            <div className="signature-details">
              <div className="signature-header">
                <span className="signer-id">{signature.userId}</span>
                <span className="signature-version">v{signature.workitemVersion}</span>
              </div>

              <div className="signature-meta">
                <span className="signed-at">
                  Signed: {formatDate(signature.signedAt)}
                </span>
                {!signature.isValid && signature.invalidatedAt && (
                  <span className="invalidated-at">
                    Invalidated: {formatDate(signature.invalidatedAt)}
                  </span>
                )}
              </div>

              {!signature.isValid && signature.invalidationReason && (
                <div className="invalidation-reason">
                  Reason: {signature.invalidationReason}
                </div>
              )}

              <div className="signature-hashes">
                <div className="hash-row">
                  <span className="hash-label">Content Hash:</span>
                  <code className="hash-value">{signature.contentHash.slice(0, 16)}...</code>
                </div>
                <div className="hash-row">
                  <span className="hash-label">Signature:</span>
                  <code className="hash-value">{signature.signatureHash.slice(0, 16)}...</code>
                </div>
              </div>
            </div>

            {onVerify && signature.isValid && (
              <button
                className="verify-button"
                onClick={() => onVerify(signature)}
                title="Verify signature"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 8l1.5 1.5L10 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Verify
              </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .signature-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .signature-list-loading,
        .signature-list-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 0.75rem;
          color: #6b7280;
          text-align: center;
        }

        .empty-hint {
          margin: 0;
          font-size: 0.8125rem;
          color: #9ca3af;
        }

        .list-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .signature-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 10px;
        }

        .signatures {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .signature-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .signature-item.valid {
          border-left: 3px solid #10b981;
        }

        .signature-item.invalid {
          border-left: 3px solid #ef4444;
          background: #fef2f2;
        }

        .signature-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          min-width: 60px;
        }

        .status-icon {
          width: 24px;
          height: 24px;
        }

        .status-icon.valid {
          color: #10b981;
        }

        .status-icon.invalid {
          color: #ef4444;
        }

        .status-text {
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .signature-item.valid .status-text {
          color: #047857;
        }

        .signature-item.invalid .status-text {
          color: #b91c1c;
        }

        .signature-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .signature-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .signer-id {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .signature-version {
          font-size: 0.6875rem;
          font-weight: 500;
          padding: 0.125rem 0.375rem;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 4px;
        }

        .signature-meta {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .invalidation-reason {
          font-size: 0.75rem;
          color: #b91c1c;
          font-style: italic;
        }

        .signature-hashes {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .hash-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.6875rem;
        }

        .hash-label {
          color: #6b7280;
        }

        .hash-value {
          font-family: monospace;
          color: #374151;
          background: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 3px;
        }

        .verify-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .verify-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }
      `}</style>
    </div>
  );
}

export default SignatureList;

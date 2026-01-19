/**
 * SignatureButton component
 * Button for signing work items with confirmation dialog
 */

import React, { useState, useCallback } from 'react';
import { Button, Modal } from '../common';

export interface SignatureButtonProps {
  workItemId: string;
  workItemTitle: string;
  workItemVersion: string;
  isSigned: boolean;
  onSign: (workItemId: string) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SignatureButton({
  workItemId,
  workItemTitle,
  workItemVersion,
  isSigned,
  onSign,
  disabled = false,
  size = 'md',
}: SignatureButtonProps): React.ReactElement {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (!isSigned && !disabled) {
      setShowConfirm(true);
      setError(null);
    }
  }, [isSigned, disabled]);

  const handleConfirm = useCallback(async () => {
    setIsSigning(true);
    setError(null);

    try {
      await onSign(workItemId);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign work item');
    } finally {
      setIsSigning(false);
    }
  }, [workItemId, onSign]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    setError(null);
  }, []);

  if (isSigned) {
    return (
      <div className="signature-status signed">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.333 4L6 11.333 2.667 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Signed</span>

        <style>{`
          .signature-status {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.375rem 0.75rem;
            font-size: 0.8125rem;
            font-weight: 500;
            border-radius: 4px;
          }

          .signature-status.signed {
            background: #d1fae5;
            color: #047857;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        size={size}
        onClick={handleClick}
        disabled={disabled}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.333 6v6.667A1.333 1.333 0 0112 14H4a1.333 1.333 0 01-1.333-1.333V4.667A1.333 1.333 0 014 3.333h6.667"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 10l2 2 5.333-6.667"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Sign
      </Button>

      <Modal
        isOpen={showConfirm}
        onClose={handleCancel}
        title="Sign Work Item"
        size="sm"
      >
        <div className="signature-confirm">
          <p className="confirm-message">
            You are about to digitally sign this work item. This action:
          </p>
          <ul className="confirm-list">
            <li>Creates a cryptographic signature with your identity</li>
            <li>Records the current timestamp</li>
            <li>Locks this version from further modifications</li>
            <li>Cannot be undone</li>
          </ul>

          <div className="confirm-details">
            <div className="detail-row">
              <span className="detail-label">Work Item:</span>
              <span className="detail-value">{workItemTitle}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Version:</span>
              <span className="detail-value">v{workItemVersion}</span>
            </div>
          </div>

          {error && <div className="confirm-error">{error}</div>}

          <div className="confirm-actions">
            <Button variant="secondary" onClick={handleCancel} disabled={isSigning}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={isSigning}
              disabled={isSigning}
            >
              Confirm Signature
            </Button>
          </div>
        </div>

        <style>{`
          .signature-confirm {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .confirm-message {
            margin: 0;
            font-size: 0.875rem;
            color: #374151;
          }

          .confirm-list {
            margin: 0;
            padding-left: 1.25rem;
            font-size: 0.8125rem;
            color: #6b7280;
          }

          .confirm-list li {
            margin-bottom: 0.25rem;
          }

          .confirm-details {
            padding: 0.75rem;
            background: #f9fafb;
            border-radius: 6px;
          }

          .detail-row {
            display: flex;
            gap: 0.5rem;
            font-size: 0.8125rem;
          }

          .detail-row + .detail-row {
            margin-top: 0.25rem;
          }

          .detail-label {
            color: #6b7280;
          }

          .detail-value {
            color: #111827;
            font-weight: 500;
          }

          .confirm-error {
            padding: 0.75rem;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            font-size: 0.8125rem;
            color: #b91c1c;
          }

          .confirm-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding-top: 0.5rem;
          }
        `}</style>
      </Modal>
    </>
  );
}

export default SignatureButton;

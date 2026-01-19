/**
 * SignatureVerification component
 * Displays signature verification results
 */

import React, { useState, useCallback } from 'react';
import { Button, Spinner } from '../common';
import type { DigitalSignature } from '../../types';

export interface VerificationResult {
  isValid: boolean;
  signatureId: string;
  verifiedAt: string;
  contentHashMatch: boolean;
  signatureIntegrity: boolean;
  signerVerified: boolean;
  details?: string;
}

export interface SignatureVerificationProps {
  signature: DigitalSignature;
  onVerify: (signatureId: string) => Promise<VerificationResult>;
  onClose?: () => void;
}

export function SignatureVerification({
  signature,
  onVerify,
  onClose,
}: SignatureVerificationProps): React.ReactElement {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const verificationResult = await onVerify(signature.id);
      setResult(verificationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [signature.id, onVerify]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getCheckIcon = (passed: boolean): React.ReactNode => {
    if (passed) {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="check-icon passed">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M6 10l2.5 2.5L14 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="check-icon failed">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M13 7l-6 6M7 7l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="signature-verification">
      <div className="verification-header">
        <h3 className="verification-title">Signature Verification</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="signature-info">
        <div className="info-row">
          <span className="info-label">Signature ID:</span>
          <code className="info-value">{signature.id}</code>
        </div>
        <div className="info-row">
          <span className="info-label">Work Item Version:</span>
          <span className="info-value">v{signature.workitemVersion}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Signed At:</span>
          <span className="info-value">{formatDate(signature.signedAt)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Signer:</span>
          <span className="info-value">{signature.userId}</span>
        </div>
      </div>

      {!result && !error && (
        <div className="verification-action">
          <p className="action-description">
            Click the button below to verify the cryptographic integrity of this signature.
          </p>
          <Button
            variant="primary"
            onClick={handleVerify}
            isLoading={isVerifying}
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Signature'}
          </Button>
        </div>
      )}

      {isVerifying && (
        <div className="verification-progress">
          <Spinner size="lg" />
          <span>Verifying signature integrity...</span>
        </div>
      )}

      {error && (
        <div className="verification-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 8v4M12 16h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="error-content">
            <span className="error-title">Verification Failed</span>
            <span className="error-message">{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleVerify}>
            Retry
          </Button>
        </div>
      )}

      {result && (
        <div className={`verification-result ${result.isValid ? 'valid' : 'invalid'}`}>
          <div className="result-header">
            {result.isValid ? (
              <>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="result-icon valid">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M10 16l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="result-title">Signature Valid</span>
              </>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="result-icon invalid">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M20 12l-8 8M12 12l8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="result-title">Signature Invalid</span>
              </>
            )}
          </div>

          <div className="verification-checks">
            <div className={`check-item ${result.contentHashMatch ? 'passed' : 'failed'}`}>
              {getCheckIcon(result.contentHashMatch)}
              <span className="check-label">Content Hash Match</span>
            </div>
            <div className={`check-item ${result.signatureIntegrity ? 'passed' : 'failed'}`}>
              {getCheckIcon(result.signatureIntegrity)}
              <span className="check-label">Signature Integrity</span>
            </div>
            <div className={`check-item ${result.signerVerified ? 'passed' : 'failed'}`}>
              {getCheckIcon(result.signerVerified)}
              <span className="check-label">Signer Verified</span>
            </div>
          </div>

          {result.details && (
            <div className="result-details">
              <span className="details-label">Details:</span>
              <span className="details-text">{result.details}</span>
            </div>
          )}

          <div className="result-meta">
            <span>Verified at: {formatDate(result.verifiedAt)}</span>
          </div>
        </div>
      )}

      <style>{`
        .signature-verification {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .verification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .verification-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .close-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .signature-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .info-row {
          display: flex;
          gap: 0.5rem;
          font-size: 0.8125rem;
        }

        .info-label {
          color: #6b7280;
          min-width: 120px;
        }

        .info-value {
          color: #111827;
          font-weight: 500;
        }

        code.info-value {
          font-family: monospace;
          font-size: 0.75rem;
          background: #e5e7eb;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
        }

        .verification-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          text-align: center;
        }

        .action-description {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .verification-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          color: #6b7280;
        }

        .verification-error {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #b91c1c;
        }

        .error-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .error-title {
          font-weight: 600;
        }

        .error-message {
          font-size: 0.8125rem;
          opacity: 0.9;
        }

        .verification-result {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 8px;
        }

        .verification-result.valid {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .verification-result.invalid {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .result-icon.valid {
          color: #059669;
        }

        .result-icon.invalid {
          color: #dc2626;
        }

        .result-title {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .verification-result.valid .result-title {
          color: #047857;
        }

        .verification-result.invalid .result-title {
          color: #b91c1c;
        }

        .verification-checks {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .check-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .check-icon.passed {
          color: #059669;
        }

        .check-icon.failed {
          color: #dc2626;
        }

        .check-label {
          font-size: 0.875rem;
          color: #374151;
        }

        .result-details {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
          font-size: 0.8125rem;
        }

        .details-label {
          font-weight: 500;
          color: #374151;
        }

        .details-text {
          color: #6b7280;
        }

        .result-meta {
          font-size: 0.75rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

export default SignatureVerification;

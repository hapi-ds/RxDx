/**
 * VersionPreview component
 * Shows next version and informational message about version creation
 */

import React from 'react';
import { calculateNextVersion } from '../../utils/version';

export interface VersionPreviewProps {
  currentVersion?: string;
  isNewItem?: boolean;
  className?: string;
}

export function VersionPreview({
  currentVersion,
  isNewItem = false,
  className = '',
}: VersionPreviewProps): React.ReactElement {
  const nextVersion = isNewItem ? '1.0' : calculateNextVersion(currentVersion || '1.0');
  const message = isNewItem
    ? `This will create version ${nextVersion}`
    : `Saving will create a new version (${nextVersion})`;

  return (
    <>
      <div className={`version-preview ${className}`}>
        <svg
          className="version-preview-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="version-preview-text">{message}</span>
      </div>

      <style>{`
        .version-preview {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 0.375rem;
          color: #1e40af;
          font-size: 0.875rem;
          line-height: 1.25rem;
        }

        .version-preview-icon {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }

        .version-preview-text {
          flex: 1;
        }
      `}</style>
    </>
  );
}

export default VersionPreview;

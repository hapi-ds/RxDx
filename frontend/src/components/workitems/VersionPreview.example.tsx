/**
 * Example usage of VersionPreview component
 */

import React from 'react';
import { VersionPreview } from './VersionPreview';

export function VersionPreviewExamples(): React.ReactElement {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
          New Item Mode
        </h3>
        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Shows version 1.0 will be created for new items
        </p>
        <VersionPreview isNewItem={true} />
      </div>

      <div>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
          Edit Mode - Version 1.2
        </h3>
        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Shows next version (1.3) will be created when saving
        </p>
        <VersionPreview currentVersion="1.2" isNewItem={false} />
      </div>

      <div>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
          Edit Mode - Version 2.5
        </h3>
        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Shows next version (2.6) will be created when saving
        </p>
        <VersionPreview currentVersion="2.5" isNewItem={false} />
      </div>

      <div>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
          With Custom Class
        </h3>
        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Custom styling can be applied via className prop
        </p>
        <VersionPreview
          currentVersion="3.9"
          isNewItem={false}
          className="custom-preview"
        />
      </div>
    </div>
  );
}

export default VersionPreviewExamples;

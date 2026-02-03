/**
 * VersionIndicator usage examples
 * This file demonstrates how to use the VersionIndicator component
 */

import React from 'react';
import { VersionIndicator } from './VersionIndicator';

export function VersionIndicatorExamples(): React.ReactElement {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <h3>Sizes</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <VersionIndicator version="1.0" size="sm" />
          <VersionIndicator version="1.0" size="md" />
          <VersionIndicator version="1.0" size="lg" />
        </div>
      </section>

      <section>
        <h3>Variants</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <VersionIndicator version="1.0" variant="default" />
          <VersionIndicator version="1.0" variant="primary" />
          <VersionIndicator version="1.0" variant="success" />
        </div>
      </section>

      <section>
        <h3>Real-world Examples</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>Current version:</span>
            <VersionIndicator version="2.5" variant="primary" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>Latest version:</span>
            <VersionIndicator version="3.0" variant="success" size="lg" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>Historical version:</span>
            <VersionIndicator version="1.2" size="sm" />
          </div>
        </div>
      </section>

      <section>
        <h3>In Context (WorkItem Header)</h3>
        <div
          style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>User Authentication System</h2>
          <VersionIndicator version="2.3" variant="primary" />
          <span
            style={{
              padding: '0.25rem 0.75rem',
              background: '#059669',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.75rem',
            }}
          >
            active
          </span>
        </div>
      </section>
    </div>
  );
}

export default VersionIndicatorExamples;

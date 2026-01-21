/**
 * Risks placeholder page
 * Displays "Coming Soon" message for the Risks feature
 */

import React from 'react';
import { PlaceholderPage } from '../components/common';

export function RisksPage(): React.ReactElement {
  return (
    <PlaceholderPage
      title="Risks"
      description="Identify, assess, and mitigate project risks. Track risk status, probability, and impact with full audit trail support."
      icon="⚠️"
    />
  );
}

export default RisksPage;

/**
 * Documents placeholder page
 * Displays "Coming Soon" message for the Documents feature
 */

import React from 'react';
import { PlaceholderPage } from '../components/common';

export function DocumentsPage(): React.ReactElement {
  return (
    <PlaceholderPage
      title="Documents"
      description="Manage project documentation with version control and digital signatures. Generate reports and export documents in multiple formats."
      icon="📄"
    />
  );
}

export default DocumentsPage;

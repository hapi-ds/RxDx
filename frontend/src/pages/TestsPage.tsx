/**
 * Tests placeholder page
 * Displays "Coming Soon" message for the Tests feature
 */

import React from 'react';
import { PlaceholderPage } from '../components/common';

export function TestsPage(): React.ReactElement {
  return (
    <PlaceholderPage
      title="Tests"
      description="Track and manage test cases, test runs, and test coverage for your project requirements. Link tests to requirements for complete traceability."
      icon="🧪"
    />
  );
}

export default TestsPage;

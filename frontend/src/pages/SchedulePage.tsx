/**
 * Schedule placeholder page
 * Displays "Coming Soon" message for the Schedule feature
 */

import React from 'react';
import { PlaceholderPage } from '../components/common';

export function SchedulePage(): React.ReactElement {
  return (
    <PlaceholderPage
      title="Schedule"
      description="Plan and track project timelines, milestones, and deadlines. Visualize dependencies and critical paths for your project."
      icon="📅"
    />
  );
}

export default SchedulePage;

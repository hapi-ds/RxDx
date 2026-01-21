/**
 * Kanban placeholder page
 * Displays "Coming Soon" message for the Kanban feature
 */

import React from 'react';
import { PlaceholderPage } from '../components/common';

export function KanbanPage(): React.ReactElement {
  return (
    <PlaceholderPage
      title="Kanban"
      description="Visualize work in progress with a Kanban board. Drag and drop work items between columns to update status and track workflow."
      icon="📊"
    />
  );
}

export default KanbanPage;

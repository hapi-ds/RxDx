/**
 * LayoutSelector Component
 * Dropdown selector for graph layout algorithms with icons
 * Integrates with graphStore for state management and persists selection to local storage
 * 
 * References: Requirement 2 (Multiple Layout Algorithm Options)
 */

import React from 'react';
import { Select, type SelectOption } from '../common/Form';
import { useGraphStore, type LayoutAlgorithm } from '../../stores/graphStore';

/**
 * Layout algorithm options with labels and descriptions
 */
const LAYOUT_OPTIONS: Array<SelectOption & { description: string; icon: string }> = [
  {
    value: 'force',
    label: 'Force-Directed',
    description: 'Physics-based layout with automatic spacing',
    icon: '⚛️',
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
    description: 'Tree-like layout with levels',
    icon: '🌳',
  },
  {
    value: 'circular',
    label: 'Circular',
    description: 'Nodes arranged in concentric circles',
    icon: '⭕',
  },
  {
    value: 'grid',
    label: 'Grid',
    description: 'Regular grid pattern',
    icon: '⊞',
  },
];

export interface LayoutSelectorProps {
  /** Optional CSS class name */
  className?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Whether to show descriptions as hints */
  showHint?: boolean;
}

/**
 * LayoutSelector - Dropdown component for selecting graph layout algorithm
 * Displays layout options with icons and integrates with graphStore
 */
export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  className = '',
  showLabel = true,
  label = 'Layout Algorithm',
  showHint = true,
}) => {
  const { layoutAlgorithm, setLayoutAlgorithm } = useGraphStore();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as LayoutAlgorithm;
    setLayoutAlgorithm(value);
  };

  // Get current layout description for hint
  const currentLayout = LAYOUT_OPTIONS.find((opt) => opt.value === layoutAlgorithm);
  const hint = showHint && currentLayout ? currentLayout.description : undefined;

  // Format options with icons
  const selectOptions: SelectOption[] = LAYOUT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: `${opt.icon} ${opt.label}`,
  }));

  return (
    <div className={`layout-selector ${className}`}>
      <Select
        label={showLabel ? label : undefined}
        value={layoutAlgorithm}
        onChange={handleChange}
        options={selectOptions}
        hint={hint}
        aria-label="Select graph layout algorithm"
      />

      <style>{`
        .layout-selector {
          min-width: 200px;
        }
      `}</style>
    </div>
  );
};

export default LayoutSelector;

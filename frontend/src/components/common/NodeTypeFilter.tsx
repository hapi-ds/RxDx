/**
 * NodeTypeFilter Component
 * 
 * A reusable filter component for selecting node types to display.
 * Supports multi-select, category grouping, and both compact and expanded layouts.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { NodeTypeOption, FilterLayout, NodeTypeCategory } from '../../types/filters';
import { CATEGORY_LABELS } from '../../types/filters';

export interface NodeTypeFilterProps {
  /** Current filter state - set of selected node type values */
  selectedTypes: Set<string>;
  /** Callback when filter changes */
  onChange: (selectedTypes: Set<string>) => void;
  /** Available node types to filter */
  availableTypes: NodeTypeOption[];
  /** Whether to show work item sub-types (default: true) */
  showWorkItemTypes?: boolean;
  /** Whether to organize by category (default: true) */
  showCategories?: boolean;
  /** Compact or expanded layout (default: 'expanded') */
  layout?: FilterLayout;
  /** Additional CSS class name */
  className?: string;
}

export function NodeTypeFilter({
  selectedTypes,
  onChange,
  availableTypes,
  showWorkItemTypes = true,
  showCategories = true,
  layout = 'expanded',
  className = '',
}: NodeTypeFilterProps): React.ReactElement {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<NodeTypeCategory>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter available types based on showWorkItemTypes
  const filteredTypes = useMemo(() => {
    if (showWorkItemTypes) {
      return availableTypes;
    }
    return availableTypes.filter(type => type.category !== 'workitems');
  }, [availableTypes, showWorkItemTypes]);

  // Group types by category
  const typesByCategory = useMemo(() => {
    if (!showCategories) {
      return { all: filteredTypes };
    }

    const grouped: Record<string, NodeTypeOption[]> = {};
    filteredTypes.forEach(type => {
      const category = type.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(type);
    });
    return grouped;
  }, [filteredTypes, showCategories]);

  // Check if all types are selected
  const allSelected = useMemo(() => {
    return filteredTypes.every(type => selectedTypes.has(type.value));
  }, [filteredTypes, selectedTypes]);

  // Check if no types are selected
  const noneSelected = useMemo(() => {
    return selectedTypes.size === 0;
  }, [selectedTypes]);

  // Handle individual type toggle
  const handleToggle = useCallback((value: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    onChange(newSelected);
  }, [selectedTypes, onChange]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allValues = new Set(filteredTypes.map(type => type.value));
    onChange(allValues);
  }, [filteredTypes, onChange]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    onChange(new Set());
  }, [onChange]);

  // Handle category toggle
  const handleCategoryToggle = useCallback((category: NodeTypeCategory) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  }, [collapsedCategories]);

  // Render checkbox for a single type
  const renderTypeCheckbox = (type: NodeTypeOption) => (
    <label
      key={type.value}
      className="filter-type-item"
      title={type.label}
    >
      <input
        type="checkbox"
        checked={selectedTypes.has(type.value)}
        onChange={() => handleToggle(type.value)}
        aria-label={`Filter by ${type.label}`}
      />
      <span
        className="filter-type-color"
        style={{ backgroundColor: type.color || 'transparent' }}
        aria-hidden="true"
      />
      <span className="filter-type-label">{type.label}</span>
    </label>
  );

  // Render expanded layout
  const renderExpandedLayout = () => (
    <div className={`node-type-filter expanded ${className}`}>
      <div className="filter-header">
        <h3 className="filter-title">Filter by Type</h3>
        <div className="filter-actions">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={allSelected}
            className="filter-action-btn"
            aria-label="Select all node types"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={noneSelected}
            className="filter-action-btn"
            aria-label="Clear all node type selections"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="filter-content">
        {showCategories ? (
          Object.entries(typesByCategory).map(([category, types]) => (
            <div key={category} className="filter-category">
              <button
                type="button"
                className="filter-category-header"
                onClick={() => handleCategoryToggle(category as NodeTypeCategory)}
                aria-expanded={!collapsedCategories.has(category as NodeTypeCategory)}
                aria-label={`Toggle ${CATEGORY_LABELS[category as NodeTypeCategory] || category} category`}
              >
                <span className="filter-category-icon">
                  {collapsedCategories.has(category as NodeTypeCategory) ? '▶' : '▼'}
                </span>
                <span className="filter-category-label">
                  {CATEGORY_LABELS[category as NodeTypeCategory] || category}
                </span>
                <span className="filter-category-count">({types.length})</span>
              </button>
              {!collapsedCategories.has(category as NodeTypeCategory) && (
                <div className="filter-category-items">
                  {types.map(renderTypeCheckbox)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="filter-types">
            {filteredTypes.map(renderTypeCheckbox)}
          </div>
        )}
      </div>

      <style>{`
        .node-type-filter {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .filter-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .filter-actions {
          display: flex;
          gap: 0.5rem;
        }

        .filter-action-btn {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #667eea;
          background: transparent;
          border: 1px solid #667eea;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-action-btn:hover:not(:disabled) {
          background: #667eea;
          color: white;
        }

        .filter-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .filter-action-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        }

        .filter-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filter-category {
          display: flex;
          flex-direction: column;
        }

        .filter-category-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #374151;
          text-align: left;
          transition: background 0.2s ease;
          border-radius: 4px;
        }

        .filter-category-header:hover {
          background: #f9fafb;
        }

        .filter-category-header:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
        }

        .filter-category-icon {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .filter-category-label {
          flex: 1;
        }

        .filter-category-count {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .filter-category-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
        }

        .filter-types {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-type-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .filter-type-item:hover {
          background: #f9fafb;
        }

        .filter-type-item input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }

        .filter-type-color {
          width: 1rem;
          height: 1rem;
          border-radius: 2px;
          border: 1px solid #e5e7eb;
        }

        .filter-type-label {
          flex: 1;
          font-size: 0.875rem;
          color: #374151;
        }

        /* Compact layout styles */
        .node-type-filter.compact {
          position: relative;
        }

        .filter-dropdown-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
        }

        .filter-dropdown-toggle:hover {
          border-color: #9ca3af;
        }

        .filter-dropdown-toggle:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-dropdown-content {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 50;
          max-height: 400px;
          overflow-y: auto;
        }

        /* Responsive styles */
        @media (max-width: 768px) {
          .filter-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .filter-actions {
            width: 100%;
          }

          .filter-action-btn {
            flex: 1;
          }

          .filter-type-item {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );

  // Render compact layout
  const renderCompactLayout = () => {
    const selectedCount = selectedTypes.size;
    const totalCount = filteredTypes.length;

    return (
      <div className={`node-type-filter compact ${className}`}>
        <button
          type="button"
          className="filter-dropdown-toggle"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-label="Filter by node type"
        >
          <span>
            Filter by Type {selectedCount > 0 && `(${selectedCount}/${totalCount})`}
          </span>
          <span aria-hidden="true">{isDropdownOpen ? '▲' : '▼'}</span>
        </button>

        {isDropdownOpen && (
          <div className="filter-dropdown-content">
            <div className="filter-header">
              <h3 className="filter-title">Filter by Type</h3>
              <div className="filter-actions">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={allSelected}
                  className="filter-action-btn"
                  aria-label="Select all node types"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={noneSelected}
                  className="filter-action-btn"
                  aria-label="Clear all node type selections"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="filter-content">
              {showCategories ? (
                Object.entries(typesByCategory).map(([category, types]) => (
                  <div key={category} className="filter-category">
                    <button
                      type="button"
                      className="filter-category-header"
                      onClick={() => handleCategoryToggle(category as NodeTypeCategory)}
                      aria-expanded={!collapsedCategories.has(category as NodeTypeCategory)}
                      aria-label={`Toggle ${CATEGORY_LABELS[category as NodeTypeCategory] || category} category`}
                    >
                      <span className="filter-category-icon">
                        {collapsedCategories.has(category as NodeTypeCategory) ? '▶' : '▼'}
                      </span>
                      <span className="filter-category-label">
                        {CATEGORY_LABELS[category as NodeTypeCategory] || category}
                      </span>
                      <span className="filter-category-count">({types.length})</span>
                    </button>
                    {!collapsedCategories.has(category as NodeTypeCategory) && (
                      <div className="filter-category-items">
                        {types.map(renderTypeCheckbox)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="filter-types">
                  {filteredTypes.map(renderTypeCheckbox)}
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`
          .node-type-filter.compact {
            position: relative;
          }

          .filter-dropdown-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 0.5rem 1rem;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            color: #374151;
          }

          .filter-dropdown-toggle:hover {
            border-color: #9ca3af;
          }

          .filter-dropdown-toggle:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .filter-dropdown-content {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 0.25rem;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 50;
            max-height: 400px;
            overflow-y: auto;
            padding: 1rem;
          }
        `}</style>
      </div>
    );
  };

  return layout === 'compact' ? renderCompactLayout() : renderExpandedLayout();
}

export default NodeTypeFilter;

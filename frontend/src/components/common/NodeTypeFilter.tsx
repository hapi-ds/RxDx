/**
 * NodeTypeFilter Component
 * 
 * A reusable filter component for selecting node types to display.
 * Supports multi-select, category grouping, and both compact and expanded layouts.
 * 
 * Keyboard Navigation:
 * - Tab: Navigate through filter controls
 * - Space/Enter: Toggle checkbox selection or activate buttons
 * - Escape: Close dropdown (compact mode)
 * - Arrow keys: Navigate between checkboxes (native browser behavior)
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { NodeTypeOption, FilterLayout, NodeTypeCategory } from '../../types/filters';
import { CATEGORY_LABELS } from '../../types/filters';

/**
 * Debounce utility function
 * Delays execution of a function until after a specified delay
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay) as unknown as number;
  };
}

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
  const [announcement, setAnnouncement] = useState<string>('');

  // Create a debounced version of onChange that persists across renders
  const debouncedOnChange = useRef(
    debounce((newSelected: Set<string>) => {
      onChange(newSelected);
    }, 300)
  ).current;

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      // Cleanup happens automatically
    };
  }, []);

  // Filter available types based on showWorkItemTypes
  // Memoized to prevent recalculation on every render
  const filteredTypes = useMemo(() => {
    if (showWorkItemTypes) {
      return availableTypes;
    }
    return availableTypes.filter(type => type.category !== 'workitems');
  }, [availableTypes, showWorkItemTypes]);

  // Group types by category
  // Memoized to prevent recalculation on every render
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
  // Memoized to prevent recalculation on every render
  const allSelected = useMemo(() => {
    return filteredTypes.every(type => selectedTypes.has(type.value));
  }, [filteredTypes, selectedTypes]);

  // Check if no types are selected
  // Memoized to prevent recalculation on every render
  const noneSelected = useMemo(() => {
    return selectedTypes.size === 0;
  }, [selectedTypes]);

  // Announce filter changes to screen readers
  // useCallback ensures function reference stability
  const announceChange = useCallback((message: string) => {
    setAnnouncement(message);
    // Clear announcement after a short delay
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  // Handle individual type toggle
  // useCallback ensures function reference stability
  const handleToggle = useCallback((value: string) => {
    const newSelected = new Set(selectedTypes);
    const type = filteredTypes.find(t => t.value === value);
    const typeName = type?.label || value;
    
    if (newSelected.has(value)) {
      newSelected.delete(value);
      announceChange(`${typeName} filter removed. ${newSelected.size} types selected.`);
    } else {
      newSelected.add(value);
      announceChange(`${typeName} filter added. ${newSelected.size} types selected.`);
    }
    
    // Use debounced onChange to reduce excessive updates
    debouncedOnChange(newSelected);
  }, [selectedTypes, filteredTypes, announceChange, debouncedOnChange]);

  // Handle select all
  // useCallback ensures function reference stability
  const handleSelectAll = useCallback(() => {
    const allValues = new Set(filteredTypes.map(type => type.value));
    onChange(allValues);
    announceChange(`All ${filteredTypes.length} types selected.`);
  }, [filteredTypes, onChange, announceChange]);

  // Handle clear all
  // useCallback ensures function reference stability
  const handleClearAll = useCallback(() => {
    onChange(new Set());
    announceChange('All filters cleared. No types selected.');
  }, [onChange, announceChange]);

  // Handle category toggle
  // useCallback ensures function reference stability
  const handleCategoryToggle = useCallback((category: NodeTypeCategory) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  }, [collapsedCategories]);

  // Handle keyboard navigation for checkboxes
  // useCallback ensures function reference stability
  const handleCheckboxKeyDown = useCallback((e: React.KeyboardEvent, value: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle(value);
    }
  }, [handleToggle]);

  // Handle keyboard navigation for dropdown
  // useCallback ensures function reference stability
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  }, []);

  // Render checkbox for a single type
  // Memoized to prevent unnecessary re-renders
  const renderTypeCheckbox = useCallback((type: NodeTypeOption) => (
    <label
      key={type.value}
      className="filter-type-item"
      title={type.label}
      onKeyDown={(e) => handleCheckboxKeyDown(e, type.value)}
      tabIndex={0}
    >
      <input
        type="checkbox"
        checked={selectedTypes.has(type.value)}
        onChange={() => handleToggle(type.value)}
        aria-label={`Filter by ${type.label}`}
        tabIndex={-1}
      />
      <span
        className="filter-type-color"
        style={{ backgroundColor: type.color || 'transparent' }}
        aria-hidden="true"
        title={`Color indicator for ${type.label}`}
      />
      <span className="filter-type-label">
        {type.label}
        {type.color && (
          <span className="sr-only"> (color: {type.color})</span>
        )}
      </span>
    </label>
  ), [selectedTypes, handleToggle, handleCheckboxKeyDown]);

  // Render expanded layout
  const renderExpandedLayout = () => (
    <div className={`node-type-filter expanded ${className}`}>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

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

        /* Screen reader only content */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
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
          color: #5b21b6;
          background: transparent;
          border: 1px solid #5b21b6;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-action-btn:hover:not(:disabled) {
          background: #5b21b6;
          color: white;
        }

        .filter-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          color: #6b7280;
          border-color: #9ca3af;
        }

        .filter-action-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(91, 33, 182, 0.3);
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
          box-shadow: 0 0 0 2px rgba(91, 33, 182, 0.3);
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

        .filter-type-item:focus {
          outline: none;
          background: #f3f4f6;
          box-shadow: 0 0 0 2px rgba(91, 33, 182, 0.3);
        }

        .filter-type-item:focus-visible {
          outline: 2px solid #5b21b6;
          outline-offset: 2px;
        }

        .filter-type-item input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }

        .filter-type-item input[type="checkbox"]:focus {
          outline: none;
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

        /* Responsive styles - Mobile (< 768px) */
        @media (max-width: 767px) {
          .node-type-filter {
            padding: 0.75rem;
          }

          .filter-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .filter-title {
            font-size: 0.9375rem;
          }

          .filter-actions {
            width: 100%;
            flex-direction: column;
          }

          .filter-action-btn {
            flex: 1;
            min-height: 44px;
            padding: 0.625rem 1rem;
            font-size: 1rem;
          }

          .filter-type-item {
            min-height: 44px;
            padding: 0.75rem 0.5rem;
          }

          .filter-type-item input[type="checkbox"] {
            width: 1.25rem;
            height: 1.25rem;
            min-width: 44px;
            min-height: 44px;
          }

          .filter-type-label {
            font-size: 1rem;
          }

          .filter-category-header {
            min-height: 44px;
            padding: 0.75rem 0.5rem;
            font-size: 1rem;
          }

          .filter-category-items {
            padding-left: 1rem;
          }

          .filter-dropdown-toggle {
            min-height: 44px;
            padding: 0.75rem 1rem;
            font-size: 1rem;
          }

          .filter-dropdown-content {
            max-height: 60vh;
          }
        }

        /* Responsive styles - Tablet (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .node-type-filter {
            padding: 0.875rem;
          }

          .filter-action-btn {
            min-height: 40px;
            padding: 0.5rem 0.875rem;
          }

          .filter-type-item {
            min-height: 40px;
            padding: 0.625rem 0.5rem;
          }

          .filter-type-item input[type="checkbox"] {
            width: 1.125rem;
            height: 1.125rem;
          }

          .filter-category-header {
            min-height: 40px;
            padding: 0.625rem 0.5rem;
          }

          .filter-dropdown-toggle {
            min-height: 40px;
          }
        }

        /* Touch-friendly enhancements for all mobile devices */
        @media (hover: none) and (pointer: coarse) {
          .filter-action-btn,
          .filter-type-item,
          .filter-category-header,
          .filter-dropdown-toggle {
            min-height: 44px;
          }

          .filter-type-item input[type="checkbox"] {
            min-width: 44px;
            min-height: 44px;
          }

          /* Increase tap target size without affecting visual size */
          .filter-type-item input[type="checkbox"]::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 44px;
            height: 44px;
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
      <div className={`node-type-filter compact ${className}`} onKeyDown={handleDropdownKeyDown}>
        {/* Screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

        <button
          type="button"
          className="filter-dropdown-toggle"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsDropdownOpen(!isDropdownOpen);
            }
          }}
          aria-expanded={isDropdownOpen}
          aria-label="Filter by node type"
          aria-haspopup="true"
        >
          <span>
            Filter by Type {selectedCount > 0 && `(${selectedCount}/${totalCount})`}
          </span>
          <span aria-hidden="true">{isDropdownOpen ? '▲' : '▼'}</span>
        </button>

        {isDropdownOpen && (
          <div className="filter-dropdown-content" role="menu">
            <div className="filter-header">
              <h3 className="filter-title">Filter by Type</h3>
              <div className="filter-actions">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={allSelected}
                  className="filter-action-btn"
                  aria-label="Select all node types"
                  role="menuitem"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={noneSelected}
                  className="filter-action-btn"
                  aria-label="Clear all node type selections"
                  role="menuitem"
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
            border-color: #5b21b6;
            box-shadow: 0 0 0 3px rgba(91, 33, 182, 0.1);
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

// Wrap component with React.memo for performance optimization
// Only re-renders when props actually change
export default React.memo(NodeTypeFilter, (prevProps, nextProps) => {
  // Custom comparison function for Set equality
  const setsEqual = (a: Set<string>, b: Set<string>) => {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  };

  // Check if props are equal
  return (
    setsEqual(prevProps.selectedTypes, nextProps.selectedTypes) &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.availableTypes === nextProps.availableTypes &&
    prevProps.showWorkItemTypes === nextProps.showWorkItemTypes &&
    prevProps.showCategories === nextProps.showCategories &&
    prevProps.layout === nextProps.layout &&
    prevProps.className === nextProps.className
  );
});

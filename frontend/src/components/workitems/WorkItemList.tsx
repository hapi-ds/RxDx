/**
 * WorkItemList component
 * Displays a list of work items with filtering, sorting, and pagination
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useWorkItemStore, type WorkItemFilters } from '../../stores/workitemStore';
import { Table, type Column, Input, Select, Button, Spinner, ErrorMessage } from '../common';
import type { WorkItem, WorkItemType, WorkItemStatus } from '../../services/workitemService';

export interface WorkItemListProps {
  onItemClick?: (item: WorkItem) => void;
  onCreateClick?: () => void;
  showFilters?: boolean;
  showPagination?: boolean;
  initialFilters?: WorkItemFilters;
  isBulkEditing?: boolean;
  selectedIds?: Set<string>;
  onSelectItem?: (id: string) => void;
  onDeselectItem?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'requirement', label: 'Requirement' },
  { value: 'task', label: 'Task' },
  { value: 'test', label: 'Test' },
  { value: 'risk', label: 'Risk' },
  { value: 'document', label: 'Document' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'identified', label: 'Identified' },
  { value: 'assessed', label: 'Assessed' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'closed', label: 'Closed' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'rejected', label: 'Rejected' },
];

const getStatusBadgeClass = (status: WorkItemStatus): string => {
  const classes: Record<string, string> = {
    draft: 'badge-gray',
    active: 'badge-blue',
    identified: 'badge-yellow',
    assessed: 'badge-orange',
    mitigated: 'badge-green',
    accepted: 'badge-blue',
    closed: 'badge-gray',
    completed: 'badge-green',
    archived: 'badge-yellow',
    rejected: 'badge-red',
  };
  return classes[status] || 'badge-gray';
};

const getTypeBadgeClass = (type: WorkItemType): string => {
  const classes: Record<WorkItemType, string> = {
    requirement: 'badge-purple',
    task: 'badge-blue',
    test: 'badge-green',
    risk: 'badge-red',
    document: 'badge-gray',
  };
  return classes[type] || 'badge-gray';
};

export function WorkItemList({
  onItemClick,
  onCreateClick,
  showFilters = true,
  showPagination = true,
  initialFilters,
  isBulkEditing = false,
  selectedIds = new Set(),
  onSelectItem,
  onDeselectItem,
  onSelectAll,
  onDeselectAll,
}: WorkItemListProps): React.ReactElement {
  const items = useWorkItemStore((state) => state.items);
  const total = useWorkItemStore((state) => state.total);
  const skip = useWorkItemStore((state) => state.skip);
  const limit = useWorkItemStore((state) => state.limit);
  const filters = useWorkItemStore((state) => state.filters);
  const isLoading = useWorkItemStore((state) => state.isLoading);
  const error = useWorkItemStore((state) => state.error);
  const fetchItems = useWorkItemStore((state) => state.fetchItems);
  const setFilters = useWorkItemStore((state) => state.setFilters);
  const clearFilters = useWorkItemStore((state) => state.clearFilters);
  const setPage = useWorkItemStore((state) => state.setPage);
  const clearError = useWorkItemStore((state) => state.clearError);

  // Initialize filters on mount only
  const initialFiltersRef = React.useRef(initialFilters);
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && initialFiltersRef.current) {
      setFilters(initialFiltersRef.current);
      hasInitialized.current = true;
    }
  }, [setFilters]);

  // Fetch items on mount and when filters/pagination changes
  // Use JSON.stringify to create stable dependency
  const filtersKey = JSON.stringify(filters);
  
  useEffect(() => {
    fetchItems().catch(() => {
      // Error is handled by the store
    });
  }, [filtersKey, skip, limit, fetchItems]);

  const handleFilterChange = useCallback(
    (key: keyof WorkItemFilters, value: string) => {
      setFilters({ ...filters, [key]: value || undefined });
    },
    [filters, setFilters]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilterChange('search', e.target.value);
    },
    [handleFilterChange]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFilterChange('type', e.target.value as WorkItemType);
    },
    [handleFilterChange]
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFilterChange('status', e.target.value as WorkItemStatus);
    },
    [handleFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleRowClick = useCallback(
    (item: WorkItem) => {
      if (isBulkEditing) {
        // In bulk edit mode, clicking row toggles selection
        if (selectedIds.has(item.id)) {
          onDeselectItem?.(item.id);
        } else {
          onSelectItem?.(item.id);
        }
      } else {
        // Normal mode, open detail view
        onItemClick?.(item);
      }
    },
    [isBulkEditing, selectedIds, onSelectItem, onDeselectItem, onItemClick]
  );

  const handleCheckboxChange = useCallback(
    (item: WorkItem, checked: boolean) => {
      if (checked) {
        onSelectItem?.(item.id);
      } else {
        onDeselectItem?.(item.id);
      }
    },
    [onSelectItem, onDeselectItem]
  );

  const handleSelectAllChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectAll?.();
      } else {
        onDeselectAll?.();
      }
    },
    [onSelectAll, onDeselectAll]
  );

  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const someSelected = items.some((item) => selectedIds.has(item.id)) && !allSelected;

  const columns: Column<WorkItem>[] = useMemo(
    () => {
      const baseColumns: Column<WorkItem>[] = [
        {
          key: 'type',
          header: 'Type',
          width: '100px',
          render: (item) => (
            <span className={`badge ${getTypeBadgeClass(item.type)}`}>
              {item.type}
            </span>
          ),
        },
        {
          key: 'title',
          header: 'Title',
          sortable: true,
          render: (item) => (
            <div className="workitem-title">
              <span className="title-text">{item.title}</span>
              {item.is_signed && (
                <span className="signed-indicator" title="Signed">
                  ✓
                </span>
              )}
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          width: '120px',
          sortable: true,
          render: (item) => (
            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
              {item.status}
            </span>
          ),
        },
        {
          key: 'version',
          header: 'Version',
          width: '80px',
          align: 'center',
        },
        {
          key: 'priority',
          header: 'Priority',
          width: '80px',
          align: 'center',
          sortable: true,
          render: (item) => (item.priority ? `P${item.priority}` : '-'),
        },
        {
          key: 'updated_at',
          header: 'Updated',
          width: '150px',
          sortable: true,
          render: (item) => new Date(item.updated_at).toLocaleDateString(),
        },
      ];

      // Add checkbox column at the beginning when in bulk edit mode
      if (isBulkEditing) {
        const checkboxColumn: Column<WorkItem> = {
          key: 'select',
          header: (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someSelected;
                }
              }}
              onChange={(e) => handleSelectAllChange(e.target.checked)}
              className="bulk-checkbox"
              aria-label="Select all items"
            />
          ),
          width: '50px',
          align: 'center',
          render: (item) => (
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={(e) => {
                e.stopPropagation();
                handleCheckboxChange(item, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bulk-checkbox"
              aria-label={`Select ${item.title}`}
            />
          ),
        };
        return [checkboxColumn, ...baseColumns];
      }

      return baseColumns;
    },
    [isBulkEditing, selectedIds, allSelected, someSelected, handleCheckboxChange, handleSelectAllChange]
  );

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  const handlePageChange = useCallback(
    (page: number) => {
      setPage((page - 1) * limit);
    },
    [setPage, limit]
  );

  const hasActiveFilters = filters.type || filters.status || filters.search;

  if (error) {
    return (
      <div className="workitem-list-error">
        <ErrorMessage message={error} onDismiss={clearError} />
        <Button variant="secondary" onClick={() => fetchItems()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="workitem-list">
      {showFilters && (
        <div className="workitem-list-header">
          <div className="workitem-filters">
            <Input
              placeholder="Search work items..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              leftAddon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
            <Select
              options={typeOptions}
              value={filters.type || ''}
              onChange={handleTypeChange}
              placeholder="Type"
            />
            <Select
              options={statusOptions}
              value={filters.status || ''}
              onChange={handleStatusChange}
              placeholder="Status"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>
            )}
          </div>
          {onCreateClick && (
            <Button variant="primary" onClick={onCreateClick}>
              + New Work Item
            </Button>
          )}
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="workitem-list-loading">
          <Spinner size="lg" />
          <span>Loading work items...</span>
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={items}
            keyExtractor={(item) => item.id}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage="No work items found"
          />

          {showPagination && total > limit && (
            <div className="workitem-pagination">
              <span className="pagination-info">
                Showing {skip + 1}-{Math.min(skip + limit, total)} of {total}
              </span>
              <div className="pagination-controls">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .workitem-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .workitem-list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .workitem-filters {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex: 1;
          max-width: 800px;
        }

        .workitem-filters > * {
          min-width: 150px;
        }

        .workitem-filters > *:first-child {
          flex: 1;
          min-width: 200px;
        }

        .workitem-list-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: #6b7280;
        }

        .workitem-list-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
        }

        .workitem-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .title-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .signed-indicator {
          color: #10b981;
          font-weight: 600;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .badge-gray {
          background: #f3f4f6;
          color: #4b5563;
        }

        .badge-blue {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge-green {
          background: #d1fae5;
          color: #047857;
        }

        .badge-yellow {
          background: #fef3c7;
          color: #b45309;
        }

        .badge-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        .badge-purple {
          background: #ede9fe;
          color: #6d28d9;
        }

        .workitem-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .page-indicator {
          font-size: 0.875rem;
          color: #374151;
        }

        .bulk-checkbox {
          cursor: pointer;
          width: 16px;
          height: 16px;
          margin: 0;
        }

        .bulk-checkbox:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

export default WorkItemList;

/**
 * Table component
 * Reusable table with sorting and selection support
 */

import React from 'react';
import { useState, useCallback, type ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  onSort?: (key: string, direction: SortDirection) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  stickyHeader?: boolean;
}

export function Table<T extends object>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  onSort,
  sortKey,
  sortDirection,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  emptyMessage = 'No data available',
  isLoading = false,
  stickyHeader = false,
}: TableProps<T>): React.ReactElement {
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortDirection, setLocalSortDirection] = useState<SortDirection>(null);

  const currentSortKey = sortKey ?? localSortKey;
  const currentSortDirection = sortDirection ?? localSortDirection;

  const handleSort = useCallback(
    (key: string) => {
      let newDirection: SortDirection;
      if (currentSortKey === key) {
        newDirection = currentSortDirection === 'asc' ? 'desc' : currentSortDirection === 'desc' ? null : 'asc';
      } else {
        newDirection = 'asc';
      }

      if (onSort) {
        onSort(key, newDirection);
      } else {
        setLocalSortKey(newDirection ? key : null);
        setLocalSortDirection(newDirection);
      }
    },
    [currentSortKey, currentSortDirection, onSort]
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;

    const allKeys = new Set(data.map(keyExtractor));
    const allSelected = data.every((item) => selectedKeys.has(keyExtractor(item)));

    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(allKeys);
    }
  }, [data, keyExtractor, selectedKeys, onSelectionChange]);

  const handleSelectRow = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;

      const newSelection = new Set(selectedKeys);
      if (newSelection.has(key)) {
        newSelection.delete(key);
      } else {
        newSelection.add(key);
      }
      onSelectionChange(newSelection);
    },
    [selectedKeys, onSelectionChange]
  );

  const allSelected = data.length > 0 && data.every((item) => selectedKeys.has(keyExtractor(item)));
  const someSelected = data.some((item) => selectedKeys.has(keyExtractor(item)));

  const getCellValue = (item: T, key: string): unknown => {
    return key.split('.').reduce((obj: unknown, k) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[k];
      }
      return undefined;
    }, item);
  };

  return (
    <div className="table-container">
      <table className={`table ${stickyHeader ? 'sticky-header' : ''}`}>
        <thead>
          <tr>
            {selectable && (
              <th className="table-checkbox-cell">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width, textAlign: column.align || 'left' }}
                className={column.sortable ? 'sortable' : ''}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div className="th-content">
                  <span>{column.header}</span>
                  {column.sortable && (
                    <span className="sort-indicator">
                      {currentSortKey === column.key && currentSortDirection === 'asc' && '↑'}
                      {currentSortKey === column.key && currentSortDirection === 'desc' && '↓'}
                      {(currentSortKey !== column.key || !currentSortDirection) && '↕'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="table-loading">
                <div className="loading-spinner" />
                <span>Loading...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const key = keyExtractor(item);
              const isSelected = selectedKeys.has(key);

              return (
                <tr
                  key={key}
                  className={`${onRowClick ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {selectable && (
                    <td className="table-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} style={{ textAlign: column.align || 'left' }}>
                      {column.render
                        ? column.render(item, index)
                        : String(getCellValue(item, column.key) ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <style>{`
        .table-container {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .table.sticky-header thead {
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .table thead {
          background: #f9fafb;
        }

        .table th {
          padding: 0.75rem 1rem;
          font-weight: 600;
          color: #374151;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .table th.sortable:hover {
          background: #f3f4f6;
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-indicator {
          color: #9ca3af;
          font-size: 0.75rem;
        }

        .table td {
          padding: 0.75rem 1rem;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
        }

        .table tbody tr:last-child td {
          border-bottom: none;
        }

        .table tbody tr:hover {
          background: #f9fafb;
        }

        .table tbody tr.clickable {
          cursor: pointer;
        }

        .table tbody tr.selected {
          background: #eff6ff;
        }

        .table tbody tr.selected:hover {
          background: #dbeafe;
        }

        .table-checkbox-cell {
          width: 40px;
          text-align: center;
        }

        .table-checkbox-cell input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .table-empty,
        .table-loading {
          text-align: center;
          padding: 2rem 1rem;
          color: #6b7280;
        }

        .table-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default Table;

/**
 * DocumentNode Component
 * Document node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Document-specific icon
 * - "Document" type label
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * DocumentIcon - SVG icon component for document nodes
 * Displays a document/file icon
 */
const DocumentIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#7b1fa2',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Document/file icon */}
    <path
      d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
      fill={color}
    />
  </svg>
);

/**
 * Get status icon component based on status value
 */
const getStatusIcon = (
  status?: string
): React.ComponentType<{ size?: number; color?: string }> | undefined => {
  if (!status) return undefined;

  switch (status) {
    case 'draft':
      // Draft icon - pencil/edit icon
      return ({ size = 16, color = '#9e9e9e' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            fill={color}
          />
        </svg>
      );

    case 'active':
      // Active icon - document with checkmark
      return ({ size = 16, color = '#7b1fa2' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3 16l-4-4 1.41-1.41L11 15.17l4.59-4.59L17 12l-6 6z"
            fill={color}
          />
        </svg>
      );

    case 'completed':
      // Completed icon - document with checkmark (filled)
      return ({ size = 16, color = '#388e3c' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3 16l-4-4 1.41-1.41L11 15.17l4.59-4.59L17 12l-6 6z"
            fill={color}
          />
        </svg>
      );

    case 'archived':
      // Archived icon - box/archive icon
      return ({ size = 16, color = '#757575' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"
            fill={color}
          />
        </svg>
      );

    case 'approved':
      // Approved icon - document with star
      return ({ size = 16, color = '#388e3c' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-2 15l-3.5-2.1L5 17l.95-3.95L3 10l4.05-.35L9 6l1.95 3.65L15 10l-2.95 3.05L13 17l-3.5-2.1z"
            fill={color}
          />
        </svg>
      );

    case 'review':
      // Review icon - document with magnifying glass
      return ({ size = 16, color = '#ff9800' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 15c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
            fill={color}
          />
          <circle cx="13" cy="13" r="2.5" stroke={color} strokeWidth="1" fill="none" />
        </svg>
      );

    default:
      return undefined;
  }
};

/**
 * DocumentNode - Document node component with unified design
 * Extends UnifiedNode with document-specific configuration
 */
export const DocumentNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Get status icon based on actual status
  const StatusIcon = useMemo(() => {
    return getStatusIcon(data.status);
  }, [data.status]);

  return (
    <UnifiedNode
      {...props}
      data={data}
      selected={selected}
      dragging={dragging}
      typeIcon={DocumentIcon}
      typeName="Document"
      statusIcon={StatusIcon}
      gauges={[]} // No gauges for document nodes
      iconPosition="upper-left"
    />
  );
};

export default DocumentNode;

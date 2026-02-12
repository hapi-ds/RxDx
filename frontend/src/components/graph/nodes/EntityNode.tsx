/**
 * EntityNode Component
 * Entity node with unified design pattern
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps } from './types';
import { UnifiedNode } from './UnifiedNode';

const EntityIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#78716c',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z"
      fill={color}
    />
  </svg>
);

const getStatusIcon = (
  status?: string
): React.ComponentType<{ size?: number; color?: string }> | undefined => {
  if (!status) return undefined;

  switch (status) {
    case 'active':
      return ({ size = 16, color = '#388e3c' }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill={color} />
          <path
            d="M8 12l2 2 4-4"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return undefined;
  }
};

export const EntityNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  const StatusIcon = useMemo(() => {
    return getStatusIcon(data.status);
  }, [data.status]);

  return (
    <UnifiedNode
      {...props}
      data={data}
      selected={selected}
      dragging={dragging}
      typeIcon={EntityIcon}
      typeName="Entity"
      statusIcon={StatusIcon}
      gauges={[]}
      iconPosition="upper-left"
    />
  );
};

export default EntityNode;

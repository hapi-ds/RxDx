/**
 * BacklogNode Component
 * Backlog node with unified design pattern
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

const BacklogIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#64748b',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"
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
      return ({ size = 16, color = '#2196f3' }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M8 5v14l11-7z" fill={color} />
        </svg>
      );
    default:
      return undefined;
  }
};

export const BacklogNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Calculate progress from properties
  const progress = useMemo(() => {
    return (data.properties?.progress as number | undefined) || 0;
  }, [data.properties?.progress]);


  const gauges: GaugeDefinition[] = useMemo(
    () => [
      {
        id: 'progress',
        label: 'Progress',
        value: progress,
        min: 0,
        max: 100,
        startAngle: 0,
        endAngle: 360,
        color: '#64748b',
        showValue: true,
      },
    ],
    [progress]
  );

  const StatusIcon = useMemo(() => {
    return getStatusIcon(data.status);
  }, [data.status]);

  return (
    <UnifiedNode
      {...props}
      data={data}
      selected={selected}
      dragging={dragging}
      typeIcon={BacklogIcon}
      typeName="Backlog"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default BacklogNode;

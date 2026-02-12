/**
 * Custom node components for graph visualization
 * Exports base infrastructure for type-specific node rendering
 */

export { BaseNode } from './BaseNode';
export type { BaseNodeProps } from './BaseNode';

export { TaskNode } from './TaskNode';
export { ProgressCircle } from './ProgressCircle';
export type { ProgressCircleProps } from './ProgressCircle';

// Unified node system
export { UnifiedNode } from './UnifiedNode';
export type { UnifiedNodeProps } from './UnifiedNode';

// Type-specific node components
export { RequirementNode } from './RequirementNode';
export { TestNode } from './TestNode';
export { RiskNode } from './RiskNode';
export { DocumentNode } from './DocumentNode';
export { WorkpackageNode } from './WorkpackageNode';
export { ProjectNode } from './ProjectNode';
export { PhaseNode } from './PhaseNode';
export { ResourceNode } from './ResourceNode';
export { CompanyNode } from './CompanyNode';
export { DepartmentNode } from './DepartmentNode';
export { SprintNode } from './SprintNode';
export { BacklogNode } from './BacklogNode';
export { EntityNode } from './EntityNode';
export { MilestoneNode } from './MilestoneNode';

export { DialGauge } from './DialGauge';
export type { DialGaugeProps } from './DialGauge';

export { MiniPieChart } from './MiniPieChart';
export type { MiniPieChartProps } from './MiniPieChart';

export { PriorityBadge } from './PriorityBadge';
export type { PriorityBadgeProps } from './PriorityBadge';

export { NODE_COLORS, NODE_TYPE_LABELS } from './constants';
export type { NodeColorScheme } from './constants';

export type {
  CustomNodeProps,
  CustomNodeData,
  NodeState,
  GaugeDefinition,
} from './types';

export {
  getNodeColors,
  calculateNodeSize,
  getBorderWidth,
  getShadowStyle,
  getHoverScale,
  validatePriority,
  validateProgress,
} from './utils';

export {
  useNodeInteraction,
  useNodeStyles,
  useNodeProgress,
  useConnectedHighlight,
} from './hooks';

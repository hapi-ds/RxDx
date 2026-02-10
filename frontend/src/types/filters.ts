/**
 * Type definitions for filter components and data structures
 */

/**
 * Node type option for filter controls
 */
export interface NodeTypeOption {
  /** Unique value identifier for the node type */
  value: string;
  /** Display label for the node type */
  label: string;
  /** Category grouping for the node type */
  category?: 'workitems' | 'structure' | 'resources' | 'other';
  /** Color code for visual indicator (hex format) */
  color?: string;
  /** Icon identifier or component for visual indicator */
  icon?: string;
}

/**
 * Layout mode for filter component
 */
export type FilterLayout = 'compact' | 'expanded';

/**
 * Node type categories for grouping
 */
export type NodeTypeCategory = 'workitems' | 'structure' | 'resources' | 'other';

/**
 * Work item types (subset of node types)
 */
export type WorkItemType = 'requirement' | 'task' | 'test' | 'risk' | 'document';

/**
 * All possible node types in the graph
 */
export type GraphNodeType =
  | 'WorkItem'
  | 'Project'
  | 'Phase'
  | 'Workpackage'
  | 'Resource'
  | 'Company'
  | 'Department'
  | 'Milestone'
  | 'Sprint'
  | 'Backlog'
  | 'User'
  | 'Entity'
  | 'Document'
  | 'Failure';

/**
 * Predefined node type options for work items
 */
export const WORK_ITEM_TYPE_OPTIONS: NodeTypeOption[] = [
  {
    value: 'requirement',
    label: 'Requirements',
    category: 'workitems',
    color: '#3b82f6',
    icon: 'document',
  },
  {
    value: 'task',
    label: 'Tasks',
    category: 'workitems',
    color: '#10b981',
    icon: 'check-circle',
  },
  {
    value: 'test',
    label: 'Tests',
    category: 'workitems',
    color: '#8b5cf6',
    icon: 'beaker',
  },
  {
    value: 'risk',
    label: 'Risks',
    category: 'workitems',
    color: '#ef4444',
    icon: 'exclamation-triangle',
  },
  {
    value: 'document',
    label: 'Documents',
    category: 'workitems',
    color: '#f59e0b',
    icon: 'document-text',
  },
];

/**
 * Predefined node type options for all graph node types
 */
export const GRAPH_NODE_TYPE_OPTIONS: NodeTypeOption[] = [
  // Work Items
  ...WORK_ITEM_TYPE_OPTIONS,
  
  // Project Structure
  {
    value: 'Project',
    label: 'Projects',
    category: 'structure',
    color: '#06b6d4',
    icon: 'folder',
  },
  {
    value: 'Phase',
    label: 'Phases',
    category: 'structure',
    color: '#14b8a6',
    icon: 'calendar',
  },
  {
    value: 'Workpackage',
    label: 'Work Packages',
    category: 'structure',
    color: '#84cc16',
    icon: 'briefcase',
  },
  {
    value: 'Milestone',
    label: 'Milestones',
    category: 'structure',
    color: '#ec4899',
    icon: 'flag',
  },
  
  // Resources
  {
    value: 'Resource',
    label: 'Resources',
    category: 'resources',
    color: '#f97316',
    icon: 'user-group',
  },
  {
    value: 'Company',
    label: 'Companies',
    category: 'resources',
    color: '#6366f1',
    icon: 'office-building',
  },
  {
    value: 'Department',
    label: 'Departments',
    category: 'resources',
    color: '#a855f7',
    icon: 'users',
  },
  {
    value: 'User',
    label: 'Users',
    category: 'resources',
    color: '#8b5cf6',
    icon: 'user',
  },
  
  // Other
  {
    value: 'Sprint',
    label: 'Sprints',
    category: 'other',
    color: '#22c55e',
    icon: 'lightning-bolt',
  },
  {
    value: 'Backlog',
    label: 'Backlogs',
    category: 'other',
    color: '#64748b',
    icon: 'collection',
  },
  {
    value: 'Entity',
    label: 'Entities',
    category: 'other',
    color: '#78716c',
    icon: 'cube',
  },
  {
    value: 'Failure',
    label: 'Failures',
    category: 'other',
    color: '#dc2626',
    icon: 'x-circle',
  },
];

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<NodeTypeCategory, string> = {
  workitems: 'Work Items',
  structure: 'Project Structure',
  resources: 'Resources',
  other: 'Other',
};

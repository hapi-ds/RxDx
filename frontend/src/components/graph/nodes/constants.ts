/**
 * Node styling constants for graph visualization
 * Defines color schemes for different node types
 */

export interface NodeColorScheme {
  bg: string;
  border: string;
  text: string;
}

/**
 * Color scheme for each node type
 * Maintains WCAG AA contrast ratios for accessibility
 */
export const NODE_COLORS: Record<string, NodeColorScheme> = {
  requirement: { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  task: { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  test: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' },
  risk: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c' },
  document: { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  default: { bg: '#fafafa', border: '#9e9e9e', text: '#424242' },
};

/**
 * Type labels for node badges
 */
export const NODE_TYPE_LABELS: Record<string, string> = {
  requirement: 'REQ',
  task: 'TASK',
  test: 'TEST',
  risk: 'RISK',
  document: 'DOC',
};

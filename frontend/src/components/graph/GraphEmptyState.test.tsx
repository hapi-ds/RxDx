/**
 * GraphEmptyState Component Tests
 * Tests for the empty state component including:
 * - Rendering with correct text and elements
 * - Button interactions and navigation
 * - Optional refresh callback
 * - Styling and layout
 * - Accessibility features
 * 
 * References: Requirement 4 (Empty State Handling)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphEmptyState } from './GraphEmptyState';

describe('GraphEmptyState', () => {
  // Store original window.location
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { ...originalLocation, href: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore window.location
    (window as any).location = originalLocation;
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<GraphEmptyState />);
      
      // Check for main container with proper role
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      // Check for heading
      expect(screen.getByRole('heading', { name: /no graph data available/i })).toBeInTheDocument();
      
      // Check for description text
      expect(screen.getByText(/the knowledge graph is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/create some requirements, tasks, or tests/i)).toBeInTheDocument();
      
      // Check for Create Requirements button (using aria-label)
      expect(screen.getByRole('button', { name: /navigate to requirements page/i })).toBeInTheDocument();
    });

    it('renders without refresh button when onRefresh is not provided', () => {
      render(<GraphEmptyState />);
      
      // Should have Create Requirements button
      expect(screen.getByRole('button', { name: /navigate to requirements page/i })).toBeInTheDocument();
      
      // Should not have Refresh button
      expect(screen.queryByRole('button', { name: /refresh graph data/i })).not.toBeInTheDocument();
    });

    it('renders with refresh button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      // Should have both buttons
      expect(screen.getByRole('button', { name: /navigate to requirements page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh graph data/i })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<GraphEmptyState className="custom-class" />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveClass('graph-empty-state');
    });

    it('applies custom style', () => {
      const { container } = render(<GraphEmptyState style={{ backgroundColor: 'red' }} />);
      
      const statusContainer = container.querySelector('.graph-empty-state');
      expect(statusContainer).toHaveAttribute('style', expect.stringContaining('background-color: red'));
    });

    it('renders the empty graph icon', () => {
      const { container } = render(<GraphEmptyState />);
      
      // Check for SVG icon
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Button Interactions', () => {
    it('navigates to /requirements when Create Requirements button is clicked', async () => {
      render(<GraphEmptyState />);
      
      const createButton = screen.getByRole('button', { name: /navigate to requirements page/i });
      await userEvent.click(createButton);
      
      // Check that window.location.href was set
      expect(window.location.href).toBe('/requirements');
    });

    it('calls onRefresh callback when Refresh Graph button is clicked', async () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh graph data/i });
      await userEvent.click(refreshButton);
      
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not call onRefresh when Create Requirements button is clicked', async () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const createButton = screen.getByRole('button', { name: /navigate to requirements page/i });
      await userEvent.click(createButton);
      
      expect(onRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Content', () => {
    it('displays correct heading text', () => {
      render(<GraphEmptyState />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No Graph Data Available');
    });

    it('displays helpful guidance message', () => {
      render(<GraphEmptyState />);
      
      // Check for the complete guidance message
      const description = screen.getByText(/the knowledge graph is empty/i);
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent(
        'The knowledge graph is empty. Create some requirements, tasks, or tests to see them visualized here.'
      );
    });

    it('provides guidance on how to populate data (Requirement 4.2)', () => {
      render(<GraphEmptyState />);
      
      // Verify guidance mentions creating requirements, tasks, or tests
      expect(screen.getByText(/create some requirements, tasks, or tests/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<GraphEmptyState />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('has accessible button labels', () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const createButton = screen.getByRole('button', { name: /navigate to requirements page/i });
      expect(createButton).toHaveAttribute(
        'aria-label',
        'Navigate to requirements page to create new requirements'
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh graph data/i });
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh graph data');
    });

    it('icon has aria-hidden attribute', () => {
      const { container } = render(<GraphEmptyState />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('buttons are keyboard focusable', () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const createButton = screen.getByRole('button', { name: /navigate to requirements page/i });
      const refreshButton = screen.getByRole('button', { name: /refresh graph data/i });
      
      expect(createButton).not.toHaveAttribute('tabindex', '-1');
      expect(refreshButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Layout and Styling', () => {
    it('renders with centered layout', () => {
      const { container } = render(<GraphEmptyState />);
      
      const emptyState = container.querySelector('.graph-empty-state');
      expect(emptyState).toBeInTheDocument();
      
      const content = container.querySelector('.empty-state-content');
      expect(content).toBeInTheDocument();
    });

    it('renders icon, heading, description, and actions in correct order', () => {
      const { container } = render(<GraphEmptyState />);
      
      const content = container.querySelector('.empty-state-content');
      expect(content).toBeInTheDocument();
      
      // Check for child elements in order
      const icon = content?.querySelector('.empty-state-icon');
      const heading = content?.querySelector('.empty-state-heading');
      const description = content?.querySelector('.empty-state-description');
      const actions = content?.querySelector('.empty-state-actions');
      
      expect(icon).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(actions).toBeInTheDocument();
    });

    it('renders buttons in actions container', () => {
      const onRefresh = vi.fn();
      const { container } = render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const actions = container.querySelector('.empty-state-actions');
      expect(actions).toBeInTheDocument();
      
      // Both buttons should be within the actions container
      const buttons = actions?.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Requirements Validation', () => {
    it('displays empty state message when graph has zero nodes (Requirement 4.1)', () => {
      render(<GraphEmptyState />);
      
      // Verify the empty state message is displayed
      expect(screen.getByRole('heading', { name: /no graph data available/i })).toBeInTheDocument();
      expect(screen.getByText(/the knowledge graph is empty/i)).toBeInTheDocument();
    });

    it('provides guidance on how to populate data (Requirement 4.2)', () => {
      render(<GraphEmptyState />);
      
      // Verify guidance is provided
      const guidance = screen.getByText(/create some requirements, tasks, or tests/i);
      expect(guidance).toBeInTheDocument();
      
      // Verify Create Requirements button is present
      expect(screen.getByRole('button', { name: /navigate to requirements page/i })).toBeInTheDocument();
    });
  });

  describe('Button Variants', () => {
    it('renders Create Requirements button with primary variant', () => {
      render(<GraphEmptyState />);
      
      const createButton = screen.getByRole('button', { name: /navigate to requirements page/i });
      expect(createButton).toHaveClass('btn-primary');
    });

    it('renders Refresh Graph button with secondary variant', () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh graph data/i });
      expect(refreshButton).toHaveClass('btn-secondary');
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple clicks on Create Requirements button', async () => {
      render(<GraphEmptyState />);
      
      const createButton = screen.getByRole('button', { name: /navigate to requirements page/i });
      
      await userEvent.click(createButton);
      expect(window.location.href).toBe('/requirements');
      
      // Reset for second click
      window.location.href = '';
      
      await userEvent.click(createButton);
      expect(window.location.href).toBe('/requirements');
    });

    it('handles multiple clicks on Refresh Graph button', async () => {
      const onRefresh = vi.fn();
      render(<GraphEmptyState onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh graph data/i });
      
      await userEvent.click(refreshButton);
      await userEvent.click(refreshButton);
      await userEvent.click(refreshButton);
      
      expect(onRefresh).toHaveBeenCalledTimes(3);
    });

    it('renders correctly with undefined onRefresh', () => {
      render(<GraphEmptyState onRefresh={undefined} />);
      
      expect(screen.getByRole('button', { name: /navigate to requirements page/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh graph data/i })).not.toBeInTheDocument();
    });

    it('renders correctly with empty className', () => {
      render(<GraphEmptyState className="" />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveClass('graph-empty-state');
    });

    it('renders correctly with empty style object', () => {
      render(<GraphEmptyState style={{}} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});

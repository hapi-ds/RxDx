/**
 * Property-Based Tests for IsolationIndicator Component
 * Tests universal properties that should hold for all valid inputs
 * 
 * Feature: graph-ui-enhancements
 * Property 14: Isolation indicator content
 * Validates: Requirements 3.7
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { IsolationIndicator } from './IsolationIndicator';

// Cleanup after each test to prevent DOM pollution
afterEach(() => {
  cleanup();
});

describe('IsolationIndicator - Property-Based Tests', () => {
  /**
   * Property 14: Isolation indicator content
   * For any isolated node and depth value, the isolation indicator should display
   * text containing both the node's name and the current depth value.
   * 
   * Validates: Requirements 3.7
   */
  it('should display both node name and depth value for any valid inputs', () => {
    fc.assert(
      fc.property(
        // Generate node names (non-empty strings)
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        // Generate depth values (1-10 is typical range)
        fc.integer({ min: 1, max: 10 }),
        (nodeName, depth) => {
          const mockOnExit = vi.fn();
          
          const { container } = render(
            <IsolationIndicator
              nodeName={nodeName}
              depth={depth}
              onExit={mockOnExit}
            />
          );

          // Property: The indicator must contain the node name
          const nodeNameElement = container.querySelector('.isolation-node-name');
          expect(nodeNameElement).toBeInTheDocument();
          expect(nodeNameElement?.textContent).toBe(nodeName);

          // Property: The indicator must contain the depth value
          const depthText = `(Depth: ${depth})`;
          const depthElement = container.querySelector('.isolation-depth-label');
          expect(depthElement).toBeInTheDocument();
          expect(depthElement?.textContent?.replace(/\s+/g, ' ').trim()).toBe(depthText);

          // Property: The indicator must have the "Isolated:" label
          const labelElement = container.querySelector('.isolation-label');
          expect(labelElement).toBeInTheDocument();
          expect(labelElement?.textContent).toBe('Isolated:');

          // Property: The indicator must have an exit button
          const exitButton = container.querySelector('.isolation-exit-button');
          expect(exitButton).toBeInTheDocument();

          // Property: The indicator must have proper ARIA attributes
          const indicator = container.querySelector('.isolation-indicator');
          expect(indicator).toHaveAttribute('role', 'status');
          expect(indicator).toHaveAttribute('aria-live', 'polite');

          // Property: The exit button must have proper accessibility attributes
          expect(exitButton).toHaveAttribute('aria-label', 'Exit isolation mode');
          
          // Cleanup for next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Node name truncation and title attribute
   * For any node name, the element should have a title attribute for accessibility
   */
  it('should provide title attribute for node name for accessibility', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 10 }),
        (nodeName, depth) => {
          const mockOnExit = vi.fn();
          
          const { container } = render(
            <IsolationIndicator
              nodeName={nodeName}
              depth={depth}
              onExit={mockOnExit}
            />
          );

          // Property: Node name element must have title attribute with full name
          const nodeNameElement = container.querySelector('.isolation-node-name');
          expect(nodeNameElement).toHaveAttribute('title', nodeName);
          
          // Cleanup for next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Exit button functionality
   * For any valid inputs, clicking the exit button should call the onExit callback
   */
  it('should call onExit callback when exit button is clicked', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 10 }),
        (nodeName, depth) => {
          const mockOnExit = vi.fn();
          
          const { container } = render(
            <IsolationIndicator
              nodeName={nodeName}
              depth={depth}
              onExit={mockOnExit}
            />
          );

          const exitButton = container.querySelector('.isolation-exit-button') as HTMLButtonElement;
          expect(exitButton).toBeInTheDocument();
          exitButton.click();

          // Property: Exit button must call onExit exactly once
          expect(mockOnExit).toHaveBeenCalledTimes(1);
          
          // Cleanup for next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Depth value formatting
   * For any depth value, it should be displayed in the format "(Depth: N)"
   */
  it('should format depth value consistently', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 100 }),
        (nodeName, depth) => {
          const mockOnExit = vi.fn();
          
          const { container } = render(
            <IsolationIndicator
              nodeName={nodeName}
              depth={depth}
              onExit={mockOnExit}
            />
          );

          // Property: Depth must be formatted as "(Depth: N)"
          const expectedDepthText = `(Depth: ${depth})`;
          const depthElement = container.querySelector('.isolation-depth-label');
          expect(depthElement).toBeInTheDocument();
          // Normalize whitespace for comparison
          const actualText = depthElement?.textContent?.replace(/\s+/g, ' ').trim();
          expect(actualText).toBe(expectedDepthText);
          
          // Cleanup for next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Custom className application
   * For any custom className, it should be applied to the root element
   */
  it('should apply custom className to root element', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 10 }),
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-z-]+$/.test(s)),
        (nodeName, depth, customClass) => {
          const mockOnExit = vi.fn();
          
          const { container } = render(
            <IsolationIndicator
              nodeName={nodeName}
              depth={depth}
              onExit={mockOnExit}
              className={customClass}
            />
          );

          // Property: Custom className must be present on root element
          const indicator = container.querySelector('.isolation-indicator');
          expect(indicator).toHaveClass('isolation-indicator');
          expect(indicator).toHaveClass(customClass);
          
          // Cleanup for next iteration
          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property-based tests for TaskNode component
 * Validates: Requirements 4.2, 4.3, 4.1.6
 * 
 * Property 10: Task completion mapping
 * For any task node, if the "done" attribute is true, the calculated progress
 * should be 100%; if false or absent, it should be 0%.
 */

import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import * as fc from 'fast-check';
import { TaskNode } from './TaskNode';
import type { CustomNodeData } from './types';

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

/**
 * Helper function to extract progress percentage from rendered TaskNode
 * Calculates progress from stroke-dashoffset of the progress circle
 */
const extractProgressPercentage = (container: HTMLElement): number => {
  // Find progress circle (has stroke-dashoffset attribute)
  const progressCircle = Array.from(container.querySelectorAll('circle')).find(
    (circle) => circle.hasAttribute('stroke-dashoffset')
  );

  if (!progressCircle) {
    throw new Error('Progress circle not found');
  }

  const dasharray = parseFloat(progressCircle.getAttribute('stroke-dasharray') || '0');
  const dashoffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset') || '0');

  if (dasharray === 0) {
    return 0;
  }

  // Calculate percentage from dashoffset
  // offset = circumference - (percentage / 100) * circumference
  // percentage = (1 - offset / circumference) * 100
  const percentage = (1 - dashoffset / dasharray) * 100;

  return Math.round(percentage); // Round to handle floating point precision
};

describe('TaskNode Property-Based Tests', () => {
  describe('Property 10: Task completion mapping', () => {
    it('should map done=true to 100% progress for any task data', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary task labels
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate arbitrary priority values (1-5 or undefined)
          fc.option(fc.integer({ min: 1, max: 5 })),
          // Generate arbitrary additional properties
          fc.record({
            status: fc.option(fc.constantFrom('active', 'completed', 'pending')),
            assignedTo: fc.option(fc.string()),
          }),
          (label, priority, additionalProps) => {
            // Create task data with done=true
            const taskData: CustomNodeData = {
              label,
              type: 'task',
              priority: priority ?? undefined,
              properties: {
                ...additionalProps,
                done: true, // Always true for this property
              },
            };

            // Render the TaskNode
            const { container } = render(
              <TestWrapper>
                <TaskNode
                  id={`task-${Math.random()}`}
                  data={taskData}
                  selected={false}
                />
              </TestWrapper>
            );

            // Extract progress percentage
            const progress = extractProgressPercentage(container);

            // Property: done=true should always result in 100% progress
            return progress === 100;
          }
        ),
        {
          numRuns: 100, // Run 100 test cases
          verbose: true,
        }
      );
    });

    it('should map done=false to 0% progress for any task data', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary task labels
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate arbitrary priority values (1-5 or undefined)
          fc.option(fc.integer({ min: 1, max: 5 })),
          // Generate arbitrary additional properties
          fc.record({
            status: fc.option(fc.constantFrom('active', 'completed', 'pending')),
            assignedTo: fc.option(fc.string()),
          }),
          (label, priority, additionalProps) => {
            // Create task data with done=false
            const taskData: CustomNodeData = {
              label,
              type: 'task',
              priority: priority ?? undefined,
              properties: {
                ...additionalProps,
                done: false, // Always false for this property
              },
            };

            // Render the TaskNode
            const { container } = render(
              <TestWrapper>
                <TaskNode
                  id={`task-${Math.random()}`}
                  data={taskData}
                  selected={false}
                />
              </TestWrapper>
            );

            // Extract progress percentage
            const progress = extractProgressPercentage(container);

            // Property: done=false should always result in 0% progress
            return progress === 0;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should map done=undefined to 0% progress for any task data', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary task labels
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate arbitrary priority values (1-5 or undefined)
          fc.option(fc.integer({ min: 1, max: 5 })),
          // Generate arbitrary additional properties
          fc.record({
            status: fc.option(fc.constantFrom('active', 'completed', 'pending')),
            assignedTo: fc.option(fc.string()),
          }),
          (label, priority, additionalProps) => {
            // Create task data without done attribute
            const taskData: CustomNodeData = {
              label,
              type: 'task',
              priority: priority ?? undefined,
              properties: {
                ...additionalProps,
                // done is intentionally omitted
              },
            };

            // Render the TaskNode
            const { container } = render(
              <TestWrapper>
                <TaskNode
                  id={`task-${Math.random()}`}
                  data={taskData}
                  selected={false}
                />
              </TestWrapper>
            );

            // Extract progress percentage
            const progress = extractProgressPercentage(container);

            // Property: done=undefined should always result in 0% progress
            return progress === 0;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should map done attribute to progress regardless of other properties', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary task labels
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate arbitrary priority values
          fc.option(fc.integer({ min: 1, max: 5 })),
          // Generate arbitrary done value
          fc.boolean(),
          // Generate arbitrary selection state
          fc.boolean(),
          // Generate arbitrary additional properties
          fc.record({
            status: fc.option(fc.constantFrom('active', 'completed', 'pending')),
            assignedTo: fc.option(fc.string()),
            customField: fc.option(fc.string()),
          }),
          (label, priority, done, selected, additionalProps) => {
            // Create task data
            const taskData: CustomNodeData = {
              label,
              type: 'task',
              priority: priority ?? undefined,
              properties: {
                ...additionalProps,
                done,
              },
            };

            // Render the TaskNode
            const { container } = render(
              <TestWrapper>
                <TaskNode
                  id={`task-${Math.random()}`}
                  data={taskData}
                  selected={selected}
                />
              </TestWrapper>
            );

            // Extract progress percentage
            const progress = extractProgressPercentage(container);

            // Property: progress should be 100% if done=true, 0% otherwise
            const expectedProgress = done ? 100 : 0;
            return progress === expectedProgress;
          }
        ),
        {
          numRuns: 200, // More runs for comprehensive testing
          verbose: true,
        }
      );
    });

    it('should maintain progress mapping invariant across re-renders', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary task data
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.boolean(),
          (label, done) => {
            const taskData: CustomNodeData = {
              label,
              type: 'task',
              properties: { done },
            };

            // First render
            const { container: container1 } = render(
              <TestWrapper>
                <TaskNode
                  id="task-invariant-1"
                  data={taskData}
                  selected={false}
                />
              </TestWrapper>
            );

            // Second render with same data
            const { container: container2 } = render(
              <TestWrapper>
                <TaskNode
                  id="task-invariant-2"
                  data={taskData}
                  selected={false}
                />
              </TestWrapper>
            );

            // Extract progress from both renders
            const progress1 = extractProgressPercentage(container1);
            const progress2 = extractProgressPercentage(container2);

            // Property: progress should be consistent across renders
            return progress1 === progress2;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});

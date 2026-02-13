/**
 * Property-based tests for DistanceControl component
 * Feature: graph-ui-enhancements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { DistanceControl } from './DistanceControl';
import { useGraphStore } from '../../stores/graphStore';

describe('DistanceControl Property Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.getState().reset();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up rendered components
    cleanup();
    // Clean up localStorage after each test
    localStorage.clear();
  });

  describe('Property 5: Distance display consistency', () => {
    // Feature: graph-ui-enhancements, Property 5: Distance display consistency
    // **Validates: Requirements 1.7**
    // For any distance value in the slider, the displayed numeric value should match
    // the slider's current value.

    it('should display the same value as the slider', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          (distance) => {
            // Set the distance in the store
            useGraphStore.getState().setLayoutDistance(distance);
            
            // Render the component
            const { container, unmount } = render(<DistanceControl showValue={true} />);
            
            try {
              // Find the slider input
              const slider = screen.getByRole('slider', { name: /graph layout distance/i });
              expect(slider).toBeInTheDocument();
              
              // Verify slider value matches the distance
              expect(slider).toHaveValue(distance.toString());
              
              // Find the displayed numeric value
              const valueDisplay = container.querySelector('.distance-value');
              expect(valueDisplay).toBeInTheDocument();
              expect(valueDisplay?.textContent).toBe(distance.toString());
              
              // Verify they match
              expect(slider.getAttribute('value')).toBe(valueDisplay?.textContent);
            } finally {
              // Clean up after each iteration
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update displayed value when slider value changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          (initialDistance, newDistance) => {
            // Set initial distance
            useGraphStore.getState().setLayoutDistance(initialDistance);
            
            // Render the component
            const { container, rerender, unmount } = render(<DistanceControl showValue={true} />);
            
            try {
              // Verify initial state
              const slider = screen.getByRole('slider', { name: /graph layout distance/i });
              let valueDisplay = container.querySelector('.distance-value');
              expect(slider).toHaveValue(initialDistance.toString());
              expect(valueDisplay?.textContent).toBe(initialDistance.toString());
              
              // Update distance in store
              useGraphStore.getState().setLayoutDistance(newDistance);
              
              // Re-render to reflect the change
              rerender(<DistanceControl showValue={true} />);
              
              // Verify updated state
              valueDisplay = container.querySelector('.distance-value');
              expect(slider).toHaveValue(newDistance.toString());
              expect(valueDisplay?.textContent).toBe(newDistance.toString());
              
              // Verify they still match
              expect(slider.getAttribute('value')).toBe(valueDisplay?.textContent);
            } finally {
              // Clean up after each iteration
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across different prop configurations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          fc.boolean(), // showLabel
          fc.boolean(), // showValue
          (distance, showLabel, showValue) => {
            // Set the distance in the store
            useGraphStore.getState().setLayoutDistance(distance);
            
            // Render with different prop configurations
            const { container, unmount } = render(
              <DistanceControl 
                showLabel={showLabel} 
                showValue={showValue}
              />
            );
            
            try {
              // Find the slider
              const slider = screen.getByRole('slider', { name: /graph layout distance/i });
              expect(slider).toHaveValue(distance.toString());
              
              // If showValue is true, verify the display matches
              if (showValue) {
                const valueDisplay = container.querySelector('.distance-value');
                expect(valueDisplay).toBeInTheDocument();
                expect(valueDisplay?.textContent).toBe(distance.toString());
                expect(slider.getAttribute('value')).toBe(valueDisplay?.textContent);
              }
            } finally {
              // Clean up after each iteration
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display correct ARIA attributes matching the value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          (distance) => {
            // Set the distance in the store
            useGraphStore.getState().setLayoutDistance(distance);
            
            // Render the component
            const { unmount } = render(<DistanceControl />);
            
            try {
              // Find the slider
              const slider = screen.getByRole('slider', { name: /graph layout distance/i });
              
              // Verify ARIA attributes match the value
              expect(slider.getAttribute('aria-valuenow')).toBe(distance.toString());
              expect(slider.getAttribute('aria-valuetext')).toBe(`${distance} pixels`);
              expect(slider.getAttribute('aria-valuemin')).toBe('50');
              expect(slider.getAttribute('aria-valuemax')).toBe('500');
              
              // Verify the value attribute matches
              expect(slider.getAttribute('value')).toBe(distance.toString());
            } finally {
              // Clean up after each iteration
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases at boundaries', () => {
      const edgeCases = [50, 500]; // Min and max values
      
      edgeCases.forEach((distance) => {
        // Set the distance in the store
        useGraphStore.getState().setLayoutDistance(distance);
        
        // Render the component
        const { container, unmount } = render(<DistanceControl showValue={true} />);
        
        try {
          // Find the slider and value display
          const slider = screen.getByRole('slider', { name: /graph layout distance/i });
          const valueDisplay = container.querySelector('.distance-value');
          
          // Verify both show the same value
          expect(slider).toHaveValue(distance.toString());
          expect(valueDisplay?.textContent).toBe(distance.toString());
          expect(slider.getAttribute('value')).toBe(valueDisplay?.textContent);
        } finally {
          // Clean up after each iteration
          unmount();
          cleanup();
        }
      });
    });
  });
});

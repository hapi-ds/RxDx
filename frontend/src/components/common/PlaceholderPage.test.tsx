/**
 * Property tests for PlaceholderPage component
 * Feature: frontend-navigation-and-versioning
 * Property 7: Placeholder Page Content Rendering
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import { PlaceholderPage } from './PlaceholderPage';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PlaceholderPage - Property 7: Placeholder Page Content Rendering', () => {
  /**
   * Property 7: Placeholder Page Content Rendering
   * For any PlaceholderPage component with a given title and description,
   * the rendered output SHALL contain the title, the "Coming Soon" message,
   * and the description text.
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it('should render title, "Coming Soon" message, and description for any valid props', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
        (title, description, icon) => {
          const { unmount } = renderWithRouter(
            <PlaceholderPage title={title} description={description} icon={icon} />
          );

          // Requirement 3.1: THE System SHALL display the page title prominently
          const titleElement = screen.getByTestId('placeholder-title');
          expect(titleElement).toBeInTheDocument();
          expect(titleElement.textContent).toBe(title);

          // Requirement 3.2: THE System SHALL display a "Coming Soon" message
          const badgeElement = screen.getByTestId('placeholder-badge');
          expect(badgeElement).toBeInTheDocument();
          expect(badgeElement.textContent).toBe('Coming Soon');

          // Requirement 3.3: THE System SHALL display a brief description
          const descriptionElement = screen.getByTestId('placeholder-description');
          expect(descriptionElement).toBeInTheDocument();
          expect(descriptionElement.textContent).toBe(description);

          // Clean up for next iteration
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render icon when provided', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 10 }),
        (title, description, icon) => {
          const { unmount } = renderWithRouter(
            <PlaceholderPage title={title} description={description} icon={icon} />
          );

          const iconElement = screen.getByTestId('placeholder-icon');
          expect(iconElement).toBeInTheDocument();
          expect(iconElement.textContent).toBe(icon);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not render icon when not provided', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
        (title, description) => {
          const { unmount } = renderWithRouter(
            <PlaceholderPage title={title} description={description} />
          );

          expect(screen.queryByTestId('placeholder-icon')).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always include link back to Requirements page', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
        (title, description) => {
          const { unmount } = renderWithRouter(
            <PlaceholderPage title={title} description={description} />
          );

          // Requirement 3.5: THE Placeholder_Page SHALL include a link back to the Requirements page
          const link = screen.getByTestId('placeholder-link');
          expect(link).toBeInTheDocument();
          expect(link).toHaveAttribute('href', '/requirements');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

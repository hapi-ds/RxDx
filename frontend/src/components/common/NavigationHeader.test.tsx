/**
 * Unit tests for NavigationHeader component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavigationHeader } from './NavigationHeader';
import { navItems } from './NavigationHeader.types';
import type { User } from '../../stores/authStore';

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'user',
  isActive: true,
};

function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/requirements'] } = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
  );
}

describe('NavigationHeader', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    mockLogout.mockClear();
  });

  it('renders all navigation links', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />
    );

    navItems.forEach((item) => {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toBeInTheDocument();
    });
  });

  it('renders navigation links with correct paths', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />
    );

    navItems.forEach((item) => {
      const link = screen.getByRole('link', { name: new RegExp(item.label) });
      expect(link).toHaveAttribute('href', item.path);
    });
  });

  it('applies active state to current route link', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />,
      { initialEntries: ['/requirements'] }
    );

    const requirementsLink = screen.getByRole('link', { name: /Requirements/ });
    expect(requirementsLink).toHaveClass('nav-link-active');
    expect(requirementsLink).toHaveAttribute('aria-current', 'page');
  });

  it('applies active state correctly for each route', () => {
    navItems.forEach((item) => {
      const { unmount } = renderWithRouter(
        <NavigationHeader user={mockUser} onLogout={mockLogout} />,
        { initialEntries: [item.path] }
      );

      const activeLink = screen.getByRole('link', { name: new RegExp(item.label) });
      expect(activeLink).toHaveClass('nav-link-active');

      // Verify other links are not active
      navItems
        .filter((navItem) => navItem.path !== item.path)
        .forEach((navItem) => {
          const link = screen.getByRole('link', { name: new RegExp(navItem.label) });
          expect(link).not.toHaveClass('nav-link-active');
        });

      unmount();
    });
  });

  it('displays user full name when available', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays user email when full name is not available', () => {
    const userWithoutName: User = {
      ...mockUser,
      fullName: '',
    };

    renderWithRouter(
      <NavigationHeader user={userWithoutName} onLogout={mockLogout} />
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('triggers logout callback when logout button is clicked', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />
    );

    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('renders the brand name', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />
    );

    expect(screen.getByRole('heading', { name: 'RxDx' })).toBeInTheDocument();
  });

  it('renders navigation with proper accessibility attributes', () => {
    renderWithRouter(
      <NavigationHeader user={mockUser} onLogout={mockLogout} />
    );

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
  });
});

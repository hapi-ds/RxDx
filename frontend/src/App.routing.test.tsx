/**
 * Property-based tests for route protection and unknown route redirect
 * 
 * Feature: frontend-navigation-and-versioning
 * Property 5: Unknown Route Redirect
 * Property 6: Route Protection
 * 
 * **Validates: Requirements 2.8, 2.9**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as fc from 'fast-check';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/common';

// Define the protected routes in the application
const PROTECTED_ROUTES = [
  '/requirements',
  '/graph',
  '/tests',
  '/risks',
  '/schedule',
  '/kanban',
  '/documents',
];

// Define all valid routes
const ALL_VALID_ROUTES = ['/login', ...PROTECTED_ROUTES];

// Mock page components for testing
function MockLoginPage(): React.ReactElement {
  return <div data-testid="login-page">Login Page</div>;
}

function MockProtectedPage({ name }: { name: string }): React.ReactElement {
  return <div data-testid={`${name}-page`}>{name} Page</div>;
}

// AuthRedirect component (same logic as in App.tsx)
function AuthRedirect(): React.ReactElement {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/requirements" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

// Test router that mimics App.tsx routing structure
function TestRouter({ initialRoute }: { initialRoute: string }): React.ReactElement {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<MockLoginPage />} />
        <Route
          path="/requirements"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="requirements" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="graph" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tests"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="tests" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/risks"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="risks" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="schedule" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kanban"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="kanban" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <MockProtectedPage name="documents" />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<AuthRedirect />} />
      </Routes>
    </MemoryRouter>
  );
}

// Reset auth state and cleanup before each test
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});

afterEach(() => {
  cleanup();
});

describe('Property 5: Unknown Route Redirect', () => {
  /**
   * **Validates: Requirements 2.8**
   * 
   * For any route path that does not match a defined route, the system SHALL
   * redirect to the default authenticated page (/requirements for authenticated
   * users, /login for unauthenticated).
   */

  it('redirects unauthenticated users from unknown routes to login', () => {
    fc.assert(
      fc.property(
        // Generate random unknown route paths (alphanumeric only to avoid special chars)
        fc.stringMatching(/^[a-z][a-z0-9]{0,20}$/)
          .filter(s => !ALL_VALID_ROUTES.includes(`/${s}`))
          .map(s => `/${s}`),
        (unknownRoute) => {
          // Ensure user is not authenticated
          useAuthStore.setState({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });

          cleanup();
          render(<TestRouter initialRoute={unknownRoute} />);

          // Should redirect to login page
          expect(screen.getByTestId('login-page')).toBeInTheDocument();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('redirects authenticated users from unknown routes to requirements', () => {
    fc.assert(
      fc.property(
        // Generate random unknown route paths (alphanumeric only)
        fc.stringMatching(/^[a-z][a-z0-9]{0,20}$/)
          .filter(s => !ALL_VALID_ROUTES.includes(`/${s}`))
          .map(s => `/${s}`),
        (unknownRoute) => {
          // Set authenticated state
          useAuthStore.setState({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              fullName: 'Test User',
              role: 'user',
              isActive: true,
            },
            tokens: {
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              expiresAt: Date.now() + 3600000,
            },
            isAuthenticated: true,
            isLoading: false,
          });

          cleanup();
          render(<TestRouter initialRoute={unknownRoute} />);

          // Should redirect to requirements page (authenticated default)
          expect(screen.getByTestId('requirements-page')).toBeInTheDocument();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 6: Route Protection', () => {
  /**
   * **Validates: Requirements 2.9**
   * 
   * For any protected route (all routes except /login), accessing the route
   * without authentication SHALL redirect to /login.
   */

  it('redirects unauthenticated users from any protected route to login', () => {
    fc.assert(
      fc.property(
        // Generate any protected route
        fc.constantFrom(...PROTECTED_ROUTES),
        (protectedRoute) => {
          // Ensure user is not authenticated
          useAuthStore.setState({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });

          cleanup();
          render(<TestRouter initialRoute={protectedRoute} />);

          // Should redirect to login page
          expect(screen.getByTestId('login-page')).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows authenticated users to access any protected route', () => {
    fc.assert(
      fc.property(
        // Generate any protected route
        fc.constantFrom(...PROTECTED_ROUTES),
        (protectedRoute) => {
          // Set authenticated state
          useAuthStore.setState({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              fullName: 'Test User',
              role: 'user',
              isActive: true,
            },
            tokens: {
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              expiresAt: Date.now() + 3600000,
            },
            isAuthenticated: true,
            isLoading: false,
          });

          cleanup();
          render(<TestRouter initialRoute={protectedRoute} />);

          // Should NOT show login page
          expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
          
          // Should show the protected page
          const routeName = protectedRoute.slice(1); // Remove leading /
          expect(screen.getByTestId(`${routeName}-page`)).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('login route is accessible without authentication', () => {
    // Ensure user is not authenticated
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(<TestRouter initialRoute="/login" />);

    // Should show login page content
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});

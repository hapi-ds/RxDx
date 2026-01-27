/**
 * Unit tests for ProtectedRoute component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, RoleGate } from './ProtectedRoute';
import { withProtectedRoute } from './withProtectedRoute';
import { useAuthStore } from '../../stores/authStore';

// Wrapper component for router context
function RouterWrapper({ children, initialEntries = ['/protected'] }: { 
  children: React.ReactNode;
  initialEntries?: string[];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/protected" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('shows loading component when loading', () => {
    useAuthStore.setState({ isLoading: true });

    render(
      <RouterWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows custom loading component when provided', () => {
    useAuthStore.setState({ isLoading: true });

    render(
      <RouterWrapper>
        <ProtectedRoute loadingComponent={<div>Custom Loading</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });

    render(
      <RouterWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <RouterWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows unauthorized when user lacks required role', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <RouterWrapper>
        <ProtectedRoute requiredRoles={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('shows custom unauthorized component when provided', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <RouterWrapper>
        <ProtectedRoute
          requiredRoles={['admin']}
          unauthorizedComponent={<div>Custom Unauthorized</div>}
        >
          <div>Admin Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Custom Unauthorized')).toBeInTheDocument();
  });

  it('renders children when user has required role', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'admin',
        isActive: true,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <RouterWrapper>
        <ProtectedRoute requiredRoles={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('renders children when user has one of multiple required roles', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'project_manager',
        isActive: true,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <RouterWrapper>
        <ProtectedRoute requiredRoles={['admin', 'project_manager']}>
          <div>Manager Content</div>
        </ProtectedRoute>
      </RouterWrapper>
    );

    expect(screen.getByText('Manager Content')).toBeInTheDocument();
  });
});

describe('RoleGate', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('renders nothing when not authenticated', () => {
    render(
      <RoleGate allowedRoles={['admin']}>
        <div>Admin Only</div>
      </RoleGate>
    );

    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('renders fallback when not authenticated', () => {
    render(
      <RoleGate allowedRoles={['admin']} fallback={<div>Not Allowed</div>}>
        <div>Admin Only</div>
      </RoleGate>
    );

    expect(screen.getByText('Not Allowed')).toBeInTheDocument();
  });

  it('renders nothing when user lacks role', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
    });

    render(
      <RoleGate allowedRoles={['admin']}>
        <div>Admin Only</div>
      </RoleGate>
    );

    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('renders children when user has allowed role', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'admin',
        isActive: true,
      },
      isAuthenticated: true,
    });

    render(
      <RoleGate allowedRoles={['admin']}>
        <div>Admin Only</div>
      </RoleGate>
    );

    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });
});

describe('withProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('wraps component with ProtectedRoute and redirects when not authenticated', () => {
    const TestComponent = () => <div>Test Component</div>;
    const ProtectedTestComponent = withProtectedRoute(TestComponent);

    render(
      <RouterWrapper>
        <ProtectedTestComponent />
      </RouterWrapper>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Test Component')).not.toBeInTheDocument();
  });

  it('renders wrapped component when authenticated', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
    });

    const TestComponent = () => <div>Test Component</div>;
    const ProtectedTestComponent = withProtectedRoute(TestComponent);

    render(
      <RouterWrapper>
        <ProtectedTestComponent />
      </RouterWrapper>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('passes options to ProtectedRoute', () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
    });

    const TestComponent = () => <div>Admin Component</div>;
    const ProtectedTestComponent = withProtectedRoute(TestComponent, {
      requiredRoles: ['admin'],
    });

    render(
      <RouterWrapper>
        <ProtectedTestComponent />
      </RouterWrapper>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});

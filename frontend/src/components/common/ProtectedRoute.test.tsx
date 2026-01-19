/**
 * Unit tests for ProtectedRoute component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute, RoleGate, withProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../../stores/authStore';

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
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows custom loading component when provided', () => {
    useAuthStore.setState({ isLoading: true });

    render(
      <ProtectedRoute loadingComponent={<div>Custom Loading</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
  });

  it('shows fallback when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Please Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });

    render(
      <ProtectedRoute fallback={<div>Custom Fallback</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
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
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
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
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
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
      <ProtectedRoute
        requiredRoles={['admin']}
        unauthorizedComponent={<div>Custom Unauthorized</div>}
      >
        <div>Admin Content</div>
      </ProtectedRoute>
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
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
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
      <ProtectedRoute requiredRoles={['admin', 'project_manager']}>
        <div>Manager Content</div>
      </ProtectedRoute>
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

  it('wraps component with ProtectedRoute', () => {
    const TestComponent = () => <div>Test Component</div>;
    const ProtectedTestComponent = withProtectedRoute(TestComponent);

    render(<ProtectedTestComponent />);

    expect(screen.getByText('Please Sign In')).toBeInTheDocument();
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

    render(<ProtectedTestComponent />);

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

    render(<ProtectedTestComponent />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});

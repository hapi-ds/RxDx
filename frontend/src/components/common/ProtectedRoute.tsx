/**
 * ProtectedRoute component
 * Wraps routes that require authentication
 */

import React from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: User['role'][];
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
}

function DefaultLoading(): React.ReactElement {
  return (
    <div className="protected-route-loading">
      <div className="spinner" />
      <p>Loading...</p>
      <style>{`
        .protected-route-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          gap: 1rem;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function DefaultUnauthorized(): React.ReactElement {
  return (
    <div className="protected-route-unauthorized">
      <h2>Access Denied</h2>
      <p>You don't have permission to access this page.</p>
      <style>{`
        .protected-route-unauthorized {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          text-align: center;
          padding: 2rem;
        }
        .protected-route-unauthorized h2 {
          color: #dc2626;
          margin-bottom: 0.5rem;
        }
        .protected-route-unauthorized p {
          color: #666;
        }
      `}</style>
    </div>
  );
}

function DefaultFallback(): React.ReactElement {
  return (
    <div className="protected-route-fallback">
      <h2>Please Sign In</h2>
      <p>You need to be signed in to access this page.</p>
      <a href="/login" className="sign-in-link">
        Go to Sign In
      </a>
      <style>{`
        .protected-route-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          text-align: center;
          padding: 2rem;
        }
        .protected-route-fallback h2 {
          color: #333;
          margin-bottom: 0.5rem;
        }
        .protected-route-fallback p {
          color: #666;
          margin-bottom: 1rem;
        }
        .sign-in-link {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .sign-in-link:hover {
          background: #5a67d8;
        }
      `}</style>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps): React.ReactElement {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  // Show loading state
  if (isLoading) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <>{fallback || <DefaultFallback />}</>;
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = hasRole(requiredRoles);
    if (!hasRequiredRole) {
      return <>{unauthorizedComponent || <DefaultUnauthorized />}</>;
    }
  }

  // Authenticated and authorized
  return <>{children}</>;
}

/**
 * Higher-order component version of ProtectedRoute
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
): React.FC<P> {
  return function ProtectedComponent(props: P): React.ReactElement {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Component that only renders for specific roles
 */
interface RoleGateProps {
  children: ReactNode;
  allowedRoles: User['role'][];
  fallback?: ReactNode;
}

export function RoleGate({
  children,
  allowedRoles,
  fallback = null,
}: RoleGateProps): React.ReactElement | null {
  const { hasRole, isAuthenticated } = useAuth();

  if (!isAuthenticated || !hasRole(allowedRoles)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

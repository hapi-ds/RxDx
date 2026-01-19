/**
 * ProtectedRoute component
 * Wraps routes that require authentication
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: User['role'][];
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

export function ProtectedRoute({
  children,
  requiredRoles,
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps): React.ReactElement {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

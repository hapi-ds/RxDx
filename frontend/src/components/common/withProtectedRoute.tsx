import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import type { User } from '../../stores/authStore';

export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRoles?: User['role'][];
    loadingComponent?: React.ReactNode;
    unauthorizedComponent?: React.ReactNode;
  }
): React.FC<P> {
  return function ProtectedComponent(props: P): React.ReactElement {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
/**
 * Main App component with routing
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Login } from './pages/Login';
import { Requirements } from './pages/Requirements';
import { TestsPage } from './pages/TestsPage';
import { RisksPage } from './pages/RisksPage';
import { SchedulePage } from './pages/SchedulePage';
import { KanbanPage } from './pages/KanbanPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProtectedRoute, NavigationHeader, LoadingPage } from './components/common';
import { useAuthStore } from './stores/authStore';

// Lazy load GraphExplorer to prevent module-level errors from blocking the app
const GraphExplorer = React.lazy(() => 
  import('./pages/GraphExplorer').then(module => ({ default: module.GraphExplorer }))
);

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666' }}>{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              marginTop: '1rem',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Page-level error boundary that preserves navigation
 */
function PageErrorBoundary({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fff', margin: '1rem', borderRadius: '8px' }}>
          <h2 style={{ color: '#dc2626' }}>Page Error</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            This page encountered an error. You can navigate to another page or try reloading.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Reload Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

function AppLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <div className="app-layout">
      {isAuthenticated && (
        <NavigationHeader user={user} onLogout={logout} />
      )}
      <main className="app-main">
        {children}
      </main>
      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .app-main {
          flex: 1;
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}

function AuthRedirect(): React.ReactElement {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/requirements" replace />;
  }
  
  return <Navigate to="/login" replace />;
}

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/requirements"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <Requirements />
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route
          path="/graph"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingPage message="Loading Graph Explorer..." />}>
                    <GraphExplorer />
                  </Suspense>
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route
          path="/tests"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <TestsPage />
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route
          path="/risks"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <RisksPage />
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route
          path="/schedule"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <SchedulePage />
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route
          path="/kanban"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <KanbanPage />
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route
          path="/documents"
          element={
            <AppLayout>
              <ProtectedRoute>
                <PageErrorBoundary>
                  <DocumentsPage />
                </PageErrorBoundary>
              </ProtectedRoute>
            </AppLayout>
          }
        />
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<AuthRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

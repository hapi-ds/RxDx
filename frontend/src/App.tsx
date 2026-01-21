/**
 * Main App component with routing
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Login } from './pages/Login';
import { Requirements } from './pages/Requirements';
import { GraphExplorer } from './pages/GraphExplorer';
import { TestsPage } from './pages/TestsPage';
import { RisksPage } from './pages/RisksPage';
import { SchedulePage } from './pages/SchedulePage';
import { KanbanPage } from './pages/KanbanPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProtectedRoute, NavigationHeader } from './components/common';
import { useAuthStore } from './stores/authStore';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
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
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/requirements"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <Requirements />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/graph"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <GraphExplorer />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/tests"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <TestsPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/risks"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <RisksPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/schedule"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <SchedulePage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/kanban"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <KanbanPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/documents"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route path="/" element={<AuthRedirect />} />
          <Route path="*" element={<AuthRedirect />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

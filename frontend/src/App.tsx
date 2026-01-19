/**
 * Main App component with routing
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Login } from './pages/Login';
import { Requirements } from './pages/Requirements';
import { ProtectedRoute } from './components/common/ProtectedRoute';
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
        <header className="app-header">
          <div className="header-brand">
            <h1>RxDx</h1>
          </div>
          <nav className="header-nav">
            <a href="/requirements">Requirements</a>
          </nav>
          <div className="header-user">
            <span>{user?.fullName || user?.email}</span>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>
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
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.5rem;
          background: #1f2937;
          color: white;
        }
        .header-brand h1 {
          margin: 0;
          font-size: 1.25rem;
        }
        .header-nav {
          display: flex;
          gap: 1.5rem;
        }
        .header-nav a {
          color: #d1d5db;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .header-nav a:hover {
          color: white;
        }
        .header-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-user span {
          font-size: 0.875rem;
          color: #d1d5db;
        }
        .logout-btn {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid #4b5563;
          border-radius: 4px;
          color: #d1d5db;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: #374151;
          border-color: #6b7280;
          color: white;
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
          <Route path="/" element={<AuthRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

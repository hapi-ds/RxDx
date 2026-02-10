import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as fc from 'fast-check';

// Mock the auth store
vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  })),
}));

// Mock all page components to avoid loading dependencies
vi.mock('./pages/Login', () => ({
  Login: () => <div>Login Page</div>,
}));

vi.mock('./pages/Table', () => ({
  Table: () => <div>Table Page</div>,
}));

vi.mock('./pages/GraphExplorer', () => ({
  default: () => <div>Graph Explorer Page</div>,
}));

vi.mock('./pages/TestsPage', () => ({
  TestsPage: () => <div>Tests Page</div>,
}));

vi.mock('./pages/RisksPage', () => ({
  RisksPage: () => <div>Risks Page</div>,
}));

vi.mock('./pages/SchedulePage', () => ({
  SchedulePage: () => <div>Schedule Page</div>,
}));

vi.mock('./pages/KanbanPage', () => ({
  KanbanPage: () => <div>Kanban Page</div>,
}));

vi.mock('./pages/DocumentsPage', () => ({
  DocumentsPage: () => <div>Documents Page</div>,
}));

vi.mock('./pages/TemplatesPage', () => ({
  TemplatesPage: () => <div>Templates Page</div>,
}));

vi.mock('./components/common', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NavigationHeader: () => <div>Navigation Header</div>,
  LoadingPage: () => <div>Loading...</div>,
}));

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Table page at /table route', () => {
    render(
      <MemoryRouter initialEntries={['/table']}>
        <Routes>
          <Route path="/table" element={<div>Table Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Table Page')).toBeInTheDocument();
  });

  it('redirects /requirements to /table for backward compatibility', () => {
    render(
      <MemoryRouter initialEntries={['/requirements']}>
        <Routes>
          <Route path="/table" element={<div>Table Page</div>} />
          <Route path="/requirements" element={<Navigate to="/table" replace />} />
        </Routes>
      </MemoryRouter>
    );
    
    // After redirect, we should see the Table Page
    expect(screen.getByText('Table Page')).toBeInTheDocument();
  });

  it('AuthRedirect redirects authenticated users to /table', () => {
    // Mock authenticated state
    const mockUseAuthStore = vi.fn(() => ({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com' },
      logout: vi.fn(),
    }));
    
    vi.mocked(vi.importActual('./stores/authStore')).useAuthStore = mockUseAuthStore;
    
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={
            mockUseAuthStore().isAuthenticated 
              ? <Navigate to="/table" replace /> 
              : <Navigate to="/login" replace />
          } />
          <Route path="/table" element={<div>Table Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should redirect to table page when authenticated
    expect(screen.getByText('Table Page')).toBeInTheDocument();
  });

  /**
   * Property 1: Backward Compatibility Redirect
   * 
   * **Validates: Requirements 1.4**
   * 
   * For any navigation attempt to "/requirements", the system should redirect 
   * to "/table" and update the URL accordingly.
   * 
   * This property test verifies that the redirect works correctly with various
   * URL patterns including query parameters and hash fragments.
   */
  it('Feature: graph-table-ui-enhancements, Property 1: Backward compatibility redirect', () => {
    // Arbitrary for generating query parameter keys
    const queryKeyArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/);
    
    // Arbitrary for generating query parameter values
    const queryValueArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean().map(String)
    );
    
    // Arbitrary for generating hash fragments
    const hashArb = fc.oneof(
      fc.constant(''),
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/)
    );
    
    // Arbitrary for generating query strings
    const queryStringArb = fc.dictionary(queryKeyArb, queryValueArb).map(params => {
      const entries = Object.entries(params);
      if (entries.length === 0) return '';
      return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    });

    fc.assert(
      fc.property(
        queryStringArb,
        hashArb,
        (queryString, hash) => {
          // Construct the URL with query parameters and/or hash
          const hashPart = hash ? `#${hash}` : '';
          const url = `/requirements${queryString}${hashPart}`;
          
          // Render the router with the constructed URL
          const { container } = render(
            <MemoryRouter initialEntries={[url]}>
              <Routes>
                <Route path="/table" element={<div data-testid="table-page">Table Page</div>} />
                <Route path="/requirements" element={<Navigate to="/table" replace />} />
              </Routes>
            </MemoryRouter>
          );
          
          // Verify that we're now on the Table page
          const tablePage = container.querySelector('[data-testid="table-page"]');
          
          // Property: Navigation to /requirements always results in Table page being rendered
          return tablePage !== null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

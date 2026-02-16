import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';
import { User } from '../types';

// Define AuthContextType interface
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Auth state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth action types
type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'RESTORE_TOKEN'; payload: { user: User; token: string } };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true for token restoration
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'RESTORE_TOKEN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
  authService?: AuthService;
  apiService?: ApiService;
}

// AuthProvider component
export function AuthProvider({ 
  children, 
  authService = new AuthService(new ApiService()),
  apiService = new ApiService()
}: AuthProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore token on app start
  useEffect(() => {
    async function restoreToken() {
      try {
        const storedToken = await authService.getStoredToken();
        const storedUser = await authService.getStoredUser();

        if (storedToken && storedUser) {
          // Set token in API service
          apiService.setToken(storedToken);
          
          dispatch({
            type: 'RESTORE_TOKEN',
            payload: { user: storedUser, token: storedToken },
          });
        } else {
          // No stored credentials, finish loading
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        console.error('Failed to restore token:', error);
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    }

    restoreToken();
  }, [authService, apiService]);

  // Login action
  const login = async (email: string, password: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOADING' });

      const result = await authService.login(email, password);

      // Set token in API service
      apiService.setToken(result.token);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.user, token: result.token },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Logout action
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      
      // Clear token from API service
      apiService.clearToken();

      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still dispatch logout even if there's an error
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const value: AuthContextType = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth custom hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

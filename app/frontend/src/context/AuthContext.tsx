import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { পার্থক্য } from "@mui/material";

interface User {
  id: number;
  name: string;
  email: string;
  // Add other user fields if returned by your API
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextProps extends AuthState {
  // Add login/logout functions here if needed later
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true, // Start in loading state
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`);
        if (!response.ok) {
          // Handle non-2xx responses (e.g., 401 Unauthorized)
          if (response.status === 401) {
             console.log('User not authenticated.');
             setAuthState({ isAuthenticated: false, user: null, isLoading: false });
          } else {
             throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
           const data = await response.json();
           console.log('Auth status checked:', data);
           setAuthState({
             isAuthenticated: data.isAuthenticated,
             user: data.user || null,
             isLoading: false,
           });
        }
      } catch (error) {
        console.error('Error fetching auth status:', error);
        setAuthState({ isAuthenticated: false, user: null, isLoading: false });
      }
    };

    checkAuth();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}; 
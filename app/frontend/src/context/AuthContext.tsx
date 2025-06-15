import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  onboarding_complete?: boolean;
  onboardingComplete?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (user: User, redirect?: string | false) => void;
  logout: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const fetchUserStatus = async (): Promise<User | null> => {
  try {
    console.log('🔍 Fetching user status...');
    const response = await api.get('/api/auth/status');
    console.log('📋 Auth status response:', response.data);
    
    if (response.data && response.data.authenticated) {
      // Normalize the onboarding status field names for consistency
      const user = response.data.user;
      user.onboarding_complete = user.onboardingComplete || user.onboarding_complete || false;
      console.log('✅ User authenticated:', user);
      return user;
    }
    console.log('❌ User not authenticated');
    return null;
  } catch (error) {
    console.error('🚨 Error fetching user status:', error);
    return null;
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ['userStatus'],
    queryFn: fetchUserStatus,
    staleTime: 15 * 60 * 1000, // 15 minutes instead of 5
    refetchOnWindowFocus: false, // Disable aggressive refetching
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes instead of on focus
  });

  const login = useCallback((newUser: User, redirect: string | false = '/dashboard') => {
    queryClient.setQueryData(['userStatus'], newUser);
    if (redirect) {
      navigate(redirect);
    }
  }, [queryClient, navigate]);

  const logout = useCallback(() => {
    console.log('🚪 Logout function called');
    queryClient.setQueryData(['userStatus'], null);
    console.log('🗑️ Cleared user data from query cache');
    
    api.post('/api/auth/logout')
      .then((response) => {
        console.log('✅ Logout API success:', response.data);
      })
      .catch((error) => {
        console.error('❌ Logout API error:', error);
      })
      .finally(() => {
        console.log('🔄 Navigating to login page');
        navigate('/login');
      });
  }, [queryClient, navigate]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      isLoading,
      login,
      logout,
      refetchUser: refetch,
    }}>
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
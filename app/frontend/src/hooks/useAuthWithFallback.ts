import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  name?: string;
  onboarding_complete?: boolean;
  onboardingComplete?: boolean;
}

/**
 * Custom hook for auth that handles backend unavailability gracefully
 */
export function useAuthWithFallback() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ['userStatus'],
    queryFn: async () => {
      try {
        const { fetchUserStatusWithRetry } = await import('@/lib/apiWithTimeout');
        return await fetchUserStatusWithRetry();
      } catch (err: any) {
        // If backend is completely unavailable, return null instead of throwing
        if (err?.code === 'ERR_NETWORK') {
          console.log('Backend unavailable - continuing without auth');
          return null;
        }
        throw err;
      }
    },
    staleTime: 15 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry network errors
      if (error?.code === 'ERR_NETWORK') {
        return false;
      }
      return failureCount < 1;
    },
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // If we have a network error, treat it as unauthenticated but loaded
  const isNetworkError = (error as any)?.code === 'ERR_NETWORK';
  const effectiveLoading = isLoading && !isNetworkError;

  return {
    user,
    isLoading: effectiveLoading,
    error: isNetworkError ? null : error,
    refetch,
    isOffline: isNetworkError,
  };
}

import { QueryClient } from '@tanstack/react-query';

// Create a QueryClient with better error handling for backend unavailability
export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry network errors
        if (error?.code === 'ERR_NETWORK') {
          return false;
        }
        // Only retry once for other errors
        return failureCount < 1;
      },
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // Handle errors gracefully
      onError: (error: any) => {
        console.error('Query error:', error);
        // Don't throw for network errors - let the app continue
        if (error?.code === 'ERR_NETWORK') {
          console.log('Backend unavailable - continuing in offline mode');
        }
      },
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

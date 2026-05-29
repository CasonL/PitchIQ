/**
 * API utility with timeout and retry logic to prevent app hanging on cold starts
 */

import api from './axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

interface RetryConfig {
  maxRetries?: number;
  timeoutMs?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 1,  // Reduced from 2 to fail faster
  timeoutMs: 5000,  // Reduced from 8000ms to 5000ms
  retryDelay: 1000  // Reduced from 2000ms to 1000ms
};

/**
 * API call with automatic timeout and retry logic for backend cold starts
 */
export async function apiWithRetry<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  retryConfig: RetryConfig = {}
): Promise<AxiosResponse<T> | null> {
  const { maxRetries, timeoutMs, retryDelay } = { ...DEFAULT_CONFIG, ...retryConfig };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 API call to ${url} (attempt ${attempt}/${maxRetries})`);
      
      const response = await api.request<T>({
        url,
        timeout: timeoutMs,
        ...config
      });
      
      console.log(`✅ API call succeeded on attempt ${attempt}`);
      return response;
      
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryableError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNABORTED' || 
        (error.response && error.response.status >= 500);
      
      console.error(`❌ API call failed (attempt ${attempt}/${maxRetries}):`, {
        url,
        message: error.message,
        code: error.code,
        status: error.response?.status
      });
      
      if (!isLastAttempt && isRetryableError) {
        const delay = retryDelay * attempt;
        console.log(`⏳ Retrying in ${delay/1000}s (backend likely cold starting)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Last attempt or non-retryable error
      if (error.code === 'ECONNABORTED') {
        console.log('⚠️ Request timeout - backend may be cold starting');
      } else if (error.code === 'ERR_NETWORK') {
        console.log('⚠️ Network error - backend may be unavailable');
      }
      
      return null;
    }
  }
  
  return null;
}

/**
 * Specifically for user status checks with graceful degradation
 */
export async function fetchUserStatusWithRetry(): Promise<any> {
  console.log('🔍 Fetching user status with timeout protection...');
  
  // For initial load, use more aggressive retry strategy
  const isInitialLoad = !sessionStorage.getItem('pitchiq_loaded');
  
  const response = await apiWithRetry('/api/auth/status', {
    method: 'GET'
  }, isInitialLoad ? {
    maxRetries: 3,  // Try 3 times on initial load
    timeoutMs: 10000,  // 10 seconds for cold start
    retryDelay: 2000  // 2 seconds between retries
  } : {});
  
  // Mark that we've loaded once
  if (isInitialLoad) {
    sessionStorage.setItem('pitchiq_loaded', 'true');
  }
  
  if (!response) {
    console.log('⚠️ User status unavailable - continuing with unauthenticated state');
    return null;
  }
  
  if (response.data && response.data.authenticated) {
    const user = response.data.user;
    user.onboarding_complete = user.onboardingComplete || user.onboarding_complete || false;
    console.log('✅ User authenticated');
    return user;
  }
  
  console.log('❌ User not authenticated');
  return null;
}

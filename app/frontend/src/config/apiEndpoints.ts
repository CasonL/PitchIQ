/**
 * Centralized API endpoint configuration
 * Single source of truth for all backend/proxy endpoints
 */

// Get backend base URL from environment variable
// In production (Netlify), this should point to the Render backend
// In development, it can be empty to use relative URLs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper to build full URL
const buildUrl = (path: string): string => {
  // If API_BASE_URL is set, use it as absolute base
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }
  // Otherwise use relative path (for local dev when frontend and backend are same origin)
  return path;
};

export const API_ENDPOINTS = {
  // OpenAI proxy endpoint (via backend)
  OPENAI_CHAT: buildUrl('/api/openai/chat'),
  
  // Add other endpoints as needed
  // DEEPGRAM_TOKEN: buildUrl('/api/deepgram/token'),
  // etc.
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];

// Export the base URL for debugging
export const getApiBaseUrl = () => API_BASE_URL;

// Log configuration on load (helps with debugging)
if (API_BASE_URL) {
  console.log('🔗 API Base URL configured:', API_BASE_URL);
} else {
  console.log('🔗 Using relative API URLs (local development)');
}

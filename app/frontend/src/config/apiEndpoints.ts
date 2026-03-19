/**
 * Centralized API endpoint configuration
 * Single source of truth for all backend/proxy endpoints
 */

export const API_ENDPOINTS = {
  // OpenAI proxy endpoint (via backend)
  OPENAI_CHAT: '/api/openai/chat',
  
  // Add other endpoints as needed
  // DEEPGRAM_TOKEN: '/api/deepgram/token',
  // etc.
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];

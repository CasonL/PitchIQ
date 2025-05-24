/**
 * API Service
 * 
 * This module provides methods for interacting with the Flask API endpoints.
 */

/**
 * Helper function to handle API requests
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch API options
 * @returns {Promise} - Promise that resolves to the API response
 */
const fetchApi = async (url, options = {}) => {
  // Set default headers for JSON content
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add credentials to include cookies in the request
  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    // Check if response is successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }
    
    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

/**
 * API service object with methods for each endpoint
 */
const api = {
  /**
   * Get user profile information
   * @returns {Promise} User profile data
   */
  getUserProfile: () => fetchApi('/api/user/profile'),
  
  /**
   * Get user performance metrics
   * @returns {Promise} User metrics data
   */
  getUserMetrics: () => fetchApi('/api/user/metrics'),
  
  /**
   * Get list of user's training sessions
   * @param {Object} params - Query parameters
   * @returns {Promise} List of sessions
   */
  getSessions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/api/sessions?${queryString}`);
  },
  
  /**
   * Get details for a specific session
   * @param {number} sessionId - Session ID
   * @returns {Promise} Session details
   */
  getSessionDetails: (sessionId) => fetchApi(`/api/sessions/${sessionId}`),
  
  /**
   * Get transcript for a specific session
   * @param {number} sessionId - Session ID
   * @returns {Promise} Session transcript
   */
  getSessionTranscript: (sessionId) => fetchApi(`/api/sessions/${sessionId}/transcript`),
  
  /**
   * Generate AI insights for dashboard cards
   * @returns {Promise} AI-generated insights
   */
  generateInsights: () => fetchApi('/api/insights/generate'),
  
  /**
   * Send a message to the AI coach for a specific insight
   * @param {Object} data - Message data
   * @returns {Promise} AI coach response
   */
  sendCoachMessage: (data) => fetchApi('/api/insights/chat', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  /**
   * Get dashboard data - a combined endpoint that returns all needed dashboard data
   * @returns {Promise} Dashboard data
   */
  getDashboardData: () => fetchApi('/api/dashboard'),
};

export default api; 
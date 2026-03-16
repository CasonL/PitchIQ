import axios from 'axios';
import { toast } from "@/components/ui/use-toast";

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

console.log(' API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending cookies
});

// Function to get the CSRF token from the backend
const getCsrfToken = async () => {
    try {
        // Use the configured 'api' instance and a relative path
        const { data } = await api.get('/api/auth/csrf-token');
        return data.csrfToken;
    } catch (error) {
        console.error('Could not fetch CSRF token:', error);
        return null;
    }
};

// Add a request interceptor to attach the CSRF token
api.interceptors.request.use(async (config) => {
  // We only need to add the token for methods that are not 'GET', 'HEAD', 'OPTIONS'
  const methodsRequiringCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (config.method && methodsRequiringCsrf.includes(config.method.toUpperCase())) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api; 
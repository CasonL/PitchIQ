import axios from 'axios';
import { toast } from "@/components/ui/use-toast";

const api = axios.create({
  // baseURL: 'http://localhost:8080/api', // No longer needed, Vite proxy will handle it.
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
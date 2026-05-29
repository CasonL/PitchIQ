/**
 * Backend wake-up utility to prevent cold start delays
 * Sends a lightweight ping to wake up the backend before the main app loads
 */

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function wakeUpBackend() {
  if (!BACKEND_URL) {
    console.log('🏠 Local development - no backend wake-up needed');
    return;
  }

  console.log('🌅 Waking up backend at:', BACKEND_URL);
  
  try {
    // Send a lightweight health check to wake up the backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      // Don't include credentials for wake-up call
      credentials: 'omit',
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Backend is awake and ready');
    } else {
      console.log('⚠️ Backend responded with:', response.status);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('⏱️ Backend wake-up timed out (cold start in progress)');
    } else {
      console.log('🔄 Backend is cold starting...', error.message);
    }
  }
}

// Start waking up the backend immediately when this module loads
if (typeof window !== 'undefined') {
  wakeUpBackend();
}

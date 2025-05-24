/**
 * Logger utility to control console output based on environment
 */

// Only enable verbose logging in development
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Log groups for targeted debugging
export type LogGroup = 'rendering' | 'state' | 'api' | 'storage' | 'flow';

// Configurable log levels by group
const ENABLED_GROUPS: Record<LogGroup, boolean> = {
  rendering: false,  // Very noisy, disable by default
  state: true,       // State transitions
  api: true,         // API calls
  storage: true,     // LocalStorage operations
  flow: true,        // Flow/routing transitions
};

export const logger = {
  // Debug logs (development only and only if group is enabled)
  debug: (group: LogGroup, message: string, ...args: any[]) => {
    if (DEBUG_MODE && ENABLED_GROUPS[group]) {
      console.log(`[${group}] ${message}`, ...args);
    }
  },
  
  // Always show errors
  error: (message: string, ...args: any[]) => {
    console.error(`[error] ${message}`, ...args);
  },
  
  // Important app events (always show)
  info: (message: string, ...args: any[]) => {
    console.log(`[info] ${message}`, ...args);
  }
};

export default logger; 
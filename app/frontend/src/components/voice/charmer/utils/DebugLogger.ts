/**
 * DebugLogger.ts
 * Production-safe logging utility with toggle
 * 
 * Replaces raw console.log calls with conditional logging
 * that can be disabled in production builds
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class DebugLogger {
  private static enabled = process.env.NODE_ENV === 'development';
  private static minLevel: LogLevel = 'debug';
  
  private static levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  /**
   * Enable/disable logging at runtime
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Set minimum log level (filters out lower priority logs)
   */
  static setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
  
  /**
   * Check if logging is enabled for this level
   */
  private static shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }
  
  /**
   * Debug logs (development only)
   */
  static debug(component: string, message: string, data?: any): void {
    if (!this.shouldLog('debug')) return;
    
    if (data !== undefined) {
      console.log(`🔧 [${component}] ${message}`, data);
    } else {
      console.log(`🔧 [${component}] ${message}`);
    }
  }
  
  /**
   * Info logs (important state changes)
   */
  static info(component: string, message: string, data?: any): void {
    if (!this.shouldLog('info')) return;
    
    if (data !== undefined) {
      console.log(`ℹ️ [${component}] ${message}`, data);
    } else {
      console.log(`ℹ️ [${component}] ${message}`);
    }
  }
  
  /**
   * Warning logs (recoverable issues)
   */
  static warn(component: string, message: string, data?: any): void {
    if (!this.shouldLog('warn')) return;
    
    if (data !== undefined) {
      console.warn(`⚠️ [${component}] ${message}`, data);
    } else {
      console.warn(`⚠️ [${component}] ${message}`);
    }
  }
  
  /**
   * Error logs (always logged, even in production)
   */
  static error(component: string, message: string, error?: any): void {
    if (error !== undefined) {
      console.error(`❌ [${component}] ${message}`, error);
    } else {
      console.error(`❌ [${component}] ${message}`);
    }
    
    // In production, could send to error tracking service (Sentry, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
    }
  }
  
  /**
   * Timing utility - measure performance
   */
  static time(component: string, label: string): void {
    if (!this.shouldLog('debug')) return;
    console.time(`⏱️ [${component}] ${label}`);
  }
  
  static timeEnd(component: string, label: string): void {
    if (!this.shouldLog('debug')) return;
    console.timeEnd(`⏱️ [${component}] ${label}`);
  }
  
  /**
   * Group related logs
   */
  static group(component: string, label: string): void {
    if (!this.shouldLog('debug')) return;
    console.group(`📂 [${component}] ${label}`);
  }
  
  static groupEnd(): void {
    if (!this.shouldLog('debug')) return;
    console.groupEnd();
  }
  
  /**
   * Table view for structured data
   */
  static table(component: string, label: string, data: any): void {
    if (!this.shouldLog('debug')) return;
    console.log(`📊 [${component}] ${label}`);
    console.table(data);
  }
}

/**
 * Convenience exports for common components
 */
export const CharmerLog = {
  debug: (msg: string, data?: any) => DebugLogger.debug('CharmerController', msg, data),
  info: (msg: string, data?: any) => DebugLogger.info('CharmerController', msg, data),
  warn: (msg: string, data?: any) => DebugLogger.warn('CharmerController', msg, data),
  error: (msg: string, error?: any) => DebugLogger.error('CharmerController', msg, error),
};

export const VoiceLog = {
  debug: (msg: string, data?: any) => DebugLogger.debug('MarcusVoice', msg, data),
  info: (msg: string, data?: any) => DebugLogger.info('MarcusVoice', msg, data),
  warn: (msg: string, data?: any) => DebugLogger.warn('MarcusVoice', msg, data),
  error: (msg: string, error?: any) => DebugLogger.error('MarcusVoice', msg, error),
};

export const StorageLog = {
  debug: (msg: string, data?: any) => DebugLogger.debug('LocalStorage', msg, data),
  info: (msg: string, data?: any) => DebugLogger.info('LocalStorage', msg, data),
  warn: (msg: string, data?: any) => DebugLogger.warn('LocalStorage', msg, data),
  error: (msg: string, error?: any) => DebugLogger.error('LocalStorage', msg, error),
};

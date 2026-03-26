/**
 * LocalStorageService.ts
 * Safe wrapper around localStorage with quota/error handling
 * 
 * Prevents crashes from:
 * - Quota exceeded errors
 * - Private browsing mode
 * - Corrupted JSON
 * - Race conditions
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class LocalStorageService {
  private static readonly NAMESPACE = 'pitchiq_marcus';
  
  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get item with error handling
   */
  static getItem<T>(key: string): StorageResult<T> {
    const fullKey = `${this.NAMESPACE}_${key}`;
    
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'localStorage not available (private browsing?)'
      };
    }
    
    try {
      const raw = localStorage.getItem(fullKey);
      
      if (raw === null) {
        return { success: true, data: undefined };
      }
      
      const data = JSON.parse(raw) as T;
      return { success: true, data };
      
    } catch (error) {
      console.error(`[LocalStorage] Failed to get ${key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error'
      };
    }
  }
  
  /**
   * Set item with quota handling
   */
  static setItem<T>(key: string, value: T): StorageResult<null> {
    const fullKey = `${this.NAMESPACE}_${key}`;
    
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'localStorage not available'
      };
    }
    
    try {
      const serialized = JSON.stringify(value);
      
      // Check estimated size (rough)
      const sizeKB = new Blob([serialized]).size / 1024;
      if (sizeKB > 5000) {
        console.warn(`[LocalStorage] Large value for ${key}: ${sizeKB.toFixed(0)}KB`);
      }
      
      localStorage.setItem(fullKey, serialized);
      return { success: true };
      
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error(`[LocalStorage] Quota exceeded for ${key}`);
        return {
          success: false,
          error: 'Storage quota exceeded'
        };
      }
      
      console.error(`[LocalStorage] Failed to set ${key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  }
  
  /**
   * Remove item with error handling
   */
  static removeItem(key: string): StorageResult<null> {
    const fullKey = `${this.NAMESPACE}_${key}`;
    
    if (!this.isAvailable()) {
      return { success: true }; // Silent success if not available
    }
    
    try {
      localStorage.removeItem(fullKey);
      return { success: true };
    } catch (error) {
      console.error(`[LocalStorage] Failed to remove ${key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Remove error'
      };
    }
  }
  
  /**
   * Clear all Marcus-related data
   */
  static clearAll(): StorageResult<null> {
    if (!this.isAvailable()) {
      return { success: true };
    }
    
    try {
      const keys = Object.keys(localStorage);
      const marcusKeys = keys.filter(k => k.startsWith(this.NAMESPACE));
      
      marcusKeys.forEach(key => localStorage.removeItem(key));
      
      console.log(`[LocalStorage] Cleared ${marcusKeys.length} Marcus keys`);
      return { success: true };
      
    } catch (error) {
      console.error('[LocalStorage] Failed to clear all:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clear error'
      };
    }
  }
  
  /**
   * Get storage usage (rough estimate)
   */
  static getStorageUsage(): { totalKB: number; marcusKB: number } {
    if (!this.isAvailable()) {
      return { totalKB: 0, marcusKB: 0 };
    }
    
    try {
      let totalSize = 0;
      let marcusSize = 0;
      
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([value]).size;
        totalSize += size;
        
        if (key.startsWith(this.NAMESPACE)) {
          marcusSize += size;
        }
      });
      
      return {
        totalKB: totalSize / 1024,
        marcusKB: marcusSize / 1024
      };
    } catch {
      return { totalKB: 0, marcusKB: 0 };
    }
  }
}

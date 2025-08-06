// ProspectCallEventBus.ts - Event bus for prospect call events
type EventCallback = (data: any) => void;

interface EventMap {
  [eventName: string]: EventCallback[];
}

/**
 * Event bus for prospect call events
 * Provides a reliable way for components to communicate about call events
 * Enhanced with session ID tracking to prevent session ID mismatches
 */
export class ProspectCallEventBus {
  private static instance: ProspectCallEventBus;
  private events: EventMap = {};
  private activeSessionId: string | null = null;
  private sessionStartTime: number | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProspectCallEventBus {
    if (!ProspectCallEventBus.instance) {
      ProspectCallEventBus.instance = new ProspectCallEventBus();
    }
    return ProspectCallEventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  public on(eventName: string, callback: EventCallback): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  public off(eventName: string, callback: EventCallback): void {
    if (!this.events[eventName]) {
      return;
    }
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
  }

  /**
   * Emit an event
   */
  public emit(eventName: string, data: any = {}): void {
    if (!this.events[eventName]) {
      return;
    }
    
    // Add timestamp to event data
    const eventData = {
      ...data,
      timestamp: Date.now()
    };
    
    // Call all callbacks
    this.events[eventName].forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Remove all event listeners
   */
  public clear(): void {
    this.events = {};
  }
  
  /**
   * Set the active session ID
   * @param sessionId - The session ID to set as active
   */
  public setActiveSession(sessionId: string): void {
    this.activeSessionId = sessionId;
    this.sessionStartTime = Date.now();
    this.emit('session_started', { sessionId });
  }
  
  /**
   * Get the active session ID
   * @returns The current active session ID or null if none is active
   */
  public getActiveSession(): string | null {
    return this.activeSessionId;
  }
  
  /**
   * Clear the active session ID
   * @param sessionId - Optional session ID to verify before clearing
   * @returns True if cleared successfully, false if sessionId doesn't match active session
   */
  public clearActiveSession(sessionId?: string): boolean {
    // If a specific sessionId is provided, only clear if it matches the active session
    if (sessionId && sessionId !== this.activeSessionId) {
      console.warn(`Attempt to clear non-matching session ID: ${sessionId} vs active ${this.activeSessionId}`);
      return false;
    }
    
    const oldSessionId = this.activeSessionId;
    this.activeSessionId = null;
    this.sessionStartTime = null;
    
    if (oldSessionId) {
      this.emit('session_ended', { sessionId: oldSessionId });
    }
    
    return true;
  }
  
  /**
   * Verify that a session ID matches the active session
   * @param sessionId - The session ID to verify
   * @returns True if the session ID matches the active session, false otherwise
   */
  public verifySessionId(sessionId: string): boolean {
    if (!this.activeSessionId) {
      console.warn(`No active session when verifying session ID: ${sessionId}`);
      return false;
    }
    
    const isValid = sessionId === this.activeSessionId;
    if (!isValid) {
      console.warn(`Session ID mismatch: ${sessionId} vs active ${this.activeSessionId}`);
    }
    
    return isValid;
  }
  
  /**
   * Get the duration of the current session in milliseconds
   * @returns The duration of the current session or 0 if no session is active
   */
  public getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Remove all listeners for a specific event
   */
  public clearEvent(eventName: string): void {
    if (this.events[eventName]) {
      delete this.events[eventName];
    }
  }
}

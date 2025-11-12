// CallMonitoring.ts - Analytics and monitoring for voice calls
import { Persona } from '../../types/persona';
import { PersonaData } from './DualVoiceAgentFlow';

// Define a union type that can be either Persona or PersonaData
type PersonaType = Persona | PersonaData;

interface CallMetrics {
  sessionId: string;
  personaName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  terminationReason?: string;
  reconnectAttempts: number;
  audioProcessingErrors: number;
  webSocketErrors: number;
  sentenceCount: number;
  averageSentenceLength: number;
  voiceId: string;
  userInteractions: number;
  agentGreetingStartAt?: number;
  firstUserSpeechAt?: number;
  timeToFirstUserSpeechMs?: number;
}

interface CallEvent {
  timestamp: number;
  eventType: string;
  details: any;
  sessionId: string;
}

export class CallMonitoring {
  private static instance: CallMonitoring;
  private activeCallMetrics: Map<string, CallMetrics> = new Map();
  private callEvents: CallEvent[] = [];
  private metricsEndpoint = '/api/call-metrics';
  private flushInterval: number | null = null;
  
  private constructor() {
    // Private constructor for singleton
    this.startPeriodicFlush();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CallMonitoring {
    if (!CallMonitoring.instance) {
      CallMonitoring.instance = new CallMonitoring();
    }
    return CallMonitoring.instance;
  }
  
  /**
   * Start a new call monitoring session
   */
  startCall(sessionId: string, persona: PersonaType, voiceId: string): void {
    const metrics: CallMetrics = {
      sessionId,
      personaName: persona.name,
      startTime: Date.now(),
      reconnectAttempts: 0,
      audioProcessingErrors: 0,
      webSocketErrors: 0,
      sentenceCount: 0,
      averageSentenceLength: 0,
      voiceId,
      userInteractions: 0
    };
    
    this.activeCallMetrics.set(sessionId, metrics);
    this.logEvent(sessionId, 'call_started', { persona: persona.name, voiceId });
    
    console.log(`📊 Call monitoring started for session ${sessionId}`);
  }
  
  /**
   * End call monitoring session
   */
  endCall(sessionId: string, reason: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.terminationReason = reason;
    
    this.logEvent(sessionId, 'call_ended', { 
      duration: metrics.duration,
      reason
    });
    
    // Send final metrics
    this.sendMetrics(sessionId);
    
    // Remove from active calls
    this.activeCallMetrics.delete(sessionId);
    
    console.log(`📊 Call monitoring ended for session ${sessionId}`);
  }
  
  /**
   * Record a reconnection attempt
   */
  recordReconnect(sessionId: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.reconnectAttempts++;
    this.logEvent(sessionId, 'reconnect_attempt', { count: metrics.reconnectAttempts });
  }
  
  /**
   * Record an audio processing error
   */
  recordAudioError(sessionId: string, error: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.audioProcessingErrors++;
    this.logEvent(sessionId, 'audio_error', { error });
  }
  
  /**
   * Record a WebSocket error
   */
  recordWebSocketError(sessionId: string, error: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.webSocketErrors++;
    this.logEvent(sessionId, 'websocket_error', { error });
  }
  
  /**
   * Record a sentence from the AI
   */
  recordSentence(sessionId: string, sentence: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.sentenceCount++;
    
    // Update average sentence length
    const newTotal = (metrics.averageSentenceLength * (metrics.sentenceCount - 1)) + sentence.length;
    metrics.averageSentenceLength = newTotal / metrics.sentenceCount;
    
    this.logEvent(sessionId, 'ai_sentence', { 
      length: sentence.length,
      count: metrics.sentenceCount
    });
  }
  
  /**
   * Record a user interaction
   */
  recordUserInteraction(sessionId: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.userInteractions++;
    this.logEvent(sessionId, 'user_interaction', { count: metrics.userInteractions });
  }
  
  /**
   * Mark when the agent starts the greeting (idempotent)
   */
  markAgentGreetingStart(sessionId: string, ts: number = Date.now()): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    if (metrics.agentGreetingStartAt) return; // only set once
    
    metrics.agentGreetingStartAt = ts;
    this.logEvent(sessionId, 'agent_greeting_started', { at: ts });
  }
  
  /**
   * Mark when the user first starts speaking (idempotent)
   */
  markFirstUserSpeech(sessionId: string, ts: number = Date.now()): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    if (metrics.firstUserSpeechAt) return; // only set once
    
    metrics.firstUserSpeechAt = ts;
    if (metrics.agentGreetingStartAt) {
      metrics.timeToFirstUserSpeechMs = ts - metrics.agentGreetingStartAt;
    }
    this.logEvent(sessionId, 'first_user_speech', { at: ts, latencyMs: metrics.timeToFirstUserSpeechMs });
  }
  
  /**
   * Log an event
   */
  private logEvent(sessionId: string, eventType: string, details: any): void {
    const event: CallEvent = {
      timestamp: Date.now(),
      eventType,
      details,
      sessionId
    };
    
    this.callEvents.push(event);
    
    // Keep event log from growing too large
    if (this.callEvents.length > 1000) {
      this.callEvents = this.callEvents.slice(-500);
    }
  }
  
  /**
   * Send metrics to backend
   */
  private sendMetrics(sessionId: string): void {
    const metrics = this.activeCallMetrics.get(sessionId);
    if (!metrics) return;
    
    // Get events for this session
    const sessionEvents = this.callEvents.filter(event => event.sessionId === sessionId);
    
    // Prepare payload with the exact field names expected by the backend
    const payload = {
      event: 'METRICS_UPDATE', // Required event type for the API
      sessionId: sessionId,
      personaName: metrics.personaName, // Using personaName field as expected by backend
      timestamp: new Date().toISOString(),
      metrics: {
        duration: metrics.duration || 0,
        reconnectAttempts: metrics.reconnectAttempts,
        audioProcessingErrors: metrics.audioProcessingErrors,
        webSocketErrors: metrics.webSocketErrors,
        sentenceCount: metrics.sentenceCount,
        userInteractions: metrics.userInteractions,
        agentGreetingStartAt: metrics.agentGreetingStartAt,
        firstUserSpeechAt: metrics.firstUserSpeechAt,
        timeToFirstUserSpeechMs: metrics.timeToFirstUserSpeechMs
      },
      events: sessionEvents.map(event => ({
        type: event.eventType,
        timestamp: new Date(event.timestamp).toISOString(),
        details: event.details
      }))
    };
    
    // Get CSRF token from cookie - try multiple possible cookie names
    const getCsrfTokenFromCookie = () => {
      // Check for standard Flask-WTF cookie names
      const possibleCookieNames = ['csrf_token', 'X-CSRF-TOKEN', '_csrf_token'];
      
      for (const cookieName of possibleCookieNames) {
        const match = document.cookie.match('(^|;)\\s*' + cookieName + '\\s*=\\s*([^;]+)');
        if (match) {
          console.log(`🔑 Found CSRF token with cookie name: ${cookieName}`);
          return match[2];
        }
      }
      
      // If no cookie is found, try to get from meta tag as fallback
      const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (metaToken) {
        console.log('🔑 Found CSRF token in meta tag');
        return metaToken;
      }
      
      console.warn('⚠️ No CSRF token found in cookies or meta tags');
      return '';
    };
    
    const csrfToken = getCsrfTokenFromCookie();
    
    // Send to backend with better error handling and CSRF token
    fetch(this.metricsEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || ''
      },
      credentials: 'same-origin', // Important for including cookies
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        console.warn(`⚠️ Metrics API returned ${response.status}: ${response.statusText}`);
        return response.text().then(text => {
          console.warn('Error details:', text);
        });
      }
    })
    .catch(err => console.warn(`⚠️ Failed to send metrics: ${err.message}`));
  }
  
  /**
   * Start periodic flush of metrics
   */
  private startPeriodicFlush(): void {
    if (this.flushInterval) return;
    
    this.flushInterval = window.setInterval(() => {
      // Send metrics for all active calls
      for (const sessionId of this.activeCallMetrics.keys()) {
        this.sendMetrics(sessionId);
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Stop periodic flush
   */
  stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
  
  /**
   * Get current metrics for a session
   */
  getMetrics(sessionId: string): CallMetrics | undefined {
    return this.activeCallMetrics.get(sessionId);
  }
  
  /**
   * Get events for a session
   */
  getEvents(sessionId: string): CallEvent[] {
    return this.callEvents.filter(event => event.sessionId === sessionId);
  }
}

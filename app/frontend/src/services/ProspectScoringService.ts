/**
 * Prospect Scoring Service
 * 
 * Frontend service for integrating prospect scoring with voice agent sessions.
 * Handles real-time scoring events and AI behavior updates.
 */

export interface ProspectScores {
  rapport: number;
  trust: number;
  interest: number;
  last_updated: number;
}

export interface BehaviorUpdate {
  behavior_tier: 'guarded' | 'neutral' | 'engaged' | 'enthusiastic';
  scores: ProspectScores;
  instructions: {
    response_style: string;
    question_frequency: string;
    engagement_level: string;
    signature_phrases: string;
    rapport_modifier?: string;
    trust_modifier?: string;
    interest_modifier?: string;
  };
  significant_changes: Record<string, number>;
}

export interface ScoringEvent {
  event_type: string;
  metric: 'rapport' | 'trust' | 'interest';
  delta: number;
  description: string;
  context_text?: string; // The sentence/paragraph that triggered this event
}

export interface CoachingInsights {
  current_scores: {
    scores: ProspectScores;
    behavior_tier: string;
    persona_id: string;
    session_id: string;
  };
  score_trends: Record<string, 'improving' | 'declining' | 'stable'>;
  critical_moments: ScoringEvent[];
  penalty_events: ScoringEvent[];
  reward_events: ScoringEvent[];
  total_events: number;
  session_duration: number;
}

export class ProspectScoringService {
  private sessionId: string | null = null;
  private personaId: string | null = null;
  private isActive: boolean = false;
  
  // Callbacks for behavior updates
  private behaviorUpdateCallback: ((update: BehaviorUpdate) => void) | null = null;
  
  constructor() {
    console.log('ProspectScoringService initialized');
  }
  
  // CSRF helpers: fetch token and build headers for POSTs
  private async getCSRFToken(): Promise<string | null> {
    try {
      const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.csrfToken || null;
    } catch {
      return null;
    }
  }

  private async buildHeaders(): Promise<HeadersInit> {
    const token = await this.getCSRFToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      (headers as any)['X-CSRFToken'] = token; // Flask-WTF reads X-CSRFToken header
    }
    return headers;
  }
  
  /**
   * Start a new prospect scoring session
   */
  async startSession(personaId: string, sessionId: string): Promise<BehaviorUpdate | null> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch('/api/prospect-scoring/start-session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          persona_id: personaId,
          session_id: sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start scoring session: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        this.sessionId = sessionId;
        this.personaId = personaId;
        this.isActive = true;
        
        console.log(`✅ Started prospect scoring session ${sessionId} for persona ${personaId}`);
        console.log(`📊 Has existing scores: ${data.has_existing_scores}`);
        
        return data.initial_behavior;
      } else {
        throw new Error(data.error || 'Unknown error starting session');
      }
      
    } catch (error) {
      console.error('❌ Error starting prospect scoring session:', error);
      return null;
    }
  }
  
  /**
   * Record a manual scoring event
   */
  async recordEvent(eventType: string, context: Record<string, any> = {}): Promise<BehaviorUpdate | null> {
    if (!this.isActive || !this.sessionId) {
      console.warn('⚠️ Cannot record event - scoring session not active');
      return null;
    }
    
    try {
      const headers = await this.buildHeaders();
      const response = await fetch('/api/prospect-scoring/record-event', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          session_id: this.sessionId,
          event_type: eventType,
          context: context
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to record event: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        console.log(`📝 Recorded scoring event: ${data.event_recorded.description}`);
        
        // Trigger behavior update callback if significant change
        if (data.behavior_update && this.behaviorUpdateCallback) {
          this.behaviorUpdateCallback(data.behavior_update);
        }
        
        return data.behavior_update;
      } else {
        throw new Error(data.error || 'Unknown error recording event');
      }
      
    } catch (error) {
      console.error('❌ Error recording scoring event:', error);
      return null;
    }
  }
  
  /**
   * Add a conversation message for analysis
   */
  async addMessage(message: {
    sender: 'user' | 'ai';
    content: string;
    timestamp?: number;
    [key: string]: any;
  }): Promise<void> {
    if (!this.isActive || !this.sessionId) {
      return;
    }
    
    try {
      const headers = await this.buildHeaders();
      await fetch('/api/prospect-scoring/add-message', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          session_id: this.sessionId,
          message: {
            ...message,
            timestamp: message.timestamp || Date.now() / 1000
          }
        })
      });
      
    } catch (error) {
      console.error('❌ Error adding conversation message:', error);
    }
  }
  
  /**
   * Get current prospect scores
   */
  async getCurrentScores(): Promise<{ scores: ProspectScores; behavior_update: BehaviorUpdate } | null> {
    if (!this.isActive || !this.sessionId) {
      return null;
    }
    
    try {
      const response = await fetch(`/api/prospect-scoring/current-scores/${this.sessionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get current scores: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status !== 'success') return null;
      // Backend returns { scores: { scores: ProspectScores, behavior_tier, persona_id, session_id }, behavior_update }
      const inner = data.scores;
      const extractedScores: ProspectScores | undefined = inner && inner.scores;
      if (!extractedScores) {
        console.warn('⚠️ Unexpected current-scores payload shape:', data);
        return null;
      }
      return {
        scores: extractedScores,
        behavior_update: data.behavior_update as BehaviorUpdate
      };
      
    } catch (error) {
      console.error('❌ Error getting current scores:', error);
      return null;
    }
  }
  
  /**
   * Get coaching insights for Sam
   */
  async getCoachingInsights(): Promise<CoachingInsights | null> {
    if (!this.isActive || !this.sessionId) {
      return null;
    }
    
    try {
      const response = await fetch(`/api/prospect-scoring/coaching-insights/${this.sessionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get coaching insights: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.status === 'success' ? data.insights : null;
      
    } catch (error) {
      console.error('❌ Error getting coaching insights:', error);
      return null;
    }
  }
  
  /**
   * Get current behavior update for AI prompt modification
   */
  async getBehaviorUpdate(): Promise<BehaviorUpdate | null> {
    if (!this.isActive || !this.sessionId) {
      return null;
    }
    
    try {
      const response = await fetch(`/api/prospect-scoring/behavior-update/${this.sessionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get behavior update: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.status === 'success' ? data.behavior_update : null;
      
    } catch (error) {
      console.error('❌ Error getting behavior update:', error);
      return null;
    }
  }
  
  /**
   * End the scoring session
   */
  async endSession(): Promise<CoachingInsights | null> {
    if (!this.isActive || !this.sessionId) {
      return null;
    }
    
    try {
      const headers = await this.buildHeaders();
      const response = await fetch('/api/prospect-scoring/end-session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          session_id: this.sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to end scoring session: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        console.log(`✅ Ended prospect scoring session ${this.sessionId}`);
        
        this.isActive = false;
        this.sessionId = null;
        this.personaId = null;
        
        return data.final_insights;
      } else {
        throw new Error(data.error || 'Unknown error ending session');
      }
      
    } catch (error) {
      console.error('❌ Error ending scoring session:', error);
      return null;
    }
  }
  
  /**
   * Set callback for behavior updates
   */
  setBehaviorUpdateCallback(callback: (update: BehaviorUpdate) => void): void {
    this.behaviorUpdateCallback = callback;
  }
  
  /**
   * Get available scoring events
   */
  async getAvailableEvents(): Promise<Record<string, any> | null> {
    try {
      const response = await fetch('/api/prospect-scoring/available-events', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get available events: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.status === 'success' ? data.events : null;
      
    } catch (error) {
      console.error('❌ Error getting available events:', error);
      return null;
    }
  }
  
  /**
   * Check if AI should terminate the call
   */
  async checkAICallTermination(): Promise<{ should_terminate: boolean; termination_phrase?: string; reason?: string } | null> {
    if (!this.isActive || !this.sessionId) {
      return null;
    }
    
    try {
      const response = await fetch(`/api/prospect-scoring/check-ai-termination/${this.sessionId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check AI termination: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.status === 'success' ? data.termination_check : null;
      
    } catch (error) {
      console.error('❌ Error checking AI call termination:', error);
      return null;
    }
  }
  
  /**
   * Get persona scoring history
   */
  async getPersonaHistory(personaId: string): Promise<any[] | null> {
    try {
      const response = await fetch(`/api/prospect-scoring/persona-history/${personaId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get persona history: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.status === 'success' ? data.history : null;
      
    } catch (error) {
      console.error('❌ Error getting persona history:', error);
      return null;
    }
  }
  
  /**
   * Check if scoring session is active
   */
  isSessionActive(): boolean {
    return this.isActive;
  }
  
  /**
   * Get current session info
   */
  getSessionInfo(): { sessionId: string | null; personaId: string | null } {
    return {
      sessionId: this.sessionId,
      personaId: this.personaId
    };
  }
}

// Export singleton instance
export const prospectScoringService = new ProspectScoringService();

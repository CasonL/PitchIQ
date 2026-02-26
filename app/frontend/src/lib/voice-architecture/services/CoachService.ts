/**
 * Coach Service - Frontend interface for sync/async Coach architecture
 * 
 * Two paths:
 * - syncClassify(): Fast reflex flags (called every turn)
 * - asyncPlan(): Strategic planning (called during user speech)
 */

export interface SyncReflexes {
  max_sentences: number;
  answer_policy: 'answer' | 'clarify' | 'deflect';
  do_not_echo: boolean;
  hard_constraints: string[];
  question_type: 'open' | 'closed' | 'none';
}

export interface StrategicPlan {
  suggested_phase: string | null;
  phase_confidence: number;
  pending_trap: string | null;
  pressure_adjustment: number;
  objection_to_introduce: string | null;
  reasoning: string;
  facts_detected: Record<string, string>;
}

export interface CoachState {
  phase: string;
  phase_duration: number;
  facts: Record<string, string>;
}

class CoachService {
  private csrfToken: string = '';
  private pendingPlanRequest: AbortController | null = null;

  constructor() {
    this.refreshCsrfToken();
  }

  private refreshCsrfToken(): void {
    this.csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_access_token='))
      ?.split('=')[1] || '';
  }

  /**
   * Sync classification - fast reflex flags.
   * Called every turn, must be fast.
   */
  async syncClassify(message: string, sessionId: string): Promise<SyncReflexes | null> {
    try {
      const response = await fetch('/api/coach/sync-classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        console.error('[CoachService] Sync classify failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[CoachService] Sync reflexes:', data.reflexes);
      return data.reflexes;
    } catch (error) {
      console.error('[CoachService] Sync classify error:', error);
      return null;
    }
  }

  /**
   * Async planning - strategic decisions.
   * Called during user speech, can take longer.
   * Only affects FUTURE turns.
   */
  async asyncPlan(
    transcriptHistory: Array<{ role: string; content: string }>,
    persona: Record<string, any>,
    sessionId: string
  ): Promise<{ plan: StrategicPlan; state: CoachState } | null> {
    // Cancel any pending plan request
    if (this.pendingPlanRequest) {
      this.pendingPlanRequest.abort();
    }

    this.pendingPlanRequest = new AbortController();

    try {
      const response = await fetch('/api/coach/async-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.csrfToken,
        },
        credentials: 'include',
        signal: this.pendingPlanRequest.signal,
        body: JSON.stringify({
          transcript_history: transcriptHistory,
          persona,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        console.error('[CoachService] Async plan failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[CoachService] Strategic plan:', data.plan);
      console.log('[CoachService] Current state:', data.current_state);
      
      return {
        plan: data.plan,
        state: data.current_state
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[CoachService] Async plan request aborted');
        return null;
      }
      console.error('[CoachService] Async plan error:', error);
      return null;
    } finally {
      this.pendingPlanRequest = null;
    }
  }

  /**
   * Get current session state (for debugging).
   */
  async getState(sessionId: string): Promise<CoachState | null> {
    try {
      const response = await fetch(`/api/coach/state?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': this.csrfToken,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        phase: data.phase,
        phase_duration: data.phase_duration,
        facts: data.facts
      };
    } catch (error) {
      console.error('[CoachService] Get state error:', error);
      return null;
    }
  }

  /**
   * Cancel any pending async plan request.
   * Call this when user interrupts or conversation changes direction.
   */
  cancelPendingPlan(): void {
    if (this.pendingPlanRequest) {
      this.pendingPlanRequest.abort();
      this.pendingPlanRequest = null;
    }
  }
}

// Singleton instance
let coachServiceInstance: CoachService | null = null;

export function getCoachService(): CoachService {
  if (!coachServiceInstance) {
    coachServiceInstance = new CoachService();
  }
  return coachServiceInstance;
}

export { CoachService };

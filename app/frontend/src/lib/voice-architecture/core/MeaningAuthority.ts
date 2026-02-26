import { IMeaningAuthority, IProspectQueue, VoiceArchitectureConfig, ConversationContext, BehaviorState, QueueItem } from './types';

interface CoachMetadata {
  intervened: boolean;
  confidence: number;
  question_type: string;
  state_modifiers: Record<string, any>;
}

export class MeaningAuthority implements IMeaningAuthority {
  private queue: IProspectQueue;
  private config: VoiceArchitectureConfig;
  private currentBehaviorState: BehaviorState = {
    awkwardness_level: 0,
    control_taking: 0.5,
    energy_level: 'tentative'
  };
  private lastCoachMetadata: CoachMetadata | null = null;

  constructor(queue: IProspectQueue, config: VoiceArchitectureConfig) {
    this.queue = queue;
    this.config = config;
  }

  async onTranscript(text: string, speaker: 'user' | 'prospect'): Promise<void> {
    console.log('[MeaningAuthority] Transcript:', speaker, text);
    
    if (speaker === 'user') {
      this.queue.onNewUserSpeech();
      
      if (this.config.enable_mirroring) {
        this.analyzeBehavior(text);
      }
    }
  }

  onUserBehaviorChange(state: BehaviorState): void {
    console.log('[MeaningAuthority] Behavior state updated:', state);
    this.currentBehaviorState = state;
  }

  async generateProspectResponse(context: ConversationContext): Promise<void> {
    console.log('[MeaningAuthority] Generating prospect response');
    
    const response = await this.generateResponse(context);
    
    // Don't queue empty responses
    if (!response || response.trim().length === 0) {
      console.warn('[MeaningAuthority] Empty response from API, skipping queue');
      return;
    }
    
    const queueItem = this.buildQueueItem(response, context);
    
    this.queue.push(queueItem);
    console.log('[MeaningAuthority] Queued response:', queueItem.text.substring(0, 50));
  }

  private async generateResponse(context: ConversationContext): Promise<string> {
    // Call backend API for prospect response with behavioral mirroring
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_access_token='))
        ?.split('=')[1] || '';

      const response = await fetch('/api/prospect-response/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          transcript: context.transcript,
          persona: context.persona,
          behavior_state: context.behaviorState || this.currentBehaviorState,
          conversation_history: [],
          session_id: context.sessionId
        })
      });

      if (!response.ok) {
        console.error('[MeaningAuthority] API error:', response.status);
        return '';
      }

      const data = await response.json();
      console.log('[MeaningAuthority] API response metadata:', data.metadata);
      
      // Log and store Coach decision if present
      if (data.metadata?.coach) {
        const coach = data.metadata.coach;
        console.log(`[Coach] intervened=${coach.intervened} confidence=${coach.confidence} question_type=${coach.question_type || 'none'} reasoning="${coach.reasoning?.substring(0, 50)}..."`);
        if (Object.keys(coach.state_modifiers || {}).length > 0) {
          console.log('[Coach] State modifiers:', coach.state_modifiers);
        }
        // Store for queue item building
        this.lastCoachMetadata = {
          intervened: coach.intervened,
          confidence: coach.confidence,
          question_type: coach.question_type || 'none',
          state_modifiers: coach.state_modifiers || {}
        };
      } else {
        this.lastCoachMetadata = null;
      }
      
      return data.response || '';
      
    } catch (error) {
      console.error('[MeaningAuthority] Failed to generate response:', error);
      return '';
    }
  }

  private buildQueueItem(text: string, context: ConversationContext): QueueItem {
    const behaviorState = context.behaviorState || this.currentBehaviorState;
    const coach = this.lastCoachMetadata;
    
    // Calculate priority: Coach intervention boosts priority
    let priority = this.calculatePriority(behaviorState);
    if (coach?.intervened) {
      priority = Math.min(1.0, priority + 0.2); // Boost priority for interventions
    }
    
    // Calculate interrupt_ok: Coach can override based on constraints
    let interruptOk = behaviorState.control_taking > 0.6;
    if (coach?.state_modifiers?.hard_constraints) {
      const constraints = coach.state_modifiers.hard_constraints;
      // If waiting for complete thought, don't interrupt
      if (constraints.includes('wait_for_complete_thought')) {
        interruptOk = false;
      }
    }
    
    // Adjust expiration based on question type
    let expiresInMs = 2000;
    if (coach?.question_type === 'open') {
      expiresInMs = 3000; // Longer responses need more time
    } else if (coach?.question_type === 'closed') {
      expiresInMs = 1500; // Short responses expire faster
    }
    
    console.log('[MeaningAuthority] Building queue item with Coach metadata:', {
      priority,
      interruptOk,
      expiresInMs,
      coachIntervened: coach?.intervened,
      questionType: coach?.question_type
    });
    
    return {
      text,
      priority,
      expires_in_ms: expiresInMs,
      interrupt_ok: interruptOk,
      abortable: true,
      timestamp: Date.now(),
      contextVersion: 0,
      pause_before: this.calculatePause(behaviorState),
      tone: this.determineTone(behaviorState),
      speaking_speed: this.determineSpeed(behaviorState)
    };
  }

  private analyzeBehavior(text: string): void {
    const awkwardPatterns = [
      /um+|uh+|like|you know/gi,
      /I guess|maybe|kind of|sort of/gi,
      /does that make sense|is that okay/gi
    ];
    
    const passivePatterns = [
      /so.+what do you think/gi,
      /any questions/gi,
      /let me know/gi
    ];
    
    const controlPatterns = [
      /let me|let's/gi,
      /what|when|how|why/gi,
      /here's what (I'd|we'll)/gi
    ];
    
    let awkwardness = 0;
    awkwardPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) awkwardness += matches.length * 0.2;
    });
    
    let passiveness = 0;
    passivePatterns.forEach(pattern => {
      if (pattern.test(text)) passiveness += 0.3;
    });
    
    let control = 0;
    controlPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) control += matches.length * 0.2;
    });
    
    this.currentBehaviorState = {
      awkwardness_level: Math.min(1, awkwardness),
      control_taking: Math.max(0, Math.min(1, control - passiveness)),
      energy_level: this.determineEnergyLevel(control, passiveness)
    };
    
    console.log('[MeaningAuthority] Behavior analysis:', this.currentBehaviorState);
  }

  private determineEnergyLevel(control: number, passiveness: number): 'passive' | 'tentative' | 'confident' | 'aggressive' {
    const netControl = control - passiveness;
    if (netControl < 0.2) return 'passive';
    if (netControl < 0.5) return 'tentative';
    if (netControl < 0.8) return 'confident';
    return 'aggressive';
  }

  private calculatePriority(state: BehaviorState): number {
    if (state.control_taking < 0.3) return 0.8;
    if (state.awkwardness_level > 0.7) return 0.7;
    return 0.5;
  }

  private calculatePause(state: BehaviorState): number {
    if (state.awkwardness_level > 0.7) return 1200;
    if (state.control_taking < 0.3) return 1500;
    return 400;
  }

  private determineTone(state: BehaviorState): 'engaged' | 'uncomfortable' | 'disengaged' | 'exit_seeking' {
    if (state.awkwardness_level > 0.7) return 'uncomfortable';
    if (state.control_taking < 0.3) return 'disengaged';
    if (state.control_taking > 0.7) return 'engaged';
    return 'uncomfortable';
  }

  private determineSpeed(state: BehaviorState): 'normal' | 'hesitant' | 'flat' {
    if (state.awkwardness_level > 0.7) return 'hesitant';
    if (state.control_taking < 0.3) return 'flat';
    return 'normal';
  }
}

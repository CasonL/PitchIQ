import { TimingAuthority } from './core/TimingAuthority';
import { MeaningAuthority } from './core/MeaningAuthority';
import { SpeechGate } from './core/SpeechGate';
import { ProspectQueue } from './core/ProspectQueue';
import { VoiceArchitectureConfig } from './core/types';
import { getCoachService, CoachService, SyncReflexes, StrategicPlan, CoachState } from './services/CoachService';

export class VoiceOrchestrator {
  private topRail: TimingAuthority;
  private bottomRail: MeaningAuthority;
  private gate: SpeechGate;
  private queue: ProspectQueue;
  private config: VoiceArchitectureConfig;
  private coachService: CoachService;
  private sessionId: string = '';
  private transcriptHistory: Array<{ role: string; content: string }> = [];
  private currentPersona: Record<string, any> = {};
  private lastSyncReflexes: SyncReflexes | null = null;
  private lastStrategicPlan: StrategicPlan | null = null;
  private asyncPlanPending: boolean = false;
  
  constructor(config: VoiceArchitectureConfig) {
    this.config = config;
    this.queue = new ProspectQueue(config);
    this.gate = new SpeechGate(this.queue, config.onSpeakRequest);
    this.topRail = new TimingAuthority(this.gate, config);
    this.bottomRail = new MeaningAuthority(this.queue, config);
    this.coachService = getCoachService();
    
    console.log('[VoiceOrchestrator] Initialized with config:', {
      silence_threshold_ms: config.silence_threshold_ms,
      max_queue_size: config.max_queue_size,
      enable_mirroring: config.enable_mirroring,
      enable_coach: config.enable_coach_orchestration
    });
  }
  
  public setSessionContext(sessionId: string, persona: Record<string, any>): void {
    this.sessionId = sessionId;
    this.currentPersona = persona;
    console.log('[VoiceOrchestrator] Session context set:', sessionId);
  }
  
  public userStartedSpeaking(): void {
    this.topRail.onUserStartedSpeaking();
    
    // Trigger async planning during user speech (uses dead time)
    if (this.config.enable_coach_orchestration && !this.asyncPlanPending) {
      this.triggerAsyncPlanning();
    }
  }
  
  public userStoppedSpeaking(silenceDuration_ms: number = 800): void {
    this.topRail.onUserStoppedSpeaking(silenceDuration_ms);
  }
  
  public prospectStartedSpeaking(): void {
    this.topRail.onProspectStartedSpeaking();
  }
  
  public prospectStoppedSpeaking(): void {
    this.topRail.onProspectStoppedSpeaking();
  }
  
  public async onTranscript(text: string, speaker: 'user' | 'prospect'): Promise<void> {
    // Add to transcript history
    this.transcriptHistory.push({ role: speaker, content: text });
    
    // Keep history manageable
    if (this.transcriptHistory.length > 20) {
      this.transcriptHistory = this.transcriptHistory.slice(-15);
    }
    
    // Run sync classifier for user messages (fast reflex flags)
    if (speaker === 'user' && this.sessionId) {
      this.lastSyncReflexes = await this.coachService.syncClassify(text, this.sessionId);
      if (this.lastSyncReflexes) {
        console.log('[VoiceOrchestrator] Sync reflexes applied:', this.lastSyncReflexes);
      }
    }
    
    await this.bottomRail.onTranscript(text, speaker);
  }
  
  public async generateResponse(context: any): Promise<void> {
    // Pass sync reflexes to meaning authority for response generation
    const enrichedContext = {
      ...context,
      syncReflexes: this.lastSyncReflexes,
      strategicPlan: this.lastStrategicPlan
    };
    await this.bottomRail.generateProspectResponse(enrichedContext);
  }
  
  /**
   * Trigger async strategic planning.
   * Runs during user speech (uses dead time).
   * Only affects FUTURE turns.
   */
  private async triggerAsyncPlanning(): Promise<void> {
    if (!this.sessionId || this.transcriptHistory.length < 2) {
      return;
    }
    
    this.asyncPlanPending = true;
    
    try {
      const result = await this.coachService.asyncPlan(
        this.transcriptHistory,
        this.currentPersona,
        this.sessionId
      );
      
      if (result) {
        this.lastStrategicPlan = result.plan;
        console.log('[VoiceOrchestrator] Strategic plan received:', {
          phase: result.state.phase,
          suggestedPhase: result.plan.suggested_phase,
          trap: result.plan.pending_trap
        });
      }
    } catch (error) {
      console.error('[VoiceOrchestrator] Async planning error:', error);
    } finally {
      this.asyncPlanPending = false;
    }
  }
  
  public getLastSyncReflexes(): SyncReflexes | null {
    return this.lastSyncReflexes;
  }
  
  public getLastStrategicPlan(): StrategicPlan | null {
    return this.lastStrategicPlan;
  }
  
  public cleanup(): void {
    console.log('[VoiceOrchestrator] Cleaning up');
    this.queue.clear();
    this.gate.close();
  }
  
  public getQueue(): ProspectQueue {
    return this.queue;
  }

  public getDebugState() {
    return {
      queue: this.queue.getDebugState(),
      gateOpen: this.gate.isOpen(),
      turnState: this.topRail.getCurrentTurnState()
    };
  }
}

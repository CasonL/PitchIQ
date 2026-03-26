/**
 * CallOrchestrator - Manages call lifecycle and state transitions
 * 
 * Responsibilities:
 * - Call start/stop/pause
 * - Phase transitions
 * - Session management
 * - Call state tracking
 */

import { CharmerPhaseManager, CharmerPhase } from '../CharmerPhaseManager';
import { ConversationTracker } from '../ConversationTranscript';
import { TurnTracker } from '../TurnTracker';
import { MarcusScenario } from '../MarcusScenarios';
import { getRandomMarcusTraits } from '../MarcusTraits';
import { ObjectionGenerator } from '../ObjectionGenerator';

export interface CallState {
  isActive: boolean;
  isPaused: boolean;
  sessionId: string | null;
  startTime: number | null;
  selectedScenario: MarcusScenario | null;
}

export interface CallServices {
  phaseManager: CharmerPhaseManager;
  conversationTracker: ConversationTracker;
  turnTracker: TurnTracker;
  objectionGenerator: ObjectionGenerator;
}

export class CallOrchestrator {
  private state: CallState = {
    isActive: false,
    isPaused: false,
    sessionId: null,
    startTime: null,
    selectedScenario: null
  };

  private services: CallServices | null = null;
  private onStateChange?: (state: CallState) => void;

  constructor(onStateChange?: (state: CallState) => void) {
    this.onStateChange = onStateChange;
  }

  /**
   * Initialize a new call with scenario
   */
  async startCall(scenario: MarcusScenario): Promise<CallServices> {
    console.log('📞 [CallOrchestrator] Starting new call with scenario:', scenario.id);

    // Generate session ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const sessionId = `charmer_${timestamp}_${randomId}`;

    // Initialize services
    const startTime = Date.now();
    const conversationTracker = new ConversationTracker(startTime);
    const turnTracker = new TurnTracker(startTime);
    const phaseManager = new CharmerPhaseManager();

    // Initialize objection generator (will be populated via generateForDiscovery during call)
    const objectionGenerator = new ObjectionGenerator();

    // Reset phase manager for new call
    phaseManager.reset();

    // Update context with scenario info
    phaseManager.updateContext({
      product: scenario.product || 'Adaptive - user defines'
    });

    this.services = {
      phaseManager,
      conversationTracker,
      turnTracker,
      objectionGenerator
    };

    this.updateState({
      isActive: true,
      isPaused: false,
      sessionId,
      startTime,
      selectedScenario: scenario
    });

    console.log('📋 [CallOrchestrator] Services initialized:', {
      sessionId,
      scenario: scenario.id,
      traits: scenario.traits
    });

    return this.services;
  }

  /**
   * End the current call
   */
  endCall(): CallServices | null {
    console.log('📵 [CallOrchestrator] Ending call');

    const services = this.services;

    this.updateState({
      isActive: false,
      isPaused: false,
      sessionId: null,
      startTime: null,
      selectedScenario: null
    });

    this.services = null;

    return services;
  }

  /**
   * Pause/resume call
   */
  togglePause(): void {
    this.updateState({
      ...this.state,
      isPaused: !this.state.isPaused
    });
  }

  /**
   * Get current call state
   */
  getState(): CallState {
    return { ...this.state };
  }

  /**
   * Get current services (throws if call not active)
   */
  getServices(): CallServices {
    if (!this.services) {
      throw new Error('Call not active - services unavailable');
    }
    return this.services;
  }

  /**
   * Check if call is active
   */
  isCallActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get elapsed time since call start
   */
  getElapsedTime(): number {
    if (!this.state.startTime) return 0;
    return Date.now() - this.state.startTime;
  }

  /**
   * Transition to a new phase
   */
  transitionToPhase(newPhase: CharmerPhase, reason?: string): void {
    if (!this.services) {
      console.warn(' [CallOrchestrator] Cannot transition phase - no active call');
      return;
    }
    
    const currentPhase = this.services.phaseManager.getCurrentPhase();
    console.log(` [CallOrchestrator] Phase transition: ${currentPhase} → ${newPhase}`);
    
    // PhaseManager doesn't have transitionTo, use reset and updateContext instead
    // This is a placeholder - proper phase transition logic will be added during full migration
    console.warn(' [CallOrchestrator] Phase transition not yet implemented');
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<CallState>): void {
    this.state = { ...this.state, ...newState };
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}

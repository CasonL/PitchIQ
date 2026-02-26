/**
 * Prospect Voice Manager - Two-Rail Architecture with Full Control
 * 
 * Based on Marcus architecture but integrated with VoiceOrchestrator:
 * - Deepgram Nova-2 for STT (cheaper, better VAD)
 * - Cartesia for TTS (40ms latency)
 * - VoiceOrchestrator controls timing and meaning
 * - Behavioral mirroring in responses
 */

import { DeepgramSTTService } from './DeepgramSTTService';
import { CartesiaService } from './CartesiaService';

export interface ProspectVoiceConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onSpeechStart: () => void; // VAD event - user started speaking
  onSpeakingStateChange: (isSpeaking: boolean) => void;
  onError: (error: Error) => void;
}

export class ProspectVoiceManager {
  private sttService: DeepgramSTTService;
  private ttsService: CartesiaService;
  private config: ProspectVoiceConfig;
  private isSpeaking: boolean = false;
  private currentSpeechId: string | null = null;
  private prospectStartTime: number = 0; // Track when prospect starts speaking
  private userSpeechStartTime: number = 0; // Track when user speech starts (for duration check)
  private readonly ECHO_GRACE_PERIOD_MS = 400; // Ignore VAD during this window
  private readonly MIN_SPEECH_DURATION_MS = 600; // Require sustained speech before interrupting (increased from 250ms to reduce false interruptions)

  constructor(config: ProspectVoiceConfig) {
    this.config = config;
    
    // Initialize STT service
    this.sttService = new DeepgramSTTService({
      onTranscript: this.handleTranscript.bind(this),
      onSpeechStart: this.handleSpeechStart.bind(this),
      onError: this.handleError.bind(this),
    });
    
    // Initialize TTS service
    this.ttsService = new CartesiaService({
      onAudioReady: () => {}, // Audio handled internally by CartesiaService
      onSpeakingStart: () => this.updateSpeakingState(true),
      onSpeakingEnd: () => this.updateSpeakingState(false),
      onError: this.handleError.bind(this),
    });
  }

  /**
   * Start listening to microphone
   */
  async startListening(): Promise<void> {
    console.log('[ProspectVoiceManager] Starting STT...');
    await this.sttService.connect();
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    console.log('[ProspectVoiceManager] Stopping STT...');
    await this.sttService.disconnect();
  }

  /**
   * Make prospect speak (controlled by VoiceOrchestrator)
   */
  async speak(text: string, options?: { 
    voiceId?: string;
    emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised';
    speed?: number;
  }): Promise<void> {
    const speechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSpeechId = speechId;
    
    console.log('[ProspectVoiceManager] Speaking:', text.substring(0, 50), `(${speechId})`);

    // Check if we were interrupted before starting
    if (this.currentSpeechId !== speechId) {
      console.log('[ProspectVoiceManager] Speech cancelled before starting');
      return;
    }

    // Speak with Cartesia
    await this.ttsService.speak(text, {
      voiceId: options?.voiceId || 'confident-male',
      emotion: options?.emotion || 'neutral',
      speed: options?.speed || 1.0,
    });
  }

  /**
   * Stop speaking immediately (for interruptions)
   */
  async stopSpeaking(): Promise<void> {
    this.currentSpeechId = null; // Invalidate current speech
    console.log('[ProspectVoiceManager] Stopping speech...');
    await this.ttsService.stop();
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if STT is active
   */
  isActive(): boolean {
    return this.sttService.isActive();
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('[ProspectVoiceManager] Cleaning up...');
    await this.stopListening();
    await this.stopSpeaking();
    await this.ttsService.cleanup();
  }

  // Private methods

  /**
   * Handle VAD speech start event
   */
  private handleSpeechStart(): void {
    console.log('[ProspectVoiceManager] VAD: User speech detected');
    
    // Filter acoustic echo: ignore VAD shortly after prospect starts speaking
    if (this.isSpeaking) {
      const timeSinceProspectStarted = Date.now() - this.prospectStartTime;
      if (timeSinceProspectStarted < this.ECHO_GRACE_PERIOD_MS) {
        console.log(`[ProspectVoiceManager] ⚡ Ignoring VAD (acoustic echo, ${timeSinceProspectStarted}ms < ${this.ECHO_GRACE_PERIOD_MS}ms grace period)`);
        return; // Ignore - likely acoustic echo from speakers
      }
      
      // Track when user speech started (for duration check)
      if (this.userSpeechStartTime === 0) {
        this.userSpeechStartTime = Date.now();
        console.log(`[ProspectVoiceManager] 🎤 User speech started - waiting ${this.MIN_SPEECH_DURATION_MS}ms for confirmation`);
        return; // Wait for sustained speech
      }
      
      // Check if speech has been sustained long enough
      const speechDuration = Date.now() - this.userSpeechStartTime;
      if (speechDuration < this.MIN_SPEECH_DURATION_MS) {
        console.log(`[ProspectVoiceManager] ⏱️ Speech duration ${speechDuration}ms < ${this.MIN_SPEECH_DURATION_MS}ms - waiting`);
        return; // Still waiting for sustained speech
      }
      
      // Sustained speech confirmed - interrupt prospect
      console.log(`[ProspectVoiceManager] ✅ Interruption confirmed (${speechDuration}ms sustained) - stopping prospect`);
      this.userSpeechStartTime = 0; // Reset
      this.stopSpeaking().catch(err => {
        console.error('[ProspectVoiceManager] Error stopping speech:', err);
      });
    } else {
      // Prospect not speaking - reset user speech timer
      this.userSpeechStartTime = 0;
    }
    
    // Notify orchestrator
    this.config.onSpeechStart();
  }

  private handleTranscript(text: string, isFinal: boolean): void {
    // Check for sustained interruption when we get actual transcript
    if (this.isSpeaking && this.userSpeechStartTime > 0) {
      const speechDuration = Date.now() - this.userSpeechStartTime;
      if (speechDuration >= this.MIN_SPEECH_DURATION_MS) {
        console.log(`[ProspectVoiceManager] ✅ Interruption via transcript (${speechDuration}ms sustained) - stopping prospect`);
        this.userSpeechStartTime = 0;
        this.stopSpeaking().catch(err => {
          console.error('[ProspectVoiceManager] Error stopping speech:', err);
        });
      }
    }
    
    // Forward to orchestrator
    this.config.onTranscript(text, isFinal);
  }

  private updateSpeakingState(isSpeaking: boolean): void {
    this.isSpeaking = isSpeaking;
    
    // Track when prospect starts speaking (for acoustic echo filtering)
    if (isSpeaking) {
      this.prospectStartTime = Date.now();
    }
    
    this.config.onSpeakingStateChange(isSpeaking);
  }

  private handleError(error: Error): void {
    console.error('[ProspectVoiceManager] Error:', error);
    this.config.onError(error);
  }
}

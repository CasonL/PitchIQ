/**
 * Marcus Voice Manager - Full Control Voice System
 * 
 * Unlike Deepgram Agent API, this gives you 100% control over:
 * - When the AI speaks
 * - What the AI says
 * - No autonomous responses
 * 
 * Uses:
 * - Deepgram Nova-2 for STT (better turn detection, 70% cheaper)
 * - Cartesia for TTS (40ms latency)
 */

import { DeepgramSTTService } from './DeepgramSTTService';
import { CartesiaService } from './CartesiaService';

export interface VoiceManagerConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onSpeakingStateChange: (isSpeaking: boolean) => void;
  onError: (error: Error) => void;
  onCostUpdate?: (sttCost: number, ttsCost: number) => void;
  onInterruption?: (interruptedText: string) => void; // Called when user interrupts Marcus
}

export interface VoiceMetrics {
  sttMinutes: number;
  ttsCharacters: number;
  estimatedCost: number;
  messagesProcessed: number;
}

export class MarcusVoiceManager {
  private sttService: DeepgramSTTService;
  private ttsService: CartesiaService;
  private config: VoiceManagerConfig;
  private isSpeaking: boolean = false;
  private interruptionDetected: boolean = false; // Track if user interrupted
  private lastSpeakStartTime: number = 0; // Track when Marcus started speaking
  private isStopping: boolean = false; // Prevent concurrent stop calls
  private currentSpeechId: string | null = null; // Track current speech session
  private userSpeechStartTime: number = 0; // Track when user started speaking
  private interruptionThreshold: number = 400; // Minimum ms of user speech before interrupting Marcus (reduced for faster response)
  private noiseFloor: number = 0; // Ambient noise level baseline
  private isCalibrating: boolean = false; // Track if we're calibrating noise
  private calibrationSamples: number[] = []; // Audio level samples during calibration
  private lastInterruptionWasNoise: boolean = false; // Track if last interruption was false positive
  private metrics: VoiceMetrics = {
    sttMinutes: 0,
    ttsCharacters: 0,
    estimatedCost: 0,
    messagesProcessed: 0,
  };

  constructor(config: VoiceManagerConfig) {
    this.config = config;
    this.sttService = new DeepgramSTTService({
      onTranscript: this.handleTranscript.bind(this),
      onSpeechStart: this.handleSpeechStart.bind(this), // VAD for instant interruption
      onError: this.handleError.bind(this),
    });
    this.ttsService = new CartesiaService({
      onAudioReady: this.handleAudioReady.bind(this),
      onSpeakingStart: () => this.updateSpeakingState(true),
      onSpeakingEnd: () => this.updateSpeakingState(false),
      onError: this.handleError.bind(this),
    });
  }

  /**
   * Start listening to user's microphone
   */
  async startListening(): Promise<void> {
    console.log('[MarcusVoiceManager] Starting STT...');
    await this.sttService.connect();
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    console.log('[MarcusVoiceManager] Stopping STT...');
    await this.sttService.disconnect();
  }

  /**
   * Make Marcus speak (YOU control this!)
   * This is the key difference - no autonomous responses
   */
  async speak(text: string, options?: { 
    interrupt?: boolean;
    voiceId?: string;
    emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised';
    speed?: number;
  }): Promise<void> {
    // Generate unique ID for this speech
    const speechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSpeechId = speechId;
    
    console.log('[MarcusVoiceManager] Speaking:', text, `(${speechId})`);
    
    // Reset interruption flag for new speech
    this.interruptionDetected = false;
    
    // Track when Marcus starts speaking (for echo cooldown)
    this.lastSpeakStartTime = Date.now();
    
    // Track cost
    this.metrics.ttsCharacters += text.length;
    this.metrics.messagesProcessed++;
    this.updateCost();

    // Stop current speech if interrupting
    if (options?.interrupt && this.isSpeaking) {
      await this.stopSpeaking();
    }

    // Check if we were interrupted before starting
    if (this.currentSpeechId !== speechId) {
      console.log('[MarcusVoiceManager] Speech cancelled before starting (interrupted)');
      return;
    }

    // Synthesize and play with voice options
    await this.ttsService.speak(text, {
      voiceId: options?.voiceId,
      emotion: options?.emotion,
      speed: options?.speed,
    });
  }

  /**
   * Stop speaking immediately
   */
  async stopSpeaking(): Promise<void> {
    // Prevent concurrent stop calls
    if (this.isStopping) {
      console.log('[MarcusVoiceManager] Already stopping, skipping duplicate stop');
      return;
    }
    
    this.isStopping = true;
    this.currentSpeechId = null; // Invalidate current speech
    
    console.log('[MarcusVoiceManager] Stopping speech...');
    await this.ttsService.stop();
    
    this.isStopping = false;
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if STT is actively listening
   */
  isActive(): boolean {
    return this.sttService.isActive();
  }

  /**
   * Get usage metrics
   */
  getMetrics(): VoiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      sttMinutes: 0,
      ttsCharacters: 0,
      estimatedCost: 0,
      messagesProcessed: 0,
    };
    this.updateCost();
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('[MarcusVoiceManager] Cleaning up...');
    await this.stopListening();
    await this.stopSpeaking();
    await this.ttsService.cleanup();
  }

  // Private methods

  /**
   * Handle immediate speech detection via VAD (Voice Activity Detection)
   * Now with adaptive noise filtering!
   */
  private handleSpeechStart(): void {
    // ⚡ SMART INTERRUPTION with noise filtering
    if (this.isSpeaking && !this.interruptionDetected) {
      // 🛡️ ECHO PROTECTION: Ignore VAD events for first 800ms after Marcus starts
      const timeSinceSpeakStart = Date.now() - this.lastSpeakStartTime;
      if (timeSinceSpeakStart < 800) {
        console.log(`🛡️ [Echo Protection] Ignoring VAD ${timeSinceSpeakStart}ms after Marcus started (likely echo)`);
        return;
      }
      
      // Track when user started speaking
      if (this.userSpeechStartTime === 0) {
        this.userSpeechStartTime = Date.now();
        console.log('👂 [User Speech Detected] Monitoring duration before interrupting...');
        
        // Check again after threshold to see if user is still speaking
        setTimeout(() => {
          if (this.isSpeaking && this.userSpeechStartTime > 0 && !this.interruptionDetected) {
            const speechDuration = Date.now() - this.userSpeechStartTime;
            if (speechDuration >= this.interruptionThreshold) {
              console.log(`⚡ [INSTANT Interruption] User spoke for ${speechDuration}ms - stopping Marcus NOW`);
              this.interruptionDetected = true;
              
              // Stop Marcus immediately
              this.stopSpeaking().catch(err => {
                console.error('[MarcusVoiceManager] Error stopping speech on VAD interruption:', err);
              });
            }
          }
        }, this.interruptionThreshold);
      }
    } else if (!this.isSpeaking) {
      // Reset user speech timer when Marcus isn't speaking
      this.userSpeechStartTime = 0;
    }
  }

  private handleTranscript(text: string, isFinal: boolean): void {
    // Reset user speech timer when we get a transcript (speech ended)
    if (isFinal && this.userSpeechStartTime > 0) {
      this.userSpeechStartTime = 0;
    }
    
    // 🎤 INTERRUPTION DETECTION: Check if user spoke while Marcus was talking
    if (this.isSpeaking && text.trim().length > 0 && !this.interruptionDetected) {
      console.log('🛑 [Interruption Detected] User spoke while Marcus was talking:', text);
      this.interruptionDetected = true;
      this.lastInterruptionWasNoise = false; // Real speech detected
      
      // Stop Marcus immediately (may already be stopped by VAD)
      this.stopSpeaking().catch(err => {
        console.error('[MarcusVoiceManager] Error stopping speech on interruption:', err);
      });
      
      // Notify controller about interruption
      if (this.config.onInterruption) {
        this.config.onInterruption(text);
      }
    }
    
    // 🔍 SMART RECOVERY: Check if interruption was false positive (no actual speech)
    if (this.interruptionDetected && isFinal && text.trim().length === 0) {
      // Marcus was stopped but no speech was detected - likely noise!
      console.log('🤔 [False Interruption] Marcus was stopped but no speech detected');
      this.lastInterruptionWasNoise = true;
      
      // Trigger recovery response after brief pause
      setTimeout(() => {
        if (this.lastInterruptionWasNoise && !this.isSpeaking) {
          this.handleFalseInterruption();
        }
      }, 800); // Wait 800ms to see if user actually speaks
    }

    // Forward transcript to callback
    this.config.onTranscript(text, isFinal);
  }

  private handleAudioReady(audioData: ArrayBuffer): void {
    // Audio playback handled by CartesiaService
    console.log('[MarcusVoiceManager] Audio ready:', audioData.byteLength, 'bytes');
  }

  private updateSpeakingState(isSpeaking: boolean): void {
    this.isSpeaking = isSpeaking;
    this.config.onSpeakingStateChange(isSpeaking);
  }

  private handleError(error: Error): void {
    console.error('[MarcusVoiceManager] Error:', error);
    this.config.onError(error);
  }

  private updateCost(): void {
    // Deepgram Nova-2: $0.0043/min
    const sttCost = this.metrics.sttMinutes * 0.0043;
    
    // Cartesia: ~$0.005 per 1000 chars (estimate)
    const ttsCost = (this.metrics.ttsCharacters / 1000) * 0.005;
    
    this.metrics.estimatedCost = sttCost + ttsCost;
    
    if (this.config.onCostUpdate) {
      this.config.onCostUpdate(sttCost, ttsCost);
    }
  }

  /**
   * Handle false interruption - Marcus was stopped by noise, not actual speech
   */
  private handleFalseInterruption(): void {
    console.log('💬 [Smart Recovery] Asking if user said something...');
    
    const recoveryPhrases = [
      "Did you say something?",
      "Sorry, did you speak?",
      "I thought I heard you - what was that?",
      "Did you want to add something?",
      "Sorry, I missed that - what did you say?"
    ];
    
    const phrase = recoveryPhrases[Math.floor(Math.random() * recoveryPhrases.length)];
    
    // Speak the recovery phrase
    this.speak(phrase, {
      emotion: 'neutral',
      speed: 1.0
    }).catch(err => {
      console.error('[MarcusVoiceManager] Error speaking recovery phrase:', err);
    });
    
    this.lastInterruptionWasNoise = false;
  }
}

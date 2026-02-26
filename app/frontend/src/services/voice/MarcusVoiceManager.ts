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
  private recentMarcusSpeech: string[] = []; // Track Marcus's recent utterances for echo detection
  
  // Backchannel patterns (don't interrupt on these)
  private readonly BACKCHANNELS = ['mm-hmm', 'mhm', 'uh-huh', 'yeah', 'yep', 'right', 'okay', 'ok', 'sure', 'mm'];
  private readonly CLARIFICATION_WORDS = ['wait', 'hold on', 'hang on', 'stop', 'what', 'sorry', 'huh', 'excuse me', 'actually', 'no', 'well', 'but', 'however'];
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
    emotion?: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
    speed?: number;
  }): Promise<void> {
    // Generate unique ID for this speech
    const speechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSpeechId = speechId;
    
    // Store Marcus's speech for echo detection (strip SSML tags first)
    const cleanText = text.replace(/<[^>]+>/g, '').toLowerCase(); // Remove all SSML tags
    this.recentMarcusSpeech.push(cleanText);
    if (this.recentMarcusSpeech.length > 5) {
      this.recentMarcusSpeech.shift(); // Keep only last 5 utterances
    }
    
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

    // ECHO PREVENTION: Pause STT during TTS playback
    this.sttService.pauseForTTS(cleanText);

    // Synthesize and play with voice options
    await this.ttsService.speak(text, {
      voiceId: options?.voiceId,
      emotion: options?.emotion,
      speed: options?.speed,
    });
    
    // ECHO PREVENTION: Resume STT after TTS complete
    this.sttService.resumeAfterTTS();
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
   * Handle transcript from ASR - forward to controller layer
   * NOTE: Interruption detection disabled here - CharmerController handles it via utterance counts
   * This prevents false interruptions from delayed UtteranceEnd events
   */
  private handleTranscript(text: string, isFinal: boolean): void {
    // Simply forward to callback - let CharmerController handle interruption logic
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

}

/**
 * Cartesia Text-to-Speech Service - WebSocket Streaming
 * 
 * Cost: ~$5-10 per 1M characters (cheaper than ElevenLabs)
 * Latency: <1 second with streaming (was 3+ seconds with REST)
 * Quality: Beats ElevenLabs in blind tests (61.4% preference)
 * 
 * Features:
 * - Real-time WebSocket streaming TTS
 * - Emotional tone control
 * - Voice cloning support
 * - Interrupt handling
 * - Audio chunk streaming for instant playback
 */

export interface CartesiaConfig {
  onAudioReady: (audioData: ArrayBuffer) => void;
  onSpeakingStart: () => void;
  onSpeakingEnd: () => void;
  onError: (error: Error) => void;
}

export interface SpeakOptions {
  voiceId?: string;
  emotion?: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
  speed?: number; // 0.5 - 2.0
}

// Map our emotion types to Cartesia's emotion system
// Cartesia emotions: anger, positivity, surprise, sadness, curiosity
// Format: ["emotion_name:level"] where level is: lowest, low, (moderate), high, highest
// BOOSTED LEVELS: Marcus is charismatic and expressive - use high/highest for clear emotional tone
const ENABLE_CARTESIA_EMOTIONS = false; // Feature flag - set true to re-enable emotion control

const EMOTION_MAP: Record<string, string[]> = {
  // Neutral/baseline
  'neutral': [], // No emotion tags = neutral
  
  // Positive emotions (BOOSTED for Marcus's charismatic personality)
  'happy': ['positivity:high'], // Baseline friendly - boosted from moderate
  'warm': ['positivity:highest'], // Genuinely warm, caring - maxed out
  'excited': ['positivity:highest', 'curiosity:high'], // Genuinely excited, energized - boosted curiosity
  'amused': ['positivity:highest'], // Finding something funny/entertaining - boosted, removed low curiosity
  
  // Curiosity/Interest
  'interested': ['curiosity:high', 'positivity:moderate'], // Paying attention - boosted both
  'curious': ['curiosity:highest', 'surprise:moderate'], // Really wants to know more - boosted
  'intrigued': ['curiosity:highest', 'positivity:high'], // Fascinated, drawn in - boosted positivity
  
  // Surprise
  'surprised': ['surprise:highest', 'curiosity:high'], // Caught off guard - boosted both
  
  // Skeptical/Cautious
  'skeptical': ['curiosity:low', 'positivity:lowest'], // Not convinced, dubious - added negativity
  
  // Negative emotions (BOOSTED for clear emotional expression)
  'disappointed': ['sadness:high'], // Let down - boosted
  'worried': ['sadness:moderate', 'positivity:lowest'], // Concerned - boosted sadness, added negativity
  'frustrated': ['anger:moderate', 'sadness:moderate'], // Mildly irritated - boosted sadness
  'annoyed': ['anger:high'], // More irritated - boosted
};

export class CartesiaService {
  private config: CartesiaConfig;
  private audioContext: AudioContext | null = null;
  private apiKey: string = '';

  // WebSocket
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private connectPromise: Promise<void> | null = null; // Connection lock - prevents duplicate concurrent connections
  private activeContextId: string | null = null; // Routes messages to the active synthesis only
  private synthStartTime: number = 0;
  private streamSynthesisResolve: (() => void) | null = null;
  private streamSynthesisReject: ((err: Error) => void) | null = null;
  private _firstChunkLogged = false;

  // Playback state
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  private scheduledEndTime: number = 0;
  private minBufferChunks: number = 2;
  private playbackCompleteResolve: (() => void) | null = null;
  private streamingComplete: boolean = false;
  private playbackResolved: boolean = false;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // Interruption safety
  private activeGenerationId = 0; // Incremented on each speak/stop - invalidates stale chunks
  private activeSources = new Set<AudioBufferSourceNode>(); // Every scheduled source, for hard stop
  private playbackTimers = new Set<ReturnType<typeof setTimeout>>(); // Every scheduled timer, for hard stop

  // Voice options (from Cartesia's library)
  private static readonly VOICES = {
    // Male voices
    'confident-male': 'a0e99841-438c-4a64-b679-ae501e7d6091',
    'friendly-male': 'b7d50908-b17c-442d-ad8d-810c63997ed9',
    'professional-male': '79a125e8-cd45-4c13-8a67-188112f4dd22',
    
    // Female voices
    'warm-female': '694f9389-aac1-45b6-b726-9d9369183238',
    'energetic-female': 'a167e0f3-df7e-4d52-a9c3-f949145efdab',
    'professional-female': 'b7d50908-b17c-442d-ad8d-810c63997ed9',
  };

  constructor(config: CartesiaConfig) {
    this.config = config;
    this.initAudioContext();
    // Pre-fetch API key, THEN connect WebSocket (avoids race condition where
    // connectWebSocket polls for key that hasn't arrived yet)
    this.prefetchApiKey().then(() => this.connectWebSocket()).catch((err) => {
      console.warn('[Cartesia] Pre-connect failed (will reconnect on first speak):', err?.message);
    });
  }

  /**
   * Initialize audio context
   */
  private initAudioContext(): void {
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    console.log('[Cartesia] Audio context initialized');
  }

  /**
   * Pre-fetch API key to avoid delay on first speak
   */
  private async prefetchApiKey(): Promise<void> {
    try {
      const response = await fetch('/api/cartesia/token');
      if (!response.ok) throw new Error(`Token fetch failed: ${response.status}`);
      const data = await response.json();
      const key = data.key || data.api_key || data.token;
      if (!key) throw new Error('Token response missing key');
      this.apiKey = key;
      console.log('[Cartesia] API key pre-fetched and ready');
    } catch (error) {
      console.warn('[Cartesia] Failed to pre-fetch API key, will fetch on first speak');
    }
  }

  /**
   * Speak text using Cartesia TTS - WebSocket Streaming
   */
  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    try {
      console.log('[Cartesia] Streaming synthesis:', text);
      const startTime = performance.now();

      // Fix 9: Lazy-init AudioContext (browser may block before user gesture)
      if (!this.audioContext) this.initAudioContext();
      if (this.audioContext!.state === 'suspended') await this.audioContext!.resume();

      // Fix 6: Harden API key fetch
      if (!this.apiKey) {
        const response = await fetch('/api/cartesia/token');
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Cartesia token failed: ${response.status} ${body.slice(0, 200)}`);
        }
        const data = await response.json();
        const key = data.key || data.api_key || data.token;
        if (!key) throw new Error('Cartesia token response missing key');
        this.apiKey = key;
      }

      if (!this.isConnected) await this.connectWebSocket();

      // Stop any in-progress speech, then claim this generation's ID
      await this.stop();
      const generationId = ++this.activeGenerationId;

      this.audioQueue = [];
      this.scheduledEndTime = 0;
      this.streamingComplete = false;
      this.playbackResolved = false;
      if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }

      this.config.onSpeakingStart();

      const playbackCompletePromise = new Promise<void>((resolve) => {
        this.playbackCompleteResolve = resolve;
      });

      let voiceId = options.voiceId || 'confident-male';
      if (CartesiaService.VOICES[voiceId as keyof typeof CartesiaService.VOICES]) {
        voiceId = CartesiaService.VOICES[voiceId as keyof typeof CartesiaService.VOICES];
      }

      const emotionKey = options.emotion || 'neutral';
      const emotionTags: string[] = ENABLE_CARTESIA_EMOTIONS
        ? (EMOTION_MAP[emotionKey] || EMOTION_MAP['neutral'])
        : [];
      const speed = options.speed || 1.0;

      console.log('[Cartesia] Using voice ID:', voiceId);
      console.log('[Cartesia] Emotion DISABLED for performance test:', emotionKey, '→', emotionTags);

      await this.streamSynthesize(text, voiceId, emotionTags, speed, startTime, generationId);

      const estimatedMs = Math.max(8000, Math.min(20000, (text.length * 150) + 2000));
      console.log(`[Cartesia] Setting safety timeout: ${estimatedMs}ms (text length: ${text.length})`);

      const timeoutPromise = new Promise<void>((resolve) => {
        this.timeoutHandle = setTimeout(() => {
          console.warn('[Cartesia] ⚠️ Safety timeout fired - force resolving playback');
          this.resolvePlaybackOnce('timeout');
          resolve();
        }, estimatedMs);
      });

      await Promise.race([playbackCompletePromise, timeoutPromise]);

      if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
      console.log('[Cartesia] ✅ Audio playback fully complete');

    } catch (error) {
      console.error('[Cartesia] Synthesis error:', error);
      this.config.onError(error as Error);
      this.config.onSpeakingEnd();
      this.resolvePlaybackOnce('error');
    }
  }

  /**
   * Stop current speech IMMEDIATELY (for interruptions)
   */
  async stop(): Promise<void> {
    console.log('[Cartesia] 🛑 IMMEDIATE STOP requested');

    // Fix 3: Increment generationId - invalidates all pending chunks and timers
    this.activeGenerationId++;

    this.audioQueue = [];
    this.isPlaying = false;
    this.streamingComplete = false;

    // Fix 2: Clear every scheduled playback timer
    for (const timer of this.playbackTimers) clearTimeout(timer);
    this.playbackTimers.clear();

    if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }

    // Fix 1: Stop and disconnect EVERY scheduled AudioBufferSourceNode (not just currentSource)
    for (const source of this.activeSources) {
      try { source.stop(0); source.disconnect(); } catch {}
    }
    this.activeSources.clear();

    // Fix 5: Always notify UI that speaking stopped
    this.config.onSpeakingEnd();

    // Fix 4: Only resolve if not already resolved (avoids weird state on double-stop)
    if (!this.playbackResolved) {
      this.resolvePlaybackOnce('stop');
    }

    // Flush any remaining scheduled audio via suspend/resume cycle
    if (this.audioContext && this.audioContext.state === 'running') {
      try {
        await this.audioContext.suspend();
        await this.audioContext.resume();
      } catch (e) {
        console.warn('[Cartesia] Could not suspend/resume audio context:', e);
      }
    }

    console.log('[Cartesia] ✅ Speech stopped immediately');
  }

  /**
   * Get available voices
   */
  static getVoices(): Record<string, string> {
    return { ...CartesiaService.VOICES };
  }

  // Private methods

  /**
   * Connect to Cartesia WebSocket for streaming
   */
  private async connectWebSocket(): Promise<void> {
    if (this.isConnected && this.ws) return;
    // Fix 7: Connection lock - prevents twin WebSocket connections
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this._doConnect().finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }

  private async _doConnect(): Promise<void> {
    try {
      console.log('[Cartesia] Connecting to WebSocket...');

      let attempts = 0;
      while (!this.apiKey && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!this.apiKey) throw new Error('API key not available');

      const wsUrl = `wss://api.cartesia.ai/tts/websocket?api_key=${this.apiKey}&cartesia_version=2025-04-16`;
      this.ws = new WebSocket(wsUrl);

      return new Promise<void>((resolve, reject) => {
        // Connection timeout - a WS that neither opens nor errors can hang indefinitely
        const connTimeout = setTimeout(() => reject(new Error('WebSocket connection timed out')), 10000);

        this.ws!.onopen = () => {
          clearTimeout(connTimeout);
          console.log('[Cartesia] WebSocket connected');
          this.isConnected = true;
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(connTimeout);
          console.error('[Cartesia] WebSocket error:', error);
          this.isConnected = false;
          reject(new Error('WebSocket connection failed'));
        };

        this.ws!.onclose = () => {
          console.log('[Cartesia] WebSocket closed');
          this.isConnected = false;
        };

        // Fix 8: Stable permanent handler - no per-synthesis override needed
        this.ws!.onmessage = (event) => this.handleWebSocketMessage(event.data);
      });
    } catch (error) {
      console.error('[Cartesia] Failed to connect WebSocket:', error);
      throw error;
    }
  }

  /**
   * Stream synthesis via WebSocket
   */
  private async streamSynthesize(
    text: string,
    voiceId: string,
    emotionTags: string[],
    speed: number,
    startTime: number,
    generationId: number
  ): Promise<void> {
    if (!this.ws || !this.isConnected) throw new Error('WebSocket not connected');

    const contextId = `marcus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.activeContextId = contextId;
    this.synthStartTime = startTime;
    this._firstChunkLogged = false;
    this._pendingGenerationId = generationId;

    const experimentalControls: any = { speed: speed.toString() };
    if (emotionTags.length > 0) experimentalControls.emotion = emotionTags;

    const request = {
      context_id: contextId,
      model_id: 'sonic-2',
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: 48000 },
      language: 'en',
      _experimental: { voice: { __experimental_controls: experimentalControls } },
    };

    // Fix 8: Register callbacks on class fields - handleWebSocketMessage will call them
    return new Promise<void>((resolve, reject) => {
      this.streamSynthesisResolve = resolve;
      this.streamSynthesisReject = reject;
      this.ws!.send(JSON.stringify(request));
      console.log('[Cartesia] Synthesis request sent via WebSocket (context:', contextId + ')');
    });
  }

  private _pendingGenerationId = 0; // generationId captured at streamSynthesize time

  /**
   * Fix 8: Stable permanent WebSocket message handler - routes by activeContextId
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Drop messages from stale/cancelled syntheses
      if (message.context_id && message.context_id !== this.activeContextId) {
        console.log(`[Cartesia] Ignoring stale message (context: ${message.context_id})`);
        return;
      }

      if (message.type === 'chunk' && message.data) {
        if (!this._firstChunkLogged) {
          this._firstChunkLogged = true;
          const elapsed = performance.now() - this.synthStartTime;
          console.log(`[Cartesia] First chunk in ${elapsed.toFixed(0)}ms`);
        }
        const audioChunk = this.base64ToFloat32(message.data);
        this.audioQueue.push(audioChunk);
        if (!this.isPlaying && this.audioQueue.length >= this.minBufferChunks) {
          this.isPlaying = true;
          this.playQueuedAudio(this._pendingGenerationId);
        }

      } else if (message.type === 'done') {
        const totalTime = performance.now() - this.synthStartTime;
        console.log(`[Cartesia] 📥 Streaming complete in ${totalTime.toFixed(0)}ms (audio still playing)`);
        this.streamingComplete = true;
        this.streamSynthesisResolve?.();
        this.streamSynthesisResolve = null;
        this.streamSynthesisReject = null;
        this.checkForPlaybackCompletion();

      } else if (message.type === 'error') {
        console.error('[Cartesia] Streaming error:', message.error);
        const err = new Error(message.error);
        this.streamSynthesisReject?.(err);
        this.streamSynthesisResolve = null;
        this.streamSynthesisReject = null;
      }
    } catch (error) {
      console.error('[Cartesia] Message parse error:', error);
    }
  }

  /**
   * Convert base64 to Float32Array
   */
  private base64ToFloat32(base64: string): Float32Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Float32Array(bytes.buffer);
  }

  /**
   * Central completion check - called whenever state changes that might indicate completion
   */
  private checkForPlaybackCompletion(): void {
    console.log(`[Cartesia] 🔍 Checking completion: queue=${this.audioQueue.length}, streaming=${this.streamingComplete}, playing=${this.isPlaying}, resolved=${this.playbackResolved}`);
    
    // Only check if we haven't already resolved
    if (this.playbackResolved) {
      return;
    }
    
    // Check if queue is empty AND streaming is complete
    if (this.audioQueue.length === 0 && this.streamingComplete) {
      // Wait for scheduled audio to finish playing
      const now = this.audioContext?.currentTime || 0;
      const remainingTime = Math.max(0, this.scheduledEndTime - now);
      
      console.log(`[Cartesia] 📊 Audio timing: now=${now.toFixed(2)}s, scheduled=${this.scheduledEndTime.toFixed(2)}s, remaining=${remainingTime.toFixed(2)}s`);
      
      if (remainingTime > 0.01) {
        const waitMs = Math.ceil(remainingTime * 1000) + 50;
        console.log(`[Cartesia] ⏳ Waiting ${waitMs}ms for scheduled audio to finish`);
        // Fix 2: Register this timer so stop() can cancel it
        let timer: ReturnType<typeof setTimeout>;
        timer = setTimeout(() => {
          this.playbackTimers.delete(timer);
          this.isPlaying = false;
          this.config.onSpeakingEnd();
          this.resolvePlaybackOnce('scheduled_audio_complete');
        }, waitMs);
        this.playbackTimers.add(timer);
      } else {
        // Audio finished - resolve immediately
        console.log(`[Cartesia] 🎵 Audio finished immediately (no remaining time)`);
        this.isPlaying = false;
        this.config.onSpeakingEnd();
        this.resolvePlaybackOnce('immediate_complete');
      }
    }
  }
  
  /**
   * Resolve playback promise exactly once (prevents double-resolution)
   */
  private resolvePlaybackOnce(reason: string): void {
    if (this.playbackResolved) {
      console.log(`[Cartesia] ⏭️ Already resolved, ignoring: ${reason}`);
      return;
    }
    
    this.playbackResolved = true;
    console.log(`[Cartesia] ✅ Resolving playback: ${reason}`);
    
    if (this.playbackCompleteResolve) {
      this.playbackCompleteResolve();
      this.playbackCompleteResolve = null;
    }
    
    // Clear timeout on resolution
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  /**
   * Play queued audio chunks in real-time with smooth scheduling
   */
  private playQueuedAudio(generationId: number): void {
    // Fix 3: Guard - ignore if generation was superseded by stop() or new speak()
    if (generationId !== this.activeGenerationId) return;

    if (this.audioQueue.length === 0) {
      console.log(`[Cartesia] 💭 Queue empty, checking for completion...`);
      this.checkForPlaybackCompletion();
      // Fix 2: Track this lookahead timer
      let timer: ReturnType<typeof setTimeout>;
      timer = setTimeout(() => {
        this.playbackTimers.delete(timer);
        if (this.audioQueue.length > 0 && generationId === this.activeGenerationId) {
          console.log(`[Cartesia] 📥 More chunks arrived, resuming playback`);
          this.playQueuedAudio(generationId);
        }
      }, 50);
      this.playbackTimers.add(timer);
      return;
    }

    const chunk = this.audioQueue.shift()!;
    if (!this.audioContext) this.initAudioContext();

    const audioBuffer = this.audioContext!.createBuffer(1, chunk.length, 48000);
    audioBuffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0);

    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    // Fix 1: Track every source so stop() can cancel all scheduled audio
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);

    const now = this.audioContext!.currentTime;
    const startTime = Math.max(now, this.scheduledEndTime);
    source.start(startTime);
    this.scheduledEndTime = startTime + audioBuffer.duration;

    const nextChunkDelay = Math.max(10, (audioBuffer.duration * 1000) - 50);
    // Fix 2: Track this scheduling timer
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(() => {
      this.playbackTimers.delete(timer);
      this.playQueuedAudio(generationId);
    }, nextChunkDelay);
    this.playbackTimers.add(timer);

    console.log(`[Cartesia] 🔊 Playing chunk: ${chunk.length} samples, duration=${audioBuffer.duration.toFixed(2)}s, next in ${nextChunkDelay.toFixed(0)}ms`);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

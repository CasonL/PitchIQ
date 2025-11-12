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
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised';
  speed?: number; // 0.5 - 2.0
}

// Map our emotion types to Cartesia's emotion system
// Cartesia emotions: anger, positivity, surprise, sadness, curiosity
// Format: ["emotion_name:level"] where level is: lowest, low, (moderate), high, highest
const EMOTION_MAP: Record<string, string[]> = {
  'neutral': [], // No emotion tags = neutral
  'happy': ['positivity:moderate'], // Warm, friendly - reduced from 'high' to prevent creepy laughter
  'sad': ['sadness:high'], // Sad, disappointed
  'angry': ['anger:moderate'], // Frustrated, upset (not too intense)
  'fearful': ['sadness:low'], // Concerned, worried (Cartesia doesn't have "fear")
  'surprised': ['surprise:high', 'curiosity:moderate'], // Surprised and curious
};

export class CartesiaService {
  private config: CartesiaConfig;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private apiKey: string = '';
  
  // WebSocket streaming
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  private scheduledEndTime: number = 0;
  private minBufferChunks: number = 2; // Wait for at least 2 chunks before playing
  private playbackCompleteResolve: (() => void) | null = null; // Resolve when playback actually finishes
  private streamingComplete: boolean = false; // Track if streaming is done

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
    // Pre-fetch API key and connect WebSocket to avoid delay on first speak
    this.prefetchApiKey();
    this.connectWebSocket();
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
      const data = await response.json();
      this.apiKey = data.key;
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

      // Get API key from backend (secure)
      if (!this.apiKey) {
        const response = await fetch('/api/cartesia/token');
        const data = await response.json();
        this.apiKey = data.key;
      }

      // Ensure WebSocket is connected
      if (!this.isConnected) {
        await this.connectWebSocket();
      }

      // Stop current speech if any
      await this.stop();

      // Clear audio queue for new speech
      this.audioQueue = [];
      this.scheduledEndTime = 0;
      this.streamingComplete = false;

      this.config.onSpeakingStart();

      // Create promise that resolves when playback actually completes
      const playbackCompletePromise = new Promise<void>((resolve) => {
        this.playbackCompleteResolve = resolve;
      });

      // Convert voice ID if needed
      let voiceId = options.voiceId || 'confident-male';
      if (CartesiaService.VOICES[voiceId as keyof typeof CartesiaService.VOICES]) {
        voiceId = CartesiaService.VOICES[voiceId as keyof typeof CartesiaService.VOICES];
      }
      
      const emotionKey = options.emotion || 'neutral';
      const emotionTags = EMOTION_MAP[emotionKey] || EMOTION_MAP['neutral'];
      const speed = options.speed || 1.0;
      
      console.log('[Cartesia] Using voice ID:', voiceId);
      console.log('[Cartesia] Emotion:', emotionKey, '→', emotionTags);

      // Start streaming synthesis
      await this.streamSynthesize(text, voiceId, emotionTags, speed, startTime);

      // Wait for playback to actually complete
      await playbackCompletePromise;
      console.log('[Cartesia] ✅ Audio playback fully complete');

    } catch (error) {
      console.error('[Cartesia] Synthesis error:', error);
      this.config.onError(error as Error);
      this.config.onSpeakingEnd();
      
      // Resolve playback promise on error to prevent hanging
      if (this.playbackCompleteResolve) {
        this.playbackCompleteResolve();
        this.playbackCompleteResolve = null;
      }
    }
  }

  /**
   * Stop current speech IMMEDIATELY (for interruptions)
   */
  async stop(): Promise<void> {
    console.log('[Cartesia] 🛑 IMMEDIATE STOP requested');
    
    // Clear audio queue to prevent any more chunks from playing
    this.audioQueue = [];
    this.isPlaying = false;
    this.streamingComplete = false;
    
    // Resolve playback promise on stop to prevent hanging
    if (this.playbackCompleteResolve) {
      this.playbackCompleteResolve();
      this.playbackCompleteResolve = null;
    }
    
    // Stop current audio source immediately
    if (this.currentSource) {
      try {
        this.currentSource.stop(0); // Stop immediately (0 = now)
        this.currentSource.disconnect();
      } catch (e) {
        // Source may have already ended - that's okay
      }
      this.currentSource = null;
    }
    
    // Suspend audio context to kill any buffered audio
    if (this.audioContext && this.audioContext.state === 'running') {
      try {
        await this.audioContext.suspend();
        // Resume immediately so we're ready for next speech
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

    try {
      console.log('[Cartesia] Connecting to WebSocket...');

      // Wait for API key if not loaded yet
      let attempts = 0;
      while (!this.apiKey && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!this.apiKey) {
        throw new Error('API key not available');
      }

      const wsUrl = `wss://api.cartesia.ai/tts/websocket?api_key=${this.apiKey}&cartesia_version=2025-04-16`;
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        this.ws!.onopen = () => {
          console.log('[Cartesia] WebSocket connected');
          this.isConnected = true;
          resolve();
        };

        this.ws!.onerror = (error) => {
          console.error('[Cartesia] WebSocket error:', error);
          this.isConnected = false;
          reject(new Error('WebSocket connection failed'));
        };

        this.ws!.onclose = () => {
          console.log('[Cartesia] WebSocket closed');
          this.isConnected = false;
        };

        this.ws!.onmessage = (event) => {
          this.handleWebSocketMessage(event.data);
        };
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
    startTime: number
  ): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      let firstChunkReceived = false;

      // Set up message handler for this synthesis
      const originalHandler = this.ws!.onmessage;
      this.ws!.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'chunk' && message.data) {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              const elapsed = performance.now() - startTime;
              console.log(`[Cartesia] First chunk in ${elapsed.toFixed(0)}ms`);
            }

            // Decode base64 audio chunk
            const audioChunk = this.base64ToFloat32(message.data);
            this.audioQueue.push(audioChunk);
            
            // Start playback once we have minimum buffer
            if (!this.isPlaying && this.audioQueue.length >= this.minBufferChunks) {
              this.isPlaying = true;
              this.playQueuedAudio();
            }
          } else if (message.type === 'done') {
            const totalTime = performance.now() - startTime;
            console.log(`[Cartesia] Streaming complete in ${totalTime.toFixed(0)}ms (audio still playing)`);
            this.streamingComplete = true;
            this.ws!.onmessage = originalHandler;
            resolve();
          } else if (message.type === 'error') {
            console.error('[Cartesia] Streaming error:', message.error);
            this.ws!.onmessage = originalHandler;
            reject(new Error(message.error));
          }
        } catch (error) {
          console.error('[Cartesia] Message handling error:', error);
        }
      };

      // Send synthesis request with required context_id
      const contextId = `marcus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Build experimental controls
      const experimentalControls: any = {
        speed: speed.toString(),
      };
      
      // Only add emotion if we have tags (neutral has empty array)
      if (emotionTags.length > 0) {
        experimentalControls.emotion = emotionTags;
      }
      
      const request = {
        context_id: contextId,
        model_id: 'sonic-2', // Sonic 2.0 - fastest and most natural
        transcript: text,
        voice: {
          mode: 'id',
          id: voiceId,
        },
        output_format: {
          container: 'raw',
          encoding: 'pcm_f32le',
          sample_rate: 48000,
        },
        language: 'en',
        _experimental: {
          voice: {
            __experimental_controls: experimentalControls,
          },
        },
      };

      this.ws!.send(JSON.stringify(request));
      console.log('[Cartesia] Synthesis request sent via WebSocket (context:', contextId + ')');
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log('[Cartesia] WebSocket message:', message.type);
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
   * Play queued audio chunks in real-time with smooth scheduling
   */
  private playQueuedAudio(): void {
    if (this.audioQueue.length === 0) {
      // Check again in a moment in case more chunks are coming
      setTimeout(() => {
        if (this.audioQueue.length > 0) {
          this.playQueuedAudio();
        } else if (this.streamingComplete) {
          // Streaming is done AND queue is empty = playback complete
          this.isPlaying = false;
          this.config.onSpeakingEnd();
          
          // Resolve the playback complete promise
          if (this.playbackCompleteResolve) {
            console.log('[Cartesia] 🎵 All audio chunks played, resolving promise');
            this.playbackCompleteResolve();
            this.playbackCompleteResolve = null;
          }
        }
      }, 50);
      return;
    }

    const chunk = this.audioQueue.shift()!;

    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Create buffer for this chunk
    const audioBuffer = this.audioContext!.createBuffer(
      1, // mono
      chunk.length,
      48000
    );

    // Copy chunk data to audio buffer (type assertion needed for strict TS)
    audioBuffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0);

    // Create source and schedule playback
    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    // Calculate when to start this chunk
    const now = this.audioContext!.currentTime;
    const startTime = Math.max(now, this.scheduledEndTime);
    
    // Schedule this chunk
    source.start(startTime);
    
    // Update scheduled end time for next chunk
    this.scheduledEndTime = startTime + audioBuffer.duration;
    
    // Schedule next chunk playback slightly before this one ends
    const nextChunkDelay = Math.max(10, (audioBuffer.duration * 1000) - 50);
    setTimeout(() => {
      this.playQueuedAudio();
    }, nextChunkDelay);

    this.currentSource = source;
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Cartesia returns Float32 PCM data
    const float32Array = new Float32Array(audioData);

    // Create audio buffer
    const audioBuffer = this.audioContext!.createBuffer(
      1, // mono
      float32Array.length,
      48000
    );

    // Copy data to buffer (type assertion needed for strict TS)
    audioBuffer.copyToChannel(float32Array as Float32Array<ArrayBuffer>, 0);

    // Create source and play
    this.currentSource = this.audioContext!.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.audioContext!.destination);

    return new Promise((resolve) => {
      this.currentSource!.onended = () => {
        console.log('[Cartesia] Playback finished');
        this.currentSource = null;
        resolve();
      };

      this.currentSource!.start();
      console.log('[Cartesia] Playback started');
    });
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

// DirectAudioManager.ts - Direct implementation of DeepgramVoiceAgent audio processing
// Created to solve static/screeching issues by using the exact working implementation

// Constants for audio processing
const TTS_RATE = 48000; // Sample rate for TTS playback - must match Deepgram output

type LogFunction = (message: string, level?: string) => void;

export interface DirectAudioManagerConfig {
  sessionId: string;
  onAudioData: (data: Float32Array) => void;
  log: LogFunction;
}

export class DirectAudioManager {
  private sessionId: string;
  private log: LogFunction;
  
  // Audio processing
  private micStream: MediaStream | null = null;
  private micCtx: AudioContext | null = null;
  private micNode: AudioWorkletNode | null = null;
  private spkCtx: AudioContext | null = null;
  
  // Audio playback management
  private playHead: number = 0;
  private audioPacketCount: number = 0;
  
  constructor(config: DirectAudioManagerConfig) {
    this.sessionId = config.sessionId;
    this.log = config.log;
    
    // Initialize audio playback
    this.initSpeaker();
  }
  
  /**
   * Initialize speaker for TTS playback
   */
  private initSpeaker(): void {
    this.spkCtx = new AudioContext({ sampleRate: TTS_RATE });
    this.playHead = this.spkCtx.currentTime + 0.05;
    this.spkCtx.resume().catch(() => {});
    this.log("🔈 Speaker ready", 'info');
  }

  /**
   * Unlock speaker AudioContext after a user gesture. Some browsers block
   * audio until a gesture occurs. Call this from a pointer/keyboard handler.
   */
  public async unlockAudio(): Promise<void> {
    try {
      if (!this.spkCtx || this.spkCtx.state === 'closed') {
        this.initSpeaker();
        return;
      }
      if (this.spkCtx.state === 'suspended') {
        await this.spkCtx.resume();
        this.log('✅ Speaker AudioContext resumed (gesture)', 'info');
      }
    } catch (e) {
      this.log(`❌ Failed to unlock speaker audio: ${e}`, 'error');
    }
  }
  
  /**
   * Request microphone access with retries
   */
  async requestMicrophone(retries = 3, delayMs = 500): Promise<MediaStream> {
    this.log(`🎤 Requesting microphone access for session ${this.sessionId}`, 'info');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.log('🎤 Microphone access granted', 'info');
      this.micStream = stream;
      return stream;
    } catch (error) {
      this.log(`❌ Microphone access error: ${error}`, 'error');
      
      if (retries > 0) {
        this.log(`🔄 Retrying microphone access (${retries} attempts left)...`, 'info');
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.requestMicrophone(retries - 1, delayMs);
      }
      
      throw new Error(`Failed to access microphone after multiple attempts: ${error}`);
    }
  }
  
  /**
   * Set up audio processing for microphone input
   */
  async setupAudioProcessing(onAudioData: (audioData: Float32Array) => void): Promise<void> {
    if (!this.micStream) {
      throw new Error('Microphone stream not available');
    }

    this.log(`🔊 Setting up audio processing for session ${this.sessionId}`, 'info');
    
    try {
      // Create audio context
      this.micCtx = new AudioContext({ sampleRate: TTS_RATE });
      
      // Load audio worklet
      try {
        // Try multiple possible paths to the worklet file
        try {
          await this.micCtx.audioWorklet.addModule('/deepgram-worklet.js');
          this.log('🔊 Audio worklet loaded successfully from /deepgram-worklet.js', 'debug');
        } catch (firstError) {
          try {
            await this.micCtx.audioWorklet.addModule('/static/deepgram-worklet.js');
            this.log('🔊 Audio worklet loaded successfully from /static/deepgram-worklet.js', 'debug');
          } catch (secondError) {
            // Last attempt with the original path
            await this.micCtx.audioWorklet.addModule('/js/deepgram-worklet.js');
            this.log('🔊 Audio worklet loaded successfully from /js/deepgram-worklet.js', 'debug');
          }
        }
      } catch (error) {
        this.log(`❌ Failed to load audio worklet: ${error}`, 'error');
        throw error;
      }
      
      // Create audio worklet node
      this.micNode = new AudioWorkletNode(this.micCtx, 'deepgram-worklet');
      
      // Set up message handling from worklet
      let hold = new Int16Array(0);
      let loggedSamples = false;
      
      this.micNode.port.onmessage = (e) => {
        const data = e.data;
        
        if (!loggedSamples && data.length > 50) {
          const rawFloats = new Float32Array(data.buffer, 0, 50);
          this.log(`🎤 Raw audio worklet samples initialized`, 'important');
          loggedSamples = true;
        }
        
        // Pass the audio data through onAudioData callback
        onAudioData(data);
      };
      
      // Connect microphone to audio processing
      const source = this.micCtx.createMediaStreamSource(this.micStream);
      source.connect(this.micNode);
      
      this.log('🔊 Audio processing setup complete', 'info');
    } catch (error) {
      this.log(`❌ Failed to set up audio processing: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Process and play TTS audio - exact implementation from DeepgramVoiceAgent
   */
  processTTS(payload: any): void {
    if (!this.spkCtx) {
      this.log("❌ No speaker context for TTS playback", 'error');
      return;
    }

    // Extract ArrayBuffer from different possible formats
    const pcmBuf: ArrayBuffer | undefined =
      payload instanceof ArrayBuffer     ? payload :
      ArrayBuffer.isView(payload)        ? payload.buffer :
      ArrayBuffer.isView(payload?.audio) ? payload.audio.buffer :
      undefined;

    if (!pcmBuf?.byteLength) {
      this.log("❌ Empty or invalid audio payload", 'error');
      return;
    }

    const audioSamples = new Int16Array(pcmBuf);
    const rms = Math.sqrt(audioSamples.reduce((sum, sample) => sum + sample * sample, 0) / audioSamples.length);
    
    // Audio RMS calculation for quality monitoring (removed debug log to reduce console noise)
    
    // Resume audio context if suspended
    if (this.spkCtx.state === "suspended") {
      this.log("🔊 Resuming suspended audio context...", 'important');
      this.spkCtx.resume().then(() => {
        this.log("✅ Audio context resumed", 'important');
      }).catch((err) => {
        this.log(`❌ Failed to resume audio context: ${err}`, 'error');
      });
    }
    
    try {
      // Convert Int16 to Float32 with proper scaling factor
      const i16 = new Int16Array(pcmBuf);
      const f32 = Float32Array.from(i16, (v) => v / 32768);
      
      // Create audio buffer with correct sample rate
      const buf = this.spkCtx.createBuffer(1, f32.length, TTS_RATE);
      buf.copyToChannel(f32, 0);

      // Create and connect audio source
      const src = this.spkCtx.createBufferSource();
      src.buffer = buf;
      src.connect(this.spkCtx.destination);

      // Schedule playback with proper timing
      const startAt = Math.max(this.playHead, this.spkCtx.currentTime + 0.02);
      src.start(startAt);
      this.playHead = startAt + buf.duration;
      
      // Log audio playback periodically
      this.audioPacketCount++;
      if (this.audioPacketCount % 20 === 0) {
        this.log(`🔊 TTS playing: ${buf.duration.toFixed(2)}s`, 'important');
      }
      
    } catch (error) {
      this.log(`❌ TTS playback failed: ${error}`, 'error');
    }
  }

  /**
   * Clean up all audio resources
   */
  cleanup(): void {
    this.log(`🧹 Cleaning up audio resources for session ${this.sessionId}`, 'info');
    
    // Stop all microphone tracks
    if (this.micStream) {
      this.log('🎤 Stopping all microphone tracks', 'info');
      this.micStream.getTracks().forEach(track => {
        track.stop();
        this.log(`🎤 Stopped track: ${track.kind}, enabled: ${track.enabled}, state: ${track.readyState}`, 'debug');
      });
      this.micStream = null;
    }
    
    // Disconnect audio node
    if (this.micNode) {
      this.log('🔊 Disconnecting audio worklet node', 'info');
      this.micNode.disconnect();
      this.micNode = null;
    }
    
    // Close audio contexts
    if (this.micCtx && this.micCtx.state !== 'closed') {
      this.log('🔊 Closing microphone audio context', 'info');
      this.micCtx.close().catch((e) => {
        this.log(`❌ Error closing mic context: ${e}`, 'error');
      });
      this.micCtx = null;
    }
    
    if (this.spkCtx && this.spkCtx.state !== 'closed') {
      this.log('🔊 Closing speaker audio context', 'info');
      this.spkCtx.close().catch(() => {});
      this.spkCtx = null;
    }
    
    // Reset counters
    this.audioPacketCount = 0;
    this.playHead = 0;
    
    this.log('🧹 Audio resources cleanup complete', 'info');
  }
}

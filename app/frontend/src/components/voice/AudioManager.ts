// AudioManager.ts - Handles audio processing for voice calls
import { MutableRefObject } from 'react';

type LogFunction = (message: string, level?: string) => void;

export interface AudioManagerConfig {
  sessionId: string;
  onAudioData: (data: Float32Array) => void;
  log: LogFunction;
}

export class AudioManager {
  private micCtx: AudioContext | null = null;
  private micNode: AudioWorkletNode | null = null;
  private micStream: MediaStream | null = null;
  private spkCtx: AudioContext | null = null;
  private sessionId: string;
  private onAudioData: (data: Float32Array) => void;
  private log: LogFunction;
  private sentenceBuffer: Float32Array[] = [];
  private currentSentenceAudio: Float32Array[] = [];
  private isPlayingSentence: boolean = false;
  private sentenceTimeout: number | null = null;

  constructor(config: AudioManagerConfig) {
    this.sessionId = config.sessionId;
    this.onAudioData = config.onAudioData;
    this.log = config.log;
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
   * Initialize audio context and worklet for processing
   */
  async setupAudioProcessing(): Promise<void> {
    if (!this.micStream) {
      throw new Error('Microphone stream not available');
    }

    this.log(`🔊 Setting up audio processing for session ${this.sessionId}`, 'info');
    
    // Create audio context
    this.micCtx = new AudioContext();
    
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
    this.micNode.port.onmessage = (event) => {
      const audioData = event.data;
      this.onAudioData(audioData);
    };
    
    // Connect microphone to audio processing
    const source = this.micCtx.createMediaStreamSource(this.micStream);
    source.connect(this.micNode);
    
    this.log('🔊 Audio processing setup complete', 'info');
  }

  /**
   * Process and play TTS audio
   */
  async processSentenceAudio(audioData: Float32Array): Promise<void> {
    if (!this.sentenceBuffer) {
      this.sentenceBuffer = [];
    }
    
    this.sentenceBuffer.push(audioData);
    
    if (!this.isPlayingSentence) {
      await this.playSentence();
    }
  }

  /**
   * Play the current sentence buffer
   */
  private async playSentence(): Promise<void> {
    if (this.sentenceBuffer.length === 0 || this.isPlayingSentence) {
      return;
    }
    
    this.isPlayingSentence = true;
    
    try {
      // Create speaker context if needed
      if (!this.spkCtx) {
        this.spkCtx = new AudioContext();
      }
      
      // Process all buffered audio
      while (this.sentenceBuffer.length > 0) {
        const audioData = this.sentenceBuffer.shift();
        if (!audioData) continue;
        
        // Create audio buffer
        const buffer = this.spkCtx.createBuffer(1, audioData.length, 16000);
        const channelData = buffer.getChannelData(0);
        channelData.set(audioData);
        
        // Create and play source
        const source = this.spkCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.spkCtx.destination);
        source.start();
        
        // Wait for audio to finish
        await new Promise(resolve => {
          source.onended = resolve;
        });
      }
    } catch (error) {
      this.log(`❌ Error playing sentence audio: ${error}`, 'error');
    } finally {
      this.isPlayingSentence = false;
    }
  }

  /**
   * Clean up all audio resources
   */
  cleanup(): void {
    this.log(`🧹 Cleaning up audio resources for session ${this.sessionId}`, 'info');
    
    // Clear sentence timeout
    if (this.sentenceTimeout) {
      clearTimeout(this.sentenceTimeout);
      this.sentenceTimeout = null;
    }
    
    // Process any remaining sentence audio
    if (this.currentSentenceAudio.length > 0) {
      this.processSentenceAudio(this.currentSentenceAudio[0]);
    }
    
    // Clear sentence buffers
    this.sentenceBuffer = [];
    this.currentSentenceAudio = [];
    this.isPlayingSentence = false;
    
    // Stop all microphone tracks
    if (this.micStream) {
      this.log('🎤 Stopping all microphone tracks', 'info');
      this.micStream.getTracks().forEach(track => {
        track.stop();
        this.log(`🎤 Stopped track: ${track.kind}, enabled: ${track.enabled}, state: ${track.readyState}`, 'debug');
      });
      this.micStream = null;
    }
    
    // Close audio context
    if (this.micCtx) {
      if (this.micCtx.state !== 'closed') {
        this.log('🔊 Closing microphone audio context', 'info');
        this.micCtx.close().catch((e) => {
          this.log(`❌ Error closing mic context: ${e}`, 'error');
        });
      }
      this.micCtx = null;
    }
    
    // Disconnect audio node
    if (this.micNode) {
      this.log('🔊 Disconnecting audio worklet node', 'info');
      this.micNode.disconnect();
      this.micNode = null;
    }
    
    // Close speaker context
    if (this.spkCtx) {
      if (this.spkCtx.state !== 'closed') {
        this.spkCtx.close().catch(() => {});
      }
      this.spkCtx = null;
    }
    
    this.log('🧹 Audio resources cleanup complete', 'info');
  }
}

/**
 * DeepgramSTTService.ts
 * Handles speech-to-text using Deepgram Nova-2 Streaming via official SDK
 * SDK handles browser WebSocket authentication properly
 */

import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';

export interface DeepgramConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  onSpeechStart?: () => void; // Called immediately when speech detected (VAD)
  apiKey?: string; // Optional - will fetch from backend if not provided
}

export class DeepgramSTTService {
  private liveClient: LiveClient | null = null;
  private config: DeepgramConfig;
  private isConnected: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private accumulatedTranscript: string = ''; // Accumulate utterance fragments
  private isPaused: boolean = false; // Pause STT to prevent echo
  private lastTTSTranscript: string = ''; // Track recent TTS output for echo detection
  private ttsEndTime: number = 0; // Track when TTS playback ended

  constructor(config: DeepgramConfig) {
    this.config = config;
  }

  /**
   * Pause STT to prevent echo during TTS playback
   */
  pauseForTTS(ttsText: string): void {
    this.isPaused = true;
    this.lastTTSTranscript = ttsText.toLowerCase();
    console.log('[Deepgram] ⏸️ STT paused during TTS playback');
  }

  /**
   * Resume STT after TTS playback complete
   */
  resumeAfterTTS(): void {
    this.isPaused = false;
    this.ttsEndTime = Date.now(); // Mark when TTS ended
    console.log('[Deepgram] ▶️ STT resumed after TTS');
  }

  /**
   * Connect to Deepgram streaming endpoint using official SDK
   */
  async connect(): Promise<void> {
    try {
      // Fetch API key if not provided
      const apiKey = this.config.apiKey || await this.fetchApiKey();
      if (!apiKey) {
        throw new Error('No Deepgram API key available');
      }

      console.log('[Deepgram] API key received:', apiKey.substring(0, 15) + '...');
      console.log('[Deepgram] Initializing Deepgram SDK client...');

      // Create Deepgram client with SDK
      const deepgram = createClient(apiKey);
      
      // Start live transcription connection
      // Note: Don't specify encoding/sample_rate when using MediaRecorder
      // SDK auto-detects from WebM container
      this.liveClient = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500, // 1.5s pause before ending utterance
        vad_events: false
      });

      // Setup event handlers
      this.liveClient.on(LiveTranscriptionEvents.Open, () => {
        console.log('[Deepgram] SDK WebSocket connected');
        this.isConnected = true;
      });

      this.liveClient.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        this.handleTranscript(data);
      });

      this.liveClient.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log('[Deepgram] Metadata:', data);
      });

      this.liveClient.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        console.log('[Deepgram] ✅ Utterance ended');
        if (this.accumulatedTranscript) {
          console.log(`[Deepgram] 📝 Complete utterance (UtteranceEnd): "${this.accumulatedTranscript}"`);
          try {
            this.config.onTranscript(this.accumulatedTranscript, true);
          } catch (error) {
            console.error('[Deepgram] ❌ CRITICAL: onTranscript callback threw error:', error);
            this.config.onError(error as Error);
          }
          this.accumulatedTranscript = '';
        }
      });

      this.liveClient.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log('[Deepgram] 🎤 Speech started');
        if (this.config.onSpeechStart) {
          this.config.onSpeechStart();
        }
      });

      this.liveClient.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('[Deepgram] SDK error:', error);
        this.config.onError(new Error(error.message || 'Deepgram SDK error'));
      });

      this.liveClient.on(LiveTranscriptionEvents.Close, () => {
        console.log('[Deepgram] SDK WebSocket closed');
        this.isConnected = false;
        this.stopMicrophone();
      });

      // Get microphone access and start streaming
      console.log('[Deepgram] Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.setupAudioStreaming(this.mediaStream);

    } catch (error) {
      console.error('[Deepgram] Connection failed:', error);
      this.config.onError(error as Error);
    }
  }

  /**
   * Fetch API key from backend
   */
  private async fetchApiKey(): Promise<string> {
    console.log('[Deepgram] Fetching API key from backend...');
    const response = await fetch('/api/deepgram/token');
    const data = await response.json();
    
    if (!data.key && !data.token) {
      throw new Error('No Deepgram API key received from backend');
    }
    
    return data.key || data.token;
  }

  /**
   * Setup audio streaming to Deepgram SDK
   */
  private setupAudioStreaming(stream: MediaStream): void {
    try {
      if (!this.liveClient) {
        throw new Error('Deepgram client not initialized');
      }

      // Use MediaRecorder to capture audio
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      let audioChunksSent = 0;
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.liveClient) {
          this.liveClient.send(event.data);
          audioChunksSent++;
          if (audioChunksSent === 1) {
            console.log('[Deepgram] First audio chunk sent via SDK');
          }
        }
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('[Deepgram] MediaRecorder error:', error);
        this.config.onError(new Error('Audio recording error'));
      };

      // Start recording with 100ms chunks for low latency
      this.mediaRecorder.start(100);
      console.log('[Deepgram] Audio streaming started via SDK');

    } catch (error) {
      console.error('[Deepgram] Audio streaming error:', error);
      this.config.onError(error as Error);
    }
  }

  /**
   * Stop microphone and audio processing
   */
  private stopMicrophone(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('[Deepgram] Microphone stopped');
  }

  /**
   * Check if transcript is likely echo from TTS
   * Only applies within 2 seconds after TTS ends to avoid false positives on conversational responses
   */
  private isLikelyEcho(transcript: string): boolean {
    if (!this.lastTTSTranscript) return false;
    
    // CRITICAL: Only apply echo filtering within 2 seconds of TTS ending
    // After that, user responses naturally reference the conversation topic (not echoes)
    const timeSinceTTS = Date.now() - this.ttsEndTime;
    if (timeSinceTTS > 2000) {
      return false; // Too late to be an echo - this is user speech
    }
    
    const transcriptLower = transcript.toLowerCase();
    const ttsLower = this.lastTTSTranscript;
    
    // Simple substring check - if STT output is contained in recent TTS output
    if (ttsLower.includes(transcriptLower) || transcriptLower.includes(ttsLower)) {
      return true;
    }
    
    // Word overlap check - calculate percentage of shared words
    const transcriptWords = new Set(transcriptLower.split(/\s+/).filter(w => w.length > 2));
    const ttsWords = new Set(ttsLower.split(/\s+/).filter(w => w.length > 2));
    
    if (transcriptWords.size === 0) return false;
    
    let matchCount = 0;
    transcriptWords.forEach(word => {
      if (ttsWords.has(word)) matchCount++;
    });
    
    const similarity = matchCount / transcriptWords.size;
    return similarity > 0.6; // 60% word overlap = likely echo
  }

  /**
   * Handle transcript from Deepgram SDK
   */
  private handleTranscript(data: any): void {
    try {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript) return;

      // ECHO PREVENTION: Drop transcripts while STT is paused for TTS
      if (this.isPaused) {
        console.log(`[Deepgram] 🔇 Dropped transcript during TTS pause: "${transcript}"`);
        return;
      }
      
      // ECHO FILTERING: Check if this looks like TTS echo
      if (this.isLikelyEcho(transcript)) {
        console.log(`[Deepgram] 🔇 Filtered likely echo: "${transcript}"`);
        return;
      }

      const isFinal = data.is_final === true;
      const speechFinal = data.speech_final === true;

      // Log the result
      if (isFinal) {
        console.log(`[Deepgram] ${speechFinal ? 'SPEECH FINAL' : 'Final'}: "${transcript}"`);
      }

      // Handle transcript accumulation
      if (speechFinal || isFinal) {
        // Append to accumulated transcript but DON'T process yet
        // Wait for UtteranceEnd to actually process
        if (this.accumulatedTranscript) {
          this.accumulatedTranscript += ' ' + transcript;
          console.log(`[Deepgram] Appending: "${transcript}"`);
          console.log(`[Deepgram] 📋 Accumulated: "${this.accumulatedTranscript}"`);
        } else {
          this.accumulatedTranscript = transcript;
          console.log(`[Deepgram] Started accumulating: "${transcript}"`);
        }
        this.config.onTranscript(transcript, false); // Update UI only
      } else {
        // Partial result - send as-is for UI feedback
        this.config.onTranscript(transcript, false);
      }

    } catch (error) {
      console.error('[Deepgram] Transcript parsing error:', error);
    }
  }

  /**
   * Disconnect from Deepgram SDK
   */
  async disconnect(): Promise<void> {
    console.log('[Deepgram] Disconnecting SDK...');
    
    this.stopMicrophone();

    if (this.liveClient) {
      this.liveClient.finish();
      this.liveClient = null;
    }

    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected;
  }
}

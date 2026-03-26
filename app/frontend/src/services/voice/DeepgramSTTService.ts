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
  onConnectionChange?: (connected: boolean, reconnecting: boolean) => void; // Connection state changes
  apiKey?: string; // Optional - will fetch from backend if not provided
  enableReconnection?: boolean; // Enable automatic reconnection (default: true)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
  useSentenceStreaming?: boolean; // A/B TEST: Use sentence streaming instead of interim results (default: false)
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
  private previousUtterance: string = ''; // Buffer previous utterance for merging
  private previousUtteranceTime: number = 0; // When previous utterance ended
  
  // Reconnection state
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private enableReconnection: boolean = true;
  private shouldStayConnected: boolean = false; // Track if we should reconnect on disconnect
  private useSentenceStreaming: boolean = false; // A/B test flag

  constructor(config: DeepgramConfig) {
    this.config = config;
    this.enableReconnection = config.enableReconnection !== false;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.useSentenceStreaming = config.useSentenceStreaming || false;
    
    if (this.useSentenceStreaming) {
      console.log('[Deepgram] 🧪 A/B TEST: Using SENTENCE STREAMING mode (no interim results)');
    } else {
      console.log('[Deepgram] 📝 Using INTERIM RESULTS mode (word-by-word with accumulation)');
    }
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
    this.shouldStayConnected = true;
    this.reconnectAttempts = 0;
    return this.attemptConnection();
  }

  /**
   * Internal method to attempt connection with reconnection support
   */
  private async attemptConnection(): Promise<void> {
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
      // A/B TEST: Configure based on streaming mode
      this.liveClient = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        smart_format: true,
        interim_results: !this.useSentenceStreaming, // Interim only in word mode
        utterance_end_ms: 2000, // 2s pause - allows multi-sentence pitches with natural pauses
        vad_events: false
      });

      // Setup event handlers
      this.liveClient.on(LiveTranscriptionEvents.Open, () => {
        console.log('[Deepgram] SDK WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        if (this.config.onConnectionChange) {
          this.config.onConnectionChange(true, false);
        }
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
          const now = Date.now();
          const timeSincePrevious = now - this.previousUtteranceTime;
          const currentWords = this.accumulatedTranscript.trim().split(/\s+/).length;
          
          // Check if this looks like a premature split (very short utterance within 3s of previous)
          const isProbablySplit = currentWords <= 2 && 
                                   this.previousUtterance && 
                                   timeSincePrevious < 3000;
          
          if (isProbablySplit) {
            // Merge with previous utterance instead of sending separately
            const merged = `${this.previousUtterance} ${this.accumulatedTranscript}`.trim();
            console.log(`[Deepgram] 🔗 Merged short utterance: "${this.accumulatedTranscript}" → "${merged}"`);
            this.previousUtterance = merged;
            this.previousUtteranceTime = now;
            this.accumulatedTranscript = '';
            return;
          }
          
          // Normal utterance - send it
          console.log(`[Deepgram] 📝 Complete utterance (UtteranceEnd): "${this.accumulatedTranscript}"`);
          try {
            this.config.onTranscript(this.accumulatedTranscript, true);
          } catch (error) {
            console.error('[Deepgram] ❌ CRITICAL: onTranscript callback threw error:', error);
            this.config.onError(error as Error);
          }
          
          // Buffer this utterance in case next one is a continuation
          this.previousUtterance = this.accumulatedTranscript;
          this.previousUtteranceTime = now;
          this.accumulatedTranscript = '';
        }
      });

      this.liveClient.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log('[Deepgram] 🎤 Speech started');
        
        // If we have a buffered utterance from >3s ago, flush it now
        // This handles case where user said short utterance then paused for long time
        if (this.previousUtterance && Date.now() - this.previousUtteranceTime > 3000) {
          console.log(`[Deepgram] 📤 Flushing buffered utterance: "${this.previousUtterance}"`);
          try {
            this.config.onTranscript(this.previousUtterance, true);
          } catch (error) {
            console.error('[Deepgram] ❌ Error flushing buffer:', error);
          }
          this.previousUtterance = '';
          this.previousUtteranceTime = 0;
        }
        
        if (this.config.onSpeechStart) {
          this.config.onSpeechStart();
        }
      });

      this.liveClient.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('[Deepgram] SDK error:', error);
        this.config.onError(new Error(error.message || 'Deepgram SDK error'));
        this.handleDisconnection('error');
      });

      this.liveClient.on(LiveTranscriptionEvents.Close, () => {
        console.log('[Deepgram] SDK WebSocket closed');
        this.isConnected = false;
        this.handleDisconnection('close');
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
      this.handleDisconnection('error');
    }
  }

  /**
   * Handle disconnection and attempt reconnection if enabled
   */
  private handleDisconnection(reason: 'error' | 'close'): void {
    if (!this.shouldStayConnected) {
      console.log('[Deepgram] Disconnection expected (manual disconnect)');
      return;
    }

    if (!this.enableReconnection) {
      console.log('[Deepgram] Reconnection disabled');
      return;
    }

    if (this.isReconnecting) {
      console.log('[Deepgram] Already attempting reconnection');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[Deepgram] ❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.shouldStayConnected = false;
      if (this.config.onConnectionChange) {
        this.config.onConnectionChange(false, false);
      }
      this.config.onError(new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`));
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;

    // Calculate exponential backoff: 1s, 2s, 4s, 8s, 16s
    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
    
    console.log(`[Deepgram] 🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffMs}ms...`);
    
    if (this.config.onConnectionChange) {
      this.config.onConnectionChange(false, true);
    }

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        console.log('[Deepgram] Attempting to reconnect...');
        // Clean up old connection first
        if (this.liveClient) {
          try {
            this.liveClient.finish();
          } catch (e) {
            console.warn('[Deepgram] Error finishing old client:', e);
          }
          this.liveClient = null;
        }
        
        // Attempt new connection
        await this.attemptConnection();
      } catch (error) {
        console.error('[Deepgram] Reconnection attempt failed:', error);
        this.isReconnecting = false;
        // Will trigger handleDisconnection again via error handler
      }
    }, backoffMs);
  }

  /**
   * Fetch API key from backend
   */
  private async fetchApiKey(): Promise<string> {
    console.log('[Deepgram] Fetching API key from backend...');
    const response = await fetch('/api/deepgram/token');
    const data = await response.json();
    
    const apiKey = data.key || data.token || data.api_key;
    if (!apiKey) {
      throw new Error('No Deepgram API key received from backend');
    }
    
    return apiKey;
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

      // 🧪 A/B TEST: In sentence streaming mode, skip accumulation entirely
      // Deepgram sends complete sentences, so just pass them through
      if (this.useSentenceStreaming && isFinal) {
        console.log(`[Deepgram] 📤 Sentence mode - passing through: "${transcript}"`);
        this.config.onTranscript(transcript, false); // Send as partial for UI updates
        return;
      }

      // ONLY ACCUMULATE FINAL TRANSCRIPTS
      // Skip interim results entirely to avoid duplication from Deepgram's overlapping updates
      if (!isFinal) {
        console.log(`[Deepgram] ⏭️ Skipping interim: "${transcript}"`);
        return;
      }
      
      // Accumulate only final transcripts
      if (!this.accumulatedTranscript) {
        this.accumulatedTranscript = transcript;
        console.log(`[Deepgram] � First final: "${transcript}"`);
      } else {
        // Append final transcripts with a space
        this.accumulatedTranscript = this.accumulatedTranscript.trim() + ' ' + transcript.trim();
        console.log(`[Deepgram] ➕ Appending final: "${transcript}"`);
      }
      
      // DISABLED: Don't send interim transcripts - wait for utterance_end only
      // This prevents duplication caused by Deepgram changing transcriptions mid-stream
      // Trade-off: ~2s latency for 100% reliable transcripts
      // console.log(`[Deepgram] 📤 Sending accumulated: "${this.accumulatedTranscript}"`);
      // this.config.onTranscript(this.accumulatedTranscript, false);

    } catch (error) {
      console.error('[Deepgram] Transcript parsing error:', error);
    }
  }

  /**
   * Disconnect from Deepgram SDK
   */
  async disconnect(): Promise<void> {
    console.log('[Deepgram] Disconnecting SDK...');
    
    // Mark that we should NOT reconnect
    this.shouldStayConnected = false;
    this.isReconnecting = false;
    
    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopMicrophone();

    if (this.liveClient) {
      this.liveClient.finish();
      this.liveClient = null;
    }

    this.isConnected = false;
    
    if (this.config.onConnectionChange) {
      this.config.onConnectionChange(false, false);
    }
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected;
  }
}

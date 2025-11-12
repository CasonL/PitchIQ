/**
 * DeepgramSTTService.ts
 * Handles speech-to-text using Deepgram Nova-2 Streaming
 * Better turn detection and lower cost than AssemblyAI
 */

export interface DeepgramConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  onSpeechStart?: () => void; // Called immediately when speech detected (VAD)
  apiKey?: string; // Optional - will fetch from backend if not provided
}

export class DeepgramSTTService {
  private ws: WebSocket | null = null;
  private config: DeepgramConfig;
  private isConnected: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private accumulatedTranscript: string = ''; // Accumulate utterance fragments

  constructor(config: DeepgramConfig) {
    this.config = config;
  }

  /**
   * Connect to Deepgram streaming endpoint
   */
  async connect(): Promise<void> {
    try {
      // Fetch API key if not provided
      const apiKey = this.config.apiKey || await this.fetchApiKey();
      if (!apiKey) {
        throw new Error('No Deepgram API key available');
      }

      console.log('[Deepgram] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,  // Cancel echo from speakers
          noiseSuppression: true,  // Suppress background noise
          autoGainControl: true    // Normalize volume
        }
      });

      // Connect to Deepgram WebSocket
      const wsUrl = `wss://api.deepgram.com/v1/listen?` + new URLSearchParams({
        model: 'nova-2',
        language: 'en-US',
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1',
        punctuate: 'true',
        smart_format: 'true',
        interim_results: 'true',
        utterance_end_ms: '3000', // 3s silence before finalizing
        vad_events: 'true',
        vad_turnoff: '800', // Require 800ms of silence before VAD turns off (reduces false positives from noise)
        endpointing: '600' // 600ms pause for responsive turn-taking
      }).toString();

      console.log('[Deepgram] Connecting to WebSocket...');
      this.ws = new WebSocket(wsUrl, ['token', apiKey]);

      this.ws.onopen = () => {
        console.log('[Deepgram] WebSocket connected');
        this.isConnected = true;
        this.setupAudioStreaming(stream);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[Deepgram] WebSocket error:', error);
        this.config.onError(new Error('Deepgram connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('[Deepgram] WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.stopMicrophone();
      };

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
   * Setup audio streaming to Deepgram
   */
  private setupAudioStreaming(stream: MediaStream): void {
    try {
      // Create AudioContext for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessor for audio chunks
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      let audioChunksSent = 0;
      processor.onaudioprocess = (event) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 for Deepgram
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send to Deepgram
        this.ws!.send(int16Data.buffer);
        
        audioChunksSent++;
        if (audioChunksSent === 1) {
          console.log('[Deepgram] First audio chunk sent');
        }
        if (audioChunksSent % 50 === 0) {
          console.log(`[Deepgram] Sent ${audioChunksSent} audio chunks`);
        }
      };

      // Create muted gain node
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Mute
      
      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      console.log('[Deepgram] Audio streaming started');

    } catch (error) {
      console.error('[Deepgram] Audio streaming error:', error);
      this.config.onError(error as Error);
    }
  }

  /**
   * Stop microphone and audio processing
   */
  private stopMicrophone(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    console.log('[Deepgram] Microphone stopped');
  }

  /**
   * Handle Deepgram WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle transcript results
      if (message.type === 'Results') {
        const transcript = message.channel?.alternatives?.[0]?.transcript;
        if (!transcript) return;

        const isFinal = message.is_final === true;
        const speechFinal = message.speech_final === true;

        // Log the result
        if (isFinal) {
          console.log(`[Deepgram] ${speechFinal ? 'SPEECH FINAL' : 'Final'}: "${transcript}"`);
        }

        // Handle transcript accumulation
        if (speechFinal) {
          // True end of utterance - combine with any accumulated transcript
          const completeTranscript = this.accumulatedTranscript 
            ? `${this.accumulatedTranscript} ${transcript}`.trim()
            : transcript;
          
          console.log(`[Deepgram] 📝 Complete utterance (speech_final): "${completeTranscript}"`);
          this.config.onTranscript(completeTranscript, true);
          
          // Reset accumulator for next utterance
          this.accumulatedTranscript = '';
        } else if (isFinal) {
          // Intermediate final - append to accumulated transcript
          if (this.accumulatedTranscript) {
            this.accumulatedTranscript += ' ' + transcript;
            console.log(`[Deepgram] Appending to transcript: "${transcript}"`);
            console.log(`[Deepgram] 📋 Accumulated so far: "${this.accumulatedTranscript}"`);
          } else {
            this.accumulatedTranscript = transcript;
            console.log(`[Deepgram] Storing first transcript chunk: "${transcript}"`);
          }
          this.config.onTranscript(transcript, false); // Update UI with current chunk
        } else {
          // Partial result - send as-is for UI feedback
          this.config.onTranscript(transcript, false);
        }

      } else if (message.type === 'Metadata') {
        console.log('[Deepgram] Metadata:', message);
      } else if (message.type === 'UtteranceEnd') {
        console.log('[Deepgram] ✅ Utterance ended');
        
        // If we have accumulated transcript but no speech_final, send it now
        if (this.accumulatedTranscript) {
          console.log(`[Deepgram] 📝 Complete utterance (UtteranceEnd): "${this.accumulatedTranscript}"`);
          this.config.onTranscript(this.accumulatedTranscript, true);
          this.accumulatedTranscript = '';
        } else {
          console.log('[Deepgram] ⚠️ UtteranceEnd but no accumulated transcript (already sent via speech_final)');
        }
      } else if (message.type === 'SpeechStarted') {
        console.log('[Deepgram] 🎤 Speech started');
        // Trigger immediate interruption detection via VAD
        if (this.config.onSpeechStart) {
          this.config.onSpeechStart();
        }
        // DON'T reset accumulator here - UtteranceEnd should handle it
        // this.accumulatedTranscript = '';
      }

    } catch (error) {
      console.error('[Deepgram] Message parsing error:', error);
    }
  }

  /**
   * Disconnect from Deepgram
   */
  async disconnect(): Promise<void> {
    console.log('[Deepgram] Disconnecting...');
    
    this.stopMicrophone();

    if (this.ws) {
      // Send close message
      this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      this.ws.close();
      this.ws = null;
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

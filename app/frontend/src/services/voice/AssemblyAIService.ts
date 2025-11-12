/**
 * AssemblyAI Real-Time Speech-to-Text Service
 * 
 * Cost: Free tier 333 hours/month, then $0.0025/min
 * Latency: ~300-500ms
 * Accuracy: 5-10% WER (90-95% accuracy)
 */

export interface AssemblyAIConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
}

export class AssemblyAIService {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private config: AssemblyAIConfig;
  private isConnected: boolean = false;
  
  // Smart transcription state
  private currentTranscript: string = '';
  private transcriptStartTime: number = 0;
  private lastPartialTime: number = 0;
  
  // Words that indicate incomplete sentences
  private incompleteWords = new Set([
    // Conjunctions
    'and', 'but', 'or', 'so', 'because', 'if', 'when', 'while', 'although',
    'however', 'therefore', 'since', 'unless', 'until', 'as', 'though',
    // Prepositions
    'with', 'without', 'for', 'about', 'like', 'that', 'which', 'who',
    'to', 'from', 'in', 'on', 'at', 'by', 'of', 'into', 'onto', 'upon',
    'through', 'throughout', 'during', 'before', 'after', 'between', 'among',
    // Articles and determiners
    'the', 'a', 'an', 'my', 'your', 'our', 'their', 'this', 'these', 'those',
    'some', 'any', 'each', 'every', 'all', 'both', 'few', 'many', 'several',
    // Common incomplete phrase starters
    'it\'s', 'i\'m', 'we\'re', 'they\'re', 'you\'re', 'he\'s', 'she\'s',
    'there\'s', 'here\'s', 'what\'s', 'that\'s', 'where\'s'
  ]);

  constructor(config: AssemblyAIConfig) {
    this.config = config;
  }

  /**
   * Connect to AssemblyAI streaming endpoint
   */
  async connect(): Promise<void> {
    try {
      console.log('[AssemblyAI] Fetching temporary token...');
      
      // Get temporary token from backend (secure - don't expose API key)
      const response = await fetch('/api/voice-test/assemblyai-token');
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('Failed to get AssemblyAI token');
      }

      // Start microphone first to get actual sample rate
      console.log('[AssemblyAI] Requesting microphone access with enhanced settings...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1 // Mono for speech clarity
        },
      });

      // Create audio context to determine actual sample rate
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const actualSampleRate = this.audioContext.sampleRate;
      console.log('[AssemblyAI] AudioContext actual sample rate:', actualSampleRate);

      console.log('[AssemblyAI] Connecting to streaming endpoint...');

      // Word boost for better accuracy on common sales terminology
      const wordBoost = [
        // Sales terms
        'sales', 'pitch', 'prospect', 'product', 'service', 'solution',
        'training', 'software', 'platform', 'system', 'tool',
        'ROI', 'revenue', 'budget', 'pricing', 'quote', 'proposal',
        'demo', 'trial', 'onboarding', 'implementation',
        // Common actions
        'discovery', 'qualification', 'objection', 'close', 'closing',
        'follow-up', 'follow up', 'callback', 'call back',
        // Business terms
        'B2B', 'B2C', 'SaaS', 'enterprise', 'startup', 'SMB',
        'client', 'customer', 'buyer', 'decision maker',
        // Conversation phrases
        "I'm calling", "I'm reaching out", "wanted to chat",
        "do you have time", "quick question", "wondering if",
        "looking for", "interested in", "help you with"
      ];
      const encodedWordBoost = encodeURIComponent(JSON.stringify(wordBoost));

      // Configure silence threshold - increased for natural pauses mid-sentence
      // Using 2000ms (2s) to prevent cutting off mid-thought
      const endUtteranceSilenceThreshold = 2000;
      
      // Connect to AssemblyAI Universal Streaming endpoint with all features
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${data.token}&sample_rate=${actualSampleRate}&encoding=pcm_s16le&word_boost=${encodedWordBoost}&end_utterance_silence_threshold=${endUtteranceSilenceThreshold}&format_text=true`;
      this.ws = new WebSocket(wsUrl);
      
      console.log('[AssemblyAI] Word boost enabled for general sales terminology');
      console.log('[AssemblyAI] format_text=true - punctuation and formatting enabled');
      console.log('[AssemblyAI] Smart sentence detection enabled - base threshold:', endUtteranceSilenceThreshold, 'ms');

      this.ws.onopen = () => {
        console.log('[AssemblyAI] WebSocket connected');
        // Note: v3 API doesn't support Configure message
        // Punctuation is enabled by default in Universal Streaming v3
        this.isConnected = true;
        this.setupAudioProcessing(stream);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      this.ws.onerror = (error) => {
        console.error('[AssemblyAI] WebSocket error:', error);
        this.config.onError(new Error('AssemblyAI connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('[AssemblyAI] WebSocket closed - Code:', event.code, 'Reason:', event.reason || 'No reason provided');
        this.isConnected = false;
        this.stopMicrophone();
      };

    } catch (error) {
      console.error('[AssemblyAI] Connection failed:', error);
      this.config.onError(error as Error);
    }
  }

  /**
   * Disconnect from AssemblyAI
   */
  async disconnect(): Promise<void> {
    console.log('[AssemblyAI] Disconnecting...');
    
    this.stopMicrophone();

    if (this.ws) {
      // Send terminate message (New API format)
      this.ws.send(JSON.stringify({ type: 'Terminate' }));
      this.ws.close();
      this.ws = null;
    }

    // Reset transcript state
    this.currentTranscript = '';
    this.transcriptStartTime = 0;
    this.lastPartialTime = 0;
    
    this.isConnected = false;
  }

  /**
   * Check connection status
   */
  isActive(): boolean {
    return this.isConnected;
  }

  // Private methods

  private setupAudioProcessing(stream: MediaStream): void {
    try {
      console.log('[AssemblyAI] Setting up audio processing...');
      
      const source = this.audioContext!.createMediaStreamSource(stream);
      
      // Create ScriptProcessor for audio data
      const processor = this.audioContext!.createScriptProcessor(4096, 1, 1);
      let audioChunksSent = 0;
      
      let processorCallCount = 0;
      processor.onaudioprocess = (event) => {
        processorCallCount++;
        
        if (processorCallCount === 1) {
          console.log('[AssemblyAI] Audio processor first call - WS state:', this.ws?.readyState, 'Connected:', this.isConnected);
        }
        
        if (!this.isConnected) {
          if (processorCallCount <= 3) {
            console.log('[AssemblyAI] Audio processor running but not connected');
          }
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 for AssemblyAI
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send to AssemblyAI (Try sending raw binary ArrayBuffer)
        if (this.ws?.readyState === WebSocket.OPEN) {
          // Try sending raw binary data directly
          this.ws.send(int16Data.buffer);
          
          // Log every 10 chunks to avoid spam
          audioChunksSent++;
          if (audioChunksSent === 1) {
            console.log('[AssemblyAI] First audio chunk sent successfully');
          }
          if (audioChunksSent % 10 === 0) {
            console.log(`[AssemblyAI] Sent ${audioChunksSent} audio chunks`);
          }
        } else {
          if (audioChunksSent === 0) {
            console.warn('[AssemblyAI] WebSocket not open, cannot send audio. ReadyState:', this.ws?.readyState);
          }
        }
      };

      // Create a muted gain node to prevent hearing ourselves
      const gainNode = this.audioContext!.createGain();
      gainNode.gain.value = 0; // Mute it
      
      source.connect(processor);
      // ScriptProcessor MUST be connected to destination to fire callbacks
      processor.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      console.log('[AssemblyAI] Audio processing started');

    } catch (error) {
      console.error('[AssemblyAI] Audio processing error:', error);
      this.config.onError(error as Error);
    }
  }

  private stopMicrophone(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    console.log('[AssemblyAI] Microphone stopped');
  }

  /**
   * No formatting needed - AssemblyAI handles it when format_text=true
   * Just return the transcript as-is
   */
  private formatTranscript(text: string): string {
    // AssemblyAI format_text=true provides formatted transcripts
    // The Turn message includes turn_is_formatted: true
    return text.trim();
  }

  /**
   * Check if transcript ends with an incomplete word/phrase
   */
  private endsWithIncompleteWord(transcript: string): boolean {
    const trimmed = transcript.trim().toLowerCase();
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1]?.replace(/[.,!?;:]$/, ''); // Remove punctuation
    
    if (this.incompleteWords.has(lastWord)) {
      return true;
    }
    
    // Check if ends with punctuation that suggests completion
    const lastChar = trimmed[trimmed.length - 1];
    if (['.', '?', '!'].includes(lastChar)) {
      return false; // Sentence is complete
    }
    
    return false; // Default: assume complete unless we know it's not
  }

  /**
   * Calculate dynamic wait time based on transcript length
   */
  private calculateWaitTime(transcript: string): number {
    const wordCount = transcript.trim().split(/\s+/).length;
    
    // Base time: 2000ms (2 seconds) - increased to prevent mid-thought cutoffs
    // Add 200ms per 10 words (longer utterances get more tolerance)
    const baseTime = 2000;
    const additionalTime = Math.floor(wordCount / 10) * 200;
    const maxTime = 3500; // Cap at 3.5 seconds
    
    return Math.min(baseTime + additionalTime, maxTime);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log('[AssemblyAI] Message received:', message.type || message.message_type);

      // New Universal Streaming API format
      if (message.type === 'Begin') {
        console.log('[AssemblyAI] Session started:', message.id);
        this.transcriptStartTime = Date.now();
        this.currentTranscript = '';
      } else if (message.type === 'Turn') {
        // Turn messages contain transcription results
        // end_of_turn: false = partial, true = final
        const isFinal = message.end_of_turn === true;
        const isFormatted = message.turn_is_formatted === true;
        
        if (message.transcript) {
          this.currentTranscript = message.transcript;
          this.lastPartialTime = Date.now();
          
          // Log formatting status
          if (isFinal && isFormatted) {
            console.log(`[AssemblyAI] ✅ Formatted transcript received:`, message.transcript);
          }
          
          // Smart sentence completion detection
          if (isFinal) {
            const endsIncomplete = this.endsWithIncompleteWord(message.transcript);
            const waitTime = this.calculateWaitTime(message.transcript);
            
            if (endsIncomplete) {
              console.log(`[AssemblyAI] ⏸️ Incomplete sentence detected (ends with incomplete word). Waiting ${waitTime}ms...`);
              // Don't send final yet - wait for more
              this.config.onTranscript(message.transcript, false); // Send as partial (already formatted by AssemblyAI)
            } else {
              console.log(`[AssemblyAI] ✅ Complete sentence detected. Finalizing transcript.`);
              this.config.onTranscript(message.transcript, true); // Already formatted by AssemblyAI
              this.currentTranscript = '';
            }
          } else {
            // Partial transcript - already formatted by AssemblyAI
            console.log(`[AssemblyAI] Partial transcript:`, message.transcript.substring(0, 50) + '...');
            this.config.onTranscript(message.transcript, false);
          }
        }
      } else if (message.type === 'Termination') {
        console.log('[AssemblyAI] Session terminated:', message.audio_duration_seconds, 'seconds');
      }

    } catch (error) {
      console.error('[AssemblyAI] Message parsing error:', error);
    }
  }
}

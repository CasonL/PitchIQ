/**
 * speech_service.js
 * Modular speech service that combines Deepgram STT and ElevenLabs TTS
 */

class SpeechService {
  /**
   * Create a new Speech Service
   * @param {Object} config - Configuration options
   * @param {string} config.elevenLabsApiKey - ElevenLabs API Key
   * @param {string} config.deepgramApiKey - Deepgram API Key (optional - can be fetched from server)
   * @param {Function} config.onError - Error callback
   * @param {Function} config.onTranscript - Transcript callback
   * @param {Function} config.onSpeechStart - Speech start callback
   * @param {Function} config.onSpeechEnd - Speech end callback
   */
  constructor(config = {}) {
    // API Configuration
    this.elevenLabsApiKey = config.elevenLabsApiKey || '';
    this.elevenLabsBaseUrl = 'https://api.elevenlabs.io/v1';
    this.deepgramApiKey = config.deepgramApiKey || null;
    
    // Callbacks
    this.onError = config.onError || null;
    this.onTranscript = config.onTranscript || null;
    this.onSpeechStart = config.onSpeechStart || null;
    this.onSpeechEnd = config.onSpeechEnd || null;
    this.onProcessingStart = config.onProcessingStart || null;
    this.onProcessingEnd = config.onProcessingEnd || null;
    
    // Deepgram-specific state
    this.deepgramSocket = null;
    this.isDeepgramAvailable = false;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.isRecording = false;
    
    // ElevenLabs voices
    this.availableVoices = [];
    this.currentVoiceId = null;
    this.defaultVoiceId = null;
    
    // Text-to-Speech settings
    this.ttsSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.0
    };
    
    // Speech-to-Text settings
    this.sttSettings = {
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      endpointing: true,
      punctuate: true
    };
    
    // State tracking
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentAudio = null;
    
    // Fallback to Web Speech API if Deepgram is unavailable
    this.webSpeechRecognition = null;
    
    // Bind methods to maintain context
    this._onDataAvailable = this._onDataAvailable.bind(this);
    this._onDeepgramMessage = this._onDeepgramMessage.bind(this);
  }
  
  /**
   * Initialize the speech service
   * @param {Object} options - Configuration options
   * @returns {Promise<SpeechService>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing Speech Service');
    
    if (this.isInitialized) {
      console.warn('Speech Service already initialized');
      return this;
    }
    
    // Apply options
    if (options.elevenLabsApiKey) this.elevenLabsApiKey = options.elevenLabsApiKey;
    if (options.deepgramApiKey) this.deepgramApiKey = options.deepgramApiKey;
    if (options.onError) this.onError = options.onError;
    if (options.onTranscript) this.onTranscript = options.onTranscript;
    if (options.onSpeechStart) this.onSpeechStart = options.onSpeechStart;
    if (options.onSpeechEnd) this.onSpeechEnd = options.onSpeechEnd;
    if (options.onProcessingStart) this.onProcessingStart = options.onProcessingStart;
    if (options.onProcessingEnd) this.onProcessingEnd = options.onProcessingEnd;
    if (options.defaultVoiceId) this.defaultVoiceId = options.defaultVoiceId;
    
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Test ElevenLabs API connectivity and fetch available voices
      await this._initElevenLabs();
      
      // Initialize Deepgram or fallback to Web Speech API
      await this._initSpeechRecognition();
      
      this.isInitialized = true;
      console.log('Speech Service initialized successfully');
      return this;
    } catch (error) {
      console.error('Error initializing Speech Service:', error);
      if (this.onError) this.onError(error);
      return this;
    }
  }
  
  /**
   * Initialize ElevenLabs TTS
   * @private
   */
  async _initElevenLabs() {
    console.log('Initializing ElevenLabs TTS');
    
    try {
      // Verify API key by fetching available voices
      const voices = await this.getAvailableVoices();
      
      if (voices.length === 0) {
        console.warn('No ElevenLabs voices available. Check your API key and subscription.');
      } else {
        console.log(`Fetched ${voices.length} voices from ElevenLabs`);
        
        // Set default voice if not already set
        if (!this.defaultVoiceId && voices.length > 0) {
          this.defaultVoiceId = voices[0].voice_id;
          this.currentVoiceId = this.defaultVoiceId;
          console.log(`Set default voice to: ${this.defaultVoiceId}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing ElevenLabs:', error);
      throw error;
    }
  }
  
  /**
   * Initialize speech recognition (Deepgram or Web Speech API)
   * @private
   */
  async _initSpeechRecognition() {
    console.log('Initializing Speech Recognition');
    
    // Try to initialize Deepgram first
    if (await this._initDeepgram()) {
      console.log('Deepgram initialized successfully');
      return true;
    }
    
    // Fallback to Web Speech API
    console.log('Falling back to Web Speech API');
    return this._initWebSpeech();
  }
  
  /**
   * Initialize Deepgram for speech recognition
   * @private
   * @returns {Promise<boolean>} Success status
   */
  async _initDeepgram() {
    try {
      console.log('Initializing Deepgram');
      
      // Reset Deepgram state
      this.isDeepgramAvailable = false;
      
      // If API key is provided directly, use it
      if (this.deepgramApiKey) {
        return this._connectToDeepgram(this.deepgramApiKey);
      }
      
      // Otherwise, try to fetch from server
      try {
        // Use current origin from hostname
        const currentOrigin = window.location.origin;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout
        
        const response = await fetch(`${currentOrigin}/api/get_deepgram_token`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle 404 gracefully - Deepgram not set up on server
        if (response.status === 404) {
          console.log('Deepgram API endpoint not found - falling back to Web Speech API');
          return false;
        }
        
        if (!response.ok) {
          console.warn('Failed to get Deepgram token, falling back to basic detection');
          return false;
        }
        
        const tokenData = await response.json();
        if (!tokenData || !tokenData.apiKey) {
          console.warn('Invalid Deepgram token received, falling back to basic detection');
          return false;
        }
        
        // Connect to Deepgram with the token
        return this._connectToDeepgram(tokenData.apiKey);
      } catch (fetchError) {
        // Handle timeout or other fetch errors
        console.warn('Error fetching Deepgram token:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('Error initializing Deepgram:', error);
      return false;
    }
  }
  
  /**
   * Connect to Deepgram with the provided API key
   * @private
   * @param {string} apiKey - Deepgram API key
   * @returns {Promise<boolean>} Success status
   */
  _connectToDeepgram(apiKey) {
    return new Promise((resolve) => {
      try {
        // Initialize Deepgram WebSocket connection
        this.deepgramSocket = new WebSocket(
          `wss://api.deepgram.com/v1/listen?model=${this.sttSettings.model}&endpointing=${this.sttSettings.endpointing}&punctuate=${this.sttSettings.punctuate}&interim_results=${this.sttSettings.interim_results}`, 
          ['token', apiKey]
        );
        
        // Set up event handlers
        this.deepgramSocket.onopen = () => {
          console.log('Deepgram WebSocket connection established');
          this.isDeepgramAvailable = true;
          resolve(true);
        };
        
        this.deepgramSocket.onmessage = this._onDeepgramMessage;
        
        this.deepgramSocket.onerror = (error) => {
          console.error('Deepgram WebSocket error:', error);
          this.isDeepgramAvailable = false;
          resolve(false);
        };
        
        this.deepgramSocket.onclose = () => {
          console.log('Deepgram WebSocket connection closed');
          this.isDeepgramAvailable = false;
        };
      } catch (error) {
        console.error('Error connecting to Deepgram:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Initialize Web Speech API as fallback
   * @private
   * @returns {Promise<boolean>} Success status
   */
  _initWebSpeech() {
    return new Promise((resolve) => {
      try {
        // Check for browser support
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!window.SpeechRecognition) {
          console.error('Speech recognition not supported in this browser');
          resolve(false);
          return;
        }
        
        // Initialize Web Speech API
        this.webSpeechRecognition = new SpeechRecognition();
        this.webSpeechRecognition.continuous = true;
        this.webSpeechRecognition.interimResults = true;
        this.webSpeechRecognition.lang = this.sttSettings.language;
        
        // Set up event handlers
        this.webSpeechRecognition.onresult = (event) => {
          const last = event.results.length - 1;
          const transcript = event.results[last][0].transcript;
          const isFinal = event.results[last].isFinal;
          
          // Create a Deepgram-like transcript object
          const transcriptData = {
            channel: {
              alternatives: [
                {
                  transcript: transcript,
                  confidence: event.results[last][0].confidence
                }
              ]
            },
            is_final: isFinal,
            speech_final: isFinal
          };
          
          // Process transcript
          if (this.onTranscript) {
            this.onTranscript(transcriptData);
          }
        };
        
        this.webSpeechRecognition.onerror = (error) => {
          console.error('Web Speech API error:', error);
          if (this.onError) this.onError(error);
        };
        
        this.webSpeechRecognition.onspeechstart = () => {
          if (this.onSpeechStart) this.onSpeechStart();
        };
        
        this.webSpeechRecognition.onspeechend = () => {
          if (this.onSpeechEnd) this.onSpeechEnd();
        };
        
        console.log('Web Speech API initialized successfully');
        resolve(true);
      } catch (error) {
        console.error('Error initializing Web Speech API:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Process Deepgram WebSocket messages
   * @private
   * @param {MessageEvent} event - WebSocket message event
   */
  _onDeepgramMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Process transcript data
      if (data && data.type === 'Results') {
        if (this.onTranscript) {
          this.onTranscript(data);
        }
      }
    } catch (error) {
      console.error('Error processing Deepgram message:', error);
    }
  }
  
  /**
   * Start recording speech for transcription
   * @returns {Promise<boolean>} Success status
   */
  async startRecording() {
    if (this.isRecording) {
      console.warn('Already recording');
      return false;
    }
    
    console.log('Starting speech recording');
    
    try {
      // Request microphone access first
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      if (this.isDeepgramAvailable && this.deepgramSocket) {
        // Set up MediaRecorder for Deepgram
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg'
        ];
        
        let selectedMimeType = '';
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }
        
        if (!selectedMimeType) {
          console.warn('No supported MIME type found for MediaRecorder');
          selectedMimeType = 'audio/webm';
        }
        
        // Create MediaRecorder with selected MIME type
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
          mimeType: selectedMimeType,
          audioBitsPerSecond: 128000
        });
        
        // Set up data handler to send audio to Deepgram
        this.mediaRecorder.addEventListener('dataavailable', this._onDataAvailable);
        
        // Start recording with small time slices for low latency
        this.mediaRecorder.start(100);
        
        this.isRecording = true;
        if (this.onSpeechStart) this.onSpeechStart();
        
        console.log('Recording started with Deepgram');
        return true;
      } else if (this.webSpeechRecognition) {
        // Use Web Speech API
        try {
          this.webSpeechRecognition.start();
          this.isRecording = true;
          if (this.onSpeechStart) this.onSpeechStart();
          
          console.log('Recording started with Web Speech API');
          return true;
        } catch (e) {
          console.error('Web Speech API start error:', e);
          if (this.onError) this.onError(e);
          return false;
        }
      } else {
        console.error('No speech recognition method available');
        return false;
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }
  
  /**
   * Stop recording speech
   * @returns {Promise<boolean>} Success status
   */
  async stopRecording() {
    if (!this.isRecording) {
      console.warn('Not recording');
      return false;
    }
    
    console.log('Stopping speech recording');
    
    try {
      if (this.isDeepgramAvailable && this.mediaRecorder) {
        // Stop MediaRecorder and clean up
        this.mediaRecorder.stop();
        this.mediaRecorder.removeEventListener('dataavailable', this._onDataAvailable);
        this.mediaRecorder = null;
      } else if (this.webSpeechRecognition) {
        // Stop Web Speech API recognition
        this.webSpeechRecognition.stop();
      }
      
      // Clean up audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }
      
      this.isRecording = false;
      if (this.onSpeechEnd) this.onSpeechEnd();
      
      console.log('Recording stopped');
      return true;
    } catch (error) {
      console.error('Error stopping recording:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }
  
  /**
   * Handle audio data from MediaRecorder
   * @private
   * @param {BlobEvent} event - Media Recorder data event
   */
  _onDataAvailable(event) {
    if (event.data && event.data.size > 0 && this.deepgramSocket && this.isDeepgramAvailable) {
      // Send audio data to Deepgram
      if (this.deepgramSocket.readyState === WebSocket.OPEN) {
        this.deepgramSocket.send(event.data);
      }
    }
  }
  
  /**
   * Convert text to speech using ElevenLabs API
   * @param {string} text - Text to convert to speech
   * @param {Object} options - Options for text-to-speech
   * @param {string} options.voiceId - Voice ID to use (defaults to current voice)
   * @param {string} options.modelId - Model ID to use (default: eleven_monolingual_v1)
   * @param {Object} options.voiceSettings - Voice settings to override defaults
   * @returns {Promise<Blob>} Audio blob
   */
  async textToSpeech(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!text || text.trim() === '') {
      console.warn('No text provided for TTS');
      return null;
    }
    
    if (!this.elevenLabsApiKey) {
      console.error('ElevenLabs API key not set');
      return null;
    }
    
    try {
      if (this.onProcessingStart) this.onProcessingStart();
      
      const voiceId = options.voiceId || this.currentVoiceId || this.defaultVoiceId;
      
      if (!voiceId) {
        throw new Error('No voice ID specified for TTS');
      }
      
      const modelId = options.modelId || 'eleven_monolingual_v1';
      
      // Merge default settings with provided voice settings
      const voiceSettings = {
        ...this.ttsSettings,
        ...(options.voiceSettings || {})
      };
      
      console.log(`Sending TTS request for voice: ${voiceId}`);
      
      // Make API request to ElevenLabs
      const response = await fetch(`${this.elevenLabsBaseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId,
          voice_settings: voiceSettings
        })
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      
      if (this.onProcessingEnd) this.onProcessingEnd(audioBlob);
      
      return audioBlob;
    } catch (error) {
      console.error('Error with ElevenLabs TTS:', error);
      if (this.onError) this.onError(error);
      return null;
    }
  }
  
  /**
   * Play audio from blob
   * @param {Blob} audioBlob - Audio blob to play
   * @returns {Promise<void>}
   */
  async playAudio(audioBlob) {
    if (!audioBlob) {
      console.warn('No audio blob provided to play');
      return;
    }
    
    try {
      // Clean up any existing audio
      this.stopAudio();
      
      // Create a new audio element
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
      // Set up event handlers
      this.currentAudio.onplay = () => {
        this.isPlaying = true;
        console.log('Audio playback started');
      };
      
      this.currentAudio.onended = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        console.log('Audio playback ended');
      };
      
      this.currentAudio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        if (this.onError) this.onError(error);
      };
      
      // Start playback
      await this.currentAudio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      if (this.onError) this.onError(error);
    }
  }
  
  /**
   * Stop current audio playback
   */
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      
      if (this.currentAudio.src) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      
      this.currentAudio = null;
      this.isPlaying = false;
    }
  }
  
  /**
   * Get available voices from ElevenLabs
   * @returns {Promise<Array>} Available voices
   */
  async getAvailableVoices() {
    if (this.availableVoices.length > 0) {
      return this.availableVoices;
    }
    
    if (!this.elevenLabsApiKey) {
      console.error('ElevenLabs API key not set');
      return [];
    }
    
    try {
      const response = await fetch(`${this.elevenLabsBaseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.elevenLabsApiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }
      
      const data = await response.json();
      this.availableVoices = data.voices || [];
      
      return this.availableVoices;
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      if (this.onError) this.onError(error);
      return [];
    }
  }
  
  /**
   * Set current voice for TTS
   * @param {string} voiceId - Voice ID
   * @returns {boolean} Success status
   */
  setVoice(voiceId) {
    if (!voiceId) {
      console.warn('No voice ID provided');
      return false;
    }
    
    this.currentVoiceId = voiceId;
    console.log(`Voice set to: ${voiceId}`);
    return true;
  }
  
  /**
   * Update TTS voice settings
   * @param {Object} settings - New voice settings
   */
  updateTTSSettings(settings) {
    this.ttsSettings = {
      ...this.ttsSettings,
      ...settings
    };
    
    console.log('Updated TTS settings:', this.ttsSettings);
  }
  
  /**
   * Update STT settings
   * @param {Object} settings - New STT settings
   * @returns {Promise<boolean>} Success status
   */
  async updateSTTSettings(settings) {
    // Store previous settings for comparison
    const prevSettings = { ...this.sttSettings };
    
    // Update settings
    this.sttSettings = {
      ...this.sttSettings,
      ...settings
    };
    
    console.log('Updated STT settings:', this.sttSettings);
    
    // Reinitialize speech recognition if model or language changed
    if (prevSettings.model !== this.sttSettings.model || 
        prevSettings.language !== this.sttSettings.language) {
      return this._initSpeechRecognition();
    }
    
    return true;
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    console.log('Cleaning up Speech Service resources');
    
    // Stop recording if active
    if (this.isRecording) {
      this.stopRecording();
    }
    
    // Stop audio if playing
    this.stopAudio();
    
    // Close Deepgram WebSocket
    if (this.deepgramSocket) {
      this.deepgramSocket.close();
      this.deepgramSocket = null;
    }
    
    // Clean up Web Speech API
    if (this.webSpeechRecognition) {
      try {
        this.webSpeechRecognition.stop();
      } catch (e) {
        // Ignore errors when stopping recognition
      }
    }
    
    this.isInitialized = false;
  }
}

export default SpeechService; 
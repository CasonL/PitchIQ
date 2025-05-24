/**
 * elevenlabs_tts_service.js
 * Service for text-to-speech using ElevenLabs API
 */

class ElevenLabsTTSService {
  /**
   * Create a new ElevenLabs TTS Service
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - ElevenLabs API key
   * @param {string} options.apiUrl - ElevenLabs API URL
   * @param {Function} options.onReady - Callback for service readiness
   * @param {Function} options.onSpeakStart - Callback for speech start
   * @param {Function} options.onSpeakEnd - Callback for speech end
   * @param {Function} options.onSpeakPause - Callback for speech pause
   * @param {Function} options.onSpeakResume - Callback for speech resume
   * @param {Function} options.onError - Callback for errors
   */
  constructor(options = {}) {
    // API configuration
    this.apiKey = options.apiKey || '';
    this.apiUrl = options.apiUrl || 'https://api.elevenlabs.io/v1';
    
    // Voice settings
    this.defaultVoiceSettings = {
      stability: options.stability !== undefined ? options.stability : 0.5,
      similarity_boost: options.similarity_boost !== undefined ? options.similarity_boost : 0.75,
      style: options.style !== undefined ? options.style : 0.0,
      use_speaker_boost: options.use_speaker_boost !== undefined ? options.use_speaker_boost : true,
      model_id: options.model_id || 'eleven_turbo_v2'
    };
    
    // State tracking
    this.isInitialized = false;
    this.isSpeaking = false;
    this.isPaused = false;
    this.audioContext = null;
    this.audioSource = null;
    this.audioQueue = [];
    this.availableVoices = [];
    this._handlingError = false; // Flag to prevent recursive error handling
    this._errorInProgress = false; // Additional flag to break infinite loops
    
    // Event callbacks
    this.onReady = options.onReady || null;
    this.onSpeakStart = options.onSpeakStart || null;
    this.onSpeakEnd = options.onSpeakEnd || null;
    this.onSpeakPause = options.onSpeakPause || null;
    this.onSpeakResume = options.onSpeakResume || null;
    this.onError = options.onError || null;
    
    // Audio output element
    this.audioElement = null;
  }
  
  /**
   * Initialize the ElevenLabs TTS service
   * @param {Object} options - Initialization options
   * @returns {Promise<ElevenLabsTTSService>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing ElevenLabs TTS service');
    
    // Update API configuration if provided
    if (options.apiKey) this.apiKey = options.apiKey;
    if (options.apiUrl) this.apiUrl = options.apiUrl;
    
    // Update voice settings if provided
    if (options.stability !== undefined) this.defaultVoiceSettings.stability = options.stability;
    if (options.similarity_boost !== undefined) this.defaultVoiceSettings.similarity_boost = options.similarity_boost;
    if (options.style !== undefined) this.defaultVoiceSettings.style = options.style;
    if (options.use_speaker_boost !== undefined) this.defaultVoiceSettings.use_speaker_boost = options.use_speaker_boost;
    if (options.model_id) this.defaultVoiceSettings.model_id = options.model_id;
    
    // Update callbacks if provided
    if (options.onReady) this.onReady = options.onReady;
    if (options.onSpeakStart) this.onSpeakStart = options.onSpeakStart;
    if (options.onSpeakEnd) this.onSpeakEnd = options.onSpeakEnd;
    if (options.onSpeakPause) this.onSpeakPause = options.onSpeakPause;
    if (options.onSpeakResume) this.onSpeakResume = options.onSpeakResume;
    if (options.onError) this.onError = options.onError;
    
    try {
      // Check for API key
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key is required');
      }
      
      // Initialize audio context
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (audioContextError) {
        console.error('Failed to create AudioContext:', audioContextError);
        // We can continue without AudioContext for basic functionality
      }
      
      // Create or reuse audio element for playback
      try {
        // Check if the element already exists
        let existingAudioElement = document.getElementById('elevenlabs-audio-player');
        
        if (existingAudioElement) {
          // Reuse existing element
          this.audioElement = existingAudioElement;
          
          // Remove old event listeners to prevent duplicates
          this.audioElement.removeEventListener('ended', this._handleAudioEnd.bind(this));
          this.audioElement.removeEventListener('error', this._handleAudioError.bind(this));
        } else {
          // Create new element
          this.audioElement = document.createElement('audio');
          this.audioElement.id = 'elevenlabs-audio-player';
          this.audioElement.style.display = 'none';
          document.body.appendChild(this.audioElement);
        }
        
        // Configure audio element
        this.audioElement.preload = 'auto';  // Preload audio data
        this.audioElement.crossOrigin = 'anonymous';  // Handle CORS
        
        // Add event listeners using properly bound methods
        const boundAudioEndHandler = this._handleAudioEnd.bind(this);
        const boundAudioErrorHandler = this._handleAudioError.bind(this);
        
        this.audioElement.addEventListener('ended', boundAudioEndHandler);
        this.audioElement.addEventListener('error', boundAudioErrorHandler);
        
        // Store bound handlers for later removal if needed
        this._boundAudioEndHandler = boundAudioEndHandler;
        this._boundAudioErrorHandler = boundAudioErrorHandler;
        
      } catch (audioElementError) {
        console.error('Failed to create or configure audio element:', audioElementError);
        throw new Error('Could not initialize audio playback: ' + audioElementError.message);
      }
      
      // Fetch available voices
      await this.refreshVoices();
      
      this.isInitialized = true;
      console.log('ElevenLabs TTS service initialized successfully');
      
      if (this.onReady) {
        this.onReady();
      }
      
      return this;
    } catch (error) {
      console.error('Failed to initialize ElevenLabs TTS service:', error);
      this._handleError(error);
      throw error;
    }
  }
  
  /**
   * Refresh the list of available voices
   * @returns {Promise<Array>} - Array of available voices
   */
  async refreshVoices() {
    if (!this.apiKey) {
      console.warn('API key is required to fetch voices');
      return [];
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.availableVoices = data.voices || [];
      console.log(`Fetched ${this.availableVoices.length} voices`);
      
      return this.availableVoices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      this._handleError(error);
      return [];
    }
  }
  
  /**
   * Get available voices
   * @returns {Array} - Array of available voices
   */
  getVoices() {
    return this.availableVoices;
  }
  
  /**
   * Get voice by ID
   * @param {string} voiceId - Voice ID
   * @returns {Object|null} - Voice object or null if not found
   */
  getVoiceById(voiceId) {
    return this.availableVoices.find(voice => voice.voice_id === voiceId) || null;
  }
  
  /**
   * Generate speech from text
   * @param {string} text - Text to convert to speech
   * @param {string} voiceId - Voice ID to use
   * @param {Object} options - Text-to-speech options
   * @returns {Promise<Blob>} - Audio blob
   */
  async generateSpeech(text, voiceId, options = {}) {
    if (!this.isInitialized) {
      console.warn('ElevenLabs TTS service not initialized');
      return null;
    }
    
    if (!text || text.trim() === '') {
      console.warn('Text is required for speech generation');
      return null;
    }
    
    if (!voiceId) {
      console.warn('Voice ID is required for speech generation');
      return null;
    }
    
    try {
      console.log(`Generating speech for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Build request payload
      const payload = {
        text,
        model_id: options.model_id || this.defaultVoiceSettings.model_id,
        voice_settings: {
          stability: options.stability !== undefined ? options.stability : this.defaultVoiceSettings.stability,
          similarity_boost: options.similarity_boost !== undefined ? options.similarity_boost : this.defaultVoiceSettings.similarity_boost,
          style: options.style !== undefined ? options.style : this.defaultVoiceSettings.style,
          use_speaker_boost: options.use_speaker_boost !== undefined ? options.use_speaker_boost : this.defaultVoiceSettings.use_speaker_boost
        }
      };
      
      // Send API request
      const response = await fetch(`${this.apiUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate speech: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      console.log('Generated speech audio');
      
      return audioBlob;
    } catch (error) {
      console.error('Error generating speech:', error);
      this._handleError(error);
      return null;
    }
  }
  
  /**
   * Speak text
   * @param {string} text - Text to speak
   * @param {string} voiceId - Voice ID to use
   * @param {Object} options - Speaking options
   * @returns {Promise<boolean>} - Success status
   */
  async speak(text, voiceId, options = {}) {
    if (!this.isInitialized) {
      console.warn('ElevenLabs TTS service not initialized');
      return false;
    }
    
    try {
      console.log(`Speaking text with voice ${voiceId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Generate speech audio
      const audioBlob = await this.generateSpeech(text, voiceId, options);
      
      if (!audioBlob) {
        console.warn('Failed to generate speech');
        return false;
      }
      
      // Verify blob is valid
      if (audioBlob.size === 0) {
        console.warn('Generated audio blob is empty');
        return false;
      }
      
      console.log(`Generated audio blob of size ${audioBlob.size} bytes and type ${audioBlob.type}`);
      
      // Add to queue
      const queueItem = {
        blob: audioBlob,
        options
      };
      
      this.audioQueue.push(queueItem);
      
      // Start playback if not already speaking
      if (!this.isSpeaking) {
        await this._processAudioQueue();
      }
      
      return true;
    } catch (error) {
      console.error('Error speaking:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Stop speaking
   * @returns {Promise<boolean>} - Success status
   */
  async stop() {
    if (!this.isInitialized || !this.isSpeaking) {
      return true;
    }
    
    console.log('Stopping speech');
    
    try {
      // Stop audio element
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      
      // Clear queue
      this.audioQueue = [];
      
      // Reset state
      this.isSpeaking = false;
      this.isPaused = false;
      
      // Trigger callback
      if (this.onSpeakEnd) {
        this.onSpeakEnd();
      }
      
      return true;
    } catch (error) {
      console.error('Error stopping speech:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Pause speaking
   * @returns {Promise<boolean>} - Success status
   */
  async pause() {
    if (!this.isInitialized || !this.isSpeaking || this.isPaused) {
      return true;
    }
    
    console.log('Pausing speech');
    
    try {
      // Pause audio element
      this.audioElement.pause();
      
      // Update state
      this.isPaused = true;
      
      // Trigger callback
      if (this.onSpeakPause) {
        this.onSpeakPause();
      }
      
      return true;
    } catch (error) {
      console.error('Error pausing speech:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Resume speaking
   * @returns {Promise<boolean>} - Success status
   */
  async resume() {
    if (!this.isInitialized || !this.isSpeaking || !this.isPaused) {
      return false;
    }
    
    console.log('Resuming speech');
    
    try {
      // Resume audio element
      this.audioElement.play();
      
      // Update state
      this.isPaused = false;
      
      // Trigger callback
      if (this.onSpeakResume) {
        this.onSpeakResume();
      }
      
      return true;
    } catch (error) {
      console.error('Error resuming speech:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    console.log('Cleaning up ElevenLabs TTS service');
    
    // Stop any ongoing playback
    this.stop();
    
    // Remove the audio element from DOM if it exists
    if (this.audioElement) {
      try {
        // Remove event listeners to prevent memory leaks
        if (this._boundAudioEndHandler) {
          this.audioElement.removeEventListener('ended', this._boundAudioEndHandler);
        }
        if (this._boundAudioErrorHandler) {
          this.audioElement.removeEventListener('error', this._boundAudioErrorHandler);
        }
        
        // Clean up any source URLs
        if (this.audioElement.src) {
          try {
            URL.revokeObjectURL(this.audioElement.src);
          } catch (e) {
            console.warn('Error revoking URL:', e);
          }
          this.audioElement.src = '';
          this.audioElement.load(); // Reset the audio element
        }
        
        // Remove from DOM only if we created it (check by ID)
        if (this.audioElement.id === 'elevenlabs-audio-player' && this.audioElement.parentNode) {
          this.audioElement.parentNode.removeChild(this.audioElement);
        }
      } catch (error) {
        console.warn('Error cleaning up audio element:', error);
      }
      
      this.audioElement = null;
    }
    
    // Clean up audio context
    if (this.audioContext && typeof this.audioContext.close === 'function') {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this.audioContext = null;
    }
    
    // Clean up resources
    this._boundAudioEndHandler = null;
    this._boundAudioErrorHandler = null;
    this.audioQueue = [];
    
    // Reset state
    this.isInitialized = false;
    this.isSpeaking = false;
    this.isPaused = false;
  }
  
  // Private methods
  
  /**
   * Process audio queue
   * @private
   * @returns {Promise<void>}
   */
  async _processAudioQueue() {
    // Don't process if we're already speaking or there's nothing to process
    if (this.audioQueue.length === 0 || this.isSpeaking) {
      return;
    }
    
    // If we're handling an error, don't continue processing
    if (this._handlingError || this._errorInProgress) {
      return;
    }
    
    // Make sure we have an audio element
    if (!this.audioElement) {
      try {
        // Create audio element for playback if it doesn't exist
        this.audioElement = document.createElement('audio');
        this.audioElement.id = 'elevenlabs-audio-player';
        this.audioElement.style.display = 'none';
        document.body.appendChild(this.audioElement);
        
        // Set up event listeners
        this.audioElement.addEventListener('ended', this._handleAudioEnd.bind(this));
        this.audioElement.addEventListener('error', this._handleAudioError.bind(this));
      } catch (error) {
        console.error('Error creating audio element:', error);
        this._handleError(error);
        return;
      }
    }
    
    this.isSpeaking = true;
    
    try {
      const item = this.audioQueue.shift();
      
      // Validate audio blob
      if (!item || !item.blob || !(item.blob instanceof Blob)) {
        throw new Error('Invalid audio data in queue');
      }
      
      // Reset audio element state
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {
        console.warn('Error resetting audio element:', e);
      }
      
      // Clear any previous source attributes
      try {
        if (this.audioElement.src) {
          URL.revokeObjectURL(this.audioElement.src);
          this.audioElement.removeAttribute('src');
          this.audioElement.load();
        }
      } catch (e) {
        console.warn('Error clearing previous source:', e);
      }
      
      // Create object URL from blob
      let audioUrl;
      try {
        audioUrl = URL.createObjectURL(item.blob);
        console.log('Created audio URL:', audioUrl);
        
        if (!audioUrl) {
          throw new Error('Failed to create object URL from blob');
        }
      } catch (urlError) {
        console.error('Error creating object URL:', urlError);
        throw urlError;
      }
      
      // Add a canplaythrough event listener to ensure audio is ready
      const canPlayPromise = new Promise((resolve, reject) => {
        const canPlayHandler = () => {
          console.log('Audio can play through');
          this.audioElement.removeEventListener('canplaythrough', canPlayHandler);
          resolve();
        };
        
        const timeoutId = setTimeout(() => {
          this.audioElement.removeEventListener('canplaythrough', canPlayHandler);
          console.warn('Audio load timeout - continuing anyway');
          resolve(); // Still resolve to try playing
        }, 3000); // 3 second timeout
        
        this.audioElement.addEventListener('canplaythrough', canPlayHandler, { once: true });
      });
      
      // Set the source and load
      this.audioElement.src = audioUrl;
      console.log('Set audio source:', this.audioElement.src);
      
      try {
        this.audioElement.load();
        console.log('Audio loaded');
      } catch (loadError) {
        console.error('Error loading audio:', loadError);
        throw loadError;
      }
      
      // Wait for audio to be ready (with timeout)
      try {
        await canPlayPromise;
      } catch (canPlayError) {
        console.warn('Error in canplaythrough event:', canPlayError);
        // Continue anyway
      }
      
      // Verify src is still valid before playing
      if (!this.audioElement.src || this.audioElement.src === '') {
        throw new Error('Audio source was unexpectedly cleared before playback');
      }
      
      // Play audio with timeout
      try {
        console.log('Attempting to play audio...');
        const playPromise = this.audioElement.play();
        
        if (playPromise === undefined) {
          console.log('Play returned undefined, assuming successful start');
          // Browsers that don't return a promise will start playing
          if (this.onSpeakStart) {
            this.onSpeakStart();
          }
        } else {
          // Modern browsers return a promise
          await Promise.race([
            playPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Play timeout')), 5000)
            )
          ]);
          
          console.log('Audio playback started successfully');
          
          // Trigger callback only if play was successful
          if (this.onSpeakStart) {
            this.onSpeakStart();
          }
        }
      } catch (playError) {
        console.error('Error playing audio:', playError);
        
        // Clean up and move to next item
        try {
          if (this.audioElement.src) {
            URL.revokeObjectURL(this.audioElement.src);
            this.audioElement.removeAttribute('src');
            this.audioElement.load();
          }
        } catch (cleanupError) {
          console.warn('Error during cleanup after play failure:', cleanupError);
        }
        
        throw playError;
      }
    } catch (error) {
      console.error('Error processing audio queue:', error);
      this._handleError(error);
      
      // Continue with next item
      this.isSpeaking = false;
      
      // Clear the queue to prevent cascading errors
      this.audioQueue = [];
    }
  }
  
  /**
   * Handle audio end event
   * @private
   */
  _handleAudioEnd() {
    console.log('Audio playback ended');
    
    // Clean up
    try {
      if (this.audioElement && this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
      }
    } catch (e) {
      console.warn('Error cleaning up after playback:', e);
    }
    
    // Update state
    this.isSpeaking = false;
    this.isPaused = false;
    
    // Trigger callback
    if (this.onSpeakEnd) {
      this.onSpeakEnd();
    }
    
    // Process next item in queue
    setTimeout(() => {
      this._processAudioQueue();
    }, 100); // Small delay to ensure clean state
  }
  
  /**
   * Handle audio error event
   * @private
   * @param {Event} event - Audio error event
   */
  _handleAudioError(event) {
    // Prevent recursive error handling
    if (this._handlingError || this._errorInProgress) {
      return;
    }
    
    this._errorInProgress = true;
    console.error('Audio playback error:', event);
    
    // Get more detailed error information if available
    let errorMessage = 'Audio playback error';
    if (this.audioElement && this.audioElement.error) {
      const mediaError = this.audioElement.error;
      const errorCodes = {
        1: 'MEDIA_ERR_ABORTED - The user aborted the download.',
        2: 'MEDIA_ERR_NETWORK - A network error occurred while downloading.',
        3: 'MEDIA_ERR_DECODE - The media could not be decoded.',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The media format is not supported.'
      };
      
      errorMessage = `Audio error: ${errorCodes[mediaError.code] || `Unknown (code: ${mediaError.code})`}`;
      console.error(errorMessage, mediaError.message);
    }
    
    // Prevent errors from empty src attribute
    if (this.audioElement && (!this.audioElement.src || this.audioElement.src === '')) {
      console.warn('Empty src attribute detected during error handling, skipping further processing');
      // Reset state to prevent further errors
      this.isSpeaking = false;
      this.isPaused = false;
      this.audioQueue = [];
      // Reset error flags after a short delay
      setTimeout(() => {
        this._handlingError = false;
        this._errorInProgress = false;
      }, 500);
      return;
    }
    
    // Clean up resources
    if (this.audioElement) {
      if (this.audioElement.src) {
        try {
          URL.revokeObjectURL(this.audioElement.src);
        } catch (e) {
          console.warn('Error revoking URL:', e);
        }
        this.audioElement.removeAttribute('src');
        try {
          this.audioElement.load();
        } catch (e) {
          console.warn('Error reloading audio element:', e);
        }
      }
      
      // Reset audio element state
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {
        console.warn('Error resetting audio element:', e);
      }
    }
    
    // Update state
    this.isSpeaking = false;
    this.isPaused = false;
    
    // Trigger error callback with detailed error
    this._handleError(new Error(errorMessage));
    
    // Clear the queue to prevent further errors
    this.audioQueue = [];
    
    // Reset error handling flags after a short delay
    setTimeout(() => {
      this._handlingError = false;
      this._errorInProgress = false;
    }, 500);
  }
  
  /**
   * Handle errors
   * @private
   * @param {Error} error - Error object
   */
  _handleError(error) {
    // Prevent too many errors from being logged and propagated
    if (this._handlingError || this._errorInProgress) {
      // Only log, don't propagate
      console.error('ElevenLabs TTS service error (suppressed):', error);
      return;
    }
    
    this._handlingError = true;
    console.error('ElevenLabs TTS service error:', error);
    
    if (this.onError) {
      this.onError(error);
    }
    
    // Reset error handling flag after a short delay
    setTimeout(() => {
      this._handlingError = false;
    }, 500);
  }
}

export { ElevenLabsTTSService }; 
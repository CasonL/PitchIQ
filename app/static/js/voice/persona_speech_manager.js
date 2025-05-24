/**
 * persona_speech_manager.js
 * Integrates the modular speech service with the persona system
 */

import SpeechService from './speech_service.js';

class PersonaSpeechManager {
  /**
   * Create a new Persona Speech Manager
   * @param {Object} config - Configuration options
   * @param {string} config.elevenLabsApiKey - ElevenLabs API Key
   * @param {Object} config.voiceDb - Voice database instance
   * @param {Object} config.legendaryVoices - Mapping of persona types to voice IDs
   * @param {Object} config.personaAttributes - Default attributes for personas
   * @param {Function} config.onError - Error callback
   * @param {Function} config.onTranscriptUpdate - Transcript update callback
   * @param {Function} config.onStateChange - State change callback
   */
  constructor(config = {}) {
    // Core services
    this.speechService = null;
    this.voiceDb = config.voiceDb || null;
    
    // Voice mappings
    this.legendaryVoices = config.legendaryVoices || {};
    this.selectedVoiceIds = {};
    
    // Persona attributes
    this.personaAttributes = config.personaAttributes || {};
    this.currentPersona = null;
    
    // API Configuration
    this.elevenLabsApiKey = config.elevenLabsApiKey || '';
    
    // Callbacks
    this.onError = config.onError || null;
    this.onTranscriptUpdate = config.onTranscriptUpdate || null;
    this.onStateChange = config.onStateChange || null;
    
    // State tracking
    this.isRecording = false;
    this.isPlaying = false;
    this.isProcessing = false;
    this.currentTranscript = '';
    this.isInitialized = false;
    
    // Default voice settings
    this.defaultVoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };
    
    // Bind methods
    this._handleTranscript = this._handleTranscript.bind(this);
    this._handleError = this._handleError.bind(this);
    this._notifyStateChange = this._notifyStateChange.bind(this);
  }
  
  /**
   * Initialize the speech manager
   * @param {Object} options - Configuration options
   * @returns {Promise<PersonaSpeechManager>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing Persona Speech Manager');
    
    try {
      // Apply options
      if (options.elevenLabsApiKey) this.elevenLabsApiKey = options.elevenLabsApiKey;
      if (options.voiceDb) this.voiceDb = options.voiceDb;
      if (options.legendaryVoices) this.legendaryVoices = options.legendaryVoices;
      if (options.personaAttributes) this.personaAttributes = options.personaAttributes;
      if (options.onError) this.onError = options.onError;
      if (options.onTranscriptUpdate) this.onTranscriptUpdate = options.onTranscriptUpdate;
      if (options.onStateChange) this.onStateChange = options.onStateChange;
      if (options.defaultPersona) this.currentPersona = options.defaultPersona;
      
      // Initialize speech service
      this.speechService = new SpeechService({
        elevenLabsApiKey: this.elevenLabsApiKey,
        onError: this._handleError,
        onTranscript: this._handleTranscript,
        onSpeechStart: () => this._notifyStateChange('recording', true),
        onSpeechEnd: () => this._notifyStateChange('recording', false),
        onProcessingStart: () => this._notifyStateChange('processing', true),
        onProcessingEnd: () => this._notifyStateChange('processing', false)
      });
      
      await this.speechService.initialize();
      
      // Fetch available voices and add to voice database if provided
      if (this.voiceDb) {
        const voices = await this.speechService.getAvailableVoices();
        console.log(`Adding ${voices.length} ElevenLabs voices to voice database`);
        
        let voicesAdded = 0;
        for (const voice of voices) {
          // Check if voice already exists in database
          const existingVoice = this.voiceDb.getVoice(voice.voice_id);
          if (!existingVoice) {
            // Add voice to database with metadata
            this.voiceDb.addVoice({
              id: voice.voice_id,
              name: voice.name,
              source: 'elevenlabs',
              gender: voice.labels?.gender || 'unknown',
              age: voice.labels?.age || 'unknown',
              accent: voice.labels?.accent || 'neutral',
              ethnicity: voice.labels?.ethnicity || 'unknown',
              description: voice.description || '',
              preview_url: voice.preview_url || null
            });
            voicesAdded++;
          }
        }
        console.log(`Added ${voicesAdded} new voices to database`);
      }
      
      // Set default persona if provided
      if (options.defaultPersona) {
        await this.selectVoiceForPersona(options.defaultPersona);
      }
      
      this.isInitialized = true;
      console.log('Persona Speech Manager initialized successfully');
      this._notifyStateChange('initialized', true);
      
      return this;
    } catch (error) {
      console.error('Error initializing Persona Speech Manager:', error);
      this._handleError(error);
      return this;
    }
  }
  
  /**
   * Select a voice for a persona
   * @param {string} personaType - Type of persona
   * @returns {Promise<string|null>} - Selected voice ID
   */
  async selectVoiceForPersona(personaType) {
    if (!personaType) {
      console.warn('No persona type provided');
      return null;
    }
    
    // Set current persona
    this.currentPersona = personaType;
    this._notifyStateChange('currentPersona', personaType);
    
    // Check if already have a selected voice for this persona
    if (this.selectedVoiceIds[personaType]) {
      const voiceId = this.selectedVoiceIds[personaType];
      this.speechService.setVoice(voiceId);
      console.log(`Using previously selected voice ${voiceId} for persona ${personaType}`);
      return voiceId;
    }
    
    // Check if we have a legendary voice assigned
    if (this.legendaryVoices[personaType]) {
      const voiceId = this.legendaryVoices[personaType];
      this.selectedVoiceIds[personaType] = voiceId;
      this.speechService.setVoice(voiceId);
      console.log(`Using legendary voice ${voiceId} for persona ${personaType}`);
      return voiceId;
    }
    
    // If we have a voice database, try to find a suitable voice
    if (this.voiceDb) {
      try {
        // Get persona attributes
        const attributes = this.personaAttributes[personaType] || {};
        
        // Search for matching voice
        const matchingVoice = this.voiceDb.findMatchingVoice({
          gender: attributes.gender || 'any',
          age: attributes.age || 'any',
          accent: attributes.accent || 'any',
          ethnicity: attributes.ethnicity || 'any',
          source: 'elevenlabs'
        });
        
        if (matchingVoice) {
          this.selectedVoiceIds[personaType] = matchingVoice.id;
          this.speechService.setVoice(matchingVoice.id);
          console.log(`Selected matching voice ${matchingVoice.id} (${matchingVoice.name}) for persona ${personaType}`);
          return matchingVoice.id;
        }
      } catch (error) {
        console.warn(`Error finding matching voice for persona ${personaType}:`, error);
      }
    }
    
    // Fallback to default voice
    const voices = await this.speechService.getAvailableVoices();
    if (voices.length > 0) {
      const voiceId = voices[0].voice_id;
      this.selectedVoiceIds[personaType] = voiceId;
      this.speechService.setVoice(voiceId);
      console.log(`Using fallback voice ${voiceId} for persona ${personaType}`);
      return voiceId;
    }
    
    console.warn(`No voice available for persona ${personaType}`);
    return null;
  }
  
  /**
   * Start recording user speech
   * @returns {Promise<boolean>} Success status
   */
  async startRecording() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isRecording) {
      console.warn('Already recording');
      return false;
    }
    
    console.log('Starting recording');
    this.currentTranscript = '';
    this._notifyStateChange('transcript', this.currentTranscript);
    
    const success = await this.speechService.startRecording();
    if (success) {
      this.isRecording = true;
      this._notifyStateChange('recording', true);
    }
    
    return success;
  }
  
  /**
   * Stop recording user speech
   * @returns {Promise<string>} Final transcript
   */
  async stopRecording() {
    if (!this.isRecording) {
      console.warn('Not recording');
      return this.currentTranscript;
    }
    
    console.log('Stopping recording');
    
    const success = await this.speechService.stopRecording();
    if (success) {
      this.isRecording = false;
      this._notifyStateChange('recording', false);
    }
    
    return this.currentTranscript;
  }
  
  /**
   * Process speech transcript with the current persona
   * @param {string} text - Text to process (if not provided, uses current transcript)
   * @returns {Promise<Blob|null>} Processed audio blob
   */
  async processSpeech(text = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isProcessing) {
      console.warn('Already processing speech');
      return null;
    }
    
    const textToProcess = text || this.currentTranscript;
    
    if (!textToProcess || textToProcess.trim() === '') {
      console.warn('No text to process');
      return null;
    }
    
    if (!this.currentPersona) {
      console.warn('No persona selected for speech processing');
      return null;
    }
    
    // Get persona attributes
    const attributes = this.personaAttributes[this.currentPersona] || {};
    
    // Set voice for current persona if not already set
    await this.selectVoiceForPersona(this.currentPersona);
    
    this.isProcessing = true;
    this._notifyStateChange('processing', true);
    
    try {
      console.log(`Processing speech for persona ${this.currentPersona}: "${textToProcess}"`);
      
      // Configure voice settings based on persona attributes
      const voiceSettings = {
        ...this.defaultVoiceSettings,
        stability: attributes.stability || this.defaultVoiceSettings.stability,
        similarity_boost: attributes.similarity_boost || this.defaultVoiceSettings.similarity_boost,
        style: attributes.style || this.defaultVoiceSettings.style,
        use_speaker_boost: attributes.use_speaker_boost !== undefined 
          ? attributes.use_speaker_boost 
          : this.defaultVoiceSettings.use_speaker_boost
      };
      
      // Get voice ID for the current persona
      const voiceId = this.selectedVoiceIds[this.currentPersona];
      
      // Process with ElevenLabs TTS
      const audioBlob = await this.speechService.textToSpeech(textToProcess, {
        voiceId: voiceId,
        voiceSettings: voiceSettings
      });
      
      this.isProcessing = false;
      this._notifyStateChange('processing', false);
      
      return audioBlob;
    } catch (error) {
      console.error('Error processing speech:', error);
      this._handleError(error);
      
      this.isProcessing = false;
      this._notifyStateChange('processing', false);
      
      return null;
    }
  }
  
  /**
   * Play audio blob
   * @param {Blob} audioBlob - Audio blob to play
   * @returns {Promise<void>}
   */
  async playAudio(audioBlob) {
    if (!audioBlob) {
      console.warn('No audio blob provided to play');
      return;
    }
    
    if (this.isPlaying) {
      this.stopAudio();
    }
    
    this.isPlaying = true;
    this._notifyStateChange('playing', true);
    
    try {
      await this.speechService.playAudio(audioBlob);
    } catch (error) {
      console.error('Error playing audio:', error);
      this._handleError(error);
    }
    
    this.isPlaying = false;
    this._notifyStateChange('playing', false);
  }
  
  /**
   * Stop audio playback
   */
  stopAudio() {
    if (this.speechService) {
      this.speechService.stopAudio();
    }
    
    this.isPlaying = false;
    this._notifyStateChange('playing', false);
  }
  
  /**
   * Change the active persona
   * @param {string} personaType - Type of persona
   * @returns {Promise<string|null>} - Selected voice ID
   */
  async changePersona(personaType) {
    if (!personaType) {
      console.warn('No persona type provided');
      return null;
    }
    
    return this.selectVoiceForPersona(personaType);
  }
  
  /**
   * Handle transcript updates from speech service
   * @private
   * @param {Object} data - Transcript data
   */
  _handleTranscript(data) {
    try {
      // Extract transcript from Deepgram format
      let transcript = '';
      let isFinal = false;
      
      if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
        transcript = data.channel.alternatives[0].transcript || '';
        isFinal = data.is_final || false;
      }
      
      // Update current transcript if final or better than existing
      if (isFinal || transcript.length > this.currentTranscript.length) {
        this.currentTranscript = transcript;
        
        // Notify transcript update
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(transcript, isFinal);
        }
        
        this._notifyStateChange('transcript', transcript);
      }
    } catch (error) {
      console.error('Error handling transcript:', error);
    }
  }
  
  /**
   * Handle errors from speech service
   * @private
   * @param {Error} error - Error object
   */
  _handleError(error) {
    console.error('Persona Speech Manager error:', error);
    
    if (this.onError) {
      this.onError(error);
    }
  }
  
  /**
   * Notify state changes
   * @private
   * @param {string} key - State key
   * @param {*} value - State value
   */
  _notifyStateChange(key, value) {
    if (this.onStateChange) {
      this.onStateChange(key, value);
    }
  }
  
  /**
   * Get voice database
   * @returns {Object} Voice database
   */
  getVoiceDb() {
    return this.voiceDb;
  }
  
  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      isPlaying: this.isPlaying,
      currentPersona: this.currentPersona,
      currentTranscript: this.currentTranscript,
      selectedVoiceIds: { ...this.selectedVoiceIds }
    };
  }
  
  /**
   * Add a new persona with attributes
   * @param {string} personaType - Type of persona
   * @param {Object} attributes - Persona attributes
   */
  addPersona(personaType, attributes) {
    if (!personaType) {
      console.warn('No persona type provided');
      return;
    }
    
    this.personaAttributes[personaType] = attributes || {};
    console.log(`Added persona ${personaType} with attributes:`, attributes);
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    console.log('Cleaning up Persona Speech Manager resources');
    
    if (this.speechService) {
      this.speechService.cleanup();
    }
    
    this.isInitialized = false;
    this.isRecording = false;
    this.isProcessing = false;
    this.isPlaying = false;
    
    this._notifyStateChange('initialized', false);
  }
}

export default PersonaSpeechManager; 
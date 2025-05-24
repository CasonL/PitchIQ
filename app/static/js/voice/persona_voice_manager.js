/**
 * persona_voice_manager.js
 * Integrates persona system with speech services for a complete voice experience
 */

import { DeepgramService } from './deepgram_service.js';
import { ElevenLabsTTSService } from './elevenlabs_tts_service.js';

class PersonaVoiceManager {
  /**
   * Create a new PersonaVoiceManager instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Core services
    this.deepgramService = null;
    this.elevenLabsService = null;
    
    // Voice configurations
    this.voiceDb = options.voiceDb || {};
    
    // Legendary voice mappings (specific voice IDs for legendary personas)
    this.legendaryVoiceMappings = {
      santa: 'knrPHWnBmmDHMoiMeP3l',  // Santa Claus voice
      pirate: 'D38z5RcWu1voky8WS1ja', // Sailor/fantasy voice
      cartoon: 'jBpfuIE2acCO8z3wKNLl'  // Childish/animated voice
    };
    
    // Selected voice IDs for each persona
    this.personaVoices = {};
    
    // Persona attributes
    this.personaAttributes = {
      // Default personas with their voice attributes
      friendly: { 
        gender: 'Female', 
        age: 'Young', 
        ethnicity: 'American',
        stability: 0.35,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true
      },
      professional: { 
        gender: 'Male', 
        age: 'Middle-aged', 
        ethnicity: 'American',
        stability: 0.75,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      },
      casual: { 
        gender: 'Male', 
        age: 'Young', 
        ethnicity: 'American',
        stability: 0.3,
        similarity_boost: 0.7,
        style: 0.4,
        use_speaker_boost: true
      },
      enthusiastic: { 
        gender: 'Female', 
        age: 'Young', 
        ethnicity: 'American',
        stability: 0.25,
        similarity_boost: 0.65,
        style: 0.6,
        use_speaker_boost: true
      },
      serious: { 
        gender: 'Male', 
        age: 'Middle-aged', 
        ethnicity: 'British',
        stability: 0.85,
        similarity_boost: 0.4,
        style: 0.0,
        use_speaker_boost: true
      }
    };
    
    // Current state
    this.currentPersona = options.defaultPersona || 'friendly';
    this.isProcessing = false;
    this.isRecording = false;
    this.isSpeaking = false;
    
    // API configuration
    this.config = {
      deepgramApiKey: options.deepgramApiKey || '',
      elevenLabsApiKey: options.elevenLabsApiKey || '',
      defaultVoiceId: options.defaultVoiceId || ''
    };
    
    // Event callbacks
    this.onTranscriptReady = options.onTranscriptReady || null;
    this.onTranscriptUpdate = options.onTranscriptUpdate || null;
    this.onSpeechResult = options.onSpeechResult || null;
    this.onPersonaChanged = options.onPersonaChanged || null;
    this.onProcessingStart = options.onProcessingStart || null;
    this.onProcessingEnd = options.onProcessingEnd || null;
    this.onRecordingStart = options.onRecordingStart || null;
    this.onRecordingEnd = options.onRecordingEnd || null;
    this.onSpeakingStart = options.onSpeakingStart || null;
    this.onSpeakingEnd = options.onSpeakingEnd || null;
    this.onError = options.onError || null;
    this.onStateChange = options.onStateChange || null;
  }
  
  /**
   * Initialize the manager
   * @param {Object} options - Options for initialization
   * @returns {Promise<PersonaVoiceManager>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing Persona Voice Manager');
    
    try {
      // Update configuration if provided
      if (options.deepgramApiKey) this.config.deepgramApiKey = options.deepgramApiKey;
      if (options.elevenLabsApiKey) this.config.elevenLabsApiKey = options.elevenLabsApiKey;
      if (options.defaultVoiceId) this.config.defaultVoiceId = options.defaultVoiceId;
      
      // Update callbacks if provided
      if (options.onTranscriptReady) this.onTranscriptReady = options.onTranscriptReady;
      if (options.onTranscriptUpdate) this.onTranscriptUpdate = options.onTranscriptUpdate;
      if (options.onSpeechResult) this.onSpeechResult = options.onSpeechResult;
      if (options.onPersonaChanged) this.onPersonaChanged = options.onPersonaChanged;
      if (options.onProcessingStart) this.onProcessingStart = options.onProcessingStart;
      if (options.onProcessingEnd) this.onProcessingEnd = options.onProcessingEnd;
      if (options.onRecordingStart) this.onRecordingStart = options.onRecordingStart;
      if (options.onRecordingEnd) this.onRecordingEnd = options.onRecordingEnd;
      if (options.onSpeakingStart) this.onSpeakingStart = options.onSpeakingStart;
      if (options.onSpeakingEnd) this.onSpeakingEnd = options.onSpeakingEnd;
      if (options.onStateChange) this.onStateChange = options.onStateChange;
      if (options.onError) this.onError = options.onError;
      
      // Initialize Deepgram service
      this.deepgramService = new DeepgramService({
        apiKey: this.config.deepgramApiKey,
        onTranscript: (transcript) => {
          if (this.onTranscriptReady) this.onTranscriptReady(transcript);
        },
        onInterimTranscript: (transcript) => {
          if (this.onTranscriptUpdate) this.onTranscriptUpdate(transcript);
        },
        onError: (error) => this._handleError(error)
      });
      
      await this.deepgramService.initialize();
      
      // Initialize ElevenLabs service
      this.elevenLabsService = new ElevenLabsTTSService({
        apiKey: this.config.elevenLabsApiKey,
        onReady: () => console.log('ElevenLabs TTS service ready'),
        onSpeakStart: () => {
          this.isSpeaking = true;
          if (this.onSpeakingStart) this.onSpeakingStart();
          this._notifyStateChange();
        },
        onSpeakEnd: () => {
          this.isSpeaking = false;
          if (this.onSpeakingEnd) this.onSpeakingEnd();
          this._notifyStateChange();
        },
        onError: (error) => this._handleError(error)
      });
      
      await this.elevenLabsService.initialize();
      
      // Refresh available voices
      await this.elevenLabsService.refreshVoices();
      
      // Set default persona if specified
      if (options.defaultPersona) {
        this.setPersona(options.defaultPersona);
      } else {
        // Select voice for current persona
        this._selectVoiceForCurrentPersona();
      }
      
      console.log('Persona Voice Manager initialized successfully');
      return this;
    } catch (error) {
      console.error('Error initializing Persona Voice Manager:', error);
      this._handleError(error);
      throw error;
    }
  }
  
  /**
   * Select a voice for the specified persona type
   * @param {string} personaType - Persona type identifier
   * @returns {Object|null} - Selected voice or null
   */
  selectVoiceForPersona(personaType) {
    if (!personaType || !this.personaAttributes[personaType]) {
      console.warn(`Invalid persona type: ${personaType}`);
      return null;
    }
    
    // Check if this is a legendary persona with a fixed voice
    if (this.legendaryVoiceMappings[personaType]) {
      const voiceId = this.legendaryVoiceMappings[personaType];
      const voice = this.elevenLabsService.getVoiceById(voiceId);
      
      if (voice) {
        // Store the selection
        this.personaVoices[personaType] = voiceId;
        console.log(`Selected legendary voice for ${personaType}: ${voiceId}`);
        return voice;
      }
    }
    
    // Get persona attributes
    const attributes = this.personaAttributes[personaType];
    
    // Get available voices
    const availableVoices = this.elevenLabsService.getVoices();
    
    // Filter by gender if specified
    let filteredVoices = availableVoices;
    if (attributes.gender) {
      filteredVoices = filteredVoices.filter(voice => 
        voice.labels?.gender?.toLowerCase() === attributes.gender.toLowerCase());
    }
    
    // If no voices match, fall back to all voices
    if (filteredVoices.length === 0) {
      filteredVoices = availableVoices;
    }
    
    // Select a voice (for now, just pick the first one in the filtered list)
    if (filteredVoices.length > 0) {
      const selectedVoice = filteredVoices[0];
      this.personaVoices[personaType] = selectedVoice.voice_id;
      console.log(`Selected voice for ${personaType}: ${selectedVoice.voice_id}`);
      return selectedVoice;
    }
    
    console.warn(`No suitable voice found for persona: ${personaType}`);
    
    // Fall back to default voice ID
    if (this.config.defaultVoiceId) {
      this.personaVoices[personaType] = this.config.defaultVoiceId;
      return this.elevenLabsService.getVoiceById(this.config.defaultVoiceId);
    }
    
    return null;
  }
  
  /**
   * Get the voice ID for the current persona
   * @returns {string|null} - Voice ID or null
   */
  getCurrentVoiceId() {
    // Check if we have a saved voice ID for this persona
    if (this.personaVoices[this.currentPersona]) {
      return this.personaVoices[this.currentPersona];
    }
    
    // Otherwise select a new voice
    const voice = this._selectVoiceForCurrentPersona();
    return voice ? voice.voice_id : null;
  }
  
  /**
   * Start recording user speech
   * @returns {Promise<boolean>} - Success status
   */
  async startRecording() {
    if (!this.deepgramService) {
      console.warn('DeepgramService not initialized');
      return false;
    }
    
    if (this.isRecording || this.isProcessing) {
      console.warn('Recording or processing already in progress');
      return false;
    }
    
    try {
      const success = await this.deepgramService.startRecording();
      
      if (success) {
        this.isRecording = true;
        if (this.onRecordingStart) this.onRecordingStart();
        this._notifyStateChange();
      }
      
      return success;
    } catch (error) {
      console.error('Error starting recording:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Stop recording and get the transcribed text
   * @returns {Promise<{success: boolean, transcript: string, audioBlob: Blob}>} - Result object
   */
  async stopRecording() {
    if (!this.deepgramService) {
      console.warn('DeepgramService not initialized');
      return { success: false, transcript: '', audioBlob: null };
    }
    
    if (!this.isRecording) {
      console.warn('No active recording to stop');
      return { success: false, transcript: '', audioBlob: null };
    }
    
    try {
      const result = await this.deepgramService.stopRecording();
      
      this.isRecording = false;
      if (this.onRecordingEnd) this.onRecordingEnd(result);
      this._notifyStateChange();
      
      return result;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this._handleError(error);
      
      this.isRecording = false;
      if (this.onRecordingEnd) this.onRecordingEnd({ success: false, transcript: '', audioBlob: null });
      this._notifyStateChange();
      
      return { success: false, transcript: '', audioBlob: null };
    }
  }
  
  /**
   * Process recorded speech through ElevenLabs
   * @param {Blob} audioBlob - Recorded audio blob
   * @returns {Promise<Blob>} - Processed audio blob
   */
  async processSpeech(audioBlob) {
    if (!this.elevenLabsService) {
      console.warn('ElevenLabsService not initialized');
      return null;
    }
    
    if (!audioBlob) {
      console.warn('No audio blob provided for processing');
      return null;
    }
    
    if (!this.currentPersona) {
      console.warn('No current persona selected');
      return null;
    }
    
    try {
      // Get voice ID for current persona
      const voiceId = this.getCurrentVoiceId();
      if (!voiceId) {
        throw new Error(`No voice selected for persona: ${this.currentPersona}`);
      }
      
      // Notify about processing start
      this.isProcessing = true;
      if (this.onProcessingStart) this.onProcessingStart();
      this._notifyStateChange();
      
      console.log(`Processing speech for persona: ${this.currentPersona} with voice: ${voiceId}`);
      
      // Get persona attributes for voice settings
      const attributes = this.personaAttributes[this.currentPersona] || {};
      
      // Configure voice settings
      const speechConfig = {
        stability: attributes.stability !== undefined ? attributes.stability : 0.5,
        similarity_boost: attributes.similarity_boost !== undefined ? attributes.similarity_boost : 0.75,
        style: attributes.style !== undefined ? attributes.style : 0.0,
        use_speaker_boost: attributes.use_speaker_boost !== undefined ? attributes.use_speaker_boost : true
      };
      
      // TODO: Process speech using ElevenLabs Speech-to-Speech API when available
      // For now, this would handle text-to-speech after STT
      
      // Notify about processing end
      this.isProcessing = false;
      if (this.onProcessingEnd) this.onProcessingEnd();
      this._notifyStateChange();
      
      return audioBlob; // Placeholder - would return processed audio
    } catch (error) {
      console.error('Error processing speech:', error);
      this._handleError(error);
      
      this.isProcessing = false;
      if (this.onProcessingEnd) this.onProcessingEnd();
      this._notifyStateChange();
      
      return null;
    }
  }
  
  /**
   * Speak text using the current persona voice
   * @param {string} text - Text to speak
   * @param {Object} options - Speaking options
   * @returns {Promise<boolean>} - Success status
   */
  async speakText(text, options = {}) {
    if (!this.elevenLabsService) {
      console.warn('ElevenLabsService not initialized');
      return false;
    }
    
    if (!text || text.trim() === '') {
      console.warn('No text provided for speech');
      return false;
    }
    
    try {
      // Get voice ID for current persona
      const voiceId = this.getCurrentVoiceId();
      if (!voiceId) {
        throw new Error(`No voice selected for persona: ${this.currentPersona}`);
      }
      
      // Get persona attributes for voice settings
      const attributes = this.personaAttributes[this.currentPersona] || {};
      
      // Configure voice settings
      const voiceSettings = {
        stability: options.stability !== undefined ? options.stability : attributes.stability,
        similarity_boost: options.similarity_boost !== undefined ? options.similarity_boost : attributes.similarity_boost,
        style: options.style !== undefined ? options.style : attributes.style,
        use_speaker_boost: options.use_speaker_boost !== undefined ? options.use_speaker_boost : attributes.use_speaker_boost
      };
      
      // Use the original text directly, skipping naturalization
      console.log(`Speaking clean text with persona ${this.currentPersona} using voice ${voiceId}`);
      
      // Speak the text
      const success = await this.elevenLabsService.speak(text, voiceId, voiceSettings);
      
      return success;
    } catch (error) {
      console.error('Error speaking text:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Cancel current operations (recording, processing, speaking)
   * @returns {Promise<boolean>} - Success status
   */
  async cancel() {
    try {
      let success = true;
      
      // Stop recording if active
      if (this.isRecording && this.deepgramService) {
        const stopResult = await this.deepgramService.stopRecording();
        success = success && stopResult.success;
        this.isRecording = false;
      }
      
      // Stop speaking if active
      if (this.isSpeaking && this.elevenLabsService) {
        const stopResult = await this.elevenLabsService.stop();
        success = success && stopResult;
        this.isSpeaking = false;
      }
      
      // Reset processing state
      this.isProcessing = false;
      
      this._notifyStateChange();
      return success;
    } catch (error) {
      console.error('Error cancelling operations:', error);
      this._handleError(error);
      
      // Force reset states
      this.isRecording = false;
      this.isProcessing = false;
      this.isSpeaking = false;
      
      this._notifyStateChange();
      return false;
    }
  }
  
  /**
   * Set the current persona
   * @param {string} personaType - Persona type to set
   * @returns {boolean} - Success status
   */
  setPersona(personaType) {
    if (!personaType || !this.personaAttributes[personaType]) {
      console.warn(`Invalid persona type: ${personaType}`);
      return false;
    }
    
    console.log(`Setting persona to: ${personaType}`);
    this.currentPersona = personaType;
    
    // Select a voice for this persona if not already selected
    if (!this.personaVoices[personaType]) {
      this._selectVoiceForCurrentPersona();
    }
    
    if (this.onPersonaChanged) {
      this.onPersonaChanged(personaType);
    }
    
    this._notifyStateChange();
    return true;
  }
  
  /**
   * Get a list of available personas
   * @returns {Array<string>} - List of persona types
   */
  getAvailablePersonas() {
    return Object.keys(this.personaAttributes);
  }
  
  /**
   * Add a new persona type with attributes
   * @param {string} personaType - Persona type identifier
   * @param {Object} attributes - Persona attributes
   * @returns {boolean} - Success status
   */
  addPersona(personaType, attributes) {
    if (!personaType || typeof personaType !== 'string') {
      console.warn('Invalid persona type');
      return false;
    }
    
    if (!attributes || typeof attributes !== 'object') {
      console.warn('Invalid persona attributes');
      return false;
    }
    
    // Ensure required attributes
    const persona = {
      gender: attributes.gender || 'neutral',
      age: attributes.age || 'adult',
      ethnicity: attributes.ethnicity || 'neutral',
      stability: attributes.stability !== undefined ? attributes.stability : 0.5,
      similarity_boost: attributes.similarity_boost !== undefined ? attributes.similarity_boost : 0.75,
      style: attributes.style !== undefined ? attributes.style : 0.0,
      use_speaker_boost: attributes.use_speaker_boost !== undefined ? attributes.use_speaker_boost : true
    };
    
    // Add additional attributes
    Object.keys(attributes).forEach(key => {
      if (!persona[key]) {
        persona[key] = attributes[key];
      }
    });
    
    // Add to persona attributes
    this.personaAttributes[personaType] = persona;
    
    console.log(`Added new persona: ${personaType}`);
    return true;
  }
  
  /**
   * Set voice parameters for a specific persona
   * @param {string} personaType - Persona type
   * @param {Object} params - Voice parameters
   * @returns {boolean} - Success status
   */
  setVoiceParameters(personaType, params) {
    if (!personaType || !this.personaAttributes[personaType]) {
      console.warn(`Invalid persona type: ${personaType}`);
      return false;
    }
    
    if (!params || typeof params !== 'object') {
      console.warn('Invalid voice parameters');
      return false;
    }
    
    // Update only provided parameters
    Object.keys(params).forEach(key => {
      this.personaAttributes[personaType][key] = params[key];
    });
    
    console.log(`Updated voice parameters for persona: ${personaType}`);
    return true;
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    console.log('Cleaning up Persona Voice Manager');
    
    // Cancel any ongoing operations
    this.cancel();
    
    // Clean up services
    if (this.deepgramService) {
      this.deepgramService.cleanup();
      this.deepgramService = null;
    }
    
    if (this.elevenLabsService) {
      this.elevenLabsService.cleanup();
      this.elevenLabsService = null;
    }
  }
  
  // Private methods
  
  /**
   * Select a voice for the current persona
   * @private
   * @returns {Object|null} - Selected voice or null
   */
  _selectVoiceForCurrentPersona() {
    if (!this.currentPersona) {
      console.warn('No current persona set');
      return null;
    }
    
    return this.selectVoiceForPersona(this.currentPersona);
  }
  
  /**
   * Handle API errors
   * @private
   * @param {Error} error - Error object
   */
  _handleError(error) {
    console.error('Persona Voice Manager error:', error);
    
    if (this.onError) {
      this.onError(error);
    }
  }
  
  /**
   * Notify state change
   * @private
   */
  _notifyStateChange() {
    if (this.onStateChange) {
      const state = {
        currentPersona: this.currentPersona,
        isRecording: this.isRecording,
        isProcessing: this.isProcessing,
        isSpeaking: this.isSpeaking,
        currentVoiceId: this.getCurrentVoiceId()
      };
      
      this.onStateChange(state);
    }
  }
}

export { PersonaVoiceManager }; 
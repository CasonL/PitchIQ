/**
 * voice_interaction_controller.js
 * Controller for voice interactions, integrating STT and TTS services
 */

import { PersonaVoiceManager } from './persona_voice_manager.js';

class VoiceInteractionController {
  /**
   * Create a new VoiceInteractionController
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Core components
    this.personaManager = null;
    
    // Configuration
    this.config = {
      deepgramApiKey: options.deepgramApiKey || '',
      elevenLabsApiKey: options.elevenLabsApiKey || '',
      defaultPersona: options.defaultPersona || 'friendly',
      defaultVoiceId: options.defaultVoiceId || '',
      autoStart: options.autoStart !== undefined ? options.autoStart : false,
      transcriptContainer: options.transcriptContainer || null,
      responseProcessor: options.responseProcessor || null
    };
    
    // State tracking
    this.isInitialized = false;
    this.isListening = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.lastTranscript = '';
    this.currentPersona = options.defaultPersona || 'friendly';
    
    // Event callbacks
    this.onReady = options.onReady || null;
    this.onListeningStart = options.onListeningStart || null;
    this.onListeningEnd = options.onListeningEnd || null;
    this.onTranscript = options.onTranscript || null;
    this.onTranscriptUpdate = options.onTranscriptUpdate || null;
    this.onProcessingStart = options.onProcessingStart || null;
    this.onProcessingEnd = options.onProcessingEnd || null;
    this.onResponse = options.onResponse || null;
    this.onSpeakingStart = options.onSpeakingStart || null;
    this.onSpeakingEnd = options.onSpeakingEnd || null;
    this.onError = options.onError || null;
    this.onStateChange = options.onStateChange || null;
    
    // UI elements
    this.ui = {
      transcriptContainer: null,
      responseContainer: null,
      startButton: null,
      stopButton: null,
      statusIndicator: null
    };
    
    // Bind methods
    this._handleTranscript = this._handleTranscript.bind(this);
    this._handleTranscriptUpdate = this._handleTranscriptUpdate.bind(this);
    this._handleError = this._handleError.bind(this);
    this._notifyStateChange = this._notifyStateChange.bind(this);
  }
  
  /**
   * Initialize the controller
   * @param {Object} options - Initialization options
   * @returns {Promise<VoiceInteractionController>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing Voice Interaction Controller');
    
    try {
      // Update configuration if provided
      if (options.deepgramApiKey) this.config.deepgramApiKey = options.deepgramApiKey;
      if (options.elevenLabsApiKey) this.config.elevenLabsApiKey = options.elevenLabsApiKey;
      if (options.defaultPersona) this.config.defaultPersona = options.defaultPersona;
      if (options.defaultVoiceId) this.config.defaultVoiceId = options.defaultVoiceId;
      if (options.autoStart !== undefined) this.config.autoStart = options.autoStart;
      if (options.transcriptContainer) this.config.transcriptContainer = options.transcriptContainer;
      if (options.responseProcessor) this.config.responseProcessor = options.responseProcessor;
      
      // Update callbacks if provided
      if (options.onReady) this.onReady = options.onReady;
      if (options.onListeningStart) this.onListeningStart = options.onListeningStart;
      if (options.onListeningEnd) this.onListeningEnd = options.onListeningEnd;
      if (options.onTranscript) this.onTranscript = options.onTranscript;
      if (options.onTranscriptUpdate) this.onTranscriptUpdate = options.onTranscriptUpdate;
      if (options.onProcessingStart) this.onProcessingStart = options.onProcessingStart;
      if (options.onProcessingEnd) this.onProcessingEnd = options.onProcessingEnd;
      if (options.onResponse) this.onResponse = options.onResponse;
      if (options.onSpeakingStart) this.onSpeakingStart = options.onSpeakingStart;
      if (options.onSpeakingEnd) this.onSpeakingEnd = options.onSpeakingEnd;
      if (options.onError) this.onError = options.onError;
      if (options.onStateChange) this.onStateChange = options.onStateChange;
      
      // Initialize UI elements if provided
      if (options.ui) {
        if (options.ui.transcriptContainer) this.ui.transcriptContainer = options.ui.transcriptContainer;
        if (options.ui.responseContainer) this.ui.responseContainer = options.ui.responseContainer;
        if (options.ui.startButton) this.ui.startButton = options.ui.startButton;
        if (options.ui.stopButton) this.ui.stopButton = options.ui.stopButton;
        if (options.ui.statusIndicator) this.ui.statusIndicator = options.ui.statusIndicator;
      }
      
      // Initialize persona manager
      this.personaManager = new PersonaVoiceManager({
        deepgramApiKey: this.config.deepgramApiKey,
        elevenLabsApiKey: this.config.elevenLabsApiKey,
        defaultPersona: this.config.defaultPersona,
        defaultVoiceId: this.config.defaultVoiceId,
        
        // Event handlers
        onTranscriptReady: this._handleTranscript,
        onTranscriptUpdate: this._handleTranscriptUpdate,
        onProcessingStart: () => {
          this.isProcessing = true;
          if (this.onProcessingStart) this.onProcessingStart();
          this._notifyStateChange();
        },
        onProcessingEnd: () => {
          this.isProcessing = false;
          if (this.onProcessingEnd) this.onProcessingEnd();
          this._notifyStateChange();
        },
        onRecordingStart: () => {
          this.isListening = true;
          if (this.onListeningStart) this.onListeningStart();
          this._notifyStateChange();
        },
        onRecordingEnd: (result) => {
          this.isListening = false;
          if (this.onListeningEnd) this.onListeningEnd(result);
          this._notifyStateChange();
        },
        onSpeakingStart: () => {
          this.isSpeaking = true;
          if (this.onSpeakingStart) this.onSpeakingStart();
          this._notifyStateChange();
        },
        onSpeakingEnd: () => {
          this.isSpeaking = false;
          if (this.onSpeakingEnd) this.onSpeakingEnd();
          this._notifyStateChange();
        },
        onError: this._handleError
      });
      
      await this.personaManager.initialize();
      
      // Set up UI event listeners if available
      this._setupUIListeners();
      
      this.isInitialized = true;
      console.log('Voice Interaction Controller initialized successfully');
      
      // Start listening automatically if configured
      if (this.config.autoStart) {
        await this.startListening();
      }
      
      if (this.onReady) {
        this.onReady();
      }
      
      this._notifyStateChange();
      return this;
    } catch (error) {
      console.error('Error initializing Voice Interaction Controller:', error);
      this._handleError(error);
      throw error;
    }
  }
  
  /**
   * Start listening for user input
   * @returns {Promise<boolean>} - Success status
   */
  async startListening() {
    if (!this.isInitialized) {
      console.warn('Voice Interaction Controller not initialized');
      return false;
    }
    
    if (this.isListening) {
      console.warn('Already listening');
      return true;
    }
    
    try {
      console.log('Starting to listen for user input');
      const success = await this.personaManager.startRecording();
      
      return success;
    } catch (error) {
      console.error('Error starting listening:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Stop listening and process user input
   * @returns {Promise<{success: boolean, transcript: string}>} - Result
   */
  async stopListening() {
    if (!this.isInitialized) {
      console.warn('Voice Interaction Controller not initialized');
      return { success: false, transcript: '' };
    }
    
    if (!this.isListening) {
      console.warn('Not currently listening');
      return { success: false, transcript: '' };
    }
    
    try {
      console.log('Stopping listening and processing input');
      const result = await this.personaManager.stopRecording();
      
      // Handle case where result might be null or undefined
      if (!result) {
        console.warn('No result from stopping recording');
        return { success: false, transcript: '' };
      }
      
      if (result.success && result.transcript) {
        // Process the transcript (typically would send to AI for response generation)
        await this._processUserInput(result.transcript);
      }
      
      return { 
        success: result.success || false, 
        transcript: result.transcript || '' 
      };
    } catch (error) {
      console.error('Error stopping listening:', error);
      this._handleError(error);
      return { success: false, transcript: '' };
    }
  }
  
  /**
   * Process transcript and generate response
   * @param {string} transcript - User transcript to process
   * @returns {Promise<boolean>} - Success status
   */
  async _processUserInput(transcript) {
    if (!transcript || transcript.trim() === '') {
      console.warn('No transcript to process');
      return false;
    }
    
    try {
      // Set processing state
      this.isProcessing = true;
      if (this.onProcessingStart) this.onProcessingStart();
      this._notifyStateChange();
      
      console.log(`Processing user input: "${transcript}"`);
      
      // This would typically call an AI service to generate a response
      // For demo purposes, we'll just echo the transcript with a prefix
      let response;
      
      if (this.config.responseProcessor && typeof this.config.responseProcessor === 'function') {
        // Custom response processor provided
        response = await this.config.responseProcessor(transcript, this.currentPersona);
      } else {
        // Simple demo response
        response = `I heard you say: ${transcript}. How can I help with that?`;
      }
      
      // Speak the response
      const success = await this.speakResponse(response);
      
      // Update processing state
      this.isProcessing = false;
      if (this.onProcessingEnd) this.onProcessingEnd(success);
      this._notifyStateChange();
      
      return success;
    } catch (error) {
      console.error('Error processing user input:', error);
      this._handleError(error);
      
      // Reset processing state
      this.isProcessing = false;
      if (this.onProcessingEnd) this.onProcessingEnd(false);
      this._notifyStateChange();
      
      return false;
    }
  }
  
  /**
   * Speak a response using the current persona
   * @param {string} text - Text to speak
   * @param {Object} options - Speaking options
   * @returns {Promise<boolean>} - Success status
   */
  async speakResponse(text, options = {}) {
    if (!this.isInitialized) {
      console.warn('Voice Interaction Controller not initialized');
      return false;
    }
    
    if (!text || text.trim() === '') {
      console.warn('No text provided for response');
      return false;
    }
    
    try {
      console.log(`Speaking response: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Notify about response
      if (this.onResponse) {
        this.onResponse(text);
      }
      
      // Update UI if available
      if (this.ui.responseContainer) {
        this.ui.responseContainer.textContent = text;
      }
      
      // Speak the response
      const success = await this.personaManager.speakText(text, options);
      
      return success;
    } catch (error) {
      console.error('Error speaking response:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Cancel current operations
   * @returns {Promise<boolean>} - Success status
   */
  async cancel() {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      console.log('Cancelling current operations');
      const success = await this.personaManager.cancel();
      
      // Reset state
      this.isListening = false;
      this.isProcessing = false;
      this.isSpeaking = false;
      
      this._notifyStateChange();
      return success;
    } catch (error) {
      console.error('Error cancelling operations:', error);
      this._handleError(error);
      
      // Force reset state
      this.isListening = false;
      this.isProcessing = false;
      this.isSpeaking = false;
      
      this._notifyStateChange();
      return false;
    }
  }
  
  /**
   * Set the current persona
   * @param {string} personaType - Persona type
   * @returns {boolean} - Success status
   */
  setPersona(personaType) {
    if (!this.isInitialized) {
      console.warn('Voice Interaction Controller not initialized');
      return false;
    }
    
    try {
      const success = this.personaManager.setPersona(personaType);
      
      if (success) {
        this.currentPersona = personaType;
        this._notifyStateChange();
      }
      
      return success;
    } catch (error) {
      console.error('Error setting persona:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Get available personas
   * @returns {Array<string>} - List of persona types
   */
  getAvailablePersonas() {
    if (!this.isInitialized || !this.personaManager) {
      return [];
    }
    
    return this.personaManager.getAvailablePersonas();
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    console.log('Cleaning up Voice Interaction Controller');
    
    // Remove UI event listeners
    this._removeUIListeners();
    
    // Clean up persona manager
    if (this.personaManager) {
      this.personaManager.cleanup();
      this.personaManager = null;
    }
    
    // Reset state
    this.isInitialized = false;
    this.isListening = false;
    this.isProcessing = false;
    this.isSpeaking = false;
  }
  
  // Private methods
  
  /**
   * Set up UI event listeners
   * @private
   */
  _setupUIListeners() {
    if (this.ui.startButton) {
      this.ui.startButton.addEventListener('click', () => this.startListening());
    }
    
    if (this.ui.stopButton) {
      this.ui.stopButton.addEventListener('click', () => this.stopListening());
    }
  }
  
  /**
   * Remove UI event listeners
   * @private
   */
  _removeUIListeners() {
    // Remove event listeners if needed
  }
  
  /**
   * Handle transcript from STT
   * @private
   * @param {string} transcript - Transcribed text
   */
  _handleTranscript(transcript) {
    console.log(`Received transcript: "${transcript}"`);
    this.lastTranscript = transcript;
    
    // Update UI if available
    if (this.ui.transcriptContainer) {
      this.ui.transcriptContainer.textContent = transcript;
    }
    
    // Trigger callback
    if (this.onTranscript) {
      this.onTranscript(transcript);
    }
  }
  
  /**
   * Handle interim transcript updates
   * @private
   * @param {string} transcript - Interim transcript
   */
  _handleTranscriptUpdate(transcript) {
    // Update UI if available
    if (this.ui.transcriptContainer) {
      this.ui.transcriptContainer.textContent = transcript;
    }
    
    // Trigger callback
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate(transcript);
    }
  }
  
  /**
   * Handle errors
   * @private
   * @param {Error} error - Error object
   */
  _handleError(error) {
    console.error('Voice Interaction Controller error:', error);
    
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
        isInitialized: this.isInitialized,
        isListening: this.isListening,
        isProcessing: this.isProcessing,
        isSpeaking: this.isSpeaking,
        currentPersona: this.currentPersona,
        lastTranscript: this.lastTranscript
      };
      
      this.onStateChange(state);
    }
    
    // Update UI status indicator if available
    if (this.ui.statusIndicator) {
      let status = 'ready';
      
      if (this.isListening) {
        status = 'listening';
      } else if (this.isProcessing) {
        status = 'processing';
      } else if (this.isSpeaking) {
        status = 'speaking';
      }
      
      this.ui.statusIndicator.dataset.status = status;
      this.ui.statusIndicator.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
}

export { VoiceInteractionController }; 
/**
 * voice_interface.js
 * Main entry point for speech-to-speech voice interaction with personas
 */

import PersonaVoiceManager from './persona_voice_manager.js';

class VoiceInterface {
  constructor(options = {}) {
    // Core components
    this.personaManager = new PersonaVoiceManager({
      apiKey: options.apiKey || '',
      defaultPersona: options.defaultPersona || 'friendly',
      onError: options.onError,
      onStateChange: (state) => {
        // Update interface state based on persona manager state
        this._updateState({
          isRecording: state.isRecording,
          isProcessing: state.isProcessing,
          currentPersona: state.currentPersona
        });
      }
    });
    
    // UI elements
    this.elements = {
      recordButton: null,
      statusIndicator: null,
      personaSelector: null,
      cancelButton: null
    };
    
    // State tracking
    this.isInitialized = false;
    this.isRecording = false;
    
    // Event callbacks
    this.onStateChange = options.onStateChange || null;
    this.onPersonaChange = options.onPersonaChange || null;
    this.onError = options.onError || null;
    
    // State object
    this.state = {
      isRecording: false,
      isProcessing: false,
      currentPersona: options.defaultPersona || 'friendly',
      availablePersonas: []
    };
  }
  
  /**
   * Initialize the voice interface
   * @param {Object} options - Configuration options
   * @returns {Promise<VoiceInterface>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing Voice Interface');
    
    if (this.isInitialized) {
      console.warn('Voice Interface already initialized');
      return this;
    }
    
    try {
      // Initialize persona manager
      await this.personaManager.initialize({
        apiKey: options.apiKey || this.personaManager.speechService.apiKey,
        defaultPersona: options.defaultPersona || this.state.currentPersona,
        onPersonaResponse: (data) => {
          this._updateState({ isProcessing: false });
          if (options.onPersonaResponse) options.onPersonaResponse(data);
        },
        onPersonaChanged: (data) => {
          this._updateState({ currentPersona: data.personaType });
          if (this.onPersonaChange) this.onPersonaChange(data);
        },
        onProcessingStart: () => {
          this._updateState({ isProcessing: true });
          if (options.onProcessingStart) options.onProcessingStart();
        },
        onProcessingEnd: () => {
          this._updateState({ isProcessing: false });
          if (options.onProcessingEnd) options.onProcessingEnd();
        },
        onError: (error) => {
          if (this.onError) this.onError(error);
        }
      });
      
      // Update available personas
      this.state.availablePersonas = this.personaManager.getAvailablePersonas();
      
      // Set up UI elements if provided
      if (options.elements) {
        this.setupUIElements(options.elements);
      }
      
      this.isInitialized = true;
      console.log('Voice Interface initialized successfully');
      
      return this;
    } catch (error) {
      console.error('Error initializing Voice Interface:', error);
      if (this.onError) this.onError(error);
      return this;
    }
  }
  
  /**
   * Set up UI elements and attach event handlers
   * @param {Object} elements - UI element references
   */
  setupUIElements(elements) {
    // Store elements
    if (elements.recordButton) this.elements.recordButton = elements.recordButton;
    if (elements.statusIndicator) this.elements.statusIndicator = elements.statusIndicator;
    if (elements.personaSelector) this.elements.personaSelector = elements.personaSelector;
    if (elements.cancelButton) this.elements.cancelButton = elements.cancelButton;
    
    // Attach event handlers
    if (this.elements.recordButton) {
      this.elements.recordButton.addEventListener('click', this.toggleRecording.bind(this));
    }
    
    if (this.elements.cancelButton) {
      this.elements.cancelButton.addEventListener('click', this.cancelInteraction.bind(this));
    }
    
    if (this.elements.personaSelector) {
      // Populate persona selector
      this._populatePersonaSelector();
      
      // Add change event handler
      this.elements.personaSelector.addEventListener('change', (event) => {
        const personaType = event.target.value;
        this.setPersona(personaType);
      });
    }
    
    console.log('UI elements set up successfully');
  }
  
  /**
   * Toggle recording state
   */
  async toggleRecording() {
    if (!this.isInitialized) {
      console.error('Voice Interface not initialized');
      return;
    }
    
    if (this.state.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  
  /**
   * Start recording user speech
   * @returns {Promise<boolean>} - Success status
   */
  async startRecording() {
    if (!this.isInitialized) {
      console.error('Voice Interface not initialized');
      return false;
    }
    
    if (this.state.isRecording || this.state.isProcessing) {
      console.warn('Recording or processing already in progress');
      return false;
    }
    
    try {
      const success = await this.personaManager.startRecording();
      
      if (success) {
        this._updateState({ isRecording: true });
        this._updateUIForRecording(true);
      }
      
      return success;
    } catch (error) {
      console.error('Error starting recording:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }
  
  /**
   * Stop recording and process with current persona
   * @returns {Promise<boolean>} - Success status
   */
  async stopRecording() {
    if (!this.isInitialized) {
      console.error('Voice Interface not initialized');
      return false;
    }
    
    if (!this.state.isRecording) {
      console.warn('No active recording to stop');
      return false;
    }
    
    try {
      const success = await this.personaManager.stopRecording();
      
      if (success) {
        this._updateState({ 
          isRecording: false,
          isProcessing: true
        });
        this._updateUIForRecording(false);
      }
      
      return success;
    } catch (error) {
      console.error('Error stopping recording:', error);
      if (this.onError) this.onError(error);
      
      this._updateState({ isRecording: false });
      this._updateUIForRecording(false);
      
      return false;
    }
  }
  
  /**
   * Cancel current interaction (recording or processing)
   */
  cancelInteraction() {
    if (!this.isInitialized) {
      console.error('Voice Interface not initialized');
      return;
    }
    
    this.personaManager.cancel();
    
    this._updateState({
      isRecording: false,
      isProcessing: false
    });
    
    this._updateUIForRecording(false);
    console.log('Interaction cancelled');
  }
  
  /**
   * Set the active persona
   * @param {string} personaType - Persona type identifier
   * @returns {boolean} - Success status
   */
  setPersona(personaType) {
    if (!this.isInitialized) {
      console.error('Voice Interface not initialized');
      return false;
    }
    
    return this.personaManager.setPersona(personaType);
  }
  
  /**
   * Get available personas
   * @returns {Array<string>} - List of persona type identifiers
   */
  getAvailablePersonas() {
    return this.state.availablePersonas;
  }
  
  /**
   * Get current interface state
   * @returns {Object} - Current state
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.isInitialized) {
      this.personaManager.cleanup();
      
      // Remove event listeners
      if (this.elements.recordButton) {
        this.elements.recordButton.removeEventListener('click', this.toggleRecording);
      }
      
      if (this.elements.cancelButton) {
        this.elements.cancelButton.removeEventListener('click', this.cancelInteraction);
      }
      
      if (this.elements.personaSelector) {
        this.elements.personaSelector.removeEventListener('change', this.setPersona);
      }
      
      this.isInitialized = false;
    }
  }
  
  // Private methods
  
  /**
   * Update the interface state and trigger state change event
   * @private
   * @param {Object} newState - Partial state to update
   */
  _updateState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    if (this.onStateChange) {
      this.onStateChange({
        prevState,
        newState: this.state,
        changes: newState
      });
    }
  }
  
  /**
   * Update UI elements for recording state
   * @private
   * @param {boolean} isRecording - Whether recording is active
   */
  _updateUIForRecording(isRecording) {
    if (this.elements.recordButton) {
      if (isRecording) {
        this.elements.recordButton.classList.add('recording');
        this.elements.recordButton.textContent = 'Stop';
      } else {
        this.elements.recordButton.classList.remove('recording');
        this.elements.recordButton.textContent = 'Record';
      }
    }
    
    if (this.elements.statusIndicator) {
      if (isRecording) {
        this.elements.statusIndicator.textContent = 'Recording...';
        this.elements.statusIndicator.classList.add('recording');
      } else if (this.state.isProcessing) {
        this.elements.statusIndicator.textContent = 'Processing...';
        this.elements.statusIndicator.classList.add('processing');
        this.elements.statusIndicator.classList.remove('recording');
      } else {
        this.elements.statusIndicator.textContent = 'Ready';
        this.elements.statusIndicator.classList.remove('recording', 'processing');
      }
    }
  }
  
  /**
   * Populate persona selector with available personas
   * @private
   */
  _populatePersonaSelector() {
    if (!this.elements.personaSelector) return;
    
    // Clear existing options
    this.elements.personaSelector.innerHTML = '';
    
    // Add options for each available persona
    this.state.availablePersonas.forEach(personaType => {
      const option = document.createElement('option');
      option.value = personaType;
      option.textContent = personaType.charAt(0).toUpperCase() + personaType.slice(1);
      this.elements.personaSelector.appendChild(option);
    });
    
    // Set current persona as selected
    this.elements.personaSelector.value = this.state.currentPersona;
  }
}

export default VoiceInterface; 
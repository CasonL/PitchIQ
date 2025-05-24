/**
 * persona_base.js
 * Base class that defines the interface all legendary personas must implement.
 */

class PersonaBase {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.personalityTraits = config.personalityTraits || {};
    this.triggerPhrases = config.triggerPhrases || [];
    this.voiceSettings = config.voiceSettings || {};
    this.container = null;
    this.messageHistory = [];
    this.isActive = false;
    this.stateManager = null;
    this.animationManager = null;
    this.chatRenderer = null;
  }

  /**
   * Initialize the persona with required managers
   * @param {Object} options - Initialization options
   */
  initialize(options = {}) {
    const { 
      stateManager, 
      animationManager, 
      chatRenderer 
    } = options;
    
    this.stateManager = stateManager;
    this.animationManager = animationManager;
    this.chatRenderer = chatRenderer;
    
    // Initialize components
    this._initializeComponents();
    
    return this;
  }

  /**
   * Mount the persona UI to a DOM container
   * @param {string|Element} container - DOM element or selector to mount to
   */
  mount(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }
    
    if (!this.container) {
      throw new Error(`Cannot mount persona "${this.name}": Container not found`);
    }
    
    // Render initial UI
    this._renderUI();
    
    return this;
  }

  /**
   * Begin interaction with the persona
   */
  beginInteraction() {
    this.isActive = true;
    
    // Trigger entry animation
    if (this.animationManager) {
      this.animationManager.play('entry');
    }
    
    // Initialize state
    if (this.stateManager) {
      this.stateManager.initialize();
    }
    
    // Display welcome message
    this._displayWelcomeMessage();
    
    return this;
  }

  /**
   * End interaction with the persona
   */
  endInteraction() {
    this.isActive = false;
    
    // Trigger exit animation
    if (this.animationManager) {
      this.animationManager.play('exit');
    }
    
    // Save final state
    if (this.stateManager) {
      this.stateManager.saveState();
    }
    
    return this;
  }

  /**
   * Handle a message from the user
   * @param {string} messageText - The text message from the user
   */
  handleUserMessage(messageText) {
    if (!this.isActive) {
      return;
    }
    
    // Add message to history
    this.messageHistory.push({ 
      sender: 'user', 
      text: messageText, 
      timestamp: Date.now() 
    });
    
    // Update state with user message
    if (this.stateManager) {
      this.stateManager.updateWithUserMessage(messageText);
    }
    
    // Process message and generate response
    this._processMessage(messageText);
    
    return this;
  }

  /**
   * Generate a response to a user message
   * @param {string} messageText - The user's message to respond to
   * @returns {Promise<string>} The persona's response
   */
  async generateResponse(messageText) {
    // This should be implemented by each specific persona
    throw new Error('generateResponse must be implemented by each persona');
  }

  /**
   * Trigger an animation for the persona
   * @param {string} animationName - Name of the animation to trigger
   * @param {Object} options - Animation options
   */
  triggerAnimation(animationName, options = {}) {
    if (!this.animationManager) {
      return;
    }
    
    return this.animationManager.play(animationName, options);
  }

  /**
   * Speak text using text-to-speech
   * @param {string} text - Text to speak
   * @param {Object} options - TTS options
   */
  speak(text, options = {}) {
    // This would integrate with voice_interface.js
    if (window.speakText) {
      const voiceOptions = {
        ...this.voiceSettings,
        ...options
      };
      
      window.speakText(text, voiceOptions);
    }
  }

  /**
   * Check if a message contains persona-specific trigger phrases
   * @param {string} messageText - Message to check for triggers
   * @returns {Object|null} Trigger info if found, null otherwise
   */
  checkForTriggers(messageText) {
    if (!messageText || !this.triggerPhrases.length) {
      return null;
    }
    
    const lowerMessage = messageText.toLowerCase();
    
    for (const trigger of this.triggerPhrases) {
      if (lowerMessage.includes(trigger.toLowerCase())) {
        return {
          trigger,
          index: lowerMessage.indexOf(trigger.toLowerCase())
        };
      }
    }
    
    return null;
  }

  // Private methods

  /**
   * Initialize persona-specific components
   * @private
   */
  _initializeComponents() {
    // Should be implemented by specific personas
  }

  /**
   * Render the persona UI
   * @private
   */
  _renderUI() {
    if (!this.container || !this.chatRenderer) {
      return;
    }
    
    this.chatRenderer.render(this.container);
  }

  /**
   * Display welcome message
   * @private
   */
  _displayWelcomeMessage() {
    const welcomeMessage = this._getWelcomeMessage();
    if (!welcomeMessage) {
      return;
    }
    
    this.messageHistory.push({
      sender: 'persona',
      text: welcomeMessage,
      timestamp: Date.now()
    });
    
    if (this.chatRenderer) {
      this.chatRenderer.addMessage({
        sender: 'persona',
        text: welcomeMessage
      });
    }
    
    this.speak(welcomeMessage);
  }

  /**
   * Get welcome message for the persona
   * @private
   * @returns {string} Welcome message
   */
  _getWelcomeMessage() {
    return `Hello! I'm ${this.name}. How can I help you today?`;
  }

  /**
   * Process an incoming message and prepare a response
   * @private
   * @param {string} messageText - User message to process
   */
  async _processMessage(messageText) {
    try {
      // Show typing indicator
      if (this.chatRenderer) {
        this.chatRenderer.showTypingIndicator();
      }
      
      // Check for triggers
      const trigger = this.checkForTriggers(messageText);
      if (trigger) {
        this._handleTrigger(trigger, messageText);
      }
      
      // Generate response
      const response = await this.generateResponse(messageText);
      
      // Add response to history
      this.messageHistory.push({
        sender: 'persona',
        text: response,
        timestamp: Date.now()
      });
      
      // Display response
      if (this.chatRenderer) {
        this.chatRenderer.hideTypingIndicator();
        this.chatRenderer.addMessage({
          sender: 'persona',
          text: response
        });
      }
      
      // Speak response
      this.speak(response);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Hide typing indicator
      if (this.chatRenderer) {
        this.chatRenderer.hideTypingIndicator();
      }
    }
  }

  /**
   * Handle a detected trigger phrase
   * @private
   * @param {Object} trigger - Trigger information
   * @param {string} messageText - Original message
   */
  _handleTrigger(trigger, messageText) {
    // Should be implemented by specific personas
  }
}

// Export for use in modules
export { PersonaBase };
export default PersonaBase; 
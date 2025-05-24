// Import dependencies
import Config from './config.js';
import State from './state.js';

/**
 * UI Module
 * 
 * Handles UI interactions and display for the voice interface
 */

class UI {
  constructor() {
    this.elements = {
      conversationOrb: null,
      statusIndicator: null,
      notificationElement: null,
      transcriptDisplay: null
    };
    
    this.initialized = false;
  }
  
  /**
   * Initialize the UI module
   * @returns {UI} This instance for chaining
   */
  init() {
    if (this.initialized) return this;
    
    // Find or create UI elements
    this.elements.conversationOrb = document.getElementById('conversationOrb');
    this.elements.statusIndicator = document.getElementById('conversationStatus');
    
    // Create notification element if it doesn't exist
    if (!document.getElementById('notification')) {
      const notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        max-width: 80%;
        text-align: center;
      `;
      document.body.appendChild(notification);
      this.elements.notificationElement = notification;
    } else {
      this.elements.notificationElement = document.getElementById('notification');
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Update orb UI state based on listening and speaking state
   * @param {Object} state Current state object
   */
  updateOrbState(state) {
    if (!this.elements.conversationOrb) return;
    
    const { isListening, isSpeaking, isThinking } = state;
    
    // Reset all states
    this.elements.conversationOrb.classList.remove('listening', 'speaking', 'thinking-mode');
    
    // Apply active states
    if (isListening) {
      this.elements.conversationOrb.classList.add('listening');
    }
    
    if (isSpeaking) {
      this.elements.conversationOrb.classList.add('speaking');
    }
    
    if (isThinking) {
      this.elements.conversationOrb.classList.add('thinking-mode');
    }
  }
  
  /**
   * Show a notification message
   * @param {string} message The message to display
   * @param {number} duration Duration in ms to show the notification (default: 3000)
   */
  showNotification(message, duration = 3000) {
    if (!this.initialized) this.init();
    
    if (!this.elements.notificationElement) return;
    
    // Set the message and show it
    this.elements.notificationElement.textContent = message;
    this.elements.notificationElement.style.opacity = '1';
    
    // Hide after the specified duration
    setTimeout(() => {
      this.elements.notificationElement.style.opacity = '0';
    }, duration);
  }
  
  /**
   * Update the status display
   * @param {string} status Status message to display
   */
  updateStatus(status) {
    if (!this.initialized) this.init();
    
    if (this.elements.statusIndicator) {
      this.elements.statusIndicator.textContent = status;
    }
  }
  
  /**
   * Update transcript display
   * @param {string} text Transcript text to display
   * @param {boolean} isFinal Whether this is a final result
   */
  updateTranscript(text, isFinal = true) {
    if (!this.initialized) this.init();
    
    // Find or create transcript display
    if (!this.elements.transcriptDisplay) {
      const display = document.getElementById('transcript-display');
      if (display) {
        this.elements.transcriptDisplay = display;
      } else {
        // Create transcript display if it doesn't exist
        const transcriptDisplay = document.createElement('div');
        transcriptDisplay.id = 'transcript-display';
        transcriptDisplay.className = 'transcript-display';
        transcriptDisplay.style.cssText = `
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 9999;
          opacity: 0.9;
          transition: opacity 0.3s ease;
          max-width: 80%;
          text-align: center;
          display: none;
        `;
        document.body.appendChild(transcriptDisplay);
        this.elements.transcriptDisplay = transcriptDisplay;
      }
    }
    
    const display = this.elements.transcriptDisplay;
    
    if (text && text.trim() !== '') {
      display.textContent = text;
      display.style.display = 'block';
      
      // Adjust opacity for interim vs final
      display.style.opacity = isFinal ? '0.9' : '0.6';
      
      // Hide after a delay if final
      if (isFinal) {
        setTimeout(() => {
          display.style.display = 'none';
        }, 3000);
      }
    } else {
      display.style.display = 'none';
    }
  }
  
  /**
   * Add a message to the conversation transcript
   * @param {string} sender 'user' or 'ai'
   * @param {string} message The message text
   */
  addMessageToTranscript(sender, message) {
    const transcriptContainer = document.getElementById('transcript-container');
    if (!transcriptContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    const textElement = document.createElement('div');
    textElement.className = 'message-text';
    textElement.textContent = message;
    
    messageElement.appendChild(textElement);
    transcriptContainer.appendChild(messageElement);
    
    // Scroll to bottom
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
  }
  
  /**
   * Create a button element
   * @param {string} id Button ID
   * @param {string} text Button text
   * @param {Function} onClick Click handler
   * @returns {HTMLButtonElement} The created button
   */
  createButton(id, text, onClick) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Clear any references
    this.elements = {
      conversationOrb: null,
      statusIndicator: null,
      notificationElement: null,
      transcriptDisplay: null
    };
    
    this.initialized = false;
  }
}

// Export as a singleton
export default new UI(); 
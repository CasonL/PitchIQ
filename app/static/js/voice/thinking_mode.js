/**
 * Thinking Mode Module
 * 
 * Handles the thinking mode functionality, allowing users to take time
 * to formulate their thoughts without triggering immediate responses.
 */

import State from './state.js';
import UI from './ui.js';

class ThinkingMode {
  constructor() {
    this.isActive = false;
    this.timeoutId = null;
    this.impatientCheckId = null;
    this.frustrationLevel = 0;
    this.onAICheckCallback = null;
    this.onExitWithImpatienceCallback = null;
    this.onExitCallback = null;
    
    // Phrases that indicate the user needs time to think
    this.thinkingPhrases = [
      "give me a sec",
      "give me a second",
      "let me think",
      "hang on",
      "hold on",
      "one moment",
      "just a moment",
      "thinking",
      "let me consider",
      "need to think",
      "wait a second",
      "hmm",
      "uh",
      "um",
      "well",
      "I need to think about this",
      "let me process that",
      "need a moment",
      "give me a minute",
      "just a minute"
    ];
  }
  
  /**
   * Initialize the thinking mode module
   * @param {Object} options Configuration options
   */
  init(options = {}) {
    this.onAICheckCallback = options.onAICheck || (() => {});
    this.onExitWithImpatienceCallback = options.onExitWithImpatience || (() => {});
    this.onExitCallback = options.onExit || (() => {});
    
    // Initialize UI elements if needed
    const thinkingButton = document.getElementById('thinking-button');
    if (thinkingButton) {
      thinkingButton.addEventListener('click', () => this.toggle());
    }
    
    return this;
  }
  
  /**
   * Check if text contains thinking phrases
   * @param {string} text Text to check for thinking phrases
   * @returns {boolean} True if the text contains thinking phrases
   */
  containsThinkingPhrase(text) {
    if (!text) return false;
    
    // Convert to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Check if any thinking phrase is in the text
    return this.thinkingPhrases.some(phrase => lowerText.includes(phrase));
  }
  
  /**
   * Toggle thinking mode state
   */
  toggle() {
    if (this.isActive) {
      this.exit();
    } else {
      this.enter();
    }
    
    return this.isActive;
  }
  
  /**
   * Enter thinking mode
   */
  enter() {
    this.isActive = true;
    this.frustrationLevel = 0;
    
    // Update UI state
    const conversationOrb = document.getElementById('conversationOrb');
    if (conversationOrb) {
      conversationOrb.classList.add('thinking-mode');
    }
    
    const thinkingButton = document.getElementById('thinking-button');
    if (thinkingButton) {
      thinkingButton.classList.add('active');
      thinkingButton.innerText = 'Thinking... (click to send)';
    }
    
    // Update status
    UI.updateStatus('Thinking mode active. Take your time...');
    
    // Show notification
    UI.showNotification('Thinking mode activated. Take your time to form your thoughts.');
    
    // Set timeout for silence
    this.resetTimeout();
    
    return true;
  }
  
  /**
   * Exit thinking mode
   */
  exit() {
    if (!this.isActive) return false;
    
    this.isActive = false;
    
    // Update UI state
    const conversationOrb = document.getElementById('conversationOrb');
    if (conversationOrb) {
      conversationOrb.classList.remove('thinking-mode');
    }
    
    const thinkingButton = document.getElementById('thinking-button');
    if (thinkingButton) {
      thinkingButton.classList.remove('active');
      thinkingButton.innerText = 'Thinking Mode';
    }
    
    // Clear timeouts
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.impatientCheckId) {
      clearTimeout(this.impatientCheckId);
      this.impatientCheckId = null;
    }
    
    // Update status
    UI.updateStatus('Listening...');
    
    // Call exit callback
    if (this.onExitCallback) {
      this.onExitCallback();
    }
    
    return true;
  }
  
  /**
   * Exit thinking mode with an impatient response
   */
  exitWithImpatience() {
    if (!this.isActive) return false;
    
    // Exit thinking mode
    this.isActive = false;
    
    // Update UI state
    const conversationOrb = document.getElementById('conversationOrb');
    if (conversationOrb) {
      conversationOrb.classList.remove('thinking-mode');
    }
    
    const thinkingButton = document.getElementById('thinking-button');
    if (thinkingButton) {
      thinkingButton.classList.remove('active');
      thinkingButton.innerText = 'Thinking Mode';
    }
    
    // Clear timeouts
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.impatientCheckId) {
      clearTimeout(this.impatientCheckId);
      this.impatientCheckId = null;
    }
    
    // Update status
    UI.updateStatus('Listening...');
    
    // Call impatience callback
    if (this.onExitWithImpatienceCallback) {
      this.onExitWithImpatienceCallback();
    }
    
    return true;
  }
  
  /**
   * Reset the thinking mode timeout
   */
  resetTimeout() {
    // Clear any existing timeouts
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.impatientCheckId) {
      clearTimeout(this.impatientCheckId);
    }
    
    // Set a timeout for initial check (30 seconds)
    this.timeoutId = setTimeout(() => {
      if (this.isActive) {
        this.checkIfUserIsPresent();
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Check if user is still present after silence
   */
  checkIfUserIsPresent() {
    // Call AI check callback
    if (this.onAICheckCallback) {
      this.onAICheckCallback();
    }
    
    // Set a shorter timeout for next check (becoming impatient)
    const nextCheckTime = Math.floor(7000 + Math.random() * 8000); // 7-15 seconds
    
    this.impatientCheckId = setTimeout(() => {
      if (this.isActive) {
        // If still in thinking mode, AI gets impatient
        this.exitWithImpatience();
      }
    }, nextCheckTime);
  }
  
  /**
   * Check if thinking mode is active
   * @returns {boolean} True if thinking mode is active
   */
  isThinking() {
    return this.isActive;
  }
  
  /**
   * Handle user input during thinking mode
   * @param {string} text User input text
   * @returns {boolean} True if the input was handled by thinking mode
   */
  handleInput(text) {
    if (!this.isActive) return false;
    
    // Reset timeout when user provides input during thinking mode
    this.resetTimeout();
    
    // Check if user wants to exit thinking mode
    if (text && text.toLowerCase().includes('i\'m done') || 
        text.toLowerCase().includes('finished thinking')) {
      this.exit();
      return true;
    }
    
    return false;
  }
  
  /**
   * Dispose of the thinking mode module
   */
  dispose() {
    this.exit();
    
    // Clear any references
    this.onAICheckCallback = null;
    this.onExitWithImpatienceCallback = null;
    this.onExitCallback = null;
  }
}

export default ThinkingMode; 
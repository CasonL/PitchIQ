/**
 * Speech Synthesis Module
 * Handles text-to-speech using Web Speech API
 */

import Utils from './utils.js';
import Config from './config.js';

class SpeechSynthesis {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.utterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.queue = [];
    this.events = Utils.events.createEventEmitter();
    this.selectedVoice = null;
    this.initialize();
  }

  /**
   * Initialize speech synthesis
   */
  initialize() {
    if (!this.synthesis) {
      Utils.logger.error('Speech synthesis not supported in this browser');
      return false;
    }

    // Get available voices
    this.loadVoices();

    // Set up event listener for voiceschanged event
    this.synthesis.onvoiceschanged = () => {
      this.loadVoices();
    };

    Utils.logger.info('Speech synthesis initialized');
    return true;
  }

  /**
   * Load available voices and select default voice
   */
  loadVoices() {
    const voices = this.synthesis.getVoices();
    
    if (!voices || voices.length === 0) {
      Utils.logger.warn('No synthesis voices available');
      this.events.trigger('error', {
        type: 'voices',
        message: 'No text-to-speech voices available'
      });
      return false;
    }
    
    // Filter voices based on configuration
    let availableVoices = voices;
    
    if (Config.synthesis.preferredLanguage) {
      const langVoices = voices.filter(voice => 
        voice.lang.toLowerCase().includes(Config.synthesis.preferredLanguage.toLowerCase())
      );
      
      if (langVoices.length > 0) {
        availableVoices = langVoices;
      }
    }
    
    // Select a voice
    let selectedVoice = null;
    
    // First try to find preferred voice by name
    if (Config.synthesis.preferredVoiceName) {
      selectedVoice = availableVoices.find(voice => 
        voice.name.toLowerCase().includes(Config.synthesis.preferredVoiceName.toLowerCase())
      );
    }
    
    // If preferred voice not found, select a default
    if (!selectedVoice) {
      // Prefer voices marked as "default"
      const defaultVoice = availableVoices.find(voice => voice.default);
      
      if (defaultVoice) {
        selectedVoice = defaultVoice;
      } else if (availableVoices.length > 0) {
        // Just take the first available voice
        selectedVoice = availableVoices[0];
      }
    }
    
    if (selectedVoice) {
      this.selectedVoice = selectedVoice;
      Utils.logger.info(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      this.events.trigger('voicesLoaded', {
        selectedVoice,
        availableVoices
      });
      return true;
    } else {
      Utils.logger.warn('Failed to select a voice');
      return false;
    }
  }

  /**
   * Set the voice to use for synthesis
   * @param {SpeechSynthesisVoice|string} voice - The voice object or voice name
   * @returns {boolean} Whether the voice was set successfully
   */
  setVoice(voice) {
    if (!this.synthesis) return false;
    
    const voices = this.synthesis.getVoices();
    
    if (typeof voice === 'string') {
      // Find voice by name
      const matchedVoice = voices.find(v => 
        v.name.toLowerCase().includes(voice.toLowerCase())
      );
      
      if (matchedVoice) {
        this.selectedVoice = matchedVoice;
        Utils.logger.info(`Voice set to: ${matchedVoice.name}`);
        return true;
      } else {
        Utils.logger.warn(`Voice "${voice}" not found`);
        return false;
      }
    } else if (voice && typeof voice === 'object') {
      // Check if this is a valid voice object
      if (voices.some(v => v.name === voice.name)) {
        this.selectedVoice = voice;
        Utils.logger.info(`Voice set to: ${voice.name}`);
        return true;
      } else {
        Utils.logger.warn('Invalid voice object');
        return false;
      }
    }
    
    return false;
  }

  /**
   * Create a speech utterance with the given text
   * @param {string} text - Text to speak
   * @param {Object} options - Options for speech synthesis
   * @returns {SpeechSynthesisUtterance} The utterance object
   */
  createUtterance(text, options = {}) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    
    // Set default speech parameters
    utterance.rate = options.rate || Config.synthesis.rate;
    utterance.pitch = options.pitch || Config.synthesis.pitch;
    utterance.volume = options.volume || Config.synthesis.volume;
    
    // Add event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPaused = false;
      this.events.trigger('started', { text });
      Utils.logger.debug('Started speaking:', text);
      
      if (options.onStart) {
        options.onStart();
      }
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.utterance = null;
      this.events.trigger('ended', { text });
      Utils.logger.debug('Finished speaking');
      
      if (options.onEnd) {
        options.onEnd();
      }
      
      // Check if there are more items in the queue
      this.processQueue();
    };
    
    utterance.onerror = (event) => {
      Utils.logger.error('Speech synthesis error:', event);
      this.events.trigger('error', {
        type: 'synthesis',
        message: `Speech synthesis error: ${event.error}`,
        originalEvent: event
      });
      
      if (options.onError) {
        options.onError(event);
      }
    };
    
    utterance.onpause = () => {
      this.isPaused = true;
      this.events.trigger('paused');
      Utils.logger.debug('Speech paused');
      
      if (options.onPause) {
        options.onPause();
      }
    };
    
    utterance.onresume = () => {
      this.isPaused = false;
      this.events.trigger('resumed');
      Utils.logger.debug('Speech resumed');
      
      if (options.onResume) {
        options.onResume();
      }
    };
    
    utterance.onboundary = (event) => {
      this.events.trigger('boundary', {
        name: event.name,
        charIndex: event.charIndex,
        charLength: event.charLength,
        utterance: event.utterance
      });
      
      if (options.onBoundary) {
        options.onBoundary(event);
      }
    };
    
    return utterance;
  }

  /**
   * Speak the given text
   * @param {string} text - Text to speak
   * @param {Object} options - Options for speech synthesis
   * @returns {boolean} Whether the speech was started successfully
   */
  speak(text, options = {}) {
    if (!this.synthesis) {
      Utils.logger.error('Speech synthesis not supported');
      return false;
    }
    
    if (!text || text.trim() === '') {
      Utils.logger.warn('Empty text passed to speak');
      return false;
    }
    
    // Preprocess text
    const processedText = this.preprocessText(text);
    
    // If already speaking, add to queue or replace current speech
    if (this.isSpeaking) {
      if (options.interrupt) {
        this.stop();
      } else {
        // Add to queue
        this.queue.push({ text: processedText, options });
        Utils.logger.debug('Added to speech queue:', processedText);
        return true;
      }
    }
    
    try {
      // Create and configure utterance
      const utterance = this.createUtterance(processedText, options);
      
      // Store reference to current utterance
      this.utterance = utterance;
      
      // Start speaking
      this.synthesis.speak(utterance);
      
      return true;
    } catch (error) {
      Utils.logger.error('Failed to speak:', error);
      return false;
    }
  }

  /**
   * Preprocess text before speaking
   * @param {string} text - Text to preprocess
   * @returns {string} Processed text
   */
  preprocessText(text) {
    if (!text) return '';
    
    let processedText = text.trim();
    
    // Split text into sentences if it's too long
    if (processedText.length > Config.synthesis.maxTextLength) {
      // Queue up sentences separately
      const sentences = Utils.speech.splitIntoSentences(processedText);
      
      // Speak the first sentence now
      if (sentences.length > 0) {
        processedText = sentences[0];
        
        // Queue the rest
        for (let i = 1; i < sentences.length; i++) {
          this.queue.push({ 
            text: sentences[i], 
            options: { } // Pass same options to all sentences
          });
        }
      }
    }
    
    return processedText;
  }

  /**
   * Process the speech queue
   */
  processQueue() {
    if (this.queue.length === 0 || this.isSpeaking) {
      return;
    }
    
    const next = this.queue.shift();
    this.speak(next.text, next.options);
  }

  /**
   * Pause the current speech
   * @returns {boolean} Whether the speech was paused successfully
   */
  pause() {
    if (!this.synthesis || !this.isSpeaking || this.isPaused) {
      return false;
    }
    
    try {
      this.synthesis.pause();
      return true;
    } catch (error) {
      Utils.logger.error('Failed to pause speech:', error);
      return false;
    }
  }

  /**
   * Resume the current speech
   * @returns {boolean} Whether the speech was resumed successfully
   */
  resume() {
    if (!this.synthesis || !this.isSpeaking || !this.isPaused) {
      return false;
    }
    
    try {
      this.synthesis.resume();
      return true;
    } catch (error) {
      Utils.logger.error('Failed to resume speech:', error);
      return false;
    }
  }

  /**
   * Stop the current speech and clear the queue
   * @returns {boolean} Whether the speech was stopped successfully
   */
  stop() {
    if (!this.synthesis) {
      return false;
    }
    
    try {
      // Clear the queue
      this.queue = [];
      
      // Cancel current speech
      this.synthesis.cancel();
      
      this.isSpeaking = false;
      this.isPaused = false;
      this.utterance = null;
      
      Utils.logger.info('Speech stopped');
      this.events.trigger('stopped');
      
      return true;
    } catch (error) {
      Utils.logger.error('Failed to stop speech:', error);
      return false;
    }
  }

  /**
   * Get all available voices
   * @returns {SpeechSynthesisVoice[]} Array of available voices
   */
  getVoices() {
    if (!this.synthesis) {
      return [];
    }
    
    return this.synthesis.getVoices();
  }

  /**
   * Get the currently selected voice
   * @returns {SpeechSynthesisVoice|null} The selected voice or null
   */
  getCurrentVoice() {
    return this.selectedVoice;
  }

  /**
   * Check if speech synthesis is currently speaking
   * @returns {boolean} Whether speech synthesis is speaking
   */
  isActive() {
    return this.isSpeaking;
  }

  /**
   * Check if speech synthesis is paused
   * @returns {boolean} Whether speech synthesis is paused
   */
  isPausedState() {
    return this.isPaused;
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   * @returns {Function} Function to remove the listener
   */
  on(event, callback) {
    return this.events.on(event, callback);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback to remove
   */
  off(event, callback) {
    this.events.off(event, callback);
  }
}

// Export a singleton instance
export default new SpeechSynthesis(); 
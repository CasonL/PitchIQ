/**
 * Speech Recognition Module
 * Handles voice input using Web Speech API
 */

import Utils from './utils.js';
import Config from './config.js';

class SpeechRecognition {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isPaused = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.silenceTimer = null;
    this.events = Utils.events.createEventEmitter();
    this.initialize();
  }

  /**
   * Initialize speech recognition
   */
  initialize() {
    const SpeechRecognitionAPI = Utils.speech.getRecognitionConstructor();
    
    if (!SpeechRecognitionAPI) {
      Utils.logger.error('Speech recognition not supported in this browser');
      return false;
    }
    
    try {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = Config.recognition.continuous;
      this.recognition.interimResults = Config.recognition.interimResults;
      this.recognition.lang = Config.recognition.language;
      
      this.setupEventHandlers();
      Utils.logger.info('Speech recognition initialized');
      return true;
    } catch (error) {
      Utils.logger.error('Failed to initialize speech recognition', error);
      return false;
    }
  }

  /**
   * Set up event handlers for speech recognition
   */
  setupEventHandlers() {
    if (!this.recognition) return;
    
    // Results event - fired when speech is recognized
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          // Reset silence timer when final result is received
          this.resetSilenceTimer();
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update transcripts
      if (finalTranscript) {
        this.transcript += finalTranscript;
        this.events.trigger('finalResult', {
          text: finalTranscript,
          fullText: this.transcript
        });
      }
      
      if (interimTranscript) {
        this.interimTranscript = interimTranscript;
        this.events.trigger('interimResult', {
          text: interimTranscript,
          fullText: this.transcript + interimTranscript
        });
        
        // Reset silence timer when interim results change
        this.resetSilenceTimer();
      }
    };
    
    // Error event
    this.recognition.onerror = (event) => {
      Utils.logger.error('Recognition error', event.error);
      
      switch (event.error) {
        case 'no-speech':
          Utils.logger.info('No speech detected');
          break;
        case 'aborted':
          Utils.logger.info('Recognition aborted');
          break;
        case 'audio-capture':
          Utils.logger.error('No microphone detected');
          this.events.trigger('error', {
            type: 'device',
            message: 'No microphone detected. Please check your microphone settings.'
          });
          break;
        case 'not-allowed':
          Utils.logger.error('Microphone access denied');
          this.events.trigger('error', {
            type: 'permission',
            message: 'Microphone access was denied. Please allow microphone access to use voice features.'
          });
          break;
        case 'network':
          Utils.logger.error('Network error in speech recognition');
          this.events.trigger('error', {
            type: 'network',
            message: 'A network error occurred. Please check your internet connection.'
          });
          break;
        default:
          this.events.trigger('error', {
            type: 'unknown',
            message: `Recognition error: ${event.error}`
          });
      }
      
      // Attempt to restart if not a permission error
      if (event.error !== 'not-allowed' && this.isListening && !this.isPaused) {
        this.restart();
      } else if (event.error === 'not-allowed') {
        this.stop();
      }
    };
    
    // End event - fired when recognition stops
    this.recognition.onend = () => {
      Utils.logger.debug('Recognition ended');
      
      // Auto-restart if still supposed to be listening
      if (this.isListening && !this.isPaused) {
        Utils.logger.debug('Auto-restarting recognition');
        this.restart();
      } else {
        this.events.trigger('stopped');
      }
    };
    
    // Start event - fired when recognition starts
    this.recognition.onstart = () => {
      Utils.logger.debug('Recognition started');
      this.events.trigger('started');
      
      // Start silence detection
      this.resetSilenceTimer();
    };
  }

  /**
   * Start speech recognition
   * @returns {boolean} Whether recognition was started successfully
   */
  start() {
    if (!this.recognition) {
      if (!this.initialize()) {
        return false;
      }
    }
    
    if (this.isListening && !this.isPaused) {
      Utils.logger.debug('Recognition already running');
      return true;
    }
    
    try {
      this.recognition.start();
      this.isListening = true;
      this.isPaused = false;
      Utils.logger.info('Recognition started');
      return true;
    } catch (error) {
      Utils.logger.error('Failed to start recognition', error);
      return false;
    }
  }

  /**
   * Stop speech recognition
   */
  stop() {
    if (!this.recognition || !this.isListening) {
      return;
    }
    
    try {
      this.recognition.stop();
      this.isListening = false;
      this.isPaused = false;
      this.clearSilenceTimer();
      Utils.logger.info('Recognition stopped');
    } catch (error) {
      Utils.logger.error('Failed to stop recognition', error);
    }
  }

  /**
   * Pause speech recognition
   */
  pause() {
    if (!this.recognition || !this.isListening || this.isPaused) {
      return;
    }
    
    try {
      this.recognition.stop();
      this.isPaused = true;
      this.clearSilenceTimer();
      Utils.logger.info('Recognition paused');
      this.events.trigger('paused');
    } catch (error) {
      Utils.logger.error('Failed to pause recognition', error);
    }
  }

  /**
   * Resume speech recognition
   */
  resume() {
    if (!this.recognition || !this.isListening || !this.isPaused) {
      return;
    }
    
    try {
      this.recognition.start();
      this.isPaused = false;
      Utils.logger.info('Recognition resumed');
      this.events.trigger('resumed');
    } catch (error) {
      Utils.logger.error('Failed to resume recognition', error);
    }
  }

  /**
   * Restart speech recognition
   */
  restart() {
    if (!this.recognition) {
      return this.start();
    }
    
    try {
      this.recognition.stop();
      
      // Small delay to ensure complete stop before starting again
      setTimeout(() => {
        if (this.isListening && !this.isPaused) {
          this.recognition.start();
          Utils.logger.debug('Recognition restarted');
        }
      }, 100);
      
      return true;
    } catch (error) {
      Utils.logger.error('Failed to restart recognition', error);
      return false;
    }
  }

  /**
   * Clear the current transcript
   */
  clearTranscript() {
    this.transcript = '';
    this.interimTranscript = '';
    Utils.logger.debug('Transcript cleared');
    this.events.trigger('transcriptCleared');
  }

  /**
   * Reset the silence timer
   */
  resetSilenceTimer() {
    this.clearSilenceTimer();
    
    if (!Config.recognition.silenceDetection.enabled) {
      return;
    }
    
    this.silenceTimer = setTimeout(() => {
      if (this.isListening && !this.isPaused && this.transcript.trim() !== '') {
        Utils.logger.info('Silence detected, processing accumulated speech');
        
        const transcript = this.transcript.trim();
        this.clearTranscript();
        
        // Trigger silence detection event with accumulated transcript
        this.events.trigger('silenceDetected', {
          text: transcript
        });
      }
    }, Config.recognition.silenceDetection.timeout);
  }

  /**
   * Clear the silence timer
   */
  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
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

  /**
   * Get the current transcript
   * @returns {string} The current transcript
   */
  getCurrentTranscript() {
    return this.transcript;
  }

  /**
   * Get the current interim transcript
   * @returns {string} The current interim transcript
   */
  getInterimTranscript() {
    return this.interimTranscript;
  }

  /**
   * Get the combined transcript (final + interim)
   * @returns {string} The combined transcript
   */
  getCombinedTranscript() {
    return this.transcript + this.interimTranscript;
  }

  /**
   * Check if recognition is listening
   * @returns {boolean} Whether recognition is listening
   */
  isActive() {
    return this.isListening;
  }

  /**
   * Check if recognition is paused
   * @returns {boolean} Whether recognition is paused
   */
  isPausedState() {
    return this.isPaused;
  }
}

// Export a singleton instance
export default new SpeechRecognition(); 
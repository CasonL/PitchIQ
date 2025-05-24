/**
 * Voice Interface Utilities
 * Contains helper functions for speech recognition and synthesis
 */

const Utils = {
  /**
   * Logging utilities with configurable log level
   */
  logger: {
    // Log levels: 0=none, 1=error, 2=warn, 3=info, 4=debug
    level: 4,
    
    error: function(...args) {
      if (this.level >= 1) console.error('[Voice]', ...args);
    },
    
    warn: function(...args) {
      if (this.level >= 2) console.warn('[Voice]', ...args);
    },
    
    info: function(...args) {
      if (this.level >= 3) console.info('[Voice]', ...args);
    },
    
    debug: function(...args) {
      if (this.level >= 4) console.debug('[Voice]', ...args);
    },
    
    setLevel: function(level) {
      this.level = level;
    }
  },
  
  /**
   * Event emitter for handling custom events
   */
  events: {
    /**
     * Create a new event emitter
     * @returns {Object} Event emitter object
     */
    createEventEmitter: function() {
      const events = {};
      
      return {
        /**
         * Register an event listener
         * @param {string} event - Event name
         * @param {Function} callback - Event callback
         * @returns {Function} Function to remove the listener
         */
        on: function(event, callback) {
          if (!events[event]) {
            events[event] = [];
          }
          
          events[event].push(callback);
          
          // Return a function to remove this listener
          return () => this.off(event, callback);
        },
        
        /**
         * Remove an event listener
         * @param {string} event - Event name
         * @param {Function} callback - Event callback to remove
         */
        off: function(event, callback) {
          if (!events[event]) return;
          
          const index = events[event].indexOf(callback);
          if (index !== -1) {
            events[event].splice(index, 1);
          }
          
          // Clean up empty event arrays
          if (events[event].length === 0) {
            delete events[event];
          }
        },
        
        /**
         * Trigger an event
         * @param {string} event - Event name
         * @param {*} data - Event data to pass to callbacks
         */
        trigger: function(event, data) {
          if (!events[event]) return;
          
          for (const callback of events[event]) {
            try {
              callback(data);
            } catch (error) {
              Utils.logger.error(`Error in event handler for ${event}:`, error);
            }
          }
        },
        
        /**
         * Check if an event has listeners
         * @param {string} event - Event name
         * @returns {boolean} Whether the event has listeners
         */
        hasListeners: function(event) {
          return !!(events[event] && events[event].length > 0);
        },
        
        /**
         * Get the number of listeners for an event
         * @param {string} event - Event name
         * @returns {number} Number of listeners
         */
        listenerCount: function(event) {
          return events[event] ? events[event].length : 0;
        },
        
        /**
         * Clear all event listeners
         * @param {string} [event] - Optional event name to clear
         */
        clear: function(event) {
          if (event) {
            delete events[event];
          } else {
            for (const key in events) {
              delete events[key];
            }
          }
        }
      };
    }
  },
  
  /**
   * Browser feature detection
   */
  browser: {
    /**
     * Check if speech recognition is supported
     * @returns {boolean} Whether speech recognition is supported
     */
    supportsSpeechRecognition: function() {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },
    
    /**
     * Check if speech synthesis is supported
     * @returns {boolean} Whether speech synthesis is supported
     */
    supportsSpeechSynthesis: function() {
      return !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    },
    
    /**
     * Check if audio recording is supported
     * @returns {boolean} Whether audio recording is supported
     */
    supportsAudioRecording: function() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    
    /**
     * Get the SpeechRecognition constructor
     * @returns {Object|null} SpeechRecognition constructor or null
     */
    getSpeechRecognition: function() {
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }
  },
  
  /**
   * Speech processing utilities
   */
  speech: {
    /**
     * Split text into sentences
     * @param {string} text - Text to split
     * @returns {string[]} Array of sentences
     */
    splitIntoSentences: function(text) {
      if (!text) return [];
      
      // Split by common sentence terminators but preserve the terminators
      const sentences = text.split(/(?<=[.!?])\s+/);
      
      // Filter out empty sentences and trim whitespace
      return sentences
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);
    },
    
    /**
     * Clean up transcript from speech recognition
     * @param {string} transcript - Raw transcript
     * @returns {string} Cleaned transcript
     */
    cleanTranscript: function(transcript) {
      if (!transcript) return '';
      
      let cleaned = transcript.trim();
      
      // Convert to lowercase if needed
      // cleaned = cleaned.toLowerCase();
      
      // Remove filler words if desired
      // const fillerWords = ['um', 'uh', 'like', 'you know'];
      // fillerWords.forEach(word => {
      //   cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      // });
      
      // Remove multiple spaces
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      return cleaned;
    },
    
    /**
     * Check if the text is a potential command
     * @param {string} text - Text to check
     * @returns {boolean} Whether the text is a potential command
     */
    isPotentialCommand: function(text) {
      if (!text) return false;
      
      const commandPrefixes = [
        'hey', 'hi', 'hello', 'ok', 'okay', 'stop', 'pause', 'resume', 'continue'
      ];
      
      const lowercaseText = text.toLowerCase().trim();
      
      return commandPrefixes.some(prefix => 
        lowercaseText.startsWith(prefix) || 
        lowercaseText === prefix
      );
    },
    
    /**
     * Detect silence in audio data
     * @param {Float32Array} audioData - Audio data
     * @param {number} threshold - Silence threshold (0-1)
     * @returns {boolean} Whether the audio is silent
     */
    isSilent: function(audioData, threshold = 0.01) {
      if (!audioData || audioData.length === 0) return true;
      
      // Calculate RMS (Root Mean Square)
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
      }
      
      const rms = Math.sqrt(sum / audioData.length);
      
      return rms < threshold;
    },
    
    /**
     * Check if text is a complete sentence
     * @param {string} text - Text to check
     * @returns {boolean} Whether the text is a complete sentence
     */
    isCompleteSentence: function(text) {
      if (!text || text.trim().length < 3) return false;
      
      // Check if ends with punctuation
      const hasEndPunctuation = /[.!?]$/.test(text.trim());
      
      // Check if long enough (likely complete even without punctuation)
      const isLongEnough = text.split(' ').length >= 4;
      
      // Check if contains certain end phrases
      const hasEndPhrase = /(?:thank you|thanks|please|got it|goodbye|bye|that's all|that is all)$/i.test(text.trim());
      
      return hasEndPunctuation || (isLongEnough && text.length > 20) || hasEndPhrase;
    },

    /**
     * Get the Recognition constructor with browser compatibility
     * @returns {Object|null} SpeechRecognition constructor or null
     */
    getRecognitionConstructor: function() {
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }
  },
  
  /**
   * DOM manipulation utilities
   */
  dom: {
    /**
     * Create a DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Element attributes
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement} Created element
     */
    createElement: function(tag, attrs = {}, children = []) {
      const element = document.createElement(tag);
      
      // Set attributes
      for (const key in attrs) {
        if (key === 'style' && typeof attrs[key] === 'object') {
          Object.assign(element.style, attrs[key]);
        } else if (key === 'className') {
          element.className = attrs[key];
        } else if (key === 'dataset') {
          for (const dataKey in attrs[key]) {
            element.dataset[dataKey] = attrs[key][dataKey];
          }
        } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
          element.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
        } else {
          element.setAttribute(key, attrs[key]);
        }
      }
      
      // Add children
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof HTMLElement) {
            element.appendChild(child);
          } else if (child !== null && child !== undefined) {
            element.appendChild(document.createTextNode(String(child)));
          }
        }
      } else if (children !== null && children !== undefined) {
        element.textContent = String(children);
      }
      
      return element;
    },
    
    /**
     * Create a button with specified attributes
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @param {Object} attrs - Additional attributes
     * @returns {HTMLButtonElement} Created button
     */
    createButton: function(text, onClick, attrs = {}) {
      return this.createElement('button', {
        ...attrs,
        onclick: onClick
      }, text);
    },
    
    /**
     * Create an icon element
     * @param {string} name - Icon name or class
     * @param {Object} attrs - Additional attributes
     * @returns {HTMLElement} Created icon element
     */
    createIcon: function(name, attrs = {}) {
      return this.createElement('i', {
        className: `icon ${name}`,
        ...attrs
      });
    }
  },
  
  /**
   * Debounce function to limit the rate at which a function can fire
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce: function(func, wait) {
    let timeout;
    
    return function(...args) {
      const context = this;
      
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(context, args);
      }, wait);
    };
  },
  
  /**
   * Throttle function to limit the rate at which a function can fire
   * @param {Function} func - Function to throttle
   * @param {number} limit - Throttle limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle: function(func, limit) {
    let lastFunc;
    let lastRan;
    
    return function(...args) {
      const context = this;
      
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
};

export default Utils; 
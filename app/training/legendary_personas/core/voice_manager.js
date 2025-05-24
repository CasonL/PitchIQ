/**
 * voice_manager.js
 * Manages voice synthesis for legendary personas
 */

class VoiceManager {
  constructor(options = {}) {
    // Voice settings
    this.voice = options.voice || null;
    this.rate = options.rate || 1.0;
    this.pitch = options.pitch || 1.0;
    this.volume = options.volume || 1.0;
    this.useElevenLabs = options.useElevenLabs || false;
    this.elevenLabsVoiceId = options.elevenLabsVoiceId || null;
    this.elevenLabsApiKey = options.elevenLabsApiKey || null;
    
    // State tracking
    this.isSpeaking = false;
    this.queue = [];
    this.currentUtterance = null;
    
    // Events
    this.onSpeechStart = options.onSpeechStart || null;
    this.onSpeechEnd = options.onSpeechEnd || null;
    this.onSpeechPause = options.onSpeechPause || null;
    this.onSpeechResume = options.onSpeechResume || null;
    this.onSpeechError = options.onSpeechError || null;
    
    // Initialize speech synthesis
    this.synth = window.speechSynthesis;
    this.availableVoices = [];
    
    // Bind methods
    this._onVoicesChanged = this._onVoicesChanged.bind(this);
    this._processQueue = this._processQueue.bind(this);
    
    // Set up voice changed event
    if (this.synth) {
      this.synth.addEventListener('voiceschanged', this._onVoicesChanged);
      // Trigger voice loading
      this._loadVoices();
    }
  }
  
  /**
   * Initialize the voice manager with options
   * @param {Object} options - Voice configuration options
   */
  initialize(options = {}) {
    // Update settings
    if (options.voice) this.voice = options.voice;
    if (options.rate !== undefined) this.rate = options.rate;
    if (options.pitch !== undefined) this.pitch = options.pitch;
    if (options.volume !== undefined) this.volume = options.volume;
    if (options.useElevenLabs !== undefined) this.useElevenLabs = options.useElevenLabs;
    if (options.elevenLabsVoiceId) this.elevenLabsVoiceId = options.elevenLabsVoiceId;
    if (options.elevenLabsApiKey) this.elevenLabsApiKey = options.elevenLabsApiKey;
    
    // Update event handlers
    if (options.onSpeechStart) this.onSpeechStart = options.onSpeechStart;
    if (options.onSpeechEnd) this.onSpeechEnd = options.onSpeechEnd;
    if (options.onSpeechPause) this.onSpeechPause = options.onSpeechPause;
    if (options.onSpeechResume) this.onSpeechResume = options.onSpeechResume;
    if (options.onSpeechError) this.onSpeechError = options.onSpeechError;
    
    // Force reload voices
    this._loadVoices();
    
    return this;
  }
  
  /**
   * Speak the provided text
   * @param {string} text - The text to speak
   * @param {Object} options - Speech options to override defaults
   * @returns {Promise} - Resolves when speech completes
   */
  speak(text, options = {}) {
    if (!text) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const speechOptions = {
        text,
        voice: options.voice || this.voice,
        rate: options.rate !== undefined ? options.rate : this.rate,
        pitch: options.pitch !== undefined ? options.pitch : this.pitch,
        volume: options.volume !== undefined ? options.volume : this.volume,
        useElevenLabs: options.useElevenLabs !== undefined ? options.useElevenLabs : this.useElevenLabs,
        elevenLabsVoiceId: options.elevenLabsVoiceId || this.elevenLabsVoiceId,
        elevenLabsApiKey: options.elevenLabsApiKey || this.elevenLabsApiKey,
        onComplete: () => resolve(),
        onError: (error) => reject(error)
      };
      
      // Add to queue
      this.queue.push(speechOptions);
      
      // Process queue if not already speaking
      if (!this.isSpeaking) {
        this._processQueue();
      }
    });
  }
  
  /**
   * Stop all speech
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.queue = [];
    
    return this;
  }
  
  /**
   * Pause the current speech
   */
  pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      
      if (this.onSpeechPause) {
        this.onSpeechPause();
      }
    }
    
    return this;
  }
  
  /**
   * Resume the current speech
   */
  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      
      if (this.onSpeechResume) {
        this.onSpeechResume();
      }
    }
    
    return this;
  }
  
  /**
   * Get available voices
   * @returns {Array} - List of available voices
   */
  getVoices() {
    return this.availableVoices;
  }
  
  /**
   * Set the voice by name or by SpeechSynthesisVoice object
   * @param {string|Object} voice - Voice name or object
   */
  setVoice(voice) {
    if (!voice) {
      return this;
    }
    
    // If voice is a string, find matching voice
    if (typeof voice === 'string') {
      const foundVoice = this.availableVoices.find(v => 
        v.name.toLowerCase() === voice.toLowerCase()
      );
      
      if (foundVoice) {
        this.voice = foundVoice;
      } else {
        console.warn(`Voice "${voice}" not found`);
      }
    } else {
      // Assume voice is a SpeechSynthesisVoice object
      this.voice = voice;
    }
    
    return this;
  }
  
  /**
   * Set the speech rate
   * @param {number} rate - Speech rate (0.1 to 10)
   */
  setRate(rate) {
    if (rate !== undefined && rate >= 0.1 && rate <= 10) {
      this.rate = rate;
    }
    
    return this;
  }
  
  /**
   * Set the speech pitch
   * @param {number} pitch - Speech pitch (0 to 2)
   */
  setPitch(pitch) {
    if (pitch !== undefined && pitch >= 0 && pitch <= 2) {
      this.pitch = pitch;
    }
    
    return this;
  }
  
  /**
   * Set the speech volume
   * @param {number} volume - Speech volume (0 to 1)
   */
  setVolume(volume) {
    if (volume !== undefined && volume >= 0 && volume <= 1) {
      this.volume = volume;
    }
    
    return this;
  }
  
  /**
   * Enable or disable ElevenLabs TTS
   * @param {boolean} useElevenLabs - Whether to use ElevenLabs
   * @param {string} voiceId - ElevenLabs voice ID
   * @param {string} apiKey - ElevenLabs API key
   */
  setElevenLabs(useElevenLabs, voiceId = null, apiKey = null) {
    this.useElevenLabs = useElevenLabs;
    
    if (voiceId) {
      this.elevenLabsVoiceId = voiceId;
    }
    
    if (apiKey) {
      this.elevenLabsApiKey = apiKey;
    }
    
    return this;
  }
  
  // Private methods
  
  /**
   * Load available voices
   * @private
   */
  _loadVoices() {
    if (!this.synth) {
      return;
    }
    
    const voices = this.synth.getVoices();
    
    if (voices && voices.length > 0) {
      this.availableVoices = voices;
      
      // Set default voice if not already set
      if (!this.voice && this.availableVoices.length > 0) {
        // Try to find an English voice
        const englishVoice = this.availableVoices.find(voice => 
          voice.lang.toLowerCase().includes('en-')
        );
        
        this.voice = englishVoice || this.availableVoices[0];
      }
    }
  }
  
  /**
   * Handle voiceschanged event
   * @private
   */
  _onVoicesChanged() {
    this._loadVoices();
  }
  
  /**
   * Process the speech queue
   * @private
   */
  _processQueue() {
    if (this.queue.length === 0 || this.isSpeaking) {
      return;
    }
    
    const options = this.queue.shift();
    
    // Check if we should use ElevenLabs
    if (options.useElevenLabs && options.elevenLabsVoiceId && options.elevenLabsApiKey) {
      this._speakWithElevenLabs(options);
    } else {
      this._speakWithBrowser(options);
    }
  }
  
  /**
   * Speak using browser's SpeechSynthesis
   * @private
   * @param {Object} options - Speech options
   */
  _speakWithBrowser(options) {
    if (!this.synth) {
      console.error('Speech synthesis not supported');
      
      if (options.onError) {
        options.onError(new Error('Speech synthesis not supported'));
      }
      
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(options.text);
    
    utterance.voice = options.voice;
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;
    
    // Set up event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      
      if (this.onSpeechStart) {
        this.onSpeechStart(options);
      }
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      
      if (this.onSpeechEnd) {
        this.onSpeechEnd(options);
      }
      
      if (options.onComplete) {
        options.onComplete();
      }
      
      // Process next item in queue
      this._processQueue();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      
      this.isSpeaking = false;
      this.currentUtterance = null;
      
      if (this.onSpeechError) {
        this.onSpeechError(event);
      }
      
      if (options.onError) {
        options.onError(event);
      }
      
      // Process next item in queue
      this._processQueue();
    };
    
    // Save current utterance
    this.currentUtterance = utterance;
    
    // Speak
    this.synth.speak(utterance);
  }
  
  /**
   * Speak using ElevenLabs API
   * @private
   * @param {Object} options - Speech options
   */
  _speakWithElevenLabs(options) {
    this.isSpeaking = true;
    
    if (this.onSpeechStart) {
      this.onSpeechStart(options);
    }
    
    // Configure request
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${options.elevenLabsVoiceId}/stream`;
    
    const headers = {
      'Content-Type': 'application/json',
      'xi-api-key': options.elevenLabsApiKey
    };
    
    const data = {
      text: options.text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };
    
    // Call ElevenLabs API
    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const audio = new Audio(URL.createObjectURL(blob));
      
      audio.onended = () => {
        this.isSpeaking = false;
        
        if (this.onSpeechEnd) {
          this.onSpeechEnd(options);
        }
        
        if (options.onComplete) {
          options.onComplete();
        }
        
        // Process next item in queue
        this._processQueue();
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        
        this.isSpeaking = false;
        
        if (this.onSpeechError) {
          this.onSpeechError(error);
        }
        
        if (options.onError) {
          options.onError(error);
        }
        
        // Process next item in queue
        this._processQueue();
      };
      
      // Play audio
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        
        this.isSpeaking = false;
        
        if (this.onSpeechError) {
          this.onSpeechError(error);
        }
        
        if (options.onError) {
          options.onError(error);
        }
        
        // Process next item in queue
        this._processQueue();
      });
    })
    .catch(error => {
      console.error('ElevenLabs API error:', error);
      
      this.isSpeaking = false;
      
      if (this.onSpeechError) {
        this.onSpeechError(error);
      }
      
      if (options.onError) {
        options.onError(error);
      }
      
      // Process next item in queue
      this._processQueue();
    });
  }
}

// Export for use in modules
export { VoiceManager };
export default VoiceManager; 
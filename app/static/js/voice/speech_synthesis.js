// Speech Synthesis module with persona integration
class SpeechSynthesis {
  constructor() {
    this.synth = window.speechSynthesis;
    this.utteranceQueue = [];
    this.isProcessingQueue = false;
    this.currentUtterance = null;
    this.voiceMap = {};
    this.defaultVoice = null;
    this.elevenLabsSupport = false;
    this.elevenLabsApiKey = null;
    this.elevenLabsVoiceId = null;
    this.personaManager = null;
    
    // Default speech settings
    this.settings = {
      rate: 1.0,      // 0.1 to 10
      pitch: 1.0,     // 0 to 2
      volume: 1.0     // 0 to 1
    };
    
    // Flag to prevent multiple initializations
    this.initialized = false;
  }
  
  // Initialize the speech synthesis with options
  init(options = {}) {
    if (this.initialized) return this;
    
    console.log('Initializing Speech Synthesis');
    
    // Check for browser support
    if (!this.synth) {
      console.error('Speech synthesis not supported in this browser');
      return this;
    }
    
    // Apply options
    if (options.rate) this.settings.rate = options.rate;
    if (options.pitch) this.settings.pitch = options.pitch;
    if (options.volume) this.settings.volume = options.volume;
    
    // Set up ElevenLabs if provided
    if (options.elevenLabs) {
      this.elevenLabsSupport = true;
      this.elevenLabsApiKey = options.elevenLabs.apiKey || '';
      this.elevenLabsVoiceId = options.elevenLabs.voiceId || '';
    }
    
    // Link to persona manager if provided
    if (options.personaManager) {
      this.personaManager = options.personaManager;
    }
    
    // Load available voices
    this.loadVoices();
    
    // Set up voice change detection (for when voices load asynchronously)
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    
    // Set up event handlers
    window.addEventListener('beforeunload', () => this.cleanup());
    
    this.initialized = true;
    return this;
  }
  
  // Load available voices and categorize them
  loadVoices() {
    const voices = this.synth.getVoices();
    this.voiceMap = {};
    
    voices.forEach(voice => {
      // Create language category if it doesn't exist
      if (!this.voiceMap[voice.lang]) {
        this.voiceMap[voice.lang] = [];
      }
      this.voiceMap[voice.lang].push(voice);
      
      // Store voice by name for easy lookup
      this.voiceMap[voice.name] = voice;
    });
    
    // Set default voice (prefer en-US, en-GB, or any English voice)
    if (this.voiceMap['en-US'] && this.voiceMap['en-US'].length > 0) {
      this.defaultVoice = this.voiceMap['en-US'][0];
    } else if (this.voiceMap['en-GB'] && this.voiceMap['en-GB'].length > 0) {
      this.defaultVoice = this.voiceMap['en-GB'][0];
    } else {
      // Find any English voice
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      if (englishVoice) {
        this.defaultVoice = englishVoice;
      } else if (voices.length > 0) {
        // Fallback to any available voice
        this.defaultVoice = voices[0];
      }
    }
    
    console.log(`Loaded ${voices.length} voices. Default voice: ${this.defaultVoice?.name || 'None'}`);
    
    return voices;
  }
  
  // Apply persona-specific voice settings
  applyPersonaVoiceSettings(utterance) {
    if (!this.personaManager || !this.personaManager.hasActivePersona()) return;
    
    const persona = this.personaManager.getActivePersona();
    const traits = persona.traits || {};
    
    // Adjust speech rate based on persona traits
    if (traits.hasty || traits.urgent) {
      utterance.rate = this.settings.rate * 1.2;
    } else if (traits.thoughtful || traits.deliberate) {
      utterance.rate = this.settings.rate * 0.85;
    }
    
    // Adjust pitch based on persona traits
    if (traits.confident || traits.assertive) {
      utterance.pitch = this.settings.pitch * 1.1;
    } else if (traits.nervous || traits.uncertain) {
      utterance.pitch = this.settings.pitch * 0.9;
    }
    
    // Select appropriate voice if available
    if (traits.professional && this.voiceMap['en-GB']?.length > 0) {
      utterance.voice = this.voiceMap['en-GB'][0]; // Often more formal sounding
    } else if ((traits.friendly || traits.warm) && this.voiceMap['en-US']?.length > 0) {
      // Find a female voice for friendly personas (this is stereotypical but common in UX)
      const femaleVoice = this.voiceMap['en-US'].find(v => v.name.includes('female') || v.name.includes('irl'));
      if (femaleVoice) utterance.voice = femaleVoice;
    }
  }
  
  // Add disfluencies and speech patterns based on persona
  addPersonaDisfluencies(text) {
    if (!this.personaManager || !this.personaManager.hasActivePersona()) return text;
    
    const persona = this.personaManager.getActivePersona();
    const traits = persona.traits || {};
    
    let result = text;
    
    // Add hesitations for uncertain personas
    if (traits.uncertain || traits.nervous) {
      const sentences = result.split(/(?<=[.!?])\s+/);
      result = sentences.map(sentence => {
        // 30% chance to add a hesitation at the start of a sentence
        if (sentence.length > 3 && Math.random() < 0.3) {
          const hesitations = ['Um, ', 'Uh, ', 'Well, ', 'Hmm, '];
          return hesitations[Math.floor(Math.random() * hesitations.length)] + sentence;
        }
        return sentence;
      }).join(' ');
      
      // Add mid-sentence pauses with commas
      result = result.replace(/\b(and|but|because|so)\b/g, match => {
        return Math.random() < 0.4 ? `, ${match}` : match;
      });
    }
    
    // Add emphasis for confident personas
    if (traits.confident || traits.assertive) {
      const emphasisWords = ['definitely', 'absolutely', 'certainly', 'clearly'];
      emphasisWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, match => `<emphasis>${match}</emphasis>`);
      });
    }
    
    // Add interruptions for hasty personas
    if (traits.hasty && result.length > 100 && Math.random() < 0.3) {
      const cutPoint = Math.floor(result.length * 0.7);
      result = result.substring(0, cutPoint);
      
      // Add truncation marker
      if (result.endsWith('.')) {
        result = result.slice(0, -1);
      }
      result += '...';
    }
    
    return result;
  }
  
  // Speak the provided text
  speak(text, options = {}) {
    if (!this.initialized) this.init();
    
    // Don't attempt to speak empty text
    if (!text || text.trim() === '') return;
    
    // Apply persona personality if available
    if (this.personaManager) {
      text = this.personaManager.addPersonalityToResponse(text, options.messageType || 'general');
    }
    
    // Add disfluencies based on persona
    text = this.addPersonaDisfluencies(text);
    
    // Check if we should use ElevenLabs
    if (this.elevenLabsSupport && this.elevenLabsApiKey && this.elevenLabsVoiceId) {
      this.speakWithElevenLabs(text, options);
    } else {
      this.speakWithBrowserSynthesis(text, options);
    }
  }
  
  // Speak using the browser's built-in speech synthesis
  speakWithBrowserSynthesis(text, options = {}) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply basic settings
    utterance.rate = options.rate || this.settings.rate;
    utterance.pitch = options.pitch || this.settings.pitch;
    utterance.volume = options.volume || this.settings.volume;
    utterance.voice = options.voice || this.defaultVoice;
    
    // Apply persona-specific voice settings
    this.applyPersonaVoiceSettings(utterance);
    
    // Set up event handlers
    utterance.onstart = () => {
      console.log('Speech started');
      if (options.onStart) options.onStart();
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      if (options.onEnd) options.onEnd();
      this.currentUtterance = null;
      this.processQueue();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      if (options.onError) options.onError(event);
      this.currentUtterance = null;
      this.processQueue();
    };
    
    // Add to queue or speak immediately
    if (this.isProcessingQueue || this.currentUtterance) {
      this.utteranceQueue.push({ utterance, options });
    } else {
      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    }
  }
  
  // Speak using the ElevenLabs API
  speakWithElevenLabs(text, options = {}) {
    if (!this.elevenLabsApiKey || !this.elevenLabsVoiceId) {
      console.error('ElevenLabs API key or voice ID not set');
      return this.speakWithBrowserSynthesis(text, options);
    }
    
    const voiceId = options.elevenLabsVoiceId || this.elevenLabsVoiceId;
    
    // Set up the request to ElevenLabs API
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.elevenLabsApiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75
        }
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      return response.blob();
    })
    .then(audioBlob => {
      // Create audio element to play the response
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up event handlers
      audio.onplay = () => {
        console.log('ElevenLabs speech started');
        if (options.onStart) options.onStart();
      };
      
      audio.onended = () => {
        console.log('ElevenLabs speech ended');
        if (options.onEnd) options.onEnd();
        URL.revokeObjectURL(audioUrl);
        this.processQueue();
      };
      
      audio.onerror = (event) => {
        console.error('ElevenLabs speech error:', event);
        if (options.onError) options.onError(event);
        URL.revokeObjectURL(audioUrl);
        this.processQueue();
      };
      
      audio.play();
    })
    .catch(error => {
      console.error('Error with ElevenLabs TTS:', error);
      // Fallback to browser synthesis on failure
      this.speakWithBrowserSynthesis(text, options);
    });
  }
  
  // Process the next utterance in the queue
  processQueue() {
    if (this.utteranceQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    
    this.isProcessingQueue = true;
    const { utterance, options } = this.utteranceQueue.shift();
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
  
  // Stop speaking and clear the queue
  stop() {
    this.synth.cancel();
    this.utteranceQueue = [];
    this.currentUtterance = null;
    this.isProcessingQueue = false;
  }
  
  // Pause the current speech
  pause() {
    this.synth.pause();
  }
  
  // Resume paused speech
  resume() {
    this.synth.resume();
  }
  
  // Set voice by name
  setVoice(voiceName) {
    if (this.voiceMap[voiceName]) {
      this.defaultVoice = this.voiceMap[voiceName];
      return true;
    }
    return false;
  }
  
  // Set voice by language
  setVoiceByLang(langCode) {
    if (this.voiceMap[langCode] && this.voiceMap[langCode].length > 0) {
      this.defaultVoice = this.voiceMap[langCode][0];
      return true;
    }
    return false;
  }
  
  // Clean up resources
  cleanup() {
    this.stop();
    // Remove event listeners if needed
  }
  
  // Check if speech synthesis is supported
  isSupported() {
    return 'speechSynthesis' in window;
  }
  
  // Get all available voices
  getVoices() {
    return this.synth.getVoices();
  }
  
  // Get current settings
  getSettings() {
    return { ...this.settings };
  }
  
  // Update settings
  updateSettings(newSettings = {}) {
    Object.assign(this.settings, newSettings);
    return this.settings;
  }
}

export default SpeechSynthesis; 
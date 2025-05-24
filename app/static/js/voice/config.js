// Voice Interface Configuration
const Config = {
  // Debug settings
  debug: {
    enabled: true,         // Enable debug logging
    logLevel: 'info',      // Log level: 'error', 'warn', 'info', 'debug'
    showSpeechMetrics: true, // Show speech timing metrics
  },
  
  // Speech Recognition settings
  recognition: {
    language: 'en-US',     // Recognition language
    continuous: true,      // Continuous recognition mode
    interimResults: true,  // Show interim results
    maxAlternatives: 1,    // Number of alternative transcriptions
    autoRestart: true,     // Automatically restart recognition when it stops
    pauseDuringAI: false,  // Pause recognition when AI is speaking
    restartDelay: 300,     // Delay before restarting recognition (ms)
    minSpeechDuration: 250, // Minimum speech duration to process (ms)
    silenceThreshold: 1500, // Time of silence before processing transcript (ms)
    silenceDetection: {
      enabled: true,       // Enable silence detection
      timeout: 1500,       // Silence duration before considering speech complete (ms)
      minSpeechLength: 5   // Minimum text length to process after silence (characters)
    }
  },
  
  // Speech Synthesis settings
  synthesis: {
    voice: null,           // Default voice (null = browser default)
    rate: 1.0,             // Speech rate (0.1 to 10)
    pitch: 1.0,            // Speech pitch (0 to 2)
    volume: 1.0,           // Speech volume (0 to 1)
    useElevenLabs: false,  // Use ElevenLabs for synthesis
    elevenLabsApiKey: '',  // ElevenLabs API key
    elevenLabsVoiceId: '', // ElevenLabs voice ID
    useSentenceSplitting: true, // Split responses into sentences for more natural delivery
    maxTextLength: 1000,   // Maximum text length for a single utterance
  },
  
  // UI settings
  ui: {
    showTranscript: true,  // Show transcript in the UI
    showStatus: true,      // Show status messages
    darkMode: false,       // Use dark mode
    orbAnimation: true,    // Animate the orb during voice activity
    notifications: {
      enabled: true,       // Enable notifications
      duration: 3000,      // Notification duration (ms)
    }
  },
  
  // Persona settings
  persona: {
    enabled: false,        // Enable persona features
    defaultPersona: null,  // Default persona to use
  },
  
  // Storage settings
  storage: {
    saveTranscripts: true, // Save transcripts to local storage
    saveSettings: true,    // Save settings to local storage
  },
  
  // Load settings from storage
  loadSettings() {
    if (!this.storage.saveSettings) return;
    
    try {
      const savedSettings = localStorage.getItem('voiceInterfaceSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Apply saved settings
        this.debug.enabled = settings.debug?.enabled ?? this.debug.enabled;
        this.debug.logLevel = settings.debug?.logLevel ?? this.debug.logLevel;
        
        this.recognition.language = settings.recognition?.language ?? this.recognition.language;
        this.recognition.continuous = settings.recognition?.continuous ?? this.recognition.continuous;
        this.recognition.autoRestart = settings.recognition?.autoRestart ?? this.recognition.autoRestart;
        this.recognition.pauseDuringAI = settings.recognition?.pauseDuringAI ?? this.recognition.pauseDuringAI;
        
        this.synthesis.rate = settings.synthesis?.rate ?? this.synthesis.rate;
        this.synthesis.pitch = settings.synthesis?.pitch ?? this.synthesis.pitch;
        this.synthesis.volume = settings.synthesis?.volume ?? this.synthesis.volume;
        this.synthesis.useElevenLabs = settings.synthesis?.useElevenLabs ?? this.synthesis.useElevenLabs;
        this.synthesis.elevenLabsApiKey = settings.synthesis?.elevenLabsApiKey ?? this.synthesis.elevenLabsApiKey;
        this.synthesis.elevenLabsVoiceId = settings.synthesis?.elevenLabsVoiceId ?? this.synthesis.elevenLabsVoiceId;
        
        this.ui.showTranscript = settings.ui?.showTranscript ?? this.ui.showTranscript;
        this.ui.showStatus = settings.ui?.showStatus ?? this.ui.showStatus;
        this.ui.darkMode = settings.ui?.darkMode ?? this.ui.darkMode;
        this.ui.orbAnimation = settings.ui?.orbAnimation ?? this.ui.orbAnimation;
        
        this.persona.enabled = settings.persona?.enabled ?? this.persona.enabled;
        this.persona.defaultPersona = settings.persona?.defaultPersona ?? this.persona.defaultPersona;
      }
    } catch (error) {
      console.error('Error loading voice interface settings:', error);
    }
  },
  
  // Save settings to storage
  saveSettings() {
    if (!this.storage.saveSettings) return;
    
    try {
      const settings = {
        debug: {
          enabled: this.debug.enabled,
          logLevel: this.debug.logLevel,
        },
        recognition: {
          language: this.recognition.language,
          continuous: this.recognition.continuous,
          autoRestart: this.recognition.autoRestart,
          pauseDuringAI: this.recognition.pauseDuringAI,
        },
        synthesis: {
          rate: this.synthesis.rate,
          pitch: this.synthesis.pitch,
          volume: this.synthesis.volume,
          useElevenLabs: this.synthesis.useElevenLabs,
          elevenLabsApiKey: this.synthesis.elevenLabsApiKey,
          elevenLabsVoiceId: this.synthesis.elevenLabsVoiceId,
        },
        ui: {
          showTranscript: this.ui.showTranscript,
          showStatus: this.ui.showStatus,
          darkMode: this.ui.darkMode,
          orbAnimation: this.ui.orbAnimation,
        },
        persona: {
          enabled: this.persona.enabled,
          defaultPersona: this.persona.defaultPersona,
        },
      };
      
      localStorage.setItem('voiceInterfaceSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving voice interface settings:', error);
    }
  },
  
  // Initialize configuration
  init() {
    // Load settings from storage
    this.loadSettings();
    
    // Set up event listeners for settings changes
    window.addEventListener('voiceSettingsChanged', () => {
      this.saveSettings();
    });
    
    return this;
  }
};

// Initialize and export
export default Config.init(); 
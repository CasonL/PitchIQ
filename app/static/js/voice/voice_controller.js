// Voice Controller - Main integration module for voice features
import SpeechRecognition from './speech_recognition.js';
import SpeechSynthesis from './speech_synthesis.js';
import PersonaManager from './persona.js';

class VoiceController {
  constructor(options = {}) {
    this.options = {
      usePersonas: true,
      continuousListening: true,
      elevenLabsSupport: false,
      ...options
    };
    
    this.speechRecognition = null;
    this.speechSynthesis = null;
    this.personaManager = null;
    
    this.isListening = false;
    this.isSpeaking = false;
    this.lastUserMessage = '';
    this.textResponseCallback = null;
    
    // UI elements
    this.elements = {
      micButton: null,
      voiceStatusIndicator: null,
      transcriptDisplay: null
    };
    
    // State flags
    this.initialized = false;
    this.interrupted = false;
  }
  
  // Initialize all voice-related modules
  async init() {
    if (this.initialized) return this;
    
    console.log('Initializing Voice Controller');
    
    // Initialize Persona system if enabled
    if (this.options.usePersonas) {
      this.personaManager = new PersonaManager();
      await this.personaManager.init();
    }
    
    // Initialize Speech Synthesis
    this.speechSynthesis = new SpeechSynthesis();
    this.speechSynthesis.init({
      rate: this.options.speechRate || 1.0,
      pitch: this.options.speechPitch || 1.0,
      volume: this.options.speechVolume || 1.0,
      personaManager: this.personaManager,
      elevenLabs: this.options.elevenLabsSupport ? {
        apiKey: this.options.elevenLabsApiKey || '',
        voiceId: this.options.elevenLabsVoiceId || ''
      } : null
    });
    
    // Initialize Speech Recognition
    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.init({
      continuous: this.options.continuousListening,
      interimResults: true,
      language: this.options.language || 'en-US',
      maxAlternatives: 1
    });
    
    // Set up event handlers
    this.setupEventListeners();
    
    // Set up UI elements
    this.setupUI();
    
    this.initialized = true;
    return this;
  }
  
  // Set up event listeners for speech recognition and synthesis
  setupEventListeners() {
    // Connect speech recognition events
    this.speechRecognition.on('start', () => {
      this.isListening = true;
      this.updateUIState();
      console.log('Voice recognition started');
    });
    
    this.speechRecognition.on('end', () => {
      this.isListening = false;
      this.updateUIState();
      console.log('Voice recognition ended');
      
      // Auto-restart if continuous listening is enabled
      if (this.options.continuousListening && !this.isSpeaking && !this.interrupted) {
        setTimeout(() => this.startListening(), 100);
      }
    });
    
    this.speechRecognition.on('result', (transcript, isFinal) => {
      if (isFinal) {
        this.lastUserMessage = transcript;
        this.updateTranscriptDisplay(transcript);
        
        // If AI is speaking, treat this as an interruption
        if (this.isSpeaking) {
          this.handleInterruption(transcript);
        } else {
          this.handleUserMessage(transcript);
        }
      } else {
        // Show interim results
        this.updateTranscriptDisplay(transcript, false);
      }
    });
    
    this.speechRecognition.on('error', (error) => {
      console.error('Speech recognition error:', error);
      this.isListening = false;
      this.updateUIState();
      
      // Try to restart after error
      if (this.options.continuousListening && !this.interrupted) {
        setTimeout(() => this.startListening(), 1000);
      }
    });
  }
  
  // Set up UI elements
  setupUI() {
    // Create or find mic button
    const micButton = document.getElementById('voice-mic-button') || this.createMicButton();
    this.elements.micButton = micButton;
    
    // Create status indicator
    const statusIndicator = document.getElementById('voice-status-indicator') || this.createStatusIndicator();
    this.elements.voiceStatusIndicator = statusIndicator;
    
    // Create transcript display
    const transcriptDisplay = document.getElementById('voice-transcript-display') || this.createTranscriptDisplay();
    this.elements.transcriptDisplay = transcriptDisplay;
    
    // Set up click handlers
    this.elements.micButton.addEventListener('click', () => this.toggleListening());
    
    // Initial UI state
    this.updateUIState();
  }
  
  // Create a microphone button if it doesn't exist
  createMicButton() {
    const button = document.createElement('button');
    button.id = 'voice-mic-button';
    button.className = 'voice-mic-button';
    button.innerHTML = '<i class="fas fa-microphone"></i>';
    button.title = 'Start/Stop Voice Input';
    
    // Style the button
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    document.body.appendChild(button);
    return button;
  }
  
  // Create status indicator
  createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'voice-status-indicator';
    indicator.className = 'voice-status-indicator';
    
    // Style the indicator
    Object.assign(indicator.style, {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      padding: '5px 10px',
      borderRadius: '15px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      fontSize: '12px',
      zIndex: '1000',
      display: 'none'
    });
    
    document.body.appendChild(indicator);
    return indicator;
  }
  
  // Create transcript display
  createTranscriptDisplay() {
    const display = document.createElement('div');
    display.id = 'voice-transcript-display';
    display.className = 'voice-transcript-display';
    
    // Style the display
    Object.assign(display.style, {
      position: 'fixed',
      bottom: '100px',
      right: '20px',
      maxWidth: '300px',
      padding: '10px',
      borderRadius: '5px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      fontSize: '14px',
      zIndex: '1000',
      display: 'none',
      maxHeight: '200px',
      overflowY: 'auto'
    });
    
    document.body.appendChild(display);
    return display;
  }
  
  // Update UI elements based on current state
  updateUIState() {
    // Update mic button
    if (this.elements.micButton) {
      if (this.isListening) {
        this.elements.micButton.style.backgroundColor = '#dc3545'; // Red while recording
        this.elements.micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        this.elements.micButton.title = 'Stop Voice Input';
      } else {
        this.elements.micButton.style.backgroundColor = '#007bff'; // Blue when idle
        this.elements.micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        this.elements.micButton.title = 'Start Voice Input';
      }
    }
    
    // Update status indicator
    if (this.elements.voiceStatusIndicator) {
      if (this.isListening && this.isSpeaking) {
        this.elements.voiceStatusIndicator.textContent = 'AI Speaking (Listening for interruptions)';
        this.elements.voiceStatusIndicator.style.display = 'block';
        this.elements.voiceStatusIndicator.style.backgroundColor = 'rgba(220,53,69,0.7)'; // Red
      } else if (this.isListening) {
        this.elements.voiceStatusIndicator.textContent = 'Listening...';
        this.elements.voiceStatusIndicator.style.display = 'block';
        this.elements.voiceStatusIndicator.style.backgroundColor = 'rgba(40,167,69,0.7)'; // Green
      } else if (this.isSpeaking) {
        this.elements.voiceStatusIndicator.textContent = 'AI Speaking';
        this.elements.voiceStatusIndicator.style.display = 'block'; 
        this.elements.voiceStatusIndicator.style.backgroundColor = 'rgba(0,123,255,0.7)'; // Blue
      } else {
        this.elements.voiceStatusIndicator.style.display = 'none';
      }
    }
  }
  
  // Update transcript display
  updateTranscriptDisplay(transcript, isFinal = true) {
    if (!this.elements.transcriptDisplay) return;
    
    if (transcript && transcript.trim() !== '') {
      this.elements.transcriptDisplay.textContent = transcript;
      this.elements.transcriptDisplay.style.display = 'block';
      
      // Style for final vs interim results
      if (isFinal) {
        this.elements.transcriptDisplay.style.opacity = '1';
      } else {
        this.elements.transcriptDisplay.style.opacity = '0.7';
      }
      
      // Hide transcript after a delay if final
      if (isFinal) {
        setTimeout(() => {
          this.elements.transcriptDisplay.style.display = 'none';
        }, 5000);
      }
    } else {
      this.elements.transcriptDisplay.style.display = 'none';
    }
  }
  
  // Toggle listening state
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }
  
  // Start listening for user speech
  startListening() {
    if (!this.initialized) {
      this.init().then(() => this.speechRecognition.start());
    } else {
      this.speechRecognition.start();
    }
    this.interrupted = false;
  }
  
  // Stop listening for user speech
  stopListening() {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
      this.interrupted = true;
    }
  }
  
  // Handle user message
  handleUserMessage(message) {
    console.log('Processing user message:', message);
    
    // Call the provided callback if available
    if (this.textResponseCallback) {
      this.textResponseCallback(message);
    }
    
    // Placeholder for AI response
    // In a real implementation, this would call your backend API
    this.getAIResponse(message).then(response => {
      this.speakResponse(response);
    });
  }
  
  // Handle interruption by user
  handleInterruption(interruptionText) {
    console.log('User interrupted with:', interruptionText);
    
    // Stop current speech
    this.speechSynthesis.stop();
    this.isSpeaking = false;
    
    // Process the interruption as a new message
    if (interruptionText && interruptionText.trim() !== '') {
      this.handleUserMessage(interruptionText);
    }
  }
  
  // Get AI response (placeholder - should be replaced with actual implementation)
  async getAIResponse(userMessage) {
    // In a real implementation, this would call your backend API
    // This is just a placeholder
    console.log('Getting AI response for:', userMessage);
    
    // Add a short delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return placeholder response
    return `I received your message: "${userMessage}". This is a placeholder response.`;
  }
  
  // Set callback for text responses
  setTextResponseCallback(callback) {
    if (typeof callback === 'function') {
      this.textResponseCallback = callback;
    }
  }
  
  // Speak AI response with appropriate persona traits
  speakResponse(text, options = {}) {
    if (!text || text.trim() === '') return;
    
    this.isSpeaking = true;
    this.updateUIState();
    
    // Set up speech options
    const speechOptions = {
      onStart: () => {
        console.log('AI started speaking');
      },
      onEnd: () => {
        console.log('AI finished speaking');
        this.isSpeaking = false;
        this.updateUIState();
      },
      onError: (error) => {
        console.error('Speech synthesis error:', error);
        this.isSpeaking = false;
        this.updateUIState();
      },
      messageType: options.messageType || 'general',
      ...options
    };
    
    // Speak the response
    this.speechSynthesis.speak(text, speechOptions);
  }
  
  // Set active persona by type
  setPersona(personaType) {
    if (this.personaManager) {
      return this.personaManager.setPersona(personaType);
    }
    return false;
  }
  
  // Generate a random persona
  generateRandomPersona() {
    if (this.personaManager) {
      return this.personaManager.generateUniquePersona();
    }
    return null;
  }
  
  // Clear active persona
  clearPersona() {
    if (this.personaManager) {
      this.personaManager.clearPersona();
      return true;
    }
    return false;
  }
  
  // Get active persona info
  getActivePersona() {
    if (this.personaManager) {
      return this.personaManager.getActivePersona();
    }
    return null;
  }
  
  // Check if any persona is active
  hasActivePersona() {
    if (this.personaManager) {
      return this.personaManager.hasActivePersona();
    }
    return false;
  }
  
  // Update speech synthesis settings
  updateSpeechSettings(settings = {}) {
    if (this.speechSynthesis) {
      return this.speechSynthesis.updateSettings(settings);
    }
    return null;
  }
  
  // Clean up resources
  cleanup() {
    if (this.speechRecognition) {
      this.speechRecognition.cleanup();
    }
    
    if (this.speechSynthesis) {
      this.speechSynthesis.cleanup();
    }
    
    // Remove UI elements if created by this controller
    if (this.elements.micButton && this.elements.micButton.parentNode) {
      this.elements.micButton.parentNode.removeChild(this.elements.micButton);
    }
    
    if (this.elements.voiceStatusIndicator && this.elements.voiceStatusIndicator.parentNode) {
      this.elements.voiceStatusIndicator.parentNode.removeChild(this.elements.voiceStatusIndicator);
    }
    
    if (this.elements.transcriptDisplay && this.elements.transcriptDisplay.parentNode) {
      this.elements.transcriptDisplay.parentNode.removeChild(this.elements.transcriptDisplay);
    }
  }
}

export default VoiceController; 
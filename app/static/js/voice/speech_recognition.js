// Speech Recognition module
class SpeechRecognition {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.accumulatedTranscript = '';
    this.lastResultTimestamp = 0;
    this.interimResult = '';
    this.config = {
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      lang: 'en-US',
      onResult: null,
      onStart: null,
      onEnd: null,
      onError: null
    };
  }

  // Initialize speech recognition
  async init(options = {}) {
    console.log('Initializing Speech Recognition');
    
    // Merge options with defaults
    this.config = { ...this.config, ...options };
    
    // Check browser support
    if (!this.checkBrowserSupport()) {
      console.error('Speech recognition not supported in this browser');
      return this;
    }
    
    // Create and configure recognition instance
    this.setupRecognition();
    
    return this;
  }
  
  // Check browser support for speech recognition
  checkBrowserSupport() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognitionAPI;
  }
  
  // Set up the recognition instance
  setupRecognition() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) return;
    
    this.recognition = new SpeechRecognitionAPI();
    
    // Configure recognition
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.config.lang;
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  // Set up event handlers for recognition
  setupEventHandlers() {
    if (!this.recognition) return;
    
    // Handle start of recognition
    this.recognition.onstart = () => {
      this.isListening = true;
      this.accumulatedTranscript = '';
      this.interimResult = '';
      console.log('Speech recognition started');
      
      if (typeof this.config.onStart === 'function') {
        this.config.onStart();
      }
    };
    
    // Handle recognition results
    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };
    
    // Handle end of recognition
    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Speech recognition ended');
      
      // Send any final accumulated transcript
      if (this.accumulatedTranscript.trim() !== '') {
        this.sendAccumulatedTranscript();
      }
      
      if (typeof this.config.onEnd === 'function') {
        this.config.onEnd();
      }
    };
    
    // Handle recognition errors
    this.recognition.onerror = (event) => {
      this.handleRecognitionError(event);
    };
  }
  
  // Handle recognition results
  handleRecognitionResult(event) {
    // Get current transcript
    const resultIndex = event.resultIndex;
    const transcript = event.results[resultIndex][0].transcript;
    const isFinal = event.results[resultIndex].isFinal;
    
    const now = Date.now();
    this.lastResultTimestamp = now;
    
    if (isFinal) {
      // Add to accumulated transcript with a space
      if (this.accumulatedTranscript && !this.accumulatedTranscript.endsWith(' ')) {
        this.accumulatedTranscript += ' ';
      }
      this.accumulatedTranscript += transcript;
      this.interimResult = '';
      
      // Check if we should send the accumulated transcript
      this.checkSendAccumulatedTranscript();
    } else {
      // Update interim result
      this.interimResult = transcript;
      
      // Display interim results in UI
      this.updateTranscriptUI(this.accumulatedTranscript + ' ' + this.interimResult);
    }
  }
  
  // Check if accumulated transcript should be sent
  checkSendAccumulatedTranscript() {
    // Send if it contains a complete sentence or question
    if (
      this.accumulatedTranscript.endsWith('.') || 
      this.accumulatedTranscript.endsWith('?') || 
      this.accumulatedTranscript.endsWith('!')
    ) {
      this.sendAccumulatedTranscript();
      return;
    }
    
    // Send if it's a substantial chunk of text
    if (this.accumulatedTranscript.split(' ').length > 10) {
      this.sendAccumulatedTranscript();
      return;
    }
    
    // Update UI with current accumulated transcript
    this.updateTranscriptUI(this.accumulatedTranscript);
  }
  
  // Send accumulated transcript to callback
  sendAccumulatedTranscript() {
    if (!this.accumulatedTranscript.trim()) return;
    
    if (typeof this.config.onResult === 'function') {
      this.config.onResult(this.accumulatedTranscript.trim());
    }
    
    // Clear the accumulated transcript
    this.accumulatedTranscript = '';
  }
  
  // Update transcript UI
  updateTranscriptUI(text) {
    // Find or create transcript display element
    let transcriptDisplay = document.getElementById('voice-transcript-display');
    
    if (!transcriptDisplay) {
      transcriptDisplay = document.createElement('div');
      transcriptDisplay.id = 'voice-transcript-display';
      transcriptDisplay.className = 'voice-transcript-display';
      document.body.appendChild(transcriptDisplay);
    }
    
    transcriptDisplay.textContent = text || '';
    
    // Show only when there's text, hide after 5 seconds of no new input
    if (text) {
      transcriptDisplay.style.display = 'block';
      
      clearTimeout(this.transcriptTimeout);
      this.transcriptTimeout = setTimeout(() => {
        transcriptDisplay.style.display = 'none';
      }, 5000);
    } else {
      transcriptDisplay.style.display = 'none';
    }
  }
  
  // Handle recognition errors
  handleRecognitionError(event) {
    console.error('Speech recognition error:', event.error);
    
    let errorMessage = '';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech was detected.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition was aborted.';
        break;
      case 'audio-capture':
        errorMessage = 'Audio capture failed.';
        break;
      case 'network':
        errorMessage = 'Network error occurred.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access was denied.';
        break;
      case 'service-not-allowed':
        errorMessage = 'Speech recognition service not allowed.';
        break;
      default:
        errorMessage = `Error: ${event.error}`;
    }
    
    if (typeof this.config.onError === 'function') {
      this.config.onError(errorMessage, event.error);
    }
  }
  
  // Start recognition
  start() {
    if (!this.recognition || this.isListening) return;
    
    try {
      this.recognition.start();
      console.log('Starting speech recognition');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }
  
  // Stop recognition
  stop() {
    if (!this.recognition || !this.isListening) return;
    
    try {
      this.recognition.stop();
      console.log('Stopping speech recognition');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
  
  // Abort recognition (forceful stop)
  abort() {
    if (!this.recognition) return;
    
    try {
      this.recognition.abort();
      console.log('Aborting speech recognition');
    } catch (error) {
      console.error('Error aborting speech recognition:', error);
    }
  }
  
  // Clean up resources
  dispose() {
    this.stop();
    
    if (this.transcriptTimeout) {
      clearTimeout(this.transcriptTimeout);
    }
    
    const transcriptDisplay = document.getElementById('voice-transcript-display');
    if (transcriptDisplay) {
      transcriptDisplay.remove();
    }
    
    this.recognition = null;
    console.log('Speech recognition disposed');
  }
}

export default SpeechRecognition; 
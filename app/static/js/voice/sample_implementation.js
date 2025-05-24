/**
 * sample_implementation.js
 * Example implementation showing how to use the modular voice system
 */

import PersonaSpeechManager from './persona_speech_manager.js';
import VoiceDatabase from './voice_database.js';

// Sample legendary voices (pre-mapped persona types to voice IDs)
const LEGENDARY_VOICES = {
  'sales_coach': 'your-elevenlabs-voice-id-for-coach',
  'customer': 'your-elevenlabs-voice-id-for-customer',
  'technical_expert': 'your-elevenlabs-voice-id-for-expert'
};

// Sample persona attributes
const PERSONA_ATTRIBUTES = {
  'sales_coach': {
    gender: 'female',
    age: 'adult',
    accent: 'american',
    ethnicity: 'any',
    stability: 0.6,
    similarity_boost: 0.8,
    style: 0.3,
    use_speaker_boost: true
  },
  'customer': {
    gender: 'male',
    age: 'adult',
    accent: 'british',
    ethnicity: 'any',
    stability: 0.4,    // Less stability allows more emotion in voice
    similarity_boost: 0.7,
    style: 0.2,
    use_speaker_boost: true
  },
  'technical_expert': {
    gender: 'male',
    age: 'adult',
    accent: 'american',
    ethnicity: 'any',
    stability: 0.8,    // Higher stability for more consistent delivery
    similarity_boost: 0.7,
    style: 0.1,
    use_speaker_boost: true
  }
};

class SalesTrainingApp {
  constructor() {
    // Initialize core components
    this.voiceDb = new VoiceDatabase();
    this.speechManager = null;
    
    // UI elements
    this.recordButton = document.getElementById('record-button');
    this.stopButton = document.getElementById('stop-button');
    this.personaSelector = document.getElementById('persona-selector');
    this.transcriptElement = document.getElementById('transcript');
    this.statusElement = document.getElementById('status');
    
    // State
    this.currentPersona = 'sales_coach';
    this.aiModel = null;  // Your AI model integration
    
    // Bind methods
    this.handleRecordClick = this.handleRecordClick.bind(this);
    this.handleStopClick = this.handleStopClick.bind(this);
    this.handlePersonaChange = this.handlePersonaChange.bind(this);
    this.handleTranscriptUpdate = this.handleTranscriptUpdate.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.handleError = this.handleError.bind(this);
  }
  
  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('Initializing Sales Training App');
      
      // Set up event listeners
      this.recordButton.addEventListener('click', this.handleRecordClick);
      this.stopButton.addEventListener('click', this.handleStopClick);
      this.personaSelector.addEventListener('change', this.handlePersonaChange);
      
      // Add personas to selector
      Object.keys(PERSONA_ATTRIBUTES).forEach(personaType => {
        const option = document.createElement('option');
        option.value = personaType;
        option.textContent = personaType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        this.personaSelector.appendChild(option);
      });
      
      // Initialize speech manager
      this.speechManager = new PersonaSpeechManager({
        elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
        voiceDb: this.voiceDb,
        legendaryVoices: LEGENDARY_VOICES,
        personaAttributes: PERSONA_ATTRIBUTES,
        onError: this.handleError,
        onTranscriptUpdate: this.handleTranscriptUpdate,
        onStateChange: this.handleStateChange,
        defaultPersona: this.currentPersona
      });
      
      await this.speechManager.initialize();
      
      // Update UI
      this.updateStatus('Ready');
      this.personaSelector.value = this.currentPersona;
      
      console.log('Sales Training App initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
      this.updateStatus('Error initializing app');
    }
  }
  
  /**
   * Handle record button click
   */
  async handleRecordClick() {
    try {
      this.updateStatus('Listening...');
      this.recordButton.disabled = true;
      this.stopButton.disabled = false;
      
      await this.speechManager.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateStatus('Error starting recording');
      this.recordButton.disabled = false;
      this.stopButton.disabled = true;
    }
  }
  
  /**
   * Handle stop button click
   */
  async handleStopClick() {
    try {
      this.updateStatus('Processing...');
      this.stopButton.disabled = true;
      
      // Stop recording and get transcript
      const transcript = await this.speechManager.stopRecording();
      
      if (transcript && transcript.trim() !== '') {
        // Process through AI model
        const aiResponse = await this.processWithAI(transcript);
        
        // Generate speech from AI response
        const audioBlob = await this.speechManager.processSpeech(aiResponse);
        
        if (audioBlob) {
          // Play audio response
          await this.speechManager.playAudio(audioBlob);
        } else {
          this.updateStatus('Failed to generate speech');
        }
      } else {
        this.updateStatus('No speech detected');
      }
      
      this.recordButton.disabled = false;
      this.updateStatus('Ready');
    } catch (error) {
      console.error('Error processing speech:', error);
      this.updateStatus('Error processing speech');
      this.recordButton.disabled = false;
    }
  }
  
  /**
   * Handle persona selection change
   * @param {Event} event - Change event
   */
  async handlePersonaChange(event) {
    const personaType = event.target.value;
    
    try {
      this.updateStatus(`Changing to ${personaType}...`);
      
      await this.speechManager.changePersona(personaType);
      this.currentPersona = personaType;
      
      this.updateStatus('Ready');
    } catch (error) {
      console.error('Error changing persona:', error);
      this.updateStatus('Error changing persona');
    }
  }
  
  /**
   * Handle transcript updates
   * @param {string} transcript - Current transcript
   * @param {boolean} isFinal - Whether the transcript is final
   */
  handleTranscriptUpdate(transcript, isFinal) {
    if (transcript) {
      this.transcriptElement.textContent = transcript;
      
      if (isFinal) {
        console.log('Final transcript:', transcript);
      }
    }
  }
  
  /**
   * Handle state changes
   * @param {string} key - State key
   * @param {*} value - State value
   */
  handleStateChange(key, value) {
    console.log(`State change: ${key} = ${value}`);
    
    // Update UI based on state changes
    switch (key) {
      case 'recording':
        if (value) {
          this.updateStatus('Listening...');
          this.recordButton.disabled = true;
          this.stopButton.disabled = false;
        } else {
          this.stopButton.disabled = true;
        }
        break;
        
      case 'processing':
        if (value) {
          this.updateStatus('Processing...');
        }
        break;
        
      case 'playing':
        if (value) {
          this.updateStatus('Speaking...');
        } else {
          this.updateStatus('Ready');
          this.recordButton.disabled = false;
        }
        break;
    }
  }
  
  /**
   * Process user input with AI model
   * @param {string} userInput - User input text
   * @returns {Promise<string>} AI response
   */
  async processWithAI(userInput) {
    try {
      // This is a placeholder for your AI model integration
      // Replace with your actual AI processing logic
      
      console.log('Processing with AI:', userInput);
      
      // For demo purposes, just echo with a prefix
      // In a real app, you would send to your AI model
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = `As a ${this.currentPersona.replace('_', ' ')}, I understand you said: ${userInput}. Let me help you with that.`;
      
      // Add some natural speech patterns based on persona
      return this.addNaturalSpeechPatterns(aiResponse, this.currentPersona);
    } catch (error) {
      console.error('Error processing with AI:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }
  
  /**
   * Add natural speech patterns to text based on persona
   * @param {string} text - Original text
   * @param {string} personaType - Type of persona
   * @returns {string} - Enhanced text with natural speech patterns
   */
  addNaturalSpeechPatterns(text, personaType) {
    // Different personas have different speech patterns
    switch (personaType) {
      case 'sales_coach':
        // Sales coach: Confident, deliberate, encouraging
        return text
          .replace(/\. /g, '. [PAUSE 500] ')
          .replace(/^/, 'Hmm, [PAUSE 400] ')
          .replace(/ I /g, ' I [PAUSE 200] ')
          .replace(/help you/g, 'help you [PAUSE 300]');
          
      case 'customer':
        // Customer: More casual, hesitant
        return text
          .replace(/\. /g, '. [PAUSE 600] ')
          .replace(/^/, 'Um, [PAUSE 300] ')
          .replace(/ I /g, ' I, uh, [PAUSE 200] ')
          .replace(/with that/g, 'with that, I guess');
          
      case 'technical_expert':
        // Technical expert: Precise, knowledgeable
        return text
          .replace(/\. /g, '. [PAUSE 400] ')
          .replace(/^/, 'Well, [PAUSE 300] technically speaking, ')
          .replace(/help you/g, 'provide assistance');
          
      default:
        return text;
    }
  }
  
  /**
   * Handle errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('App error:', error);
    this.updateStatus(`Error: ${error.message}`);
  }
  
  /**
   * Update status display
   * @param {string} status - Status message
   */
  updateStatus(status) {
    this.statusElement.textContent = status;
    console.log('Status:', status);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new SalesTrainingApp();
  app.initialize();
});

export default SalesTrainingApp; 
/**
 * Voice Interface Migration Shim
 * 
 * This file provides backward compatibility with the old voice_interface.js module
 * while delegating to the new modular components.
 */

// Import modular components
import SpeechRecognition from './voice/speech_recognition.js';
import SpeechSynthesis from './voice/speech_synthesis.js';
import PersonaManager from './voice/persona.js';
import UI from './voice/ui.js';
import ThinkingMode from './voice/thinking_mode.js';
import State from './voice/state.js';

// Global state for the voice interface
const state = State;

// Initialize components
let initialized = false;
let speechRecognition = null;
let speechSynthesis = null;
let personaManager = null;
let thinkingMode = null;

/**
 * Initialize the voice interface
 */
export function initialize() {
  if (initialized) return;
  
  // Initialize UI
  UI.init();
  
  // Initialize components
  speechRecognition = SpeechRecognition;
  speechRecognition.init({
    onResult: handleRecognitionResult,
    onEnd: handleRecognitionEnd,
    onError: handleRecognitionError
  });
  
  speechSynthesis = SpeechSynthesis;
  speechSynthesis.init({
    onStart: handleSpeechStart,
    onEnd: handleSpeechEnd,
    onError: handleSpeechError
  });
  
  personaManager = PersonaManager;
  personaManager.init();
  
  thinkingMode = ThinkingMode;
  thinkingMode.init();
  
  // Set up keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Set up event listeners
  setupEventListeners();
  
  initialized = true;
  
  // Log initialization
  console.log('Voice interface initialized (migration shim)');
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Space key to toggle voice recognition when Ctrl is pressed
    if (event.code === 'Space' && event.ctrlKey) {
      event.preventDefault();
      toggleSpeechRecognition();
    }
    
    // Escape key to stop speech synthesis
    if (event.code === 'Escape') {
      if (state.isSpeaking) {
        speechSynthesis.stop();
      }
      
      if (state.isThinking) {
        thinkingMode.exit();
      }
    }
    
    // T key to toggle thinking mode when Ctrl is pressed
    if (event.code === 'KeyT' && event.ctrlKey) {
      event.preventDefault();
      thinkingMode.toggle();
    }
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Listen for voice toggle events
  document.addEventListener('voiceToggle', () => {
    toggleSpeechRecognition();
  });
  
  // Update UI when state changes
  state.subscribe((newState) => {
    UI.updateOrbState(newState);
    
    if (newState.isListening) {
      UI.updateStatus('Listening...');
    } else if (newState.isSpeaking) {
      UI.updateStatus('Speaking...');
    } else if (newState.isThinking) {
      UI.updateStatus('Thinking mode...');
    } else {
      UI.updateStatus('Ready');
    }
  });
}

/**
 * Toggle speech recognition on/off
 */
export function toggleSpeechRecognition() {
  if (!initialized) {
    initialize();
  }
  
  if (state.isListening) {
    speechRecognition.stop();
    UI.showNotification('Voice recognition stopped');
  } else {
    // If thinking mode is active, exit it
    if (state.isThinking) {
      thinkingMode.exit();
    }
    
    // If AI is speaking, stop it
    if (state.isSpeaking) {
      speechSynthesis.stop();
    }
    
    speechRecognition.start();
    UI.showNotification('Voice recognition started');
  }
}

/**
 * Handle speech recognition result
 * @param {string} transcript The transcript text
 * @param {boolean} isFinal Whether this is a final result
 */
function handleRecognitionResult(transcript, isFinal) {
  // Update transcript display
  UI.updateTranscript(transcript, isFinal);
  
  // If in thinking mode, handle input differently
  if (state.isThinking) {
    thinkingMode.handleInput(transcript, isFinal);
    return;
  }
  
  // If this is a final result, send the message
  if (isFinal && transcript.trim() !== '') {
    sendUserMessage(transcript);
  }
}

/**
 * Handle speech recognition end
 */
function handleRecognitionEnd() {
  // Transition state if not in thinking mode
  if (!state.isThinking) {
    state.set({ isListening: false });
  }
}

/**
 * Handle speech recognition error
 * @param {Error} error The error that occurred
 */
function handleRecognitionError(error) {
  console.error('Speech recognition error:', error);
  UI.showNotification(`Speech recognition error: ${error.message}`, 5000);
  state.set({ isListening: false });
}

/**
 * Handle speech synthesis start
 */
function handleSpeechStart() {
  // Set speaking state
  state.set({ isSpeaking: true });
}

/**
 * Handle speech synthesis end
 */
function handleSpeechEnd() {
  // Reset speaking state
  state.set({ isSpeaking: false });
  
  // Restart recognition if it was active before
  if (state.wasListeningBeforeSpeaking) {
    speechRecognition.start();
    state.set({ 
      wasListeningBeforeSpeaking: false,
      isListening: true
    });
  }
}

/**
 * Handle speech synthesis error
 * @param {Error} error The error that occurred
 */
function handleSpeechError(error) {
  console.error('Speech synthesis error:', error);
  UI.showNotification(`Speech synthesis error: ${error.message}`, 5000);
  state.set({ isSpeaking: false });
}

/**
 * Send a user message to the backend
 * @param {string} message The user's message
 */
export function sendUserMessage(message) {
  if (!message || message.trim() === '') return;
  
  // Add to transcript
  UI.addMessageToTranscript('user', message);
  
  // Stop listening while processing
  if (state.isListening) {
    speechRecognition.stop();
    state.set({ 
      isListening: false,
      wasListeningBeforeSpeaking: true
    });
  }
  
  // Simulate sending to backend with basic response
  // In a real implementation, this would send to the actual backend
  console.log('Sending message to backend:', message);
  
  // Show processing notification
  UI.showNotification('Processing your request...', 2000);
  
  // Simulate backend delay
  setTimeout(() => {
    let response = `I received your message: "${message}"`;
    
    // Apply persona to response if available
    if (personaManager.hasActiveBuyerPersona()) {
      response = personaManager.createPersonalizedResponse(response, message);
    }
    
    // Send the AI response
    sendAIResponse(response);
  }, 1000);
}

/**
 * Send an AI response to the user
 * @param {string} message The AI's message
 */
export function sendAIResponse(message) {
  if (!message || message.trim() === '') return;
  
  // Add to transcript
  UI.addMessageToTranscript('ai', message);
  
  // Speak the message
  speechSynthesis.speak(message);
}

/**
 * Check if the thinking mode is active
 * @returns {boolean} Whether thinking mode is active
 */
export function isThinkingModeActive() {
  return state.isThinking;
}

/**
 * Enter thinking mode
 */
export function enterThinkingMode() {
  thinkingMode.enter();
}

/**
 * Exit thinking mode
 */
export function exitThinkingMode() {
  thinkingMode.exit();
}

/**
 * Set the active buyer persona
 * @param {string} personaType The persona type to set
 */
export function setActiveBuyerPersona(personaType) {
  personaManager.setActiveBuyerPersona(personaType);
}

/**
 * Generate a unique buyer persona
 */
export function generateUniqueBuyerPersona() {
  personaManager.generateUniqueBuyerPersona();
}

/**
 * Get the active buyer persona
 * @returns {Object|null} The active buyer persona or null if none
 */
export function getActiveBuyerPersona() {
  return personaManager.getActiveBuyerPersona();
}

/**
 * Clean up resources when done
 */
export function dispose() {
  if (!initialized) return;
  
  speechRecognition.dispose();
  speechSynthesis.dispose();
  UI.dispose();
  thinkingMode.dispose();
  
  initialized = false;
}

// Auto-initialize when imported
initialize(); 
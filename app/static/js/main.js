// Main application entry point
// Updated to use the modular voice architecture

// Previously:
// import * as VoiceInterface from './voice_interface.js';

// Now use the migration shim:
import * as VoiceInterface from './voice_interface_migration.js';

// Initialize voice interface when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing application with modular voice interface');
  VoiceInterface.init();
  
  // Set up event listeners for UI elements
  setupEventListeners();
});

function setupEventListeners() {
  // Set up any additional event listeners for the application
  const sendButton = document.getElementById('send-button');
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      const inputField = document.getElementById('message-input');
      if (inputField && inputField.value.trim()) {
        const message = inputField.value.trim();
        VoiceInterface.handleUserMessage(message);
        inputField.value = '';
      }
    });
  }
  
  // Add keyboard shortcut for voice toggle (spacebar)
  document.addEventListener('keydown', (e) => {
    // Only trigger if not typing in an input or textarea
    if (e.code === 'Space' && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      VoiceInterface.toggleRecording();
    }
  });
}

// Export interface for global access if needed
window.VoiceInterface = VoiceInterface; 
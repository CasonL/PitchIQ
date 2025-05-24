/**
 * usage_example.js
 * Example of how to initialize and use the ElevenLabs speech-to-speech system
 */

// Import the voice module
import Voice from './index.js';

// DOM elements for the voice interface
const elements = {
  recordButton: document.getElementById('record-button'),
  statusIndicator: document.getElementById('status-indicator'),
  personaSelector: document.getElementById('persona-selector'),
  cancelButton: document.getElementById('cancel-button')
};

// Initialize the voice interface
async function initializeVoice() {
  try {
    // Get the ElevenLabs API key from server
    const response = await fetch('/voice/api/elevenlabs-key');
    
    if (!response.ok) {
      throw new Error('Failed to get API key from server');
    }
    
    const { apiKey } = await response.json();
    
    if (!apiKey) {
      throw new Error('No API key available. Please set ELEVENLABS_API_KEY in your environment variables.');
    }

    // Initialize the voice interface with configuration
    const voiceInterface = await Voice.initWithUI({
      apiKey: apiKey,
      defaultPersona: 'friendly',
      elements: elements,
      onStateChange: handleStateChange,
      onPersonaResponse: handlePersonaResponse,
      onPersonaChange: handlePersonaChange,
      onError: handleError
    });
    
    console.log('Voice interface initialized successfully');
    
    // Enable the cancel button
    elements.cancelButton.disabled = false;
    
    // Add event listener for the cancel button
    elements.cancelButton.addEventListener('click', () => {
      voiceInterface.cancelInteraction();
    });
    
    // Update the persona selector
    elements.personaSelector.addEventListener('change', (event) => {
      voiceInterface.setPersona(event.target.value);
    });
    
    return voiceInterface;
  } catch (error) {
    console.error('Failed to initialize voice interface:', error);
    
    // Display the error on the UI
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
      errorDisplay.textContent = error.message;
      errorDisplay.style.display = 'block';
    }
    
    return null;
  }
}

// Event handlers
function handleStateChange(stateChange) {
  const { newState } = stateChange;
  
  console.log('Voice state changed:', newState);
  
  // Update UI based on state
  if (elements.statusIndicator) {
    if (newState.isProcessing) {
      elements.statusIndicator.textContent = 'Processing...';
      elements.statusIndicator.className = 'status processing';
    } else if (newState.isRecording) {
      elements.statusIndicator.textContent = 'Listening...';
      elements.statusIndicator.className = 'status recording';
    } else {
      elements.statusIndicator.textContent = 'Ready';
      elements.statusIndicator.className = 'status ready';
    }
  }
  
  // Update record button appearance
  if (elements.recordButton) {
    if (newState.isRecording) {
      elements.recordButton.textContent = 'Stop';
      elements.recordButton.classList.add('recording');
    } else {
      elements.recordButton.textContent = 'Start';
      elements.recordButton.classList.remove('recording');
    }
  }
  
  // Update cancel button state
  if (elements.cancelButton) {
    elements.cancelButton.disabled = !newState.isRecording && !newState.isProcessing;
  }
}

function handlePersonaResponse(data) {
  console.log('Received response from persona:', data.personaType);
  
  // Audio playback is handled automatically by the voice interface
  // This callback is just for any additional actions after response
  
  // Add to response log
  const logContent = document.getElementById('response-log-content');
  if (logContent) {
    const responseItem = document.createElement('div');
    responseItem.className = 'response-item';
    responseItem.textContent = `${data.personaType} responded`;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timeElement = document.createElement('small');
    timeElement.textContent = ` (${timestamp})`;
    responseItem.appendChild(timeElement);
    
    logContent.insertBefore(responseItem, logContent.firstChild);
  }
}

function handlePersonaChange(data) {
  console.log('Persona changed to:', data.personaType);
  
  // Update UI to reflect the new persona
  const logContent = document.getElementById('response-log-content');
  if (logContent) {
    const responseItem = document.createElement('div');
    responseItem.className = 'response-item';
    responseItem.textContent = `Switched to persona: ${data.personaType}`;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timeElement = document.createElement('small');
    timeElement.textContent = ` (${timestamp})`;
    responseItem.appendChild(timeElement);
    
    logContent.insertBefore(responseItem, logContent.firstChild);
  }
}

function handleError(error) {
  console.error('Voice interface error:', error);
  
  // Show error in UI
  const errorDisplay = document.getElementById('error-display');
  if (errorDisplay) {
    errorDisplay.textContent = `Error: ${error.message}`;
    errorDisplay.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
      errorDisplay.style.display = 'none';
    }, 5000);
  }
}

// Initialize voice when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const voiceInterface = await initializeVoice();
  
  if (!voiceInterface) {
    console.error('Failed to initialize voice interface');
    return;
  }
  
  // Set up record button click handler
  const recordButton = document.getElementById('record-button');
  if (recordButton) {
    recordButton.addEventListener('click', () => {
      voiceInterface.toggleRecording();
    });
  }
  
  // Set up additional event listeners if needed
  const personaButtons = document.querySelectorAll('.persona-button');
  personaButtons.forEach(button => {
    button.addEventListener('click', () => {
      const personaType = button.dataset.persona;
      voiceInterface.setPersona(personaType);
    });
  });
  
  // Example of creating a new persona with demographic attributes
  const createCustomPersonaButton = document.getElementById('create-custom-persona');
  if (createCustomPersonaButton) {
    createCustomPersonaButton.addEventListener('click', () => {
      const personaName = document.getElementById('persona-name').value;
      const gender = document.getElementById('persona-gender').value;
      const age = document.getElementById('persona-age').value;
      const ethnicity = document.getElementById('persona-ethnicity').value;
      
      if (personaName && gender) {
        Voice.createPersonaWithDemographics(voiceInterface, personaName, {
          gender: gender,
          age: age || 'Middle-aged',
          ethnicity: ethnicity || 'American'
        });
        
        // Update persona selector
        if (elements.personaSelector) {
          const option = document.createElement('option');
          option.value = personaName;
          option.textContent = personaName;
          elements.personaSelector.appendChild(option);
        }
        
        // Add to log
        const logContent = document.getElementById('response-log-content');
        if (logContent) {
          const responseItem = document.createElement('div');
          responseItem.className = 'response-item';
          responseItem.textContent = `Created new persona: ${personaName} (${gender}, ${age}, ${ethnicity})`;
          logContent.insertBefore(responseItem, logContent.firstChild);
        }
      }
    });
  }
});

// Make the voice interface available globally for debugging
window.Voice = Voice; 
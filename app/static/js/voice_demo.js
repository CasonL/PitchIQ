/**
 * voice_demo.js
 * Demonstrates using the voice interaction services
 */

// Import necessary modules
import { VoiceInteractionController } from './voice/voice_interaction_controller.js';

// Initialize the demo when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Get UI elements
  const startButton = document.getElementById('start-button');
  const stopButton = document.getElementById('stop-button');
  const personaSelector = document.getElementById('persona-selector');
  const statusIndicator = document.getElementById('status-indicator');
  const transcriptContainer = document.getElementById('transcript-container');
  const responseContainer = document.getElementById('response-container');
  const apiKeyForm = document.getElementById('api-key-form');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  
  // Fetch API keys from server first, then fall back to localStorage
  let deepgramApiKey = '';
  let elevenLabsApiKey = '';
  
  try {
    const response = await fetch('/voice-demo/config');
    if (response.ok) {
      const config = await response.json();
      deepgramApiKey = config.deepgramApiKey || localStorage.getItem('deepgramApiKey') || '';
      elevenLabsApiKey = config.elevenLabsApiKey || localStorage.getItem('elevenLabsApiKey') || '';
      
      // Store in localStorage as a fallback
      if (deepgramApiKey) localStorage.setItem('deepgramApiKey', deepgramApiKey);
      if (elevenLabsApiKey) localStorage.setItem('elevenLabsApiKey', elevenLabsApiKey);
    } else {
      // Fall back to localStorage if server request fails
      deepgramApiKey = localStorage.getItem('deepgramApiKey') || '';
      elevenLabsApiKey = localStorage.getItem('elevenLabsApiKey') || '';
    }
  } catch (error) {
    console.error('Error fetching API keys from server:', error);
    // Fall back to localStorage
    deepgramApiKey = localStorage.getItem('deepgramApiKey') || '';
    elevenLabsApiKey = localStorage.getItem('elevenLabsApiKey') || '';
  }
  
  // Update form inputs with saved API keys
  if (apiKeyForm) {
    const deepgramInput = apiKeyForm.querySelector('[name="deepgramApiKey"]');
    const elevenLabsInput = apiKeyForm.querySelector('[name="elevenLabsApiKey"]');
    
    if (deepgramInput) deepgramInput.value = deepgramApiKey;
    if (elevenLabsInput) elevenLabsInput.value = elevenLabsApiKey;
  }
  
  // Function to process AI responses (would connect to AI service in production)
  const processAiResponse = async (transcript, personaType) => {
    console.log(`Processing through AI for persona ${personaType}: "${transcript}"`);
    
    // For demo purposes, generate a simple response based on transcript
    // In a real implementation, this would call an AI service
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    let response = '';
    
    // Generate different responses based on persona
    switch (personaType) {
      case 'friendly':
        response = `Hey there! I heard you say "${transcript}". How can I help you today?`;
        break;
      case 'professional':
        response = `Thank you for your input. I understand you said "${transcript}". How may I assist you further?`;
        break;
      case 'casual':
        response = `Cool, so you said "${transcript}". What's next?`;
        break;
      case 'enthusiastic':
        response = `Wow! That's awesome! You said "${transcript}"! Let me help you with that right away!`;
        break;
      case 'serious':
        response = `I've noted that you said: "${transcript}". Please let me know what you require.`;
        break;
      default:
        response = `I heard you say: "${transcript}". How can I help with that?`;
    }
    
    return response;
  };
  
  // Create and initialize the voice interaction controller
  const controller = new VoiceInteractionController({
    deepgramApiKey,
    elevenLabsApiKey,
    defaultPersona: 'friendly',
    responseProcessor: processAiResponse,
    
    // Event handlers
    onReady: () => {
      console.log('Voice interaction ready');
      updateUI();
      
      // Populate persona selector
      const personas = controller.getAvailablePersonas();
      if (personaSelector) {
        personaSelector.innerHTML = '';
        personas.forEach(persona => {
          const option = document.createElement('option');
          option.value = persona;
          option.textContent = persona.charAt(0).toUpperCase() + persona.slice(1);
          personaSelector.appendChild(option);
        });
        personaSelector.value = controller.currentPersona;
      }
    },
    onListeningStart: () => {
      console.log('Listening started');
      updateUI();
    },
    onListeningEnd: (result) => {
      console.log('Listening ended', result);
      updateUI();
    },
    onTranscript: (transcript) => {
      console.log('Final transcript:', transcript);
      if (transcriptContainer) {
        transcriptContainer.textContent = transcript;
      }
    },
    onTranscriptUpdate: (transcript) => {
      if (transcriptContainer) {
        transcriptContainer.textContent = transcript + '...';
      }
    },
    onProcessingStart: () => {
      console.log('Processing started');
      updateUI();
    },
    onProcessingEnd: (success) => {
      console.log('Processing ended', success);
      updateUI();
    },
    onResponse: (response) => {
      console.log('Response:', response);
      if (responseContainer) {
        responseContainer.textContent = response;
      }
    },
    onSpeakingStart: () => {
      console.log('Speaking started');
      updateUI();
    },
    onSpeakingEnd: () => {
      console.log('Speaking ended');
      updateUI();
    },
    onError: (error) => {
      console.error('Voice interaction error:', error);
      showError(error.message || 'An error occurred');
    },
    onStateChange: (state) => {
      updateUIFromState(state);
    }
  });
  
  // Function to show error messages
  const showError = (message) => {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        errorContainer.style.display = 'none';
      }, 5000);
    } else {
      alert(`Error: ${message}`);
    }
  };
  
  // Function to update UI based on controller state
  const updateUI = () => {
    if (!controller.isInitialized) return;
    
    const state = {
      isInitialized: controller.isInitialized,
      isListening: controller.isListening,
      isProcessing: controller.isProcessing,
      isSpeaking: controller.isSpeaking,
      currentPersona: controller.currentPersona
    };
    
    updateUIFromState(state);
  };
  
  // Function to update UI from state object
  const updateUIFromState = (state) => {
    if (startButton) {
      startButton.disabled = !state.isInitialized || state.isListening || state.isProcessing;
    }
    
    if (stopButton) {
      stopButton.disabled = !state.isInitialized || !state.isListening;
    }
    
    if (personaSelector) {
      personaSelector.disabled = !state.isInitialized || state.isListening || state.isProcessing || state.isSpeaking;
      personaSelector.value = state.currentPersona;
    }
    
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator';
      let statusText = 'Ready';
      
      if (state.isListening) {
        statusIndicator.classList.add('listening');
        statusText = 'Listening...';
      } else if (state.isProcessing) {
        statusIndicator.classList.add('processing');
        statusText = 'Processing...';
      } else if (state.isSpeaking) {
        statusIndicator.classList.add('speaking');
        statusText = 'Speaking...';
      } else if (!state.isInitialized) {
        statusIndicator.classList.add('initializing');
        statusText = 'Initializing...';
      }
      
      statusIndicator.textContent = statusText;
    }
  };
  
  // Add event listeners
  if (startButton) {
    startButton.addEventListener('click', async () => {
      try {
        await controller.startListening();
      } catch (error) {
        console.error('Error starting listening:', error);
        showError('Failed to start listening');
      }
    });
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', async () => {
      try {
        await controller.stopListening();
      } catch (error) {
        console.error('Error stopping listening:', error);
        showError('Failed to stop listening');
      }
    });
  }
  
  if (personaSelector) {
    personaSelector.addEventListener('change', () => {
      const selectedPersona = personaSelector.value;
      controller.setPersona(selectedPersona);
    });
  }
  
  if (apiKeyForm) {
    apiKeyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(apiKeyForm);
      const newDeepgramApiKey = formData.get('deepgramApiKey');
      const newElevenLabsApiKey = formData.get('elevenLabsApiKey');
      
      // Save API keys to localStorage
      localStorage.setItem('deepgramApiKey', newDeepgramApiKey);
      localStorage.setItem('elevenLabsApiKey', newElevenLabsApiKey);
      
      // Clean up existing controller
      if (controller.isInitialized) {
        await controller.cleanup();
      }
      
      // Reinitialize with new API keys
      await controller.initialize({
        deepgramApiKey: newDeepgramApiKey,
        elevenLabsApiKey: newElevenLabsApiKey
      });
      
      // Update UI
      updateUI();
      
      // Hide settings panel
      if (settingsPanel) {
        settingsPanel.classList.remove('visible');
      }
    });
  }
  
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener('click', () => {
      settingsPanel.classList.toggle('visible');
    });
  }
  
  // Function to check if we have API keys
  const hasApiKeys = () => {
    return deepgramApiKey && elevenLabsApiKey;
  };
  
  try {
    // Only initialize if we have API keys
    if (hasApiKeys()) {
      await controller.initialize({
        ui: {
          transcriptContainer,
          responseContainer,
          startButton,
          stopButton,
          statusIndicator
        }
      });
    } else {
      // Show settings panel if no API keys
      if (settingsPanel) {
        settingsPanel.classList.add('visible');
      }
      
      showError('Please enter your API keys to get started');
    }
  } catch (error) {
    console.error('Failed to initialize voice interaction:', error);
    showError('Failed to initialize voice services');
  }
}); 
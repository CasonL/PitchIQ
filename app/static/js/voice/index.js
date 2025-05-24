/**
 * voice/index.js
 * Central export point for speech-to-speech voice components
 */

import VoiceInterface from './voice_interface.js';
import PersonaVoiceManager from './persona_voice_manager.js';
import ElevenLabsSpeechService from './elevenlabs_speech_service.js';
import voiceDatabase, { VoiceDatabase } from './voice_database.js';

// Initialize voice with configuration
const initVoice = async (config = {}) => {
  const voice = new VoiceInterface({
    apiKey: config.apiKey || '',
    defaultPersona: config.defaultPersona || 'friendly',
    onError: config.onError,
    onStateChange: config.onStateChange,
    onPersonaChange: config.onPersonaChange
  });

  await voice.initialize(config);
  return voice;
};

// Export public API
export default {
  // Main components
  VoiceInterface,
  PersonaVoiceManager,
  ElevenLabsSpeechService,
  VoiceDatabase,
  
  // Database instance
  voiceDatabase,
  
  // Factory functions
  init: initVoice,
  
  // Initialize voice with UI elements
  initWithUI: async (config = {}) => {
    const voice = await initVoice(config);
    
    if (config.elements) {
      voice.setupUIElements(config.elements);
    }
    
    return voice;
  },
  
  // Demographic-based persona creation
  createPersonaWithDemographics: (voiceInterface, personaType, demographics) => {
    if (!voiceInterface || !voiceInterface.personaManager) {
      throw new Error('Voice interface not properly initialized');
    }
    
    return voiceInterface.personaManager.addPersona(personaType, demographics);
  },
  
  // Get voice information by ID
  getVoiceInfo: (voiceId) => {
    return voiceDatabase.getVoice(voiceId);
  },
  
  // Find voices matching criteria
  findVoices: (criteria) => {
    return voiceDatabase.findVoices(criteria);
  },
  
  // Configure voice repeat threshold
  setVoiceRepeatThreshold: (threshold) => {
    voiceDatabase.setRepeatThreshold(threshold);
    return true;
  },
  
  // Configure attribute priority weights
  setPriorityWeights: (weights) => {
    voiceDatabase.setPriorityWeights(weights);
    return true;
  },
  
  // Get special voice mappings
  getSpecialVoiceMappings: () => {
    return {
      santa: 'knrPHWnBmmDHMoiMeP3l',  // Santa Claus voice
      pirate: 'D38z5RcWu1voky8WS1ja', // Sailor/fantasy voice
      cartoon: 'jBpfuIE2acCO8z3wKNLl'  // Childish/animated voice
    };
  },
  
  // Set voice parameters for better control of voices
  setVoiceParameters: (voiceInterface, params) => {
    if (!voiceInterface || !voiceInterface.personaManager) {
      throw new Error('Voice interface not properly initialized');
    }
    
    return voiceInterface.personaManager.setVoiceParameters(params);
  }
}; 
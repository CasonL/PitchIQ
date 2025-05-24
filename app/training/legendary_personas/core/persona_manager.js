/**
 * Persona Manager Module
 * Handles creation and management of legendary personas,
 * including state tracking and chat interactions
 */

import { playAnimation, stopAnimations } from './animation_controller.js';
// Import UI controller if available
let uiController;
try {
    uiController = await import('./ui_controller.js');
} catch (error) {
    console.warn('UI controller not loaded:', error);
}

// Store all active personas
const activePersonas = new Map();

// Persona states
const PERSONA_STATES = {
    IDLE: 'idle',
    SPEAKING: 'speaking',
    LISTENING: 'listening',
    THINKING: 'thinking'
};

// Default persona settings
const DEFAULT_PERSONA_SETTINGS = {
    name: 'Assistant',
    avatar: '/static/images/assistant.png',
    greeting: 'Hello! How can I help you today?',
    voice: null,
    personality: 'helpful',
    traits: [],
    animations: {
        enabled: true,
        speaking: 'speaking',
        listening: 'listening',
        thinking: 'thinking',
        idle: null
    }
};

/**
 * Create a new persona
 * @param {Object} settings - Persona settings
 * @returns {Object} - Persona object
 */
export function createPersona(settings = {}) {
    // Generate a unique ID for the persona
    const id = `persona-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Merge default settings with provided settings
    const personaSettings = {
        ...DEFAULT_PERSONA_SETTINGS,
        ...settings,
        animations: {
            ...DEFAULT_PERSONA_SETTINGS.animations,
            ...(settings.animations || {})
        }
    };
    
    // Initialize persona state
    const persona = {
        id,
        settings: personaSettings,
        state: PERSONA_STATES.IDLE,
        lastMessage: null,
        messageHistory: [],
        domElements: {},
        active: true
    };
    
    // Store in active personas map
    activePersonas.set(id, persona);
    
    // Initialize UI elements if UI controller is available
    if (uiController) {
        persona.domElements = uiController.createPersonaElements(id, personaSettings);
        uiController.updatePersonaState(id, PERSONA_STATES.IDLE);
    }
    
    console.log(`Created persona: ${personaSettings.name} (${id})`);
    return persona;
}

/**
 * Get a persona by ID
 * @param {string} id - Persona ID
 * @returns {Object|null} - Persona object or null if not found
 */
export function getPersona(id) {
    return activePersonas.get(id) || null;
}

/**
 * Get all active personas
 * @returns {Array} - Array of active persona objects
 */
export function getAllPersonas() {
    return Array.from(activePersonas.values());
}

/**
 * Update persona state
 * @param {string} id - Persona ID
 * @param {string} state - New state from PERSONA_STATES
 */
export function updatePersonaState(id, state) {
    const persona = getPersona(id);
    if (!persona) {
        console.error(`Persona not found: ${id}`);
        return;
    }
    
    // Skip if already in this state
    if (persona.state === state) return;
    
    // Update state
    persona.state = state;
    
    // Update UI if available
    if (uiController) {
        uiController.updatePersonaState(id, state);
    }
    
    // Apply animations if enabled
    if (persona.settings.animations.enabled) {
        const avatar = persona.domElements.avatar;
        if (avatar) {
            // Stop any existing animations
            stopAnimations(avatar);
            
            // Get animation name from persona settings
            const animationName = persona.settings.animations[state.toLowerCase()];
            if (animationName) {
                playAnimation(avatar, animationName);
            }
        }
    }
    
    console.log(`Persona ${persona.settings.name} state changed to: ${state}`);
}

/**
 * Set persona as speaking and display message
 * @param {string} id - Persona ID
 * @param {string} message - Message to display
 * @param {Object} options - Additional options
 */
export function personaSpeak(id, message, options = {}) {
    const persona = getPersona(id);
    if (!persona) {
        console.error(`Persona not found: ${id}`);
        return;
    }
    
    // Save message to history
    persona.lastMessage = message;
    persona.messageHistory.push({
        text: message,
        timestamp: new Date(),
        type: 'outgoing'
    });
    
    // Update persona state
    updatePersonaState(id, PERSONA_STATES.SPEAKING);
    
    // Display message in UI if available
    if (uiController) {
        uiController.showPersonaMessage(id, message);
    }
    
    // Handle text-to-speech if enabled
    if (options.speak !== false && typeof window !== 'undefined') {
        speakMessage(message, persona.settings.voice);
    }
    
    // Auto switch back to idle after specified duration or based on message length
    const duration = options.duration || Math.max(2000, message.length * 50);
    setTimeout(() => {
        if (persona.state === PERSONA_STATES.SPEAKING) {
            updatePersonaState(id, PERSONA_STATES.IDLE);
        }
    }, duration);
    
    return message;
}

/**
 * Set persona as listening
 * @param {string} id - Persona ID
 */
export function personaListen(id) {
    const persona = getPersona(id);
    if (!persona) {
        console.error(`Persona not found: ${id}`);
        return;
    }
    
    updatePersonaState(id, PERSONA_STATES.LISTENING);
    
    // Show appropriate UI elements
    if (uiController) {
        uiController.hidePersonaMessage(id);
        uiController.showPersonaAvatar(id);
    }
}

/**
 * Set persona as thinking
 * @param {string} id - Persona ID
 * @param {number} duration - Optional duration for thinking state
 */
export function personaThink(id, duration = 0) {
    const persona = getPersona(id);
    if (!persona) {
        console.error(`Persona not found: ${id}`);
        return;
    }
    
    updatePersonaState(id, PERSONA_STATES.THINKING);
    
    // Show appropriate UI elements
    if (uiController) {
        uiController.hidePersonaMessage(id);
        uiController.showPersonaAvatar(id);
    }
    
    // Auto switch back to idle after specified duration
    if (duration > 0) {
        setTimeout(() => {
            if (persona.state === PERSONA_STATES.THINKING) {
                updatePersonaState(id, PERSONA_STATES.IDLE);
            }
        }, duration);
    }
}

/**
 * Process user message and get persona response
 * @param {string} id - Persona ID
 * @param {string} userMessage - User message
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Persona response
 */
export async function processUserMessage(id, userMessage, options = {}) {
    const persona = getPersona(id);
    if (!persona) {
        console.error(`Persona not found: ${id}`);
        return null;
    }
    
    // Save user message to history
    persona.messageHistory.push({
        text: userMessage,
        timestamp: new Date(),
        type: 'incoming'
    });
    
    // Set to thinking state
    personaThink(id);
    
    try {
        // If custom response handler is provided, use it
        if (typeof options.responseHandler === 'function') {
            const response = await options.responseHandler(userMessage, persona);
            personaSpeak(id, response, options);
            return response;
        }
        
        // Otherwise, use default response generation
        // This would typically connect to an API
        const defaultResponse = await generateResponse(userMessage, persona);
        personaSpeak(id, defaultResponse, options);
        return defaultResponse;
    } catch (error) {
        console.error('Error processing message:', error);
        personaSpeak(id, "I'm sorry, I'm having trouble processing your message.");
        return null;
    }
}

/**
 * Remove a persona
 * @param {string} id - Persona ID
 */
export function removePersona(id) {
    const persona = getPersona(id);
    if (!persona) {
        console.error(`Persona not found: ${id}`);
        return;
    }
    
    // Clean up UI elements if available
    if (uiController) {
        uiController.hidePersonaAvatar(id);
        uiController.hidePersonaMessage(id);
    }
    
    // Remove from active personas
    activePersonas.delete(id);
    console.log(`Removed persona: ${persona.settings.name} (${id})`);
}

/**
 * Remove all personas
 */
export function removeAllPersonas() {
    // Get all persona IDs
    const personaIds = Array.from(activePersonas.keys());
    
    // Remove each persona
    personaIds.forEach(id => {
        removePersona(id);
    });
    
    // Clear UI if available
    if (uiController) {
        uiController.clearAllPersonas();
    }
    
    console.log('All personas removed');
}

/**
 * Helper function for text-to-speech
 * @param {string} text - Text to speak
 * @param {Object} voice - Voice settings
 * @private
 */
function speakMessage(text, voice = null) {
    // Skip if Speech Synthesis is not available
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if specified
    if (voice) {
        // If voice is a string, find the voice by name
        if (typeof voice === 'string') {
            const voices = window.speechSynthesis.getVoices();
            const matchedVoice = voices.find(v => 
                v.name.toLowerCase().includes(voice.toLowerCase()));
            if (matchedVoice) {
                utterance.voice = matchedVoice;
            }
        } 
        // If voice is an object with settings
        else if (typeof voice === 'object') {
            if (voice.name) {
                const voices = window.speechSynthesis.getVoices();
                const matchedVoice = voices.find(v => 
                    v.name.toLowerCase().includes(voice.name.toLowerCase()));
                if (matchedVoice) {
                    utterance.voice = matchedVoice;
                }
            }
            
            // Apply other voice properties if specified
            if (voice.rate) utterance.rate = voice.rate;
            if (voice.pitch) utterance.pitch = voice.pitch;
            if (voice.volume) utterance.volume = voice.volume;
        }
    }
    
    // Speak
    window.speechSynthesis.speak(utterance);
}

/**
 * Default response generation function
 * This would typically be replaced with an actual API call
 * @param {string} userMessage - User message
 * @param {Object} persona - Persona object
 * @returns {Promise<string>} - Generated response
 * @private
 */
async function generateResponse(userMessage, persona) {
    // In a real implementation, this would call an API
    // This is just a placeholder
    const greetings = ['hello', 'hi', 'hey', 'greetings'];
    const farewells = ['bye', 'goodbye', 'see you', 'farewell'];
    
    const lowercaseMsg = userMessage.toLowerCase();
    
    if (greetings.some(g => lowercaseMsg.includes(g))) {
        return `Hello there! I'm ${persona.settings.name}. How can I assist you today?`;
    } else if (farewells.some(f => lowercaseMsg.includes(f))) {
        return `Goodbye! It was nice chatting with you.`;
    } else if (lowercaseMsg.includes('your name')) {
        return `I'm ${persona.settings.name}, your AI assistant.`;
    } else if (lowercaseMsg.includes('help')) {
        return `I'd be happy to help you with anything you need!`;
    }
    
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `As ${persona.settings.name}, I'd like to respond to "${userMessage}", but my response generation is limited in this demo. In a real implementation, this would connect to an AI service.`;
}

// Export constants
export {
    PERSONA_STATES,
    DEFAULT_PERSONA_SETTINGS,
    activePersonas
}; 
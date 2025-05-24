/**
 * Persona Loader
 * Handles loading, validation, and initialization of legendary persona configurations
 */

/**
 * Load a persona by its ID
 * @param {string} personaId - The unique identifier for the persona
 * @returns {Object} - The loaded and validated persona configuration
 */
export function loadPersona(personaId) {
    try {
        // In production, this would load from the file system
        // For now we're simulating with a fetch request
        return fetch(`/api/personas/${personaId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load persona ${personaId}`);
                }
                return response.json();
            })
            .then(personaConfig => validateAndEnhancePersona(personaConfig));
    } catch (error) {
        console.error(`Error loading persona ${personaId}:`, error);
        return getDefaultPersona();
    }
}

/**
 * Get a list of all available personas
 * @returns {Promise<Array>} - Array of persona summary objects
 */
export function getAvailablePersonas() {
    return fetch('/api/personas')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load available personas');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching available personas:', error);
            return [];
        });
}

/**
 * Validate and enhance a persona configuration
 * @param {Object} personaConfig - The raw persona configuration
 * @returns {Object} - The validated and enhanced persona configuration
 */
function validateAndEnhancePersona(personaConfig) {
    // Basic validation
    if (!personaConfig.id || !personaConfig.name) {
        throw new Error('Invalid persona configuration: missing required fields');
    }

    // Set defaults for missing properties
    const enhancedConfig = {
        ...getDefaultPersona(),
        ...personaConfig,
        traits: {
            ...getDefaultPersona().traits,
            ...(personaConfig.traits || {})
        },
        voice: {
            ...getDefaultPersona().voice,
            ...(personaConfig.voice || {})
        },
        animations: {
            ...getDefaultPersona().animations,
            ...(personaConfig.animations || {})
        }
    };

    // Add computed properties
    enhancedConfig.displayName = enhancedConfig.displayName || enhancedConfig.name;
    
    return enhancedConfig;
}

/**
 * Get the default persona configuration
 * @returns {Object} - The default persona configuration
 */
function getDefaultPersona() {
    return {
        id: "default",
        name: "Default Assistant",
        displayName: "AI Assistant",
        description: "A helpful AI assistant",
        traits: {
            formality: 5,
            enthusiasm: 5,
            expertise: 5,
            humor: 3
        },
        voice: {
            type: "neutral",
            accent: "standard",
            pace: 5,
            pitch: 5
        },
        animations: {
            defaultGesture: "neutral",
            thinking: "thinking",
            greeting: "wave",
            listening: "attentive"
        },
        responsePatterns: [
            "I'm here to help with {topic}.",
            "Let me assist you with {topic}.",
            "I'd be happy to explain {topic}."
        ]
    };
}

/**
 * Save updated persona settings
 * @param {string} personaId - The ID of the persona to update
 * @param {Object} updatedSettings - The settings to update
 * @returns {Promise<Object>} - The updated persona configuration
 */
export function savePersonaSettings(personaId, updatedSettings) {
    return fetch(`/api/personas/${personaId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to update persona ${personaId}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error(`Error updating persona ${personaId}:`, error);
        throw error;
    });
} 
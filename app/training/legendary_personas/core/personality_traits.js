/**
 * Personality Traits Module
 * Defines personality attributes, behaviors, and voice characteristics for personas
 */

// Default personality trait sets that can be combined or extended
const personalityTraits = {
    // Base traits (fundamental personality dimensions)
    base: {
        openness: 0.5,        // Openness to experience (0-1)
        conscientiousness: 0.5, // Conscientiousness (0-1)
        extraversion: 0.5,    // Extraversion (0-1)
        agreeableness: 0.5,   // Agreeableness (0-1)
        neuroticism: 0.5,     // Neuroticism/emotional stability (0-1)
    },
    
    // Expressive traits (how the personality is expressed)
    expressive: {
        humor: 0.5,           // Level of humor (0-1)
        formality: 0.5,       // Level of formality (0-1)
        enthusiasm: 0.5,      // Level of enthusiasm (0-1)
        directness: 0.5,      // Level of directness (0-1)
        detail: 0.5,          // Level of detail in responses (0-1)
    },
    
    // Voice characteristics
    voice: {
        pitch: 0.5,           // Voice pitch (0-1)
        speed: 0.5,           // Speaking speed (0-1)
        variability: 0.5,     // Pitch/tone variability (0-1)
        strength: 0.5,        // Voice strength/power (0-1)
        breathiness: 0.5,     // Voice breathiness (0-1)
    },
    
    // Response patterns
    patterns: {
        sentenceLength: 0.5,  // Average sentence length (0-1)
        vocabulary: 0.5,      // Vocabulary complexity (0-1)
        metaphors: 0.5,       // Use of metaphors/analogies (0-1)
        emotionality: 0.5,    // Emotional expressiveness (0-1)
        questioning: 0.5,     // Tendency to ask questions (0-1)
    }
};

// Predefined personality templates
const personalityTemplates = {
    friendly: {
        base: {
            openness: 0.7,
            agreeableness: 0.8,
            extraversion: 0.7
        },
        expressive: {
            humor: 0.6,
            enthusiasm: 0.7,
            formality: 0.4
        },
        patterns: {
            emotionality: 0.7,
            questioning: 0.6
        }
    },
    
    professional: {
        base: {
            conscientiousness: 0.8, 
            neuroticism: 0.3
        },
        expressive: {
            formality: 0.8,
            directness: 0.7,
            detail: 0.7
        },
        voice: {
            speed: 0.5,
            variability: 0.4
        },
        patterns: {
            sentenceLength: 0.6,
            vocabulary: 0.7
        }
    },
    
    enthusiastic: {
        base: {
            extraversion: 0.9,
            openness: 0.8
        },
        expressive: {
            enthusiasm: 0.9,
            humor: 0.7
        },
        voice: {
            speed: 0.7,
            variability: 0.8,
            pitch: 0.6
        },
        patterns: {
            emotionality: 0.8
        }
    },
    
    calm: {
        base: {
            neuroticism: 0.2,
            agreeableness: 0.7
        },
        expressive: {
            enthusiasm: 0.4,
            formality: 0.6
        },
        voice: {
            speed: 0.4,
            variability: 0.3
        },
        patterns: {
            sentenceLength: 0.7,
            emotionality: 0.3
        }
    },
    
    witty: {
        base: {
            openness: 0.8,
            extraversion: 0.7
        },
        expressive: {
            humor: 0.9,
            directness: 0.6
        },
        patterns: {
            metaphors: 0.8,
            vocabulary: 0.8
        }
    }
};

/**
 * Create a complete personality profile from a template name or custom traits
 * @param {string|Object} template - Template name or custom traits object
 * @returns {Object} - Complete personality profile
 */
export function createPersonalityProfile(template) {
    // Start with default base personality
    const profile = JSON.parse(JSON.stringify(personalityTraits));
    
    // If a string is provided, use it as a template name
    if (typeof template === 'string') {
        if (personalityTemplates[template]) {
            return applyTemplate(profile, personalityTemplates[template]);
        } else {
            console.warn(`Template "${template}" not found. Using default profile.`);
            return profile;
        }
    }
    
    // If an object is provided, use it as custom traits
    if (typeof template === 'object') {
        return applyTemplate(profile, template);
    }
    
    return profile;
}

/**
 * Apply a template to a personality profile
 * @param {Object} profile - Base personality profile
 * @param {Object} template - Template to apply
 * @returns {Object} - Modified personality profile
 */
function applyTemplate(profile, template) {
    // Apply template values to the profile
    for (const category in template) {
        if (profile[category]) {
            for (const trait in template[category]) {
                if (profile[category][trait] !== undefined) {
                    profile[category][trait] = template[category][trait];
                }
            }
        }
    }
    
    return profile;
}

/**
 * Generate a random variation of a trait value within specified bounds
 * @param {number} value - Base value (0-1)
 * @param {number} variation - Amount of variation (0-1)
 * @returns {number} - Modified value
 */
export function varyTrait(value, variation = 0.1) {
    // Calculate random variation within bounds
    const delta = (Math.random() * 2 - 1) * variation;
    let newValue = value + delta;
    
    // Ensure value stays within 0-1 range
    return Math.max(0, Math.min(1, newValue));
}

/**
 * Apply personality traits to transform a message
 * @param {string} message - Original message
 * @param {Object} personality - Personality traits configuration
 * @returns {string} - Transformed message
 */
export function applyPersonalityToMessage(message, personality) {
    if (!message || !personality) {
        return message;
    }
    
    let transformedMessage = message;
    
    // Apply various transformations based on personality traits
    transformedMessage = adjustSentencesForPersonality(transformedMessage, personality);
    transformedMessage = adjustVocabularyForPersonality(transformedMessage, personality);
    transformedMessage = adjustEmotionalityForPersonality(transformedMessage, personality);
    
    return transformedMessage;
}

/**
 * Adjust sentence length and structure based on personality
 * @param {string} message - Original message
 * @param {Object} personality - Personality traits
 * @returns {string} - Transformed message
 */
function adjustSentencesForPersonality(message, personality) {
    // This is a placeholder for actual implementation
    // In a full implementation, this would adjust sentence length,
    // sentence complexity, question frequency, etc. based on personality
    return message;
}

/**
 * Adjust vocabulary complexity based on personality
 * @param {string} message - Original message
 * @param {Object} personality - Personality traits
 * @returns {string} - Transformed message
 */
function adjustVocabularyForPersonality(message, personality) {
    // This is a placeholder for actual implementation
    // In a full implementation, this would transform vocabulary,
    // use of metaphors, etc. based on personality
    return message;
}

/**
 * Adjust emotionality and expression based on personality
 * @param {string} message - Original message
 * @param {Object} personality - Personality traits
 * @returns {string} - Transformed message
 */
function adjustEmotionalityForPersonality(message, personality) {
    // This is a placeholder for actual implementation
    // In a full implementation, this would adjust emotional expressiveness,
    // use of emphasis, etc. based on personality
    return message;
}

/**
 * Get speech parameters based on personality voice traits
 * @param {Object} personality - Personality with voice traits
 * @returns {Object} - Speech parameters for TTS systems
 */
export function getSpeechParameters(personality) {
    if (!personality || !personality.voice) {
        return {};
    }
    
    // Extract voice traits
    const { pitch, speed, variability, strength, breathiness } = personality.voice;
    
    // Map personality traits to speech parameters
    // Note: These mappings would be adjusted based on the specific TTS system used
    return {
        rate: 0.8 + (speed * 0.4),         // 0.8-1.2 speed range
        pitch: 0.8 + (pitch * 0.4),        // 0.8-1.2 pitch range
        pitchRange: variability * 2,        // 0-2 range for variation
        volume: 0.7 + (strength * 0.3),    // 0.7-1.0 volume range
        breathiness: breathiness * 100      // 0-100 breathiness
    };
}

// Export personality templates for reuse
export { personalityTemplates, personalityTraits }; 
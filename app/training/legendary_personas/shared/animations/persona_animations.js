/**
 * Persona Animations
 * Predefined animation sets for different persona types
 */

/**
 * Base animation keyframes that can be shared across personas
 */
export const BaseAnimations = {
    // Common animations
    entrance: [
        { transform: 'scale(0.8) translateY(20px)', opacity: 0 },
        { transform: 'scale(1.05) translateY(-5px)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1) translateY(0)', opacity: 1 }
    ],
    exit: [
        { transform: 'scale(1) translateY(0)', opacity: 1 },
        { transform: 'scale(0.8) translateY(10px)', opacity: 0 }
    ],
    speaking: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.03)', offset: 0.5 },
        { transform: 'scale(1)' }
    ],
    listening: [
        { boxShadow: '0 0 0 0 rgba(33, 150, 243, 0.4)' },
        { boxShadow: '0 0 0 10px rgba(33, 150, 243, 0)', offset: 0.5 },
        { boxShadow: '0 0 0 0 rgba(33, 150, 243, 0)' }
    ],
    thinking: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-2px)', offset: 0.25 },
        { transform: 'translateY(0)', offset: 0.5 },
        { transform: 'translateY(2px)', offset: 0.75 },
        { transform: 'translateY(0)' }
    ]
};

/**
 * Animation configurations for different persona types
 */
export const PersonaAnimations = {
    /**
     * Energetic Coach persona animations
     */
    energeticCoach: {
        // Customize base animations
        speaking: [
            { transform: 'scale(1) rotate(0deg)' },
            { transform: 'scale(1.05) rotate(1deg)', offset: 0.25 },
            { transform: 'scale(1.05) rotate(-1deg)', offset: 0.75 },
            { transform: 'scale(1) rotate(0deg)' }
        ],
        thinking: [
            { transform: 'translateY(0) rotate(0deg)' },
            { transform: 'translateY(-3px) rotate(1deg)', offset: 0.3 },
            { transform: 'translateY(0) rotate(0deg)', offset: 0.5 },
            { transform: 'translateY(3px) rotate(-1deg)', offset: 0.7 },
            { transform: 'translateY(0) rotate(0deg)' }
        ],
        
        // Unique animations
        celebrate: [
            { transform: 'scale(1) rotate(0deg)' },
            { transform: 'scale(1.1) rotate(-5deg)', offset: 0.25 },
            { transform: 'scale(1.1) rotate(5deg)', offset: 0.5 },
            { transform: 'scale(1.1) rotate(-5deg)', offset: 0.75 },
            { transform: 'scale(1) rotate(0deg)' }
        ],
        encourage: [
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)' },
            { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)', offset: 0.5 },
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' }
        ]
    },
    
    /**
     * Thoughtful Mentor persona animations
     */
    thoughtfulMentor: {
        speaking: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.02)', offset: 0.5 },
            { transform: 'scale(1)' }
        ],
        thinking: [
            { transform: 'translateY(0) scale(1)' },
            { transform: 'translateY(-2px) scale(0.98)', offset: 0.5 },
            { transform: 'translateY(0) scale(1)' }
        ],
        
        // Unique animations
        explain: [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-3px)', offset: 0.25 },
            { transform: 'translateX(3px)', offset: 0.75 },
            { transform: 'translateX(0)' }
        ],
        reflect: [
            { opacity: 1, filter: 'brightness(1)' },
            { opacity: 0.8, filter: 'brightness(0.95)', offset: 0.5 },
            { opacity: 1, filter: 'brightness(1)' }
        ]
    },
    
    /**
     * Expert Advisor persona animations
     */
    expertAdvisor: {
        // More subtle, professional animations
        speaking: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.01)', offset: 0.5 },
            { transform: 'scale(1)' }
        ],
        thinking: [
            { opacity: 1 },
            { opacity: 0.8, offset: 0.5 },
            { opacity: 1 }
        ],
        
        // Unique animations
        analyze: [
            { filter: 'brightness(1)' },
            { filter: 'brightness(1.1)', offset: 0.5 },
            { filter: 'brightness(1)' }
        ],
        emphasize: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)', offset: 0.2 },
            { transform: 'scale(1.05)', offset: 0.8 },
            { transform: 'scale(1)' }
        ]
    },
    
    /**
     * Friendly Assistant persona animations
     */
    friendlyAssistant: {
        speaking: [
            { transform: 'scale(1) rotate(0deg)' },
            { transform: 'scale(1.02) rotate(1deg)', offset: 0.3 },
            { transform: 'scale(1.02) rotate(-1deg)', offset: 0.7 },
            { transform: 'scale(1) rotate(0deg)' }
        ],
        listening: [
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(33, 150, 243, 0.4)' },
            { transform: 'scale(1.02)', boxShadow: '0 0 0 8px rgba(33, 150, 243, 0)', offset: 0.5 },
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(33, 150, 243, 0)' }
        ],
        
        // Unique animations
        greeting: [
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(-10deg)', offset: 0.25 },
            { transform: 'rotate(10deg)', offset: 0.5 },
            { transform: 'rotate(-10deg)', offset: 0.75 },
            { transform: 'rotate(0deg)' }
        ],
        acknowledge: [
            { transform: 'translateY(0)' },
            { transform: 'translateY(-5px)', offset: 0.5 },
            { transform: 'translateY(0)' }
        ]
    }
};

/**
 * Animation durations and settings for different states
 */
export const AnimationSettings = {
    entrance: {
        duration: 500,
        iterations: 1,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy easing
        fill: 'forwards'
    },
    exit: {
        duration: 300,
        iterations: 1,
        easing: 'ease-in',
        fill: 'forwards'
    },
    speaking: {
        duration: 1500,
        iterations: Infinity,
        easing: 'ease-in-out'
    },
    listening: {
        duration: 2000,
        iterations: Infinity,
        easing: 'ease-in-out'
    },
    thinking: {
        duration: 1800,
        iterations: Infinity,
        easing: 'ease-in-out'
    },
    // Settings for unique animations
    celebrate: {
        duration: 1000,
        iterations: 1,
        easing: 'ease-in-out'
    },
    encourage: {
        duration: 1200,
        iterations: 2,
        easing: 'ease-in-out'
    },
    explain: {
        duration: 800,
        iterations: 1,
        easing: 'ease-in-out'
    },
    reflect: {
        duration: 1500,
        iterations: 3,
        easing: 'ease-in-out'
    },
    analyze: {
        duration: 1000,
        iterations: 2,
        easing: 'linear'
    },
    emphasize: {
        duration: 800,
        iterations: 1,
        easing: 'ease-out'
    },
    greeting: {
        duration: 1000,
        iterations: 1,
        easing: 'ease-in-out'
    },
    acknowledge: {
        duration: 500,
        iterations: 1,
        easing: 'ease-out'
    }
};

/**
 * Create a complete animation set for a persona type
 * @param {string} personaType - Type of persona (e.g., 'energeticCoach')
 * @returns {Object} - Complete animation set with keyframes and settings
 */
export function getPersonaAnimations(personaType) {
    // Get the persona-specific animations or default to friendlyAssistant
    const personaAnimationSet = PersonaAnimations[personaType] || PersonaAnimations.friendlyAssistant;
    
    // Combine with base animations for any missing animations
    const combinedAnimations = {};
    
    // Add all base animations first
    for (const [animName, keyframes] of Object.entries(BaseAnimations)) {
        combinedAnimations[animName] = {
            keyframes: keyframes,
            settings: AnimationSettings[animName] || AnimationSettings.speaking // Default to speaking settings
        };
    }
    
    // Override with persona-specific animations
    for (const [animName, keyframes] of Object.entries(personaAnimationSet)) {
        combinedAnimations[animName] = {
            keyframes: keyframes,
            settings: AnimationSettings[animName] || AnimationSettings.speaking // Default to speaking settings
        };
    }
    
    return combinedAnimations;
}

/**
 * Get animation for a specific state and persona type
 * @param {string} state - Animation state/name
 * @param {string} personaType - Type of persona
 * @returns {Object} - Animation keyframes and settings or null if not found
 */
export function getAnimationForState(state, personaType) {
    const animations = getPersonaAnimations(personaType);
    return animations[state] || null;
}

export default {
    BaseAnimations,
    PersonaAnimations,
    AnimationSettings,
    getPersonaAnimations,
    getAnimationForState
}; 
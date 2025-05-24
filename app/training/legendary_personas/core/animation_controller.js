/**
 * Animation Controller Module
 * Manages animations for legendary persona avatars
 */

// Store active animations
const activeAnimations = new Map();

/**
 * Define animation presets
 */
const ANIMATION_PRESETS = {
    entrance: [
        { transform: 'scale(0.5) translateY(20px)', opacity: 0 },
        { transform: 'scale(1.1) translateY(-5px)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1) translateY(0)', opacity: 1 }
    ],
    exit: [
        { transform: 'scale(1) translateY(0)', opacity: 1 },
        { transform: 'scale(0.8) translateY(10px)', opacity: 0 }
    ],
    speaking: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)', offset: 0.5 },
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
    ],
    happy: [
        { transform: 'rotate(-5deg)' },
        { transform: 'rotate(5deg)', offset: 0.5 },
        { transform: 'rotate(0deg)' }
    ],
    confused: [
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(3px)', offset: 0.25 },
        { transform: 'translateX(-3px)', offset: 0.5 },
        { transform: 'translateX(3px)', offset: 0.75 },
        { transform: 'translateX(0)' }
    ]
};

// Animation default settings
const DEFAULT_ANIMATION_SETTINGS = {
    duration: 1000,
    iterations: Infinity,
    easing: 'ease-in-out'
};

// One-time animation settings (entrance, exit)
const ONE_TIME_ANIMATION_SETTINGS = {
    duration: 500,
    iterations: 1,
    easing: 'ease-in-out',
    fill: 'forwards'
};

/**
 * Play an animation on an element
 * @param {HTMLElement} element - Element to animate
 * @param {string} animationName - Name of the animation from presets
 * @param {Object} customSettings - Custom animation settings
 * @returns {Animation|null} - Web Animation API instance or null if failed
 */
export function playAnimation(element, animationName, customSettings = {}) {
    if (!element || !animationName) {
        console.error('Missing element or animation name');
        return null;
    }
    
    // Determine if this is a one-time animation
    const isOneTime = ['entrance', 'exit'].includes(animationName);
    
    // Get animation keyframes
    const keyframes = ANIMATION_PRESETS[animationName];
    if (!keyframes) {
        console.error(`Animation preset not found: ${animationName}`);
        return null;
    }
    
    // Configure animation settings
    const settings = {
        ...(isOneTime ? ONE_TIME_ANIMATION_SETTINGS : DEFAULT_ANIMATION_SETTINGS),
        ...customSettings
    };
    
    // Stop any existing animations on this element
    stopAnimations(element);
    
    // Create and start the animation
    try {
        const animation = element.animate(keyframes, settings);
        
        // Store reference to active animation
        activeAnimations.set(element, animation);
        
        // For one-time animations, remove from active list when complete
        if (isOneTime) {
            animation.onfinish = () => {
                activeAnimations.delete(element);
            };
        }
        
        return animation;
    } catch (error) {
        console.error('Animation failed:', error);
        return null;
    }
}

/**
 * Stop all animations on an element
 * @param {HTMLElement} element - Element to stop animations for
 */
export function stopAnimations(element) {
    if (!element) return;
    
    // Cancel existing animation if present
    const existingAnimation = activeAnimations.get(element);
    if (existingAnimation) {
        existingAnimation.cancel();
        activeAnimations.delete(element);
    }
}

/**
 * Create a custom animation with keyframes
 * @param {HTMLElement} element - Element to animate
 * @param {Array} keyframes - Animation keyframes
 * @param {Object} settings - Animation settings
 * @returns {Animation|null} - Web Animation API instance or null if failed
 */
export function createCustomAnimation(element, keyframes, settings = {}) {
    if (!element || !Array.isArray(keyframes)) {
        console.error('Invalid element or keyframes');
        return null;
    }
    
    // Stop any existing animations
    stopAnimations(element);
    
    // Merge with default settings
    const mergedSettings = {
        ...DEFAULT_ANIMATION_SETTINGS,
        ...settings
    };
    
    // Create and start animation
    try {
        const animation = element.animate(keyframes, mergedSettings);
        activeAnimations.set(element, animation);
        return animation;
    } catch (error) {
        console.error('Custom animation failed:', error);
        return null;
    }
}

/**
 * Apply a CSS transition animation
 * @param {HTMLElement} element - Element to animate
 * @param {Object} properties - CSS properties to animate
 * @param {Object} options - Transition options
 */
export function applyTransition(element, properties, options = {}) {
    if (!element || !properties) {
        console.error('Invalid element or properties');
        return;
    }
    
    const duration = options.duration || 300;
    const easing = options.easing || 'ease';
    const delay = options.delay || 0;
    
    // Setup transition
    element.style.transition = `all ${duration}ms ${easing} ${delay}ms`;
    
    // Apply properties
    Object.entries(properties).forEach(([prop, value]) => {
        element.style[prop] = value;
    });
    
    // Reset transition after completion if requested
    if (options.reset !== false) {
        setTimeout(() => {
            element.style.transition = '';
        }, duration + delay + 50);
    }
    
    // Execute callback if provided
    if (typeof options.onComplete === 'function') {
        setTimeout(options.onComplete, duration + delay);
    }
}

// Export animation presets and active animations (for debugging)
export {
    ANIMATION_PRESETS,
    activeAnimations
}; 
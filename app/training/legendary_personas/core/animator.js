/**
 * Animator Module
 * Handles animations and visual effects for persona interfaces
 */

// Store current animation state
let currentAnimation = null;
let animationElement = null;
let animationConfig = {};

/**
 * Initialize the animator with configuration and target element
 * @param {Object} config - Animation configuration options
 * @param {HTMLElement} element - The target element for animations
 */
export function initAnimator(config, element) {
    if (!element) {
        console.error('Animation element not provided');
        return;
    }
    
    animationElement = element;
    animationConfig = config || {};
    
    // Apply any default styling
    applyDefaultStyling();
    
    console.log('Animator initialized with element:', element.id || element.className);
}

/**
 * Play a specific animation sequence
 * @param {string} animationName - Name of the animation to play
 * @param {Object} options - Additional animation options (duration, intensity, etc.)
 * @returns {Promise} - Resolves when animation completes
 */
export function playAnimation(animationName, options = {}) {
    if (!animationElement) {
        console.warn('Cannot play animation: animator not initialized');
        return Promise.resolve();
    }
    
    // Stop any current animation
    if (currentAnimation) {
        stopAnimation();
    }
    
    const animationOptions = {
        duration: options.duration || 1000,
        intensity: options.intensity || 1,
        loop: options.loop || false,
        ...options
    };
    
    console.log(`Playing animation: ${animationName}`, animationOptions);
    
    // Get the animation definition from the config
    const animationDef = (animationConfig.animations || {})[animationName] || getDefaultAnimation(animationName);
    
    if (!animationDef) {
        console.warn(`Animation "${animationName}" not found`);
        return Promise.resolve();
    }
    
    // Set current animation tracking
    currentAnimation = animationName;
    
    // Apply animation to element
    return applyAnimation(animationDef, animationOptions);
}

/**
 * Stop the current animation
 */
export function stopAnimation() {
    if (!currentAnimation || !animationElement) {
        return;
    }
    
    console.log(`Stopping animation: ${currentAnimation}`);
    
    // Reset to default state
    animationElement.style.animation = '';
    animationElement.classList.remove('animating', currentAnimation);
    
    currentAnimation = null;
}

/**
 * Apply default styling to the animation element
 */
function applyDefaultStyling() {
    if (!animationElement) return;
    
    // Add any default classes or styles
    animationElement.classList.add('persona-animation-target');
    
    // Add some base styles if not already styled
    if (!animationElement.style.transition) {
        animationElement.style.transition = 'all 0.3s ease-in-out';
    }
}

/**
 * Apply an animation definition to the target element
 * @param {Object} animationDef - The animation definition
 * @param {Object} options - Animation options
 * @returns {Promise} - Resolves when animation completes
 */
function applyAnimation(animationDef, options) {
    return new Promise((resolve) => {
        // Apply classes
        animationElement.classList.add('animating', currentAnimation);
        
        // Create CSS animation if defined
        if (animationDef.keyframes) {
            const animationName = `persona-${currentAnimation}`;
            createKeyframeAnimation(animationName, animationDef.keyframes);
            
            animationElement.style.animation = `${animationName} ${options.duration}ms ${options.loop ? 'infinite' : '1'} ${animationDef.timing || 'ease-in-out'}`;
        }
        
        // Apply direct style changes if defined
        if (animationDef.styles) {
            Object.entries(animationDef.styles).forEach(([prop, value]) => {
                animationElement.style[prop] = value;
            });
        }
        
        // Set timeout to resolve the promise when animation completes
        if (!options.loop) {
            setTimeout(() => {
                if (currentAnimation === animationDef.name) {
                    stopAnimation();
                }
                resolve();
            }, options.duration);
        } else {
            // For looping animations, resolve immediately
            resolve();
        }
    });
}

/**
 * Create a keyframe animation and add it to the document
 * @param {string} name - Name of the animation
 * @param {Array|Object} keyframes - Keyframe definitions
 */
function createKeyframeAnimation(name, keyframes) {
    // Check if this animation already exists
    const existingStyle = document.querySelector(`style[data-animation="${name}"]`);
    if (existingStyle) {
        return;
    }
    
    // Create a new stylesheet for the animation
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-animation', name);
    
    let keyframeCSS = `@keyframes ${name} {\n`;
    
    if (Array.isArray(keyframes)) {
        // Array format: [{percentage: 0, styles: {...}}, ...]
        keyframes.forEach(frame => {
            keyframeCSS += `  ${frame.percentage}% {\n`;
            Object.entries(frame.styles).forEach(([prop, value]) => {
                keyframeCSS += `    ${prop}: ${value};\n`;
            });
            keyframeCSS += '  }\n';
        });
    } else {
        // Object format: {0: {...styles}, '50%': {...styles}}
        Object.entries(keyframes).forEach(([key, styles]) => {
            // Ensure key has % if it's a number
            const percentage = isNaN(key) ? key : `${key}%`;
            keyframeCSS += `  ${percentage} {\n`;
            Object.entries(styles).forEach(([prop, value]) => {
                keyframeCSS += `    ${prop}: ${value};\n`;
            });
            keyframeCSS += '  }\n';
        });
    }
    
    keyframeCSS += '}\n';
    styleSheet.textContent = keyframeCSS;
    document.head.appendChild(styleSheet);
}

/**
 * Get a default animation definition
 * @param {string} animationName - The animation name
 * @returns {Object|null} - The animation definition or null if not found
 */
function getDefaultAnimation(animationName) {
    const defaultAnimations = {
        'thinking': {
            name: 'thinking',
            timing: 'ease-in-out',
            keyframes: [
                { percentage: 0, styles: { opacity: '1', transform: 'scale(1)' } },
                { percentage: 50, styles: { opacity: '0.7', transform: 'scale(0.98)' } },
                { percentage: 100, styles: { opacity: '1', transform: 'scale(1)' } }
            ]
        },
        'speaking': {
            name: 'speaking',
            timing: 'linear',
            keyframes: {
                '0%': { transform: 'translateY(0px)' },
                '25%': { transform: 'translateY(2px)' },
                '75%': { transform: 'translateY(-2px)' },
                '100%': { transform: 'translateY(0px)' }
            }
        },
        'wave': {
            name: 'wave',
            timing: 'ease-in-out',
            keyframes: {
                '0%': { transform: 'rotate(0deg)' },
                '25%': { transform: 'rotate(20deg)' },
                '50%': { transform: 'rotate(0deg)' },
                '75%': { transform: 'rotate(20deg)' },
                '100%': { transform: 'rotate(0deg)' }
            }
        },
        'pulse': {
            name: 'pulse',
            timing: 'ease-in-out',
            keyframes: [
                { percentage: 0, styles: { transform: 'scale(1)' } },
                { percentage: 50, styles: { transform: 'scale(1.05)' } },
                { percentage: 100, styles: { transform: 'scale(1)' } }
            ]
        },
        'attentive': {
            name: 'attentive',
            timing: 'ease-in-out',
            keyframes: [
                { percentage: 0, styles: { transform: 'translateY(0)' } },
                { percentage: 50, styles: { transform: 'translateY(-5px)' } },
                { percentage: 100, styles: { transform: 'translateY(0)' } }
            ]
        }
    };
    
    return defaultAnimations[animationName] || null;
} 
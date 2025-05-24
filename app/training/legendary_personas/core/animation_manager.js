/**
 * animation_manager.js
 * Manages animations for legendary personas
 */

class AnimationManager {
  constructor(options = {}) {
    this.animations = {};
    this.currentAnimation = null;
    this.defaultDuration = options.defaultDuration || 1000;
    this.defaultEasing = options.defaultEasing || 'ease';
    this.container = null;
    this.elementSelectors = options.elementSelectors || {};
  }
  
  /**
   * Initialize the animation manager with a container
   * @param {Element} container - DOM element to animate within
   * @param {Object} options - Additional options
   */
  initialize(container, options = {}) {
    this.container = container;
    this.elementSelectors = {
      ...this.elementSelectors,
      ...options.elementSelectors
    };
    
    // Register default animations if provided
    if (options.animations) {
      this.registerAnimations(options.animations);
    }
    
    return this;
  }
  
  /**
   * Register a new animation or set of animations
   * @param {Object} animations - Animation definitions
   */
  registerAnimations(animations) {
    if (!animations) {
      return this;
    }
    
    // Merge new animations with existing ones
    this.animations = {
      ...this.animations,
      ...animations
    };
    
    return this;
  }
  
  /**
   * Play a registered animation
   * @param {string} animationName - Name of the animation to play
   * @param {Object} options - Animation options
   * @returns {Promise} - Resolves when animation completes
   */
  play(animationName, options = {}) {
    const animation = this.animations[animationName];
    
    if (!animation) {
      console.warn(`Animation "${animationName}" not found`);
      return Promise.resolve();
    }
    
    // Stop current animation if one is playing
    if (this.currentAnimation) {
      this.stop();
    }
    
    // Set current animation
    this.currentAnimation = animationName;
    
    // Execute the animation
    return this._executeAnimation(animation, options);
  }
  
  /**
   * Stop the current animation
   */
  stop() {
    if (!this.currentAnimation) {
      return;
    }
    
    // Find all animating elements
    if (this.container) {
      const animatingElements = this.container.querySelectorAll('.animating');
      
      // Remove animation classes and styles
      animatingElements.forEach(element => {
        element.classList.remove('animating');
        element.style.animation = '';
      });
    }
    
    this.currentAnimation = null;
    
    return this;
  }
  
  /**
   * Create a CSS keyframe animation
   * @param {string} name - Animation name
   * @param {Object} keyframes - Animation keyframes
   */
  createKeyframeAnimation(name, keyframes) {
    if (!name || !keyframes) {
      return;
    }
    
    // Check if animation already exists
    const existingAnimation = document.querySelector(`style[data-animation="${name}"]`);
    if (existingAnimation) {
      return;
    }
    
    // Create keyframes string
    let keyframeStr = `@keyframes ${name} {\n`;
    
    // Add each keyframe
    Object.entries(keyframes).forEach(([position, properties]) => {
      keyframeStr += `  ${position} {\n`;
      
      Object.entries(properties).forEach(([prop, value]) => {
        keyframeStr += `    ${prop}: ${value};\n`;
      });
      
      keyframeStr += '  }\n';
    });
    
    keyframeStr += '}\n';
    
    // Create style element
    const style = document.createElement('style');
    style.setAttribute('data-animation', name);
    style.textContent = keyframeStr;
    
    // Add to document
    document.head.appendChild(style);
  }
  
  // Private methods
  
  /**
   * Execute an animation
   * @private
   * @param {Object} animation - Animation definition
   * @param {Object} options - Animation options
   * @returns {Promise} - Resolves when animation completes
   */
  _executeAnimation(animation, options = {}) {
    if (!this.container) {
      return Promise.resolve();
    }
    
    // Create a promise that resolves when animation completes
    return new Promise(resolve => {
      const duration = options.duration || animation.duration || this.defaultDuration;
      const easing = options.easing || animation.easing || this.defaultEasing;
      
      // If animation is a function, execute it
      if (typeof animation === 'function') {
        animation(this.container, {
          duration,
          easing,
          ...options,
          onComplete: () => {
            this.currentAnimation = null;
            resolve();
          }
        });
        return;
      }
      
      // Otherwise process animation as object
      if (animation.keyframes) {
        this._animateWithKeyframes(animation, {
          duration,
          easing,
          ...options,
          onComplete: () => {
            this.currentAnimation = null;
            resolve();
          }
        });
      } else if (animation.steps) {
        this._animateWithSteps(animation, {
          duration,
          easing,
          ...options,
          onComplete: () => {
            this.currentAnimation = null;
            resolve();
          }
        });
      } else {
        console.warn('Animation has no keyframes or steps');
        this.currentAnimation = null;
        resolve();
      }
    });
  }
  
  /**
   * Animate using CSS keyframes
   * @private
   * @param {Object} animation - Animation definition
   * @param {Object} options - Animation options
   */
  _animateWithKeyframes(animation, options) {
    const { keyframes, target, name } = animation;
    const { duration, easing, onComplete } = options;
    
    // Find target element
    let targetElement;
    
    if (target && this.elementSelectors[target]) {
      targetElement = this.container.querySelector(this.elementSelectors[target]);
    } else if (target) {
      targetElement = this.container.querySelector(target);
    } else {
      targetElement = this.container;
    }
    
    if (!targetElement) {
      console.warn(`Target element "${target}" not found`);
      if (onComplete) onComplete();
      return;
    }
    
    // Create unique animation name
    const animationName = name || `${target}-${Date.now()}`;
    
    // Create keyframe animation
    this.createKeyframeAnimation(animationName, keyframes);
    
    // Apply animation
    targetElement.classList.add('animating');
    targetElement.style.animation = `${animationName} ${duration}ms ${easing}`;
    
    // Listen for animation end
    const animationEndHandler = () => {
      targetElement.removeEventListener('animationend', animationEndHandler);
      targetElement.classList.remove('animating');
      targetElement.style.animation = '';
      
      if (onComplete) onComplete();
    };
    
    targetElement.addEventListener('animationend', animationEndHandler);
  }
  
  /**
   * Animate using sequential steps
   * @private
   * @param {Object} animation - Animation definition
   * @param {Object} options - Animation options
   */
  _animateWithSteps(animation, options) {
    const { steps } = animation;
    const { onComplete } = options;
    
    if (!steps || !steps.length) {
      if (onComplete) onComplete();
      return;
    }
    
    // Execute steps in sequence
    let stepIndex = 0;
    
    const executeStep = () => {
      if (stepIndex >= steps.length) {
        if (onComplete) onComplete();
        return;
      }
      
      const step = steps[stepIndex];
      const stepDuration = step.duration || options.duration / steps.length;
      
      // Execute the step
      this._executeStep(step, {
        ...options,
        duration: stepDuration,
        onComplete: () => {
          stepIndex++;
          executeStep();
        }
      });
    };
    
    // Start executing steps
    executeStep();
  }
  
  /**
   * Execute a single animation step
   * @private
   * @param {Object} step - Step definition
   * @param {Object} options - Step options
   */
  _executeStep(step, options) {
    const { target, properties, delay = 0 } = step;
    const { duration, easing, onComplete } = options;
    
    // Find target element
    let targetElement;
    
    if (target && this.elementSelectors[target]) {
      targetElement = this.container.querySelector(this.elementSelectors[target]);
    } else if (target) {
      targetElement = this.container.querySelector(target);
    } else {
      targetElement = this.container;
    }
    
    if (!targetElement) {
      console.warn(`Target element "${target}" not found`);
      if (onComplete) onComplete();
      return;
    }
    
    // Apply delay if needed
    setTimeout(() => {
      // Apply transition
      targetElement.style.transition = `all ${duration}ms ${easing}`;
      
      // Apply properties
      if (properties) {
        Object.entries(properties).forEach(([prop, value]) => {
          targetElement.style[prop] = value;
        });
      }
      
      // Listen for transition end
      const transitionEndHandler = () => {
        targetElement.removeEventListener('transitionend', transitionEndHandler);
        
        if (onComplete) onComplete();
      };
      
      targetElement.addEventListener('transitionend', transitionEndHandler);
      
      // Fallback in case transition doesn't trigger
      setTimeout(() => {
        targetElement.removeEventListener('transitionend', transitionEndHandler);
        if (onComplete) onComplete();
      }, duration + 50);
    }, delay);
  }
}

// Export for use in modules
export { AnimationManager };
export default AnimationManager; 
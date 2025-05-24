/**
 * UI Controller Module
 * Handles all UI-related operations for legendary personas
 * including creating, updating, and managing visual elements
 */

// Track all persona containers
const personaContainers = new Map();
let rootContainer = null;

// Default CSS classes
const DEFAULT_CLASSES = {
    root: 'legendary-personas-container',
    persona: 'legendary-persona',
    avatar: 'legendary-persona-avatar',
    message: 'legendary-persona-message',
    speaking: 'speaking',
    listening: 'listening',
    thinking: 'thinking',
    idle: 'idle'
};

/**
 * Initialize the UI system
 * @param {string|HTMLElement} container - Container element or selector
 * @param {Object} options - UI options
 * @returns {HTMLElement} - Root container element
 */
export function initializeUI(container, options = {}) {
    // Find or create root container
    if (typeof container === 'string') {
        rootContainer = document.querySelector(container);
        if (!rootContainer) {
            console.warn(`Container element not found: ${container}. Creating a new one.`);
            rootContainer = document.createElement('div');
            rootContainer.id = container.startsWith('#') ? container.substring(1) : container;
            document.body.appendChild(rootContainer);
        }
    } else if (container instanceof HTMLElement) {
        rootContainer = container;
    } else {
        rootContainer = document.createElement('div');
        rootContainer.id = 'legendary-personas-root';
        document.body.appendChild(rootContainer);
    }
    
    // Apply root class
    rootContainer.classList.add(DEFAULT_CLASSES.root);
    
    // Apply custom styles if provided
    if (options.styles) {
        applyStyles(options.styles);
    }
    
    return rootContainer;
}

/**
 * Create DOM elements for a persona
 * @param {string} id - Persona ID
 * @param {Object} settings - Persona settings
 * @returns {Object} - Object containing DOM elements
 */
export function createPersonaElements(id, settings) {
    if (!rootContainer) {
        console.warn('UI not initialized. Initializing with default settings.');
        initializeUI();
    }
    
    // Create persona container if it doesn't exist
    let personaContainer = personaContainers.get(id);
    if (!personaContainer) {
        personaContainer = document.createElement('div');
        personaContainer.id = `persona-container-${id}`;
        personaContainer.classList.add(DEFAULT_CLASSES.persona);
        personaContainer.dataset.personaId = id;
        
        // Append to root container
        rootContainer.appendChild(personaContainer);
        
        // Store in map
        personaContainers.set(id, personaContainer);
    }
    
    // Create avatar element
    const avatarElement = document.createElement('div');
    avatarElement.id = `persona-avatar-${id}`;
    avatarElement.classList.add(DEFAULT_CLASSES.avatar);
    
    // Set avatar image if provided
    if (settings.avatar) {
        if (settings.avatar.endsWith('.png') || settings.avatar.endsWith('.jpg') || settings.avatar.endsWith('.jpeg') || settings.avatar.endsWith('.gif')) {
            // Image avatar
            avatarElement.style.backgroundImage = `url(${settings.avatar})`;
        } else {
            // Text or HTML avatar
            avatarElement.innerHTML = settings.avatar;
        }
    } else {
        // Default avatar (first letter of name)
        const nameInitial = settings.name ? settings.name.charAt(0).toUpperCase() : 'A';
        avatarElement.textContent = nameInitial;
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.id = `persona-message-${id}`;
    messageElement.classList.add(DEFAULT_CLASSES.message);
    
    // Append elements to persona container
    personaContainer.appendChild(avatarElement);
    personaContainer.appendChild(messageElement);
    
    // Apply custom styles if provided
    if (settings.styles) {
        applyPersonaStyles(id, settings.styles);
    }
    
    // Apply initial state
    updatePersonaState(id, 'idle');
    
    // Create return object with all elements
    return {
        container: personaContainer,
        avatar: avatarElement,
        message: messageElement
    };
}

/**
 * Show a persona's avatar
 * @param {string} id - Persona ID
 * @param {Object} options - Display options
 */
export function showPersonaAvatar(id, options = {}) {
    const container = personaContainers.get(id);
    if (!container) {
        console.error(`Persona container not found: ${id}`);
        return;
    }
    
    const avatarElement = container.querySelector(`.${DEFAULT_CLASSES.avatar}`);
    if (!avatarElement) {
        console.error(`Avatar element not found for persona: ${id}`);
        return;
    }
    
    // Show container and avatar
    container.style.display = 'flex';
    avatarElement.style.display = 'block';
    
    // Apply entrance animation if specified
    if (options.animation) {
        // Animation logic would go here
        // We can leverage the animation_controller.js for this
    }
}

/**
 * Hide a persona's avatar
 * @param {string} id - Persona ID
 * @param {Object} options - Hide options
 */
export function hidePersonaAvatar(id, options = {}) {
    const container = personaContainers.get(id);
    if (!container) return;
    
    const avatarElement = container.querySelector(`.${DEFAULT_CLASSES.avatar}`);
    if (!avatarElement) return;
    
    // Apply exit animation if specified
    if (options.animation) {
        // Animation logic would go here
        // We can leverage the animation_controller.js for this
    } else {
        // Hide avatar immediately
        avatarElement.style.display = 'none';
        
        // Hide container if message is also hidden
        const messageElement = container.querySelector(`.${DEFAULT_CLASSES.message}`);
        if (!messageElement || messageElement.style.display === 'none') {
            container.style.display = 'none';
        }
    }
}

/**
 * Show a message from a persona
 * @param {string} id - Persona ID
 * @param {string} message - Message content
 * @param {Object} options - Display options
 */
export function showPersonaMessage(id, message, options = {}) {
    const container = personaContainers.get(id);
    if (!container) {
        console.error(`Persona container not found: ${id}`);
        return;
    }
    
    const messageElement = container.querySelector(`.${DEFAULT_CLASSES.message}`);
    if (!messageElement) {
        console.error(`Message element not found for persona: ${id}`);
        return;
    }
    
    // Ensure container and avatar are visible
    container.style.display = 'flex';
    const avatarElement = container.querySelector(`.${DEFAULT_CLASSES.avatar}`);
    if (avatarElement) {
        avatarElement.style.display = 'block';
    }
    
    // Set message text
    messageElement.innerHTML = message;
    messageElement.style.display = 'block';
    
    // Auto-hide after duration if specified
    if (options.duration) {
        setTimeout(() => {
            hidePersonaMessage(id);
        }, options.duration);
    }
}

/**
 * Hide a persona's message
 * @param {string} id - Persona ID
 */
export function hidePersonaMessage(id) {
    const container = personaContainers.get(id);
    if (!container) return;
    
    const messageElement = container.querySelector(`.${DEFAULT_CLASSES.message}`);
    if (!messageElement) return;
    
    // Hide message
    messageElement.style.display = 'none';
    
    // Hide container if avatar is also hidden
    const avatarElement = container.querySelector(`.${DEFAULT_CLASSES.avatar}`);
    if (!avatarElement || avatarElement.style.display === 'none') {
        container.style.display = 'none';
    }
}

/**
 * Update a persona's state
 * @param {string} id - Persona ID
 * @param {string} state - New state (speaking, listening, thinking, idle)
 */
export function updatePersonaState(id, state) {
    const container = personaContainers.get(id);
    if (!container) return;
    
    // Remove all state classes
    container.classList.remove(
        DEFAULT_CLASSES.speaking,
        DEFAULT_CLASSES.listening,
        DEFAULT_CLASSES.thinking,
        DEFAULT_CLASSES.idle
    );
    
    // Add appropriate state class
    switch (state.toLowerCase()) {
        case 'speaking':
            container.classList.add(DEFAULT_CLASSES.speaking);
            break;
        case 'listening':
            container.classList.add(DEFAULT_CLASSES.listening);
            break;
        case 'thinking':
            container.classList.add(DEFAULT_CLASSES.thinking);
            break;
        case 'idle':
        default:
            container.classList.add(DEFAULT_CLASSES.idle);
            break;
    }
}

/**
 * Remove all persona elements
 */
export function clearAllPersonas() {
    if (!rootContainer) return;
    
    // Remove all persona containers
    personaContainers.forEach((container) => {
        rootContainer.removeChild(container);
    });
    
    // Clear container map
    personaContainers.clear();
}

/**
 * Apply global styles for the UI system
 * @param {Object} styles - Style object
 * @private
 */
function applyStyles(styles) {
    // Create a style element if it doesn't exist
    let styleEl = document.getElementById('legendary-personas-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'legendary-personas-styles';
        document.head.appendChild(styleEl);
    }
    
    // Generate CSS from styles object
    let css = '';
    
    // Root container styles
    if (styles.root) {
        css += `.${DEFAULT_CLASSES.root} {`;
        Object.entries(styles.root).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // Persona container styles
    if (styles.persona) {
        css += `.${DEFAULT_CLASSES.persona} {`;
        Object.entries(styles.persona).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // Avatar styles
    if (styles.avatar) {
        css += `.${DEFAULT_CLASSES.avatar} {`;
        Object.entries(styles.avatar).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // Message styles
    if (styles.message) {
        css += `.${DEFAULT_CLASSES.message} {`;
        Object.entries(styles.message).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // State styles
    ['speaking', 'listening', 'thinking', 'idle'].forEach(state => {
        if (styles[state]) {
            css += `.${DEFAULT_CLASSES[state]} {`;
            Object.entries(styles[state]).forEach(([prop, value]) => {
                css += `${kebabCase(prop)}: ${value};`;
            });
            css += '}\n';
        }
    });
    
    // Update style element content
    styleEl.textContent = css;
}

/**
 * Apply styles to a specific persona
 * @param {string} id - Persona ID
 * @param {Object} styles - Style object
 * @private
 */
function applyPersonaStyles(id, styles) {
    // Create a style element if it doesn't exist
    let styleEl = document.getElementById(`legendary-persona-styles-${id}`);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = `legendary-persona-styles-${id}`;
        document.head.appendChild(styleEl);
    }
    
    // Generate CSS from styles object
    let css = '';
    
    // Persona container styles
    if (styles.container) {
        css += `#persona-container-${id} {`;
        Object.entries(styles.container).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // Avatar styles
    if (styles.avatar) {
        css += `#persona-avatar-${id} {`;
        Object.entries(styles.avatar).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // Message styles
    if (styles.message) {
        css += `#persona-message-${id} {`;
        Object.entries(styles.message).forEach(([prop, value]) => {
            css += `${kebabCase(prop)}: ${value};`;
        });
        css += '}\n';
    }
    
    // Update style element content
    styleEl.textContent = css;
}

/**
 * Helper to convert camelCase to kebab-case
 * @param {string} str - camelCase string
 * @returns {string} - kebab-case string
 * @private
 */
function kebabCase(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

export { personaContainers, DEFAULT_CLASSES }; 
/**
 * VoiceChatController - Manages the voice chat interface and integrates voice services
 */
class VoiceChatController {
    constructor(options = {}) {
        // Core services
        this.voiceInteractionController = null;
        this.personaManager = null;
        
        // DOM elements
        this.elements = {
            container: document.querySelector(options.container || '#voice-chat-container'),
            activateButton: document.querySelector(options.activateButton || '#activate-voice-chat'),
            voiceButton: null, // Will be created dynamically
            messagesContainer: null, // Will be created dynamically
            visualizer: null, // Will be created dynamically
            statusIndicator: null, // Will be created dynamically
            textInput: document.getElementById('text-input'),
            sendButton: document.getElementById('send-button'),
            settingsButton: document.getElementById('settings-button'),
            settingsPanel: document.getElementById('settings-panel'),
            personaSelect: document.getElementById('persona-select'),
            volumeSlider: document.getElementById('volume-slider'),
            errorContainer: document.getElementById('error-container')
        };
        
        // Options
        this.apiKeys = options.apiKeys || {
            deepgram: '',
            elevenlabs: ''
        };
        
        // State
        this.isInitialized = false;
        this.isActive = false;
        this.isListening = false;
        this.isProcessing = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.animationFrame = null;
        this.visualizerData = null;
        this.initialMessageDisplayed = false;
        this.recordingDuration = options.recordingDuration || 15000; // 15 seconds max recording by default
        this.autoStopTimeout = null;
        this.activePersona = options.defaultPersona || 'default';
        this.volume = options.defaultVolume || 0.8;
        
        // Automatically initialize if container exists
        if (this.elements.container) {
            this.initialize();
        }
        
        // Bind methods
        this.onTextInputKeyDown = this.onTextInputKeyDown.bind(this);
        this.onSendButtonClick = this.onSendButtonClick.bind(this);
        this.onVoiceButtonClick = this.onVoiceButtonClick.bind(this);
        this.onSettingsButtonClick = this.onSettingsButtonClick.bind(this);
        this.onPersonaChange = this.onPersonaChange.bind(this);
        this.onVolumeChange = this.onVolumeChange.bind(this);
    }
    
    /**
     * Initialize the voice chat controller
     * @param {Object} options - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        try {
            // Import required modules
            const { VoiceInteractionController } = await import('./voice_interaction_controller.js');
            const { PersonaVoiceManager } = await import('./persona_voice_manager.js');

            // Configure and initialize persona manager
            this.personaManager = new PersonaVoiceManager({
                apiKey: this.apiKeys.elevenlabs,
                onError: this.showError.bind(this)
            });
            
            await this.personaManager.initialize();
            
            // Configure and initialize voice interaction controller
            this.voiceInteractionController = new VoiceInteractionController({
                deepgramApiKey: this.apiKeys.deepgram,
                elevenLabsApiKey: this.apiKeys.elevenlabs,
                personaManager: this.personaManager,
                onReady: () => {
                    console.log('Voice interaction controller ready');
                    this.updateVoiceButtonState(false);
                },
                onListeningStart: () => {
                    this.updateVoiceButtonState(true);
                },
                onListeningStop: () => {
                    this.updateVoiceButtonState(false);
                },
                onTranscript: (transcript) => {
                    if (transcript.trim()) {
                        this.addUserMessage(transcript);
                    }
                },
                onAiResponse: (response) => {
                    this.addAiMessage(response);
                },
                onError: this.showError.bind(this)
            });
            
            await this.voiceInteractionController.initialize();
            
            // Setup UI
            this.setupUI();
            this.populatePersonaDropdown();
            
            this.isInitialized = true;
            console.log('Voice chat controller initialized');
        } catch (error) {
            console.error('Failed to initialize voice chat controller:', error);
            this.showError('Failed to initialize voice chat: ' + error.message);
        }
    }
    
    /**
     * Set up UI elements and event listeners
     */
    setupUI() {
        // Setup text input
        if (this.elements.textInput) {
            this.elements.textInput.addEventListener('keydown', this.onTextInputKeyDown);
        }
        
        // Setup buttons
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', this.onSendButtonClick);
        }
        
        if (this.elements.voiceButton) {
            this.elements.voiceButton.addEventListener('click', this.onVoiceButtonClick);
        }
        
        if (this.elements.settingsButton) {
            this.elements.settingsButton.addEventListener('click', this.onSettingsButtonClick);
        }
        
        // Setup settings controls
        if (this.elements.personaSelect) {
            this.elements.personaSelect.addEventListener('change', this.onPersonaChange);
        }
        
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.addEventListener('input', this.onVolumeChange);
            this.elements.volumeSlider.value = this.volume;
        }
    }
    
    /**
     * Populate the persona dropdown with available personas
     */
    populatePersonaDropdown() {
        if (!this.elements.personaSelect || !this.personaManager) return;
        
        // Clear existing options
        this.elements.personaSelect.innerHTML = '';
        
        // Get available personas from persona manager
        const personas = this.personaManager.getAvailablePersonas();
        
        // Add options for each persona
        personas.forEach(persona => {
            const option = document.createElement('option');
            option.value = persona.id;
            option.textContent = persona.name || persona.id;
            this.elements.personaSelect.appendChild(option);
        });
        
        // Select the active persona
        this.elements.personaSelect.value = this.activePersona;
    }
    
    /**
     * Handle text input keydown event
     * @param {KeyboardEvent} event - The keydown event
     */
    onTextInputKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendTextMessage();
        }
    }
    
    /**
     * Handle send button click event
     */
    onSendButtonClick() {
        this.sendTextMessage();
    }
    
    /**
     * Handle voice button click event
     */
    onVoiceButtonClick() {
        if (!this.voiceInteractionController) {
            this.showError('Voice interaction controller not initialized');
            return;
        }
        
        if (this.voiceInteractionController.isListening) {
            this.voiceInteractionController.stopListening()
                .catch(error => this.showError('Failed to stop listening: ' + error.message));
        } else {
            this.voiceInteractionController.startListening()
                .catch(error => this.showError('Failed to start listening: ' + error.message));
        }
    }
    
    /**
     * Handle settings button click event
     */
    onSettingsButtonClick() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.toggle('show');
        }
    }
    
    /**
     * Handle persona change event
     */
    onPersonaChange(event) {
        this.activePersona = event.target.value;
        if (this.personaManager) {
            this.personaManager.setActivePersona(this.activePersona)
                .catch(error => this.showError('Failed to change persona: ' + error.message));
        }
    }
    
    /**
     * Handle volume change event
     */
    onVolumeChange(event) {
        this.volume = parseFloat(event.target.value);
        if (this.voiceInteractionController) {
            this.voiceInteractionController.setVolume(this.volume);
        }
    }
    
    /**
     * Send a text message
     */
    async sendTextMessage() {
        if (!this.elements.textInput || !this.isInitialized) return;
        
        const text = this.elements.textInput.value.trim();
        if (!text) return;
        
        // Add message to chat
        this.addUserMessage(text);
        
        // Clear input
        this.elements.textInput.value = '';
        
        try {
            // Process message
            const response = await this.processUserInput(text);
            
            // Add AI response
            if (response) {
                this.addAiMessage(response);
            }
        } catch (error) {
            console.error('Failed to process message:', error);
            this.showError('Failed to process message: ' + error.message);
        }
    }
    
    /**
     * Process user input and generate AI response
     * @param {string} text - The user input
     * @returns {Promise<string>} The AI response
     */
    async processUserInput(text) {
        if (!this.voiceInteractionController) {
            throw new Error('Voice interaction controller not initialized');
        }
        
        // In a real implementation, this would call your AI service
        // For demo purposes, we'll just echo the message with some additional text
        const response = `I received your message: "${text}". This is a placeholder response from the ${this.activePersona} persona.`;
        
        // Speak the response using the voice interaction controller
        await this.voiceInteractionController.speak(response, {
            personaType: this.activePersona,
            volume: this.volume
        });
        
        return response;
    }
    
    /**
     * Add a user message to the chat
     * @param {string} text - The message text
     */
    addUserMessage(text) {
        if (!this.elements.messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'voice-chat-message user-message';
        messageElement.innerHTML = `
            <div class="message-content">${text}</div>
            <div class="message-time">${this.formatTime(new Date())}</div>
        `;
        
        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    /**
     * Add an AI message to the chat
     * @param {string} text - The message text
     */
    addAiMessage(text) {
        if (!this.elements.messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'voice-chat-message ai-message';
        messageElement.innerHTML = `
            <div class="message-content">${text}</div>
            <div class="message-time">${this.formatTime(new Date())}</div>
        `;
        
        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    /**
     * Scroll chat to the bottom
     */
    scrollToBottom() {
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }
    }
    
    /**
     * Update the voice button state
     * @param {boolean} isListening - Whether the system is currently listening
     */
    updateVoiceButtonState(isListening) {
        if (!this.elements.voiceButton) return;
        
        if (isListening) {
            this.elements.voiceButton.classList.add('listening');
            this.elements.voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            this.elements.voiceButton.classList.remove('listening');
            this.elements.voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message
     */
    showError(message) {
        if (!this.elements.errorContainer) return;
        
        this.elements.errorContainer.textContent = message;
        this.elements.errorContainer.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            this.elements.errorContainer.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Format time for message timestamps
     * @param {Date} date - The date to format
     * @returns {string} The formatted time
     */
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.voiceInteractionController) {
            this.voiceInteractionController.cleanup();
        }
        
        if (this.personaManager) {
            this.personaManager.cleanup();
        }
        
        // Remove event listeners
        if (this.elements.textInput) {
            this.elements.textInput.removeEventListener('keydown', this.onTextInputKeyDown);
        }
        
        if (this.elements.sendButton) {
            this.elements.sendButton.removeEventListener('click', this.onSendButtonClick);
        }
        
        if (this.elements.voiceButton) {
            this.elements.voiceButton.removeEventListener('click', this.onVoiceButtonClick);
        }
        
        if (this.elements.settingsButton) {
            this.elements.settingsButton.removeEventListener('click', this.onSettingsButtonClick);
        }
        
        if (this.elements.personaSelect) {
            this.elements.personaSelect.removeEventListener('change', this.onPersonaChange);
        }
        
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.removeEventListener('input', this.onVolumeChange);
        }
    }
}

export { VoiceChatController }; 
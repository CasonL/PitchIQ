// Import dependencies
import Config from './config.js';

// State Management Module
const State = {
  // Voice system state
  system: {
    isInitialized: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    hasError: false,
    currentErrorMessage: null,
    supportsSpeechRecognition: false,
    supportsSpeechSynthesis: false
  },
  
  // Recognition settings and state
  recognition: {
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    language: 'en-US',
    lastStartTime: null,
    lastTranscript: '',
    accumulatedTranscript: '',
    currentTranscript: '',
    confidence: 0,
    interruptDetected: false
  },
  
  // Synthesis settings and state
  synthesis: {
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    currentSpeech: null,
    utteranceQueue: [],
    isPlaying: false,
    wasStopped: false,
    useElevenLabs: false,
    elevenLabsVoiceId: null,
    lastSpeechTime: null
  },
  
  // User and conversation data
  conversation: {
    messages: [],
    currentUserMessage: '',
    currentAIMessage: '',
    userWaiting: false,
    totalMessages: 0,
    activeContext: 'general',
    persona: null,
    conversationId: null
  },
  
  // Analytics data
  analytics: {
    sessionStartTime: null,
    totalUserSpeakingTime: 0,
    totalAISpeakingTime: 0,
    interruptions: 0,
    userInterruptions: 0,
    aiInterruptions: 0,
    averageUserConfidence: 0,
    totalTranscriptionConfidence: 0,
    transcriptionCount: 0,
    fillerWordCount: 0,
    recognitionErrors: 0,
    synthesisErrors: 0
  },
  
  // Handle state initialization
  init() {
    // Initialize session analytics
    this.analytics.sessionStartTime = Date.now();
    
    // Check browser support
    this.checkBrowserSupport();
    
    // Generate conversation ID
    this.conversation.conversationId = this.generateConversationId();
    
    // Set initial state
    this.system.isInitialized = true;
    
    if (Config.debug) {
      console.log('State initialized with conversation ID:', this.conversation.conversationId);
    }
    
    return this.system.isInitialized;
  },
  
  // Check browser support for speech APIs
  checkBrowserSupport() {
    // Check for Speech Recognition support
    this.system.supportsSpeechRecognition = 'SpeechRecognition' in window || 
                                         'webkitSpeechRecognition' in window;
    
    // Check for Speech Synthesis support
    this.system.supportsSpeechSynthesis = 'speechSynthesis' in window;
    
    if (Config.debug) {
      console.log('Browser support:', {
        speechRecognition: this.system.supportsSpeechRecognition,
        speechSynthesis: this.system.supportsSpeechSynthesis
      });
    }
  },
  
  // Generate a unique conversation ID
  generateConversationId() {
    return 'convo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  },
  
  // Update system state
  updateSystemState(updates) {
    Object.assign(this.system, updates);
    
    // Broadcast system state change event
    this.broadcastStateChange('system', this.system);
    
    return this.system;
  },
  
  // Update recognition state
  updateRecognitionState(updates) {
    Object.assign(this.recognition, updates);
    
    // Broadcast recognition state change event
    this.broadcastStateChange('recognition', this.recognition);
    
    return this.recognition;
  },
  
  // Update synthesis state
  updateSynthesisState(updates) {
    Object.assign(this.synthesis, updates);
    
    // Broadcast synthesis state change event
    this.broadcastStateChange('synthesis', this.synthesis);
    
    return this.synthesis;
  },
  
  // Update conversation state
  updateConversationState(updates) {
    Object.assign(this.conversation, updates);
    
    // Broadcast conversation state change event
    this.broadcastStateChange('conversation', this.conversation);
    
    return this.conversation;
  },
  
  // Add a message to the conversation history
  addMessage(message) {
    // Create message with timestamp
    const messageWithMeta = {
      ...message,
      timestamp: Date.now(),
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    // Add to conversation
    this.conversation.messages.push(messageWithMeta);
    this.conversation.totalMessages++;
    
    // Update current message reference based on role
    if (message.role === 'user') {
      this.conversation.currentUserMessage = message.content;
      this.conversation.userWaiting = true;
    } else if (message.role === 'assistant') {
      this.conversation.currentAIMessage = message.content;
      this.conversation.userWaiting = false;
    }
    
    // Broadcast message added event
    this.broadcastStateChange('messageAdded', messageWithMeta);
    
    return messageWithMeta;
  },
  
  // Update analytics data
  updateAnalytics(updates) {
    // Special handling for confidence calculation
    if (updates.confidence) {
      this.analytics.totalTranscriptionConfidence += updates.confidence;
      this.analytics.transcriptionCount++;
      this.analytics.averageUserConfidence = 
        this.analytics.totalTranscriptionConfidence / this.analytics.transcriptionCount;
      
      // Remove confidence from updates to prevent double counting
      delete updates.confidence;
    }
    
    // Apply other updates
    Object.assign(this.analytics, updates);
    
    // Broadcast analytics state change event
    this.broadcastStateChange('analytics', this.analytics);
    
    return this.analytics;
  },
  
  // Record an interruption
  recordInterruption(interrupter) {
    this.analytics.interruptions++;
    
    if (interrupter === 'user') {
      this.analytics.userInterruptions++;
    } else if (interrupter === 'ai') {
      this.analytics.aiInterruptions++;
    }
    
    // Set interrupt flag
    this.recognition.interruptDetected = true;
    
    // Broadcast interruption event
    this.broadcastStateChange('interruption', {
      interrupter,
      totalInterruptions: this.analytics.interruptions,
      userInterruptions: this.analytics.userInterruptions,
      aiInterruptions: this.analytics.aiInterruptions
    });
  },
  
  // Get full conversation history (for AI context)
  getConversationHistory() {
    return this.conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  },
  
  // Reset recognition state
  resetRecognitionState() {
    this.recognition.currentTranscript = '';
    this.recognition.accumulatedTranscript = '';
    this.recognition.interruptDetected = false;
    
    return this.recognition;
  },
  
  // Reset conversation state for a new conversation
  resetConversation() {
    this.conversation.messages = [];
    this.conversation.currentUserMessage = '';
    this.conversation.currentAIMessage = '';
    this.conversation.userWaiting = false;
    this.conversation.totalMessages = 0;
    this.conversation.conversationId = this.generateConversationId();
    
    // Broadcast conversation reset event
    this.broadcastStateChange('conversationReset', {
      conversationId: this.conversation.conversationId
    });
    
    return this.conversation;
  },
  
  // Reset all state for a completely fresh start
  resetAll() {
    this.init();
    this.resetRecognitionState();
    this.resetConversation();
    
    // Reset analytics
    this.analytics.totalUserSpeakingTime = 0;
    this.analytics.totalAISpeakingTime = 0;
    this.analytics.interruptions = 0;
    this.analytics.userInterruptions = 0;
    this.analytics.aiInterruptions = 0;
    this.analytics.averageUserConfidence = 0;
    this.analytics.totalTranscriptionConfidence = 0;
    this.analytics.transcriptionCount = 0;
    this.analytics.fillerWordCount = 0;
    this.analytics.recognitionErrors = 0;
    this.analytics.synthesisErrors = 0;
    
    // Broadcast full reset event
    this.broadcastStateChange('fullReset', {
      timestamp: Date.now(),
      conversationId: this.conversation.conversationId
    });
    
    return {
      system: this.system,
      recognition: this.recognition,
      synthesis: this.synthesis,
      conversation: this.conversation,
      analytics: this.analytics
    };
  },
  
  // Broadcast state change event
  broadcastStateChange(type, detail) {
    // Create and dispatch a custom event
    const event = new CustomEvent(`voiceState:${type}Change`, {
      detail,
      bubbles: true
    });
    
    document.dispatchEvent(event);
    
    // Also dispatch a general state change event
    const generalEvent = new CustomEvent('voiceStateChange', {
      detail: {
        type,
        data: detail
      },
      bubbles: true
    });
    
    document.dispatchEvent(generalEvent);
    
    // Log state change if debug mode is enabled
    if (Config.debug) {
      console.log(`State change [${type}]:`, detail);
    }
  },
  
  // Set active persona
  setPersona(persona) {
    this.conversation.persona = persona;
    this.broadcastStateChange('personaChange', persona);
    return persona;
  },
  
  // Get complete state snapshot
  getStateSnapshot() {
    return {
      system: { ...this.system },
      recognition: { ...this.recognition },
      synthesis: { ...this.synthesis },
      conversation: { 
        ...this.conversation,
        // Don't include full message history in snapshot
        messages: this.conversation.messages.length
      },
      analytics: { ...this.analytics }
    };
  }
};

// Export the State module
export default State; 
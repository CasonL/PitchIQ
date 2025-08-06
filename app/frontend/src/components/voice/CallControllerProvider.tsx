// CallControllerProvider.tsx - React component wrapper for call controller
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
// Import DirectAudioManager with provided type declaration file
// Use type assertions to handle potential missing module
type DirectAudioManagerType = any; // Fallback type if import fails
let DirectAudioManager: DirectAudioManagerType;
try {
  // Attempt dynamic import for better error handling
  DirectAudioManager = require('./DirectAudioManager').DirectAudioManager;
} catch (e) {
  console.warn('DirectAudioManager module not found, using placeholder');
  // Provide fallback implementation if module not found
  DirectAudioManager = class MockDirectAudioManager {
    constructor(config: any) {}
    cleanup() {}
    // Add other required methods
  };
}
import { WebSocketManager } from './WebSocketManager';
import { CallMonitoring } from './CallMonitoring';
import { VoiceSelector } from './VoiceSelector';
import { PersonaData } from './DualVoiceAgentFlow';
import { Persona } from '../../types/persona';
import { ProspectCallEventBus } from './ProspectCallEventBus';
import { ProspectCallState, initialCallState, prospectCallReducer, ProspectCallAction } from './ProspectCallState';

// Define a union type that can be either Persona or PersonaData
type PersonaType = Persona | PersonaData;

// Generate a unique session ID
const generateSessionId = (persona: PersonaType): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${persona.name.replace(/\s+/g, '_')}_${timestamp}_${random}`;
};

// Helper function to safely get voiceId from either Persona or PersonaData
const getVoiceId = (persona: PersonaType): string => {
  // For Persona type (backend model)
  if ('voice_id' in persona && typeof persona.voice_id === 'string') {
    return persona.voice_id;
  }
  
  // For any object with voiceId property (frontend model)
  if (persona && typeof persona === 'object' && 'voiceId' in persona && 
      persona.voiceId && typeof persona.voiceId === 'string') {
    return persona.voiceId;
  }
  
  // Default voice ID if none found
  return 'default';
};

// Adapter function to convert PersonaData to Persona or pass through Persona
const adaptPersonaData = (personaData: PersonaData | Persona): Persona => {
  // Check if personaData already has the necessary Persona properties
  if ('id' in personaData && 
      'description_narrative' in personaData && 
      Array.isArray(personaData.personality_traits)) {
    return personaData as unknown as Persona;
  }
  
  // Handle personality_traits conversion from string to string[]
  let personalityTraits: string[] = [];
  
  if (personaData.personality_traits) {
    if (typeof personaData.personality_traits === 'string') {
      // Split string by commas and trim whitespace
      personalityTraits = personaData.personality_traits
        .split(',')
        .map(trait => trait.trim())
        .filter(trait => trait.length > 0);
    } else if (Array.isArray(personaData.personality_traits)) {
      personalityTraits = personaData.personality_traits;
    }
  }
  
  // If no traits provided, add default lively traits
  if (personalityTraits.length === 0) {
    personalityTraits = ['curious', 'passionate', 'straightforward'];
  }
  
  // Ensure all traits are strings before filtering
  const stringTraits = personalityTraits.map(trait => String(trait));
  
  // Remove any "analytical" traits as per memory
  const filteredTraits = stringTraits.filter(trait => 
    !trait.toLowerCase().includes('analytical') &&
    !trait.toLowerCase().includes('measured') && 
    !trait.toLowerCase().includes('deliberate')
  );
  
  // Replace "analytical" with "thoughtful" in traits
  const transformedTraits = filteredTraits.map(trait => 
    trait.toLowerCase().includes('analytical') ? 
    trait.replace(/analytical/gi, 'thoughtful') : trait
  );
  
  // Final sanitized personality traits array
  personalityTraits = transformedTraits;
  
  // Create a compatible Persona object with default values for missing fields
  const compatiblePersona: Persona = {
    id: `persona_${Date.now()}`,
    name: personaData.name || 'Unknown',
    role: personaData.role || 'Unknown',
    company: personaData.company || 'Unknown',
    description_narrative: 'id' in personaData && 'description_narrative' in personaData 
      ? (personaData as Persona).description_narrative 
      : ((personaData as PersonaData).about_person || ''),
    personality_traits: personalityTraits,
    // Copy other fields that might be useful
    base_reaction_style: 'communication_style' in personaData 
      ? (typeof (personaData as PersonaData).communication_style === 'string' 
        ? (personaData as PersonaData).communication_style as string 
        : '') 
      : '',
    // Handle voice_id safely - use type assertion since we know it might exist
    voice_id: 'voice_id' in personaData ? (personaData as Persona).voice_id : (personaData as any).voice_id
  };
  
  return compatiblePersona;
};

// Define log level type
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Create context for call controller
export interface CallControllerContextValue {
  state: ProspectCallState;
  startCall: (persona: PersonaType, sessionId?: string) => Promise<void>;
  switchPersona: (newPersona: PersonaType, systemPrompt?: string) => Promise<void>;
  endCall: () => void;
  cleanup: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  transcript: string;
  error: Error | null;
}

// Define action type for reducer
type CallAction = 
  | { type: 'CALL_INIT'; persona: Persona }
  | { type: 'CALL_STARTING' }
  | { type: 'CALL_CONNECTED' }
  | { type: 'CALL_DISCONNECTING' } 
  | { type: 'CALL_DISCONNECTED' }
  | { type: 'CALL_ENDING' }
  | { type: 'PERSONA_SWITCHING'; newPersona: Persona }
  | { type: 'PERSONA_SWITCHED'; newPersona: Persona } 
  | { type: 'RECONNECT_ATTEMPT' }
  | { type: 'CALL_ERROR'; error: Error };

// Create context for call controller
const CallControllerContext = createContext<CallControllerContextValue | null>(null);

// Provider component props
interface CallControllerProviderProps {
  persona: PersonaType;
  onTranscriptUpdate: (text: string) => void;
  children: React.ReactNode;
}

// Main component implementation
export function CallControllerProvider({ 
  persona, 
  onTranscriptUpdate,
  children 
}: CallControllerProviderProps): JSX.Element {
  // State management using useState
  const [state, setState] = useState<ProspectCallState>(initialCallState);
  
  // Refs for managers
  const audioManager = useRef<typeof DirectAudioManager | null>(null);
  const wsManager = useRef<WebSocketManager | null>(null);
  const monitoring = useRef<CallMonitoring>(CallMonitoring.getInstance());
  const eventBus = useRef<ProspectCallEventBus>(ProspectCallEventBus.getInstance());
  
  // Session tracking
  const activeSessionId = useRef<string | null>(null);
  
  // Call timing
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<number | null>(null);
  
  // Connection state
  const isIntentionalTermination = useRef<boolean>(false);
  
  // Reducer for state management
  const [, dispatch] = useReducer(prospectCallReducer, initialCallState);
  
  // Logging helper with log level and structured output
  const log = useCallback((message: string, level: LogLevel = 'info') => {
    const timestamp = new Date().toISOString();
    const sessionId = activeSessionId.current || 'no_session';
    const formattedMessage = `${timestamp} [${level.toUpperCase()}] [${sessionId}] ${message}`;
    
    console[level](formattedMessage);
    
    if (level === 'error' || level === 'warn') {
      // Use public logging pattern instead of private API
      console[level](`[MONITOR][${sessionId}][${level.toUpperCase()}] ${message}`);
    }
  }, []);
  
  // Create a reusable cleanup function to ensure consistent resource management
  const createCleanupFunction = useCallback(() => {
    return function cleanup() {
      const currentSessionId = activeSessionId.current;
      log(`🧹 Running cleanup for session ${currentSessionId || 'unknown'}`, 'info');
      
      // Clear duration interval if running
      if (durationInterval.current) {
        window.clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      
      // Clean up WebSocketManager with explicit session ID tracking
      if (wsManager.current) {
        try {
          log(`🔌 Terminating WebSocket connection for session ${currentSessionId || 'unknown'}`, 'info');
          
          // Use terminate method which does proper cleanup
          wsManager.current.terminate(true);
          wsManager.current = null;
        } catch (error) {
          log(`❌ Error during WebSocket cleanup: ${error}`, 'error');
        }
      }
      
      // Clean up AudioManager
      if (audioManager.current) {
        try {
          log(`🎤 Cleaning up AudioManager for session ${currentSessionId || 'unknown'}`, 'info');
          audioManager.current.cleanup();
          audioManager.current = null;
        } catch (error) {
          log(`❌ Error during AudioManager cleanup: ${error}`, 'error');
        }
      }
      
      // Clear active session ID only if it matches the one being cleaned up
      if (activeSessionId.current === currentSessionId) {
        log(`🆔 Clearing session ID: ${currentSessionId}`, 'info');
        activeSessionId.current = null;
      } else if (currentSessionId && activeSessionId.current !== currentSessionId) {
        log(`⚠️ Not clearing session ID ${activeSessionId.current} because it differs from cleanup session ${currentSessionId}`, 'warn');
      }
      
      // Update state
      setState(initialCallState);
      dispatch({ type: 'CALL_DISCONNECTING' });
      
      // Log success to monitoring system using public method
      if (monitoring.current) {
        console.info(`[MONITOR] Session ${currentSessionId}: Cleanup completed successfully`);
      }
    };
  }, [log, dispatch]);
  
  // Create the cleanup function once to use throughout the component
  const cleanup = useCallback(createCleanupFunction(), [createCleanupFunction]);
  
  // Handle WebSocket messages and update transcript
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'transcript') {
      const transcriptText = message.text || '';
      dispatch({ type: 'UPDATE_TRANSCRIPT', text: transcriptText } as ProspectCallAction);
      onTranscriptUpdate(transcriptText);
    }
  }, [onTranscriptUpdate, dispatch]);
  
  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: Error) => {
    log(`❌ WebSocket error: ${error.message}`, 'error');
    dispatch({ type: 'CALL_ERROR', error } as ProspectCallAction);
  }, [log, dispatch]);
  
  // End call function
  const endCall = useCallback(() => {
    log(`📞 Ending call`, 'info');
    cleanup();
  }, [cleanup, log]);
  
  // Switch persona function - leverages WebSocketManager's new switchPersona capability
  const switchPersona = useCallback(async (newPersonaData: PersonaType, systemPrompt?: string): Promise<void> => {
    if (!wsManager.current || !wsManager.current.isActive()) {
      log(`⚠️ Cannot switch persona - not connected`, 'warn');
      return;
    }
    
    try {
      log(`🔄 Switching persona to ${newPersonaData.name}`, 'info');
      dispatch({ type: 'PERSONA_SWITCHING', newPersona: adaptPersonaData(newPersonaData) } as ProspectCallAction);
      
      // Adapt the new persona data
      const adaptedNewPersona = adaptPersonaData(newPersonaData);
      
      // Select voice for new persona using VoiceSelector's static method
      // First handle the case where it might return a Promise
      // Switch to new voice and persona with async support
      const voiceResult = VoiceSelector.selectVoiceForPersona(adaptedNewPersona);
      
      // Handle both synchronous and asynchronous voice selection results
      let voice: string;
      
      if (voiceResult instanceof Promise) {
        // Handle async case - await the promise
        voice = await voiceResult;
        log(`🔊 Async selected voice for switch: ${voice} for persona ${adaptedNewPersona.name}`, 'info');
      } else {
        // Handle synchronous case - direct assignment
        voice = voiceResult;
        log(`🔊 Selected voice for switch: ${voice} for persona ${adaptedNewPersona.name}`, 'info');
      }
      
      // Explicitly assign the selected voice to the persona for use in WebSocketManager
      adaptedNewPersona.voice_id = voice;
      
      log(`🔊 Selected voice ID: ${voice} for new persona ${adaptedNewPersona.name}`, 'info');
      
      // Use WebSocketManager's switchPersona method
      const success = await wsManager.current.switchPersona(adaptedNewPersona, systemPrompt);
      
      if (success) {
        log(`✅ Successfully switched to persona ${adaptedNewPersona.name}`, 'info');
        dispatch({ type: 'PERSONA_SWITCHED', newPersona: adaptedNewPersona } as ProspectCallAction);
      } else {
        log(`❌ Failed to switch to persona ${adaptedNewPersona.name}`, 'error');
      }
    } catch (error) {
      log(`❌ Error during persona switch: ${error}`, 'error');
    }
  }, [wsManager, dispatch, log]);
  
  // Start call function with session ID management
  const startCall = useCallback(async (personaData: PersonaType, sessionId?: string) => {
    try {
      log(`📞 Starting call for ${personaData.name}`, 'info');
      
      // If a call is already active, use switchPersona instead of creating a new connection
      if (wsManager.current && wsManager.current.isActive()) {
        log(`ℹ️ Call already active, switching persona instead of creating new connection`, 'info');
        return await switchPersona(personaData);
      }
      
      // Clean up any existing call first
      cleanup();
      
      // Generate a new session ID or use the provided one
      // This enhances our tracking and allows reconnection with the same ID
      const stableSessionId = sessionId || generateSessionId(personaData);
      activeSessionId.current = stableSessionId;
      
      log(`🆔 Using session ID: ${stableSessionId}`, 'info');
      
      // Adapt persona data if needed
      const adaptedPersona = adaptPersonaData(personaData);
      
      // Update state
      callStartTime.current = Date.now();
      dispatch({ type: 'CALL_INIT', persona: adaptedPersona } as ProspectCallAction);
      
      // Initialize managers with the stable session ID
      log(`🔊 Initializing DirectAudioManager for session ${stableSessionId}`, 'info');
      audioManager.current = new DirectAudioManager({
        sessionId: stableSessionId,
        onAudioData: (audioData: Float32Array) => {
          // This will be handled by WebSocketManager after initialization
          if (wsManager.current) {
            wsManager.current.sendAudioData(audioData);
          }
        },
        onAudio: (audioData) => {
          if (audioManager.current) {
            // Pass the raw audio buffer directly to DirectAudioManager's processTTS method
            // without corrupting it with Float32Array conversion
            audioManager.current.processTTS(audioData);
          }
        },
        log: (message, level) => log(message, level as LogLevel)
      });
      
      // Select voice for persona using VoiceSelector's static method with async handling
      // This ensures we get a proper Deepgram voice ID based on gender
      const voiceIdResult = VoiceSelector.selectVoiceForPersona(adaptedPersona);
      
      // Handle both synchronous and asynchronous voice selection results
      let voiceId: string;
      
      if (voiceIdResult instanceof Promise) {
        // Handle async case - await the promise
        voiceId = await voiceIdResult;
        log(`🔊 Async selected voice ID: ${voiceId} for persona ${adaptedPersona.name}`, 'info');
      } else {
        // Handle synchronous case - direct assignment
        voiceId = voiceIdResult;
        log(`🔊 Selected voice ID: ${voiceId} for persona ${adaptedPersona.name}`, 'info');
      }
      
      // Explicitly assign the selected voice to the persona for use in WebSocketManager
      adaptedPersona.voice_id = voiceId;
      
      log(`🔌 Initializing SDK-based WebSocketManager for session ${stableSessionId}`, 'info');
      
      // Reset intentional termination flag before initializing new connection
      isIntentionalTermination.current = false;
      
      // Fetch token for Deepgram SDK
      const response = await fetch('/api/deepgram/token');
      const data = await response.json();
      
      if (!data.key) {
        throw new Error('No Deepgram token found');
      }
      
      log(`🔑 Deepgram token fetched successfully for session ${stableSessionId}`, 'debug');
      
      // Initialize WebSocketManager with the stable session ID and SDK approach
      wsManager.current = new WebSocketManager({
        sessionId: stableSessionId, // Explicitly use stable ID
        token: data.key,
        personaName: adaptedPersona.name,
        personaData: adaptedPersona,
        userName: 'Sales Representative', // Default user name
        onOpen: () => {
          // Use the closure variable to ensure consistent session ID
          log(`🔌 WebSocket opened for session ${stableSessionId}`, 'info');
        },
        onClose: (wasClean, code, reason) => {
          // Use the closure variable to ensure consistent session ID
          log(`🔌 WebSocket closed for session ${stableSessionId} with code: ${code} ${reason ? `reason: ${reason}` : ''}`, 'info');
          
          // Check if the current active session ID matches the one being closed
          if (activeSessionId.current !== stableSessionId) {
            log(`⚠️ Ignoring WebSocket close event for old session ${stableSessionId}. Current active session is ${activeSessionId.current || 'none'}`, 'warn');
            return; // Don't process close events for old sessions
          }
          
          // Only handle as disconnection if it wasn't an intentional termination
          if (!isIntentionalTermination.current) {
            log(`🔌 Unintentional disconnect detected for session ${stableSessionId}`, 'warn');
            dispatch({ type: 'CALL_DISCONNECTED' });
          } else {
            log(`✅ Clean termination confirmed for session ${stableSessionId}`, 'info');
            // Reset the flag after handling the intentional termination
            isIntentionalTermination.current = false;
          }
        },
        onError: (error) => {
          handleWebSocketError(error);
        },
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            handleWebSocketMessage({ type: 'transcript', text });
          }
        },
        onAudio: (audioData) => {
          if (audioManager.current) {
            // Pass the raw audio buffer directly to DirectAudioManager's processTTS method
            // without corrupting it with Float32Array conversion
            audioManager.current.processTTS(audioData);
          }
        },
        onPersonaChanged: (newPersona) => {
          // Handle persona change events
          log(`👤 Persona changed to ${newPersona.name}`, 'info');
          dispatch({ type: 'PERSONA_SWITCHED', newPersona: adaptPersonaData(newPersona) } as ProspectCallAction);
        },
        log: (message, level) => {
          log(message, level as LogLevel);
        }
      });
      
      // Connect to Deepgram using the stable session ID
      log(`🔌 Starting connection process for session ${stableSessionId}`, 'info');
      await wsManager.current.connect();
      
      // Double-check that the session ID in the WebSocketManager matches our stable ID
      if (wsManager.current && wsManager.current.getSessionId() !== stableSessionId) {
        log(`⚠️ Session ID mismatch detected: expected ${stableSessionId}, got ${wsManager.current.getSessionId()}`, 'warn');
        // Update the session ID in the WebSocketManager
        wsManager.current.updateSessionId(stableSessionId);
      }
      
      // Note: With the SDK-based approach, we don't need to send a greeting message
      // The AI will start speaking automatically after the agent.start() is called in WebSocketManager
      log(`👋 AI will initiate conversation automatically for ${personaData.name}`, 'info');
      
    } catch (error) {
      log(`❌ Error starting call: ${error}`, 'error');
      dispatch({ type: 'CALL_ERROR', error: error as Error });
      cleanup();
      throw error;
    }
  }, [handleWebSocketMessage, handleWebSocketError, cleanup, dispatch, log, state.status]);
  
  // Clean up resources on component unmount
  useEffect(() => {
    return () => {
      log(`🧹 Component unmounting, cleaning up resources`, 'info');
      cleanup();
    };
  }, [cleanup, log]);
  
  // Listen for beforeunload event
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup]);
  
  // Automatic reconnection with enhanced session ID management
  useEffect(() => {
    if (state.status === 'error' && state.reconnectAttempts < 3) {
      const timer = setTimeout(() => {
        // Store the current session ID for logging purposes
        const oldSessionId = activeSessionId.current;
        const currentPersona = state.persona || persona;
        
        log(`🔄 Initiating reconnection (attempt ${state.reconnectAttempts + 1}/3)${oldSessionId ? ` after session ${oldSessionId}` : ''}`, 'info');
        
        dispatch({ type: 'RECONNECT_ATTEMPT' } as ProspectCallAction);
        
        // Wait briefly to ensure cleanup completes before starting new connection
        setTimeout(async () => {
          try {
            // If WebSocketManager is still active, try persona switching first before full reconnect
            if (wsManager.current && wsManager.current.isActive()) {
              log(`🔄 Connection still active, attempting to reconfigure existing connection`, 'info');
              
              try {
                // Try updating system prompt on existing connection
                const systemPrompt = `This is a reconnection attempt. Please acknowledge and continue the conversation naturally.`;
                await wsManager.current.updateSystemPrompt(systemPrompt);
                log(`✅ Successfully reconfigured existing connection without full reconnect`, 'info');
                return;
              } catch (error) {
                log(`⚠️ Failed to reconfigure existing connection, proceeding with full reconnect`, 'warn');
              }
            }
            
            // Full reconnection path
            cleanup();
            
            // Generate a fresh session ID for the new connection
            const newSessionId = generateSessionId(currentPersona);
            log(`🆔 Generated fresh session ID for reconnection: ${newSessionId}`, 'info');
            
            // Wait a bit more for cleanup to fully complete
            setTimeout(async () => {
              try {
                // Start the call with the persona and new session ID
                await startCall(currentPersona, newSessionId);
              } catch (error) {
                log(`❌ Error during reconnection attempt: ${error}`, 'error');
              }
            }, 500); // Wait 500ms after cleanup before starting new connection
          } catch (error) {
            log(`❌ Error during reconnection setup: ${error}`, 'error');
          }
        }, 500); // Wait 500ms for cleanup
        
      }, 2000 * Math.pow(2, state.reconnectAttempts)); // Exponential backoff
      
      // Cleanup the timer
      return () => clearTimeout(timer);
    }
  }, [state.status, state.reconnectAttempts, cleanup, log, startCall, persona, state.persona]);
  
  // Create context value
  const contextValue: CallControllerContextValue = {
    state,
    startCall,
    switchPersona,
    endCall,
    cleanup,
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    callDuration: state.callDuration,
    transcript: state.transcript,
    error: state.lastError
  };
  
  return (
    <CallControllerContext.Provider value={contextValue}>
      {children}
    </CallControllerContext.Provider>
  );
}

// Custom hook to use the call controller context
export function useCallController() {
  const context = useContext(CallControllerContext);
  if (!context) {
    throw new Error('useCallController must be used within a CallControllerProvider');
  }
  return context;
}

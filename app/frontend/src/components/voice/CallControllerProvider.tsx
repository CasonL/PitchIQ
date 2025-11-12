// CallControllerProvider.tsx - React component wrapper for call controller
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
// Import DirectAudioManager with proper ES6 import
import { DirectAudioManager } from './DirectAudioManager';

// Fallback implementation if needed
class MockDirectAudioManager {
  constructor(config: any) {
    console.warn('Using mock DirectAudioManager - audio playback disabled');
  }
  
  initSpeaker() {}
  requestMicrophone(): Promise<MediaStream> {
    return Promise.reject(new Error('Mock audio manager - no microphone'));
  }
  setupAudioProcessing(): Promise<void> {
    return Promise.resolve();
  }
  processTTS(payload: any): void {
    // Mock implementation - just log that audio would be played
    console.log('Mock processTTS called - audio playback disabled');
  }
  cleanup() {}
}
import { WebSocketManager } from './WebSocketManager';
import { CallMonitoring } from './CallMonitoring';
import { VoiceSelector } from './VoiceSelector';
import { PersonaData } from './DualVoiceAgentFlow';
import { Persona } from '../../types/persona';
import { ProspectCallEventBus } from './ProspectCallEventBus';
import { ProspectCallState, initialCallState, prospectCallReducer, ProspectCallAction } from './ProspectCallState';
import type { BehaviorUpdate } from '../../services/ProspectScoringService';
import { useProspectScoring } from './useProspectScoring';
import { useScenarioStream } from '../../hooks/useScenarioStream';
import { useTerminationGuard, TerminationUIState } from './useTerminationGuard';

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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

// TerminationUIState type is imported from useTerminationGuard

// Create context for call controller
export interface CallControllerContextValue {
  state: ProspectCallState;
  startCall: (persona: PersonaType, sessionId?: string) => Promise<void>;
  switchPersona: (newPersona: PersonaType, systemPrompt?: string) => Promise<void>;
  endCall: () => void;
  cleanup: () => void;
  applyBehaviorHints: (scores: { rapport: number; trust: number; interest: number }) => void;
  injectAgentMessage: (text: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  transcript: string;
  error: Error | null;
  getTerminationUIState: () => TerminationUIState;
}

// (Using ProspectCallAction from ProspectCallState.ts)

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
  // State management using useReducer
  const [state, dispatch] = useReducer(prospectCallReducer, initialCallState);
  
  // Refs for managers
  const audioManager = useRef<DirectAudioManager | null>(null);
  const wsManager = useRef<WebSocketManager | null>(null);
  const monitoring = useRef<CallMonitoring>(CallMonitoring.getInstance());
  const eventBus = useRef<ProspectCallEventBus>(ProspectCallEventBus.getInstance());
  const scenario = useScenarioStream();
  const audioUnlockedRef = useRef<boolean>(false);
  
  // Session tracking
  const activeSessionId = useRef<string | null>(null);
  
  // Call timing
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<number | null>(null);
  // Inactivity tracking (auto-end after 90s of silence)
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityCheckTimer = useRef<number | null>(null);
  const maxDurationTimer = useRef<number | null>(null);
  
  // Connection state
  const isIntentionalTermination = useRef<boolean>(false);
  // Termination handled via useTerminationGuard
  
  // Reducer is initialized above with full state
  
  // Logging helper with log level and structured output
  const log = useCallback((message: string, level: LogLevel = 'info') => {
    const timestamp = new Date().toISOString();
    const sessionId = activeSessionId.current || 'no_session';
    const formattedMessage = `${timestamp} [${level.toUpperCase()}] [${sessionId}] ${message}`;
    
    // Safe console logging with fallback
    try {
      if (level === 'debug') {
        console.debug(formattedMessage);
      } else if (level === 'info') {
        console.info(formattedMessage);
      } else if (level === 'warn') {
        console.warn(formattedMessage);
      } else if (level === 'error') {
        console.error(formattedMessage);
      } else {
        console.log(formattedMessage); // fallback
      }
    } catch (e) {
      console.log(formattedMessage); // ultimate fallback
    }
    
    if (level === 'error' || level === 'warn') {
      // Use safe logging for monitor messages too
      try {
        if (level === 'error') {
          console.error(`[MONITOR][${sessionId}][${level.toUpperCase()}] ${message}`);
        } else {
          console.warn(`[MONITOR][${sessionId}][${level.toUpperCase()}] ${message}`);
        }
      } catch (e) {
        console.log(`[MONITOR][${sessionId}][${level.toUpperCase()}] ${message}`);
      }
    }
  }, []);
  
  // Initialize prospect scoring hook (requires log)
  const {
    scoringServiceRef,
    setBehaviorUpdateHandler,
    initSession,
    restartForPersonaSwitch,
    endScoringSession,
    addTurnMessage,
  } = useProspectScoring({ log });
  
  // Initialize termination guard (uses cleanupRef indirection to avoid circular dependency)
  const cleanupRef = useRef<() => void>(() => {});
  const {
    checkForAICallTermination,
    getTerminationUIState,
    startTerminationPolling,
    resetTermination,
  } = useTerminationGuard({
    log,
    wsManagerRef: wsManager,
    scoringServiceRef: scoringServiceRef as unknown as React.MutableRefObject<{ checkAICallTermination: () => Promise<any> } | null>,
    callStartTimeRef: callStartTime,
    isIntentionalTerminationRef: isIntentionalTermination,
    endCall: () => cleanupRef.current?.(),
  });

  // Create a reusable cleanup function to ensure consistent resource management
  const createCleanupFunction = useCallback(() => {
    return function cleanup() {
      const currentSessionId = activeSessionId.current;
      log(`🧹 Running cleanup for session ${currentSessionId || 'unknown'}`, 'info');

      // Stop scenario SSE and end remote session
      try {
        scenario.stop(true);
      } catch {}
      
      // Clear duration interval if running
      if (durationInterval.current) {
        window.clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop scenario SSE and end remote session
      try {
        scenario.end();
      } catch (error) {
        log(`Error ending scenario stream: ${error}`, 'warn');
      }
      
      // Clear inactivity check timer
      if (inactivityCheckTimer.current) {
        clearInterval(inactivityCheckTimer.current);
        inactivityCheckTimer.current = null;
      }
      
      // Clear max duration timer
      if (maxDurationTimer.current) {
        clearTimeout(maxDurationTimer.current);
        maxDurationTimer.current = null;
      }
      
      // Clean up WebSocketManager with explicit session ID tracking
      if (wsManager.current) {
        try {
          log(`Terminating WebSocket connection for session ${currentSessionId || 'unknown'}`, 'info');
          
          // Use terminate method which does proper cleanup
          wsManager.current.terminate(true);
          wsManager.current = null;
        } catch (error) {
          log(`❌ Error during WebSocket cleanup: ${error}`, 'error');
        }
      }
      
      // Clean up AudioManager with extended cleanup for resource conflicts
      if (audioManager.current) {
        try {
          log(`🎤 Cleaning up AudioManager for session ${currentSessionId || 'unknown'}`, 'info');
          audioManager.current.cleanup();
          audioManager.current = null;
          
          // Force additional audio resource cleanup to prevent conflicts
          setTimeout(() => {
            // Ensure all audio contexts are properly closed
            try {
              const contexts = (window as any).__audioContexts || [];
              contexts.forEach((ctx: AudioContext) => {
                if (ctx.state !== 'closed') {
                  ctx.close().catch(() => {});
                }
              });
            } catch {}
          }, 100);
        } catch (error) {
          log(`❌ Error during AudioManager cleanup: ${error}`, 'error');
        }
      }

      // End scoring session if active
      try {
        log(`📊 Ending prospect scoring session`, 'info');
        endScoringSession();
      } catch (error) {
        log(`❌ Error ending scoring session: ${error}`, 'error');
      }
      
      // Clear active session ID only if it matches the one being cleaned up
      if (activeSessionId.current === currentSessionId) {
        log(`🆔 Clearing session ID: ${currentSessionId}`, 'info');
        activeSessionId.current = null;
      } else if (currentSessionId && activeSessionId.current !== currentSessionId) {
        log(`⚠️ Not clearing session ID ${activeSessionId.current} because it differs from cleanup session ${currentSessionId}`, 'warn');
      }
      
      // Update state
      dispatch({ type: 'CALL_DISCONNECTED' } as ProspectCallAction);
      
      // Log success to monitoring system using public method
      if (monitoring.current) {
        console.info(`[MONITOR] Session ${currentSessionId}: Cleanup completed successfully`);
      }
    };
  }, [log, dispatch, resetTermination]);
  
  // Create the cleanup function once to use throughout the component
  const cleanup = useCallback(createCleanupFunction(), [createCleanupFunction]);
  
  // Keep cleanupRef in sync with latest cleanup function
  cleanupRef.current = cleanup;

  // Handle WebSocket messages and update transcript
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'transcript') {
      const transcriptText = message.text || '';
      dispatch({ type: 'UPDATE_TRANSCRIPT', text: transcriptText } as ProspectCallAction);
      onTranscriptUpdate(transcriptText);
      // Any transcript activity counts as activity
      lastActivityRef.current = Date.now();
      // Forward transcript as observation to ScenarioService (only final transcripts are forwarded)
      try {
        scenario.observe(transcriptText, 'seller');
      } catch {}
    }
  }, [onTranscriptUpdate, dispatch]);
  
  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: Error) => {
    log(`❌ WebSocket error: ${error.message}`, 'error');
    dispatch({ type: 'CALL_ERROR', error } as ProspectCallAction);
  }, [log, dispatch]);
  
  // Forward finalized, role-labeled turns to scoring
  const handleTurn = useCallback(async (turn: { role: 'ai' | 'user'; text: string; timestamp?: number }) => {
    await addTurnMessage(turn);
    // Any finalized turn counts as activity
    lastActivityRef.current = Date.now();
  }, [addTurnMessage]);

  // End call function
  const endCall = useCallback(() => {
    log(`📞 Ending call`, 'info');
    cleanup();
  }, [cleanup, log]);

  // Termination checking and UI state provided by useTerminationGuard
  
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
      
      // Resolve both sync/async results consistently
      const voice: string = await Promise.resolve(voiceResult as any);
      log(`🔊 Selected voice for switch: ${voice} for persona ${adaptedNewPersona.name}`, 'info');
      
      // Explicitly assign the selected voice to the persona for use in WebSocketManager
      adaptedNewPersona.voice_id = voice;
      
      log(`🔊 Selected voice ID: ${voice} for new persona ${adaptedNewPersona.name}`, 'info');
      
      // Use WebSocketManager's switchPersona method
      const success = await wsManager.current.switchPersona(adaptedNewPersona, systemPrompt);
      
      if (success) {
        log(`✅ Successfully switched to persona ${adaptedNewPersona.name}`, 'info');
        dispatch({ type: 'PERSONA_SWITCHED', newPersona: adaptedNewPersona } as ProspectCallAction);

        // Restart scoring session for new persona (same session id)
        const currentSessionId = activeSessionId.current;
        if (currentSessionId) {
          try {
            setBehaviorUpdateHandler((update: BehaviorUpdate) => {
              if (update?.scores) {
                applyBehaviorHints(update.scores);
              }
            });
            const personaId = ('id' in newPersonaData && (newPersonaData as any).id) ? (newPersonaData as any).id : adaptedNewPersona.name;
            await restartForPersonaSwitch(String(personaId), currentSessionId);
          } catch (error) {
            log(`⚠️ Failed to restart scoring session on persona switch: ${error}`, 'warn');
          }
        }
      } else {
        log(`❌ Failed to switch to persona ${adaptedNewPersona.name}`, 'error');
      }
    } catch (error) {
      log(`❌ Error during persona switch: ${error}`, 'error');
    }
  }, [wsManager, dispatch, log]);

  // Expose behavior hints application early to avoid TDZ in later hooks
  const applyBehaviorHints = useCallback((scores: { rapport: number; trust: number; interest: number }) => {
    if (!wsManager.current || !wsManager.current.isActive()) return;
    try {
      wsManager.current.applyBehaviorHints(scores);
    } catch (e) {
      log(`⚠️ applyBehaviorHints error: ${e}`, 'warn');
    }
  }, [log]);
  
  // Inject agent message for TTS-only playback (used for controlled dialogue like Marcus)
  const injectAgentMessage = useCallback((text: string) => {
    if (!wsManager.current) {
      log('⚠️ Cannot inject message - WebSocket manager not initialized', 'warn');
      return;
    }
    if (!wsManager.current.isActive()) {
      log('⚠️ Cannot inject message - WebSocket not connected', 'warn');
      return;
    }
    try {
      log(`💉 Injecting message: "${text.substring(0, 50)}..."`, 'info');
      wsManager.current.injectAgentMessage(text);
    } catch (e) {
      log(`❌ Message injection failed: ${e}`, 'error');
    }
  }, [log]);

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
      log(`🧹 About to run cleanup before starting new call`, 'info');
      cleanup();
      log(`✅ Cleanup completed, proceeding with call initialization`, 'info');
      
      // Generate a new session ID or use the provided one
      // This enhances our tracking and allows reconnection with the same ID
      log(`🔄 Generating session ID...`, 'info');
      const stableSessionId = sessionId || generateSessionId(personaData);
      activeSessionId.current = stableSessionId;
      
      log(`🆔 Using session ID: ${stableSessionId}`, 'info');
      
      // Adapt persona data if needed
      log(`🔄 Adapting persona data...`, 'info');
      const adaptedPersona = adaptPersonaData(personaData);
      log(`✅ Persona data adapted for: ${adaptedPersona.name}`, 'info');
      
      // Update state
      callStartTime.current = Date.now();
      // Initialize state with persona first, then mark connecting to avoid status reset
      dispatch({ type: 'CALL_INIT', persona: adaptedPersona } as ProspectCallAction);
      dispatch({ type: 'CALL_CONNECTING', sessionId: stableSessionId } as ProspectCallAction);
      
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
        log: (message, level) => log(message, level as LogLevel)
      });
      // Best effort: unlock speaker right away (may still require a user gesture)
      try { await (audioManager.current as any).unlockAudio?.(); } catch {}
      
      // Select voice for persona using VoiceSelector's static method with async handling
      // This ensures we get a proper Deepgram voice ID based on gender
      const voiceIdResult = VoiceSelector.selectVoiceForPersona(adaptedPersona);
      
      // Resolve both sync/async results consistently
      const voiceId: string = await Promise.resolve(voiceIdResult as any);
      log(`🔊 Selected voice ID: ${voiceId} for persona ${adaptedPersona.name}`, 'info');
      
      // Explicitly assign the selected voice to the persona for use in WebSocketManager
      adaptedPersona.voice_id = voiceId;
      // Store selected voice in state
      try {
        dispatch({ type: 'SET_VOICE', voice: voiceId } as ProspectCallAction);
      } catch {}
      
      log(`🔌 Initializing SDK-based WebSocketManager for session ${stableSessionId}`, 'info');
      
      // Reset intentional termination flag before initializing new connection
      isIntentionalTermination.current = false;
      
      // Fetch token for Deepgram SDK (accept both {key} and {token})
      let token: string | undefined;
      try {
        const response = await fetch('/api/deepgram/token', { credentials: 'include' });
        const data = await response.json();
        token = (data && (data.key || data.token)) as string | undefined;
      } catch (e) {
        log(`❌ Error fetching Deepgram token: ${e}`, 'error');
      }

      if (!token) {
        throw new Error('No Deepgram token found in response');
      }

      log(`🔑 Deepgram token fetched successfully for session ${stableSessionId}`, 'debug');
      
      // Check if this is Marcus (CharmerController handles dialogue manually)
      const isCustomDialoguePersona = adaptedPersona.id === 'the_charmer_demo' || 
        (adaptedPersona as any).disableAutoGreeting === true;
      
      // Initialize WebSocketManager with the stable session ID and SDK approach
      wsManager.current = new WebSocketManager({
        sessionId: stableSessionId, // Explicitly use stable ID
        token: token,
        personaName: adaptedPersona.name,
        personaData: adaptedPersona,
        userName: 'Sales Representative', // Default user name
        disableAutoGreeting: isCustomDialoguePersona, // Let CharmerController handle Marcus dialogue
        onOpen: () => {
          // Use the closure variable to ensure consistent session ID
          log(`🔌 WebSocket opened for session ${stableSessionId}`, 'info');
          // Update connection state and start duration tracking
          try {
            dispatch({ type: 'CALL_CONNECTED' } as ProspectCallAction);
          } catch {}
          if (!durationInterval.current) {
            durationInterval.current = window.setInterval(() => {
              const dur = Math.floor((Date.now() - (callStartTime.current || Date.now())) / 1000);
              try {
                dispatch({ type: 'UPDATE_DURATION', duration: dur } as ProspectCallAction);
              } catch {}
            }, 1000);
          }
          // Start inactivity checker (end after 90s of no activity)
          if (inactivityCheckTimer.current) {
            window.clearInterval(inactivityCheckTimer.current);
            inactivityCheckTimer.current = null;
          }
          lastActivityRef.current = Date.now();
          inactivityCheckTimer.current = window.setInterval(() => {
            try {
              const inactiveMs = Date.now() - lastActivityRef.current;
              const wsActive = !!(wsManager.current && wsManager.current.isActive());
              if (wsActive && inactiveMs > 90000) {
                log(`⏰ Auto-ending call after ${Math.floor(inactiveMs/1000)}s of inactivity`, 'info');
                cleanup();
              }
            } catch {}
          }, 5000);
          
          // Set maximum call duration (30 minutes) to prevent runaway charges
          const MAX_CALL_DURATION_MS = 30 * 60 * 1000; // 30 minutes
          maxDurationTimer.current = window.setTimeout(() => {
            log(`⏰ Auto-ending call after reaching maximum duration of 30 minutes`, 'warn');
            cleanup();
          }, MAX_CALL_DURATION_MS);
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
        onTurnFinal: (turn) => {
          try {
            handleTurn({ role: turn.role, text: turn.text, timestamp: turn.timestamp });
          } catch (e) {
            log(`⚠️ onTurnFinal handler error: ${e}`, 'warn');
          }
        },
        onAudio: (audioData) => {
          if (audioManager.current) {
            // Pass the raw audio buffer directly to DirectAudioManager's processTTS method
            // without corrupting it with Float32Array conversion
            audioManager.current.processTTS(audioData);
          }
          // AI audio being played is activity
          lastActivityRef.current = Date.now();
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

      // Initialize prospect scoring session and subscribe to behavior updates
      try {
        setBehaviorUpdateHandler((update: BehaviorUpdate) => {
          if (update?.scores) {
            applyBehaviorHints(update.scores);
          }
          // Lightweight event-driven termination check (throttled by polling + trigger guard)
          checkForAICallTermination('behavior_update');
        });
        const personaId = ('id' in personaData && (personaData as any).id) ? (personaData as any).id : adaptedPersona.name;
        const initialBehavior = await initSession(String(personaId), stableSessionId);
        if (initialBehavior?.scores) {
          applyBehaviorHints(initialBehavior.scores);
        }
        // Begin polling for AI termination in parallel
        startTerminationPolling();
      } catch (error) {
        log(`⚠️ Prospect scoring session setup failed: ${error}`, 'warn');
      }

      // Start Scenario SSE stream to receive behavior updates and termination intents
      try {
        await scenario.start({
          sessionId: stableSessionId,
          personaName: adaptedPersona.name,
          onBehaviorUpdate: (update) => {
            if (update?.scores) {
              applyBehaviorHints(update.scores);
            }
          },
          onTerminationIntent: (phrase?: string) => {
            try {
              if (wsManager.current && wsManager.current.isActive()) {
                wsManager.current.setTerminationIntent(phrase);
              }
            } catch (e) {
              log(`⚠️ Failed to apply termination intent from Scenario SSE: ${e}`, 'warn');
            }
          },
          onPostCallInsights: (insights) => {
            // For now, just log. Could be surfaced in UI later.
            try {
              const preview = insights?.markdown ? insights.markdown.substring(0, 200) : '';
              log(`📝 Scenario post-call insights received${preview ? `: ${preview}...` : ''}`, 'info');
            } catch {}
          }
        });
      } catch (e) {
        log(`⚠️ Failed to start Scenario SSE stream: ${e}`, 'warn');
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
  }, [handleWebSocketMessage, handleWebSocketError, cleanup, dispatch, log, state.status, applyBehaviorHints]);

  // (applyBehaviorHints defined earlier)
  
  // Clean up resources on component unmount
  useEffect(() => {
    return () => {
      log(`🧹 Component unmounting, cleaning up resources`, 'info');
      cleanup();
    };
  }, [cleanup, log]);

  // Ensure persona audio can play: resume/initialize speaker on first user gesture
  useEffect(() => {
    const handler = () => {
      if (audioUnlockedRef.current) return;
      if (audioManager.current && typeof (audioManager.current as any).unlockAudio === 'function') {
        (audioManager.current as any).unlockAudio().catch(() => {});
        audioUnlockedRef.current = true;
        window.removeEventListener('pointerdown', handler as any);
        window.removeEventListener('keydown', handler as any);
      }
    };
    window.addEventListener('pointerdown', handler as any);
    window.addEventListener('keydown', handler as any);
    return () => {
      window.removeEventListener('pointerdown', handler as any);
      window.removeEventListener('keydown', handler as any);
    };
  }, []);
  
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
    applyBehaviorHints,
    injectAgentMessage,
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    callDuration: state.callDuration,
    transcript: state.transcript,
    error: state.lastError,
    getTerminationUIState,
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

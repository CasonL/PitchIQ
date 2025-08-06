// CallController.ts - Manages the call lifecycle
import { useCallback, useEffect, useRef, useState } from 'react';
import { Persona } from '../../types/persona';
import { AudioManager } from './AudioManager';
import { WebSocketManager } from './WebSocketManager';
import { VoiceSelector } from './VoiceSelector';
import { CallMonitoring } from './CallMonitoring';
import { ProspectCallEventBus } from './ProspectCallEventBus';
import { ProspectCallState, ProspectCallAction, initialCallState, prospectCallReducer } from './ProspectCallState';

// Generate a unique session ID
const generateSessionId = (persona: Persona): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${persona.name.replace(/\s+/g, '_')}_${timestamp}_${random}`;
};

// Custom hook for call controller
export const useCallController = (persona: Persona, onTranscriptUpdate: (text: string) => void) => {
  // State management using reducer
  const [state, dispatch] = useState<ProspectCallState>(initialCallState);
  
  // Refs for managers
  const audioManager = useRef<AudioManager | null>(null);
  const wsManager = useRef<WebSocketManager | null>(null);
  const monitoring = useRef<CallMonitoring>(CallMonitoring.getInstance());
  const eventBus = useRef<ProspectCallEventBus>(ProspectCallEventBus.getInstance());
  
  // Session tracking
  const activeSessionId = useRef<string | null>(null);
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<number | null>(null);
  
  // Logging utility
  const log = useCallback((message: string, level: string = 'info') => {
    const prefix = activeSessionId.current ? `[${activeSessionId.current}] ` : '';
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix}${message}`);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    if (!message) return;
    
    try {
      // Handle different message types
      if (message.type === 'SpeechStarted') {
        dispatch({ type: 'SENTENCE_PLAYBACK_START' });
      } else if (message.type === 'SpeechFinished') {
        dispatch({ type: 'SENTENCE_PLAYBACK_END' });
      } else if (message.type === 'Speech') {
        // Process speech audio
        if (message.speech && message.speech.data && audioManager.current) {
          const audioData = new Float32Array(message.speech.data);
          audioManager.current.processSentenceAudio(audioData);
        }
      } else if (message.type === 'Transcript') {
        // Update transcript
        if (message.transcript && message.transcript.text) {
          const text = message.transcript.text;
          dispatch({ type: 'UPDATE_TRANSCRIPT', text });
          onTranscriptUpdate(text);
          
          // Record sentence for monitoring
          if (activeSessionId.current) {
            monitoring.current.recordSentence(activeSessionId.current, text);
          }
        }
      } else if (message.type === 'Error') {
        log(`❌ Deepgram error: ${message.error}`, 'error');
        dispatch({ type: 'CALL_ERROR', error: new Error(message.error) });
      }
    } catch (error) {
      log(`❌ Error processing WebSocket message: ${error}`, 'error');
    }
  }, [log, onTranscriptUpdate]);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: Error) => {
    log(`❌ WebSocket error: ${error.message}`, 'error');
    dispatch({ type: 'CALL_ERROR', error });
    
    if (activeSessionId.current) {
      monitoring.current.recordWebSocketError(activeSessionId.current, error.message);
    }
  }, [log]);

  // Handle audio data from microphone
  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsManager.current && state.status === 'connected') {
      wsManager.current.sendAudio(audioData);
    }
  }, [state.status]);

  // Start a call
  const startCall = useCallback(async () => {
    try {
      // Clean up any existing call first
      cleanup();
      
      // Generate a new session ID
      const sessionId = generateSessionId(persona);
      activeSessionId.current = sessionId;
      callStartTime.current = Date.now();
      
      log(`🚀 Starting call with ${persona.name}, session ID: ${sessionId}`, 'info');
      dispatch({ type: 'CALL_INIT', persona });
      dispatch({ type: 'CALL_CONNECTING', sessionId });
      
      // Select voice based on persona
      const voiceId = VoiceSelector.selectVoiceForPersona(persona);
      dispatch({ type: 'SET_VOICE', voice: voiceId });
      log(`🎤 Selected voice: ${voiceId} for ${persona.name}`, 'info');
      
      // Start call monitoring
      monitoring.current.startCall(sessionId, persona, voiceId);
      
      // Create audio manager
      audioManager.current = new AudioManager({
        sessionId,
        onAudioData: handleAudioData,
        log
      });
      
      // Request microphone access
      const micStream = await audioManager.current.requestMicrophone();
      if (!micStream) {
        throw new Error('Failed to access microphone');
      }
      
      // Set up audio processing
      await audioManager.current.setupAudioProcessing();
      
      // Create WebSocket manager
      wsManager.current = new WebSocketManager({
        sessionId,
        persona,
        voiceId,
        onMessage: handleWebSocketMessage,
        onError: handleWebSocketError,
        onClose: () => {
          log(`🔌 WebSocket closed for session ${sessionId}`, 'info');
          dispatch({ type: 'CALL_DISCONNECTED' });
        },
        onOpen: () => {
          log(`🔌 WebSocket opened for session ${sessionId}`, 'info');
          dispatch({ type: 'CALL_CONNECTED' });
          
          // Start tracking call duration
          durationInterval.current = window.setInterval(() => {
            const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
            dispatch({ type: 'UPDATE_DURATION', duration });
          }, 1000);
        },
        log
      });
      
      // Connect to Deepgram
      await wsManager.current.connect();
      
    } catch (error) {
      log(`❌ Error starting call: ${error}`, 'error');
      dispatch({ type: 'CALL_ERROR', error: error as Error });
      cleanup();
    }
  }, [persona, handleAudioData, handleWebSocketMessage, handleWebSocketError, log]);

  // End a call
  const endCall = useCallback(() => {
    log(`📞 Ending call with session ID: ${activeSessionId.current}`, 'info');
    dispatch({ type: 'CALL_DISCONNECTING' });
    
    // Record call end in monitoring
    if (activeSessionId.current) {
      monitoring.current.endCall(activeSessionId.current, 'user_ended');
    }
    
    // Broadcast call end event
    eventBus.current.emit('call_ended', { sessionId: activeSessionId.current });
    
    // Clean up resources
    cleanup();
  }, [log]);

  // Clean up resources
  const cleanup = useCallback(() => {
    const sessionBeingClosed = activeSessionId.current;
    log(`🧹 Cleaning up resources for session ${sessionBeingClosed || 'unknown'}`, 'info');
    
    // Clear duration interval
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    // Clean up WebSocket
    if (wsManager.current) {
      wsManager.current.terminate();
      wsManager.current = null;
    }
    
    // Clean up audio
    if (audioManager.current) {
      audioManager.current.cleanup();
      audioManager.current = null;
    }
    
    // Clear session ID only if it matches the one being closed
    if (activeSessionId.current === sessionBeingClosed) {
      activeSessionId.current = null;
    } else if (activeSessionId.current && sessionBeingClosed) {
      log(`⚠️ Warning: Cleanup called for session ${sessionBeingClosed} but active session is ${activeSessionId.current}`, 'warn');
    }
    
    // Reset state
    dispatch({ type: 'CALL_DISCONNECTED' });
  }, [log]);

  // Set up event listeners
  useEffect(() => {
    // Listen for external call end events
    const handleExternalCallEnd = () => {
      log('📞 Call ended by external event', 'info');
      cleanup();
    };
    
    eventBus.current.on('call_ended', handleExternalCallEnd);
    
    // Clean up on unmount
    return () => {
      eventBus.current.off('call_ended', handleExternalCallEnd);
      cleanup();
    };
  }, [cleanup, log]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup]);

  // Automatic reconnection
  useEffect(() => {
    if (state.status === 'error' && state.reconnectAttempts < 3) {
      const timer = setTimeout(() => {
        log(`🔄 Attempting to reconnect (${state.reconnectAttempts + 1}/3)`, 'info');
        dispatch({ type: 'RECONNECT_ATTEMPT' });
        startCall();
      }, 1000 * (state.reconnectAttempts + 1));
      
      return () => clearTimeout(timer);
    }
  }, [state.status, state.reconnectAttempts, startCall, log]);

  return {
    state,
    startCall,
    endCall,
    cleanup,
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    callDuration: state.callDuration,
    transcript: state.transcript,
    error: state.lastError
  };
};

/**
 * CallControllerProviderV2 - Two-Rail Architecture with Marcus Voice System
 * 
 * Clean implementation using:
 * - ProspectVoiceManager (Deepgram STT + Cartesia TTS)
 * - VoiceOrchestrator (TimingAuthority + MeaningAuthority)
 * - Full behavioral mirroring
 * - Instant interruption handling
 */

import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { VoiceOrchestrator } from '../../lib/voice-architecture';
import { ProspectVoiceManager } from '../../services/voice/ProspectVoiceManager';
import { PersonaData } from './DualVoiceAgentFlow';

// Simple state for V2
interface CallStateV2 {
  isConnecting: boolean;
  isActive: boolean;
  sessionId: string | null;
  transcript: string[];
  error: string | null;
}

const initialState: CallStateV2 = {
  isConnecting: false,
  isActive: false,
  sessionId: null,
  transcript: [],
  error: null
};

// Context
interface CallControllerContextV2 {
  state: CallStateV2;
  startCall: (persona: PersonaData) => Promise<void>;
  endCall: () => void;
}

const CallControllerContextV2 = createContext<CallControllerContextV2 | null>(null);

export function useCallControllerV2() {
  const context = useContext(CallControllerContextV2);
  if (!context) {
    throw new Error('useCallControllerV2 must be used within CallControllerProviderV2');
  }
  return context;
}

interface Props {
  persona: PersonaData;
  children: React.ReactNode;
}

export function CallControllerProviderV2({ persona, children }: Props) {
  const [state, setState] = useState<CallStateV2>(initialState);
  
  // Managers
  const voiceManager = useRef<ProspectVoiceManager | null>(null);
  const orchestrator = useRef<VoiceOrchestrator | null>(null);

  /**
   * Start call with two-rail architecture
   */
  const startCall = useCallback(async (personaData: PersonaData) => {
    try {
      console.log('[CallControllerV2] Starting call for:', personaData.name);
      
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      // Generate session ID
      const sessionId = `${personaData.name.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Initialize VoiceOrchestrator first
      console.log('[CallControllerV2] Initializing VoiceOrchestrator...');
      orchestrator.current = new VoiceOrchestrator({
        silence_threshold_ms: 800,
        user_done_threshold_ms: 1200,
        max_queue_size: 5,
        enable_mirroring: true,
        mirroring_sensitivity: 0.7,
        enable_coach_orchestration: true,  // Enable sync/async Coach architecture
        
        // When orchestrator wants to speak
        onSpeakRequest: async (text: string, metadata: any) => {
          console.log('[CallControllerV2] Orchestrator requesting speech:', text.substring(0, 50));
          if (voiceManager.current) {
            // Select voice based on gender
            const voiceId = personaData.gender === 'female' 
              ? 'warm-female' 
              : 'confident-male';
            
            await voiceManager.current.speak(text, {
              voiceId,
              emotion: metadata?.tone || 'neutral',
              speed: metadata?.speaking_speed || 1.0
            });
          }
        },
        
        // Mic control (not needed with Marcus - always listening)
        onMicControl: (enabled: boolean) => {
          console.log('[CallControllerV2] Mic control:', enabled);
        },
        
        // Turn state changes
        onTurnChange: (turnState: 'user' | 'prospect' | 'idle') => {
          console.log('[CallControllerV2] Turn state:', turnState);
        }
      });
      
      // Set session context for Coach integration
      orchestrator.current.setSessionContext(sessionId, personaData);
      
      // Initialize ProspectVoiceManager (Marcus architecture)
      console.log('[CallControllerV2] Initializing ProspectVoiceManager...');
      voiceManager.current = new ProspectVoiceManager({
        // Transcript from STT
        onTranscript: async (text: string, isFinal: boolean) => {
          console.log('[CallControllerV2] Transcript:', text, 'final:', isFinal);
          
          if (isFinal && orchestrator.current) {
            // Add to UI
            setState(prev => ({
              ...prev,
              transcript: [...prev.transcript, text]
            }));
            
            // Send to orchestrator (this queues the response)
            await orchestrator.current.onTranscript(text, 'user');
            
            // Generate response - this pushes to queue, SpeechGate will pull when ready
            await orchestrator.current.generateResponse({
              transcript: text,
              persona: personaData,
              sessionId: sessionId
            });
            
            // Signal user stopped speaking - this opens the gate which triggers speech
            // The gate pulls from queue and calls onSpeakRequest
            orchestrator.current.userStoppedSpeaking(800);
          }
        },
        
        // VAD speech start
        onSpeechStart: () => {
          console.log('[CallControllerV2] VAD: User started speaking');
          if (orchestrator.current) {
            orchestrator.current.userStartedSpeaking();
          }
        },
        
        // Speaking state changes
        onSpeakingStateChange: (isSpeaking: boolean) => {
          console.log('[CallControllerV2] Prospect speaking:', isSpeaking);
          if (orchestrator.current) {
            if (isSpeaking) {
              orchestrator.current.prospectStartedSpeaking();
            } else {
              orchestrator.current.prospectStoppedSpeaking();
            }
          }
        },
        
        // Errors
        onError: (error: Error) => {
          console.error('[CallControllerV2] Voice error:', error);
          setState(prev => ({ ...prev, error: error.message }));
        }
      });
      
      // Start listening
      await voiceManager.current.startListening();
      
      console.log('[CallControllerV2] ✅ Call started successfully');
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isActive: true,
        sessionId
      }));
      
    } catch (error) {
      console.error('[CallControllerV2] Failed to start call:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to start call'
      }));
    }
  }, []);

  /**
   * End call and cleanup
   */
  const endCall = useCallback(() => {
    console.log('[CallControllerV2] Ending call...');
    
    if (voiceManager.current) {
      voiceManager.current.cleanup();
      voiceManager.current = null;
    }
    
    if (orchestrator.current) {
      // Orchestrator doesn't need explicit cleanup
      orchestrator.current = null;
    }
    
    setState(initialState);
    console.log('[CallControllerV2] ✅ Call ended');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceManager.current) {
        voiceManager.current.cleanup();
      }
    };
  }, []);

  const contextValue: CallControllerContextV2 = {
    state,
    startCall,
    endCall
  };

  return (
    <CallControllerContextV2.Provider value={contextValue}>
      {children}
    </CallControllerContextV2.Provider>
  );
}

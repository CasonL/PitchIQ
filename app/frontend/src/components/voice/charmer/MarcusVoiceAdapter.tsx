/**
 * MarcusVoiceAdapter.tsx
 * Bridges the AssemblyAI + Cartesia voice system with CharmerController
 * Provides 100% control over Marcus's responses (no autonomous AI)
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { MarcusVoiceManager } from '../../../services/voice/MarcusVoiceManager';

interface MarcusVoiceContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  
  // Transcript
  transcript: string;
  
  // Control methods
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  speakAsMarcus: (text: string, options?: SpeakOptions) => Promise<void>;
  
  // Status
  isSpeaking: boolean;
  metrics: VoiceMetrics;
}

interface SpeakOptions {
  voiceId?: string;
  emotion?: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
  speed?: number;
  interrupt?: boolean;
}

interface VoiceMetrics {
  sttMinutes: number;
  ttsCharacters: number;
  estimatedCost: number;
  messagesProcessed: number;
}

const MarcusVoiceContext = createContext<MarcusVoiceContextType | null>(null);

export const useMarcusVoice = () => {
  const context = useContext(MarcusVoiceContext);
  if (!context) {
    throw new Error('useMarcusVoice must be used within MarcusVoiceProvider');
  }
  return context;
};

interface MarcusVoiceProviderProps {
  children: React.ReactNode;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onInterruption?: (interruptedText: string) => void; // Called when user interrupts Marcus
}

export const MarcusVoiceProvider: React.FC<MarcusVoiceProviderProps> = ({
  children,
  onTranscriptUpdate,
  onInterruption
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [metrics, setMetrics] = useState<VoiceMetrics>({
    sttMinutes: 0,
    ttsCharacters: 0,
    estimatedCost: 0,
    messagesProcessed: 0
  });
  
  const voiceManagerRef = useRef<MarcusVoiceManager | null>(null);
  
  /**
   * Initialize voice manager with callbacks
   */
  const initializeVoiceManager = useCallback(() => {
    if (voiceManagerRef.current) return voiceManagerRef.current;
    
    console.log('[MarcusVoiceAdapter] Initializing voice manager');
    
    const manager = new MarcusVoiceManager({
      onTranscript: (text: string, isFinal: boolean) => {
        console.log(`[MarcusVoiceAdapter] Transcript ${isFinal ? 'SPEECH FINAL' : 'partial'}: "${text}"`);
        
        if (isFinal) {
          // Deepgram's speech_final means utterance is truly complete
          // Update transcript with complete utterance
          setTranscript(prev => prev + (prev ? ' ' : '') + text);
        }
        
        // Notify parent component
        if (onTranscriptUpdate) {
          onTranscriptUpdate(text, isFinal);
        }
      },
      
      onSpeakingStateChange: (speaking: boolean) => {
        console.log(`[MarcusVoiceAdapter] Speaking state: ${speaking}`);
        setIsSpeaking(speaking);
      },
      
      onInterruption: (interruptedText: string) => {
        console.log(`[MarcusVoiceAdapter] 🛑 Interruption detected: "${interruptedText}"`);
        // Pass interruption event to parent component
        if (onInterruption) {
          onInterruption(interruptedText);
        }
      },
      
      onError: (err: Error) => {
        console.error('[MarcusVoiceAdapter] Error:', err);
        setError(err);
        setIsConnected(false);
        setIsConnecting(false);
      },
      
      onCostUpdate: (sttCost: number, ttsCost: number) => {
        const currentMetrics = voiceManagerRef.current?.getMetrics();
        if (currentMetrics) {
          setMetrics(currentMetrics);
        }
      }
    });
    
    voiceManagerRef.current = manager;
    return manager;
  }, [onTranscriptUpdate, onInterruption]);
  
  /**
   * Start call - initialize STT listening
   */
  const startCall = useCallback(async () => {
    if (isConnecting || isConnected) {
      console.warn('[MarcusVoiceAdapter] Already connected or connecting');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    setTranscript('');
    
    try {
      console.log('[MarcusVoiceAdapter] Starting call...');
      
      const manager = initializeVoiceManager();
      await manager.startListening();
      
      setIsConnected(true);
      setIsConnecting(false);
      
      console.log('[MarcusVoiceAdapter] Call started successfully');
    } catch (err) {
      console.error('[MarcusVoiceAdapter] Failed to start call:', err);
      setError(err as Error);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isConnecting, isConnected, initializeVoiceManager]);
  
  /**
   * End call - stop STT and cleanup
   */
  const endCall = useCallback(async () => {
    console.log('[MarcusVoiceAdapter] Ending call...');
    
    try {
      if (voiceManagerRef.current) {
        await voiceManagerRef.current.cleanup();
        voiceManagerRef.current = null;
      }
      
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
      
      console.log('[MarcusVoiceAdapter] Call ended');
    } catch (err) {
      console.error('[MarcusVoiceAdapter] Error ending call:', err);
      setError(err as Error);
    }
  }, []);
  
  /**
   * Speak as Marcus - TTS output
   */
  const speakAsMarcus = useCallback(async (text: string, options?: SpeakOptions) => {
    if (!voiceManagerRef.current) {
      console.error('[MarcusVoiceAdapter] Voice manager not initialized');
      return;
    }
    
    console.log(`[MarcusVoiceAdapter] Marcus speaking: "${text.substring(0, 50)}..."`);
    
    try {
      await voiceManagerRef.current.speak(text, {
        interrupt: options?.interrupt,
        voiceId: options?.voiceId || 'confident-male', // Default Marcus voice
        emotion: options?.emotion,
        speed: options?.speed || 1.0
      });
    } catch (err) {
      console.error('[MarcusVoiceAdapter] Speech error:', err);
      setError(err as Error);
    }
  }, []);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (voiceManagerRef.current) {
        console.log('[MarcusVoiceAdapter] Cleaning up on unmount');
        voiceManagerRef.current.cleanup();
      }
    };
  }, []);
  
  const value: MarcusVoiceContextType = {
    isConnected,
    isConnecting,
    error,
    transcript,
    startCall,
    endCall,
    speakAsMarcus,
    isSpeaking,
    metrics
  };
  
  return (
    <MarcusVoiceContext.Provider value={value}>
      {children}
    </MarcusVoiceContext.Provider>
  );
};

import React, { useEffect, useRef } from 'react';
import { useVoiceState } from '../../state/voiceState';
import VoiceOrb from './VoiceOrb';
import AudioService from '../../services/AudioService';

interface VoiceContainerProps {
  size?: number;
}

/**
 * VoiceContainer Component
 * Main container for voice interface that holds the orb and controls
 */
const VoiceContainer: React.FC<VoiceContainerProps> = ({ size = 300 }) => {
  // Access voice state
  const { 
    isListening, 
    isSpeaking, 
    setAudioLevel,
    startListening,
    stopListening
  } = useVoiceState();
  
  // Ref for audio service instance
  const audioServiceRef = useRef<AudioService | null>(null);
  
  // Initialize audio service
  useEffect(() => {
    // Create audio service instance
    audioServiceRef.current = new AudioService();
    
    // Cleanup on unmount
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.dispose();
        audioServiceRef.current = null;
      }
    };
  }, []);
  
  // Toggle listening state
  const handleToggleMicrophone = async () => {
    if (!audioServiceRef.current) return;
    
    if (isListening) {
      // If already listening, stop
      audioServiceRef.current.stopListening();
      stopListening();
    } else {
      // Otherwise start listening
      const success = await audioServiceRef.current.startListening((level) => {
        setAudioLevel(level);
      });
      
      if (success) {
        startListening();
      } else {
        // Handle microphone access failure
        console.error('Failed to access microphone');
        // Could show an error message here
      }
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50">
      {/* Main visualization area */}
      <div className="flex-1 flex items-center justify-center">
        <VoiceOrb size={size} />
      </div>
      
      {/* Controls area */}
      <div className="p-6">
        <button
          onClick={handleToggleMicrophone}
          className={`
            rounded-full h-16 w-16 flex items-center justify-center shadow-md transition-all
            ${isListening 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
            }
            ${isSpeaking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          disabled={isSpeaking}
        >
          {isListening ? (
            // Stop icon when listening
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
            </svg>
          ) : (
            // Microphone icon when not listening
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          )}
        </button>
        
        {/* Status text */}
        <div className="mt-4 text-center text-sm text-slate-500">
          {isListening ? (
            <p>Listening... Speak now</p>
          ) : isSpeaking ? (
            <p>AI is speaking...</p>
          ) : (
            <p>Click the microphone to start speaking</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceContainer; 
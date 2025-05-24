import { create } from 'zustand';

/**
 * Core state store for voice interactions
 * Manages listening/speaking states and audio levels
 */
interface VoiceState {
  // State properties
  isListening: boolean;
  isSpeaking: boolean;
  isTraining: boolean;
  audioLevel: number;
  volume: number;
  
  // Actions
  startListening: () => void;
  stopListening: () => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  setTrainingMode: (isTraining: boolean) => void;
  setAudioLevel: (level: number) => void;
  setVolume: (volume: number) => void;
}

export const useVoiceState = create<VoiceState>((set) => ({
  // Initial state
  isListening: false,
  isSpeaking: false,
  isTraining: false,
  audioLevel: 0,
  volume: 0.8,
  
  // Actions that modify state
  startListening: () => set({ isListening: true, isSpeaking: false }),
  stopListening: () => set({ isListening: false }),
  startSpeaking: () => set({ isSpeaking: true, isListening: false }),
  stopSpeaking: () => set({ isSpeaking: false }),
  setTrainingMode: (isTraining) => set({ isTraining }),
  setAudioLevel: (level) => set({ audioLevel: Math.max(0, Math.min(1, level)) }), // Clamp between 0-1
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }), // Clamp between 0-1
})); 
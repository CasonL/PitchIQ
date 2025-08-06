// DirectAudioManager.d.ts - Type declarations for DirectAudioManager
// This ensures TypeScript recognizes the DirectAudioManager imports

export interface DirectAudioManagerConfig {
  sessionId: string;
  log: (message: string, level?: string) => void;
  onStartSpeaking?: () => void;
  onStopSpeaking?: () => void;
  onMicrophoneData?: (audioData: Float32Array) => void;
}

export declare class DirectAudioManager {
  constructor(config: DirectAudioManagerConfig);
  
  // Methods
  initSpeaker(): void;
  requestMicrophone(retries?: number, delayMs?: number): Promise<MediaStream>;
  setupAudioProcessing(onAudioData: (audioData: Float32Array) => void): Promise<void>;
  processTTS(payload: any): void;
  cleanup(): void;
  
  // Properties
  sessionId: string;
}

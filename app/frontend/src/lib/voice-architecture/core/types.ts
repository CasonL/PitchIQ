export interface QueueItem {
  text: string;
  priority: number;
  expires_in_ms: number;
  interrupt_ok: boolean;
  abortable: boolean;
  timestamp: number;
  contextVersion: number;
  
  pause_before?: number;
  tone?: 'engaged' | 'uncomfortable' | 'disengaged' | 'exit_seeking';
  speaking_speed?: 'normal' | 'hesitant' | 'flat';
}

export interface BehaviorState {
  awkwardness_level: number;
  control_taking: number;
  energy_level: 'passive' | 'tentative' | 'confident' | 'aggressive';
}

export interface ConversationContext {
  transcript: string;
  persona: any;
  behaviorState?: BehaviorState;
  sessionId: string;
}

export interface SpeechMetadata {
  pause_before?: number;
  tone?: string;
  speaking_speed?: string;
}

export interface ITimingAuthority {
  onUserStartedSpeaking(): void;
  onUserStoppedSpeaking(silenceDuration_ms: number): void;
  onProspectStartedSpeaking(): void;
  onProspectStoppedSpeaking(): void;
  setMicStreamingAllowed(allowed: boolean): void;
  getCurrentTurnState(): 'user' | 'prospect' | 'idle';
}

export interface IMeaningAuthority {
  onTranscript(text: string, speaker: 'user' | 'prospect'): Promise<void>;
  onUserBehaviorChange(state: BehaviorState): void;
  generateProspectResponse(context: ConversationContext): Promise<void>;
}

export interface ISpeechGate {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export interface IProspectQueue {
  push(item: QueueItem): void;
  getNext(): QueueItem | null;
  peek(): QueueItem | null;
  clear(): void;
  removeExpired(): void;
  size(): number;
  onNewUserSpeech(): void;
}

export interface VoiceArchitectureConfig {
  silence_threshold_ms: number;
  user_done_threshold_ms: number;
  max_queue_size: number;
  enable_mirroring: boolean;
  mirroring_sensitivity: number;
  enable_coach_orchestration: boolean;
  
  onSpeakRequest: (text: string, metadata: SpeechMetadata) => Promise<void>;
  onMicControl: (enabled: boolean) => void;
  onTurnChange: (state: 'user' | 'prospect' | 'idle') => void;
}

export { VoiceOrchestrator } from './VoiceOrchestrator';

export type {
  QueueItem,
  BehaviorState,
  ConversationContext,
  SpeechMetadata,
  VoiceArchitectureConfig,
  ITimingAuthority,
  IMeaningAuthority,
  ISpeechGate,
  IProspectQueue
} from './core/types';

export { TimingAuthority } from './core/TimingAuthority';
export { MeaningAuthority } from './core/MeaningAuthority';
export { SpeechGate } from './core/SpeechGate';
export { ProspectQueue } from './core/ProspectQueue';

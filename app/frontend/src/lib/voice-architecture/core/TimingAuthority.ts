import { ITimingAuthority, ISpeechGate, VoiceArchitectureConfig } from './types';

export class TimingAuthority implements ITimingAuthority {
  private gate: ISpeechGate;
  private config: VoiceArchitectureConfig;
  private turnState: 'user' | 'prospect' | 'idle' = 'idle';
  private lastSilenceStart: number = 0;
  private userSpeechStartTime: number = 0;

  constructor(gate: ISpeechGate, config: VoiceArchitectureConfig) {
    this.gate = gate;
    this.config = config;
  }

  onUserStartedSpeaking(): void {
    console.log('[TimingAuthority] User started speaking');
    this.turnState = 'user';
    this.userSpeechStartTime = Date.now();
    
    this.gate.close();
    this.config.onMicControl(true);
    this.config.onTurnChange('user');
  }

  onUserStoppedSpeaking(silenceDuration_ms: number): void {
    console.log('[TimingAuthority] User stopped speaking, silence:', silenceDuration_ms);
    
    // Check if silence threshold met
    if (silenceDuration_ms >= this.config.silence_threshold_ms) {
      // Either user spoke long enough OR we have a final transcript (userSpeechStartTime=0 means reset/ready)
      const userDone = this.userDoneTalking() || this.userSpeechStartTime === 0;
      if (userDone) {
        console.log('[TimingAuthority] User done talking - opening gate');
        this.turnState = 'idle';
        this.userSpeechStartTime = 0; // Reset for next turn
        this.gate.open();
      } else {
        console.log('[TimingAuthority] User not done yet, speaking duration:', Date.now() - this.userSpeechStartTime);
      }
    }
  }

  onProspectStartedSpeaking(): void {
    console.log('[TimingAuthority] Prospect started speaking');
    this.turnState = 'prospect';
    
    this.config.onMicControl(false);
    this.config.onTurnChange('prospect');
  }

  onProspectStoppedSpeaking(): void {
    console.log('[TimingAuthority] Prospect stopped speaking');
    this.turnState = 'idle';
    
    this.config.onMicControl(true);
    this.config.onTurnChange('idle');
  }

  setMicStreamingAllowed(allowed: boolean): void {
    this.config.onMicControl(allowed);
  }

  getCurrentTurnState(): 'user' | 'prospect' | 'idle' {
    return this.turnState;
  }

  private userDoneTalking(): boolean {
    const speakingDuration = Date.now() - this.userSpeechStartTime;
    return speakingDuration >= this.config.user_done_threshold_ms;
  }
}

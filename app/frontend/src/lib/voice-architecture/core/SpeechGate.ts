import { ISpeechGate, IProspectQueue, SpeechMetadata } from './types';

export class SpeechGate implements ISpeechGate {
  private _isOpen: boolean = false;
  private queue: IProspectQueue;
  private speakCallback: (text: string, metadata: SpeechMetadata) => Promise<void>;
  private currentSpeechAbortable: boolean = false;

  constructor(
    queue: IProspectQueue,
    speakCallback: (text: string, metadata: SpeechMetadata) => Promise<void>
  ) {
    this.queue = queue;
    this.speakCallback = speakCallback;
  }

  open(): void {
    if (this._isOpen) {
      console.log('[SpeechGate] Already open, skipping');
      return;
    }
    
    console.log('[SpeechGate] Opening gate');
    this._isOpen = true;
    this.pullAndSpeak();
  }

  close(): void {
    if (!this._isOpen) return;
    
    this._isOpen = false;
    
    if (this.currentSpeechAbortable) {
      this.abortCurrentSpeech();
    }
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  private async pullAndSpeak(): Promise<void> {
    if (!this._isOpen) {
      console.log('[SpeechGate] Gate closed, not pulling');
      return;
    }
    
    const item = this.queue.getNext();
    if (!item) {
      console.log('[SpeechGate] Queue empty, nothing to speak');
      this._isOpen = false; // Close gate since nothing to say
      return;
    }
    
    console.log('[SpeechGate] Pulled item from queue:', item.text.substring(0, 50), '...');
    this.currentSpeechAbortable = item.abortable;
    
    const metadata: SpeechMetadata = {
      pause_before: item.pause_before,
      tone: item.tone,
      speaking_speed: item.speaking_speed
    };
    
    if (item.pause_before && item.pause_before > 0) {
      await this.delay(item.pause_before);
    }
    
    if (!this._isOpen) return;
    
    try {
      await this.speakCallback(item.text, metadata);
    } catch (error) {
      console.error('[SpeechGate] Speak failed:', error);
    }
  }

  private abortCurrentSpeech(): void {
    console.log('[SpeechGate] Aborting current speech');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

import { QueueItem, IProspectQueue, VoiceArchitectureConfig } from './types';

export class ProspectQueue implements IProspectQueue {
  private items: QueueItem[] = [];
  private contextVersion: number = 0;
  private maxSize: number;

  constructor(config: VoiceArchitectureConfig) {
    this.maxSize = config.max_queue_size;
  }

  push(item: QueueItem): void {
    item.contextVersion = this.contextVersion;
    item.timestamp = Date.now();
    
    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority);
    
    this.removeExpired();
    this.enforceSizeLimit();
  }

  getNext(): QueueItem | null {
    this.removeExpired();
    return this.items.shift() || null;
  }

  peek(): QueueItem | null {
    this.removeExpired();
    return this.items[0] || null;
  }

  clear(): void {
    this.items = [];
  }

  removeExpired(): void {
    const now = Date.now();
    this.items = this.items.filter(item => {
      const age = now - item.timestamp;
      return age < item.expires_in_ms;
    });
  }

  size(): number {
    this.removeExpired();
    return this.items.length;
  }

  onNewUserSpeech(): void {
    this.contextVersion++;
    this.removeStaleItems();
  }

  private removeStaleItems(): void {
    this.items = this.items.filter(item => 
      item.contextVersion >= this.contextVersion - 1
    );
  }

  private enforceSizeLimit(): void {
    if (this.items.length > this.maxSize) {
      this.items = this.items.slice(0, this.maxSize);
    }
  }

  getDebugState() {
    return {
      size: this.items.length,
      contextVersion: this.contextVersion,
      items: this.items.map(item => ({
        text: item.text.substring(0, 50) + '...',
        priority: item.priority,
        age_ms: Date.now() - item.timestamp,
        expires_in_ms: item.expires_in_ms
      }))
    };
  }
}

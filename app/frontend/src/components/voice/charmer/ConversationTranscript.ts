/**
 * ConversationTranscript.ts
 * Data structures for capturing full conversation exchanges
 */

export interface ConversationExchange {
  id: string;
  timestamp: number; // seconds from call start
  speaker: 'user' | 'marcus';
  text: string;
  resistanceLevel?: number; // Marcus's resistance at this moment (0-10)
  emotion?: string; // Marcus's emotion
  objectionTriggered?: string; // If Marcus raised an objection
  painPointRevealed?: string; // If Marcus revealed a pain
}

export interface CriticalMoment {
  id: string;
  timestamp: number;
  type: 'missed_opening' | 'objection_mishandled' | 'resistance_spike' | 'trust_window';
  severity: number; // 0-1, how critical was this?
  
  // The actual exchange
  userMessage: string;
  marcusResponse: string;
  
  // Context
  resistanceBefore: number;
  resistanceAfter: number;
  whatHappened: string; // Brief description
  
  // For puzzle generation
  hiddenOpportunity: string; // What they could have done
  productValueAdd?: string; // Which product benefit applies here
}

export interface ConversationTranscript {
  exchanges: ConversationExchange[];
  startTime: number; // timestamp
  endTime?: number;
  
  // Metadata for analysis
  scenario?: {
    name: string;
    productName?: string;
    targetAudience?: string;
  };
}

export class ConversationTracker {
  private exchanges: ConversationExchange[] = [];
  private startTime: number = Date.now();
  private callStartTime: number = Date.now();
  
  constructor(callStartTime?: number) {
    if (callStartTime) {
      this.callStartTime = callStartTime;
    }
  }
  
  /**
   * Add a user utterance
   */
  addUserMessage(text: string, resistanceLevel?: number): void {
    const timestamp = (Date.now() - this.callStartTime) / 1000;
    
    this.exchanges.push({
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      speaker: 'user',
      text,
      resistanceLevel
    });
  }
  
  /**
   * Add a Marcus response
   */
  addMarcusMessage(
    text: string, 
    resistanceLevel: number,
    emotion?: string,
    objectionTriggered?: string,
    painPointRevealed?: string
  ): void {
    const timestamp = (Date.now() - this.callStartTime) / 1000;
    
    this.exchanges.push({
      id: `marcus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      speaker: 'marcus',
      text,
      resistanceLevel,
      emotion,
      objectionTriggered,
      painPointRevealed
    });
  }
  
  /**
   * Get full transcript
   */
  getTranscript(): ConversationTranscript {
    return {
      exchanges: [...this.exchanges],
      startTime: this.startTime,
      endTime: Date.now()
    };
  }
  
  /**
   * Get exchanges in a time window
   */
  getExchangesInWindow(startSec: number, endSec: number): ConversationExchange[] {
    return this.exchanges.filter(ex => 
      ex.timestamp >= startSec && ex.timestamp <= endSec
    );
  }
  
  /**
   * Find exchange pairs (user message + Marcus response)
   */
  getExchangePairs(): Array<{ user: ConversationExchange; marcus: ConversationExchange }> {
    const pairs: Array<{ user: ConversationExchange; marcus: ConversationExchange }> = [];
    
    for (let i = 0; i < this.exchanges.length - 1; i++) {
      if (this.exchanges[i].speaker === 'user' && this.exchanges[i + 1].speaker === 'marcus') {
        pairs.push({
          user: this.exchanges[i],
          marcus: this.exchanges[i + 1]
        });
      }
    }
    
    return pairs;
  }
  
  /**
   * Get resistance trajectory (for detecting spikes)
   */
  getResistanceTrajectory(): Array<{ timestamp: number; level: number }> {
    return this.exchanges
      .filter(ex => ex.resistanceLevel !== undefined)
      .map(ex => ({
        timestamp: ex.timestamp,
        level: ex.resistanceLevel!
      }));
  }
  
  /**
   * Clear transcript (for new call)
   */
  clear(): void {
    this.exchanges = [];
    this.startTime = Date.now();
    this.callStartTime = Date.now();
  }
}

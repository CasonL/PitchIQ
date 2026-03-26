/**
 * TurnTracker.ts
 * CENTRAL TIMING SPINE - Single source of truth for all turn/timing data
 * 
 * Every exchange flows through here. All systems query this for timing.
 * No more scattered utteranceCount, turnNumber, index conflicts.
 */

import type { ConversationExchange } from './ConversationTranscript';

export interface TurnContext {
  currentTurnId: string;        // "turn-12"
  currentPairIndex: number;     // 11 (0-indexed pair number)
  totalExchanges: number;       // 24 (both user + marcus exchanges)
  totalTurns: number;           // 12 (completed user+marcus pairs)
  elapsedSeconds: number;       // 128.5
  elapsedMs: number;            // 128532
  isUserTurn: boolean;          // Currently waiting for marcus response?
  lastUserExchangeId?: string;
  lastMarcusExchangeId?: string;
}

export interface TurnMetadata {
  turnId: string;
  pairIndex: number;
  startedAt: number;            // Timestamp when user spoke
  completedAt?: number;         // Timestamp when Marcus responded
  duration?: number;            // Total turn duration (ms)
  userThinkTime?: number;       // Time user took before speaking
  marcusResponseTime?: number;  // Time Marcus took to respond
}

/**
 * TurnTracker - The backbone of conversation timing
 * Assigns canonical, immutable IDs to every exchange
 */
export class TurnTracker {
  private exchanges: ConversationExchange[] = [];
  private turnMetadata: Map<string, TurnMetadata> = new Map();
  private currentPairIndex: number = 0;
  private currentSequence: number = 0;
  private callStartTime: number;
  private lastExchangeTime: number;
  private isWaitingForMarcus: boolean = false;
  
  constructor(startTime?: number) {
    this.callStartTime = startTime || Date.now();
    this.lastExchangeTime = this.callStartTime;
  }
  
  /**
   * Add exchange - THE ONLY PLACE turn IDs are assigned
   * Returns exchange with canonical turn ID
   */
  addExchange(
    speaker: 'user' | 'marcus',
    text: string,
    metadata?: Partial<ConversationExchange>
  ): ConversationExchange {
    
    const now = Date.now();
    const roleInPair = speaker === 'user' ? 'user' : 'marcus';
    
    // User starts new pair, Marcus completes current pair
    const pairIndex = speaker === 'user' 
      ? this.currentPairIndex 
      : this.currentPairIndex - (this.isWaitingForMarcus ? 1 : 0);
    
    const turnId = `turn-${pairIndex + 1}`; // 1-indexed for humans
    
    const exchange: ConversationExchange = {
      id: `${speaker}-${this.currentSequence}`,
      canonicalTurnId: turnId,
      exchangeSequence: this.currentSequence,
      pairIndex,
      roleInPair,
      timestamp: (now - this.callStartTime) / 1000,
      timestampMs: now - this.callStartTime,
      displayTurnNumber: pairIndex + 1,
      speaker,
      text,
      ...metadata
    };
    
    this.exchanges.push(exchange);
    
    // Track turn timing metadata
    if (speaker === 'user') {
      // User starts new turn
      const userThinkTime = this.currentSequence > 0 
        ? now - this.lastExchangeTime 
        : 0;
      
      this.turnMetadata.set(turnId, {
        turnId,
        pairIndex,
        startedAt: now,
        userThinkTime
      });
      
      this.isWaitingForMarcus = true;
      this.currentPairIndex++; // Increment when user speaks
    } else {
      // Marcus completes turn
      const turnMeta = this.turnMetadata.get(turnId);
      if (turnMeta) {
        turnMeta.completedAt = now;
        turnMeta.marcusResponseTime = now - turnMeta.startedAt;
        turnMeta.duration = turnMeta.marcusResponseTime;
      }
      
      this.isWaitingForMarcus = false;
    }
    
    this.currentSequence++;
    this.lastExchangeTime = now;
    
    console.log(`🎯 [TurnTracker] Added ${speaker} exchange → ${turnId} (seq: ${this.currentSequence})`);
    
    return exchange;
  }
  
  /**
   * Get current turn context - used by all systems
   */
  getCurrentContext(): TurnContext {
    const now = Date.now();
    const elapsedMs = now - this.callStartTime;
    
    return {
      currentTurnId: `turn-${this.currentPairIndex}`,
      currentPairIndex: this.currentPairIndex - 1, // Last completed pair
      totalExchanges: this.currentSequence,
      totalTurns: Math.floor(this.currentSequence / 2),
      elapsedSeconds: elapsedMs / 1000,
      elapsedMs,
      isUserTurn: !this.isWaitingForMarcus,
      lastUserExchangeId: this.getLastExchange('user')?.id,
      lastMarcusExchangeId: this.getLastExchange('marcus')?.id
    };
  }
  
  /**
   * Get all exchanges for a specific turn
   */
  getExchangesByTurnId(turnId: string): ConversationExchange[] {
    return this.exchanges.filter(ex => ex.canonicalTurnId === turnId);
  }
  
  /**
   * Get exchange by sequence number
   */
  getExchangeBySequence(sequence: number): ConversationExchange | undefined {
    return this.exchanges.find(ex => ex.exchangeSequence === sequence);
  }
  
  /**
   * Get all exchanges
   */
  getAllExchanges(): ConversationExchange[] {
    return [...this.exchanges];
  }
  
  /**
   * Get exchanges in pair format (user + marcus)
   */
  getExchangePairs(): Array<{
    turnId: string;
    pairIndex: number;
    user: ConversationExchange;
    marcus: ConversationExchange;
  }> {
    const pairs: Array<{
      turnId: string;
      pairIndex: number;
      user: ConversationExchange;
      marcus: ConversationExchange;
    }> = [];
    
    for (let i = 0; i < this.exchanges.length - 1; i += 2) {
      const user = this.exchanges[i];
      const marcus = this.exchanges[i + 1];
      
      if (user.speaker === 'user' && marcus?.speaker === 'marcus') {
        pairs.push({
          turnId: user.canonicalTurnId!,
          pairIndex: user.pairIndex!,
          user,
          marcus
        });
      }
    }
    
    return pairs;
  }
  
  /**
   * Get turn metadata (timing info)
   */
  getTurnMetadata(turnId: string): TurnMetadata | undefined {
    return this.turnMetadata.get(turnId);
  }
  
  /**
   * Get last exchange by speaker
   */
  private getLastExchange(speaker: 'user' | 'marcus'): ConversationExchange | undefined {
    for (let i = this.exchanges.length - 1; i >= 0; i--) {
      if (this.exchanges[i].speaker === speaker) {
        return this.exchanges[i];
      }
    }
    return undefined;
  }
  
  /**
   * Reset tracker (for new call)
   */
  reset(): void {
    this.exchanges = [];
    this.turnMetadata.clear();
    this.currentPairIndex = 0;
    this.currentSequence = 0;
    this.callStartTime = Date.now();
    this.lastExchangeTime = this.callStartTime;
    this.isWaitingForMarcus = false;
    console.log('🔄 [TurnTracker] Reset');
  }
  
  /**
   * Get summary stats
   */
  getStats() {
    const context = this.getCurrentContext();
    const completedTurns = this.getExchangePairs().length;
    const avgTurnDuration = completedTurns > 0
      ? Array.from(this.turnMetadata.values())
          .filter(m => m.duration)
          .reduce((sum, m) => sum + (m.duration || 0), 0) / completedTurns
      : 0;
    
    return {
      totalExchanges: this.currentSequence,
      completedTurns,
      elapsedSeconds: context.elapsedSeconds,
      avgTurnDurationMs: avgTurnDuration,
      currentTurnId: context.currentTurnId
    };
  }
  
  /**
   * Backfill canonical IDs for existing exchanges (migration helper)
   */
  backfillCanonicalIds(existingExchanges: ConversationExchange[]): ConversationExchange[] {
    console.log(`🔧 [TurnTracker] Backfilling ${existingExchanges.length} exchanges`);
    
    let pairIndex = 0;
    return existingExchanges.map((ex, sequence) => {
      const roleInPair = ex.speaker === 'user' ? 'user' : 'marcus';
      
      if (ex.speaker === 'user' && sequence > 0) {
        pairIndex++;
      }
      
      return {
        ...ex,
        canonicalTurnId: `turn-${pairIndex + 1}`,
        exchangeSequence: sequence,
        pairIndex,
        roleInPair,
        displayTurnNumber: pairIndex + 1,
        timestampMs: ex.timestamp ? ex.timestamp * 1000 : sequence * 1000
      };
    });
  }
}

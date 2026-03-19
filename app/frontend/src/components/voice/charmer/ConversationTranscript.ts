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

export interface ExchangePair {
  id: string;
  timestamp: number;
  userTurn: ConversationExchange;
  marcusResponse: ConversationExchange;
  contextBefore?: string; // Summary of conversation state before this moment
  buyerStateChange?: 'opened_up' | 'pulled_back' | 'neutral' | 'repeated_concern';
}

export type ImpactCategory = 
  | 'trust_break' 
  | 'trust_build'
  | 'discovery' 
  | 'objection_handling'
  | 'pressure'
  | 'clarity'
  | 'value_articulation'
  | 'next_step_progress';

export interface CriticalMoment {
  id: string;
  timestamp: number;
  type: 'missed_opening' | 'objection_mishandled' | 'resistance_spike' | 'trust_window' | 
        'rambling' | 'repetition' | 'tone_issue' | 'missed_pain' | 'repeated_objection';
  severity: number; // 0-1, how critical was this? (from rules)
  
  // Source identity (for stable matching)
  sourcePairId: string; // The ExchangePair.id this moment came from
  sourceUserId: string; // The user exchange ID
  sourceMarcusId: string; // The Marcus exchange ID
  
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
  
  // NEW: LLM impact judgment
  impactScore?: number; // -5 to +5, from LLM
  impactDirection?: 'positive' | 'negative' | 'neutral';
  impactCategory?: ImpactCategory;
  impactReason?: string; // LLM explanation of what changed
  buyerStateChange?: 'opened_up' | 'pulled_back' | 'neutral' | 'repeated_concern';
  isKeyMoment?: boolean; // Top 1 good or top 1 bad
}

export interface SuccessfulMoment {
  id: string;
  timestamp: number;
  type: 'resistance_drop' | 'pain_discovery' | 'objection_handled' | 'active_listening' | 
        'brevity_win' | 'permission_opener';
  impact: number; // 0-1, how impactful was this win?
  
  // Source identity (for stable matching)
  sourcePairId: string; // The ExchangePair.id this moment came from
  sourceUserId: string; // The user exchange ID
  sourceMarcusId: string; // The Marcus exchange ID
  
  // The actual exchange
  userMessage: string;
  marcusResponse: string;
  
  // Context
  resistanceBefore: number;
  resistanceAfter: number;
  whatHappened: string; // Brief description of what they did right
  
  // For reinforcement
  whyItWorked: string; // Why this was effective
  repeatThis?: string; // Optional: How to replicate this win
  
  // NEW: LLM impact judgment
  impactScore?: number; // 1 to 5, from LLM
  impactCategory?: ImpactCategory;
  impactReason?: string; // LLM explanation
  isKeyMoment?: boolean; // Top 1 positive moment
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
   * Extract structured ExchangePair objects with buyer state change analysis
   */
  getStructuredExchangePairs(): ExchangePair[] {
    const structured: ExchangePair[] = [];
    
    for (let i = 0; i < this.exchanges.length - 1; i++) {
      const userTurn = this.exchanges[i];
      const marcusResponse = this.exchanges[i + 1];
      
      if (userTurn.speaker === 'user' && marcusResponse.speaker === 'marcus') {
        // Detect buyer state change
        const stateChange = this.detectBuyerStateChange(userTurn, marcusResponse);
        
        // Build context summary
        const contextBefore = i > 5 
          ? `${i} exchanges completed, resistance at ${userTurn.resistanceLevel || 'unknown'}`
          : 'Early in call';
        
        structured.push({
          id: `pair_${userTurn.id}_${marcusResponse.id}`,
          timestamp: userTurn.timestamp,
          userTurn,
          marcusResponse,
          contextBefore,
          buyerStateChange: stateChange
        });
      }
    }
    
    return structured;
  }
  
  /**
   * Detect how buyer state changed in response to rep's message
   */
  private detectBuyerStateChange(
    userTurn: ConversationExchange,
    marcusResponse: ConversationExchange
  ): 'opened_up' | 'pulled_back' | 'neutral' | 'repeated_concern' {
    const marcusText = marcusResponse.text.toLowerCase();
    
    // Opened up signals
    const openedUpSignals = [
      /\b(actually|to be honest|the truth is|here's the thing)\b/,
      /\b(struggled?|frustrat|problem|issue|pain|concern|worry)\b/,
      /\b(wish|would like|hoping|trying to)\b/,
      marcusResponse.painPointRevealed !== undefined
    ];
    
    if (openedUpSignals.some(signal => 
      typeof signal === 'boolean' ? signal : signal.test(marcusText)
    )) {
      return 'opened_up';
    }
    
    // Pulled back signals
    const resistanceIncreased = marcusResponse.resistanceLevel && userTurn.resistanceLevel
      ? marcusResponse.resistanceLevel > userTurn.resistanceLevel
      : false;
    
    const pulledBackSignals = [
      /\b(i don't think|not sure|skeptical|doubt|hesitant)\b/,
      /\b(pushy|pressure|rushed|uncomfortable)\b/,
      /\b(let me think|need time|not ready)\b/,
      resistanceIncreased
    ];
    
    if (pulledBackSignals.some(signal => 
      typeof signal === 'boolean' ? signal : signal.test(marcusText)
    )) {
      return 'pulled_back';
    }
    
    // Repeated concern
    if (marcusResponse.objectionTriggered) {
      // Check if this objection theme was raised before
      const sameThemeEarlier = this.exchanges
        .slice(0, this.exchanges.indexOf(marcusResponse))
        .some(ex => ex.speaker === 'marcus' && ex.objectionTriggered && 
          this.haveSimilarThemes(ex.objectionTriggered, marcusResponse.objectionTriggered!));
      
      if (sameThemeEarlier) {
        return 'repeated_concern';
      }
    }
    
    return 'neutral';
  }
  
  /**
   * Check if two objections share similar themes
   */
  private haveSimilarThemes(obj1: string, obj2: string): boolean {
    const theme1 = obj1.toLowerCase();
    const theme2 = obj2.toLowerCase();
    
    const themes = [
      ['proof', 'evidence', 'work', 'results', 'roi'],
      ['trust', 'believe', 'sure', 'know'],
      ['time', 'busy', 'bandwidth'],
      ['budget', 'cost', 'price', 'afford'],
      ['fit', 'right', 'relevant'],
      ['generic', 'cookie', 'customiz', 'tailored']
    ];
    
    for (const themeGroup of themes) {
      const match1 = themeGroup.some(word => theme1.includes(word));
      const match2 = themeGroup.some(word => theme2.includes(word));
      
      if (match1 && match2) {
        return true;
      }
    }
    
    return false;
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

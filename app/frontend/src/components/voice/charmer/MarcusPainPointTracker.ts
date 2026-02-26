/**
 * MarcusPainPointTracker.ts
 * Tracks pain point discovery and satisfaction during Marcus calls
 * 
 * Detects when the user:
 * - Discovers hidden pain points (asks right questions)
 * - Addresses pain points (provides relevant solutions/frameworks)
 * - Handles objections cleanly
 */

import { MarcusScenario } from './MarcusScenarios';

export type PainPointStatus = 'undiscovered' | 'discovered' | 'addressed';
export type ObjectionStatus = 'not-triggered' | 'triggered' | 'handled';

export interface PainPointState {
  text: string;
  status: PainPointStatus;
  discoveredAt?: number;  // Timestamp when discovered
  addressedAt?: number;   // Timestamp when addressed
}

export interface ObjectionState {
  text: string;
  status: ObjectionStatus;
  triggeredAt?: number;
  handledAt?: number;
}

export interface CallScore {
  permissionOpener: boolean;
  discoveryQuestionsAsked: number;  // 0-2
  problemFramed: boolean;
  objectionsHandled: number;
  closeAttempted: boolean;
  conciseControl: boolean;
  totalPoints: number;  // Out of 10
}

/**
 * Tracks pain point discovery and scoring for a Marcus call
 */
export class MarcusPainPointTracker {
  private scenario: MarcusScenario;
  private visiblePains: Map<string, PainPointState>;
  private hiddenPains: Map<string, PainPointState>;
  private objections: Map<string, ObjectionState>;
  private callStartTime: number;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  // Scoring state
  private score: CallScore = {
    permissionOpener: false,
    discoveryQuestionsAsked: 0,
    problemFramed: false,
    objectionsHandled: 0,
    closeAttempted: false,
    conciseControl: false,
    totalPoints: 0
  };
  
  constructor(scenario: MarcusScenario) {
    this.scenario = scenario;
    this.callStartTime = Date.now();
    this.conversationHistory = [];
    
    // Initialize visible pains
    this.visiblePains = new Map();
    scenario.visiblePains.forEach(pain => {
      this.visiblePains.set(pain, { text: pain, status: 'undiscovered' });
    });
    
    // Initialize hidden pains
    this.hiddenPains = new Map();
    scenario.hiddenPains.forEach(pain => {
      this.hiddenPains.set(pain, { text: pain, status: 'undiscovered' });
    });
    
    // Initialize objections
    this.objections = new Map();
    scenario.objections.forEach(objection => {
      this.objections.set(objection, { text: objection, status: 'not-triggered' });
    });
  }
  
  /**
   * Process user input to detect pain point discoveries and objection handling
   */
  processUserInput(userText: string): void {
    this.conversationHistory.push({ role: 'user', content: userText });
    
    const lowerText = userText.toLowerCase();
    const timestamp = Date.now();
    
    // Check for permission-based opener (first exchange only)
    if (this.conversationHistory.filter(m => m.role === 'user').length === 1) {
      if (this.detectPermissionOpener(lowerText)) {
        this.score.permissionOpener = true;
        console.log('✅ Permission opener detected');
      }
    }
    
    // Check for discovery questions
    if (this.detectDiscoveryQuestion(lowerText)) {
      if (this.score.discoveryQuestionsAsked < 2) {
        this.score.discoveryQuestionsAsked++;
        console.log(`✅ Discovery question #${this.score.discoveryQuestionsAsked} detected`);
      }
    }
    
    // Check for problem framing
    if (this.detectProblemFraming(userText)) {
      this.score.problemFramed = true;
      console.log('✅ Problem framing detected');
    }
    
    // Check for close attempt
    if (this.detectCloseAttempt(lowerText)) {
      this.score.closeAttempted = true;
      console.log('✅ Close attempt detected');
    }
    
    // Check for objection handling
    this.detectObjectionHandling(userText, timestamp);
    
    // Update total score
    this.updateTotalScore();
  }
  
  /**
   * Process Marcus's response to detect pain point reveals and objection triggers
   */
  processMarcusResponse(marcusText: string): void {
    this.conversationHistory.push({ role: 'assistant', content: marcusText });
    
    const lowerText = marcusText.toLowerCase();
    const timestamp = Date.now();
    
    // Check if Marcus revealed any pain points
    this.detectPainPointReveals(marcusText, timestamp);
    
    // Check if Marcus triggered any objections
    this.detectObjectionTriggers(marcusText, timestamp);
  }
  
  /**
   * Check if win condition is met
   */
  checkWinCondition(): { won: boolean; reason: string } {
    const discoveredCount = this.getDiscoveredHiddenPainCount();
    const handledCount = this.getHandledObjectionCount();
    const hasClose = this.score.closeAttempted;
    
    const { requiredDiscoveries, requiredObjectionHandling, mustBookMeeting } = this.scenario.winCondition;
    
    if (discoveredCount < requiredDiscoveries) {
      return {
        won: false,
        reason: `Need to discover ${requiredDiscoveries} hidden pain points (found ${discoveredCount})`
      };
    }
    
    if (handledCount < requiredObjectionHandling) {
      return {
        won: false,
        reason: `Need to handle ${requiredObjectionHandling} objections (handled ${handledCount})`
      };
    }
    
    if (mustBookMeeting && !hasClose) {
      return {
        won: false,
        reason: 'Need to ask for the meeting with specific time options'
      };
    }
    
    return { won: true, reason: 'All win conditions met!' };
  }
  
  /**
   * Get current score
   */
  getScore(): CallScore {
    return { ...this.score };
  }
  
  /**
   * Get pain point summary
   */
  getPainPointSummary() {
    return {
      visible: Array.from(this.visiblePains.values()),
      hidden: Array.from(this.hiddenPains.values()),
      discoveredCount: this.getDiscoveredHiddenPainCount(),
      requiredCount: this.scenario.winCondition.requiredDiscoveries
    };
  }
  
  /**
   * Get objection summary
   */
  getObjectionSummary() {
    return {
      objections: Array.from(this.objections.values()),
      handledCount: this.getHandledObjectionCount(),
      requiredCount: this.scenario.winCondition.requiredObjectionHandling
    };
  }
  
  /**
   * Get full call report
   */
  getCallReport() {
    const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
    const winCondition = this.checkWinCondition();
    
    return {
      scenario: this.scenario.name,
      difficulty: this.scenario.difficulty,
      duration,
      score: this.getScore(),
      painPoints: this.getPainPointSummary(),
      objections: this.getObjectionSummary(),
      winCondition,
      conversationLength: this.conversationHistory.length
    };
  }
  
  // ============================================================================
  // Private Detection Methods
  // ============================================================================
  
  private detectPermissionOpener(text: string): boolean {
    const patterns = [
      /do you have (a )?(second|minute|moment|20 seconds)/i,
      /can i (ask|take|get) (a )?(second|minute|moment)/i,
      /quick (question|one)/i,
      /i'll be brief/i,
      /make it quick/i
    ];
    return patterns.some(p => p.test(text));
  }
  
  private detectDiscoveryQuestion(text: string): boolean {
    // Questions about current state, timing, metrics, or pain
    const hasQuestionMark = text.includes('?');
    const hasDiscoveryWords = /when did|how (many|often|fast)|do you know|are you|what percentage|which|who/i.test(text);
    return hasQuestionMark && hasDiscoveryWords;
  }
  
  private detectProblemFraming(text: string): boolean {
    // Reframing the problem in business terms
    const framingPhrases = [
      /roi|return on investment/i,
      /retention|keeping clients/i,
      /downtime|locked out/i,
      /trust|credibility/i,
      /waste|wasting/i,
      /gap|blind spot/i,
      /clarity|clear/i
    ];
    return framingPhrases.some(p => p.test(text));
  }
  
  private detectCloseAttempt(text: string): boolean {
    // Looking for two time options or calendar commitment
    const hasTimeOptions = /((monday|tuesday|wednesday|thursday|friday) .*or.*(monday|tuesday|wednesday|thursday|friday))|(\d{1,2}:\d{2}.*or.*\d{1,2}:\d{2})/i.test(text);
    const hasBookingLanguage = /(book|schedule|set up|calendar|next week|12 minutes|10 minutes)/i.test(text);
    return hasTimeOptions || hasBookingLanguage;
  }
  
  private detectObjectionHandling(userText: string, timestamp: number): void {
    // Check if user is responding to a triggered objection
    const recentlyTriggered = Array.from(this.objections.values())
      .filter(obj => obj.status === 'triggered' && timestamp - (obj.triggeredAt || 0) < 30000);
    
    if (recentlyTriggered.length === 0) return;
    
    const lowerText = userText.toLowerCase();
    
    // Generic objection handling patterns
    const handlingPatterns = [
      /that's (why|exactly|fair|totally)/i,
      /i understand|i get (it|that)/i,
      /keep (them|your)/i,
      /doesn't replace/i,
      /not (a|about)/i,
      /this is(n't| not)/i,
      /second opinion/i,
      /smallest (step|possible)/i
    ];
    
    if (handlingPatterns.some(p => p.test(lowerText))) {
      // Mark the most recently triggered objection as handled
      recentlyTriggered.forEach(obj => {
        const key = obj.text;
        this.objections.set(key, {
          ...obj,
          status: 'handled',
          handledAt: timestamp
        });
        this.score.objectionsHandled++;
        console.log(`✅ Objection handled: "${obj.text}"`);
      });
    }
  }
  
  private detectPainPointReveals(marcusText: string, timestamp: number): void {
    // Check if Marcus revealed any pain points in his response
    this.hiddenPains.forEach((state, painText) => {
      if (state.status === 'undiscovered') {
        // Look for keywords from the pain point in Marcus's response
        const keywords = this.extractKeywords(painText);
        const marcusLower = marcusText.toLowerCase();
        
        if (keywords.some(kw => marcusLower.includes(kw.toLowerCase()))) {
          this.hiddenPains.set(painText, {
            ...state,
            status: 'discovered',
            discoveredAt: timestamp
          });
          console.log(`🎯 Hidden pain discovered: "${painText}"`);
        }
      }
    });
  }
  
  private detectObjectionTriggers(marcusText: string, timestamp: number): void {
    // Check if Marcus triggered any objections
    this.objections.forEach((state, objectionText) => {
      if (state.status === 'not-triggered') {
        const keywords = this.extractKeywords(objectionText);
        const marcusLower = marcusText.toLowerCase();
        
        if (keywords.some(kw => marcusLower.includes(kw.toLowerCase()))) {
          this.objections.set(objectionText, {
            ...state,
            status: 'triggered',
            triggeredAt: timestamp
          });
          console.log(`⚠️ Objection triggered: "${objectionText}"`);
        }
      }
    });
  }
  
  private extractKeywords(text: string): string[] {
    // Extract meaningful keywords from pain points/objections
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'for', 'to', 'of', 'in', 'on', 'at'];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
  }
  
  private getDiscoveredHiddenPainCount(): number {
    return Array.from(this.hiddenPains.values())
      .filter(p => p.status !== 'undiscovered').length;
  }
  
  private getHandledObjectionCount(): number {
    return Array.from(this.objections.values())
      .filter(o => o.status === 'handled').length;
  }
  
  private updateTotalScore(): void {
    const criteria = this.scenario.scoringCriteria;
    let total = 0;
    
    if (this.score.permissionOpener) total += criteria.permissionOpener;
    total += Math.min(this.score.discoveryQuestionsAsked, 2) * (criteria.discoveryQuestions / 2);
    if (this.score.problemFramed) total += criteria.problemFraming;
    total += Math.min(this.score.objectionsHandled, 2) * (criteria.objectionHandling / 2);
    if (this.score.closeAttempted) total += criteria.clearClose;
    
    // Concise control: call under 90 seconds with at least 3 exchanges
    const duration = (Date.now() - this.callStartTime) / 1000;
    const exchanges = this.conversationHistory.filter(m => m.role === 'user').length;
    if (duration <= 90 && exchanges >= 3) {
      total += criteria.conciseControl;
      this.score.conciseControl = true;
    }
    
    this.score.totalPoints = Math.round(total * 10) / 10;
  }
}

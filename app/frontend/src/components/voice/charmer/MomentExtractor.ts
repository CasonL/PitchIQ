/**
 * MomentExtractor.ts
 * Identifies 3-5 pivotal moments from a call for interactive coaching
 */

import { ConversationExchange, ExchangePair } from './ConversationTranscript';
import { ObjectionType } from './StrategyLayer';

export type MomentType = 'positive_shift' | 'negative_shift' | 'missed_leverage' | 'unresolved_concern';

// Moment classifications with nuance support
export type MomentClassification = 
  // Clean wins
  | 'best_moment' 
  | 'strong_move' 
  | 'turning_point'
  // Nuanced (right move, rough execution)
  | 'partial_turning_point'
  | 'strong_attempt'
  | 'mixed_signal'
  // Clean losses
  | 'missed_opportunity' 
  | 'mistake' 
  | 'blunder';

export type ReasonTag = 'Trust' | 'Proof' | 'Discovery' | 'Urgency' | 'Clarity' | 'Fit' | 'Value';

export interface SurroundingExchange {
  speaker: 'user' | 'marcus';
  text: string;
  timestamp: number;
}

export interface KeyMoment {
  id: string;
  type: MomentType;
  classification: MomentClassification; // Chess-style label
  reasonTag: ReasonTag;
  timestamp: number;
  turnNumber: number;
  
  // Decisive, coach-like title
  title: string; // e.g. "Strong move: you made the offer more concrete"
  
  // The exchange
  userMessage: string;
  marcusResponse: string;
  
  // Surrounding context (2 before, 2 after)
  surroundingContext: {
    before: SurroundingExchange[];
    after: SurroundingExchange[];
  };
  
  // Context for coaching
  resistanceBefore: number;
  resistanceAfter: number;
  whatChanged: string; // Brief description of state change
  humanConsequence: string; // Human-readable consequence (e.g., "moved Marcus from guarded to curious")
  
  // For coaching panel
  whyItMatters: string; // Why this moment was pivotal
  marcusState: {
    trust: string;      // "low", "moderate", "high"
    curiosity: string;  // "low", "moderate", "high"
    urgency: string;    // "low", "moderate", "high"
    activeObjection?: string;
  };
}

interface MomentExtractionContext {
  conversationExchanges: ConversationExchange[];
  objectionData: {
    objectionSatisfaction: Record<string, number>;
    objectionCounts: Record<string, number>;
    activeObjection?: string;
  };
  finalResistance: number;
  buyerState?: {
    clarity?: number;
    trustLevel: number;
    relevance?: number;
  };
}

export class MomentExtractor {
  private static allExchanges: ConversationExchange[] = [];
  
  /**
   * Extract 3-5 key moments from a call
   * Returns mix of: 1 positive, 1-2 negative, 1-2 missed opportunities/unresolved concerns
   */
  static extractKeyMoments(context: MomentExtractionContext): KeyMoment[] {
    const moments: KeyMoment[] = [];
    const exchanges = context.conversationExchanges;
    
    // Store exchanges for context extraction
    this.allExchanges = exchanges;
    
    if (exchanges.length < 4) {
      return moments; // Too short to analyze
    }
    
    // Build exchange pairs
    const pairs = this.buildExchangePairs(exchanges);
    
    // Check for opening issues first (when opening score would be low)
    const openingIssues = this.findOpeningIssues(pairs, context);
    
    // Identify candidates for each type
    const positiveShifts = this.findPositiveShifts(pairs, context);
    const negativeShifts = this.findNegativeShifts(pairs, context);
    const missedOpportunities = this.findMissedOpportunities(pairs, context);
    const unresolvedConcerns = this.findUnresolvedConcerns(pairs, context);
    
    // Debug logging
    console.log(`📊 Moment candidate breakdown:`, {
      openingIssues: openingIssues.length,
      positiveShifts: positiveShifts.length,
      negativeShifts: negativeShifts.length,
      missedOpportunities: missedOpportunities.length,
      unresolvedConcerns: unresolvedConcerns.length,
      totalPairs: pairs.length
    });
    
    // Filter with LLM for true impact
    const candidateMoments = [...openingIssues, ...positiveShifts, ...negativeShifts, ...missedOpportunities, ...unresolvedConcerns];
    
    console.log(`🔍 Evaluating ${candidateMoments.length} candidate moments with LLM...`);
    
    // NUANCED MOMENT DETECTION: Detect when same turn has both positive AND negative signals
    // This captures the nuance: right move, rough execution
    const momentsByTurn = new Map<number, KeyMoment[]>();
    
    // Group moments by turn number
    for (const moment of candidateMoments) {
      const existing = momentsByTurn.get(moment.turnNumber) || [];
      existing.push(moment);
      momentsByTurn.set(moment.turnNumber, existing);
    }
    
    // Merge moments from same turn into nuanced classifications when appropriate
    const finalMoments: KeyMoment[] = [];
    
    for (const [turnNumber, moments] of momentsByTurn.entries()) {
      if (moments.length === 1) {
        // Single moment for this turn - use as-is
        finalMoments.push(moments[0]);
      } else {
        // Multiple moments for same turn - check if we should merge into nuanced type
        const hasPositive = moments.some(m => m.type === 'positive_shift');
        const hasMissed = moments.some(m => m.type === 'missed_leverage');
        const hasNegative = moments.some(m => m.type === 'negative_shift');
        
        if (hasPositive && (hasMissed || hasNegative)) {
          // NUANCED: Positive shift + missed opportunity/negative = partial win
          const positiveMoment = moments.find(m => m.type === 'positive_shift')!;
          const negativeMoment = moments.find(m => m.type === 'missed_leverage' || m.type === 'negative_shift')!;
          
          // Determine which nuanced classification to use
          let nuancedClassification: MomentClassification;
          if (positiveMoment.classification === 'turning_point') {
            nuancedClassification = 'partial_turning_point';
          } else if (positiveMoment.classification === 'strong_move') {
            nuancedClassification = 'strong_attempt';
          } else {
            nuancedClassification = 'mixed_signal';
          }
          
          // Use positive moment as base, upgrade to nuanced classification
          finalMoments.push({
            ...positiveMoment,
            classification: nuancedClassification,
            title: this.generateNuancedTitle(nuancedClassification, positiveMoment, negativeMoment),
            whatChanged: `${positiveMoment.whatChanged}, but ${negativeMoment.whatChanged.toLowerCase()}`
          });
        } else {
          // Multiple moments but not positive+negative - pick highest priority
          const typePriority = {
            'positive_shift': 1,
            'negative_shift': 2,
            'missed_leverage': 3,
            'unresolved_concern': 4
          };
          const sorted = moments.sort((a, b) => typePriority[a.type] - typePriority[b.type]);
          finalMoments.push(sorted[0]);
        }
      }
    }
    
    console.log(`🎭 Processed ${candidateMoments.length} candidates into ${finalMoments.length} moments (${finalMoments.filter(m => ['partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(m.classification)).length} nuanced)`);
    
    // Note: LLM filtering happens async in MarcusPostCallMoments
    // For now, return top candidates by resistance change magnitude
    const sortedByImpact = finalMoments.sort((a, b) => {
      const impactA = Math.abs(a.resistanceAfter - a.resistanceBefore);
      const impactB = Math.abs(b.resistanceAfter - b.resistanceBefore);
      return impactB - impactA;
    });
    
    return sortedByImpact.slice(0, 8); // Return more candidates for LLM to filter
  }
  
  /**
   * Generate title for nuanced moment that captures both positive and negative aspects
   */
  private static generateNuancedTitle(
    classification: MomentClassification,
    positiveMoment: KeyMoment,
    negativeMoment: KeyMoment
  ): string {
    switch (classification) {
      case 'partial_turning_point':
        return 'Partial win: Right move, rough execution';
      case 'strong_attempt':
        return 'Strong attempt: Good instinct, incomplete follow-through';
      case 'mixed_signal':
        return 'Mixed result: Addressed need, left opening unexplored';
      default:
        return positiveMoment.title;
    }
  }
  
  /**
   * Analyze opening exchanges when opening score is low
   * Identifies specific opening mistakes rather than just resistance changes
   */
  private static findOpeningIssues(
    pairs: Array<{ marcusStatement: ConversationExchange; userResponse: ConversationExchange; outcome: ConversationExchange | null; index: number }>,
    context: MomentExtractionContext
  ): KeyMoment[] {
    const issues: KeyMoment[] = [];
    
    // Calculate what the opening score would be using INITIAL resistance
    const initialResistance = context.conversationExchanges[0]?.resistanceLevel || context.finalResistance;
    const resistanceScore = Math.max(0, 100 - (initialResistance * 10));
    const trustScore = Math.max(0, Math.min(100, ((context.buyerState?.trustLevel || 0) / 10) * 100));
    const openingScore = Math.round((resistanceScore * 0.6) + (trustScore * 0.4));
    
    console.log(`🎬 Opening analysis: initialRes=${initialResistance}, score=${openingScore}`);
    
    // Only analyze if opening score is weak (< 70) - increased threshold
    if (openingScore >= 70 || pairs.length < 2) {
      return issues;
    }
    
    // Analyze first 2-3 exchanges for specific patterns
    const openingPairs = pairs.slice(0, Math.min(3, pairs.length));
    
    for (const pair of openingPairs) {
      if (!pair.outcome) continue;
      
      const userText = pair.userResponse.text.toLowerCase();
      const marcusText = pair.marcusStatement.text.toLowerCase();
      const outcomeText = pair.outcome.text.toLowerCase();
      
      let issueFound = false;
      let issueType = '';
      let coaching = '';
      
      // Pattern 1: Rushed into pitch or time ask without rapport
      if (pair.index <= 1) {
        const isPitching = /we (help|offer|provide|specialize|work with)|our (service|product|solution|platform)|what we do is/.test(userText);
        const askedForTime = /(do you have|got|have you got).*(minute|second|time|moment)|wondering if you/.test(userText);
        const isLongExplanation = userText.split(' ').length > 30;
        const marcusShowsResistance = /not interested|busy|have someone|no thanks|don't need|what do you want/.test(outcomeText);
        
        if ((isPitching || askedForTime || isLongExplanation) && marcusShowsResistance && pair.index === 0) {
          issueFound = true;
          issueType = askedForTime ? 'Asked for time too early' : 'Rushed into pitch';
          coaching = askedForTime 
            ? 'Asking "do you have 5 minutes" on a cold call signals you\'re about to pitch. Build rapport first.'
            : 'You jumped straight into explaining your product. On cold calls, build a moment of rapport first before pitching.';
        }
      }
      
      // Pattern 2: Generic/weak opener
      if (pair.index === 0 && !issueFound) {
        const isGeneric = /how are you|how's it going|hope (you're|you are) doing well/.test(userText);
        const noContext = !/(noticed|saw|read|researched|looked at)/.test(userText);
        const marcusGuarded = pair.outcome.resistanceLevel && pair.outcome.resistanceLevel >= 7;
        
        if (isGeneric && noContext && marcusGuarded) {
          issueFound = true;
          issueType = 'Weak opener';
          coaching = 'Generic openers like "How are you?" signal cold call. Try referencing something specific about their business to show you did research.';
        }
      }
      
      // Pattern 3: Didn't handle initial pushback
      if (pair.index <= 2 && !issueFound) {
        const marcusObjected = /not interested|busy|have someone|send (me )?something|call.*later/.test(marcusText);
        const userIgnored = !/(understand|hear you|makes sense|fair|appreciate|respect)/.test(userText);
        const userKeptPitching = /let me|what we do|our (service|product)|we help/.test(userText);
        const resistanceWentUp = pair.outcome.resistanceLevel && pair.marcusStatement.resistanceLevel && 
                                 pair.outcome.resistanceLevel > pair.marcusStatement.resistanceLevel;
        
        if (marcusObjected && (userIgnored || userKeptPitching) && resistanceWentUp) {
          issueFound = true;
          issueType = 'Ignored objection';
          coaching = `Marcus said "${this.extractQuote(marcusText, 40)}" but you kept pitching. Acknowledge objections before responding.`;
        }
      }
      
      // Pattern 4: No credibility building
      if (pair.index <= 2 && !issueFound) {
        const userMadesClaim = /we (help|work with|improve|increase|boost)|best|top|leading|expert/.test(userText);
        const noProof = !/(company|client|customer|team|case|example|result)/.test(userText);
        const marcusSkeptical = /prove|show me|evidence|everyone says|heard.*before/.test(outcomeText);
        
        if (userMadesClaim && noProof && marcusSkeptical) {
          issueFound = true;
          issueType = 'No credibility';
          coaching = 'You made claims without proof early. Drop a quick credibility marker ("We work with 3 SaaS companies in Denver") to earn attention.';
        }
      }
      
      if (issueFound) {
        const marcusState = this.inferMarcusState(pair.outcome.resistanceLevel || 5, pair.outcome, context);
        issues.push({
          id: `opening_${pair.index}`,
          type: 'negative_shift',
          classification: 'mistake',
          reasonTag: 'Trust', // Opening issues are about building trust
          timestamp: pair.userResponse.timestamp,
          turnNumber: Math.floor(pair.index / 2) + 1,
          title: `Opening mistake: ${issueType}`,
          userMessage: pair.userResponse.text,
          marcusResponse: pair.marcusStatement.text,
          surroundingContext: this.extractSurroundingContext(pair.index),
          resistanceBefore: pair.marcusStatement.resistanceLevel || 5,
          resistanceAfter: pair.outcome.resistanceLevel || 5,
          whatChanged: `Opening landed poorly - ${issueType.toLowerCase()}`,
          humanConsequence: 'Marcus became guarded instead of curious',
          whyItMatters: coaching,
          marcusState
        });
        break; // Only flag one opening issue
      }
    }
    
    return issues;
  }
  
  /**
   * Find moments where user's response improved buyer state
   * NEW MODEL: Marcus said X → User responded Y → Positive outcome
   */
  private static findPositiveShifts(
    pairs: Array<{ marcusStatement: ConversationExchange; userResponse: ConversationExchange; outcome: ConversationExchange | null; index: number }>,
    context: MomentExtractionContext
  ): KeyMoment[] {
    const shifts: KeyMoment[] = [];
    
    for (const pair of pairs) {
      // Skip greeting/opening exchanges (first 2 turns only)
      if (pair.index < 2) {
        continue;
      }
      
      if (!pair.outcome) continue; // Need outcome to measure impact
      
      const beforeRes = pair.marcusStatement.resistanceLevel || 5;
      const afterRes = pair.outcome.resistanceLevel || 5;
      const resistanceDrop = beforeRes - afterRes;
      
      // Skip technical exchanges
      if (this.isTechnicalExchange(pair.userResponse.text, pair.marcusStatement.text)) {
        continue;
      }
      
      // Resistance dropped meaningfully after user's response
      if (resistanceDrop >= 1.0) {
        const marcusState = this.inferMarcusState(afterRes, pair.outcome, context);
        
        // DETECT EXIT MOMENTS: Marcus gives soft exit ("send me something", "I'll look later")
        // These should NOT be classified as clean wins even if resistance dropped slightly
        const marcusText = pair.marcusStatement.text.toLowerCase();
        const isExitMoment = /send (me )?(something|info)|i'll (take a )?look later|i've got to (run|go)|not a fit right now|call.*later|email.*later/.test(marcusText);
        
        if (isExitMoment) {
          // This is an exit handoff moment - should be nuanced at best, not a clean win
          shifts.push({
            id: `pos_${pair.index}`,
            type: 'positive_shift',
            classification: 'mixed_signal', // Exit moments are nuanced: accepted exit but how was execution?
            reasonTag: 'Clarity',
            timestamp: pair.userResponse.timestamp,
            turnNumber: Math.floor(pair.index / 2) + 1,
            title: 'Exit handoff: Marcus gave next step',
            userMessage: pair.userResponse.text,
            marcusResponse: pair.marcusStatement.text,
            surroundingContext: this.extractSurroundingContext(pair.index),
            resistanceBefore: beforeRes,
            resistanceAfter: afterRes,
            whatChanged: `Marcus gave soft exit - next step is to send follow-up`,
            humanConsequence: 'Call ended with path forward, but no commitment',
            whyItMatters: 'Exit handoffs are critical - keep them short and clear to maintain credibility',
            marcusState
          });
        } else {
          // Normal positive shift
          shifts.push({
            id: `pos_${pair.index}`,
            type: 'positive_shift',
            classification: this.classifyPositiveMoment(resistanceDrop, marcusState, pair.userResponse.text),
            reasonTag: this.inferReasonTag(pair.userResponse.text, pair.outcome.objectionTriggered),
            timestamp: pair.userResponse.timestamp,
            turnNumber: Math.floor(pair.index / 2) + 1,
            title: this.generateDecisiveTitle('positive', pair.userResponse.text, pair.outcome.text, resistanceDrop),
            userMessage: pair.userResponse.text,
            marcusResponse: pair.marcusStatement.text,
            surroundingContext: this.extractSurroundingContext(pair.index),
            resistanceBefore: beforeRes,
            resistanceAfter: afterRes,
            whatChanged: `Resistance dropped from ${beforeRes.toFixed(1)} to ${afterRes.toFixed(1)}`,
            humanConsequence: this.generateHumanConsequence(beforeRes, afterRes, marcusState),
            whyItMatters: this.explainPositiveShift(pair.outcome.text, resistanceDrop),
            marcusState
          });
        }
      }
      
      // Pain point revealed after user's response
      if (pair.outcome.painPointRevealed) {
        const marcusState = this.inferMarcusState(afterRes, pair.outcome, context);
        shifts.push({
          id: `pain_${pair.index}`,
          type: 'positive_shift',
          classification: 'strong_move',
          reasonTag: 'Discovery',
          timestamp: pair.userResponse.timestamp,
          turnNumber: Math.floor(pair.index / 2) + 1,
          title: `Strong move: Marcus opened up about a pain point`,
          userMessage: pair.userResponse.text,
          marcusResponse: pair.marcusStatement.text,
          surroundingContext: this.extractSurroundingContext(pair.index),
          resistanceBefore: beforeRes,
          resistanceAfter: afterRes,
          whatChanged: `Pain revealed: "${pair.outcome.painPointRevealed}"`,
          humanConsequence: 'Marcus moved from guarded to revealing actual challenges',
          whyItMatters: 'Your response prompted the buyer to open up about a real challenge',
          marcusState
        });
      }
    }
    
    // Sort by impact (resistance drop magnitude)
    return shifts.sort((a, b) => 
      (b.resistanceBefore - b.resistanceAfter) - (a.resistanceBefore - a.resistanceAfter)
    );
  }
  
  /**
   * Find moments where user's response worsened buyer state
   * NEW MODEL: Marcus said X → User responded Y → Negative outcome
   */
  private static findNegativeShifts(
    pairs: Array<{ marcusStatement: ConversationExchange; userResponse: ConversationExchange; outcome: ConversationExchange | null; index: number }>,
    context: MomentExtractionContext
  ): KeyMoment[] {
    const shifts: KeyMoment[] = [];
    
    for (const pair of pairs) {
      // Skip greeting/opening exchanges (first 2 turns only)
      if (pair.index < 2) {
        continue;
      }
      
      if (!pair.outcome) continue; // Need outcome to measure impact
      
      const beforeRes = pair.marcusStatement.resistanceLevel || 5;
      const afterRes = pair.outcome.resistanceLevel || 5;
      const resistanceIncrease = afterRes - beforeRes;
      
      // Skip if this is a technical/clarification exchange (not a real sales moment)
      if (this.isTechnicalExchange(pair.userResponse.text, pair.marcusStatement.text)) {
        continue;
      }
      
      // Resistance increased meaningfully after user's response
      if (resistanceIncrease >= 1.0) {
        const marcusState = this.inferMarcusState(afterRes, pair.outcome, context);
        shifts.push({
          id: `neg_${pair.index}`,
          type: 'negative_shift',
          classification: this.classifyNegativeMoment(resistanceIncrease),
          reasonTag: this.inferReasonTag(pair.userResponse.text, pair.outcome.objectionTriggered),
          timestamp: pair.userResponse.timestamp,
          turnNumber: Math.floor(pair.index / 2) + 1,
          title: this.generateDecisiveTitle('negative', pair.userResponse.text, pair.outcome.text, resistanceIncrease),
          userMessage: pair.userResponse.text,
          marcusResponse: pair.marcusStatement.text,
          surroundingContext: this.extractSurroundingContext(pair.index),
          resistanceBefore: beforeRes,
          resistanceAfter: afterRes,
          whatChanged: `Resistance increased from ${beforeRes.toFixed(1)} to ${afterRes.toFixed(1)}`,
          humanConsequence: this.generateHumanConsequence(beforeRes, afterRes, marcusState),
          whyItMatters: this.explainNegativeShift(pair.outcome.text, resistanceIncrease, pair.outcome.objectionTriggered),
          marcusState
        });
      }
    }
    
    // Sort by impact (resistance increase magnitude)
    return shifts.sort((a, b) => 
      (b.resistanceAfter - b.resistanceBefore) - (a.resistanceAfter - a.resistanceBefore)
    );
  }
  
  /**
   * Find moments where Marcus revealed something important but user didn't capitalize
   * NEW MODEL: Marcus said X → User responded Y → Missed opportunity
   */
  private static findMissedOpportunities(
    pairs: Array<{ marcusStatement: ConversationExchange; userResponse: ConversationExchange; outcome: ConversationExchange | null; index: number }>,
    context: MomentExtractionContext
  ): KeyMoment[] {
    const missed: KeyMoment[] = [];
    
    for (let i = 2; i < pairs.length - 1; i++) { // Start at turn 2 to skip greetings
      const pair = pairs[i];
      const nextPair = pairs[i + 1];
      
      const marcusText = pair.marcusStatement.text.toLowerCase();
      
      // Marcus signaled low urgency/satisfaction but user didn't dig deeper
      const satisfactionSignals = [
        /we're (doing okay|fine|all set|good)/,
        /already have (someone|something|a solution)/,
        /not really (a priority|urgent|pressing)/
      ];
      
      const containsSatisfactionSignal = satisfactionSignals.some(regex => regex.test(marcusText));
      
      if (containsSatisfactionSignal) {
        const userText = pair.userResponse.text.toLowerCase();
        const askedWhy = /why|what.*important|how.*affect|impact|problem|challenge/.test(userText);
        
        if (!askedWhy) {
          const marcusState = this.inferMarcusState(pair.outcome?.resistanceLevel || 5, pair.outcome || pair.marcusStatement, context);
          missed.push({
            id: `missed_${i}`,
            type: 'missed_leverage',
            classification: 'missed_opportunity',
            reasonTag: 'Discovery',
            timestamp: pair.userResponse.timestamp,
            turnNumber: Math.floor(pair.index / 2) + 1,
            title: `Missed opportunity: "${this.extractQuote(marcusText, 30)}" was left unexplored`,
            userMessage: pair.userResponse.text,
            marcusResponse: pair.marcusStatement.text,
            surroundingContext: this.extractSurroundingContext(pair.index),
            resistanceBefore: pair.marcusStatement.resistanceLevel || 5,
            resistanceAfter: pair.outcome?.resistanceLevel || 5,
            whatChanged: 'Conversation moved on without uncovering pain',
            humanConsequence: 'Marcus stayed comfortable with status quo',
            whyItMatters: 'Marcus signaled satisfaction with status quo - this was your moment to uncover hidden pain or urgency',
            marcusState
          });
        }
      }
    }
    
    return missed;
  }
  
  /**
   * Find objections that were raised but never adequately resolved
   * NEW MODEL: Marcus raised concern → User responded → Concern persisted
   */
  private static findUnresolvedConcerns(
    pairs: Array<{ marcusStatement: ConversationExchange; userResponse: ConversationExchange; outcome: ConversationExchange | null; index: number }>,
    context: MomentExtractionContext
  ): KeyMoment[] {
    const unresolved: KeyMoment[] = [];
    const objectionData = context.objectionData;
    
    // Find the most common unresolved objections
    const unresolvedTypes = Object.entries(objectionData.objectionSatisfaction)
      .filter(([type, satisfaction]) => satisfaction < 0.5 && (objectionData.objectionCounts[type] || 0) > 0)
      .sort((a, b) => (objectionData.objectionCounts[b[0]] || 0) - (objectionData.objectionCounts[a[0]] || 0));
    
    console.log(`🔍 Unresolved objections:`, unresolvedTypes.map(([type, sat]) => `${type}=${sat.toFixed(2)}`));
    
    if (unresolvedTypes.length === 0) return [];
    
    const topUnresolvedType = unresolvedTypes[0][0];
    
    // Find the first time this objection was raised - check both objectionTriggered and objectionType
    for (const pair of pairs) {
      const objectionMatch = pair.outcome?.objectionTriggered?.toLowerCase() === topUnresolvedType.toLowerCase() ||
                            pair.outcome?.objectionType?.toLowerCase() === topUnresolvedType.toLowerCase() ||
                            pair.marcusStatement.objectionTriggered?.toLowerCase() === topUnresolvedType.toLowerCase();
      
      if (objectionMatch) {
        const satisfaction = objectionData.objectionSatisfaction[topUnresolvedType] || 0;
        const count = objectionData.objectionCounts[topUnresolvedType] || 0;
        
        const marcusState = this.inferMarcusState(pair.outcome?.resistanceLevel || 5, pair.outcome || pair.marcusStatement, context);
        unresolved.push({
          id: `unresolved_${topUnresolvedType}`,
          type: 'unresolved_concern',
          classification: 'mistake',
          reasonTag: this.mapObjectionToTag(topUnresolvedType),
          timestamp: pair.userResponse.timestamp,
          turnNumber: Math.floor(pair.index / 2) + 1,
          title: `Mistake: ${topUnresolvedType} concern stayed unresolved`,
          userMessage: pair.userResponse.text,
          marcusResponse: pair.marcusStatement.text,
          surroundingContext: this.extractSurroundingContext(pair.index),
          resistanceBefore: pair.marcusStatement.resistanceLevel || 5,
          resistanceAfter: pair.outcome?.resistanceLevel || 5,
          whatChanged: `Objection raised ${count}x, satisfaction ${(satisfaction * 100).toFixed(0)}%`,
          humanConsequence: `Marcus kept returning to ${topUnresolvedType} concerns`,
          whyItMatters: `This concern was raised ${count} times but your responses never adequately addressed it`,
          marcusState
        });
        
        break; // Only need the first occurrence
      }
    }
    
    return unresolved;
  }
  
  /**
   * Build exchange pairs: Marcus says X → User responds Y → Outcome Z
   * We coach the user's RESPONSE to Marcus
   */
  private static buildExchangePairs(exchanges: ConversationExchange[]): Array<{
    marcusStatement: ConversationExchange;  // What Marcus said (the trigger)
    userResponse: ConversationExchange;     // How user responded (what we're coaching)
    outcome: ConversationExchange | null;   // Marcus's reaction (the result)
    index: number;
  }> {
    const pairs: Array<{ 
      marcusStatement: ConversationExchange;
      userResponse: ConversationExchange;
      outcome: ConversationExchange | null;
      index: number;
    }> = [];
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      if (exchanges[i].speaker === 'marcus' && exchanges[i + 1].speaker === 'user') {
        // Marcus said something → User responded → Get outcome
        const outcome = i + 2 < exchanges.length && exchanges[i + 2].speaker === 'marcus' 
          ? exchanges[i + 2] 
          : null;
        
        pairs.push({
          marcusStatement: exchanges[i],
          userResponse: exchanges[i + 1],
          outcome,
          index: i
        });
      }
    }
    
    return pairs;
  }
  
  /**
   * Detect execution quality issues that indicate poor delivery
   */
  private static hasExecutionIssues(userText: string): boolean {
    const text = userText.toLowerCase();
    
    // Detect word repetition ("through their through their", "your your")
    const wordRepetitionPattern = /\b(\w+)\s+\1\b/g;
    const hasRepetition = wordRepetitionPattern.test(text);
    
    // Detect excessive filler words
    const fillerWords = (text.match(/\b(um|uh|like|you know|basically|actually)\b/g) || []).length;
    const hasExcessiveFillers = fillerWords >= 3;
    
    // Detect very long run-on sentences (> 30 words without period)
    const sentences = userText.split(/[.!?]+/);
    const hasRunOnSentence = sentences.some(s => s.trim().split(/\s+/).length > 30);
    
    // Detect grammatical awkwardness patterns
    const awkwardPatterns = [
      /\b(are you are you|do you do you|is there is there)\b/i, // stammering
      /\b(any one existing|some one existing)\b/i, // "any one" instead of "anyone"
      /\bhope people companies\b/i, // confused phrase structure
      /\b(gain|get) more (clients|customers) through their through their\b/i // specific repetition
    ];
    const hasAwkwardPhrasing = awkwardPatterns.some(p => p.test(text));
    
    return hasRepetition || hasExcessiveFillers || hasRunOnSentence || hasAwkwardPhrasing;
  }
  
  /**
   * Classify positive moment as best_moment, strong_move, or turning_point
   * Now considers execution quality to prevent over-generous classifications
   */
  private static classifyPositiveMoment(resistanceDrop: number, marcusState: any, userText?: string): MomentClassification {
    // Check execution quality first
    const poorExecution = userText ? this.hasExecutionIssues(userText) : false;
    
    // Best moment: huge drop + high trust/curiosity + clean execution
    if (resistanceDrop >= 4.0 && (marcusState.trust === 'high' || marcusState.curiosity === 'high') && !poorExecution) {
      return 'best_moment';
    }
    
    // Turning point: significant shift + clean execution
    if (resistanceDrop >= 3.5 && !poorExecution) {
      return 'turning_point';
    }
    
    // Poor execution detected: downgrade to nuanced classification
    if (poorExecution) {
      console.log(`⚠️ Execution issues detected, downgrading to strong_attempt`);
      return 'strong_attempt'; // Right move, rough execution
    }
    
    // Strong move: solid improvement with clean execution
    return 'strong_move';
  }
  
  /**
   * Classify negative moment as mistake or blunder
   */
  private static classifyNegativeMoment(resistanceIncrease: number): MomentClassification {
    // Blunder: major damage
    if (resistanceIncrease >= 4.0) {
      return 'blunder';
    }
    
    // Mistake: significant damage
    return 'mistake';
  }
  
  /**
   * Generate decisive, chess-style title
   */
  private static generateDecisiveTitle(type: 'positive' | 'negative', userText: string, outcomeText: string, delta: number): string {
    const outcome = outcomeText.toLowerCase();
    const user = userText.toLowerCase();
    
    if (type === 'positive') {
      // Look for specific positive signals
      if (/interesting|intrigued|sounds good|i like/.test(outcome)) {
        return 'Strong move: you sparked genuine interest';
      }
      if (/make sense|understand|clear|get it/.test(outcome)) {
        return 'Strong move: you made it concrete';
      }
      if (/tell me more|what about|how does/.test(outcome)) {
        return 'Turning point: Marcus leaned in';
      }
      if (delta >= 4.0) {
        return 'Best moment: major breakthrough';
      }
      return 'Strong move: you created momentum';
    } else {
      // Negative signals
      if (/proof|evidence|case stud|track record/.test(outcome)) {
        return 'Mistake: proof objection stayed unresolved';
      }
      if (/not sure|skeptical|doubt|concern/.test(outcome)) {
        return 'Mistake: you increased skepticism';
      }
      if (/pushy|pressure|rushed/.test(outcome)) {
        return 'Blunder: Marcus felt pressured';
      }
      if (delta >= 4.0) {
        return 'Blunder: major setback';
      }
      return 'Mistake: you lost ground';
    }
  }
  
  /**
   * Generate human-readable consequence (chess-style)
   */
  private static generateHumanConsequence(beforeRes: number, afterRes: number, marcusState: any): string {
    const trustLevel = marcusState.trust;
    const curiosityLevel = marcusState.curiosity;
    const urgencyLevel = marcusState.urgency;
    
    if (beforeRes > afterRes) {
      // Positive shift
      if (curiosityLevel === 'high' && trustLevel === 'high') {
        return 'Marcus moved from guarded to genuinely interested';
      }
      if (curiosityLevel === 'high') {
        return 'Marcus became curious and started asking questions';
      }
      if (trustLevel === 'high') {
        return 'Marcus started to trust your expertise';
      }
      if (urgencyLevel === 'high') {
        return 'Marcus saw this as more urgent';
      }
      return 'Marcus became more engaged';
    } else {
      // Negative shift
      if (trustLevel === 'low') {
        return 'Marcus became more skeptical';
      }
      if (curiosityLevel === 'low' && urgencyLevel === 'low') {
        return 'Marcus lost interest and urgency dropped';
      }
      if (curiosityLevel === 'low') {
        return 'Marcus disengaged';
      }
      return 'Marcus put up more resistance';
    }
  }
  
  /**
   * Generate event-based title for positive moments
   */
  private static generatePositiveTitle(marcusText: string, marcus: ConversationExchange): string {
    const text = marcusText.toLowerCase();
    
    if (/interesting|sounds good|that could help|i like/.test(text)) {
      return 'Marcus showed interest in your approach';
    }
    
    if (/make sense|understand|clear/.test(text)) {
      return 'Marcus understood your explanation';
    }
    
    if (marcus.painPointRevealed) {
      return 'Marcus revealed a pain point';
    }
    
    return 'Marcus became more engaged';
  }
  
  /**
   * Generate event-based title for negative moments
   */
  private static generateNegativeTitle(marcusText: string, marcus: ConversationExchange): string {
    const text = marcusText.toLowerCase();
    
    if (/proof|evidence|case stud|track record|success stor/.test(text)) {
      return 'Proof became the main concern';
    }
    
    if (/trust|believ|sure|confident/.test(text)) {
      return 'Trust became an issue';
    }
    
    if (/fit|right for|relevant|apply to/.test(text)) {
      return 'Fit became questionable';
    }
    
    if (/pushy|pressure|rushed/.test(text)) {
      return 'Marcus felt pressured';
    }
    
    return 'Resistance increased';
  }
  
  /**
   * Generate title for unresolved concerns
   */
  private static generateUnresolvedTitle(objectionType: string, marcusText: string): string {
    const shortQuote = this.extractQuote(marcusText, 40);
    return `"${shortQuote}" stayed unresolved`;
  }
  
  /**
   * Extract a short quote from Marcus's response
   */
  private static extractQuote(text: string, maxLength: number): string {
    const cleaned = text.trim();
    if (cleaned.length <= maxLength) return cleaned;
    
    const firstSentence = cleaned.split(/[.!?]/)[0];
    if (firstSentence.length <= maxLength) return firstSentence;
    
    return cleaned.substring(0, maxLength) + '...';
  }
  
  /**
   * Explain why a positive shift mattered
   */
  private static explainPositiveShift(marcusText: string, resistanceDrop: number): string {
    const text = marcusText.toLowerCase();
    
    if (/interesting|sounds good|could help/.test(text)) {
      return 'Buyer showed genuine interest, indicating your value proposition landed';
    }
    
    if (/make sense|understand/.test(text)) {
      return 'Clarity improved, making it easier to discuss fit and value';
    }
    
    return `Resistance dropped significantly (${resistanceDrop.toFixed(1)} points), creating momentum`;
  }
  
  /**
   * Explain why a negative shift mattered
   */
  private static explainNegativeShift(marcusText: string, resistanceIncrease: number, objection?: string): string {
    const text = marcusText.toLowerCase();
    
    if (/proof|evidence|track record/.test(text)) {
      return 'Buyer shifted to demanding proof, indicating trust hadn\'t been established through other means';
    }
    
    if (/pushy|pressure/.test(text)) {
      return 'Buyer felt pressured, damaging trust and rapport';
    }
    
    if (objection) {
      return `New objection emerged (${objection}), requiring a shift in approach`;
    }
    
    return `Resistance increased (${resistanceIncrease.toFixed(1)} points), making forward progress harder`;
  }
  
  /**
   * Infer Marcus's state in human-readable terms
   */
  private static inferMarcusState(
    resistance: number,
    marcus: ConversationExchange,
    context: MomentExtractionContext
  ): KeyMoment['marcusState'] {
    const buyerState = context.buyerState;
    
    return {
      trust: this.levelToString(buyerState?.trustLevel || (10 - resistance) / 10),
      curiosity: this.levelToString((10 - resistance) / 10),
      urgency: 'low', // Could enhance this with pain point analysis
      activeObjection: marcus.objectionTriggered
    };
  }
  
  /**
   * Convert 0-1 score to human string
   */
  private static levelToString(value: number): string {
    if (value < 0.35) return 'low';
    if (value < 0.65) return 'mid';
    return 'high';
  }
  
  /**
   * Infer reason tag from text and objection
   */
  private static inferReasonTag(text: string, objection?: string): ReasonTag {
    if (objection) {
      return this.mapObjectionToTag(objection);
    }
    
    const lower = text.toLowerCase();
    
    if (/proof|evidence|result|success|work/.test(lower)) return 'Proof';
    if (/trust|believ|sure|confident/.test(lower)) return 'Trust';
    if (/fit|right|relevant|apply/.test(lower)) return 'Fit';
    if (/why|what.*matter|how.*help|pain|problem/.test(lower)) return 'Discovery';
    if (/understand|clear|make sense/.test(lower)) return 'Clarity';
    if (/urgent|priority|now|soon/.test(lower)) return 'Urgency';
    
    return 'Value';
  }
  
  /**
   * Extract surrounding context (2 exchanges before, 2 after)
   */
  private static extractSurroundingContext(pairIndex: number): {
    before: SurroundingExchange[];
    after: SurroundingExchange[];
  } {
    const before: SurroundingExchange[] = [];
    const after: SurroundingExchange[] = [];
    
    // Get 2 exchanges before (up to 4 total messages: 2 user + 2 marcus)
    for (let i = Math.max(0, pairIndex * 2 - 4); i < pairIndex * 2; i++) {
      const ex = this.allExchanges[i];
      if (ex) {
        before.push({
          speaker: ex.speaker,
          text: ex.text,
          timestamp: ex.timestamp
        });
      }
    }
    
    // Get 2 exchanges after (up to 4 total messages: 2 user + 2 marcus)
    for (let i = (pairIndex + 1) * 2; i < Math.min(this.allExchanges.length, (pairIndex + 1) * 2 + 4); i++) {
      const ex = this.allExchanges[i];
      if (ex) {
        after.push({
          speaker: ex.speaker,
          text: ex.text,
          timestamp: ex.timestamp
        });
      }
    }
    
    return { before, after };
  }
  
  /**
   * Check if user's response was poor quality (incomplete, rambling, unclear)
   * Very conservative - only filter obviously broken responses that caused confusion
   */
  private static isPoorQualityResponse(userText: string, outcome: ConversationExchange | null): boolean {
    if (!outcome) return false;
    
    const text = userText.toLowerCase().trim();
    const outcomeText = outcome.text.toLowerCase();
    
    // Only filter if response ends mid-sentence AND Marcus explicitly asks for clarification
    const endsIncomplete = /\bactual\s*$/.test(text);
    const marcusAskedForClarification = /what do you mean|what was that|can you explain|i don't follow/.test(outcomeText);
    
    if (endsIncomplete && marcusAskedForClarification) {
      console.log('⚠️ Filtering incomplete response that caused confusion');
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if this is a technical/clarification exchange (not a real sales moment)
   */
  private static isTechnicalExchange(userText: string, marcusText: string): boolean {
    const userLower = userText.toLowerCase();
    const marcusLower = marcusText.toLowerCase();
    
    // Technical connection issues
    const technicalPatterns = [
      /are you there/,
      /can you hear me/,
      /hello\?/,
      /are you still there/,
      /did I lose you/,
      /sorry.*cut out/,
      /sorry.*didn't catch/,
      /what was that/,
      /could you repeat/,
      /say that again/,
      /speak up/,
      /breaking up/
    ];
    
    const hasTechnicalIssue = technicalPatterns.some(pattern => 
      pattern.test(userLower) || pattern.test(marcusLower)
    );
    
    if (hasTechnicalIssue) {
      return true;
    }
    
    // Simple acknowledgments without substance
    const isSimpleAck = (
      (userLower.length < 15 && /^(yeah|yep|ok|okay|sure|right|got it|uh huh|mhm)/.test(userLower)) ||
      (marcusLower.length < 15 && /^(yeah|yep|ok|okay|sure|right|got it|uh huh|mhm)/.test(marcusLower))
    );
    
    return isSimpleAck;
  }
  
  /**
   * Map objection type to reason tag
   */
  private static mapObjectionToTag(objectionType: string): ReasonTag {
    const lower = objectionType.toLowerCase();
    
    if (lower.includes('proof') || lower.includes('evidence')) return 'Proof';
    if (lower.includes('trust')) return 'Trust';
    if (lower.includes('fit') || lower.includes('relevant')) return 'Fit';
    if (lower.includes('time') || lower.includes('urgent')) return 'Urgency';
    if (lower.includes('clear') || lower.includes('understand')) return 'Clarity';
    
    return 'Value';
  }
}

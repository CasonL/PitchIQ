/**
 * MarcusContextNarrator.ts
 * Converts numeric scales and structured data into qualitative narrative context
 * for pattern-based responses. Provides flexible, multi-jointed understanding
 * rather than rigid pattern matching.
 */

interface MarcusTraits {
  painLevel: string;
  urgency: string;
  budget: string;
  openness: string;
  painPoints: string[];
  currentSolution: string;
  satisfactionLevel: number;
  decisionTimeframe: string;
  primaryConcern: string;
}

interface BuyerState {
  resistanceLevel: number;
  trustLevel: number;
  emotionalPosture?: string;
  openness?: number;
  patience?: number;
  clarity?: number;
  relevance?: number;
}

export interface QualitativeContext {
  situationNarrative: string;
  emotionalState: string;
  receptivityContext: string;
  decisionContext: string;
}

export class MarcusContextNarrator {
  
  /**
   * Generate qualitative narrative from Marcus's current state
   * This replaces numeric scales with rich, flexible context
   */
  static buildQualitativeContext(
    marcusTraits?: MarcusTraits,
    buyerState?: BuyerState,
    conversationHistory?: Array<{ role: string; content: string }>
  ): QualitativeContext {
    
    const situationNarrative = this.buildSituationNarrative(marcusTraits);
    const emotionalState = this.buildEmotionalState(marcusTraits, buyerState);
    const receptivityContext = this.buildReceptivityContext(marcusTraits, buyerState, conversationHistory);
    const decisionContext = this.buildDecisionContext(marcusTraits);
    
    return {
      situationNarrative,
      emotionalState,
      receptivityContext,
      decisionContext
    };
  }
  
  /**
   * Describe Marcus's current business situation (not a score, a story)
   */
  private static buildSituationNarrative(traits?: MarcusTraits): string {
    if (!traits) {
      return "You're a typical busy professional. Nothing urgent on your mind right now.";
    }
    
    const parts: string[] = [];
    
    // Pain context
    if (traits.painLevel === 'critical' || traits.painLevel === 'severe') {
      parts.push(`You're dealing with serious issues right now: ${traits.painPoints?.[0] || 'operational problems'}.`);
      if (traits.currentSolution) {
        parts.push(`Your current setup (${traits.currentSolution}) isn't cutting it.`);
      }
    } else if (traits.painLevel === 'moderate') {
      parts.push(`Things are mostly fine, though you have some nagging issues like ${traits.painPoints?.[0] || 'inefficiencies'}.`);
      if (traits.satisfactionLevel >= 6) {
        parts.push(`Your current solution works well enough - you're not actively looking to change.`);
      }
    } else {
      parts.push(`Business is running smoothly. No major pain points.`);
      if (traits.currentSolution) {
        parts.push(`You're satisfied with your current ${traits.currentSolution}.`);
      }
    }
    
    // Urgency context
    if (traits.urgency === 'immediate' || traits.urgency === 'high') {
      parts.push(`Time is a factor - you need solutions quickly.`);
    } else if (traits.urgency === 'low' || traits.urgency === 'none') {
      parts.push(`No rush to make changes. You have time to evaluate options properly.`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Describe Marcus's emotional/mental state (not resistance=7, but how he FEELS)
   */
  private static buildEmotionalState(traits?: MarcusTraits, buyerState?: BuyerState): string {
    if (!traits && !buyerState) {
      return "You're in a neutral, professional mindset.";
    }
    
    const parts: string[] = [];
    
    // Emotional posture (defensive, cautious, curious, etc.)
    if (buyerState?.emotionalPosture) {
      if (buyerState.emotionalPosture === 'defensive') {
        parts.push("You're on guard - you don't have time for generic sales pitches.");
      } else if (buyerState.emotionalPosture === 'cautious') {
        parts.push("You're careful and measured - need to see real value before engaging.");
      } else if (buyerState.emotionalPosture === 'curious') {
        parts.push("You're intrigued but cautious - show me something interesting.");
      }
    }
    
    // Openness interpretation
    if (traits?.openness === 'skeptical' || traits?.openness === 'closed') {
      parts.push("You're naturally skeptical of sales pitches - you've heard too many before.");
    } else if (traits?.openness === 'curious' || traits?.openness === 'open') {
      parts.push("You're open to hearing about new solutions if they're relevant.");
    }
    
    // Trust/resistance narrative
    if (buyerState) {
      if (buyerState.resistanceLevel >= 7) {
        parts.push("Right now, you're guarded - this caller hasn't earned your attention yet.");
      } else if (buyerState.resistanceLevel >= 4 && buyerState.resistanceLevel < 7) {
        parts.push("You're polite but skeptical - you've heard pitches before and most don't pan out.");
      } else if (buyerState.trustLevel >= 6 && buyerState.resistanceLevel < 4) {
        parts.push("You're starting to feel this conversation might be worth your time.");
      }
    }
    
    // Primary concern as emotional driver
    if (traits?.primaryConcern) {
      parts.push(`What matters most to you right now: ${traits.primaryConcern}.`);
    }
    
    return parts.join(' ') || "You're in a neutral, professional mindset.";
  }
  
  /**
   * How receptive is Marcus RIGHT NOW to this conversation (not a number, a situation)
   */
  private static buildReceptivityContext(
    traits?: MarcusTraits,
    buyerState?: BuyerState,
    history?: Array<{ role: string; content: string }>
  ): string {
    const parts: string[] = [];
    
    // Budget affects receptivity - CRITICAL for qualifying out
    if (traits?.budget === 'no-budget') {
      parts.push("You have NO budget for new tools right now. Money is tight. Even if this sounds good, you can't afford it.");
    } else if (traits?.budget === 'locked-contract') {
      parts.push("You're locked into a contract with your current provider. Can't switch even if you wanted to - stuck until renewal.");
    } else if (traits?.budget === 'available' || traits?.budget === 'flexible') {
      parts.push("Budget isn't an issue if something's genuinely valuable.");
    } else if (traits?.budget === 'tight' || traits?.budget === 'restricted') {
      parts.push("Budget is tight - you need strong ROI justification.");
    }
    
    // Conversation trajectory
    if (history && history.length > 0) {
      const lastUserMsg = history.filter(m => m.role === 'user').pop()?.content || '';
      
      if (/permission|got.*min|quick|moment|talk/i.test(lastUserMsg)) {
        parts.push("They're asking for your time before you know why they're calling.");
      } else if (/help|improve|increase|solve/i.test(lastUserMsg)) {
        parts.push("They're making claims about helping you, but you need specifics.");
      } else if (/\?/.test(lastUserMsg)) {
        parts.push("They're asking you a question - you'll answer, but you're still evaluating if this is worth your time.");
      }
    }
    
    // Openness + pain creates receptivity narrative
    if (traits?.painLevel === 'critical' && traits?.openness !== 'closed') {
      parts.push("You're desperate enough to hear solutions, even from strangers.");
    } else if (traits?.painLevel === 'none' && traits?.satisfactionLevel >= 8) {
      parts.push("You're happy with the status quo - they need to show you something genuinely better.");
    }
    
    return parts.join(' ') || "You're waiting to see if this call is worth your attention.";
  }
  
  /**
   * How Marcus makes decisions (not a timeframe number, but decision psychology)
   */
  private static buildDecisionContext(traits?: MarcusTraits): string {
    if (!traits) {
      return "You make decisions carefully, with proper evaluation.";
    }
    
    const parts: string[] = [];
    
    if (traits.decisionTimeframe === 'immediate' || traits.decisionTimeframe === 'this_week') {
      parts.push("When you see value, you move fast. You're empowered to make quick decisions.");
    } else if (traits.decisionTimeframe === 'this_quarter') {
      parts.push("You evaluate options thoroughly. Decisions take weeks, not days.");
    } else if (traits.decisionTimeframe === 'next_year') {
      parts.push("You're in planning mode for future needs, not shopping for immediate solutions.");
    }
    
    // Risk tolerance from openness
    if (traits.openness === 'skeptical' || traits.openness === 'closed') {
      parts.push("You need proof, references, and clear ROI before considering anything.");
    } else if (traits.openness === 'open' || traits.openness === 'curious') {
      parts.push("You're willing to explore new approaches if they make strategic sense.");
    }
    
    return parts.join(' ') || "You make decisions carefully, with proper evaluation.";
  }
  
  /**
   * Generate Marcus's solution hypothesis based on his pain
   * Pure internal state - what Marcus believes, not instructions on how to act
   */
  static buildSolutionHypothesis(traits?: MarcusTraits): string {
    if (!traits || !traits.painPoints || traits.painPoints.length === 0) {
      return "You don't have any pressing business pain right now. Things are running smoothly.";
    }
    
    const pain = traits.painPoints[0];
    const currentSolution = traits.currentSolution || 'current setup';
    const painLevel = traits.painLevel;
    
    // Marcus's internal beliefs about what he needs (might be right, might be wrong)
    const parts: string[] = [];
    
    if (painLevel === 'critical' || painLevel === 'severe') {
      parts.push(`You're dealing with: ${pain}.`);
      parts.push(`${currentSolution} isn't working. You need something fundamentally different.`);
      parts.push(`What would actually help: ${this.inferSolution(pain)}.`);
    } else if (painLevel === 'moderate') {
      parts.push(`You have a nagging issue: ${pain}.`);
      parts.push(`${currentSolution} mostly works, but this one thing bugs you.`);
      parts.push(`You think what might help: ${this.inferSolution(pain)}.`);
    } else {
      parts.push(`Minor annoyance: ${pain}.`);
      parts.push(`Not a priority. Not looking for solutions.`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Infer what Marcus believes would solve his pain (his hypothesis, not truth)
   */
  private static inferSolution(pain: string): string {
    if (pain.includes('team') || pain.includes('sales') || pain.includes('people')) {
      return 'better coaching or team development';
    }
    if (pain.includes('time') || pain.includes('slow') || pain.includes('manual')) {
      return 'faster processes or automation';
    }
    if (pain.includes('cost') || pain.includes('expensive') || pain.includes('budget')) {
      return 'lower costs or better ROI';
    }
    if (pain.includes('support') || pain.includes('service') || pain.includes('help')) {
      return 'real human support that actually responds';
    }
    if (pain.includes('complex') || pain.includes('confusing') || pain.includes('hard')) {
      return 'something simpler and easier to use';
    }
    return 'a solution that actually addresses the root cause';
  }
  
  /**
   * Compact summary for focused prompts (2-3 sentences max)
   */
  static buildCompactContext(
    marcusTraits?: MarcusTraits,
    buyerState?: BuyerState
  ): string {
    const qualContext = this.buildQualitativeContext(marcusTraits, buyerState);
    
    // Most critical context only
    const parts: string[] = [];
    
    // Situation + emotion
    parts.push(qualContext.situationNarrative.split('.')[0] + '.');
    parts.push(qualContext.emotionalState.split('.')[0] + '.');
    
    // CRITICAL: Add blocking conditions FIRST - these prevent buying
    if (marcusTraits?.budget === 'locked-contract') {
      parts.push("You're locked into a contract - can't switch even if you wanted to.");
    } else if (marcusTraits?.budget === 'no-budget') {
      parts.push("You have NO budget for new tools right now - can't afford it.");
    }
    
    // Receptivity if meaningful (but blocking conditions take priority)
    if (qualContext.receptivityContext.length > 0) {
      const receptivity = qualContext.receptivityContext.split('.')[0] + '.';
      // Don't duplicate if we already added the blocking condition
      if (!parts.some(p => p.includes('locked into a contract') || p.includes('NO budget'))) {
        parts.push(receptivity);
      }
    }
    
    return parts.join(' ');
  }
  
  /**
   * Full context for focused prompts - includes solution hypothesis
   */
  static buildFocusedContext(
    marcusTraits?: MarcusTraits,
    buyerState?: BuyerState
  ): string {
    const compact = this.buildCompactContext(marcusTraits, buyerState);
    const hypothesis = this.buildSolutionHypothesis(marcusTraits);
    
    return `${compact}\n\n## YOUR HYPOTHESIS:\n${hypothesis}`;
  }
}

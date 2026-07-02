/**
 * AvailabilityPolicy
 * 
 * Time-pressure overlay that constrains Marcus's responses based on availability.
 * This sits ABOVE both PreTreeBuyerPolicy and BuyerStateTree.
 * 
 * Availability does not replace buyer state - it constrains it.
 * 
 * States:
 * - available: Normal pre-tree/tree guidance applies
 * - mildly_busy: Guarded, short responses (1-2 sentences)
 * - time_boxed: Very short window (1 sentence)
 * - hard_exit: End or defer unless extremely relevant (1 sentence)
 */

export type AvailabilityState = 
  | 'available'
  | 'mildly_busy'
  | 'time_boxed'
  | 'hard_exit';

export interface AvailabilityContext {
  urgency: number;              // 1-10, from scenario
  openness: number;             // 1-10, from scenario
  satisfaction: number;         // 1-10, from scenario
  initialResistance: number;    // 1-10, from scenario
  patience: number;             // 1-10, from scenario
  turnNumber: number;
  hasEarnedRelevance: boolean;  // Has seller demonstrated clear relevance?
  productConfidenceLevel: string; // 'none', 'low', 'medium', 'high'
}

export interface AvailabilityConstraints {
  state: AvailabilityState;
  maxSentences: number;
  allowDetailedDisclosure: boolean;
  requiredTone: string;
  exitPhrases: string[];
}

export class AvailabilityPolicy {
  /**
   * Determine availability state from scenario traits and call context
   */
  static determineAvailability(context: AvailabilityContext): AvailabilityState {
    const { 
      urgency, 
      openness, 
      satisfaction, 
      initialResistance, 
      patience,
      turnNumber,
      hasEarnedRelevance,
      productConfidenceLevel
    } = context;
    
    // Calculate composite availability score
    const busyScore = (10 - urgency) + (10 - patience) + initialResistance;
    const engagementScore = openness + satisfaction;
    
    // Hard exit conditions
    if (busyScore >= 20 && !hasEarnedRelevance && turnNumber > 2) {
      return 'hard_exit';
    }
    
    if (patience <= 2 && openness <= 3 && !hasEarnedRelevance) {
      return 'hard_exit';
    }
    
    // Time boxed conditions
    if (busyScore >= 15 && engagementScore < 10) {
      return 'time_boxed';
    }
    
    if (patience <= 4 && turnNumber <= 2 && productConfidenceLevel === 'none') {
      return 'time_boxed';
    }
    
    // Mildly busy conditions
    if (busyScore >= 10 || patience <= 6) {
      return 'mildly_busy';
    }
    
    // Available (default)
    return 'available';
  }
  
  /**
   * Get constraints for current availability state
   */
  static getConstraints(state: AvailabilityState): AvailabilityConstraints {
    switch (state) {
      case 'hard_exit':
        return {
          state: 'hard_exit',
          maxSentences: 1,
          allowDetailedDisclosure: false,
          requiredTone: 'dismissive_but_professional',
          exitPhrases: [
            'Not a good time.',
            'Send me something.',
            'I need to go.',
            'Can\'t talk right now.'
          ]
        };
        
      case 'time_boxed':
        return {
          state: 'time_boxed',
          maxSentences: 1,
          allowDetailedDisclosure: false,
          requiredTone: 'rushed_direct',
          exitPhrases: [
            'I have 20 seconds.',
            'Make it quick.',
            'What\'s the point?',
            'I\'m swamped right now.'
          ]
        };
        
      case 'mildly_busy':
        return {
          state: 'mildly_busy',
          maxSentences: 2,
          allowDetailedDisclosure: false,
          requiredTone: 'guarded_brief',
          exitPhrases: [
            'Okay, quickly.',
            'I don\'t have much time.',
            'Keep it short.'
          ]
        };
        
      case 'available':
        return {
          state: 'available',
          maxSentences: 10, // No meaningful constraint
          allowDetailedDisclosure: true,
          requiredTone: 'normal',
          exitPhrases: []
        };
    }
  }
  
  /**
   * Apply availability constraints to voice examples.
   * Uses a mode map so every pre-tree ladder state has a natural, constrained voice.
   */
  static constrainVoiceExamples(
    originalExamples: string[],
    state: AvailabilityState,
    baseMode: string // e.g., 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR'
  ): string[] {
    if (state === 'available') {
      return originalExamples;
    }

    const modeSpecificExamples: Record<string, Record<string, string[]>> = {
      CLAIM_UNDERSTOOD_PROOF_UNCLEAR: {
        hard_exit: ['"Not a priority. Send me something."'],
        time_boxed: ['"15%? Who got that?"', '"Big claim. Real examples?"'],
        mildly_busy: ['"15% sounds nice. Who got that result?"']
      },
      CATEGORY_UNDERSTOOD_VALUE_UNCLEAR: {
        hard_exit: ['"Not interested in more tools right now."'],
        time_boxed: ['"What makes this different?"', '"Why this over everything else?"'],
        mildly_busy: ['"Okay, quickly. What makes this different?"']
      },
      CLARITY_SEEKING: {
        hard_exit: ['"Not a good time. Email me."'],
        time_boxed: ['"Software or service?"', '"What is it?"'],
        mildly_busy: ['"What exactly are you selling?"']
      },
      COMPANY_KNOWN_PRODUCT_UNCLEAR: {
        hard_exit: ['"Not a good time. Email me."'],
        time_boxed: ['"What do you do?"', '"20 seconds. What is it?"'],
        mildly_busy: ['"What do you actually do?"']
      },
      VALUE_UNDERSTOOD_PROOF_UNCLEAR: {
        hard_exit: ['"Not a priority. Send me a case study."'],
        time_boxed: ['"Got proof?"', '"Who got that result?"'],
        mildly_busy: ['"Examples? Quickly."']
      },
      PROOF_UNDERSTOOD_FIT_UNCLEAR: {
        hard_exit: ['"Not sure it applies to us."'],
        time_boxed: ['"Similar to us?"', '"Team like ours?"'],
        mildly_busy: ['"Was that with a team like ours?"']
      },
      FIT_UNDERSTOOD_MECHANICS_UNCLEAR: {
        hard_exit: ['"Too complicated. Email me."'],
        time_boxed: ['"How does it work?"', '"Too much. Keep it simple."'],
        mildly_busy: ['"How does it actually work?"']
      },
      MECHANICS_UNDERSTOOD_ECONOMICS_UNCLEAR: {
        hard_exit: ['"Probably too expensive."'],
        time_boxed: ['"Price?"', '"What does it cost?"'],
        mildly_busy: ['"What kind of investment?"']
      },
      ECONOMICS_UNDERSTOOD_TIMING_UNCLEAR: {
        hard_exit: ['"Not a priority right now."'],
        time_boxed: ['"Next steps?"', '"When?"'],
        mildly_busy: ['"What would next steps look like?"']
      },
      TIMING_CLEAR_COMMITMENT_READY: {
        hard_exit: ['"Not a good time."'],
        time_boxed: ['"Send me a link."', '"Quick demo?"'],
        mildly_busy: ['"I could do a quick call."']
      },
      NO_PRODUCT_SIGNAL: {
        hard_exit: ['"Not a good time."'],
        time_boxed: ['"What\'s this about?"', '"Make it quick."'],
        mildly_busy: ['"What\'s this about?"']
      },
      DISQUALIFIED_BY_REP: {
        hard_exit: ['"Whatever - not a good time anyway."'],
        time_boxed: ['"Wait, why not?"', '"Quick - what makes me not a fit?"'],
        mildly_busy: ['"Huh, why not?"']
      }
    };

    const stateKey = state as string;
    const examples = modeSpecificExamples[baseMode]?.[stateKey];

    if (examples && examples.length > 0) {
      return examples;
    }

    // Generic fallbacks for unknown modes.
    if (state === 'hard_exit') {
      return ['"Not a good time."'];
    }
    if (state === 'time_boxed') {
      return ['"What\'s this about?"', '"Make it quick."'];
    }
    if (state === 'mildly_busy') {
      return ['"What\'s this about?"'];
    }

    return originalExamples;
  }
  
  /**
   * Apply availability constraints to behavior guidance
   */
  static constrainBehaviorGuidance(
    originalGuidance: string[],
    state: AvailabilityState
  ): string[] {
    const constraints = this.getConstraints(state);
    
    if (state === 'available') {
      return originalGuidance;
    }
    
    // Filter and modify guidance for busy states
    const constrainedGuidance: string[] = [];
    
    // Always add sentence limit
    constrainedGuidance.push(`Keep responses to ${constraints.maxSentences} sentence${constraints.maxSentences > 1 ? 's' : ''} max`);
    
    if (state === 'hard_exit') {
      constrainedGuidance.push('Signal you need to end the call or defer');
      constrainedGuidance.push('Very skeptical about WHO is calling and HOW they got your number');
      constrainedGuidance.push('Do not engage in detailed discussion');
      constrainedGuidance.push('Professional but dismissive tone');
      constrainedGuidance.push('Do not reveal any business details');
      constrainedGuidance.push('Legitimacy questions ("Who is this?" "How\'d you get my number?") may come before dismissal');
      constrainedGuidance.push('If you ask about pricing at this stage, it is premature quick-qualification or exit attempt');
      return constrainedGuidance;
    }
    
    if (state === 'time_boxed') {
      constrainedGuidance.push('Ultra-brief, direct responses only');
      constrainedGuidance.push('Skeptical about WHO is calling and HOW they got your number');
      constrainedGuidance.push('Challenge seller to get to the point immediately');
      constrainedGuidance.push('Do not reveal budget, authority, pain, or current solution');
      constrainedGuidance.push('Pricing questions at this stage are likely premature qualification attempts');
      constrainedGuidance.push('Legitimacy questions ("Who is this?" "How\'d you get my number?") are natural even when busy');
      return constrainedGuidance;
    }
    
    if (state === 'mildly_busy') {
      constrainedGuidance.push('Brief, guarded responses');
      constrainedGuidance.push('Ask one short question maximum');
      constrainedGuidance.push('Do not volunteer business details');
      constrainedGuidance.push('Pricing questions depend on stage: premature before VALUE established, genuine after');
      constrainedGuidance.push('Stay discovery-focused - WHO/WHAT/WHY before HOW MUCH');
      // Keep some original guidance but filter out detailed ones
      originalGuidance
        .filter(g => !g.toLowerCase().includes('share') && !g.toLowerCase().includes('mention'))
        .slice(0, 2)
        .forEach(g => constrainedGuidance.push(g));
      return constrainedGuidance;
    }
    
    return originalGuidance;
  }
  
  /**
   * Apply availability constraints to internal posture
   */
  static constrainInternalPosture(
    originalPosture: string,
    state: AvailabilityState
  ): string {
    if (state === 'available') {
      return originalPosture;
    }
    
    const busyPrefix = this.getBusyPrefixForPosture(state);
    
    // Prepend busy context to original posture
    return `${busyPrefix} ${originalPosture}`;
  }
  
  /**
   * Get busy prefix for internal posture
   */
  private static getBusyPrefixForPosture(state: AvailabilityState): string {
    switch (state) {
      case 'hard_exit':
        return 'You are extremely busy and need to end this call.';
        
      case 'time_boxed':
        return 'You have very limited time (20-30 seconds max).';
        
      case 'mildly_busy':
        return 'You are moderately busy and want to keep this brief.';
        
      case 'available':
        return '';
    }
  }
}

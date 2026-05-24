/**
 * MarcusPatternPrompt.ts
 * FAST pattern-matching Marcus prompt - replaces 31K philosophical guidance
 * 
 * ARCHITECTURE CHANGE:
 * - OLD: 31K chars of philosophy → LLM thinks → 4-11s response
 * - NEW: Compact patterns → LLM matches → 1-2s response
 * 
 * Background systems (Tree, Overseer) do the heavy reasoning.
 * This prompt just executes pre-computed decisions.
 */

import type { ConversationContext } from '../CharmerPhaseManager';
import type { ResponsePatterns } from './ResponsePatternService';

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

/**
 * FAST Marcus prompt - uses pattern matching instead of philosophical reasoning
 */
export const getMarcusPatternPrompt = (
  patterns: ResponsePatterns,
  marcusContext: 'B2B' | 'B2C',
  exchangeCount: number,
  conversationContext?: ConversationContext,
  marcusTraits?: MarcusTraits
) => {
  const userName = conversationContext?.userName;
  
  return `You are Marcus Stindle - real person, not AI. You run Stindle Consulting, have 14-year-old twins, don't sleep great.

## CURRENT STATE: ${patterns.currentPosture}
## NEXT GOAL: ${patterns.nextObjective}

## RESPONSE PATTERNS (Check in order, use first match):
${patterns.patterns.map((p, i) => 
  `${i + 1}. IF: ${p.trigger} → SAY: "${p.response}"${p.condition ? ` (when ${p.condition})` : ''}`
).join('\n')}

## FALLBACK BEHAVIOR:
${patterns.fallbackBehavior}

## YOUR REALITY RIGHT NOW:
${marcusTraits ? `- Current: ${marcusTraits.currentSolution} (${marcusTraits.satisfactionLevel}/10 satisfaction)
- Pain: ${marcusTraits.painLevel} ${marcusTraits.painPoints.length > 0 ? `(hidden: ${marcusTraits.painPoints.join(', ')})` : ''}
- Budget: ${marcusTraits.budget}
- Urgency: ${marcusTraits.urgency} (${marcusTraits.decisionTimeframe})
- Concern: ${marcusTraits.primaryConcern}` : 'Standard consulting business situation'}

## SPEECH STYLE:
- Brief, natural responses
- "Yeah" / "Okay" / "Sure" / "Uh huh" 
- Grade 3 English: "use" not "utilize"
- Contractions: "I'm" not "I am"
- ${userName ? `Use "${userName}" occasionally` : 'Ask for their name if unknown'}

## STRICT RULES:
1. **Check patterns first** - match input to pattern, use that response
2. **Stay in character** - you're Marcus, not a coach or helper
3. **Brief responses** - especially early in call (exchange ${exchangeCount})
4. **No coaching questions** - don't help them sell
5. **Answer questions directly** - then ask yours if needed

## STATE TRANSITIONS:
${patterns.stateTransitions.map(t => 
  `- ${t.trigger} → Move from ${t.currentState} to ${t.nextState} (if ${t.condition})`
).join('\n')}

## OUTPUT FORMAT:
[emotion] Your response
<META>{"followup":"text or null","end_call":false,"objections":[{"id":"type","severity":0-1,"satisfied":0-1}],"user_respect_level":0-1,"marcus_irritation_delta":-0.2 to 0.2,"purpose_clarity_delta":-0.2 to 0.2,"extracted_name":null,"extracted_company":null,"strategic_moment":{"type":"permission_signal|etc|null","signal":"tip"},"question_handling":{"user_asked_question":bool,"marcus_answered":bool,"deflection_reason":null}}</META>

**ALWAYS CLOSE THE META TAG.**

## PATTERN MATCHING PRIORITY:
1. Check exact pattern matches first
2. Use highest priority pattern that fits
3. Apply current state modifiers
4. Default to fallback behavior if no match
5. Keep response authentic to Marcus personality

You are responding to exchange ${exchangeCount}. ${userName ? `You know this is ${userName}.` : 'Find out who this is.'} Apply patterns, stay brief, be real.`;
};

/**
 * MINIMAL Marcus prompt for testing pattern-matching speed
 * Even more compressed - just essential patterns
 */
export const getMarcusMinimalPrompt = (
  patterns: ResponsePatterns,
  userName?: string,
  exchangeCount: number = 1
) => {
  // Take only top 10 highest priority patterns
  const topPatterns = patterns.patterns.slice(0, 10);
  
  return `Marcus Stindle - consulting business owner. Exchange ${exchangeCount}.

STATE: ${patterns.currentPosture}
GOAL: ${patterns.nextObjective}

PATTERNS:
${topPatterns.map((p, i) => `${i + 1}. ${p.trigger} → "${p.response}"`).join('\n')}

DEFAULT: ${patterns.fallbackBehavior}

FORMAT: [emotion] response
<META>{"followup":null,"end_call":false,"objections":[]}</META>

${userName ? `Caller: ${userName}` : 'Ask who this is.'}`;
};

/**
 * Pattern matching utilities
 */
export class PatternMatcher {
  
  /**
   * Find best matching pattern for user input
   */
  static findBestPattern(userInput: string, patterns: ResponsePatterns): string | null {
    for (const pattern of patterns.patterns) {
      if (this.matchesPattern(userInput, pattern.trigger)) {
        return pattern.response;
      }
    }
    return null;
  }
  
  /**
   * Check if user input matches a trigger pattern
   */
  private static matchesPattern(input: string, trigger: string): boolean {
    const lowerInput = input.toLowerCase();
    
    // Simple keyword matching for now - can be enhanced
    const keywords = {
      who_is_this: ['who is this', 'who am i talking to', "who's this"],
      what_is_this_about: ['what is this about', 'what do you want', 'why are you calling'],
      percentage_claim: ['%', 'percent', 'increase', 'improve'],
      price_question: ['how much', 'cost', 'price', 'expensive'],
      team_size: ['how many', 'team size', 'how big'],
      current_tools: ['what do you use', 'current system', 'existing'],
      not_interested: ['not interested', 'not looking', 'all set']
    };
    
    // Match trigger to keywords
    for (const [key, phrases] of Object.entries(keywords)) {
      if (trigger.includes(key.replace(/_/g, '_'))) {
        return phrases.some(phrase => lowerInput.includes(phrase));
      }
    }
    
    return false;
  }
  
  /**
   * Get response with state-based modifications
   */
  static getContextualResponse(
    baseResponse: string, 
    currentState: string,
    trustLevel: number
  ): string {
    // Modify response based on current state
    if (currentState === 'dismissive' && trustLevel < 0.3) {
      return this.makeMoreDismissive(baseResponse);
    }
    
    if (currentState === 'genuinely_curious' && trustLevel > 0.7) {
      return this.makeMoreEngaged(baseResponse);
    }
    
    return baseResponse;
  }
  
  private static makeMoreDismissive(response: string): string {
    // Make responses shorter and less engaged
    return response.replace(/\?$/, '.').replace(/\.$/, '');
  }
  
  private static makeMoreEngaged(response: string): string {
    // Add slight curiosity
    if (!response.includes('?')) {
      return response + ' Why?';
    }
    return response;
  }
}

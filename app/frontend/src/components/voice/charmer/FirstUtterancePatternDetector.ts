/**
 * FirstUtterancePatternDetector
 * 
 * Fast pattern matching for first utterance scenarios to enable instant responses
 * with focused LLM prompts instead of full system prompt generation.
 */

export type DetectedPattern = 
  | 'INTRODUCTION_WITH_NAME'
  | 'GREETING_WITH_QUESTION'
  | 'NAME_ONLY'
  | 'GREETING_ONLY'
  | 'IDENTITY_CONFIRMATION'
  | 'UNKNOWN';

export interface PatternMatch {
  pattern: DetectedPattern;
  confidence: number;
  extractedName?: string;
  extractedCompany?: string;
}

export class FirstUtterancePatternDetector {
  /**
   * Detect pattern from first utterance partial or complete transcript
   */
  static detect(text: string): PatternMatch {
    const normalized = text.toLowerCase().trim();
    
    // Pattern 1: Introduction with name (highest priority)
    // "Hey Marcus, this is [NAME]" / "It's [NAME] from [COMPANY]" / "[NAME] from [COMPANY]"
    const introPatterns = [
      /(?:this is|it'?s)\s+([A-Z][a-z]+)(?:\s+from\s+([A-Z][a-z]+(?:\s*[A-Z][a-z]+)*))?/i,
      /(?:my name is|i'?m)\s+([A-Z][a-z]+)/i,
      /^([A-Z][a-z]+)\s+from\s+([A-Z][a-z]+(?:\s*[A-Z][a-z]+)*)/i
    ];
    
    for (const pattern of introPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          pattern: 'INTRODUCTION_WITH_NAME',
          confidence: 0.95,
          extractedName: match[1],
          extractedCompany: match[2] || undefined
        };
      }
    }
    
    // Pattern 2: Identity confirmation ("Is this Marcus?")
    // HIGHEST PRIORITY for instant response - no LLM needed
    if (/(?:is this|this is|are you)\s+marcus/i.test(text)) {
      return {
        pattern: 'IDENTITY_CONFIRMATION',
        confidence: 0.95
      };
    }
    
    // Pattern 3: Greeting with question (no name)
    // "Hey Marcus, how are you?" / "Hi Marcus, how's it going?"
    if (/(?:hey|hi|hello)\s+marcus.*(?:how|what|doing|going)/i.test(text)) {
      return {
        pattern: 'GREETING_WITH_QUESTION',
        confidence: 0.9
      };
    }
    
    // Pattern 4: Just name
    // "Marcus?" / "Marcus"
    if (/^(?:hey\s+)?marcus[?,!.]?$/i.test(normalized)) {
      return {
        pattern: 'NAME_ONLY',
        confidence: 0.85
      };
    }
    
    // Pattern 5: Greeting only (no question)
    // "Hey Marcus" / "Hi Marcus"
    if (/^(?:hey|hi|hello)\s+marcus[.,!]?$/i.test(normalized)) {
      return {
        pattern: 'GREETING_ONLY',
        confidence: 0.8
      };
    }
    
    // Unknown pattern - use full LLM processing
    return {
      pattern: 'UNKNOWN',
      confidence: 0.5
    };
  }
  
  /**
   * Generate focused LLM prompt for detected pattern
   * Much shorter than full system prompt = faster response
   */
  /**
   * Get instant canned response (no LLM) for ultra-fast patterns
   */
  static getCannedResponse(pattern: DetectedPattern): string | null {
    switch (pattern) {
      case 'IDENTITY_CONFIRMATION':
        return "Yeah, who's this?"; // Instant 0ms response
      case 'NAME_ONLY':
        return "Yeah?"; // Instant 0ms response
      default:
        return null; // Use LLM for this pattern
    }
  }
  
  /**
   * Generate focused LLM prompt for detected pattern
   * Much shorter than full system prompt = faster response
   */
  static getFocusedPrompt(match: PatternMatch): string | null {
    switch (match.pattern) {
      case 'IDENTITY_CONFIRMATION':
      case 'NAME_ONLY':
        return null; // Use canned response instead
        
      case 'INTRODUCTION_WITH_NAME':
        return `You are Marcus answering a COLD CALL.
Caller introduced themselves: "${match.extractedName}${match.extractedCompany ? ` from ${match.extractedCompany}` : ''}"
They likely also asked "how are you" or greeted you.

YOUR RESPONSE (5-8 words max):
- Answer how you are briefly: "Good, thanks" or "Hey, doing well" or "I'm good"
- Ask them back naturally: "You?" or "How about you?" or "And you?"
- Style: friendly, conversational, like a normal person

Examples:
- "Good, thanks. You?"
- "Hey, doing well. How about you?"
- "I'm good, how are you?"

Be NATURAL and RECIPROCAL. When someone asks how you are, you answer then ask them back - that's how real conversations work.`;

      case 'GREETING_WITH_QUESTION':
        return `You are Marcus answering a COLD CALL.
Caller greeted you and asked how you are. They did NOT introduce themselves.

YOUR RESPONSE (5-8 words max):
- Brief acknowledgment: "Good." or "Fine."
- Ask identity: "Who is this?" or "Who am I talking to?"
- Style: guarded, brief (stranger called you)

DO NOT be friendly or ask them questions back. Cold call = you want to know who they are.`;

      case 'GREETING_ONLY':
        return `You are Marcus answering a COLD CALL.
Caller just greeted you. They did NOT introduce themselves.

YOUR RESPONSE (3-5 words max):
- "Yeah? Who's this?" or "Who is this?" or "Yeah?"
- Style: guarded, brief, questioning

Keep it VERY short. Cold call energy.`;

      default:
        return null; // Use full system prompt
    }
  }
  
  /**
   * Check if pattern allows instant response generation
   */
  static canUseInstantResponse(pattern: DetectedPattern): boolean {
    return pattern !== 'UNKNOWN';
  }
}

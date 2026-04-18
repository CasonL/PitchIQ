/**
 * FirstUtterancePatternDetector
 * 
 * Fast pattern matching for first utterance scenarios to enable instant responses
 * with focused LLM prompts instead of full system prompt generation.
 */

export type DetectedPattern = 
  | 'INTRODUCTION_WITH_NAME'
  | 'INTRO_WITH_PERMISSION'
  | 'INTRO_WITH_VALUE_AND_PERMISSION'
  | 'GREETING_RECIPROCAL'
  | 'GREETING_WITH_QUESTION'
  | 'NAME_ONLY'
  | 'GREETING_ONLY'
  | 'IDENTITY_CONFIRMATION'
  | 'PERMISSION_FIRST'
  | 'VALUE_HOOK_ONLY'
  | 'QUESTION_FIRST'
  | 'UNKNOWN';

export interface PatternMatch {
  pattern: DetectedPattern;
  confidence: number;
  extractedName?: string;
  extractedCompany?: string;
  hasExplainedPurpose?: boolean; // Did they explain why they're calling?
  hasPermissionAsk?: boolean; // Did they ask for permission/time?
}

export class FirstUtterancePatternDetector {
  /**
   * Detect pattern from first utterance partial or complete transcript
   */
  static detect(text: string): PatternMatch {
    const normalized = text.toLowerCase().trim();
    
    // Check for permission ask and purpose first
    const hasPermissionAsk = this.detectPermissionAsk(text);
    const hasExplainedPurpose = this.detectPurposeExplanation(text);
    const hasIntro = this.detectIntroduction(text);
    
    // NEW Pattern: Question-first (before intro - common mistake)
    // "Are you still struggling with..." / "How's your Q2 pipeline?"
    if (!hasIntro && /^(?:are you|do you|have you|is your|how's|what's|when's)\b/i.test(text)) {
      return {
        pattern: 'QUESTION_FIRST',
        confidence: 0.9
      };
    }
    
    // NEW Pattern: Permission-first (no intro yet)
    // "Do you have 5 minutes?" / "Is this a good time?"
    if (!hasIntro && hasPermissionAsk) {
      return {
        pattern: 'PERMISSION_FIRST',
        confidence: 0.95
      };
    }
    
    // NEW Pattern: Value hook only (no intro, no permission - risky)
    // "I can help you close 3 more deals" / "What if you could increase revenue by 15%"
    if (!hasIntro && !hasPermissionAsk && hasExplainedPurpose) {
      return {
        pattern: 'VALUE_HOOK_ONLY',
        confidence: 0.9
      };
    }
    
    // Pattern: Greeting with "How are you?" - needs reciprocal response
    // "Hey Marcus, how are you?" / "How's it going?"
    if (/(?:hey|hi|hello)\s+marcus.*(?:how are you|how's it going|how are things|doing)/i.test(text) && !hasExplainedPurpose) {
      return {
        pattern: 'GREETING_RECIPROCAL',
        confidence: 0.95
      };
    }
    
    // Pattern: Introduction with name
    // "Hey Marcus, this is [NAME]" / "It's [NAME] from [COMPANY]" / "[NAME] from [COMPANY]"
    const introPatterns = [
      /(?:this is|it'?s)\s+([A-Z][a-z]+)(?:\s+from\s+([A-Z][a-z]+(?:\s*[A-Z][a-z]+)*))?/i,
      /(?:my name is|i'?m)\s+([A-Z][a-z]+)/i,
      /\b([A-Z][a-z]+)\s+from\s+([A-Z][a-z]+(?:\s*[A-Z][a-z]+)*)/i, // Match "[NAME] from [COMPANY]" anywhere
      /^([A-Z][a-z]+)\s+from\s+([A-Z][a-z]+(?:\s*[A-Z][a-z]+)*)/i
    ];
    
    for (const pattern of introPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Determine specific pattern based on what else they included
        let specificPattern: DetectedPattern = 'INTRODUCTION_WITH_NAME';
        
        if (hasExplainedPurpose && hasPermissionAsk) {
          // "It's Kayson from PitchIQ, we help with close rates, do you have 5 minutes?"
          specificPattern = 'INTRO_WITH_VALUE_AND_PERMISSION';
        } else if (hasPermissionAsk) {
          // "It's Kayson from PitchIQ, do you have 5 minutes?"
          specificPattern = 'INTRO_WITH_PERMISSION';
        } else if (hasExplainedPurpose) {
          // "It's Kayson from PitchIQ, we help teams improve close rates"
          specificPattern = 'INTRODUCTION_WITH_NAME';
        }
        
        return {
          pattern: specificPattern,
          confidence: 0.95,
          extractedName: match[1],
          extractedCompany: match[2] || undefined,
          hasExplainedPurpose,
          hasPermissionAsk
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
   * 
   * ENABLED: For simple greetings/introductions, instant responses (0ms) provide
   * better UX than waiting for LLM. Trade-off: less context-aware, but acceptable
   * for basic social protocol ("Good, you?" doesn't need Marcus's pain points).
   */
  static getCannedResponse(pattern: DetectedPattern): string | null {
    switch (pattern) {
      case 'INTRODUCTION_WITH_NAME':
        // They introduced themselves and asked how you are
        return "Good, thanks. You?";
        
      case 'GREETING_WITH_QUESTION':
        // They asked how you are but didn't introduce themselves
        return "Good. Who is this?";
        
      case 'GREETING_ONLY':
        // Just "hello" or similar - cold call energy
        return "Yeah? Who's this?";
        
      default:
        // Use focused or full LLM prompt for complex patterns
        return null;
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

🚨 CRITICAL: React naturally. Don't meta-analyze.
❌ NO: "I can see you're calling about..." / "I understand you're trying to..."
✅ YES: Direct gut reactions - "What's up?" / "What do you need?"

Be NATURAL and RECIPROCAL. When someone asks how you are, you answer then ask them back - that's how real conversations work.`;

      case 'GREETING_WITH_QUESTION':
        return `You are Marcus answering a COLD CALL.
Caller greeted you and asked how you are. They did NOT introduce themselves.

YOUR RESPONSE (5-8 words max):
- Brief acknowledgment: "Good." or "Fine."
- Ask identity: "Who is this?" or "Who am I talking to?"
- Style: guarded, brief (stranger called you)

🚨 React directly. Don't analyze.
❌ "I can see you're..." → ✅ "Who is this?"

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
  
  /**
   * Detect if user explained purpose/value in the same message
   * Checks for phrases that indicate they stated why they're calling
   */
  private static detectPurposeExplanation(text: string): boolean {
    const purposePatterns = [
      /\b(we help|we work with|we provide|we offer|we assist)\b/i,
      /\b(we have|we've got)\b.*\b(solution|product|service|tool|platform|system)\b/i,
      /\b(that (could|can|will|would))\b.*\b(benefit|help|improve|save)\b/i,
      /\b(calling about|calling to|calling because|reason (for|I'm) call)/i,
      /\b(wanted to (talk|discuss|share|see if))/i,
      /\b(quick reason|just wanted to)/i,
      /\b(improve|increase|reduce|help with|solve|fix)\b.*\b(close rate|sales|revenue|pipeline|quota|team)/i,
      /\b(talk about|discuss|share (how|what))/i
    ];
    
    return purposePatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Detect if user asked for permission/time
   * "Do you have 5 minutes?" / "Is this a good time?" / "Can I share..."
   */
  private static detectPermissionAsk(text: string): boolean {
    const permissionPatterns = [
      /\b(do you have|have you got)\b.*\b(minute|second|time|moment)\b/i,
      /\b(is this|is now)\b.*\b(good time|bad time)\b/i,
      /\b(can i|could i|may i)\b.*\b(share|tell|talk|discuss|ask)\b/i,
      /\b(quick question|20 seconds)\b/i,
      /\bwondering if you (had|have)\b/i
    ];
    
    return permissionPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Detect if user introduced themselves with name/company
   * "This is Kayson" / "It's John from Acme" / "My name is..."
   */
  private static detectIntroduction(text: string): boolean {
    const introPatterns = [
      /\b(this is|it'?s|my name is|i'?m)\s+[A-Z][a-z]+/i,
      /\b[A-Z][a-z]+\s+from\s+[A-Z][a-z]+/i,
      /\b(calling from|with)\s+[A-Z][a-z]+/i
    ];
    
    return introPatterns.some(pattern => pattern.test(text));
  }
}

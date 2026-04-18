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
          // Route to different pattern to avoid canned response - needs full LLM context
          specificPattern = 'INTRO_WITH_VALUE_AND_PERMISSION'; // Reuse this to skip canned response
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
    // Instant responses for common cold call patterns
    // These don't need Marcus's full context - basic human reactions
    switch (pattern) {
      // GREETINGS
      case 'GREETING_RECIPROCAL':
        // They introduced AND asked how you are - pure social reciprocal
        return "Good, thanks. You?";
        
      case 'GREETING_WITH_QUESTION':
        // They asked how you are but didn't introduce themselves
        return "Good. Who is this?";
        
      case 'GREETING_ONLY':
        // Just "hello" or similar - cold call energy
        return "Yeah? Who's this?";
      
      // PERMISSION ASKS
      case 'INTRO_WITH_PERMISSION':
        // "Hey Marcus, it's Kayson from PitchIQ, do you have 5 minutes?"
        // Cold call = guarded, brief - they haven't earned friendliness yet
        return "What's this about?";
        
      case 'PERMISSION_FIRST':
        // "Do you have 5 minutes?" (no intro) - sketchy
        return "Who is this?";
      
      // IDENTITY CONFIRMATIONS
      case 'IDENTITY_CONFIRMATION':
        // "Is this Marcus?" / "Are you Marcus?"
        return "Yeah. Who's this?";
        
      case 'NAME_ONLY':
        // "Marcus?" - uncertain caller
        return "Yeah?";
      
      // VALUE HOOKS & COMPLEX PATTERNS
      case 'INTRO_WITH_VALUE_AND_PERMISSION':
        // "Hey Marcus, it's Kayson, we help with sales training, got 5 mins?"
        // Has intro + pitch + permission = need contextual reaction
        // Route to full LLM for Marcus's actual response based on traits
        return null;
        
      case 'VALUE_HOOK_ONLY':
        // "I can help you close 3 more deals" (no intro, no permission)
        // Needs full LLM - Marcus's reaction depends on his current pain/needs
        return null;
      
      default:
        // All other patterns use focused or full LLM prompt
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
   * Patterns with value propositions need FULL context, not focused prompts
   */
  static canUseInstantResponse(pattern: DetectedPattern): boolean {
    // Patterns that need FULL LLM with all Marcus context (no focused prompt)
    const needsFullContext = [
      'INTRO_WITH_VALUE_AND_PERMISSION', // Has value prop - needs contextual pushback
      'VALUE_HOOK_ONLY',                 // Pure value pitch - needs full resistance
      'PERMISSION_FIRST',                // Asking permission without intro - needs full persona
      'QUESTION_FIRST'                   // Question before intro - needs full context
    ];
    
    if (needsFullContext.includes(pattern)) {
      return false; // Skip focused path, go straight to full LLM
    }
    
    return pattern !== 'UNKNOWN';
  }
  
  /**
   * Detect if user explained purpose/value in the same message
   * Checks for phrases that indicate they stated why they're calling
   */
  private static detectPurposeExplanation(text: string): boolean {
    const purposePatterns = [
      // Direct value propositions
      /\b(we help|we work with|we provide|we offer|we assist)\b/i,
      /\b(we have|we've got|we specialize in)\b.*\b(solution|product|service|tool|platform|system)\b/i,
      /\b(that (could|can|will|would))\b.*\b(benefit|help|improve|save)\b/i,
      
      // Calling purpose statements
      /\b(calling about|calling to|calling because|calling regarding|reason (for|I'm) call)/i,
      /\b(wanted to (talk|discuss|share|see if|show you|tell you about))/i,
      /\b(quick reason|just wanted to|reaching out (to|about))/i,
      
      // Value/benefit statements
      /\b(improve|increase|reduce|boost|enhance|optimize|help with|solve|fix)\b.*\b(close rate|sales|revenue|pipeline|quota|team|performance|results|efficiency)/i,
      /\b(save|cut|reduce)\b.*\b(time|money|costs|hours)/i,
      /\b(grow|scale|expand|double|triple)\b.*\b(revenue|sales|business|team)/i,
      
      // Talk/discuss patterns
      /\b(talk about|discuss|chat about|share (how|what|some))/i,
      /\b(talk|discuss)\b.{0,30}\b(sales|team|business|company|pipeline|revenue|growth)\b.{0,30}\b(solution|product|service|tool|platform|training|system)\b/i,
      
      // Product/solution mentions
      /\b(sales|marketing|business|revenue|customer)\b.{0,30}\b(training|solution|platform|tool|system|service|software|technology)\b/i,
      /\b(innovative|new|powerful|advanced|cutting-edge|proven|best-in-class)\b.{0,20}\b(solution|product|service|tool|platform|training|system|approach|method)\b/i,
      
      // Referral-based openers
      /\b(referred|recommended|suggested|told me|mentioned)\b.*\b(reach out|contact|call|speak with)/i,
      /\b(mutual (friend|contact|connection)|someone we both know)/i,
      /\b([A-Z][a-z]+)\b.{0,20}\b(suggested|recommended|said I should|told me to)/i,
      
      // Research/observation-based
      /\b(noticed|saw|read|learned|found out|discovered)\b.*\b(your|you're|that you)/i,
      /\b(saw on|noticed on|read on)\b.*\b(LinkedIn|website|article|post|profile)/i,
      /\b(I see|I noticed|looks like)\b.*\b(you're|your company|your team)/i,
      
      // Pain point leads
      /\b(struggling|dealing with|facing|challenged by|having trouble|issues with)/i,
      /\b(growing fast|expanding|scaling|hiring)/i,
      /\b(probably|might be|could be)\b.*\b(looking for|interested in|need|want)/i,
      
      // Event/trigger-based
      /\b(saw you at|met you at|attended|conference|event|webinar)/i,
      /\b(recent|recently|just|latest)\b.*\b(launch|announcement|hire|funding|article|post)/i,
      
      // Follow-up patterns
      /\b(sent (you|an)|emailed|reached out|left (a|you a)|following up)/i,
      /\b(tried to|attempted to)\b.*\b(reach|contact|connect)/i,
      
      // Social proof/credentials
      /\b(work with|helped|partnered with)\b.*\b(companies like|similar|Fortune|leading)/i,
      /\b(clients include|customers like|working with)/i,
      
      // Compliment/flattery openings
      /\b(impressed|amazing|love|admire)\b.*\b(your|what you|the work)/i,
      /\b(congratulations|congrats)\b.*\b(on your|on the)/i,
      
      // Direct asks/offers
      /\b(quick question|brief question|wondering if|curious (if|whether))/i,
      /\b(can I|could I|would you be)\b.*\b(share|show|tell|ask|get your)/i,
      /\b(opportunity|chance)\b.*\b(to (share|discuss|show|tell))/i
    ];
    
    return purposePatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Detect if user asked for permission/time
   * "Do you have 5 minutes?" / "Is this a good time?" / "Can I share..."
   */
  private static detectPermissionAsk(text: string): boolean {
    const permissionPatterns = [
      // Time requests
      /\b(do you have|have you got|got a|have a)\b.*\b(minute|second|time|moment|few minutes|couple minutes)\b/i,
      /\b(is this|is now|is it)\b.*\b(good time|bad time|convenient)\b/i,
      /\b(catch you at)\b.*\b(good time|bad time)\b/i,
      
      // Permission phrases
      /\b(can i|could i|may i|would you mind if|is it okay if)\b.*\b(share|tell|talk|discuss|ask|show|run|steal|grab|borrow)\b/i,
      /\b(mind if i|okay if i)\b.*\b(share|tell|ask|show)/i,
      
      // Quick/brief patterns
      /\b(quick (question|call|chat|word|sec|second)|20 seconds|30 seconds)\b/i,
      /\b(brief (question|chat|moment|call))\b/i,
      /\b(just (a|one) (second|minute|moment|quick))\b/i,
      
      // Wondering/asking
      /\bwondering if you (had|have|might have|would have)\b/i,
      /\b(would you (be|have)|do you (have|think))\b.*\b(time|minute|interest|open to)\b/i,
      
      // Open to / interested patterns
      /\b(open to|interested in|open for)\b.*\b(discussing|hearing|learning|chatting|talking)\b/i
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

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
  pattern: DetectedPattern; // Primary pattern for backwards compatibility
  confidence: number;
  extractedName?: string;
  extractedCompany?: string;
  hasExplainedPurpose?: boolean; // Did they explain why they're calling?
  hasPermissionAsk?: boolean; // Did they ask for permission/time?
  hasQuestion?: boolean; // NEW: Does this contain a genuine question?
  hasValueClaim?: boolean; // NEW: Does this contain value/benefit claims?
  hasIntroduction?: boolean; // NEW: Did they introduce themselves?
  compoundPatterns?: string[]; // NEW: All detected pattern elements
}

export class FirstUtterancePatternDetector {
  /**
   * Detect pattern in user's utterance
   * Returns canned response for simple patterns, null for complex ones
   * 
   * @param text - User's message
   * @param turnNumber - Which turn this is (1, 2, 3...) - greeting patterns only on Turn 1
   */
  static detect(text: string, turnNumber: number = 1): PatternMatch {
    const normalized = text.toLowerCase().trim();
    
    // Multi-jointed detection: Check ALL pattern elements
    const hasPermissionAsk = this.detectPermissionAsk(text);
    const hasExplainedPurpose = this.detectPurposeExplanation(text);
    const hasIntro = this.detectIntroduction(text);
    const hasQuestion = this.detectQuestion(text);
    const hasValueClaim = this.detectValueClaim(text);
    
    // Track compound patterns for context-aware responses
    const compoundPatterns: string[] = [];
    if (hasIntro) compoundPatterns.push('introduction');
    if (hasPermissionAsk) compoundPatterns.push('permission_request');
    if (hasExplainedPurpose) compoundPatterns.push('purpose_statement');
    if (hasQuestion) compoundPatterns.push('question');
    if (hasValueClaim) compoundPatterns.push('value_claim');
    
    // NEW Pattern: Question-first (before intro - common mistake)
    // "Are you still struggling with..." / "How's your Q2 pipeline?"
    if (!hasIntro && hasQuestion && /^(?:are you|do you|have you|is your|how's|what's|when's)\b/i.test(text)) {
      return {
        pattern: 'QUESTION_FIRST',
        confidence: 0.9,
        hasQuestion: true,
        hasValueClaim,
        hasIntroduction: false,
        hasPermissionAsk,
        hasExplainedPurpose,
        compoundPatterns
      };
    }
    
    // NEW Pattern: Permission-first (no intro yet)
    // "Do you have 5 minutes?" / "Is this a good time?"
    if (!hasIntro && hasPermissionAsk) {
      return {
        pattern: 'PERMISSION_FIRST',
        confidence: 0.95,
        hasQuestion,
        hasValueClaim,
        hasIntroduction: false,
        hasPermissionAsk: true,
        hasExplainedPurpose,
        compoundPatterns
      };
    }
    
    // NEW Pattern: Value hook only (no intro, no permission - risky)
    // "I can help you close 3 more deals" / "What if you could increase revenue by 15%"
    // VALUE_HOOK pattern - but if it contains a question, prioritize that!
    if (!hasIntro && !hasPermissionAsk && hasExplainedPurpose) {
      return {
        pattern: 'VALUE_HOOK_ONLY',
        confidence: 0.9,
        hasQuestion,
        hasValueClaim: true,
        hasIntroduction: false,
        hasPermissionAsk: false,
        hasExplainedPurpose: true,
        compoundPatterns
      };
    }
    
    // GREETING PATTERNS: Only on Turn 1 - you don't greet someone twice
    if (turnNumber === 1) {
      // Pattern: Greeting with "How are you?" - needs reciprocal response
      // "Hey Marcus, how are you?" / "How's it going?"
      if (/(?:hey|hi|hello)\s+marcus.*(?:how are you|how's it going|how are things|doing)/i.test(text) && !hasExplainedPurpose) {
        return {
          pattern: 'GREETING_RECIPROCAL',
          confidence: 0.95,
          hasQuestion: true,
          hasValueClaim,
          hasIntroduction: hasIntro,
          hasPermissionAsk,
          hasExplainedPurpose: false,
          compoundPatterns
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
            hasPermissionAsk,
            hasQuestion,
            hasValueClaim,
            hasIntroduction: true,
            compoundPatterns
          };
        }
      }
    }
    
    // Pattern 2: Identity confirmation ("Is this Marcus?")
    // HIGHEST PRIORITY for instant response - no LLM needed
    if (/(?:is this|this is|are you)\s+marcus/i.test(text)) {
      return {
        pattern: 'IDENTITY_CONFIRMATION',
        confidence: 0.95,
        hasQuestion: true,
        hasValueClaim,
        hasIntroduction: hasIntro,
        hasPermissionAsk,
        hasExplainedPurpose,
        compoundPatterns
      };
    }
    
    // Pattern 3: Greeting with question (no name)
    // "Hey Marcus, how are you?" / "Hi Marcus, how's it going?"
    if (/(?:hey|hi|hello)\s+marcus.*(?:how|what|doing|going)/i.test(text)) {
      return {
        pattern: 'GREETING_WITH_QUESTION',
        confidence: 0.9,
        hasQuestion: true,
        hasValueClaim,
        hasIntroduction: hasIntro,
        hasPermissionAsk,
        hasExplainedPurpose,
        compoundPatterns
      };
    }
    
    // Pattern 4: Just name
    // "Marcus?" / "Marcus"
    if (/^(?:hey\s+)?marcus[?,!.]?$/i.test(normalized)) {
      return {
        pattern: 'NAME_ONLY',
        confidence: 0.85,
        hasQuestion: false,
        hasValueClaim: false,
        hasIntroduction: false,
        hasPermissionAsk: false,
        hasExplainedPurpose: false,
        compoundPatterns
      };
    }
    
    // Pattern 5: Greeting only (no question)
    // "Hey Marcus" / "Hi Marcus"
    if (/^(?:hey|hi|hello)\s+marcus[.,!]?$/i.test(normalized)) {
      return {
        pattern: 'GREETING_ONLY',
        confidence: 0.8,
        hasQuestion: false,
        hasValueClaim: false,
        hasIntroduction: false,
        hasPermissionAsk: false,
        hasExplainedPurpose: false,
        compoundPatterns
      };
    }
    
    // Unknown pattern - use full LLM processing
    return {
      pattern: 'UNKNOWN',
      confidence: 0.5,
      hasQuestion,
      hasValueClaim,
      hasIntroduction: hasIntro,
      hasPermissionAsk,
      hasExplainedPurpose,
      compoundPatterns
    };
  }
  
  /**
   * Generate focused LLM prompt for detected pattern
   * Much shorter than full system prompt = faster response
   */
  /**
   * Get instant canned response (no LLM) for ultra-fast patterns
   * 
   * OPTION 1 (ACTIVE): Only pure greetings get canned responses. Complex patterns use context-aware LLM.
   * OPTION 2 (DISABLED): Set ENABLE_COMPLEX_CANNED = true to restore canned responses for all patterns.
   */
  static getCannedResponse(match: PatternMatch): string | null {
    // 🎛️ TOGGLE: Set to true to restore canned responses for complex patterns (OPTION 2)
    const ENABLE_COMPLEX_CANNED = false;
    
    const pattern = match.pattern;
    const name = match.extractedName || null;
    
    // 🔧 COMPOUND PATTERN CHECK: If utterance contains questions or value claims, skip canned responses
    // These need context-aware LLM to respond properly
    if (match.hasQuestion || match.hasValueClaim) {
      console.log(`⚠️ Skipping canned response - compound pattern detected: ${match.compoundPatterns?.join(', ')}`);
      return null;
    }
    
    // Instant responses for PURE greetings only
    // These don't need Marcus's context - basic social protocol
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
      
      // PERMISSION ASKS - OPTION 2 ONLY
      case 'INTRO_WITH_PERMISSION':
        if (!ENABLE_COMPLEX_CANNED) return null; // Use context-aware LLM
        return "What's this about?";
        
      case 'PERMISSION_FIRST':
        if (!ENABLE_COMPLEX_CANNED) return null; // Use context-aware LLM
        return "Who is this?";
      
      // IDENTITY CONFIRMATIONS
      case 'IDENTITY_CONFIRMATION':
        // "Is this Marcus?" / "Are you Marcus?"
        return "Yeah. Who's this?";
        
      case 'NAME_ONLY':
        // "Marcus?" - uncertain caller
        return "Yeah?";
      
      // VALUE HOOKS & COMPLEX PATTERNS - ALWAYS use context-aware LLM
      case 'INTRO_WITH_VALUE_AND_PERMISSION':
        // "Hey Marcus, it's Kayson, we help with sales training, got 5 mins?"
        // OPTION 1: Marcus's reaction depends on his pain/satisfaction/budget - needs full context
        if (!ENABLE_COMPLEX_CANNED) return null;
        
        // OPTION 2: Random canned objections (disabled by default)
        const greeting = name ? `Hey ${name}` : "Hey";
        const objections = [
          `${greeting}, we're all set over here. Already have something in place for that.`,
          `${greeting}, thanks but we're good. Got that covered already.`,
          `${greeting}, appreciate it but we're all set. Have someone handling that.`
        ];
        return objections[Math.floor(Math.random() * objections.length)];
        
      case 'VALUE_HOOK_ONLY':
        // "I can help you close 3 more deals" (no intro, no permission)
        // ALWAYS needs context-aware LLM - Marcus's reaction depends on his current pain/needs
        return null;
        
      case 'QUESTION_FIRST':
        // Questions before intro need context-aware responses
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

      case 'INTRO_WITH_VALUE_AND_PERMISSION':
      case 'VALUE_HOOK_ONLY':
        const callerName = match.extractedName || 'someone';
        const callerCompany = match.extractedCompany || '';
        
        // Randomly select an initial objection from the pool
        const initialObjections = [
          "Thanks, but we're pretty happy with our current sales training methods at the moment.",
          "I appreciate the call, but we're locked in with our current vendor right now.",
          "Not a good time - we're mid-implementation with another solution.",
          "I'd need to run that by our VP before we could even consider it.",
          "We tried something like this before, didn't really work for us.",
          "Budget's allocated for the year, so not really looking at new tools.",
          "We're all set with what we have. Thanks though.",
          "Honestly, we're not really in the market for this right now.",
          "We're good. Already using Gong for that.",
          "I don't think we have the bandwidth to take on anything new right now.",
          "That's not really a priority for us at the moment.",
          "We've got our own training program running internally.",
          "I'm not the right person for this - you'd need to talk to our Head of Sales.",
          "We just renewed with our current provider, so we're covered.",
          "Our team's pretty resistant to new systems, honestly."
        ];
        
        const selectedObjection = initialObjections[Math.floor(Math.random() * initialObjections.length)];
        
        return `You are Marcus. ${callerName}${callerCompany ? ` from ${callerCompany}` : ''} just cold called you.

YOUR STATE shows you have blocking conditions that prevent you from being interested right now.

YOUR EXACT RESPONSE (use this verbatim):
"${selectedObjection}"

Keep it natural - deliver this line like a real person would, with appropriate tone.`;

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
  
  /**
   * Detect if utterance contains a genuine question
   * Uses QuestionClassifier logic but returns boolean
   */
  private static detectQuestion(text: string): boolean {
    // Question mark is strong signal
    if (text.includes('?')) return true;
    
    // Question words at start or in middle
    const questionWords = /\b(what|when|where|who|why|how|which|whose|whom|can|could|would|should|is|are|do|does|did|will|have|has)\b/i;
    
    // Question phrases
    const questionPhrases = [
      /\b(tell me|walk me through|explain|describe|curious about|wondering|wanna know|want to know)\b/i,
      /\b(could you|can you|would you|will you)\b/i,
      /\b(what('s| is)|how('s| is)|where('s| is))\b/i,
    ];
    
    return questionWords.test(text) || questionPhrases.some(p => p.test(text));
  }
  
  /**
   * Detect if utterance contains value/benefit claims
   * "I can help you..." / "We increase revenue..." / "Save 20%..."
   */
  private static detectValueClaim(text: string): boolean {
    const valuePatterns = [
      // Direct benefit claims
      /\b(help you|save you|increase your|improve your|boost your|grow your|reduce your)\b/i,
      /\b(save|cut|reduce)\b.*\b(time|money|costs|hours|%|percent)\b/i,
      /\b(increase|improve|boost|grow|enhance|optimize)\b.*\b(revenue|sales|pipeline|close rate|efficiency|productivity|performance)\b/i,
      
      // Quantified claims
      /\b\d+%\b/i, // Any percentage
      /\b(double|triple|quadruple|2x|3x|10x)\b/i,
      /\b\d+\s*(more|additional|extra)\b.*\b(deals|sales|revenue|customers|leads)\b/i,
      
      // Comparative claims
      /\b(better|faster|easier|more efficient|more effective)\b.*\b(than|compared to)\b/i,
      /\b(best|leading|top|#1|number one)\b.*\b(solution|platform|tool|service)\b/i,
      
      // Benefit verbs
      /\b(solve|fix|eliminate|prevent|avoid)\b.*\b(problem|issue|pain|challenge)\b/i
    ];
    
    return valuePatterns.some(pattern => pattern.test(text));
  }
}

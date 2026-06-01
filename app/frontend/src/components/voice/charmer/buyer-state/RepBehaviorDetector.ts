/**
 * RepBehaviorDetector.ts
 * 
 * Detects what the rep did in their utterance.
 * Uses heuristics, patterns, and existing call signals.
 * 
 * Philosophy:
 * - Simple heuristics for obvious patterns
 * - Use existing repQualitySignals when available
 * - Don't expect regex alone to understand sales nuance
 * - Return multiple behaviors per turn (rep can do several things)
 */

export type RepBehavior =
  // Discovery behaviors
  | 'asked_trigger_question'        // Good open-ended discovery question
  | 'asked_concrete_discovery'      // Specific question about current state
  | 'asked_generic_question'        // Lazy, surface-level question
  | 'asked_follow_up'               // Follow-up to previous answer
  | 'asked_about_current_spend'     // Discovers economic anchor
  | 'asked_about_problem_cost'      // Helps quantify the problem
  
  // Positioning behaviors
  | 'pitched_prematurely'           // Solution before discovery
  | 'made_unearned_roi_claim'       // Claims value before establishing trust
  | 'made_hyperbolic_claim'         // "300% ROI guaranteed"
  | 'provides_specific_proof'       // Concrete evidence, not claims
  | 'connects_to_specific_problem'  // Shows understanding of Marcus's world
  
  // Rapport behaviors
  | 'shows_specific_understanding'  // References Marcus's actual situation
  | 'validates_concern'             // Acknowledges Marcus's objection
  | 'asks_permission'               // Respects Marcus's time
  | 'summarizes_understanding'      // Shows he's listening
  
  // Negative behaviors
  | 'overtalks'                     // Talks too long without asking
  | 'contradicts_self'              // Says X, then says Y
  | 'criticizes_current_solution'   // Insults what Marcus uses now
  | 'pushes_after_rejection'        // Won't take no for an answer
  | 'ignores_warm_context'          // Treats warm lead like cold call
  | 'dodges_legitimacy_question'    // Doesn't answer "How did you get my info?"
  | 'handles_legitimacy_directly'   // Answers legitimacy question well
  
  // Warm-lead specific
  | 'validated_status_quo'          // Acknowledges current solution is working
  | 'asked_too_large_commitment'    // Asks for demo/meeting too soon;

export interface RepBehaviorDetectorContext {
  userInput: string;
  conversationHistory: Array<{ role: string; content: string }>;
  repQualitySignals?: {
    askedDiscovery?: boolean;
    buildingRapport?: boolean;
    pitchingTooEarly?: boolean;
    handledObjectionWell?: boolean;
    overtalking?: boolean;
  };
  marcusLastMessage?: string;
  turnNumber: number;
  isWarmLead?: boolean;
}

export class RepBehaviorDetector {
  /**
   * Detect all behaviors in the rep's utterance
   */
  static detect(context: RepBehaviorDetectorContext): RepBehavior[] {
    const behaviors: RepBehavior[] = [];
    const { userInput, repQualitySignals, marcusLastMessage, isWarmLead } = context;
    const lower = userInput.toLowerCase();

    // Discovery behaviors
    if (this.isOpenEndedQuestion(userInput)) {
      behaviors.push('asked_trigger_question');
    }
    
    if (this.isCurrentStateDiscovery(lower)) {
      behaviors.push('asked_concrete_discovery');
    }
    
    if (this.isGenericQuestion(lower)) {
      behaviors.push('asked_generic_question');
    }
    
    if (this.asksAboutCurrentSpend(lower)) {
      behaviors.push('asked_about_current_spend');
    }
    
    if (this.asksAboutProblemCost(lower)) {
      behaviors.push('asked_about_problem_cost');
    }

    // Positioning behaviors
    if (repQualitySignals?.pitchingTooEarly || this.isPrematurePitch(lower, context)) {
      behaviors.push('pitched_prematurely');
    }
    
    if (this.makesUnearnedROIClaim(lower)) {
      behaviors.push('made_unearned_roi_claim');
    }
    
    if (this.makesHyperbolicClaim(lower)) {
      behaviors.push('made_hyperbolic_claim');
    }
    
    if (this.providesSpecificProof(lower)) {
      behaviors.push('provides_specific_proof');
    }
    
    if (this.connectsToSpecificProblem(lower, marcusLastMessage)) {
      behaviors.push('connects_to_specific_problem');
    }

    // Rapport behaviors
    if (this.showsSpecificUnderstanding(lower, marcusLastMessage)) {
      behaviors.push('shows_specific_understanding');
    }
    
    if (repQualitySignals?.handledObjectionWell || this.validatesConcern(lower, marcusLastMessage)) {
      behaviors.push('validates_concern');
    }
    
    if (this.asksPermission(lower)) {
      behaviors.push('asks_permission');
    }
    
    if (this.summarizesUnderstanding(lower)) {
      behaviors.push('summarizes_understanding');
    }

    // Negative behaviors
    if (repQualitySignals?.overtalking || this.isOvertalking(userInput)) {
      behaviors.push('overtalks');
    }
    
    if (this.criticizesCurrentSolution(lower)) {
      behaviors.push('criticizes_current_solution');
    }
    
    if (this.pushesAfterRejection(lower, marcusLastMessage)) {
      behaviors.push('pushes_after_rejection');
    }

    // Warm-lead specific
    if (isWarmLead && this.ignoresWarmContext(lower, context)) {
      behaviors.push('ignores_warm_context');
    }
    
    if (this.validatesStatusQuo(lower)) {
      behaviors.push('validated_status_quo');
    }

    return behaviors;
  }

  // ============================================================================
  // DISCOVERY DETECTION
  // ============================================================================

  private static isOpenEndedQuestion(input: string): boolean {
    const openEndedPatterns = [
      /what('s| is| are) (your|the) (biggest|main|primary) (challenge|concern|priority|goal)/i,
      /tell me (about|more about)/i,
      /how (do|does|did) (you|your team|that) (currently|typically)/i,
      /walk me through/i,
      /help me understand/i,
      /what does (that|this|your) (look like|mean)/i
    ];
    
    return openEndedPatterns.some(pattern => pattern.test(input));
  }

  private static isCurrentStateDiscovery(lower: string): boolean {
    return (
      /what (are you|do you) (currently|right now) (using|doing|spending)/i.test(lower) ||
      /how (are you|do you) (currently|right now) (handling|managing|dealing with)/i.test(lower)
    );
  }

  private static isGenericQuestion(lower: string): boolean {
    const genericPatterns = [
      /how('s| is) (your|the) (day|week|business)/i,
      /how are (you|things)/i,
      /what do you do/i
    ];
    
    return genericPatterns.some(pattern => pattern.test(lower));
  }

  private static asksAboutCurrentSpend(lower: string): boolean {
    return (
      /what (are you|do you) (currently )?spend/i.test(lower) ||
      /how much (are you|do you) (currently )?(pay|spend)/i.test(lower) ||
      /what('s| is) your (current )?budget/i.test(lower)
    );
  }

  private static asksAboutProblemCost(lower: string): boolean {
    return (
      /what (does|is) (that|this) cost(ing)? you/i.test(lower) ||
      /how much (does|is) (that|this) cost(ing)? you/i.test(lower) ||
      /what('s| is) the (cost|impact) of/i.test(lower)
    );
  }

  // ============================================================================
  // POSITIONING DETECTION
  // ============================================================================

  private static isPrematurePitch(lower: string, context: RepBehaviorDetectorContext): boolean {
    const hasPitchLanguage = (
      /we (can|could|would) help/i.test(lower) ||
      /our (product|solution|platform|service)/i.test(lower) ||
      /what we do is/i.test(lower)
    );
    
    // Premature if pitching in first 3 turns
    return hasPitchLanguage && context.turnNumber <= 3;
  }

  private static makesUnearnedROIClaim(lower: string): boolean {
    return (
      /save you \$?\d+/i.test(lower) ||
      /\d+% (increase|improvement|roi|return)/i.test(lower) ||
      /reduce (costs|time) by \d+/i.test(lower)
    );
  }

  private static makesHyperbolicClaim(lower: string): boolean {
    return (
      /guaranteed/i.test(lower) ||
      /\d{3,}% (roi|increase|improvement)/i.test(lower) || // 300%+
      /revolutionize/i.test(lower) ||
      /game[- ]chang/i.test(lower)
    );
  }

  private static providesSpecificProof(lower: string): boolean {
    return (
      /case study/i.test(lower) ||
      /customer (example|story)/i.test(lower) ||
      /\d+ (companies|clients|customers) (like|similar)/i.test(lower) ||
      /specific example/i.test(lower)
    );
  }

  private static connectsToSpecificProblem(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    // Stoplist of weak category words that don't indicate real connection
    const weakWords = new Set([
      'current', 'happy', 'sales', 'training', 'methods', 'team', 'teams',
      'solution', 'platform', 'company', 'business', 'process', 'system',
      'using', 'working', 'doing', 'handle', 'manage', 'think', 'about'
    ]);
    
    // Look for reflection/paraphrase markers
    const hasReflectionFrame = (
      /so |sounds like|if i('m| am) hearing|what you('re| are) saying|the issue is|the challenge is/i.test(lower) ||
      /you mentioned|you said|you brought up/i.test(lower)
    );
    
    // Extract meaningful keywords from Marcus's message
    const marcusKeywords = marcusLastMessage.toLowerCase()
      .match(/\b\w{5,}\b/g) || [];
    const meaningfulKeywords = marcusKeywords.filter(k => !weakWords.has(k));
    
    // Check for meaningful overlap
    const meaningfulOverlap = meaningfulKeywords.some(k => lower.includes(k));
    
    return hasReflectionFrame && meaningfulOverlap;
  }

  // ============================================================================
  // RAPPORT DETECTION
  // ============================================================================

  private static showsSpecificUnderstanding(lower: string, marcusLastMessage?: string): boolean {
    return (
      /so if i('m| am) hearing you (right|correctly)/i.test(lower) ||
      /it sounds like/i.test(lower) ||
      /what i('m| am) hearing is/i.test(lower)
    ) && this.connectsToSpecificProblem(lower, marcusLastMessage);
  }

  private static validatesConcern(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    const validationPatterns = [
      /that('s| is) (fair|valid|understandable|reasonable)/i,
      /i (get|understand) (that|why)/i,
      /makes sense/i,
      /i appreciate (that|you)/i
    ];
    
    return validationPatterns.some(pattern => pattern.test(lower));
  }

  private static asksPermission(lower: string): boolean {
    return (
      /is (this|now) a good time/i.test(lower) ||
      /do you have (a )?few minutes/i.test(lower) ||
      /can i (ask|share)/i.test(lower) ||
      /would it be (okay|alright) (if|to)/i.test(lower)
    );
  }

  private static summarizesUnderstanding(lower: string): boolean {
    return (
      /let me (make sure|summarize|recap)/i.test(lower) ||
      /so (what i('m| am) hearing|to summarize)/i.test(lower) ||
      /if i understand correctly/i.test(lower)
    );
  }

  // ============================================================================
  // NEGATIVE BEHAVIOR DETECTION
  // ============================================================================

  private static isOvertalking(input: string): boolean {
    const wordCount = input.split(/\s+/).length;
    const sentenceCount = input.split(/[.!?]+/).length;
    
    // Overtalking if: 100+ words OR 5+ sentences without a question
    return (wordCount > 100 || sentenceCount > 5) && !input.includes('?');
  }

  private static criticizesCurrentSolution(lower: string): boolean {
    return (
      /that('s| is) (outdated|old|inefficient|broken)/i.test(lower) ||
      /you('re| are) (wasting|losing) (money|time)/i.test(lower) ||
      /that (doesn't|won't) work/i.test(lower)
    );
  }

  private static pushesAfterRejection(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    const marcusRejected = (
      /not interested/i.test(marcusLastMessage) ||
      /don't (have|need)/i.test(marcusLastMessage) ||
      /no thanks/i.test(marcusLastMessage)
    );
    
    const repPushes = (
      /but (what if|imagine|consider)/i.test(lower) ||
      /just (hear me out|give me)/i.test(lower) ||
      /one more thing/i.test(lower)
    );
    
    return marcusRejected && repPushes;
  }

  // ============================================================================
  // WARM-LEAD SPECIFIC
  // ============================================================================

  private static ignoresWarmContext(lower: string, context: RepBehaviorDetectorContext): boolean {
    if (!context.isWarmLead) return false;
    
    const acknowledgesWarmSignal = (
      /saw (you|your) (visited|browsed|checked out)/i.test(lower) ||
      /noticed you (were|looked)/i.test(lower) ||
      /following up on your (visit|interest)/i.test(lower)
    );
    
    if (acknowledgesWarmSignal) return false;
    
    // Only penalize if:
    // 1. Rep is pitching without mentioning warm signal, OR
    // 2. Marcus asked "what is this about?" and rep still doesn't anchor, OR
    // 3. Turn 3+ and still no warm context mentioned
    const isPitching = this.isPrematurePitch(lower, context);
    const marcusAskedWhy = /what is this|what('s| is) this about|why are you calling|how did you get/i
      .test(context.marcusLastMessage?.toLowerCase() || '');
    
    return isPitching || marcusAskedWhy || context.turnNumber >= 3;
  }

  private static validatesStatusQuo(lower: string): boolean {
    return (
      /if (it|that)('s| is) working/i.test(lower) ||
      /sounds like you('re| are) (happy|satisfied)/i.test(lower) ||
      /that makes sense/i.test(lower)
    );
  }
}
